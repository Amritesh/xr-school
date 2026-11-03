"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SUPER_SENSES_SIGHT_SIMULATION } from "@xr-school/simulation-content";

import { createSuperSensesSightWorld } from "../../lib/world-builder/superSensesSightWorld";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./SuperSensesSightViewer.module.css";

const TOTAL_SECONDS = 300;
const GAZE_DWELL_SECONDS = 1.35;

const MASTER_TIMELINE = {
  eagleCalibration: 0,
  fieldMouse: 60,
  nightLemur: 150,
  chameleonFly: 240,
  recap: 280,
  graduation: 290,
  fireworks: 293,
  feathersAndStars: 295,
  badgePulse: 298,
  freeze: 300,
} as const;

const NARRATION_BY_STAGE = new Map(
  SUPER_SENSES_SIGHT_SIMULATION.narration.cues.map((cue) => [
    cue.stageId,
    cue.text,
  ]),
);

function narrationFor(stageId: string, fallback: string) {
  return NARRATION_BY_STAGE.get(stageId) ?? fallback;
}

const MISSIONS = [
  {
    id: "eagle-calibration",
    title: "Calibrate Eagle Vision",
    range: "0:00–1:00",
    boundary: MASTER_TIMELINE.fieldMouse,
    hintAt: 50,
    assistAt: 56,
    narration: narrationFor(
      "eagle-calibration",
      "Captain Iris here. Choose the eagle symbol to compare a sharp central view with the wider scene. Eagles can resolve finer detail than humans under good conditions, but their eyes do not work like a camera zoom lens.",
    ),
    prompt:
      "Choose the animal symbol linked with exceptional long-distance detail.",
    steps: [
      [
        ["mountain-calibration", "Mountain symbol", false],
        ["eagle-calibration", "Eagle symbol", true],
        ["cloud-calibration", "Cloud symbol", false],
      ],
    ],
    hint: "Calibration hint: Captain Iris is a bird. Hold the eagle symbol in your gaze, pointer or controller ray.",
    assist:
      "Calibration assist engaged. The aligned rings now show the high-detail comparison.",
    science:
      "Model note: many eagles have exceptional visual acuity, but performance varies by species, distance, light and contrast. The focus effect is a comparison model—not literal eagle vision.",
  },
  {
    id: "field-mouse",
    title: "Scan the Valley",
    range: "1:00–2:30",
    boundary: MASTER_TIMELINE.nightLemur,
    hintAt: 135,
    assistAt: 145,
    narration: narrationFor(
      "field-mouse",
      "Scan the valley carefully. First inspect the patch of moving grass, then identify the field mouse. The activity models how fine detail can help a bird detect small prey; it does not show exactly what any eagle sees.",
    ),
    prompt: "Find the movement clue, then identify its source.",
    steps: [
      [
        ["valley-rock", "Grey rock · still edge", false],
        ["valley-bush", "Round bush · wind movement", false],
        ["valley-grass", "Thin grass · local movement", true],
      ],
      [
        ["field-mouse", "Field mouse beside the moving grass", true],
        ["valley-rock", "Shadow behind the rock", false],
        ["valley-bush", "Leaves inside the bush", false],
      ],
    ],
    hint: "Valley hint: compare the motion of one small grass patch with the broad wind movement.",
    assist:
      "Valley assist engaged. The local grass movement and field mouse are outlined.",
    science:
      "Evidence label: the field mouse is a staged target. Detection in nature depends on height, movement, cover, weather and light—not acuity alone.",
  },
  {
    id: "night-lemur",
    title: "Decode the Night Clues",
    range: "2:30–4:00",
    boundary: MASTER_TIMELINE.chameleonFly,
    hintAt: 225,
    assistAt: 235,
    narration: narrationFor(
      "night-lemur",
      "Night mode is active. Check the left bush, the right tree and the reflected eyes in order, then identify the lemur. Some lemurs are adapted for low light; the brightened scene is only a learning aid and is not their literal view.",
    ),
    prompt: "Trace the low-light evidence from left to right.",
    steps: [
      [
        ["night-left-bush", "1 · rustle in the left bush", true],
        ["night-right-tree", "2 · scrape on the right tree", false],
        ["night-eyes", "3 · reflected eyes", false],
      ],
      [
        ["night-left-bush", "1 · left-bush rustle", false],
        ["night-right-tree", "2 · bark movement on the right", true],
        ["night-eyes", "3 · reflected eyes", false],
      ],
      [
        ["night-left-bush", "1 · left-bush rustle", false],
        ["night-right-tree", "2 · right-tree movement", false],
        ["night-eyes", "3 · paired reflected eyes", true],
      ],
      [
        ["lemur", "Lemur on the moonlit branch", true],
        ["night-left-bush", "Return to the first clue", false],
        ["night-right-tree", "Return to the second clue", false],
      ],
    ],
    hint: "Night hint: follow the numbered clue lights—left bush, right tree, then reflected eyes.",
    assist:
      "Low-light assist engaged. The three evidence points now lead to the lemur.",
    science:
      "Model note: some lemurs are nocturnal or active at twilight, while others are not. Low-light adaptations improve sensitivity but do not turn darkness into a bright, full-colour scene.",
  },
  {
    id: "chameleon-fly",
    title: "Chameleon Eye Patrol",
    range: "4:00–4:40",
    boundary: MASTER_TIMELINE.recap,
    hintAt: 268,
    assistAt: 277,
    narration: narrationFor(
      "chameleon-fly",
      "Track the fly around the chameleon: left, rear, right and front. A chameleon's eyes can scan widely and often move independently, then coordinate when aiming. Its field is broad, not a perfect blind-spot-free three hundred and sixty degrees.",
    ),
    prompt: "Track the fly in the exact order shown by the patrol arrows.",
    steps: [
      [
        ["fly-left", "1 · fly on the left", true],
        ["fly-rear", "2 · fly behind", false],
        ["fly-right", "3 · fly on the right", false],
        ["fly-front", "4 · fly in front", false],
      ],
      [
        ["fly-left", "1 · left position", false],
        ["fly-rear", "2 · rear position", true],
        ["fly-right", "3 · right position", false],
        ["fly-front", "4 · front position", false],
      ],
      [
        ["fly-left", "1 · left position", false],
        ["fly-rear", "2 · rear position", false],
        ["fly-right", "3 · right position", true],
        ["fly-front", "4 · front position", false],
      ],
      [
        ["fly-left", "1 · left position", false],
        ["fly-rear", "2 · rear position", false],
        ["fly-right", "3 · right position", false],
        ["fly-front", "4 · front position", true],
      ],
    ],
    hint: "Patrol hint: use the numbered orbit—left, rear, right, then front.",
    assist:
      "Chameleon assist engaged. The four fly positions now illuminate in sequence.",
    science:
      "Evidence label: chameleon eyes provide a very wide field and can move with substantial independence. When targeting prey, the eyes can coordinate; “360° vision” is a shorthand, not a claim of a perfect sphere with no blind spots.",
  },
] as const;

