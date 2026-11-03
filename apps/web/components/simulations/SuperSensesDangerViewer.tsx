"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SUPER_SENSES_DANGER_SIMULATION } from "@xr-school/simulation-content";

import { createSuperSensesDangerWorld } from "../../lib/world-builder/superSensesDangerWorld";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./SuperSensesDangerViewer.module.css";

const TOTAL_SECONDS = 300;
const GAZE_DWELL_SECONDS = 1.35;

const MASTER_TIMELINE = {
  vibeBoots: 0,
  elephantRipples: 60,
  webAlarm: 150,
  electroVision: 240,
  recap: 280,
  graduation: 290,
  geyser: 294,
  stars: 296,
  signalIcons: 298,
  freeze: 300,
} as const;

const NARRATION_BY_STAGE = new Map(
  SUPER_SENSES_DANGER_SIMULATION.narration.cues.map((cue) => [
    cue.stageId,
    cue.text,
  ]),
);

function narrationFor(stageId: string, fallback: string) {
  return NARRATION_BY_STAGE.get(stageId) ?? fallback;
}

const MISSIONS = [
  {
    id: "vibe-boots",
    title: "Activate the Vibe-Boots",
    range: "0:00–1:00",
    boundary: MASTER_TIMELINE.elephantRipples,
    hintAt: 50,
    assistAt: 56,
    narration: narrationFor(
      "vibe-boots",
      "Professor Tremor reporting. Your Vibe-Boots make invisible ground motion visible as teaching-model rings. Compare the three signals and choose the medium, regular ripple made by distant footsteps.",
    ),
    prompt: "Which ground signal matches the distant footsteps?",
    steps: [
      [
        ["vibe-beetle", "Tiny beetle · faint ripples", false],
        ["vibe-footsteps", "Distant footsteps · regular ripples", true],
        ["vibe-disturbance", "Strong disturbance · rapid ripples", false],
      ],
    ],
    hint: "Calibration hint: compare size and rhythm. Hold the medium, regular yellow signal in your gaze, pointer or controller ray.",
    assist:
      "Vibe-Boot assist engaged. The distant-footstep signal now glows more brightly.",
    science:
      "MODEL NOTE · Vibrations are repeated movements. The coloured rings make invisible ground motion observable; real vibrations are not visible coloured circles.",
  },
  {
    id: "elephant-ripples",
    title: "Trace the Elephant Signal",
    range: "1:00–2:30",
    boundary: MASTER_TIMELINE.webAlarm,
    hintAt: 135,
    assistAt: 146,
    narration: narrationFor(
      "elephant-ripples",
      "Elephants produce low-frequency calls and can detect seismic information through sensitive structures in their feet and body. Choose the large regular centre signal, then follow all three checkpoints toward the herd.",
    ),
    prompt: "Find the regular centre signal, then trace its three checkpoints.",
    steps: [
      [
        ["seismic-left", "Left · small animal movement", false],
        ["seismic-center", "Centre · large regular signal", true],
        ["seismic-right", "Right · wind movement", false],
      ],
      [
        ["ripple-one", "Checkpoint 1 · 40%", true],
        ["seismic-left", "Return to the small signal", false],
        ["seismic-right", "Return to the wind clue", false],
      ],
      [
        ["ripple-one", "Checkpoint 1 · already traced", false],
        ["ripple-two", "Checkpoint 2 · 65%", true],
        ["seismic-right", "Wind clue", false],
      ],
      [
        ["ripple-one", "Checkpoint 1", false],
        ["ripple-two", "Checkpoint 2", false],
        ["ripple-three", "Checkpoint 3 · source lock", true],
      ],
    ],
    hint: "Seismic hint: follow the brightest, largest regular rings from centre toward the herd.",
    assist:
      "Seismic assist engaged. A golden path now marks all three elephant checkpoints.",
    science:
      "SCIENCE NOTE · Elephants use low-frequency calls and seismic signals. Vibration is evidence, but it does not identify every predator, storm or distant event with certainty.",
  },
  {
    id: "web-alarm",
    title: "Decode the Spider-Web Alarm",
    range: "2:30–4:00",
    boundary: MASTER_TIMELINE.electroVision,
    hintAt: 225,
    assistAt: 235,
    narration: narrationFor(
      "web-alarm",
      "The spider web carries motion through silk. Inspect the gentle leaf pulse, identify the faster urgent strand, then lock the green escape point. Blue and red are teaching labels, not a universal spider code.",
    ),
    prompt: "Read the web evidence in order: leaf, urgent pattern, escape.",
    steps: [
      [
        ["web-leaf", "1 · gentle leaf pulse", true],
        ["web-insect", "Tiny insect signal", false],
        ["web-urgent", "Urgent strand · wait for comparison", false],
      ],
      [
        ["web-leaf", "Blue · gentle leaf motion", false],
        ["web-insect", "Blue · tiny insect motion", false],
        ["web-urgent", "Red model · faster urgent pattern", true],
      ],
      [
        ["escape-point", "3 · green safe route", true],
        ["web-leaf", "Return to the leaf", false],
        ["web-urgent", "Remain beside the urgent strand", false],
      ],
    ],
    hint: "Web hint: compare rhythm and strength, then use the green point rather than making a sudden physical movement.",
    assist:
      "Web assist engaged. The leaf, urgent strand and safe exit now illuminate in order.",
    science:
      "MODEL NOTE · Spiders sense mechanical motion through specialised structures. Timing, strength, frequency, location and context matter; red and blue are not colours a spider must see.",
  },
  {
    id: "electro-vision",
    title: "Find the Buried Electric Signals",
    range: "4:00–4:40",
    boundary: MASTER_TIMELINE.recap,
    hintAt: 270,
    assistAt: 278,
    narration: narrationFor(
      "electro-vision",
      "Sharks use ampullae of Lorenzini to detect weak electric fields in water. Find the regular pulsing field beneath the sand, then reveal the second signal. The glowing halo and pulse sound are teaching cues.",
    ),
    prompt: "Scan the seafloor, reveal the first field, then find the second.",
    steps: [
      [
        ["scan-empty", "Area A · empty sand", false],
        ["stingray-one", "Area B · regular electric-field model", true],
        ["scan-rock", "Area C · rock", false],
      ],
      [
        ["stingray-two", "Second pulsing field", true],
        ["scan-empty", "Empty sand", false],
        ["scan-rock", "Rock shadow", false],
      ],
    ],
    hint: "Electro-vision hint: choose the regular blue-white halo beneath the sand, not the empty patch or rock.",
    assist:
      "Electro-vision assist engaged. Both buried bioelectric-field models now pulse brightly.",
    science:
      "SCIENCE NOTE · Sharks detect weak electric fields with ampullae of Lorenzini. The halo, percentage and heartbeat sound are visual and audio models—not electricity a shark literally sees or hears.",
  },
] as const;

