"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  createHarvestingStorageWorld,
  type HarvestingStorageWorldSnapshot,
} from "../../lib/world-builder/harvestingStorageWorld";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./VirusInvasionViewer.module.css";

const STAGES = [
  {
    id: "crop-ready",
    title: "Is the Crop Ready?",
    cue: "Compare the green crop with the golden-yellow crop and inspect the developed grain.",
    detail: "A mature cereal crop is usually golden-yellow and dry, with full, firm grains. Green, soft plants still need time to mature.",
    action: "Inspect the next maturity clue",
  },
  {
    id: "harvesting",
    title: "Harvesting the Crop",
    cue: "Cut a mature crop, gather the stalks and compare a sickle with a mechanical harvester.",
    detail: "Harvesting means cutting and gathering a mature crop. Early harvesting leaves immature grain; harvesting too late may let grain fall or become damaged.",
    action: "Complete the next harvesting step",
  },
  {
    id: "threshing",
    title: "Threshing: Separate the Grain",
    cue: "Follow attached grain through a thresher and discover how a combine performs two jobs.",
    detail: "Threshing separates grain from harvested stalks. A combine harvester cuts and threshes the crop in one operation.",
    action: "Inspect the next threshing feature",
  },
  {
    id: "winnowing",
    title: "Winnowing and Cleaning",
    cue: "Start the airflow and observe light chaff move away while the heavier grain falls nearby.",
    detail: "Winnowing uses moving air to separate light husk and chaff from heavier grains after threshing.",
    action: "Complete the next winnowing step",
  },
  {
    id: "drying",
    title: "Dry the Grain Before Storage",
    cue: "Compare damp, clumped grain with clean, freely flowing dry grain.",
    detail: "Excess moisture encourages fungi and other microorganisms. Proper drying reduces spoilage and keeps grain safe for longer.",
    action: "Choose the grain that is ready for storage",
  },
  {
    id: "storage",
    title: "Safe Storage of Crops",
    cue: "Inspect safe containers and identify the moisture and pest risks inside the storage centre.",
    detail: "Clean, dry grain belongs in sealed bins or clean bags on raised platforms. Granaries and silos protect larger quantities from moisture, pests and contamination.",
    action: "Inspect the next storage feature",
  },
  {
    id: "summary",
    title: "Build the Crop Journey",
    cue: "Arrange the five crop-processing stages from the mature field to protected storage.",
    detail: "The safe sequence is harvesting, threshing, winnowing, drying and storage.",
    action: "Place the next process in order",
  },
  {
    id: "challenge",
    title: "Protect the Harvest",
    cue: "Apply your evidence in four tasks: maturity, process order, threshing machine and safe storage.",
    detail: "Protecting a harvest requires correct timing, separation, drying and storage—not just one successful step.",
    action: "Complete the next protection task",
  },
] as const;

const NARRATIONS = [
  "Welcome to the crop field. Several months have passed since sowing. Compare the two plots before harvesting. In cereal crops such as wheat and paddy, mature plants commonly become golden-yellow and dry, and their grain becomes full and firm. The green plants with soft grain are still immature. Inspect the colour, dryness and grain in both plots.",
  "Harvesting is the cutting and gathering of a mature crop from the field. Harvesting too early can give immature grain, while waiting too long can allow grain to fall or become damaged. On small farms, a sickle may cut stalks near the ground before they are gathered into bundles. On larger farms, a harvesting machine can complete the work more quickly.",
  "After harvesting, the grain is still attached to the stalks. Threshing separates the grain from the harvested stalks and other plant material. It may be done manually or with a mechanical thresher. Watch the grain fall into one container while the dry stems move aside. A combine harvester performs harvesting and threshing in one operation.",
  "After threshing, grain may remain mixed with light pieces of husk and chaff. During winnowing, moving air carries the lighter chaff farther away while the heavier grain falls nearby. Start the airflow and collect the cleaned grain in the tray.",
  "Freshly harvested grain may contain too much moisture for safe storage. In the damp batch, water helps fungi and other microorganisms grow and the grain can rot. Proper drying lowers the moisture, so the clean grain flows freely and can remain safe for longer. Drying does not sterilise grain, so it must still be inspected and stored correctly.",
  "Stored grain must be protected from moisture, insects, microorganisms, rodents and birds. Smaller quantities may be kept in clean bags on raised platforms or in suitable sealed metal bins. Large quantities may be stored in granaries, warehouses and silos. Keep bags away from damp floors and walls, repair torn bags and inspect the store regularly. Chemical treatment or fumigation must be performed only by trained adults.",
  "Review the journey. A mature crop is harvested. Threshing separates grain from stalks, and winnowing separates the heavier grain from lighter chaff. The cleaned grain is dried properly, then placed in clean, dry storage protected from moisture and pests. Build the sequence from field to storage.",
  "Now apply everything you learned in four tasks. First, identify the crop that is mature and ready. Second, arrange the five field-to-storage processes in order. Third, choose the machine that separates grain from stalks. Finally, place the dried grain in the safest storage area. Use the evidence from every station to protect the harvest.",
] as const;

