"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SUPER_SENSES_SMELL_SIMULATION } from "@xr-school/simulation-content";

import { createSuperSensesSmellWorld } from "../../lib/world-builder/superSensesSmellWorld";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./SuperSensesSmellViewer.module.css";

const TOTAL_SECONDS = 300;
const MASTER_TIMELINE = {
  antHighway: 60,
  rescueDog: 150,
  silkmoth: 240,
  finalRecap: 290,
  confetti: 295,
  badge: 298,
  freeze: 300,
} as const;

const NARRATION_BY_STAGE = new Map(
  SUPER_SENSES_SMELL_SIMULATION.narration.cues.map((cue) => [
    cue.stageId,
    cue.text,
  ]),
);

function narrationFor(stageId: string) {
  const narration = NARRATION_BY_STAGE.get(stageId);
  if (!narration) throw new Error(`Missing smell narration for ${stageId}`);
  return narration;
}

const FINAL_RECAP_NARRATION =
  "Ants follow pheromone trails. Dogs track selected odours. Silkmoths detect pheromones with sensitive antennae. Real smells are invisible.";

const MISSIONS = [
  {
    id: "smell-o-vision",
    title: "Activate Smell-O-Vision",
    range: "0:00–1:00",
    closesAt: 55,
    narration: narrationFor("smell-o-vision"),
    prompt: "Which trail represents the food smell?",
    steps: [
      [
        ["food-scent", "Orange-gold ribbon · food", true],
        ["flower-scent", "Pink-green sparkles · flowers", false],
        ["grass-scent", "Cyan mist · wet grass", false],
      ],
    ],
    timeout:
      "Super-sniffer hint: follow the gold. The highlighted ribbon carries food-smell chemicals.",
  },
  {
    id: "ant-highway",
    title: "The Ant Army Highway",
    range: "1:00–2:30",
    closesAt: 130,
    narration: narrationFor("ant-pheromone-trail"),
    prompt: "Follow the fresh pheromone trail, one clue at a time.",
    steps: [
      [
        ["ant-pheromone-trail", "Fresh green checkpoint", true],
        ["ant-weak-trail", "Weak fading trail", false],
        ["lollipop", "Lollipop before following the trail", false],
      ],
      [
        ["ant-pheromone-trail", "Strong bright trail", true],
        ["ant-weak-trail", "Weak fading trail", false],
        ["lollipop", "Jump straight to the candy", false],
      ],
      [
        ["lollipop", "Green cluster by the lollipop", true],
        ["ant-weak-trail", "The weak detour", false],
        ["ant-pheromone-trail", "The earlier checkpoint", false],
      ],
    ],
    timeout:
      "Trail assist engaged: the freshest green checkpoints now pulse all the way to the lollipop.",
  },
  {
    id: "rescue-dog",
    title: "The Rescue Dog Challenge",
    range: "2:30–4:00",
    closesAt: 220,
    narration: narrationFor("dog-odour-tracking"),
    prompt: "Separate the scents and find the lost teddy bear.",
    steps: [
      [
        ["target-scent", "Blue · target scent", true],
        ["squirrel-scent", "Red · squirrel scent", false],
        ["pizza-scent", "Yellow · pizza scent", false],
      ],
      [
        ["target-scent", "Blue checkpoint behind the log", true],
        ["squirrel", "Squirrel tree", false],
        ["pizza-box", "Empty pizza box", false],
      ],
      [
        ["teddy-bear", "Blue aura around the teddy bear", true],
        ["pizza-box", "Empty pizza box", false],
        ["squirrel", "Squirrel trail", false],
      ],
    ],
    timeout:
      "Rescue assist engaged: red and yellow have faded, leaving the blue target scent to the teddy bear.",
  },
  {
    id: "silkmoth",
    title: "The Silkmoth Super-Sniffer",
    range: "4:00–4:50",
    closesAt: 280,
    narration: narrationFor("silkmoth-recap"),
    prompt: "Match each super-sniffer with its smell ability.",
    steps: [
      [
        ["ant-recap", "Ant · follows a ground pheromone trail", true],
        ["dog-recap", "Dog · follows an ant-only trail", false],
        ["moth-recap", "Silkmoth · makes the ant trail", false],
      ],
      [
        ["dog-recap", "Dog · separates and tracks odours", true],
        ["ant-recap", "Ant · searches by rescue-dog tracking", false],
        ["moth-recap", "Silkmoth · sees real blue ribbons", false],
      ],
      [
        ["moth-recap", "Silkmoth · detects pheromones with antennae", true],
        ["ant-recap", "Ant · detects distant moth signals", false],
        ["dog-recap", "Dog · makes the pheromone glow", false],
      ],
    ],
    timeout:
      "Academy assist engaged: ant trail, dog tracking and silkmoth antennae are highlighted for the recap.",
  },
] as const;