const FINAL_RECAP_NARRATION =
  "Final briefing. Elephants can use ground vibration as information. Spiders detect motion travelling through their webs. Sharks detect weak electric fields in water. Three different sensory systems reveal signals that people may not easily notice.";

type MissionIndex = 0 | 1 | 2 | 3;
type ChoiceState = "idle" | "selected" | "correct" | "incorrect" | "hint";
type EvidenceMode = "independent" | "assisted";
type ChoiceTuple = readonly [id: string, label: string, correct: boolean];
type FinalBeat =
  | "mission"
  | "recap"
  | "graduation"
  | "geyser"
  | "stars"
  | "signal-icons"
  | "complete";
type CelebrationBeat =
  | "recap"
  | "graduation"
  | "geyser"
  | "stars"
  | "signal-icons";

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
interface DangerWorld {
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
    position: new THREE.Vector3(0, 1.72, 5.8),
    target: new THREE.Vector3(0, 0.28, -0.5),
  },
  {
    position: new THREE.Vector3(0, 2.15, 7.1),
    target: new THREE.Vector3(0, 0.48, -2.3),
  },
  {
    position: new THREE.Vector3(0, 1.65, 5.1),
    target: new THREE.Vector3(0, 1.45, -0.8),
  },
  {
    position: new THREE.Vector3(0, 1.45, 5.9),
    target: new THREE.Vector3(0, 0.18, -1.5),
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
  if (seconds < MASTER_TIMELINE.elephantRipples) return 0;
  if (seconds < MASTER_TIMELINE.webAlarm) return 1;
  if (seconds < MASTER_TIMELINE.electroVision) return 2;
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
  if (seconds >= MASTER_TIMELINE.signalIcons) return "signal-icons";
  if (seconds >= MASTER_TIMELINE.stars) return "stars";
  if (seconds >= MASTER_TIMELINE.geyser) return "geyser";
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

export default function SuperSensesDangerViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<DangerWorld | null>(null);
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
    "Spy Academy ready. Activate the Vibe-Boots and decode the first ground signal.",
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
          "That signal does not match the medium, regular distant footsteps. Compare size and rhythm again.",
          "That clue is weak or irregular. Follow the large, regular centre rings and their checkpoints.",
          "Read the web in order: gentle leaf, urgent patterned strand, then the green escape point.",
          "That area has no regular bioelectric-field model. Compare the pulsing halo with empty sand and rock.",
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
          "VIBE-BOOTS CALIBRATED · distant-footstep signal decoded.",
          "SOURCE LOCKED · three seismic checkpoints led to the elephant herd.",
          "WEB ALARM DECODED · urgent pattern found and safe route locked.",
          "ELECTRIC SIGNALS FOUND · two buried stingrays revealed.",
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
      "Spy Academy ready. Activate the Vibe-Boots and decode the first ground signal.",
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
          feedback:
            "FINAL BRIEFING · compare signals moving through soil, silk and water.",
        },
        {
          beat: "graduation",
          at: MASTER_TIMELINE.graduation,
          feedback: "WILDLIFE SPY BADGE · evidence record complete.",
        },
        {
          beat: "geyser",
          at: MASTER_TIMELINE.geyser,
          feedback: "Digital water geyser at 04:54 · safe exit active.",
        },
        {
          beat: "stars",
          at: MASTER_TIMELINE.stars,
          feedback: "Golden spy stars at 04:56 · final signal check incoming.",
        },
        {
          beat: "signal-icons",
          at: MASTER_TIMELINE.signalIcons,
          feedback: "VIBRATION ✓ · WEB SENSE ✓ · ELECTRORECEPTION ✓ at 04:58.",
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
        "This device could not open the 3D danger-sense world. Try a WebGL-enabled browser.",
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
      "Interactive Super Senses vibration and electroreception world",
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

    const world = createSuperSensesDangerWorld(scene) as unknown as DangerWorld;
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
        MASTER_TIMELINE.vibeBoots,
        MASTER_TIMELINE.elephantRipples,
        MASTER_TIMELINE.webAlarm,
        MASTER_TIMELINE.electroVision,
      ] as const;
      const missionEnds = [
        MASTER_TIMELINE.elephantRipples,
        MASTER_TIMELINE.webAlarm,
        MASTER_TIMELINE.electroVision,
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
      recap: "Three hidden-signal systems—three different physical clues.",
      graduation: "WILDLIFE SPY · SUPER SENSES BADGE UNLOCKED",
      geyser: "Friendly digital water geyser launched at exactly 04:54.",
      stars: "Golden spy stars surround the exit tunnel at 04:56.",
      "signal-icons": "VIBRATION ✓ · WEB SENSE ✓ · ELECTRORECEPTION ✓",
      complete: "MISSION COMPLETE · RETURN TO CLASSROOM",
    };
    return beat === "mission" ? "" : copy[beat];
  }, [beat]);

  const finalIcon =
    beat === "complete" || beat === "graduation"
      ? "🏅"
      : beat === "geyser"
        ? "🌊"
        : beat === "stars"
          ? "✨"
          : beat === "signal-icons"
            ? "〰️🕸️⚡"
            : "🛰️";
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
        aria-label="Interactive 360 degree Super Senses danger simulation"
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
        <section className={styles.launch} data-testid="danger-launch-screen">
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>
              Class 5 · Super Senses · Exactly 5 minutes
            </div>
            <h1>Professor Tremor&apos;s Hidden-Signal Mission</h1>
            <p>
              Activate Vibe-Boots, trace an elephant&apos;s seismic signal,
              decode a giant spider web and uncover weak electric fields under
              the ocean floor.
            </p>
            <div className={styles.factRow}>
              <span>Detect → Decode → React → Survive</span>
              <span>Mouse · gaze · Quest controllers</span>
              <span>Automatic hints before transitions</span>
              <span>Narration + captions</span>
            </div>
            <p className={styles.modelNotice}>
              Important: glowing rings, coloured web pulses and electric halos
              are teaching models. The real signals are not visible coloured
              waves.
            </p>
            {sceneError && <p className={styles.error}>{sceneError}</p>}
            <div className={styles.launchActions}>
              <button
                type="button"
                className={styles.primary}
                data-testid="simulation-launch"
                onClick={startMission}
              >
                Begin the Spy Mission
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
          aria-label="Super Senses danger mission panel"
        >
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
            {[
              MASTER_TIMELINE.elephantRipples,
              MASTER_TIMELINE.webAlarm,
              MASTER_TIMELINE.electroVision,
              MASTER_TIMELINE.recap,
              MASTER_TIMELINE.graduation,
              MASTER_TIMELINE.geyser,
              MASTER_TIMELINE.stars,
              MASTER_TIMELINE.signalIcons,
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
                  : "Super Senses Spy Academy · closing sequence"}
              </span>
              <h2 data-testid="danger-mission">
                {beat === "mission" ? activeMission.title : "Evidence Recap"}
              </h2>
            </div>
            <time
              data-testid="danger-timer"
              dateTime={`PT${Math.floor(elapsedSeconds)}S`}
            >
              {formatClock(elapsedSeconds)} <small>/ 05:00</small>
            </time>
          </header>

          <div className={styles.panelScroll}>
            {beat !== "mission" ? (
              <section
                className={styles.finalCard}
                data-testid="danger-final-beat"
              >
                <div className={styles.finalIcon}>{finalIcon}</div>
                <h3>{closingCopy}</h3>
                <p>
                  Elephants, spiders and sharks detect different physical
                  signals. The coloured overlays make invisible evidence
                  observable; they are not literal animal perception.
                </p>
                {complete && (
                  <strong data-testid="danger-completion">
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
                      data-testid={`danger-choice-${id}`}
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
              data-testid="danger-feedback"
            >
              {feedback}
            </p>

            <figure className={styles.caption} data-testid="danger-caption">
              <span aria-hidden="true">🔊</span>
              <figcaption>{caption}</figcaption>
            </figure>

            <section className={styles.scienceNote}>
              <span>SCIENCE CHECK</span>
              <p>{activeMission.science}</p>
            </section>

            <section className={styles.evidence} data-testid="danger-evidence">
              <h3>Hidden-signal evidence record</h3>
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