const MATURITY_CHECKS = [
  ["green-crop", "Green crop · soft and immature"],
  ["golden-crop", "Golden-yellow crop · dry and mature"],
  ["firm-grain", "Full firm grain · ready for harvesting"],
] as const;

const HARVEST_STEPS = [
  "Inspect the curved sickle",
  "Cut the mature stalks near the ground",
  "Gather the cut stalks into bundles",
  "Compare the mechanical harvester",
] as const;

const THRESHING_FEATURES = [
  ["attached-grain", "Grain still attached to the stalk"],
  ["thresher", "Thresher separates grain from stalk"],
  ["straw", "Separated straw can remain useful"],
  ["combine", "Combine harvests and threshes"],
] as const;

const WINNOWING_STEPS = [
  "Load the grain-and-chaff mixture",
  "Start the controlled airflow",
  "Observe light chaff blow away",
  "Collect the heavier clean grain",
] as const;

const STORAGE_CHECKS = [
  ["raised-platform", "Raised platform · keeps bags off damp floors"],
  ["metal-bin", "Sealed metal bin · blocks moisture and pests"],
  ["silo", "Granary and silo · protect bulk grain"],
  ["torn-bag", "Torn bag · lets insects and rodents enter"],
  ["damp-wall", "Damp wall · encourages spoilage"],
] as const;

const PROCESS_ORDER = ["Harvesting", "Threshing", "Winnowing", "Drying", "Storage"] as const;
const PROCESS_CHOICES = ["Storage", "Threshing", "Drying", "Harvesting", "Winnowing"] as const;
const CHALLENGE_TASKS = ["mature-crop", "process-order", "thresher", "safe-storage"] as const;

type HarvestWorld = ReturnType<typeof createHarvestingStorageWorld>;
type MaturityCheckId = typeof MATURITY_CHECKS[number][0];
type ThreshingFeatureId = typeof THRESHING_FEATURES[number][0];
type StorageCheckId = typeof STORAGE_CHECKS[number][0];
type ProcessName = typeof PROCESS_ORDER[number];
type MoistureChoice = "damp" | "dry";
type ChallengeTaskId = typeof CHALLENGE_TASKS[number];