const FINAL_RECAP_NARRATION =
  "Eagles resolve distant detail. Some animals adapt to dim light. Chameleons scan widely. Each visual system fits its task.";

type MissionIndex = 0 | 1 | 2 | 3;
type ChoiceState = "idle" | "selected" | "correct" | "incorrect" | "hint";
type EvidenceMode = "independent" | "assisted";
type ChoiceTuple = readonly [id: string, label: string, correct: boolean];
type FinalBeat =
  | "mission"
  | "recap"
  | "graduation"
  | "fireworks"
  | "feathers-stars"
  | "badge"
  | "complete";
type CelebrationBeat =
  | "recap"
  | "graduation"
  | "fireworks"
  | "feathers-stars"
  | "badge";

interface Evidence {
  mission: MissionIndex;
  mode: EvidenceMode;
  wrongAttempts: number;
  completedAt: number;
}

/**
 * Small structural boundary between lesson timing and the authored Three.js
 * world. Optional hooks let the viewer remain usable while visual details grow.
 */
interface SightWorld {
  interactiveTargets?: ReadonlyMap<string, THREE.Object3D>;
  setMission?: (mission: MissionIndex) => void;
  setTimeline?: (seconds: number) => void;
  setProgress?: (progress: number) => void;
  setChoice?: (choiceId: string, state: ChoiceState) => void;
  focusForMission?: (mission: MissionIndex) => {
    position: THREE.Vector3;
    target: THREE.Vector3;
  };
  celebrate?: (beat: CelebrationBeat) => void;
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
    position: new THREE.Vector3(0, 2.1, 7.4),
    target: new THREE.Vector3(0, 1.35, 0),
  },
  {
    position: new THREE.Vector3(0.8, 3.1, 9.2),
    target: new THREE.Vector3(0, 0.7, -1.1),
  },
  {
    position: new THREE.Vector3(0, 1.8, 7.1),
    target: new THREE.Vector3(0, 1.55, -0.6),
  },
  {
    position: new THREE.Vector3(0, 1.75, 6.2),
    target: new THREE.Vector3(0, 1.35, -0.45),
  },
] as const;