type MissionIndex = 0 | 1 | 2 | 3;
type ChoiceState = "idle" | "selected" | "correct" | "incorrect";
type EvidenceMode = "independent" | "assisted";
type ChoiceTuple = readonly [id: string, label: string, correct: boolean];

interface Evidence {
  mission: MissionIndex;
  mode: EvidenceMode;
  wrongAttempts: number;
  completedAt: number;
}

/**
 * The viewer intentionally accepts a small structural contract so the world can
 * grow visually without coupling lesson timing to mesh implementation details.
 */
interface SmellWorld {
  interactiveTargets?: ReadonlyMap<string, THREE.Object3D>;
  setMission?: (mission: MissionIndex) => void;
  setProgress?: (progress: number) => void;
  setChoice?: (choiceId: string, state: ChoiceState) => void;
  focusForMission?: (mission: MissionIndex) => {
    position: THREE.Vector3;
    target: THREE.Vector3;
  };
  celebrate?: () => void;
  freeze?: () => void;
  update?: (
    elapsedSeconds: number,
    deltaSeconds: number,
    reducedMotion: boolean,
  ) => void;
  dispose?: () => void;
}

const FALLBACK_FRAMES = [
  {
    position: new THREE.Vector3(0, 2.05, 7.2),
    target: new THREE.Vector3(0, 1.25, 0),
  },
  {
    position: new THREE.Vector3(0, 1.15, 5.4),
    target: new THREE.Vector3(0, 0.75, -0.4),
  },
  {
    position: new THREE.Vector3(0.5, 1.85, 7.4),
    target: new THREE.Vector3(0, 1.15, 0),
  },
  {
    position: new THREE.Vector3(-0.3, 2.15, 6.8),
    target: new THREE.Vector3(0, 1.8, -0.5),
  },
] as const;

const INDEPENDENT_LABEL = "Solved independently";
const ASSISTED_LABEL = "Completed with timed hint";

function missionAt(seconds: number): MissionIndex {
  if (seconds < MASTER_TIMELINE.antHighway) return 0;
  if (seconds < MASTER_TIMELINE.rescueDog) return 1;
  if (seconds < MASTER_TIMELINE.silkmoth) return 2;
  return 3;
}

