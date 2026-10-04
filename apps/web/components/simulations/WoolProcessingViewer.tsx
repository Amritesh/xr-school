"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  createWoolProcessingWorld,
  type WoolExperiment,
  type WoolSeason,
  type WoolWorldSnapshot,
} from "../../lib/world-builder/woolProcessingWorld";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./WoolProcessingViewer.module.css";

const STAGES = [
  {
    id: "arrival",
    title: "Meet Woolly in Flock Valley",
    cue: "Touch the fleece, scan its warmth and zoom in on the fibres.",
    detail: "The thick coat of hair covering a sheep is called its fleece. It traps still air and helps the sheep stay warm in winter.",
    action: "Continue the fleece scan",
  },
  {
    id: "season",
    title: "Choose the Safe Season",
    cue: "When should Woolly be sheared? Test each season and use the evidence.",
    detail: "Sheep are generally sheared during warm, dry weather so they remain comfortable and their fleece can regrow before winter.",
    action: "Choose summer",
  },
  {
    id: "prepare",
    title: "Prepare the Shearing Station",
    cue: "Keep Woolly calm and dry, then select clean, inspected equipment.",
    detail: "Real shearing is skilled animal care. A trained shearer uses suitable clean shears on a safe non-slip surface.",
    action: "Prepare clean shears",
  },
  {
    id: "shearing",
    title: "Shear Along the Guide Lines",
    cue: "Make four slow, steady passes with the blades almost parallel to the skin.",
    detail: "Shearing is the careful removal of fleece. When a trained person does it correctly, it is similar to giving the sheep a haircut.",
    action: "Make a steady pass",
  },
  {
    id: "detect",
    title: "Become a Fibre Detective",
    cue: "Find four things trapped in the yellowish raw fleece, then decide what happens next.",
    detail: "Raw fleece contains material from the sheep and its surroundings. A magnifier helps reveal why cleaning is necessary.",
    action: "Scan the next impurity",
  },
  {
    id: "experiment",
    title: "Test Three Washing Methods",
    cue: "Compare cold water, controlled warm cleaning and very hot rough washing.",
    detail: "A fair comparison reveals which method removes grease without matting or damaging the wool fibres.",
    action: "Choose container B",
  },
  {
    id: "scour",
    title: "Operate the Scouring Station",
    cue: "Control temperature, cleaner, movement, rinsing, squeezing and drying.",
    detail: "Scouring thoroughly washes sheared wool to remove dirt, dust, sweat and grease while keeping fibres usable.",
    action: "Run the next scouring step",
  },
  {
    id: "compare",
    title: "Compare Before and After",
    cue: "Inspect both samples to see exactly what scouring changed.",
    detail: "Raw fleece is greasy, yellowish and heavy. Scoured wool is cleaner, softer, lighter and ready for later processing.",
    action: "Inspect the next sample",
  },
  {
    id: "sequence",
    title: "Build the Wool Journey",
    cue: "Place the six objects in the correct scientific process order.",
    detail: "Every stage prepares the fibre for the next: fleece, shearing, collection, scouring, rinsing and drying.",
    action: "Place the next process step",
  },
  {
    id: "challenge",
    title: "Earn the Master of Wool Badge",
    cue: "Answer four rapid questions and prove that you can distinguish shearing from scouring.",
    detail: "Humane animal care and controlled fibre cleaning are both essential parts of the wool journey.",
    action: "Answer the current question",
  },
] as const;