const ALL_CHOICE_IDS = Array.from(
  new Set(
    MISSIONS.flatMap((mission) =>
      mission.steps.flatMap((step) => step.map(([id]) => id)),
    ),
  ),
);

const INDEPENDENT_LABEL = "Solved before timed guidance";
const ASSISTED_LABEL = "Completed with timed guidance";

function missionAt(seconds: number): MissionIndex {
  if (seconds < MASTER_TIMELINE.fieldMouse) return 0;
  if (seconds < MASTER_TIMELINE.nightLemur) return 1;
  if (seconds < MASTER_TIMELINE.chameleonFly) return 2;
  return 3;
}

function formatClock(value: number) {
  const safe = Math.min(TOTAL_SECONDS, Math.max(0, Math.floor(value)));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function finalBeat(seconds: number): FinalBeat {
  if (seconds >= MASTER_TIMELINE.freeze) return "complete";
  if (seconds >= MASTER_TIMELINE.badgePulse) return "badge";
  if (seconds >= MASTER_TIMELINE.feathersAndStars) return "feathers-stars";
  if (seconds >= MASTER_TIMELINE.fireworks) return "fireworks";
  if (seconds >= MASTER_TIMELINE.graduation) return "graduation";
  if (seconds >= MASTER_TIMELINE.recap) return "recap";
  return "mission";
}

function choiceIdFrom(object?: THREE.Object3D | null) {
  let current = object;
  while (current) {
    if (typeof current.userData.choiceId === "string") {
      return current.userData.choiceId as string;
    }
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

function correctChoiceFor(mission: MissionIndex, step: number) {
  const definition = MISSIONS[mission];
  const boundedStep = Math.min(step, definition.steps.length - 1);
  return (definition.steps[boundedStep] as readonly ChoiceTuple[]).find(
    (choice) => choice[2],
  )?.[0];
}

export default function SuperSensesSightViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<SightWorld | null>(null);
  const focusRef = useRef<(mission: MissionIndex) => void>(() => undefined);
  const elapsedRef = useRef(0);
  const publishedTickRef = useRef(0);
  const missionRef = useRef<MissionIndex>(0);
  const stepsRef = useRef([0, 0, 0, 0]);
  const wrongAttemptsRef = useRef([0, 0, 0, 0]);
  const hintedRef = useRef([false, false, false, false]);
  const evidenceRef = useRef<Array<Evidence | undefined>>([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const firedBeatsRef = useRef(new Set<FinalBeat>());
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const completeRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const chooseRef = useRef<(choiceId: string) => void>(() => undefined);
  const replayRef = useRef<() => void>(() => undefined);
  const gazeTargetRef = useRef<string | null>(null);

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
    "Vision Lab ready. Choose the eagle symbol to begin collecting evidence.",
  );
  const [caption, setCaption] = useState<string>(MISSIONS[0].narration);
  const [vrSupported, setVrSupported] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [gazeTarget, setGazeTarget] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState(0);

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

  const applyTimedSupports = useCallback(
    (seconds: number) => {
      MISSIONS.forEach((definition, index) => {
        const missionIndex = index as MissionIndex;
        if (evidenceRef.current[missionIndex]) return;

        if (seconds >= definition.hintAt && !hintedRef.current[missionIndex]) {
          hintedRef.current[missionIndex] = true;
          const correct = correctChoiceFor(
            missionIndex,
            stepsRef.current[missionIndex],
          );
          if (correct) worldRef.current?.setChoice?.(correct, "hint");
          if (missionRef.current === missionIndex) {
            setFeedback(definition.hint);
            setCaption(definition.hint);
          }
        }

        if (seconds < definition.assistAt) return;
        definition.steps.forEach((step) => {
          const correct = (step as readonly ChoiceTuple[]).find(
            (choice) => choice[2],
          )?.[0];
          if (correct) worldRef.current?.setChoice?.(correct, "hint");
        });
        const completedSteps = [...stepsRef.current];
        completedSteps[missionIndex] = definition.steps.length;
        stepsRef.current = completedSteps;
        setSteps(completedSteps);
        worldRef.current?.setProgress?.(1);
        publishEvidence({
          mission: missionIndex,
          mode: "assisted",
          wrongAttempts: wrongAttemptsRef.current[missionIndex],
          completedAt: definition.assistAt,
        });
        if (missionRef.current === missionIndex) {
          setFeedback(definition.assist);
          setCaption(definition.assist);
        }
      });
    },
    [publishEvidence],
  );

  const choose = useCallback(
    (choiceId: string) => {
      if (!startedRef.current || pausedRef.current || completeRef.current) {
        return;
      }
      const currentMission = missionRef.current;
      if (
        elapsedRef.current >= MASTER_TIMELINE.recap ||
        evidenceRef.current[currentMission]
      ) {
        return;
      }
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
        const responses = [
          "That symbol is not an animal vision specialist. Follow Captain Iris and choose the eagle.",
          "That is a broad or still feature. Look for movement confined to one thin grass patch.",
          "Keep the evidence order: left bush, right tree, reflected eyes, then the animal.",
          "Follow the patrol order exactly: left, rear, right, front.",
        ];
        setFeedback(responses[currentMission]);
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
          mode: hintedRef.current[currentMission] ? "assisted" : "independent",
          wrongAttempts: wrongAttemptsRef.current[currentMission],
          completedAt: elapsedRef.current,
        });
        const messages = [
          "CALIBRATED · high-detail comparison ready.",
          "TARGET FOUND · local grass movement led to the field mouse.",
          "NIGHT EVIDENCE COMPLETE · the clues led to the lemur.",
          "WIDE-FIELD PATROL COMPLETE · left, rear, right and front tracked.",
        ];
        setFeedback(messages[currentMission]);
      } else {
        setFeedback(
          `EVIDENCE LOCKED · step ${nextSteps[currentMission]} of ${definition.steps.length}.`,
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
      setFeedback(
        "Investigation paused. The five-minute story clock is stopped.",
      );
    } else {
      unlockNarration();
      setFeedback(
        "Investigation resumed. Continue with the active evidence step.",
      );
    }
  }, []);

  const restart = useCallback(() => {
    stopNarration();
    elapsedRef.current = 0;
    publishedTickRef.current = 0;
    missionRef.current = 0;
    stepsRef.current = [0, 0, 0, 0];
    wrongAttemptsRef.current = [0, 0, 0, 0];
    hintedRef.current = [false, false, false, false];
    evidenceRef.current = [undefined, undefined, undefined, undefined];
    firedBeatsRef.current.clear();
    startedRef.current = false;
    pausedRef.current = false;
    completeRef.current = false;
    gazeTargetRef.current = null;
    setElapsedSeconds(0);
    setMission(0);
    setSteps([0, 0, 0, 0]);
    setWrongAttempts([0, 0, 0, 0]);
    setEvidence([undefined, undefined, undefined, undefined]);
    setStarted(false);
    setPaused(false);
    setComplete(false);
    setGazeTarget(null);
    setGazeProgress(0);
    setCaption(MISSIONS[0].narration);
    setFeedback(
      "Vision Lab ready. Choose the eagle symbol to begin collecting evidence.",
    );
    worldRef.current?.setTimeline?.(0);
    worldRef.current?.setMission?.(0);
    worldRef.current?.setProgress?.(0);
    ALL_CHOICE_IDS.forEach((id) => worldRef.current?.setChoice?.(id, "idle"));
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
        "Immersive mode could not start. Continue in the browser and check headset permissions.",
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
      applyTimedSupports(next);

      const nextMission = missionAt(next);
      if (next < MASTER_TIMELINE.recap && nextMission !== missionRef.current) {
        missionRef.current = nextMission;
        setMission(nextMission);
        worldRef.current?.setMission?.(nextMission);
        focusRef.current(nextMission);
        speakMission(nextMission);
        setFeedback(
          `Mission ${nextMission + 1} activated · ${MISSIONS[nextMission].title}`,
        );
      }

      const finalEvents: ReadonlyArray<{
        beat: Exclude<FinalBeat, "mission" | "complete">;
        at: number;
        feedback: string;
      }> = [
        {
          beat: "recap",
          at: MASTER_TIMELINE.recap,
          feedback: "RECAP · compare each eye to its task and conditions.",
        },
        {
          beat: "graduation",
          at: MASTER_TIMELINE.graduation,
          feedback: "VISION ACADEMY GRADUATION · evidence record complete.",
        },
        {
          beat: "fireworks",
          at: MASTER_TIMELINE.fireworks,
          feedback: "Fireworks at 04:53 · celebration sequence active.",
        },
        {
          beat: "feathers-stars",
          at: MASTER_TIMELINE.feathersAndStars,
          feedback: "Feathers and stars at 04:55 · final badge incoming.",
        },
        {
          beat: "badge",
          at: MASTER_TIMELINE.badgePulse,
          feedback: "SUPER SIGHT SCIENTIST · badge pulse at 04:58.",
        },
      ];

      finalEvents.forEach((event) => {
        if (next < event.at || firedBeatsRef.current.has(event.beat)) return;
        firedBeatsRef.current.add(event.beat);
        worldRef.current?.celebrate?.(event.beat);
        setFeedback(event.feedback);
        if (event.beat === "recap") {
          setCaption(FINAL_RECAP_NARRATION);
          playNarration(FINAL_RECAP_NARRATION);
        }
      });

      if (next >= MASTER_TIMELINE.freeze) {
        completeRef.current = true;
        firedBeatsRef.current.add("complete");
        setComplete(true);
        setPaused(false);
        setGazeTarget(null);
        setGazeProgress(0);
        worldRef.current?.freeze?.();
        setCaption(
          "Mission complete. The scene is frozen at exactly five minutes.",
        );
        setFeedback("MISSION COMPLETE · FROZEN AT 05:00");
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [applyTimedSupports, complete, paused, speakMission, started]);

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
        "This device could not open the 3D vision world. Try a WebGL-enabled browser.",
      );
      return;
    }
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive Super Senses animal vision world",
    );
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fc9db);
    scene.fog = new THREE.FogExp2(0xa9d6dd, 0.015);
    const camera = new THREE.PerspectiveCamera(
      57,
      Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight),
      0.05,
      140,
    );
    camera.position.copy(FALLBACK_FRAMES[0].position);
    camera.lookAt(FALLBACK_FRAMES[0].target);

    const world = createSuperSensesSightWorld(scene) as unknown as SightWorld;
    worldRef.current = world;
    world.setMission?.(0);
    world.setTimeline?.(0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(FALLBACK_FRAMES[0].target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 1.35;
    controls.maxDistance = 15;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.012;
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
        new THREE.CylinderGeometry(0.002, 0.007, 2.8, 6),
        new THREE.MeshBasicMaterial({
          color: 0xffe277,
          transparent: true,
          opacity: 0.88,
        }),
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = -1.4;
      controller.add(beam);
    });

    const raycaster = new THREE.Raycaster();
    const interactiveRoots = () =>
      world.interactiveTargets
        ? Array.from(new Set(world.interactiveTargets.values()))
        : scene.children;
    const hitChoice = () =>
      choiceIdFrom(
        raycaster
          .intersectObjects(interactiveRoots(), true)
          .find(({ object }) => visibleInHierarchy(object))?.object,
      );
    const pick = (origin: THREE.Vector3, direction: THREE.Vector3) => {
      raycaster.set(origin, direction);
      const choiceId = hitChoice();
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
      const choiceId = hitChoice();
      if (choiceId) chooseRef.current(choiceId);
    };
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: () => {
        if (gazeTargetRef.current) {
          chooseRef.current(gazeTargetRef.current);
        }
      },
      onBack: togglePause,
      onNarrate: () => replayRef.current(),
      startPosition: new THREE.Vector3(0, 0, 2.55),
      movementBounds: new THREE.Box2(
        new THREE.Vector2(-9, -8),
        new THREE.Vector2(9, 8),
      ),
    });

    const onSessionStart = () => setImmersive(true);
    const onSessionEnd = () => {
      setImmersive(false);
      gazeTargetRef.current = null;
      setGazeTarget(null);
      setGazeProgress(0);
    };
    renderer.xr.addEventListener("sessionstart", onSessionStart);
    renderer.xr.addEventListener("sessionend", onSessionEnd);

    let dwellSeconds = 0;
    let lastPublishedDwell = -1;
    let gazeLatch: string | null = null;
    const gazeOrigin = new THREE.Vector3();
    const gazeDirection = new THREE.Vector3();
    const centre = new THREE.Vector2(0, 0);
    const updateGaze = (delta: number) => {
      if (
        !startedRef.current ||
        pausedRef.current ||
        completeRef.current ||
        elapsedRef.current >= MASTER_TIMELINE.recap ||
        evidenceRef.current[missionRef.current]
      ) {
        gazeLatch = null;
        dwellSeconds = 0;
        gazeTargetRef.current = null;
        if (lastPublishedDwell !== 0) {
          lastPublishedDwell = 0;
          setGazeTarget(null);
          setGazeProgress(0);
        }
        return;
      }

      if (renderer.xr.isPresenting) {
        const xrCamera = renderer.xr.getCamera();
        xrCamera.getWorldPosition(gazeOrigin);
        xrCamera.getWorldDirection(gazeDirection);
        raycaster.set(gazeOrigin, gazeDirection);
      } else {
        raycaster.setFromCamera(centre, camera);
      }
      const candidate = hitChoice();
      const validChoice = (
        MISSIONS[missionRef.current].steps[
          Math.min(
            stepsRef.current[missionRef.current],
            MISSIONS[missionRef.current].steps.length - 1,
          )
        ] as readonly ChoiceTuple[]
      ).some(([id]) => id === candidate);
      const nextTarget = validChoice ? (candidate ?? null) : null;

      if (nextTarget !== gazeLatch) {
        gazeLatch = nextTarget;
        dwellSeconds = 0;
        gazeTargetRef.current = nextTarget;
        setGazeTarget(nextTarget);
        setGazeProgress(0);
        lastPublishedDwell = 0;
        return;
      }
      if (!nextTarget) return;

      dwellSeconds += delta;
      const progress = THREE.MathUtils.clamp(
        dwellSeconds / GAZE_DWELL_SECONDS,
        0,
        1,
      );
      const publishedDwell = Math.floor(progress * 12);
      if (publishedDwell !== lastPublishedDwell) {
        lastPublishedDwell = publishedDwell;
        setGazeProgress(progress);
      }
      if (progress >= 1) {
        chooseRef.current(nextTarget);
        gazeLatch = null;
        dwellSeconds = 0;
        gazeTargetRef.current = null;
        setGazeTarget(null);
        setGazeProgress(0);
        lastPublishedDwell = 0;
      }
    };

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      questVr.update();
      if (!renderer.xr.isPresenting) controls.update();
      const missionStarts = [
        MASTER_TIMELINE.eagleCalibration,
        MASTER_TIMELINE.fieldMouse,
        MASTER_TIMELINE.nightLemur,
        MASTER_TIMELINE.chameleonFly,
      ] as const;
      const missionEnds = [
        MASTER_TIMELINE.fieldMouse,
        MASTER_TIMELINE.nightLemur,
        MASTER_TIMELINE.chameleonFly,
        MASTER_TIMELINE.recap,
      ] as const;
      const activeMissionIndex = missionRef.current;
      world.setTimeline?.(elapsedRef.current);
      const timelineProgress = THREE.MathUtils.clamp(
        (elapsedRef.current - missionStarts[activeMissionIndex]) /
          (missionEnds[activeMissionIndex] - missionStarts[activeMissionIndex]),
        0,
        1,
      );
      const evidenceProgress = THREE.MathUtils.clamp(
        stepsRef.current[activeMissionIndex] /
          MISSIONS[activeMissionIndex].steps.length,
        0,
        1,
      );
      world.setProgress?.(Math.max(timelineProgress, evidenceProgress));
      updateGaze(delta);
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
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
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
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
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
      ) {
        return;
      }
      if (event.key >= "1" && event.key <= "4") {
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
    const copy: Record<Exclude<FinalBeat, "mission">, string> = {
      recap: "Three kinds of visual specialisation—three different jobs.",
      graduation: "Vision Academy evidence review complete.",
      fireworks: "Graduation fireworks at exactly 04:53.",
      "feathers-stars": "Eagle feathers and stars sweep in at 04:55.",
      badge: "SUPER SIGHT SCIENTIST · BADGE UNLOCKED",
      complete: "MISSION COMPLETE · RETURN TO CLASSROOM",
    };
    return beat === "mission" ? "" : copy[beat];
  }, [beat]);

  const finalIcon =
    beat === "complete" || beat === "badge"
      ? "🏅"
      : beat === "graduation"
        ? "🎓"
        : beat === "fireworks"
          ? "🎆"
          : beat === "feathers-stars"
            ? "🪶✨"
            : "👁️";
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
        aria-label="Interactive 360 degree Super Senses sight simulation"
      />

      {started && !complete && (
        <div
          className={styles.reticle}
          data-active={Boolean(gazeTarget)}
          data-immersive={immersive}
          aria-hidden="true"
        >
          <span style={{ transform: `scaleX(${gazeProgress})` }} />
        </div>
      )}

      {!started && (
        <section className={styles.launch} data-testid="sight-launch-screen">
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>
              Class 5 · Super Senses · Exactly 5 minutes
            </div>
            <h1>Captain Iris and the Vision Vault</h1>
            <p>
              Calibrate an eagle-detail scanner, find a field mouse, decode
              low-light clues and follow a fly around a chameleon—all while
              separating scientific evidence from the simulation&apos;s visual
              models.
            </p>
            <div className={styles.factRow}>
              <span>4 timed investigations</span>
              <span>Mouse · gaze · Quest controllers</span>
              <span>Automatic hints before transitions</span>
              <span>Narration + captions</span>
            </div>
            <p className={styles.modelNotice}>
              Important: filters, outlines and brightened night scenes are
              teaching models. They do not reproduce exactly what an animal
              sees.
            </p>
            {sceneError && <p className={styles.error}>{sceneError}</p>}
            <div className={styles.launchActions}>
              <button
                type="button"
                className={styles.primary}
                data-testid="simulation-launch"
                onClick={startMission}
              >
                Open the Vision Vault
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
              The story clock starts only after you choose a start button. Keep
              a clear, stationary or bounded area for VR.
            </small>
          </div>
        </section>
      )}

      {started && (
        <aside
          className={styles.panel}
          aria-label="Super Senses sight mission panel"
        >
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
            {[
              MASTER_TIMELINE.fieldMouse,
              MASTER_TIMELINE.nightLemur,
              MASTER_TIMELINE.chameleonFly,
              MASTER_TIMELINE.recap,
              MASTER_TIMELINE.graduation,
              MASTER_TIMELINE.fireworks,
              MASTER_TIMELINE.feathersAndStars,
              MASTER_TIMELINE.badgePulse,
            ].map((second) => (
              <i
                key={second}
                data-closing={second >= MASTER_TIMELINE.recap}
                style={{ left: `${(second / TOTAL_SECONDS) * 100}%` }}
              />
            ))}
          </div>

          <header className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>
                {beat === "mission"
                  ? `Mission ${mission + 1} of 4 · ${activeMission.range}`
                  : "Vision Academy · closing sequence"}
              </span>
              <h2 data-testid="sight-mission">
                {beat === "mission" ? activeMission.title : "Evidence Recap"}
              </h2>
            </div>
            <time
              data-testid="sight-timer"
              dateTime={`PT${Math.floor(elapsedSeconds)}S`}
            >
              {formatClock(elapsedSeconds)} <small>/ 05:00</small>
            </time>
          </header>

          <div className={styles.panelScroll}>
            {beat !== "mission" ? (
              <section
                className={styles.finalCard}
                data-testid="sight-final-beat"
              >
                <div className={styles.finalIcon}>{finalIcon}</div>
                <h3>{closingCopy}</h3>
                <p>
                  Eagles, low-light animals and chameleons solve different
                  visual problems. No animal has one universally “best” view.
                </p>
                {complete && (
                  <strong data-testid="sight-completion">
                    Frozen at exactly 05:00
                  </strong>
                )}
              </section>
            ) : (
              <section className={styles.missionBody}>
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
                      data-testid={`sight-choice-${id}`}
                      data-gaze={gazeTarget === id}
                      disabled={Boolean(evidence[mission]) || paused}
                      onClick={() => choose(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className={styles.stepDots} aria-label="Evidence progress">
                  {activeMission.steps.map((_, index) => (
                    <span key={index} data-complete={index < steps[mission]}>
                      {index < steps[mission] ? "✓" : index + 1}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <p
              className={styles.feedback}
              role="status"
              aria-live="polite"
              data-testid="sight-feedback"
            >
              {feedback}
            </p>

            <figure className={styles.caption} data-testid="sight-caption">
              <span aria-hidden="true">🔊</span>
              <figcaption>{caption}</figcaption>
            </figure>

            <section className={styles.scienceNote}>
              <span>SCIENCE CHECK</span>
              <p>{activeMission.science}</p>
            </section>

            <section className={styles.evidence} data-testid="sight-evidence">
              <h3>Vision evidence record</h3>
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
                                  ? ` · ${record.wrongAttempts} ${
                                      record.wrongAttempts === 1
                                        ? "retry"
                                        : "retries"
                                    }`
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
            <div className={styles.paused}>
              Investigation paused · timer stopped
            </div>
          )}
          <div className={styles.controlsHint}>
            Click, centre-gaze or keys 1–4 · drag to orbit · right-drag to pan ·
            scroll to zoom · P pauses · N narrates · Quest trigger selects ·
            thumbsticks move/turn · B or right grip exits VR
          </div>
        </aside>
      )}
    </main>
  );
}
