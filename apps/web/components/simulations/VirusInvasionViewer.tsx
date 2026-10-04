"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  createVirusInvasionWorld,
  type VirusWorldSnapshot,
} from "../../lib/world-builder/virusInvasionWorld";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./VirusInvasionViewer.module.css";

const STAGES = [
  {
    id: "warning",
    title: "The Invisible Warning",
    cue: "Activate the micro-scanner and enter a world too small for an ordinary school microscope.",
    detail: "This model enlarges viruses millions of times so their structure and behaviour can be investigated safely.",
    action: "Activate micro-scanner",
  },
  {
    id: "anatomy",
    title: "Meet the Virus",
    cue: "Scan the genetic material, protein coat, envelope and attachment structures.",
    detail: "A virus is not a complete cell and cannot reproduce independently. Its genetic instructions are protected by a protein coat.",
    action: "Scan next virus part",
  },
  {
    id: "replication",
    title: "Inside the Host Cell",
    cue: "Run attachment, entry, copying, assembly and release in the correct order.",
    detail: "A suitable host cell supplies machinery that the viral genetic material redirects to make more virus particles.",
    action: "Run next replication stage",
  },
  {
    id: "transmission",
    title: "The Transmission Tunnel",
    cue: "Reveal five routes that can carry viruses from one host to another.",
    detail: "Different viruses use different routes. Scientific prevention begins by identifying the relevant route accurately.",
    action: "Reveal next transmission route",
  },
  {
    id: "effects",
    title: "Effects and Prevention",
    cue: "Build a six-layer protection shield, then correct the antibiotics misconception.",
    detail: "Viruses damage suitable cells while the immune system responds. Hygiene, ventilation, safe water, vector control and vaccination reduce particular risks.",
    action: "Add next protection layer",
  },
  {
    id: "summary",
    title: "Rebuild the Viral Cycle",
    cue: "Place the five replication stages in the correct scientific order.",
    detail: "Attachment and entry come first; copying and assembly produce new particles; release continues the infection.",
    action: "Place next cycle stage",
  },
  {
    id: "break-chain",
    title: "Break the Viral Chain",
    cue: "Match five transmission risks with the preventive action that controls each one.",
    detail: "Every correct match removes red virus particles and activates one section of the final protection shield.",
    action: "Match next risk",
  },
] as const;

const NARRATIONS = [
  "An invisible infectious agent has been detected. It is too small to be seen with an ordinary school microscope. Activate the micro-scanner and enter its microscopic world.",
  "This is a virus, an extremely small infectious agent. It is not a complete cell. Genetic material at the centre carries instructions. A protein coat protects it, some viruses have an envelope, and surface structures help it attach to a suitable living cell. A virus cannot reproduce independently.",
  "First, the virus attaches to a matching receptor. Next, it enters or releases its genetic material. The viral instructions take control of some cell machinery. New viral material and proteins are copied, assembled into complete particles, and released. One virus has become many.",
  "Viruses can spread by different routes. Some travel in respiratory particles. Some may transfer from contaminated surfaces to the hands and then the eyes, nose or mouth. Others spread through contaminated food or water, insect vectors such as certain mosquitoes, or infected blood and body fluids.",
  "Viral infections may cause fever, tiredness, cough, sore throat, body ache, rash or digestive problems. Handwashing, covered coughs, ventilation, safe food and water, mosquito control and recommended vaccination can reduce transmission. Vaccines prepare the immune system to recognise particular viruses. Antibiotics work against certain bacteria; they do not cure viral infections.",
  "Review the evidence. A virus needs a living host cell to reproduce. It attaches, enters, uses the cell to copy viral material, assembles new particles and releases them. Different routes can carry viruses to new hosts.",
  "Complete the final challenge. Match respiratory particles with covered coughs, contaminated hands with soap and water, unsafe water with safe drinking water, stagnant water with mosquito control, and closed rooms with ventilation. Understand the spread, protect health and break the chain.",
] as const;

const VIRUS_PARTS = [
  "Genetic material · instructions for new viruses",
  "Protein coat · protects the genetic material",
  "Outer envelope · present in some viruses",
  "Attachment structures · bind to matching host-cell receptors",
] as const;

const REPLICATION_STEPS = ["Attachment", "Entry", "Copying", "Assembly", "Release"] as const;