const NARRATIONS = [
  "Welcome to Flock Valley, Young Wool Scientist. Meet Woolly. His thick fleece protected him in winter, but warm weather has arrived. Touch the fleece, scan its temperature, and look closely at the fibres.",
  "Choose the safe season for shearing. Winter fleece protects the sheep from cold, and wet fleece is difficult to process. Warm, dry summer weather is the suitable choice.",
  "Prepare the station carefully. Woolly must be dry and calm on a clean non-slip surface. Inspect and oil the clean electric shears. A kitchen knife or dirty tool is unsafe.",
  "The removal of fleece is called shearing. Follow the blue guide lines with slow, smooth passes. Keep the shears almost parallel to the skin and never rush across folds in the skin.",
  "The fleece has been removed, but it is not ready for spinning. Use the magnifier to find dust and soil, sweat, grass pieces, and lanolin, the natural grease that protects the sheep's skin and fleece.",
  "Test three cleaning methods. Cold water removes some dust but leaves grease. Very hot water and rough movement can mat wool. Controlled warm water with a suitable cleaner works best.",
  "Now operate the scouring station. Set controlled warmth, add the correct amount of cleaner, wash gently, rinse until the water stays clear, squeeze with rollers, and spread the wool to dry.",
  "Compare the samples. Raw fleece is greasy, sticky and heavy. Scoured wool is clean, soft, lighter and fluffy because dirt, sweat and grease have been removed.",
  "Build the wool journey in order: sheep with fleece, shearing, raw fleece collection, scouring, rinsing, and drying. Each stage prepares the fibre for what comes next.",
  "Complete the mission. Shearing means carefully removing the fleece. Scouring means cleaning that fleece. Sheep must be handled gently, and clean wool is then ready for later processing into yarn and fabric.",
];

const IMPURITIES = [
  ["dust", "Dust and soil"],
  ["sweat", "Sweat"],
  ["grass", "Grass and seeds"],
  ["lanolin", "Lanolin grease"],
] as const;

const SCOURING_STEPS = [
  "Set water to the green temperature zone",
  "Add one measured dose of cleaner",
  "Wash gently until dirt and grease separate",
  "Rinse twice until the water remains clear",
  "Use squeeze rollers—never twist the fibres",
  "Spread the clean wool evenly to dry",
] as const;

const WOOL_SEQUENCE = [
  "Sheep with thick fleece",
  "Shearing",
  "Collect raw fleece",
  "Scouring",
  "Rinsing",
  "Drying rack",
] as const;

const QUIZ = [
  {
    question: "What is removing fleece from a sheep called?",
    options: ["Scouring", "Shearing", "Spinning"],
    correct: 1,
  },
  {
    question: "What does scouring remove?",
    options: ["Only water", "Dirt, sweat and grease", "The sheep's skin"],
    correct: 1,
  },
  {
    question: "Why is warm weather suitable for shearing?",
    options: ["It keeps the sheep comfortable and allows regrowth", "It changes the wool colour", "It makes the sheep eat more"],
    correct: 0,
  },
  {
    question: "What is the natural grease in fleece called?",
    options: ["Lanolin", "Starch", "Cellulose"],
    correct: 0,
  },
] as const;

type WoolWorld = ReturnType<typeof createWoolProcessingWorld>;

function emptyCompletion() {
  return STAGES.map(() => false);
}

