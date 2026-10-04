"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  createIrrigationMethodsWorld,
  type IrrigationWorldSnapshot,
} from "../../lib/world-builder/irrigationMethodsWorld";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./VirusInvasionViewer.module.css";

const STAGES = [
  {
    id: "dry-field",
    title: "A Field in Need of Water",
    cue: "Inspect the dry soil, drooping crop and nearby water source, then identify irrigation.",
    detail: "Irrigation is the artificial supply of water to crops at regular intervals according to crop, soil and seasonal needs.",
    action: "Choose the meaning of irrigation",
  },
  {
    id: "root-zone",
    title: "Why Crops Need Irrigation",
    cue: "Trace water and dissolved minerals from the soil, through the roots and towards the leaves.",
    detail: "Water supports germination, transports dissolved mineral nutrients, maintains plant cells and is required for photosynthesis.",
    action: "Inspect the next root-zone feature",
  },
  {
    id: "water-sources",
    title: "Sources of Irrigation Water",
    cue: "Reveal the well, tube well, pond, river, dam and canal, then follow water towards farmland.",
    detail: "The available irrigation source depends on local rainfall, groundwater, surface water, storage and distribution systems.",
    action: "Reveal the next water source",
  },
  {
    id: "traditional",
    title: "Traditional Irrigation Methods",
    cue: "Operate the moat, dhekli, chain pump and rahat to lift water into field channels.",
    detail: "Traditional systems are often affordable and locally repairable, but generally require more human or animal effort and time.",
    action: "Operate the next traditional method",
  },
  {
    id: "sprinkler",
    title: "Sprinkler Irrigation System",
    cue: "Start the pump, connect the pipe and adjust the rotating nozzles until the uneven field is covered.",
    detail: "Pressurised water travels through pipes and rotating nozzles, falling like rain across uneven or sandy land.",
    action: "Complete the next sprinkler step",
  },
  {
    id: "drip",
    title: "Drip Irrigation System",
    cue: "Open the valve, place drippers beside the root zones and adjust a slow, steady flow.",
    detail: "Drip irrigation applies water drop by drop near individual roots, reducing evaporation, runoff and watering of empty spaces.",
    action: "Complete the next drip step",
  },
  {
    id: "compare",
    title: "Compare the Methods",
    cue: "Compare labour, land suitability, coverage and water loss for traditional, sprinkler and drip irrigation.",
    detail: "No single system is best everywhere. A suitable choice matches the crop, terrain, water availability, cost and labour conditions.",
    action: "Compare the next irrigation method",
  },
  {
    id: "field-challenge",
    title: "Choose the Correct Irrigation Method",
    cue: "Match three real field conditions with the method that supplies water effectively and responsibly.",
    detail: "Select sprinkler for an uneven broad field, drip for an orchard facing water scarcity, and a traditional lifting method for a small low-budget farm beside a well.",
    action: "Match the next field",
  },
] as const;

const NARRATIONS = [
  "Seeds have germinated and young plants are growing, but the soil is becoming dry. Plants need water at suitable intervals for healthy growth. The artificial supply of water to crops at regular intervals is called irrigation. Inspect the soil, the plants and the available water source.",
  "Water is essential for crop growth. Roots absorb water and dissolved minerals from the soil. Water helps seeds germinate, carries mineral nutrients through the plant, supports photosynthesis and protects crops during hot and dry conditions. Follow the journey from moist soil to root and leaf.",
  "Irrigation water may come from wells, tube wells, ponds, lakes, rivers, dams and canals. Wells and tube wells use groundwater. Ponds and dams store water. Canals carry water from rivers or reservoirs towards fields. Inspect each source and observe how water reaches farmland.",
  "Traditional methods lift water from wells, ponds or canals. A moat uses a bucket and pulley. A dhekli uses a long lever. A chain pump carries water upward using a moving chain, and a rahat uses a rotating wheel fitted with containers. These methods cost less but usually need more labour and time.",
  "In sprinkler irrigation, a pump sends water through pipes under pressure. Rotating nozzles spray the water over crops like rainfall. Sprinklers can distribute water across uneven or sandy land and are useful where the available water must cover a broad field.",
  "In drip irrigation, narrow tubes carry water along crop rows. Small outlets release water slowly beside each plant root zone. Very little water is lost by evaporation or runoff, so drip irrigation is highly water efficient for orchards, gardens and water-scarce areas.",
  "Different irrigation methods suit different conditions. Traditional methods may be affordable but require more labour. Sprinklers spread water like rain and work well across uneven land. Drip irrigation delivers water directly to roots and usually wastes the least water. Compare all three before choosing.",
  "Apply your evidence. Use sprinkler irrigation for the uneven wheat field, drip irrigation for the fruit orchard where water is scarce, and a suitable traditional lifting method for the small farm beside a well with simple equipment. The best method depends on field conditions, crop needs and available water.",
] as const;