const ROUTES = [
  ["respiratory", "Respiratory particles"],
  ["surface", "Hands and contaminated surfaces"],
  ["water", "Contaminated food or water"],
  ["mosquito", "Insect vectors such as mosquitoes"],
  ["blood", "Blood and body fluids"],
] as const;

const PROTECTIONS = [
  "Wash hands with soap and clean water",
  "Cover coughs and sneezes",
  "Improve indoor ventilation",
  "Use safe food and drinking water",
  "Remove stagnant water",
  "Use recommended vaccination",
] as const;

const SHUFFLED_REPLICATION = ["Assembly", "Attachment", "Release", "Copying", "Entry"] as const;

const CHAIN_RISKS = [
  { id: "respiratory", label: "Respiratory particles", prevention: "cover", preventionLabel: "Cover coughs and sneezes" },
  { id: "surface", label: "Contaminated hands", prevention: "wash", preventionLabel: "Wash with soap and water" },
  { id: "water", label: "Contaminated water", prevention: "safe-water", preventionLabel: "Use safe drinking water" },
  { id: "mosquito", label: "Stagnant water", prevention: "mosquito-control", preventionLabel: "Remove stagnant water" },
  { id: "blood", label: "Closed room particles", prevention: "ventilate", preventionLabel: "Open windows for ventilation" },
] as const;

const PREVENTION_OPTIONS = [
  ["wash", "Wash with soap and water"],
  ["safe-water", "Use safe drinking water"],
  ["ventilate", "Open windows for ventilation"],
  ["cover", "Cover coughs and sneezes"],
  ["mosquito-control", "Remove stagnant water"],
] as const;

type VirusWorld = ReturnType<typeof createVirusInvasionWorld>;
type RouteId = typeof ROUTES[number][0];
type ChainRiskId = typeof CHAIN_RISKS[number]["id"];