function emptyCompletion() {
  return STAGES.map(() => false);
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function HarvestingStorageViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<HarvestWorld | null>(null);
  const stageRef = useRef(0);
  const primaryActionRef = useRef<() => void>(() => undefined);
  const backActionRef = useRef<() => void>(() => undefined);
  const lessonStartedAtRef = useRef<number | null>(null);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(emptyCompletion);
  const [feedback, setFeedback] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [maturityChecks, setMaturityChecks] = useState<MaturityCheckId[]>([]);
  const [harvestProgress, setHarvestProgress] = useState(0);
  const [threshingChecks, setThreshingChecks] = useState<ThreshingFeatureId[]>([]);
  const [winnowingProgress, setWinnowingProgress] = useState(0);
  const [grainMoisture, setGrainMoisture] = useState<MoistureChoice>();
  const [storageChecks, setStorageChecks] = useState<StorageCheckId[]>([]);
  const [processSequence, setProcessSequence] = useState<ProcessName[]>([]);
  const [challengeMatches, setChallengeMatches] = useState<ChallengeTaskId[]>([]);

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

  const inspectMaturity = useCallback((checkId?: MaturityCheckId) => {
    setMaturityChecks(current => {
      const nextCheck = checkId ?? MATURITY_CHECKS.find(([id]) => !current.includes(id))?.[0];
      if (!nextCheck || current.includes(nextCheck)) return current;
      const next = [...current, nextCheck];
      const label = MATURITY_CHECKS.find(([id]) => id === nextCheck)?.[1] ?? nextCheck;
      if (next.length === MATURITY_CHECKS.length) {
        completeStage(0, "Maturity confirmed: the golden-yellow dry crop with full, firm grains is ready for harvesting.");
      } else {
        setFeedback(`${label} inspected · ${next.length} of ${MATURITY_CHECKS.length} clues compared.`);
      }
      return next;
    });
  }, [completeStage]);

  const completeHarvestStep = useCallback(() => {
    setHarvestProgress(current => {
      const next = Math.min(HARVEST_STEPS.length, current + 1);
      if (next === HARVEST_STEPS.length) {
        completeStage(1, "Harvest complete: mature stalks were cut, gathered and compared with machine harvesting.");
      } else {
        setFeedback(`${HARVEST_STEPS[next - 1]} complete · ${next} of ${HARVEST_STEPS.length} steps.`);
      }
      return next;
    });
  }, [completeStage]);

  const inspectThreshing = useCallback((featureId?: ThreshingFeatureId) => {
    setThreshingChecks(current => {
      const nextFeature = featureId ?? THRESHING_FEATURES.find(([id]) => !current.includes(id))?.[0];
      if (!nextFeature || current.includes(nextFeature)) return current;
      const next = [...current, nextFeature];
      const label = THRESHING_FEATURES.find(([id]) => id === nextFeature)?.[1] ?? nextFeature;
      if (next.length === THRESHING_FEATURES.length) {
        completeStage(2, "Threshing complete: grains and straw are separated, and the combine's two jobs are understood.");
      } else {
        setFeedback(`${label} inspected · ${next.length} of ${THRESHING_FEATURES.length} features.`);
      }
      return next;
    });
  }, [completeStage]);

  const completeWinnowingStep = useCallback(() => {
    setWinnowingProgress(current => {
      const next = Math.min(WINNOWING_STEPS.length, current + 1);
      if (next === WINNOWING_STEPS.length) {
        completeStage(3, "Winnowing complete: moving air carried away light chaff while heavier clean grain fell nearby.");
      } else {
        setFeedback(`${WINNOWING_STEPS[next - 1]} complete · ${next} of ${WINNOWING_STEPS.length} steps.`);
      }
      return next;
    });
  }, [completeStage]);

  const chooseMoisture = useCallback((choice: MoistureChoice) => {
    setGrainMoisture(choice);
    if (choice === "dry") {
      completeStage(4, "Correct: properly dried grain flows freely and is safer for storage.");
    } else {
      setFeedback("Damp grain can clump, support fungi and rot. Inspect the dry batch before storing it.");
    }
  }, [completeStage]);

  const inspectStorage = useCallback((checkId?: StorageCheckId) => {
    setStorageChecks(current => {
      const nextCheck = checkId ?? STORAGE_CHECKS.find(([id]) => !current.includes(id))?.[0];
      if (!nextCheck || current.includes(nextCheck)) return current;
      const next = [...current, nextCheck];
      const label = STORAGE_CHECKS.find(([id]) => id === nextCheck)?.[1] ?? nextCheck;
      if (next.length === STORAGE_CHECKS.length) {
        completeStage(5, "Storage inspection complete: clean dry containers, raised bags and regular checks protect the grain.");
      } else {
        setFeedback(`${label} inspected · ${next.length} of ${STORAGE_CHECKS.length} storage features.`);
      }
      return next;
    });
  }, [completeStage]);

  const placeProcess = useCallback((process?: ProcessName) => {
    setProcessSequence(current => {
      const expected = PROCESS_ORDER[current.length];
      const selection = process ?? expected;
      if (!expected || !selection) return current;
      if (selection !== expected) {
        setFeedback(`Not yet. After ${current.at(-1) ?? "crop maturity"}, the next process is not ${selection.toLowerCase()}.`);
        return current;
      }
      const next = [...current, selection];
      if (next.length === PROCESS_ORDER.length) {
        completeStage(6, "Sequence complete: harvesting, threshing, winnowing, drying and safe storage.");
      } else {
        setFeedback(`${selection} placed correctly · ${next.length} of ${PROCESS_ORDER.length} processes.`);
      }
      return next;
    });
  }, [completeStage]);

  const completeChallengeTask = useCallback((task: ChallengeTaskId, correct: boolean, wrongMessage: string) => {
    const expected = CHALLENGE_TASKS[challengeMatches.length];
    if (task !== expected) return;
    if (!correct) {
      setFeedback(wrongMessage);
      return;
    }
    const next = [...challengeMatches, task];
    setChallengeMatches(next);
    if (next.length === CHALLENGE_TASKS.length) {
      completeStage(7, "Mission complete: the mature crop was processed in order and stored safely. Harvest saved!");
    } else {
      setFeedback(`Protection task ${next.length} complete · ${CHALLENGE_TASKS.length - next.length} remaining.`);
    }
  }, [challengeMatches, completeStage]);

  const performPrimary = useCallback(() => {
    if (completed[stage]) {
      if (stage < STAGES.length - 1) goToStage(stage + 1);
      else speakStage(stage);
      return;
    }
    switch (stage) {
      case 0:
        inspectMaturity();
        break;
      case 1:
        completeHarvestStep();
        break;
      case 2:
        inspectThreshing();
        break;
      case 3:
        completeWinnowingStep();
        break;
      case 4:
        chooseMoisture("dry");
        break;
      case 5:
        inspectStorage();
        break;
      case 6:
        placeProcess();
        break;
      case 7: {
        const task = CHALLENGE_TASKS[challengeMatches.length];
        if (task) completeChallengeTask(task, true, "");
        break;
      }
    }
  }, [
    challengeMatches.length,
    chooseMoisture,
    completeChallengeTask,
    completeHarvestStep,
    completeWinnowingStep,
    completed,
    goToStage,
    inspectMaturity,
    inspectStorage,
    inspectThreshing,
    placeProcess,
    speakStage,
    stage,
  ]);

  const restart = useCallback(() => {
    stopNarration();
    stageRef.current = 0;
    lessonStartedAtRef.current = performance.now();
    setStage(0);
    setCompleted(emptyCompletion());
    setFeedback("");
    setElapsedSeconds(0);
    setMaturityChecks([]);
    setHarvestProgress(0);
    setThreshingChecks([]);
    setWinnowingProgress(0);
    setGrainMoisture(undefined);
    setStorageChecks([]);
    setProcessSequence([]);
    setChallengeMatches([]);
    speakStage(0);
  }, [speakStage]);

  useEffect(() => {
    primaryActionRef.current = performPrimary;
    backActionRef.current = () => goToStage(stageRef.current - 1);
  }, [goToStage, performPrimary]);

  useEffect(() => {
    if (!started) return;
    if (lessonStartedAtRef.current === null) lessonStartedAtRef.current = performance.now();
    const timer = window.setInterval(() => {
      const startedAt = lessonStartedAtRef.current;
      if (startedAt !== null) setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("xr" in navigator)) return;
    (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } })
      .xr?.isSessionSupported?.("immersive-vr")
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  const actionLabel = completed[stage]
    ? stage === STAGES.length - 1 ? "Replay final summary" : "Continue to next mission"
    : stage === 0 ? `${STAGES[stage].action} · ${maturityChecks.length}/${MATURITY_CHECKS.length}`
      : stage === 1 ? `${STAGES[stage].action} · ${harvestProgress}/${HARVEST_STEPS.length}`
        : stage === 2 ? `${STAGES[stage].action} · ${threshingChecks.length}/${THRESHING_FEATURES.length}`
          : stage === 3 ? `${STAGES[stage].action} · ${winnowingProgress}/${WINNOWING_STEPS.length}`
            : stage === 5 ? `${STAGES[stage].action} · ${storageChecks.length}/${STORAGE_CHECKS.length}`
              : stage === 6 ? `${STAGES[stage].action} · ${processSequence.length}/${PROCESS_ORDER.length}`
                : stage === 7 ? `${STAGES[stage].action} · ${challengeMatches.length}/${CHALLENGE_TASKS.length}`
                  : STAGES[stage].action;

  const snapshot = useMemo<HarvestingStorageWorldSnapshot>(() => ({
    stage,
    maturityChecks,
    harvestProgress,
    threshingMethod: threshingChecks.at(-1),
    threshingStep: threshingChecks.length,
    winnowingProgress,
    grainMoisture: grainMoisture ?? "unknown",
    storageChecks,
    sequenceCount: processSequence.length,
    challengeMatches,
    completed: completed[stage],
    feedback,
    actionLabel,
    title: STAGES[stage].title,
    cue: STAGES[stage].cue,
  }), [
    actionLabel,
    challengeMatches,
    completed,
    feedback,
    grainMoisture,
    harvestProgress,
    maturityChecks,
    processSequence.length,
    stage,
    storageChecks,
    threshingChecks,
    winnowingProgress,
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
    renderer.toneMappingExposure = 1.08;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.05, 100);
    camera.position.set(0, 2.05, 6.4);
    camera.lookAt(0, 1.25, 0);
    const world = createHarvestingStorageWorld(scene, renderer);
    worldRef.current = world;
    world.setSnapshot(snapshot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.25, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 2.3;
    controls.maxDistance = 10;
    controls.minPolarAngle = 0.24;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      if (raycaster.intersectObjects(world.interactables, true)[0]) primaryActionRef.current();
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach(controller => {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.006, 1.9, 6),
        new THREE.MeshBasicMaterial({ color: 0xf7cf67, transparent: true, opacity: 0.88 }),
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = -0.95;
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
      startPosition: new THREE.Vector3(0, 0, 2.8),
      movementBounds: new THREE.Box2(new THREE.Vector2(-6.5, -5.4), new THREE.Vector2(6.5, 5.6)),
    });

    const pointer = new THREE.Vector2();
    const onPointerUp = (event: PointerEvent) => {
      if (renderer.xr.isPresenting || event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObjects(world.interactables, true)[0]) primaryActionRef.current();
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
    // The world is created once; mission state is projected through setSnapshot.
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
      lessonStartedAtRef.current ??= performance.now();
      setStarted(true);
      window.setTimeout(() => speakStage(stageRef.current), 700);
    } catch {
      setVrSupported(false);
      setFeedback("VR could not start. Continue in browser mode, then check the headset browser permissions.");
    }
  }, [speakStage]);

  const startBrowser = useCallback(() => {
    unlockNarration();
    lessonStartedAtRef.current = performance.now();
    setStarted(true);
    speakStage(stageRef.current);
  }, [speakStage]);

  const renderChallenge = () => {
    const task = CHALLENGE_TASKS[challengeMatches.length];
    if (task === "mature-crop") {
      return (
        <div className={styles.choiceGrid} aria-label="Choose the mature crop">
          <button className={styles.choice} onClick={() => completeChallengeTask(task, false, "Green, soft cereal is still immature. Look for the dry golden crop.")}>Green, soft crop</button>
          <button className={styles.choice} onClick={() => completeChallengeTask(task, true, "")}>Golden-yellow, dry crop</button>
        </div>
      );
    }
    if (task === "process-order") {
      return (
        <div className={styles.choiceGrid} aria-label="Choose the correct crop process order">
          <button className={styles.choice} onClick={() => completeChallengeTask(task, true, "")}>Harvest → Thresh → Winnow → Dry → Store</button>
          <button className={styles.choice} onClick={() => completeChallengeTask(task, false, "Grain must be dried before it is stored, after threshing and winnowing.")}>Harvest → Store → Thresh → Dry → Winnow</button>
        </div>
      );
    }
    if (task === "thresher") {
      return (
        <div className={styles.choiceGrid} aria-label="Choose the grain separating machine">
          <button className={styles.choice} onClick={() => completeChallengeTask(task, false, "An irrigation pump supplies water; it does not separate grain from stalks.")}>Irrigation pump</button>
          <button className={styles.choice} onClick={() => completeChallengeTask(task, true, "")}>Thresher</button>
          <button className={styles.choice} onClick={() => completeChallengeTask(task, false, "A seed drill places seeds in soil; it does not thresh harvested stalks.")}>Seed drill</button>
        </div>
      );
    }
    if (task === "safe-storage") {
      return (
        <div className={styles.choiceGrid} aria-label="Choose safe grain storage">
          <button className={styles.choice} onClick={() => completeChallengeTask(task, false, "Open bags beside a damp wall expose grain to moisture and pests.")}>Open bags beside a damp wall</button>
          <button className={styles.choice} onClick={() => completeChallengeTask(task, false, "Torn bags on the floor allow moisture, insects and rodents to enter.")}>Torn bags directly on the floor</button>
          <button className={styles.choice} onClick={() => completeChallengeTask(task, true, "")}>Sealed bins and clean bags on raised platforms</button>
        </div>
      );
    }
    return null;
  };

  const renderStageControls = () => {
    if (stage === 0) {
      return (
        <div className={styles.choiceGrid} aria-label="Crop maturity clues">
          {MATURITY_CHECKS.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={maturityChecks.includes(id)} disabled={maturityChecks.includes(id)} onClick={() => inspectMaturity(id)}>
              {maturityChecks.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 1) {
      return (
        <ul className={styles.stepList} aria-label="Harvesting steps">
          {HARVEST_STEPS.map((label, index) => <li key={label} data-done={index < harvestProgress}>{index < harvestProgress ? "✓" : index + 1} {label}</li>)}
        </ul>
      );
    }
    if (stage === 2) {
      return (
        <div className={styles.choiceGrid} aria-label="Threshing features">
          {THRESHING_FEATURES.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={threshingChecks.includes(id)} disabled={threshingChecks.includes(id)} onClick={() => inspectThreshing(id)}>
              {threshingChecks.includes(id) ? "✓" : "⚙"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 3) {
      return (
        <ul className={styles.stepList} aria-label="Winnowing steps">
          {WINNOWING_STEPS.map((label, index) => <li key={label} data-done={index < winnowingProgress}>{index < winnowingProgress ? "✓" : index + 1} {label}</li>)}
        </ul>
      );
    }
    if (stage === 4) {
      return (
        <div className={styles.choiceGrid} aria-label="Choose grain ready for storage">
          <button className={styles.choice} data-selected={grainMoisture === "damp"} onClick={() => chooseMoisture("damp")}>Damp, clumped grain with moisture</button>
          <button className={styles.choice} data-selected={grainMoisture === "dry"} onClick={() => chooseMoisture("dry")}>Clean, dry grain that flows freely</button>
        </div>
      );
    }
    if (stage === 5) {
      return (
        <div className={styles.choiceGrid} aria-label="Storage safety inspection">
          {STORAGE_CHECKS.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={storageChecks.includes(id)} disabled={storageChecks.includes(id)} onClick={() => inspectStorage(id)}>
              {storageChecks.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 6) {
      return (
        <>
          <div className={styles.matchHeading}>Built: {processSequence.join(" → ") || "Start with the mature crop"}</div>
          <div className={styles.choiceGrid} aria-label="Arrange the crop processing sequence">
            {PROCESS_CHOICES.map(process => (
              <button key={process} className={styles.choice} disabled={processSequence.includes(process)} data-selected={processSequence.includes(process)} onClick={() => placeProcess(process)}>
                {processSequence.includes(process) ? "✓" : "→"} {process}
              </button>
            ))}
          </div>
        </>
      );
    }
    if (stage === 7) return renderChallenge();
    return null;
  };

  const completionPercent = ((stage + (completed[stage] ? 1 : 0)) / STAGES.length) * 100;

  return (
    <main className={styles.root} data-harvest-stage={STAGES[stage].id}>
      <div ref={mountRef} className={styles.canvas} data-testid="simulation-canvas" aria-label="Interactive harvesting, threshing and crop storage learning farm" />

      {!started && (
        <section
          className={styles.launch}
          style={{
            background: "linear-gradient(90deg, rgba(31, 24, 8, .95), rgba(40, 29, 8, .35) 58%, rgba(35, 27, 10, .8)), url(\"/simulations/c8-ch01-a05-harvesting-threshing-and-storage-of-crops/environment.webp\") center / cover no-repeat",
          }}
        >
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>Class 8 · Science · Chapter 1 · Activity 5</div>
            <h1 className={styles.launchTitle}>Harvest Saved!</h1>
            <p className={styles.launchCopy}>
              Enter a realistic 360° cereal farm and protect the crop through maturity checks, harvesting, threshing, winnowing, drying and safe storage.
            </p>
            <div className={styles.launchFacts}>
              <span>5-minute crop mission</span>
              <span>Eight evidence-based activities</span>
              <span>Indian English narration</span>
              <span>Browser + Meta Quest</span>
            </div>
            <div className={styles.launchActions}>
              <button data-testid="simulation-launch" className={styles.primary} onClick={startBrowser}>Begin harvest mission</button>
              {vrSupported && <button className={styles.secondary} onClick={enterVR}>Enter immersive VR</button>}
            </div>
          </div>
        </section>
      )}

      {started && (
        <div className={styles.hud}>
          <header className={styles.topbar}>
            <div className={styles.missionName}>
              <strong>Protect the Harvest</strong><span>{formatClock(elapsedSeconds)} / 05:00</span>
            </div>
            <div className={styles.topActions}>
              <button data-testid="narration-replay" className={styles.iconButton} onClick={() => speakStage(stage)}>🔊 <span>Replay</span></button>
              <button data-testid="restart" className={styles.iconButton} onClick={restart}>↻ <span>Restart</span></button>
              {vrSupported && <button className={styles.iconButton} onClick={enterVR}>🥽 <span>VR</span></button>}
            </div>
          </header>

          <aside className={styles.panel} aria-label="Harvesting and storage lesson panel">
            <div className={styles.panelProgress}><span style={{ width: `${completionPercent}%` }} /></div>
            <div className={styles.panelScroll}>
              <div className={styles.stageEyebrow}>Mission {stage + 1} of {STAGES.length}</div>
              <h2 data-testid="stage-title" className={styles.stageTitle}>{STAGES[stage].title}</h2>
              <p data-testid="stage-cue" className={styles.cue}>{STAGES[stage].cue}</p>
              <p className={styles.detail}>{STAGES[stage].detail}</p>
              {feedback && <p role="status" className={styles.feedback}>{feedback}</p>}
              {renderStageControls()}
              {completed[7] && (
                <div className={styles.complete}>
                  <div>🌾</div>
                  <strong>Mission Complete: Harvest Saved!</strong>
                  <span>You harvested at maturity, separated and dried the grain, then protected it from moisture and pests.</span>
                </div>
              )}
              <button data-testid="primary-action" className={`${styles.primary} ${styles.primaryAction}`} onClick={performPrimary}>
                {actionLabel}
              </button>
              <div className={styles.badges} aria-label="Harvest evidence badges">
                <span data-earned={completed[0]}>◉ Maturity</span>
                <span data-earned={completed[2]}>◉ Grain separation</span>
                <span data-earned={completed[5]}>◉ Safe storage</span>
                <span data-earned={completed[7]}>◉ Harvest protector</span>
              </div>
            </div>
            <footer className={styles.panelFooter}>
              <button className={styles.navButton} disabled={stage === 0} onClick={() => goToStage(stage - 1)}>← Previous</button>
              <button className={styles.navButton} disabled={!completed[stage] || stage === STAGES.length - 1} onClick={() => goToStage(stage + 1)}>Next mission →</button>
            </footer>
          </aside>

          <div className={styles.controllerHint}>
            Browser: drag to orbit · right-drag to pan · scroll to zoom · Quest: trigger selects · A performs/continues · left back returns · B or right grip exits VR · joysticks move and turn
          </div>
        </div>
      )}
    </main>
  );
}