const ROOT_FEATURES = [
  ["moist-soil", "Moist soil · stores water for young crops"],
  ["root-hairs", "Root hairs · absorb water and dissolved minerals"],
  ["stem-leaf", "Stem to leaf · carries water for growth and photosynthesis"],
] as const;

const WATER_SOURCES = [
  ["well", "Well · groundwater"],
  ["tube-well", "Tube well · pumped groundwater"],
  ["pond", "Pond · stored surface water"],
  ["river", "River · flowing surface water"],
  ["dam", "Dam · reservoir storage"],
  ["canal", "Canal · carries water to fields"],
] as const;

const TRADITIONAL_METHODS = [
  ["moat", "Moat · bucket and pulley"],
  ["dhekli", "Dhekli · long lever"],
  ["chain-pump", "Chain pump · moving containers"],
  ["rahat", "Rahat · rotating water wheel"],
] as const;

const SPRINKLER_STEPS = [
  "Start the pump",
  "Connect the main pressure pipe",
  "Raise and adjust the rotating nozzles",
  "Balance the pressure for complete field coverage",
] as const;

const DRIP_STEPS = [
  "Open the main valve",
  "Lay the first narrow tube beside a crop row",
  "Connect the second crop row",
  "Connect the third crop row",
  "Adjust the drippers to a slow root-zone flow",
] as const;

const COMPARISON_METHODS = [
  ["traditional", "Traditional · lower equipment cost, more labour and time"],
  ["sprinkler", "Sprinkler · broad coverage on uneven or sandy land"],
  ["drip", "Drip · least water loss and direct root-zone delivery"],
] as const;

const FIELD_CHALLENGES = [
  {
    id: "uneven-field",
    label: "Uneven broad wheat field",
    method: "sprinkler",
    methodLabel: "Sprinkler irrigation",
  },
  {
    id: "orchard",
    label: "Fruit orchard where water is scarce",
    method: "drip",
    methodLabel: "Drip irrigation",
  },
  {
    id: "small-farm",
    label: "Small low-budget farm beside a well",
    method: "traditional",
    methodLabel: "Traditional lifting method",
  },
] as const;

const METHOD_OPTIONS = [
  ["traditional", "Traditional lifting method"],
  ["sprinkler", "Sprinkler irrigation"],
  ["drip", "Drip irrigation"],
] as const;

type IrrigationWorld = ReturnType<typeof createIrrigationMethodsWorld>;
type RootFeatureId = typeof ROOT_FEATURES[number][0];
type WaterSourceId = typeof WATER_SOURCES[number][0];
type TraditionalMethodId = typeof TRADITIONAL_METHODS[number][0];
type ComparisonMethodId = typeof COMPARISON_METHODS[number][0];
type FieldId = typeof FIELD_CHALLENGES[number]["id"];
type FieldMethod = typeof FIELD_CHALLENGES[number]["method"];