function emptyCompletion() {
  return STAGES.map(() => false);
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function VirusInvasionViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<VirusWorld | null>(null);
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
  const [scannedParts, setScannedParts] = useState(0);
  const [replicationStep, setReplicationStep] = useState(0);
  const [revealedRoutes, setRevealedRoutes] = useState<RouteId[]>([]);
  const [protectionCount, setProtectionCount] = useState(0);
  const [antibioticAnswer, setAntibioticAnswer] = useState<"cures" | "not-cure">();
  const [cycleSequence, setCycleSequence] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<ChainRiskId>();
  const [chainMatches, setChainMatches] = useState<ChainRiskId[]>([]);

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

  const scanNextPart = useCallback(() => {
    setScannedParts(current => {
      const next = Math.min(VIRUS_PARTS.length, current + 1);
      if (next === VIRUS_PARTS.length) {
        completeStage(1, "Structure scan complete: this virus still needs a suitable living host cell to reproduce.");
      } else {
        setFeedback(`${VIRUS_PARTS[next - 1]} identified. Continue the structural scan.`);
      }
      return next;
    });
  }, [completeStage]);

  const runReplication = useCallback(() => {
    setReplicationStep(current => {
      const next = Math.min(REPLICATION_STEPS.length, current + 1);
      if (next === REPLICATION_STEPS.length) {
        completeStage(2, "Release complete: newly assembled viruses can move towards nearby suitable cells.");
      } else {
        setFeedback(`${REPLICATION_STEPS[next - 1]} complete. Next comes ${REPLICATION_STEPS[next]}.`);
      }
      return next;
    });
  }, [completeStage]);

  const revealRoute = useCallback((routeId?: RouteId) => {
    setRevealedRoutes(current => {
      const nextRoute = routeId ?? ROUTES.find(([id]) => !current.includes(id))?.[0];
      if (!nextRoute || current.includes(nextRoute)) return current;
      const next = [...current, nextRoute];
      const label = ROUTES.find(([id]) => id === nextRoute)?.[1] ?? nextRoute;
      if (next.length === ROUTES.length) {
        completeStage(3, "All five routes revealed. Different viruses require different route-specific controls.");
      } else {
        setFeedback(`${label} revealed · ${next.length} of ${ROUTES.length} routes inspected.`);
      }
      return next;
    });
  }, [completeStage]);

  const addProtection = useCallback(() => {
    setProtectionCount(current => {
      const next = Math.min(PROTECTIONS.length, current + 1);
      if (next === PROTECTIONS.length) {
        setFeedback("Protection shield built. Now test the antibiotics claim to finish this mission.");
      } else {
        setFeedback(`${PROTECTIONS[next - 1]} added · ${next} of ${PROTECTIONS.length} shield layers active.`);
      }
      return next;
    });
  }, []);

  const answerAntibiotic = useCallback((answer: "cures" | "not-cure") => {
    setAntibioticAnswer(answer);
    if (protectionCount < PROTECTIONS.length) {
      setFeedback("Build all six prevention layers before testing the claim.");
      return;
    }
    if (answer === "cures") {
      setFeedback("Not correct. Antibiotics target features of certain bacteria, not viruses inside host cells.");
      return;
    }
    completeStage(4, "Correct: antibiotics do not cure viral infections. The six-layer prevention shield is active.");
  }, [completeStage, protectionCount]);

  const placeCycleStep = useCallback((label: string) => {
    const expected = REPLICATION_STEPS[cycleSequence.length];
    if (label !== expected) {
      setFeedback(`Not yet. After “${cycleSequence.at(-1) ?? "start"}”, use the host-cell evidence to find the next stage.`);
      return;
    }
    const next = [...cycleSequence, label];
    setCycleSequence(next);
    if (next.length === REPLICATION_STEPS.length) {
      completeStage(5, "Cycle rebuilt: attachment → entry → copying → assembly → release.");
    } else {
      setFeedback(`${label} placed correctly. Choose stage ${next.length + 1}.`);
    }
  }, [completeStage, cycleSequence]);

  const matchPrevention = useCallback((preventionId: string, riskOverride?: ChainRiskId) => {
    const riskId = riskOverride ?? selectedRisk;
    if (!riskId) {
      setFeedback("Select one red transmission risk first.");
      return;
    }
    const risk = CHAIN_RISKS.find(item => item.id === riskId);
    if (!risk) return;
    if (risk.prevention !== preventionId) {
      setFeedback(`That action does not directly control ${risk.label.toLowerCase()}. Compare the routes again.`);
      return;
    }
    const next = chainMatches.includes(riskId) ? chainMatches : [...chainMatches, riskId];
    setChainMatches(next);
    setSelectedRisk(undefined);
    if (next.length === CHAIN_RISKS.length) {
      completeStage(6, "Virus Shield Activated! All five transmission links have been broken.");
    } else {
      setFeedback(`${risk.label} matched with ${risk.preventionLabel}. ${next.length} of ${CHAIN_RISKS.length} links controlled.`);
    }
  }, [chainMatches, completeStage, selectedRisk]);

  const performPrimary = useCallback(() => {
    if (completed[stage]) {
      if (stage < STAGES.length - 1) goToStage(stage + 1);
      else speakStage(stage);
      return;
    }
    switch (stage) {
      case 0:
        completeStage(0, "Micro-scanner active. Scale changed from laboratory view to an enlarged scientific virus model.");
        break;
      case 1:
        scanNextPart();
        break;
      case 2:
        runReplication();
        break;
      case 3:
        revealRoute();
        break;
      case 4:
        if (protectionCount < PROTECTIONS.length) addProtection();
        else answerAntibiotic("not-cure");
        break;
      case 5:
        placeCycleStep(REPLICATION_STEPS[cycleSequence.length]);
        break;
      case 6: {
        const risk = CHAIN_RISKS.find(item => !chainMatches.includes(item.id));
        if (risk) {
          setSelectedRisk(risk.id);
          matchPrevention(risk.prevention, risk.id);
        }
        break;
      }
    }
  }, [
    addProtection,
    answerAntibiotic,
    chainMatches,
    completeStage,
    completed,
    cycleSequence.length,
    goToStage,
    matchPrevention,
    placeCycleStep,
    protectionCount,
    revealRoute,
    runReplication,
    scanNextPart,
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
    setScannedParts(0);
    setReplicationStep(0);
    setRevealedRoutes([]);
    setProtectionCount(0);
    setAntibioticAnswer(undefined);
    setCycleSequence([]);
    setSelectedRisk(undefined);
    setChainMatches([]);
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
    : stage === 1 ? `${STAGES[stage].action} · ${scannedParts}/${VIRUS_PARTS.length}`
      : stage === 2 ? `${STAGES[stage].action} · ${replicationStep}/${REPLICATION_STEPS.length}`
        : stage === 3 ? `${STAGES[stage].action} · ${revealedRoutes.length}/${ROUTES.length}`
          : stage === 4 ? protectionCount < PROTECTIONS.length
            ? `${STAGES[stage].action} · ${protectionCount}/${PROTECTIONS.length}`
            : "Confirm antibiotics evidence"
            : stage === 5 ? `${STAGES[stage].action} · ${cycleSequence.length}/${REPLICATION_STEPS.length}`
              : stage === 6 ? `${STAGES[stage].action} · ${chainMatches.length}/${CHAIN_RISKS.length}`
                : STAGES[stage].action;

  const snapshot = useMemo<VirusWorldSnapshot>(() => ({
    stage,
    scannedParts,
    replicationStep,
    revealedRoutes,
    protectionCount,
    sequenceCount: cycleSequence.length,
    chainMatches,
    completed: completed[stage],
    feedback,
    actionLabel,
    title: STAGES[stage].title,
    cue: STAGES[stage].cue,
  }), [
    actionLabel,
    chainMatches,
    completed,
    cycleSequence.length,
    feedback,
    protectionCount,
    replicationStep,
    revealedRoutes,
    scannedParts,
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
    renderer.toneMappingExposure = 1.12;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.05, 90);
    camera.position.set(0, 2.05, 5.7);
    camera.lookAt(0, 1.35, 0);
    const world = createVirusInvasionWorld(scene, renderer);
    worldRef.current = world;
    world.setSnapshot(snapshot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.35, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 2.4;
    controls.maxDistance = 9;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

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
        new THREE.MeshBasicMaterial({ color: 0x75ecff, transparent: true, opacity: 0.88 }),
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
      movementBounds: new THREE.Box2(new THREE.Vector2(-5.5, -4.5), new THREE.Vector2(5.5, 4.8)),
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
    if (stage === 1) {
      return (
        <ul className={styles.stepList} aria-label="Virus structure scan">
          {VIRUS_PARTS.map((label, index) => (
            <li key={label} data-done={index < scannedParts}>{index < scannedParts ? "✓" : index + 1} {label}</li>
          ))}
        </ul>
      );
    }
    if (stage === 2) {
      return (
        <ul className={styles.stepList} aria-label="Virus replication cycle">
          {REPLICATION_STEPS.map((label, index) => (
            <li key={label} data-done={index < replicationStep}>{index < replicationStep ? "✓" : index + 1} {label}</li>
          ))}
        </ul>
      );
    }
    if (stage === 3) {
      return (
        <div className={styles.choiceGrid} aria-label="Transmission routes">
          {ROUTES.map(([id, label]) => (
            <button key={id} className={styles.choice} data-selected={revealedRoutes.includes(id)} onClick={() => revealRoute(id)}>
              {revealedRoutes.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 4) {
      return (
        <>
          <ul className={styles.stepList} aria-label="Protection shield layers">
            {PROTECTIONS.map((label, index) => (
              <li key={label} data-done={index < protectionCount}>{index < protectionCount ? "✓" : "○"} {label}</li>
            ))}
          </ul>
          {protectionCount === PROTECTIONS.length && (
            <div className={styles.choiceGrid} aria-label="Antibiotics claim">
              <button className={styles.choice} data-selected={antibioticAnswer === "cures"} onClick={() => answerAntibiotic("cures")}>Antibiotics cure viral infections</button>
              <button className={styles.choice} data-selected={antibioticAnswer === "not-cure"} onClick={() => answerAntibiotic("not-cure")}>Antibiotics act against certain bacteria, not viruses</button>
            </div>
          )}
        </>
      );
    }
    if (stage === 5) {
      return (
        <div className={styles.choiceGrid} aria-label="Order the viral replication cycle">
          {SHUFFLED_REPLICATION.map(label => (
            <button key={label} className={styles.choice} data-selected={cycleSequence.includes(label)} disabled={cycleSequence.includes(label)} onClick={() => placeCycleStep(label)}>
              {cycleSequence.includes(label) ? `${cycleSequence.indexOf(label) + 1}. ✓ ` : "○ "}{label}
            </button>
          ))}
        </div>
      );
    }
    if (stage === 6) {
      return (
        <>
          <div className={styles.matchHeading}>1 · Select a transmission risk</div>
          <div className={styles.choiceGrid} aria-label="Transmission risks">
            {CHAIN_RISKS.map(risk => (
              <button key={risk.id} className={styles.choice} data-selected={selectedRisk === risk.id || chainMatches.includes(risk.id)} disabled={chainMatches.includes(risk.id)} onClick={() => setSelectedRisk(risk.id)}>
                {chainMatches.includes(risk.id) ? "✓" : selectedRisk === risk.id ? "→" : "●"} {risk.label}
              </button>
            ))}
          </div>
          <div className={styles.matchHeading}>2 · Choose its preventive action</div>
          <div className={styles.choiceGrid} aria-label="Preventive actions">
            {PREVENTION_OPTIONS.map(([id, label]) => (
              <button key={id} className={styles.choice} disabled={!selectedRisk} onClick={() => matchPrevention(id)}>{label}</button>
            ))}
          </div>
        </>
      );
    }
    return null;
  };

  const completionPercent = ((stage + (completed[stage] ? 1 : 0)) / STAGES.length) * 100;

  return (
    <main className={styles.root} data-virus-stage={STAGES[stage].id}>
      <div ref={mountRef} className={styles.canvas} data-testid="simulation-canvas" aria-label="Interactive Invisible Invader virology laboratory" />

      {!started && (
        <section className={styles.launch}>
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>Class 8 · Science · Chapter 2 · Activity 2</div>
            <h1 className={styles.launchTitle}>The Invisible Invader</h1>
            <p className={styles.launchCopy}>
              Shrink into an empty 360° virology laboratory, enter a living host-cell model and stop five transmission routes before the viral chain reaches a new host.
            </p>
            <div className={styles.launchFacts}>
              <span>5-minute guided mission</span>
              <span>No characters · science models only</span>
              <span>Neutral Indian English narration</span>
              <span>Browser + Meta Quest</span>
            </div>
            <div className={styles.launchActions}>
              <button data-testid="simulation-launch" className={styles.primary} onClick={startBrowser}>Begin laboratory mission</button>
              {vrSupported && <button className={styles.secondary} onClick={enterVR}>Enter immersive VR</button>}
            </div>
          </div>
        </section>
      )}

      {started && (
        <div className={styles.hud}>
          <header className={styles.topbar}>
            <div className={styles.missionName}>
              <strong>Virus Shield</strong><span>{formatClock(elapsedSeconds)} / 05:00</span>
            </div>
            <div className={styles.topActions}>
              <button data-testid="narration-replay" className={styles.iconButton} onClick={() => speakStage(stage)}>🔊 <span>Replay</span></button>
              <button data-testid="restart" className={styles.iconButton} onClick={restart}>↻ <span>Restart</span></button>
              {vrSupported && <button className={styles.iconButton} onClick={enterVR}>🥽 <span>VR</span></button>}
            </div>
          </header>

          <aside className={styles.panel} aria-label="Invisible Invader lesson panel">
            <div className={styles.panelProgress}><span style={{ width: `${completionPercent}%` }} /></div>
            <div className={styles.panelScroll}>
              <div className={styles.stageEyebrow}>Mission {stage + 1} of {STAGES.length}</div>
              <h2 data-testid="stage-title" className={styles.stageTitle}>{STAGES[stage].title}</h2>
              <p data-testid="stage-cue" className={styles.cue}>{STAGES[stage].cue}</p>
              <p className={styles.detail}>{STAGES[stage].detail}</p>
              {feedback && <p role="status" className={styles.feedback}>{feedback}</p>}
              {renderStageControls()}
              {completed[6] && (
                <div className={styles.complete}>
                  <div>🛡️</div>
                  <strong>Virus Shield Activated</strong>
                  <span>Viruses need living host cells to reproduce. Understand the spread. Protect health. Break the chain.</span>
                </div>
              )}
              <button data-testid="primary-action" className={`${styles.primary} ${styles.primaryAction}`} onClick={performPrimary}>
                {actionLabel}
              </button>
              <div className={styles.badges} aria-label="Scientific evidence badges">
                <span data-earned={completed[1]}>◉ Structure</span>
                <span data-earned={completed[2]}>◉ Replication</span>
                <span data-earned={completed[3]}>◉ Transmission</span>
                <span data-earned={completed[6]}>◉ Prevention</span>
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