function formatClock(value: number) {
  const safe = Math.min(TOTAL_SECONDS, Math.max(0, Math.floor(value)));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function finalBeat(seconds: number) {
  if (seconds >= MASTER_TIMELINE.freeze) return "complete" as const;
  if (seconds >= MASTER_TIMELINE.badge) return "badge" as const;
  if (seconds >= MASTER_TIMELINE.confetti) return "confetti" as const;
  if (seconds >= MASTER_TIMELINE.finalRecap) return "portal" as const;
  return "mission" as const;
}

function choiceIdFrom(object?: THREE.Object3D | null) {
  let current = object;
  while (current) {
    if (typeof current.userData.choiceId === "string")
      return current.userData.choiceId as string;
    if (typeof current.userData.interactionId === "string") {
      return current.userData.interactionId as string;
    }
    current = current.parent;
  }
  return undefined;
}

function visibleInHierarchy(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export default function SuperSensesSmellViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<SmellWorld | null>(null);
  const focusRef = useRef<(mission: MissionIndex) => void>(() => undefined);
  const elapsedRef = useRef(0);
  const publishedTickRef = useRef(0);
  const missionRef = useRef<MissionIndex>(0);
  const stepsRef = useRef([0, 0, 0, 0]);
  const wrongAttemptsRef = useRef([0, 0, 0, 0]);
  const evidenceRef = useRef<Array<Evidence | undefined>>([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const completeRef = useRef(false);
  const closingNarratedRef = useRef(false);
  const celebratedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const chooseRef = useRef<(choiceId: string) => void>(() => undefined);
  const replayRef = useRef<() => void>(() => undefined);

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mission, setMission] = useState<MissionIndex>(0);
  const [steps, setSteps] = useState([0, 0, 0, 0]);
  const [wrongAttempts, setWrongAttempts] = useState([0, 0, 0, 0]);
  const [evidence, setEvidence] = useState<Array<Evidence | undefined>>([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const [feedback, setFeedback] = useState(
    "Smell-O-Vision is waiting for your first clue.",
  );
  const [caption, setCaption] = useState<string>(MISSIONS[0].narration);
  const [vrSupported, setVrSupported] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [immersive, setImmersive] = useState(false);

  const activeMission = MISSIONS[mission];
  const activeStep = Math.min(steps[mission], activeMission.steps.length - 1);
  const activeChoices = activeMission.steps[
    activeStep
  ] as readonly ChoiceTuple[];
  const beat = finalBeat(elapsedSeconds);

  const speakMission = useCallback((index: MissionIndex) => {
    const text = MISSIONS[index].narration;
    setCaption(text);
    unlockNarration();
    playNarration(text);
  }, []);
  replayRef.current = () => speakMission(missionRef.current);

  const publishEvidence = useCallback((record: Evidence) => {
    if (evidenceRef.current[record.mission]) return;
    const next = [...evidenceRef.current];
    next[record.mission] = record;
    evidenceRef.current = next;
    setEvidence(next);
  }, []);

  const applyTimedAssists = useCallback(
    (seconds: number) => {
      MISSIONS.forEach((definition, index) => {
        const missionIndex = index as MissionIndex;
        if (seconds < definition.closesAt || evidenceRef.current[missionIndex])
          return;
        const finalStep = definition.steps[
          definition.steps.length - 1
        ] as readonly ChoiceTuple[];
        const correctChoice = finalStep.find((choice) => choice[2])?.[0];
        const completedSteps = [...stepsRef.current];
        completedSteps[missionIndex] = definition.steps.length;
        stepsRef.current = completedSteps;
        setSteps(completedSteps);
        publishEvidence({
          mission: missionIndex,
          mode: "assisted",
          wrongAttempts: wrongAttemptsRef.current[missionIndex],
          completedAt: definition.closesAt,
        });
        if (missionRef.current === missionIndex) {
          setFeedback(definition.timeout);
          setCaption(definition.timeout);
        }
        if (correctChoice)
          worldRef.current?.setChoice?.(correctChoice, "selected");
      });
    },
    [publishEvidence],
  );

  const choose = useCallback(
    (choiceId: string) => {
      if (!startedRef.current || pausedRef.current || completeRef.current)
        return;
      const currentMission = missionRef.current;
      if (evidenceRef.current[currentMission]) return;
      const definition = MISSIONS[currentMission];
      const stepIndex = Math.min(
        stepsRef.current[currentMission],
        definition.steps.length - 1,
      );
      const options = definition.steps[stepIndex] as readonly ChoiceTuple[];
      const selected = options.find(([id]) => id === choiceId);
      if (!selected) return;

      if (!selected[2]) {
        const nextWrong = [...wrongAttemptsRef.current];
        nextWrong[currentMission] += 1;
        wrongAttemptsRef.current = nextWrong;
        setWrongAttempts(nextWrong);
        worldRef.current?.setChoice?.(choiceId, "incorrect");
        setFeedback(
          currentMission === 0
            ? "Nice try, detective. That is not the food trail—compare its colour with orange-gold."
            : currentMission === 1
              ? "That clue is weak or unrelated. Return to the brightest green chemical trail."
              : currentMission === 2
                ? "Interesting smell, but not our target. Filter it out and keep tracking blue."
                : "Check the evidence again: chemical trails, odour tracking and sensitive antennae.",
        );
        return;
      }

      worldRef.current?.setChoice?.(choiceId, "correct");
      const nextSteps = [...stepsRef.current];
      nextSteps[currentMission] += 1;
      stepsRef.current = nextSteps;
      setSteps(nextSteps);
      const finished = nextSteps[currentMission] >= definition.steps.length;
      worldRef.current?.setProgress?.(
        nextSteps[currentMission] / definition.steps.length,
      );

      if (finished) {
        publishEvidence({
          mission: currentMission,
          mode: "independent",
          wrongAttempts: wrongAttemptsRef.current[currentMission],
          completedAt: elapsedRef.current,
        });
        const messages = [
          "LOCKED ON! Food scent found independently.",
          "Ant Army Highway complete! You followed a chemical trail to food.",
          "TARGET FOUND! You separated competing smells and rescued the teddy bear.",
          "Super-sniffer check complete! Ant, dog and silkmoth evidence matched.",
        ];
        setFeedback(messages[currentMission]);
      } else {
        setFeedback(
          `TARGET LOCK · clue ${nextSteps[currentMission]} of ${definition.steps.length} found.`,
        );
      }
    },
    [publishEvidence],
  );
  chooseRef.current = choose;

  const startMission = useCallback(() => {
    if (startedRef.current) return;
    unlockNarration();
    startedRef.current = true;
    pausedRef.current = false;
    setStarted(true);
    setPaused(false);
    speakMission(0);
  }, [speakMission]);

  const togglePause = useCallback(() => {
    if (!startedRef.current || completeRef.current) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      stopNarration();
      setFeedback("Mission paused. The five-minute clock is stopped.");
    } else {
      unlockNarration();
      setFeedback("Mission resumed. Keep following the active clue.");
    }
  }, []);

  const restart = useCallback(() => {
    stopNarration();
    elapsedRef.current = 0;
    publishedTickRef.current = 0;
    missionRef.current = 0;
    stepsRef.current = [0, 0, 0, 0];
    wrongAttemptsRef.current = [0, 0, 0, 0];
    evidenceRef.current = [undefined, undefined, undefined, undefined];
    startedRef.current = false;
    pausedRef.current = false;
    completeRef.current = false;
    closingNarratedRef.current = false;
    celebratedRef.current = false;
    setElapsedSeconds(0);
    setMission(0);
    setSteps([0, 0, 0, 0]);
    setWrongAttempts([0, 0, 0, 0]);
    setEvidence([undefined, undefined, undefined, undefined]);
    setStarted(false);
    setPaused(false);
    setComplete(false);
    setCaption(MISSIONS[0].narration);
    setFeedback("Smell-O-Vision is waiting for your first clue.");
    worldRef.current?.setMission?.(0);
    worldRef.current?.setProgress?.(0);
    focusRef.current(0);
  }, []);

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: {
          requestSession?: (
            mode: string,
            options: object,
          ) => Promise<XRSession>;
        };
      }
    ).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      startMission();
      window.setTimeout(() => replayRef.current(), 650);
    } catch {
      setFeedback(
        "VR could not start. Continue in browser mode and check headset permissions.",
      );
    }
  }, [startMission]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const publish = () => {
      reducedMotionRef.current = query.matches;
      setReducedMotion(query.matches);
    };
    publish();
    query.addEventListener?.("change", publish);
    return () => query.removeEventListener?.("change", publish);
  }, []);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    let active = true;
    void xr
      ?.isSessionSupported("immersive-vr")
      .then((supported) => active && setVrSupported(supported))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!started || paused || complete) return;
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      if (previous === undefined) previous = now;
      const delta = Math.max(0, (now - previous) / 1000);
      previous = now;
      const next = Math.min(TOTAL_SECONDS, elapsedRef.current + delta);
      elapsedRef.current = next;
      const displayTick = Math.floor(next * 4);
      if (displayTick !== publishedTickRef.current || next >= TOTAL_SECONDS) {
        publishedTickRef.current = displayTick;
        setElapsedSeconds(next);
      }
      applyTimedAssists(next);

      const nextMission = missionAt(next);
      if (nextMission !== missionRef.current) {
        missionRef.current = nextMission;
        setMission(nextMission);
        worldRef.current?.setMission?.(nextMission);
        focusRef.current(nextMission);
        speakMission(nextMission);
        setFeedback(
          `Mission ${nextMission + 1} activated · ${MISSIONS[nextMission].title}`,
        );
      }

      if (next >= MASTER_TIMELINE.finalRecap && !closingNarratedRef.current) {
        closingNarratedRef.current = true;
        setCaption(FINAL_RECAP_NARRATION);
        playNarration(FINAL_RECAP_NARRATION);
      }
      if (next >= MASTER_TIMELINE.confetti && !celebratedRef.current) {
        celebratedRef.current = true;
        worldRef.current?.celebrate?.();
      }
      if (next >= TOTAL_SECONDS) {
        completeRef.current = true;
        setComplete(true);
        setPaused(false);
        worldRef.current?.freeze?.();
        setCaption("Mission complete — return to classroom.");
        setFeedback("SUPER SNIFFER · LEVEL 5 UNLOCKED");
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [applyTimedAssists, complete, paused, speakMission, started]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setSceneError(
        "This device could not open the 3D scent world. Try a WebGL-enabled browser.",
      );
      return;
    }
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive Super Senses smell world",
    );
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ed6dc);
    scene.fog = new THREE.FogExp2(0xa4d3d3, 0.018);
    const camera = new THREE.PerspectiveCamera(
      58,
      Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight),
      0.05,
      120,
    );
    camera.position.copy(FALLBACK_FRAMES[0].position);
    camera.lookAt(FALLBACK_FRAMES[0].target);

    const world = createSuperSensesSmellWorld(scene) as unknown as SmellWorld;
    worldRef.current = world;
    world.setMission?.(0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(FALLBACK_FRAMES[0].target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 1.4;
    controls.maxDistance = 13;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.015;
    controls.update();

    focusRef.current = (index) => {
      if (renderer.xr.isPresenting) return;
      const frame = world.focusForMission?.(index) ?? FALLBACK_FRAMES[index];
      controls.target.copy(frame.target);
      camera.position.copy(frame.position);
      camera.lookAt(frame.target);
      controls.update();
    };

    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.007, 2.4, 6),
        new THREE.MeshBasicMaterial({
          color: 0xffd166,
          transparent: true,
          opacity: 0.9,
        }),
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = -1.2;
      controller.add(beam);
    });

    const raycaster = new THREE.Raycaster();
    const interactiveRoots = () =>
      world.interactiveTargets
        ? Array.from(world.interactiveTargets.values())
        : scene.children;
    const pick = (origin: THREE.Vector3, direction: THREE.Vector3) => {
      raycaster.set(origin, direction);
      const hit = raycaster
        .intersectObjects(interactiveRoots(), true)
        .find(({ object }) => visibleInHierarchy(object));
      const choiceId = choiceIdFrom(hit?.object);
      if (choiceId) chooseRef.current(choiceId);
    };
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      const origin = new THREE.Vector3().setFromMatrixPosition(
        controller.matrixWorld,
      );
      const direction = new THREE.Vector3(0, 0, -1).transformDirection(
        controller.matrixWorld,
      );
      pick(origin, direction);
    };
    controllers.forEach((controller) =>
      controller.addEventListener("selectstart", onControllerSelect as any),
    );

    const pointer = new THREE.Vector2();
    const onPointerUp = (event: PointerEvent) => {
      if (renderer.xr.isPresenting || event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster
        .intersectObjects(interactiveRoots(), true)
        .find(({ object }) => visibleInHierarchy(object));
      const choiceId = choiceIdFrom(hit?.object);
      if (choiceId) chooseRef.current(choiceId);
    };
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: () => {
        const definition = MISSIONS[missionRef.current];
        const stepIndex = Math.min(
          stepsRef.current[missionRef.current],
          definition.steps.length - 1,
        );
        const correct = (
          definition.steps[stepIndex] as readonly ChoiceTuple[]
        ).find((option) => option[2]);
        if (correct) chooseRef.current(correct[0]);
      },
      onBack: togglePause,
      onNarrate: () => replayRef.current(),
      startPosition: new THREE.Vector3(0, 0, 2.6),
      movementBounds: new THREE.Box2(
        new THREE.Vector2(-8.5, -7.5),
        new THREE.Vector2(8.5, 7.5),
      ),
    });

    const onSessionStart = () => setImmersive(true);
    const onSessionEnd = () => setImmersive(false);
    renderer.xr.addEventListener("sessionstart", onSessionStart);
    renderer.xr.addEventListener("sessionend", onSessionEnd);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      questVr.update();
      if (!renderer.xr.isPresenting) controls.update();
      const missionStarts = [
        0,
        MASTER_TIMELINE.antHighway,
        MASTER_TIMELINE.rescueDog,
        MASTER_TIMELINE.silkmoth,
      ] as const;
      const missionEnds = [
        MASTER_TIMELINE.antHighway,
        MASTER_TIMELINE.rescueDog,
        MASTER_TIMELINE.silkmoth,
        MASTER_TIMELINE.freeze,
      ] as const;
      const activeMissionIndex = missionRef.current;
      world.setProgress?.(
        THREE.MathUtils.clamp(
          (elapsedRef.current - missionStarts[activeMissionIndex]) /
            (missionEnds[activeMissionIndex] -
              missionStarts[activeMissionIndex]),
          0,
          1,
        ),
      );
      world.update?.(elapsedRef.current, delta, reducedMotionRef.current);
      renderer.render(scene, camera);
    });

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", resize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.xr.removeEventListener("sessionend", onSessionEnd);
      controllers.forEach((controller) =>
        controller.removeEventListener(
          "selectstart",
          onControllerSelect as any,
        ),
      );
      questVr.dispose();
      controls.dispose();
      world.dispose?.();
      renderer.dispose();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
      rendererRef.current = null;
      worldRef.current = null;
      stopNarration();
    };
  }, [togglePause]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches(
          "button, input, select, textarea, [contenteditable='true']",
        )
      )
        return;
      if (event.key >= "1" && event.key <= "3") {
        const option = activeChoices[Number(event.key) - 1];
        if (option) choose(option[0]);
      } else if (event.key.toLowerCase() === "p" || event.key === " ") {
        event.preventDefault();
        togglePause();
      } else if (event.key.toLowerCase() === "n") {
        replayRef.current();
      } else if (
        event.key === "Escape" &&
        rendererRef.current?.xr.isPresenting
      ) {
        void rendererRef.current.xr.getSession()?.end();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeChoices, choose, togglePause]);

  const closingCopy = useMemo(() => {
    if (beat === "portal")
      return "Green, blue and purple trails spiral into the Super Senses portal.";
    if (beat === "confetti")
      return "Academy graduation confetti! Smell can reveal amazing invisible clues.";
    if (beat === "badge") return "SUPER SNIFFER · LEVEL 5 UNLOCKED";
    if (beat === "complete") return "MISSION COMPLETE — RETURN TO CLASSROOM";
    return "";
  }, [beat]);

  const progress = Math.min(100, (elapsedSeconds / TOTAL_SECONDS) * 100);

  return (
    <main
      className={styles.root}
      data-mission={activeMission.id}
      data-final-beat={beat}
      data-reduced-motion={reducedMotion}
    >
      <div
        ref={mountRef}
        className={styles.canvas}
        data-testid="simulation-canvas"
        aria-label="Interactive 360 degree Super Senses smell simulation"
      />

      {!started && (
        <section className={styles.launch} data-testid="smell-launch-screen">
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>
              Class 5 · Super Senses · Exactly 5 minutes
            </div>
            <h1>Detective Snout and the Invisible Clues</h1>
            <p>
              Turn on Smell-O-Vision, follow an ant pheromone highway, solve a
              rescue-dog search and discover the silkmoth&apos;s extraordinary
              antennae.
            </p>
            <div className={styles.factRow}>
              <span>4 timed missions</span>
              <span>Browser + Meta Quest</span>
              <span>Automatic learning assists</span>
              <span>Indian-English narration</span>
            </div>
            {sceneError && <p className={styles.error}>{sceneError}</p>}
            <div className={styles.launchActions}>
              <button
                type="button"
                className={styles.primary}
                data-testid="simulation-launch"
                onClick={startMission}
              >
                Activate Smell-O-Vision
              </button>
              {vrSupported && (
                <button
                  type="button"
                  className={styles.secondary}
                  data-testid="enter-vr-launch"
                  onClick={enterVR}
                >
                  Enter immersive VR
                </button>
              )}
            </div>
            <small>
              The mission clock starts only after you choose a start button.
            </small>
          </div>
        </section>
      )}

      {started && (
        <aside className={styles.panel} aria-label="Super Senses mission panel">
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
            {[
              MASTER_TIMELINE.antHighway,
              MASTER_TIMELINE.rescueDog,
              MASTER_TIMELINE.silkmoth,
              MASTER_TIMELINE.finalRecap,
            ].map((second) => (
              <i
                key={second}
                style={{ left: `${(second / TOTAL_SECONDS) * 100}%` }}
              />
            ))}
          </div>

          <header className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>
                Mission {mission + 1} of 4 · {activeMission.range}
              </span>
              <h2 data-testid="smell-mission">{activeMission.title}</h2>
            </div>
            <time
              data-testid="smell-timer"
              dateTime={`PT${Math.floor(elapsedSeconds)}S`}
            >
              {formatClock(elapsedSeconds)} <small>/ 05:00</small>
            </time>
          </header>

          <div className={styles.panelScroll}>
            {beat !== "mission" ? (
              <section
                className={styles.finalCard}
                data-testid="smell-final-beat"
              >
                <div className={styles.nose}>
                  {beat === "complete" ? "🏅" : "👃"}
                </div>
                <h3>{closingCopy}</h3>
                <p>
                  Smell particles carry chemical information. Ants follow
                  pheromone trails, dogs separate and track odours, and
                  silkmoths detect pheromones with sensitive antennae.
                </p>
                {complete && (
                  <strong data-testid="smell-completion">
                    Frozen at exactly 05:00
                  </strong>
                )}
              </section>
            ) : (
              <>
                <p className={styles.prompt}>{activeMission.prompt}</p>
                <div
                  className={styles.choiceGrid}
                  role="group"
                  aria-label={activeMission.prompt}
                >
                  {activeChoices.map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      className={styles.choice}
                      data-testid={`smell-choice-${id}`}
                      disabled={Boolean(evidence[mission]) || paused}
                      onClick={() => choose(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {activeMission.steps.length > 1 && (
                  <div className={styles.stepDots} aria-label="Clue progress">
                    {activeMission.steps.map((_, index) => (
                      <span key={index} data-complete={index < steps[mission]}>
                        {index < steps[mission] ? "✓" : index + 1}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <p
              className={styles.feedback}
              role="status"
              data-testid="smell-feedback"
            >
              {feedback}
            </p>

            <figure className={styles.caption} data-testid="smell-caption">
              <span aria-hidden="true">🔊</span>
              <figcaption>{caption}</figcaption>
            </figure>

            <section className={styles.evidence} data-testid="smell-evidence">
              <h3>Detective evidence</h3>
              <ol>
                {MISSIONS.map((definition, index) => {
                  const record = evidence[index];
                  return (
                    <li
                      key={definition.id}
                      data-mode={record?.mode ?? "pending"}
                    >
                      <span>
                        {record ? "✓" : index === mission ? "●" : "○"}
                      </span>
                      <div>
                        <strong>{definition.title}</strong>
                        <small>
                          {record
                            ? `${record.mode === "independent" ? INDEPENDENT_LABEL : ASSISTED_LABEL}${
                                record.wrongAttempts
                                  ? ` · ${record.wrongAttempts} retry`
                                  : ""
                              }`
                            : index === mission
                              ? `${wrongAttempts[index]} retries · investigating`
                              : "Waiting"}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <footer className={styles.panelFooter}>
            <button
              type="button"
              className={styles.iconButton}
              data-testid="narration-replay"
              onClick={() => replayRef.current()}
              disabled={complete}
            >
              🔊 Replay
            </button>
            <button
              type="button"
              className={styles.iconButton}
              data-testid="pause-button"
              onClick={togglePause}
              disabled={complete}
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            {vrSupported && !immersive && (
              <button
                type="button"
                className={styles.iconButton}
                data-testid="enter-vr"
                onClick={enterVR}
              >
                🥽 VR
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              data-testid="restart"
              onClick={restart}
            >
              ↻ Restart
            </button>
          </footer>

          {paused && (
            <div className={styles.paused}>Mission paused · timer stopped</div>
          )}
          <div className={styles.controlsHint}>
            Click or keys 1–3 to choose · drag to orbit · right-drag to pan ·
            scroll to zoom · P pauses · N narrates · Quest trigger selects ·
            joysticks move/turn · B or right grip exits VR
          </div>
        </aside>
      )}
    </main>
  );
}