function emptyCompletion() {
  return STAGES.map(() => false);
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function IrrigationMethodsViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<IrrigationWorld | null>(null);
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
  const [definitionAnswer, setDefinitionAnswer] = useState<"irrigation" | "harvesting">();
  const [rootFeatures, setRootFeatures] = useState<RootFeatureId[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSourceId[]>([]);
  const [traditionalMethods, setTraditionalMethods] = useState<TraditionalMethodId[]>([]);
  const [sprinklerStep, setSprinklerStep] = useState(0);
  const [dripStep, setDripStep] = useState(0);
  const [comparedMethods, setComparedMethods] = useState<ComparisonMethodId[]>([]);
  const [selectedField, setSelectedField] = useState<FieldId>();
  const [fieldMatches, setFieldMatches] = useState<FieldId[]>([]);

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

  const answerDefinition = useCallback((answer: "irrigation" | "harvesting") => {
    setDefinitionAnswer(answer);
    if (answer === "irrigation") {
      completeStage(0, "Correct: irrigation supplies water artificially to crops at suitable regular intervals.");
    } else {
      setFeedback("That describes a different farm activity. Use the dry soil, crop and nearby water source as evidence.");
    }
  }, [completeStage]);

  const inspectRootFeature = useCallback((featureId?: RootFeatureId) => {
    setRootFeatures(current => {
      const nextFeature = featureId ?? ROOT_FEATURES.find(([id]) => !current.includes(id))?.[0];
      if (!nextFeature || current.includes(nextFeature)) return current;
      const next = [...current, nextFeature];
      const label = ROOT_FEATURES.find(([id]) => id === nextFeature)?.[1] ?? nextFeature;
      if (next.length === ROOT_FEATURES.length) {
        completeStage(1, "Water journey complete: moist soil supplies roots, and the plant carries water and minerals towards its leaves.");
      } else {
        setFeedback(`${label} inspected · ${next.length} of ${ROOT_FEATURES.length} root-zone features traced.`);
      }
      return next;
    });
  }, [completeStage]);

  const revealWaterSource = useCallback((sourceId?: WaterSourceId) => {
    setWaterSources(current => {
      const nextSource = sourceId ?? WATER_SOURCES.find(([id]) => !current.includes(id))?.[0];
      if (!nextSource || current.includes(nextSource)) return current;
      const next = [...current, nextSource];
      const label = WATER_SOURCES.find(([id]) => id === nextSource)?.[1] ?? nextSource;
      if (next.length === WATER_SOURCES.length) {
        completeStage(2, "All six sources mapped: groundwater, surface water, stored water and canals can support irrigation.");
      } else {
        setFeedback(`${label} revealed · ${next.length} of ${WATER_SOURCES.length} sources mapped.`);
      }
      return next;
    });
  }, [completeStage]);

  const operateTraditionalMethod = useCallback((methodId?: TraditionalMethodId) => {
    setTraditionalMethods(current => {
      const nextMethod = methodId ?? TRADITIONAL_METHODS.find(([id]) => !current.includes(id))?.[0];
      if (!nextMethod || current.includes(nextMethod)) return current;
      const next = [...current, nextMethod];
      const label = TRADITIONAL_METHODS.find(([id]) => id === nextMethod)?.[1] ?? nextMethod;
      if (next.length === TRADITIONAL_METHODS.length) {
        completeStage(3, "Traditional systems complete: each device lifts water with human or animal effort and simple mechanisms.");
      } else {
        setFeedback(`${label} operated · ${next.length} of ${TRADITIONAL_METHODS.length} methods tested.`);
      }
      return next;
    });
  }, [completeStage]);

  const completeSprinklerStep = useCallback(() => {
    setSprinklerStep(current => {
      const next = Math.min(SPRINKLER_STEPS.length, current + 1);
      if (next === SPRINKLER_STEPS.length) {
        completeStage(4, "Sprinkler configured: pressurised rotating nozzles now cover the broad uneven field like rainfall.");
      } else {
        setFeedback(`${SPRINKLER_STEPS[next - 1]} complete · ${next} of ${SPRINKLER_STEPS.length} steps.`);
      }
      return next;
    });
  }, [completeStage]);

  const completeDripStep = useCallback(() => {
    setDripStep(current => {
      const next = Math.min(DRIP_STEPS.length, current + 1);
      if (next === DRIP_STEPS.length) {
        completeStage(5, "Drip system configured: a slow flow now wets each root zone with very little evaporation or runoff.");
      } else {
        setFeedback(`${DRIP_STEPS[next - 1]} complete · ${next} of ${DRIP_STEPS.length} steps.`);
      }
      return next;
    });
  }, [completeStage]);

  const compareMethod = useCallback((methodId?: ComparisonMethodId) => {
    setComparedMethods(current => {
      const nextMethod = methodId ?? COMPARISON_METHODS.find(([id]) => !current.includes(id))?.[0];
      if (!nextMethod || current.includes(nextMethod)) return current;
      const next = [...current, nextMethod];
      const label = COMPARISON_METHODS.find(([id]) => id === nextMethod)?.[1] ?? nextMethod;
      if (next.length === COMPARISON_METHODS.length) {
        completeStage(6, "Comparison complete: the best method depends on terrain, crop, water, cost and available labour.");
      } else {
        setFeedback(`${label} compared · ${next.length} of ${COMPARISON_METHODS.length} methods reviewed.`);
      }
      return next;
    });
  }, [completeStage]);

  const matchField = useCallback((method: FieldMethod, fieldOverride?: FieldId) => {
    const fieldId = fieldOverride ?? selectedField;
    if (!fieldId) {
      setFeedback("Select one field condition before choosing an irrigation method.");
      return;
    }
    const field = FIELD_CHALLENGES.find(item => item.id === fieldId);
    if (!field) return;
    if (field.method !== method) {
      setFeedback(`That method is not the best match for the ${field.label.toLowerCase()}. Compare terrain, water and cost again.`);
      return;
    }
    const next = fieldMatches.includes(fieldId) ? fieldMatches : [...fieldMatches, fieldId];
    setFieldMatches(next);
    setSelectedField(undefined);
    if (next.length === FIELD_CHALLENGES.length) {
      completeStage(7, "Irrigation plan complete! All three fields now receive water with a suitable and responsible method.");
    } else {
      setFeedback(`${field.label} matched with ${field.methodLabel} · ${next.length} of ${FIELD_CHALLENGES.length} fields planned.`);
    }
  }, [completeStage, fieldMatches, selectedField]);

  const performPrimary = useCallback(() => {
    if (completed[stage]) {
      if (stage < STAGES.length - 1) goToStage(stage + 1);
      else speakStage(stage);
      return;
    }
    switch (stage) {
      case 0:
        answerDefinition("irrigation");
        break;
      case 1:
        inspectRootFeature();
        break;
      case 2:
        revealWaterSource();
        break;
      case 3:
        operateTraditionalMethod();
        break;
      case 4:
        completeSprinklerStep();
        break;
      case 5:
        completeDripStep();
        break;
      case 6:
        compareMethod();
        break;
      case 7: {
        const field = FIELD_CHALLENGES.find(item => !fieldMatches.includes(item.id));
        if (field) matchField(field.method, field.id);
        break;
      }
    }
  }, [
    answerDefinition,
    compareMethod,
    completeDripStep,
    completeSprinklerStep,
    completed,
    fieldMatches,
    goToStage,
    inspectRootFeature,
    matchField,
    operateTraditionalMethod,
    revealWaterSource,
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
    setDefinitionAnswer(undefined);
    setRootFeatures([]);
    setWaterSources([]);
    setTraditionalMethods([]);
    setSprinklerStep(0);
    setDripStep(0);
    setComparedMethods([]);
    setSelectedField(undefined);
    setFieldMatches([]);
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
    : stage === 1 ? `${STAGES[stage].action} · ${rootFeatures.length}/${ROOT_FEATURES.length}`
      : stage === 2 ? `${STAGES[stage].action} · ${waterSources.length}/${WATER_SOURCES.length}`
        : stage === 3 ? `${STAGES[stage].action} · ${traditionalMethods.length}/${TRADITIONAL_METHODS.length}`
          : stage === 4 ? `${STAGES[stage].action} · ${sprinklerStep}/${SPRINKLER_STEPS.length}`
            : stage === 5 ? `${STAGES[stage].action} · ${dripStep}/${DRIP_STEPS.length}`
              : stage === 6 ? `${STAGES[stage].action} · ${comparedMethods.length}/${COMPARISON_METHODS.length}`
                : stage === 7 ? `${STAGES[stage].action} · ${fieldMatches.length}/${FIELD_CHALLENGES.length}`
                  : STAGES[stage].action;

  const snapshot = useMemo<IrrigationWorldSnapshot>(() => ({
    stage,
    rootFeatures,
    waterSources,
    traditionalMethods,
    sprinklerStep,
    dripStep,
    comparedMethods,
    fieldMatches,
    completed: completed[stage],
    feedback,
    actionLabel,
    title: STAGES[stage].title,
    cue: STAGES[stage].cue,
  }), [
    actionLabel,
    comparedMethods,
    completed,
    dripStep,
    feedback,
    fieldMatches,
    rootFeatures,
    sprinklerStep,
    stage,
    traditionalMethods,
    waterSources,
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
    camera.position.set(0, 2.1, 6.2);
    camera.lookAt(0, 1.25, 0);
    const world = createIrrigationMethodsWorld(scene, renderer);
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
        new THREE.MeshBasicMaterial({ color: 0x78f0cf, transparent: true, opacity: 0.88 }),
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
      startPosition: new THREE.Vector3(0, 0, 2.7),
      movementBounds: new THREE.Box2(new THREE.Vector2(-6.2, -5.2), new THREE.Vector2(6.2, 5.4)),
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

  const renderStageControls = () => {
    if (stage === 0) {
      return (
        <div className={styles.choiceGrid} aria-label="Meaning of irrigation">
          <button className={styles.choice} data-selected={definitionAnswer === "irrigation"} onClick={() => answerDefinition("irrigation")}>Supply water artificially to crops at suitable regular intervals</button>
          <button className={styles.choice} data-selected={definitionAnswer === "harvesting"} onClick={() => answerDefinition("harvesting")}>Remove weeds and harvest mature crops from the field</button>
        </div>
      );
    }
    if (stage === 1) {
      return (
        <div className={styles.choiceGrid} aria-label="Root-zone water journey">
          {ROOT_FEATURES.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={rootFeatures.includes(id)} disabled={rootFeatures.includes(id)} onClick={() => inspectRootFeature(id)}>
              {rootFeatures.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 2) {
      return (
        <div className={styles.choiceGrid} aria-label="Sources of irrigation water">
          {WATER_SOURCES.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={waterSources.includes(id)} disabled={waterSources.includes(id)} onClick={() => revealWaterSource(id)}>
              {waterSources.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 3) {
      return (
        <div className={styles.choiceGrid} aria-label="Traditional irrigation methods">
          {TRADITIONAL_METHODS.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={traditionalMethods.includes(id)} disabled={traditionalMethods.includes(id)} onClick={() => operateTraditionalMethod(id)}>
              {traditionalMethods.includes(id) ? "✓" : "⚙"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 4) {
      return (
        <ul className={styles.stepList} aria-label="Sprinkler system setup">
          {SPRINKLER_STEPS.map((label, index) => (
            <li key={label} data-done={index < sprinklerStep}>{index < sprinklerStep ? "✓" : index + 1} {label}</li>
          ))}
        </ul>
      );
    }
    if (stage === 5) {
      return (
        <ul className={styles.stepList} aria-label="Drip system setup">
          {DRIP_STEPS.map((label, index) => (
            <li key={label} data-done={index < dripStep}>{index < dripStep ? "✓" : index + 1} {label}</li>
          ))}
        </ul>
      );
    }
    if (stage === 6) {
      return (
        <div className={styles.choiceGrid} aria-label="Compare irrigation methods">
          {COMPARISON_METHODS.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={comparedMethods.includes(id)} disabled={comparedMethods.includes(id)} onClick={() => compareMethod(id)}>
              {comparedMethods.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 7) {
      return (
        <>
          <div className={styles.matchHeading}>1 · Select a field condition</div>
          <div className={styles.choiceGrid} aria-label="Field conditions">
            {FIELD_CHALLENGES.map(field => (
              <button key={field.id} className={styles.choice} data-selected={selectedField === field.id || fieldMatches.includes(field.id)} disabled={fieldMatches.includes(field.id)} onClick={() => setSelectedField(field.id)}>
                {fieldMatches.includes(field.id) ? "✓" : selectedField === field.id ? "→" : "●"} {field.label}
              </button>
            ))}
          </div>
          <div className={styles.matchHeading}>2 · Choose the suitable method</div>
          <div className={styles.choiceGrid} aria-label="Irrigation method choices">
            {METHOD_OPTIONS.map(([id, label]) => (
              <button key={id} className={styles.choice} disabled={!selectedField} onClick={() => matchField(id)}>{label}</button>
            ))}
          </div>
        </>
      );
    }
    return null;
  };

  const completionPercent = ((stage + (completed[stage] ? 1 : 0)) / STAGES.length) * 100;

  return (
    <main className={styles.root} data-irrigation-stage={STAGES[stage].id}>
      <div ref={mountRef} className={styles.canvas} data-testid="simulation-canvas" aria-label="Interactive irrigation methods learning farm" />

      {!started && (
        <section
          className={styles.launch}
          style={{
            background: "linear-gradient(90deg, rgba(5, 24, 18, .94), rgba(5, 24, 18, .42) 56%, rgba(10, 41, 43, .82)), url(\"/simulations/c8-ch01-a03-irrigation-methods/environment.webp\") center / cover no-repeat",
          }}
        >
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>Class 8 · Science · Chapter 1 · Activity 3</div>
            <h1 className={styles.launchTitle}>Every Root Gets Water</h1>
            <p className={styles.launchCopy}>
              Enter a realistic 360° Indian farm, restore a dry crop field and operate traditional, sprinkler and drip irrigation systems before planning water for three different farms.
            </p>
            <div className={styles.launchFacts}>
              <span>5-minute guided farm mission</span>
              <span>Eight evidence-based activities</span>
              <span>Indian English narration</span>
              <span>Browser + Meta Quest</span>
            </div>
            <div className={styles.launchActions}>
              <button data-testid="simulation-launch" className={styles.primary} onClick={startBrowser}>Begin irrigation mission</button>
              {vrSupported && <button className={styles.secondary} onClick={enterVR}>Enter immersive VR</button>}
            </div>
          </div>
        </section>
      )}

      {started && (
        <div className={styles.hud}>
          <header className={styles.topbar}>
            <div className={styles.missionName}>
              <strong>Water-wise Farm</strong><span>{formatClock(elapsedSeconds)} / 05:00</span>
            </div>
            <div className={styles.topActions}>
              <button data-testid="narration-replay" className={styles.iconButton} onClick={() => speakStage(stage)}>🔊 <span>Replay</span></button>
              <button data-testid="restart" className={styles.iconButton} onClick={restart}>↻ <span>Restart</span></button>
              {vrSupported && <button className={styles.iconButton} onClick={enterVR}>🥽 <span>VR</span></button>}
            </div>
          </header>

          <aside className={styles.panel} aria-label="Irrigation methods lesson panel">
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
                  <div>💧</div>
                  <strong>Irrigation Planner Certified</strong>
                  <span>You traced water from source to root and matched each farm with a suitable irrigation method.</span>
                </div>
              )}
              <button data-testid="primary-action" className={`${styles.primary} ${styles.primaryAction}`} onClick={performPrimary}>
                {actionLabel}
              </button>
              <div className={styles.badges} aria-label="Irrigation evidence badges">
                <span data-earned={completed[1]}>◉ Root science</span>
                <span data-earned={completed[3]}>◉ Traditional</span>
                <span data-earned={completed[4] && completed[5]}>◉ Modern systems</span>
                <span data-earned={completed[7]}>◉ Field planner</span>
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