export default function WoolProcessingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<WoolWorld | null>(null);
  const stageRef = useRef(0);
  const primaryActionRef = useRef<() => void>(() => undefined);
  const backActionRef = useRef<() => void>(() => undefined);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(emptyCompletion);
  const [feedback, setFeedback] = useState("");
  const [exploreStep, setExploreStep] = useState(0);
  const [season, setSeason] = useState<WoolSeason>();
  const [equipment, setEquipment] = useState("");
  const [shearingProgress, setShearingProgress] = useState(0);
  const [detectedImpurities, setDetectedImpurities] = useState<string[]>([]);
  const [rawFleeceAnswer, setRawFleeceAnswer] = useState<"spin" | "clean">();
  const [experiment, setExperiment] = useState<WoolExperiment>();
  const [scouringStep, setScouringStep] = useState(0);
  const [comparedSamples, setComparedSamples] = useState<string[]>([]);
  const [sequence, setSequence] = useState<string[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const speakStage = useCallback((index: number) => {
    unlockNarration();
    playNarration(NARRATIONS[index]);
  }, []);

  const completeStage = useCallback((index: number, message: string) => {
    setCompleted(current => current.map((value, position) => position === index ? true : value));
    setFeedback(message);
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    setStage(safeStage);
    setFeedback("");
    speakStage(safeStage);
  }, [speakStage]);

  const chooseSeason = useCallback((choice: WoolSeason) => {
    setSeason(choice);
    if (choice === "winter") {
      setFeedback("Cold wind makes Woolly shiver. The fleece is still needed for warmth.");
      return;
    }
    if (choice === "rainy") {
      setFeedback("The fleece becomes wet. Wool must be dry before safe shearing and processing.");
      return;
    }
    completeStage(1, "Season Expert Star earned: warm, dry weather is suitable for shearing.");
  }, [completeStage]);

  const chooseEquipment = useCallback((choice: string) => {
    setEquipment(choice);
    if (choice === "knife") {
      setFeedback("Unsafe equipment. A kitchen knife is not suitable shearing equipment.");
      return;
    }
    if (choice === "water") {
      setFeedback("Keep Woolly dry. Wet fleece is difficult to shear and process.");
      return;
    }
    completeStage(2, "Woolly is calm and dry. The clean shears are inspected and lightly oiled.");
  }, [completeStage]);

  const makeShearingPass = useCallback(() => {
    setShearingProgress(current => {
      const next = Math.min(100, current + 25);
      if (next >= 100) {
        completeStage(3, "Animal Care Star earned: the fleece came away safely in one sheet.");
      } else {
        setFeedback(`Steady pass complete. Keep the blades flat—${next}% of the fleece is removed.`);
      }
      return next;
    });
  }, [completeStage]);

  const detectImpurity = useCallback((id: string) => {
    setDetectedImpurities(current => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      setFeedback(next.length === IMPURITIES.length
        ? "All four impurities found. Now decide whether the raw fleece can be spun."
        : `${next.length} of ${IMPURITIES.length} impurities identified.`);
      return next;
    });
  }, []);

  const answerRawFleece = useCallback((answer: "spin" | "clean") => {
    setRawFleeceAnswer(answer);
    if (detectedImpurities.length < IMPURITIES.length) {
      setFeedback("Inspect all four impurities before making the processing decision.");
      return;
    }
    if (answer === "spin") {
      setFeedback("Look again: dust, sweat, plant material and lanolin are still trapped in the fibres.");
      return;
    }
    completeStage(4, "Fibre Detective Star earned: raw fleece must be cleaned before spinning.");
  }, [completeStage, detectedImpurities.length]);

  const chooseExperiment = useCallback((choice: WoolExperiment) => {
    setExperiment(choice);
    if (choice === "cold") {
      setFeedback("Some dust separates, but sticky lanolin remains on the fibres.");
      return;
    }
    if (choice === "hot") {
      setFeedback("Excessive heat and rough movement tangle and mat the wool.");
      return;
    }
    completeStage(5, "Controlled warmth, suitable cleaner and gentle movement remove impurities safely.");
  }, [completeStage]);

  const runScouringStep = useCallback(() => {
    setScouringStep(current => {
      const next = Math.min(SCOURING_STEPS.length, current + 1);
      if (next === SCOURING_STEPS.length) {
        completeStage(6, "Scouring Scientist Star earned: the clean wool is soft, fluffy and dry.");
      } else {
        setFeedback(`${SCOURING_STEPS[next - 1]} complete. Continue the controlled process.`);
      }
      return next;
    });
  }, [completeStage]);

  const compareSample = useCallback((sample: "raw" | "clean") => {
    setComparedSamples(current => {
      if (current.includes(sample)) return current;
      const next = [...current, sample];
      if (next.length === 2) {
        completeStage(7, "Comparison complete: scouring changed dirty raw fleece into clean wool fibres.");
      } else {
        setFeedback(sample === "raw"
          ? "Raw fleece feels sticky, yellowish and heavy. Inspect the clean sample next."
          : "Scoured wool feels soft, lighter and fluffy. Inspect the raw sample next.");
      }
      return next;
    });
  }, [completeStage]);

  const placeSequenceStep = useCallback((label: string) => {
    const expected = WOOL_SEQUENCE[sequence.length];
    if (label !== expected) {
      setFeedback(`Not yet. After “${sequence.at(-1) ?? "start"}”, look for the next real process step.`);
      return;
    }
    const next = [...sequence, label];
    setSequence(next);
    if (next.length === WOOL_SEQUENCE.length) {
      completeStage(8, "The complete wool journey is glowing in the correct order.");
    } else {
      setFeedback(`${label} placed correctly. Choose step ${next.length + 1}.`);
    }
  }, [completeStage, sequence]);

  const answerQuiz = useCallback((optionIndex: number) => {
    const question = QUIZ[quizIndex];
    if (!question) return;
    if (optionIndex !== question.correct) {
      setFeedback("Try again. Use the evidence you observed during the mission.");
      return;
    }
    const nextScore = quizScore + 1;
    setQuizScore(nextScore);
    if (quizIndex === QUIZ.length - 1) {
      setQuizComplete(true);
      completeStage(9, "Mission accomplished! You earned the Master of Wool Processing badge.");
      return;
    }
    setQuizIndex(current => current + 1);
    setFeedback(`Correct—${nextScore} of ${QUIZ.length}. Here is the next question.`);
  }, [completeStage, quizIndex, quizScore]);

  const performPrimary = useCallback(() => {
    if (completed[stage]) {
      if (stage < STAGES.length - 1) goToStage(stage + 1);
      else speakStage(stage);
      return;
    }
    switch (stage) {
      case 0: {
        const next = Math.min(3, exploreStep + 1);
        setExploreStep(next);
        if (next === 1) setFeedback("The fleece compresses softly, then springs back into shape.");
        if (next === 2) setFeedback("The scanner shows that the thick coat is trapping warmth.");
        if (next === 3) completeStage(0, "Fleece explored: many fine fibres form Woolly's thick coat.");
        break;
      }
      case 1:
        chooseSeason("summer");
        break;
      case 2:
        chooseEquipment("shears");
        break;
      case 3:
        makeShearingPass();
        break;
      case 4: {
        const nextImpurity = IMPURITIES.find(([id]) => !detectedImpurities.includes(id));
        if (nextImpurity) detectImpurity(nextImpurity[0]);
        else answerRawFleece("clean");
        break;
      }
      case 5:
        chooseExperiment("controlled");
        break;
      case 6:
        runScouringStep();
        break;
      case 7:
        compareSample(comparedSamples.includes("raw") ? "clean" : "raw");
        break;
      case 8:
        placeSequenceStep(WOOL_SEQUENCE[sequence.length]);
        break;
      case 9:
        answerQuiz(QUIZ[quizIndex].correct);
        break;
    }
  }, [
    answerQuiz,
    answerRawFleece,
    chooseEquipment,
    chooseExperiment,
    chooseSeason,
    compareSample,
    comparedSamples,
    completeStage,
    completed,
    detectImpurity,
    detectedImpurities,
    exploreStep,
    goToStage,
    makeShearingPass,
    placeSequenceStep,
    quizIndex,
    runScouringStep,
    sequence.length,
    speakStage,
    stage,
  ]);

  const restart = useCallback(() => {
    stopNarration();
    stageRef.current = 0;
    setStage(0);
    setCompleted(emptyCompletion());
    setFeedback("");
    setExploreStep(0);
    setSeason(undefined);
    setEquipment("");
    setShearingProgress(0);
    setDetectedImpurities([]);
    setRawFleeceAnswer(undefined);
    setExperiment(undefined);
    setScouringStep(0);
    setComparedSamples([]);
    setSequence([]);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizComplete(false);
    speakStage(0);
  }, [speakStage]);

  useEffect(() => {
    primaryActionRef.current = performPrimary;
    backActionRef.current = () => goToStage(stageRef.current - 1);
  }, [goToStage, performPrimary]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("xr" in navigator)) return;
    (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } })
      .xr?.isSessionSupported?.("immersive-vr")
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  const actionLabel = completed[stage]
    ? stage === STAGES.length - 1 ? "Replay teacher summary" : "Continue to next mission"
    : stage === 3 ? `Steady pass · ${shearingProgress}%`
      : stage === 6 ? `${SCOURING_STEPS[Math.min(scouringStep, SCOURING_STEPS.length - 1)]}`
        : stage === 9 ? `Answer ${quizIndex + 1} of ${QUIZ.length}`
          : STAGES[stage].action;

  const snapshot = useMemo<WoolWorldSnapshot>(() => ({
    stage,
    season,
    shearingProgress,
    detectedImpurities,
    experiment,
    scouringStep,
    comparedSamples,
    sequenceCount: sequence.length,
    quizComplete,
    feedback,
    actionLabel,
    title: STAGES[stage].title,
    cue: STAGES[stage].cue,
  }), [
    actionLabel,
    comparedSamples,
    detectedImpurities,
    experiment,
    feedback,
    quizComplete,
    scouringStep,
    season,
    sequence.length,
    shearingProgress,
    stage,
  ]);

  useEffect(() => {
    worldRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.05, 80);
    camera.position.set(0, 2.15, 5.6);
    camera.lookAt(0, 1.05, 0);
    const world = createWoolProcessingWorld(scene, renderer);
    worldRef.current = world;
    world.setSnapshot(snapshot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.02, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(world.interactables, true)[0];
      if (hit) primaryActionRef.current();
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach(controller => {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.006, 1.8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffedaa, transparent: true, opacity: 0.85 }),
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = -0.9;
      controller.add(beam);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });

    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: () => primaryActionRef.current(),
      onBack: () => backActionRef.current(),
      onNarrate: () => speakStage(stageRef.current),
      startPosition: new THREE.Vector3(0, 0, 2.55),
      movementBounds: new THREE.Box2(new THREE.Vector2(-5.2, -4.2), new THREE.Vector2(5.2, 4.8)),
    });

    const pointer = new THREE.Vector2();
    const onPointerUp = (event: PointerEvent) => {
      if (renderer.xr.isPresenting || event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObjects(world.interactables, true)[0]) {
        primaryActionRef.current();
      }
    };
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      questVr.update();
      if (!renderer.xr.isPresenting) controls.update();
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      world.update(elapsed, activeCamera);
      renderer.render(scene, camera);
    });

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controllers.forEach(controller => controller.removeEventListener("selectstart", onControllerSelect as any));
      controls.dispose();
      questVr.dispose();
      world.dispose();
      renderer.dispose();
      stopNarration();
      worldRef.current = null;
      rendererRef.current = null;
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // The world is created once; live mission data is sent through worldRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakStage]);

  const enterVR = useCallback(async () => {
    const xr = (navigator as Navigator & {
      xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> };
    }).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      window.setTimeout(() => speakStage(stageRef.current), 700);
    } catch {
      setVrSupported(false);
      setFeedback("VR could not start. Continue in browser mode, then check headset permissions.");
    }
  }, [speakStage]);

  const startBrowser = useCallback(() => {
    unlockNarration();
    setStarted(true);
    speakStage(stageRef.current);
  }, [speakStage]);

  const renderChoices = () => {
    if (stage === 1) {
      return (
        <div className={styles.choiceGrid} aria-label="Choose the shearing season">
          {(["winter", "rainy", "summer"] as WoolSeason[]).map(choice => (
            <button key={choice} className={styles.choice} data-selected={season === choice} onClick={() => chooseSeason(choice)}>
              {choice === "winter" ? "❄️ Winter" : choice === "rainy" ? "🌧️ Rainy season" : "☀️ Summer"}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 2) {
      return (
        <div className={styles.choiceGrid} aria-label="Choose shearing equipment">
          <button className={styles.choice} data-selected={equipment === "knife"} onClick={() => chooseEquipment("knife")}>🔪 Kitchen knife</button>
          <button className={styles.choice} data-selected={equipment === "water"} onClick={() => chooseEquipment("water")}>💧 Water spray</button>
          <button className={styles.choice} data-selected={equipment === "shears"} onClick={() => chooseEquipment("shears")}>✓ Clean inspected electric shears</button>
        </div>
      );
    }
    if (stage === 3) {
      return (
        <div className={styles.progressCard} aria-label={`Shearing ${shearingProgress} percent complete`}>
          <div className={styles.progressTrack}><span style={{ width: `${shearingProgress}%` }} /></div>
          <span className={styles.hint}>Green speed · flat blade angle · {shearingProgress}% safely removed</span>
        </div>
      );
    }
    if (stage === 4) {
      return (
        <>
          <div className={styles.choiceGrid} aria-label="Fleece impurities">
            {IMPURITIES.map(([id, label]) => (
              <button key={id} className={styles.choice} data-selected={detectedImpurities.includes(id)} onClick={() => detectImpurity(id)}>
                {detectedImpurities.includes(id) ? "✓" : "🔍"} {label}
              </button>
            ))}
          </div>
          {detectedImpurities.length === IMPURITIES.length && (
            <div className={styles.choiceGrid} aria-label="Can raw fleece be spun directly?">
              <button className={styles.choice} data-selected={rawFleeceAnswer === "spin"} onClick={() => answerRawFleece("spin")}>Spin it now</button>
              <button className={styles.choice} data-selected={rawFleeceAnswer === "clean"} onClick={() => answerRawFleece("clean")}>Clean it first</button>
            </div>
          )}
        </>
      );
    }
    if (stage === 5) {
      return (
        <div className={styles.choiceGrid} aria-label="Choose the best wool cleaning method">
          <button className={styles.choice} data-selected={experiment === "cold"} onClick={() => chooseExperiment("cold")}>A · Plain cold water</button>
          <button className={styles.choice} data-selected={experiment === "controlled"} onClick={() => chooseExperiment("controlled")}>B · Controlled warm water + cleaner</button>
          <button className={styles.choice} data-selected={experiment === "hot"} onClick={() => chooseExperiment("hot")}>C · Very hot water + rough movement</button>
        </div>
      );
    }
    if (stage === 6) {
      return (
        <ul className={styles.stepList} aria-label="Scouring process">
          {SCOURING_STEPS.map((label, index) => (
            <li key={label} data-done={index < scouringStep}>{index < scouringStep ? "✓" : index + 1} {label}</li>
          ))}
        </ul>
      );
    }
    if (stage === 7) {
      return (
        <div className={styles.choiceGrid} aria-label="Compare the wool samples">
          <button className={styles.choice} data-selected={comparedSamples.includes("raw")} onClick={() => compareSample("raw")}>Raw fleece · greasy and heavy</button>
          <button className={styles.choice} data-selected={comparedSamples.includes("clean")} onClick={() => compareSample("clean")}>Scoured wool · clean and fluffy</button>
        </div>
      );
    }
    if (stage === 8) {
      return (
        <div className={styles.choiceGrid} aria-label="Order the wool processing journey">
          {WOOL_SEQUENCE.map(label => (
            <button key={label} className={styles.choice} data-selected={sequence.includes(label)} disabled={sequence.includes(label)} onClick={() => placeSequenceStep(label)}>
              {sequence.includes(label) ? `${sequence.indexOf(label) + 1}. ✓ ` : "○ "}{label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 9 && !quizComplete) {
      const question = QUIZ[quizIndex];
      return (
        <>
          <p className={styles.detail}><strong>Question {quizIndex + 1}:</strong> {question.question}</p>
          <div className={styles.choiceGrid} aria-label={question.question}>
            {question.options.map((option, index) => (
              <button key={option} className={styles.choice} onClick={() => answerQuiz(index)}>{option}</button>
            ))}
          </div>
        </>
      );
    }
    return null;
  };

  const stars = [completed[1], completed[3], completed[4], completed[6]];

  return (
    <main className={styles.root} data-wool-stage={STAGES[stage].id}>
      <div ref={mountRef} className={styles.canvas} data-testid="simulation-canvas" aria-label="Interactive Flock Valley wool-processing world" />

      {!started && (
        <section className={styles.launch}>
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>Class 7 · Science · Chapter 3 · Activity 1</div>
            <h1 className={styles.launchTitle}>Mission Wool</h1>
            <p className={styles.launchCopy}>
              Meet Woolly in Flock Valley, practise humane shearing, investigate raw fleece and operate a complete scouring line—from sheep to clean, dry wool.
            </p>
            <div className={styles.launchFacts}>
              <span>10 evidence missions</span>
              <span>Real-time 3D sheep and equipment</span>
              <span>Indian teacher narration</span>
              <span>Browser + Meta Quest</span>
            </div>
            <div className={styles.launchActions}>
              <button data-testid="simulation-launch" className={styles.primary} onClick={startBrowser}>Explore in browser</button>
              {vrSupported && <button className={styles.secondary} onClick={enterVR}>Enter immersive VR</button>}
            </div>
          </div>
        </section>
      )}

      {started && (
        <div className={styles.hud}>
          <header className={styles.topbar}>
            <div className={styles.missionName}>
              <strong>Mission Wool</strong><span>Young Wool Scientist</span>
            </div>
            <div className={styles.topActions}>
              <button data-testid="narration-replay" className={styles.iconButton} onClick={() => speakStage(stage)}>🔊 <span>Replay</span></button>
              <button data-testid="restart" className={styles.iconButton} onClick={restart}>↻ <span>Restart</span></button>
              {vrSupported && <button className={styles.iconButton} onClick={enterVR}>🥽 <span>VR</span></button>}
            </div>
          </header>

          <aside className={styles.panel} aria-label="Mission Wool lesson panel">
            <div className={styles.panelProgress}><span style={{ width: `${((stage + (completed[stage] ? 1 : 0)) / STAGES.length) * 100}%` }} /></div>
            <div className={styles.panelScroll}>
              <div className={styles.stageEyebrow}>Mission {stage + 1} of {STAGES.length}</div>
              <h2 data-testid="stage-title" className={styles.stageTitle}>{STAGES[stage].title}</h2>
              <p data-testid="stage-cue" className={styles.cue}>{STAGES[stage].cue}</p>
              <p className={styles.detail}>{STAGES[stage].detail}</p>
              {feedback && <p role="status" className={styles.feedback}>{feedback}</p>}
              {renderChoices()}
              {quizComplete && (
                <div className={styles.complete}>
                  <div>🏅</div>
                  <strong>Master of Wool Processing</strong>
                  <span>Shearing removes fleece. Scouring cleans it. Woolly is safe and the fibre is ready for the next stage.</span>
                </div>
              )}
              <button data-testid="primary-action" className={`${styles.primary} ${styles.primaryAction}`} onClick={performPrimary}>
                {actionLabel}
              </button>
              <div className={styles.stars} aria-label="Mission rewards">
                {["Season Expert", "Animal Care", "Fibre Detective", "Scouring Scientist"].map((label, index) => (
                  <span key={label} className={styles.star} data-earned={stars[index]}>★ {label}</span>
                ))}
              </div>
            </div>
            <footer className={styles.panelFooter}>
              <button className={styles.navButton} disabled={stage === 0} onClick={() => goToStage(stage - 1)}>← Previous</button>
              <button className={styles.navButton} disabled={!completed[stage] || stage === STAGES.length - 1} onClick={() => goToStage(stage + 1)}>Next mission →</button>
            </footer>
          </aside>

          <div className={styles.controllerHint}>
            Browser: drag to orbit · right-drag to pan · scroll to zoom · Quest: trigger selects · A performs/continues · left back goes to previous · B or right grip exits VR · joysticks move and turn
          </div>
        </div>
      )}
    </main>
  );
}
