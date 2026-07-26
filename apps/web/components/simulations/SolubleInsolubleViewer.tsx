"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

type Prediction = "soluble" | "insoluble";
type Behaviour = "dissolve" | "settle" | "cloud" | "float";

const TRIALS: {
  name: string;
  colour: number;
  prediction: Prediction;
  behaviour: Behaviour;
  clue: string;
  observation: string;
}[] = [
  {
    name: "Salt",
    colour: 0xf8fafc,
    prediction: "soluble",
    behaviour: "dissolve",
    clue: "Small white crystals that seem to disappear after stirring.",
    observation: "Salt is soluble. Its particles spread throughout the water and remain present in an invisible solution.",
  },
  {
    name: "Sugar",
    colour: 0xf5e2b8,
    prediction: "soluble",
    behaviour: "dissolve",
    clue: "Pale crystals that form a clear mixture after enough stirring.",
    observation: "Sugar is soluble. It dissolves into particles too small to see, producing a clear sugar solution.",
  },
  {
    name: "Sand",
    colour: 0xc2955b,
    prediction: "insoluble",
    behaviour: "settle",
    clue: "Coarse mineral grains that remain visible in water.",
    observation: "Sand is insoluble. Stirring spreads the grains briefly, but they settle at the bottom when the water becomes still.",
  },
  {
    name: "Chalk powder",
    colour: 0xe5e7eb,
    prediction: "insoluble",
    behaviour: "cloud",
    clue: "Fine white powder that makes the water cloudy.",
    observation: "Chalk powder is insoluble. Fine particles remain suspended for a while and then gradually settle.",
  },
  {
    name: "Sawdust",
    colour: 0x9a6337,
    prediction: "insoluble",
    behaviour: "float",
    clue: "Light wood particles that do not disappear when stirred.",
    observation: "Sawdust is insoluble. Many pieces rise and float because they are less dense than water and may trap air.",
  },
];

const STAGES = [
  {
    title: "Plan a Fair Test",
    cue: "Use equal amounts of water and sample, stir each for the same time, then wait and observe.",
    action: "Begin with salt",
  },
  ...TRIALS.map((trial) => ({
    title: `Test ${trial.name}`,
    cue: trial.clue,
    action: "Stir and observe",
  })),
  {
    title: "Classify the Substances",
    cue: "Salt and sugar formed solutions. Sand, chalk powder and sawdust remained as visible particles.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 7, Experiments with Water, Activity 3, Soluble and Insoluble Substances. We will test salt, sugar, sand, chalk powder and sawdust. For a fair comparison, use the same amount of water and sample, stir for the same time, then wait and observe.",
  "First observe the salt crystals. Predict whether salt is soluble or insoluble in water. Select your prediction, then press A or select Stir and Observe.",
  "Now observe the sugar crystals. Predict whether sugar is soluble or insoluble, then stir the sample in water.",
  "Observe the coarse sand grains. Predict whether sand will dissolve or remain visible, then stir and wait.",
  "Observe the fine chalk powder. Predict whether it is soluble or insoluble. Watch carefully because fine insoluble particles may make the water cloudy before settling.",
  "Finally, observe the light sawdust particles. Predict whether sawdust is soluble or insoluble, then stir and watch the surface as well as the bottom.",
  "Excellent investigation. Salt and sugar were soluble and formed clear solutions. Sand, chalk powder and sawdust were insoluble. Insoluble substances do not all behave identically: sand settles quickly, fine chalk remains suspended before settling, and much of the sawdust floats.",
  "Salt is soluble. Its crystals separate into particles too small to see and spread throughout the water. The salt has not vanished; it is present in the solution.",
  "Sugar is soluble. Its crystals dissolve and spread through the water, producing a clear sugar solution.",
  "Sand is insoluble. Stirring spreads the grains briefly, but they remain visible and settle at the bottom when the water becomes still.",
  "Chalk powder is insoluble. Its fine particles make the water cloudy, remain suspended for a while, and gradually settle.",
  "Sawdust is insoluble. The wood particles remain visible, and many float because they are less dense than water and can trap air.",
];

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  let line = "";
  let currentY = y;
  for (const word of text.split(" ")) {
    const candidate = `${line}${word} `;
    if (line && context.measureText(candidate).width > width) {
      context.fillText(line.trim(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else line = candidate;
  }
  if (line) context.fillText(line.trim(), x, currentY);
}

function drawCard(
  canvas: HTMLCanvasElement,
  stage: number,
  prediction: Prediction | null,
  tested: boolean,
  feedback: string,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#12342f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#5eead4";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#99f6e4";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 3  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#ccfbf1";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 27);
  context.fillStyle = tested ? "#86efac" : prediction ? "#fde68a" : "#a7f3d0";
  context.font = "bold 19px sans-serif";
  const status = feedback || (prediction ? `Prediction: ${prediction.toUpperCase()} • Now stir` : stage > 0 && stage <= TRIALS.length ? "Choose SOLUBLE or INSOLUBLE" : STAGES[stage].action);
  context.fillText(status, 24, 245);
}

function makeSampleTray(trial: (typeof TRIALS)[number], index: number) {
  const group = new THREE.Group();
  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.34, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.45, roughness: 0.36 }),
  );
  group.add(tray);
  for (let grainIndex = 0; grainIndex < 18; grainIndex++) {
    const grain = new THREE.Mesh(
      trial.behaviour === "float"
        ? new THREE.BoxGeometry(0.055, 0.025, 0.11)
        : new THREE.OctahedronGeometry(0.025 + (grainIndex % 3) * 0.007, 0),
      new THREE.MeshStandardMaterial({ color: trial.colour, roughness: 0.82 }),
    );
    const angle = (grainIndex / 18) * Math.PI * 2;
    grain.position.set(Math.cos(angle) * (0.08 + (grainIndex % 3) * 0.045), 0.07, Math.sin(angle) * (0.08 + (grainIndex % 3) * 0.045));
    grain.rotation.set(grainIndex * 0.21, grainIndex * 0.34, grainIndex * 0.13);
    group.add(grain);
  }
  group.position.set(-2.15 + index * 1.08, 0.65, 0.86);
  return group;
}

export default function SolubleInsolubleViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const predictionRef = useRef<Prediction | null>(null);
  const testedRef = useRef(false);
  const trialStartRef = useRef(0);
  const feedbackRef = useRef("");
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [tested, setTested] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr
        ?.isSessionSupported?.("immersive-vr")
        .then(setVrSupported)
        .catch(() => setVrSupported(false));
    }
  }, []);

  const setFeedbackState = useCallback((value: string) => {
    feedbackRef.current = value;
    setFeedback(value);
    cardNeedsUpdateRef.current = true;
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    predictionRef.current = null;
    testedRef.current = false;
    trialStartRef.current = performance.now() / 1000;
    feedbackRef.current = "";
    setStage(safeStage);
    setPrediction(null);
    setTested(false);
    setFeedback("");
    cardNeedsUpdateRef.current = true;
    playNarration(NARRATIONS[safeStage]);
  }, []);

  const choosePrediction = useCallback((choice: Prediction) => {
    if (stageRef.current < 1 || stageRef.current > TRIALS.length || testedRef.current) return;
    predictionRef.current = choice;
    setPrediction(choice);
    setFeedbackState(`Prediction: ${choice.toUpperCase()} • Ready to stir`);
  }, [setFeedbackState]);

  const performAction = useCallback(() => {
    const currentStage = stageRef.current;
    if (currentStage === 0) {
      goToStage(1);
      return;
    }
    if (currentStage > TRIALS.length) return;
    if (testedRef.current) {
      goToStage(currentStage + 1);
      return;
    }
    if (!predictionRef.current) {
      setFeedbackState("Choose SOLUBLE or INSOLUBLE first");
      return;
    }
    const trialIndex = currentStage - 1;
    const trial = TRIALS[trialIndex];
    testedRef.current = true;
    trialStartRef.current = performance.now() / 1000;
    setTested(true);
    const correct = predictionRef.current === trial.prediction;
    setFeedbackState(`${correct ? "Correct!" : "Good test!"} ${trial.prediction.toUpperCase()}.`);
    playNarration(NARRATIONS[7 + trialIndex]);
  }, [goToStage, setFeedbackState]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xb5d4cf, 18, 38);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/float-sink-school-lab-360.png",
      { exposure: 0.98, intensity: 0.42 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 72);
    camera.position.set(0, 2.05, 5.25);
    camera.lookAt(0, 1.12, 0);
    scene.add(new THREE.HemisphereLight(0xe7fffb, 0x38534d, 1.75));
    const daylight = new THREE.DirectionalLight(0xffffff, 2.05);
    daylight.position.set(-4, 7, 4);
    daylight.castShadow = true;
    scene.add(daylight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x617773, roughness: 0.9, transparent: true, opacity: 0.7 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.18, 2.45),
      new THREE.MeshStandardMaterial({ color: 0x5d442f, roughness: 0.84 }),
    );
    table.position.y = 0.53;
    table.receiveShadow = true;
    scene.add(table);

    const beaker = new THREE.Group();
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.74, 1.05, 40),
      new THREE.MeshPhysicalMaterial({ color: 0x25a9d6, transparent: true, opacity: 0.42, transmission: 0.24, roughness: 0.08, depthWrite: false }),
    );
    water.position.y = 1.18;
    beaker.add(water);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.75, 1.48, 40, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xe6fffb, transparent: true, opacity: 0.22, transmission: 0.58, roughness: 0.06, side: THREE.DoubleSide }),
    );
    wall.position.y = 1.22;
    const bottom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 0.055, 40),
      new THREE.MeshPhysicalMaterial({ color: 0xe6fffb, transparent: true, opacity: 0.32, transmission: 0.4 }),
    );
    bottom.position.y = 0.49;
    beaker.add(wall, bottom);
    scene.add(beaker);

    const stirrer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.75, 10),
      new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2, metalness: 0.05 }),
    );
    stirrer.position.set(0.32, 1.62, 0);
    stirrer.rotation.z = 0.14;
    scene.add(stirrer);

    const sampleTrays = TRIALS.map((trial, index) => {
      const tray = makeSampleTray(trial, index);
      scene.add(tray);
      return tray;
    });

    const particles: THREE.Mesh[] = [];
    for (let index = 0; index < 72; index++) {
      const particle = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.025 + (index % 3) * 0.007, 0),
        new THREE.MeshStandardMaterial({ color: TRIALS[0].colour, roughness: 0.8, transparent: true, opacity: 0.9 }),
      );
      particle.userData.offset = index / 72;
      particle.visible = false;
      scene.add(particle);
      particles.push(particle);
    }

    const cloud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.71, 0.71, 0.92, 36),
      new THREE.MeshBasicMaterial({ color: 0xe5e7eb, transparent: true, opacity: 0, depthWrite: false }),
    );
    cloud.position.y = 1.14;
    scene.add(cloud);

    const solutionDots: THREE.Mesh[] = [];
    for (let index = 0; index < 46; index++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.32 }),
      );
      dot.position.set(
        -0.58 + ((index * 0.37) % 1.16),
        0.68 + ((index * 0.19) % 0.88),
        -0.52 + ((index * 0.23) % 1.04),
      );
      dot.visible = false;
      scene.add(dot);
      solutionDots.push(dot);
    }

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 1.11), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.42, 2.78, -1.95);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number, width = 0.68) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.12, -1.58);
      scene.add(button);
      return button;
    };
    const solubleButton = makeButton("btn-soluble", 0x16a34a, -1.0, 0.78);
    const testButton = makeButton("btn-test", 0x0d9488, 0, 0.72);
    const insolubleButton = makeButton("btn-insoluble", 0xea580c, 1.0, 0.88);
    const interactables = [solubleButton, testButton, insolubleButton];
    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-soluble") choosePrediction("soluble");
      else if (hit.object.name === "btn-insoluble") choosePrediction("insoluble");
      else performAction();
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0x5eead4 }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: performAction,
      onBack: () => goToStage(stageRef.current - 1),
      onNarrate: () => playNarration(NARRATIONS[stageRef.current]),
      startPosition: new THREE.Vector3(0, 0, 2.55),
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.12, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.8;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const currentStage = stageRef.current;
      const trialIndex = currentStage - 1;
      const trialAge = Math.max(0, performance.now() / 1000 - trialStartRef.current);
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage, predictionRef.current, testedRef.current, feedbackRef.current);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      sampleTrays.forEach((tray, index) => {
        tray.visible = currentStage === 0 || currentStage === STAGES.length - 1 || index === trialIndex;
        tray.scale.setScalar(index === trialIndex ? 1.2 : 0.82);
      });
      const trial = trialIndex >= 0 && trialIndex < TRIALS.length ? TRIALS[trialIndex] : null;
      particles.forEach((particle, index) => {
        particle.visible = Boolean(trial && testedRef.current);
        if (!trial || !particle.visible) return;
        const material = particle.material as THREE.MeshStandardMaterial;
        material.color.setHex(trial.colour);
        material.opacity = 0.9;
        particle.scale.setScalar(1);
        const offset = particle.userData.offset as number;
        const fall = Math.min(1, trialAge * 0.72 + offset * 0.25);
        const x = -0.57 + ((index * 0.37) % 1.14);
        const z = -0.5 + ((index * 0.23) % 1.0);
        if (trial.behaviour === "dissolve") {
          particle.position.set(x, 2.35 - fall * 1.3, z);
          const dissolve = Math.max(0, trialAge - 0.7 - offset * 0.45);
          particle.scale.setScalar(Math.max(0.05, 1 - dissolve * 1.25));
          material.opacity = Math.max(0, 0.9 - dissolve);
        } else if (trial.behaviour === "settle") {
          particle.position.set(x, THREE.MathUtils.lerp(2.25, 0.56 + (index % 4) * 0.018, Math.min(1, trialAge * 0.72 + offset * 0.18)), z);
        } else if (trial.behaviour === "cloud") {
          const cloudTime = Math.min(1, trialAge * 0.85);
          const settleTime = Math.max(0, trialAge - 1.8);
          particle.position.set(
            x * (0.7 + cloudTime * 0.3),
            THREE.MathUtils.lerp(2.25, 0.72 + ((index * 0.19) % 0.84), cloudTime) - settleTime * (0.035 + (index % 3) * 0.008),
            z,
          );
          particle.position.y = Math.max(0.58 + (index % 3) * 0.012, particle.position.y);
          particle.scale.setScalar(0.58);
        } else {
          particle.position.set(x, THREE.MathUtils.lerp(2.25, 1.68 + Math.sin(elapsed * 1.5 + index) * 0.012, Math.min(1, trialAge * 0.85 + offset * 0.15)), z);
          particle.scale.set(1.4, 0.55, 1.1);
        }
      });
      stirrer.visible = currentStage > 0 && currentStage <= TRIALS.length;
      if (testedRef.current && trialAge < 2.4) {
        stirrer.position.x = Math.sin(elapsed * 7) * 0.36;
        stirrer.position.z = Math.cos(elapsed * 7) * 0.26;
        stirrer.rotation.z = 0.14 + Math.sin(elapsed * 7) * 0.08;
      } else {
        stirrer.position.x = 0.32;
        stirrer.position.z = 0;
      }
      const isChalk = trial?.behaviour === "cloud" && testedRef.current;
      (cloud.material as THREE.MeshBasicMaterial).opacity = isChalk ? Math.max(0.08, Math.min(0.28, trialAge * 0.18) - Math.max(0, trialAge - 2.6) * 0.035) : 0;
      solutionDots.forEach((dot, index) => {
        dot.visible = Boolean(trial?.behaviour === "dissolve" && testedRef.current && trialAge > 1.0);
        if (dot.visible) {
          (dot.material as THREE.MeshBasicMaterial).color.setHex(trial?.colour ?? 0xfef3c7);
          dot.position.y += Math.sin(elapsed * 1.3 + index) * 0.0006;
        }
      });
      const showTrialButtons = currentStage > 0 && currentStage <= TRIALS.length;
      solubleButton.visible = showTrialButtons && !testedRef.current;
      insolubleButton.visible = showTrialButtons && !testedRef.current;
      testButton.visible = currentStage < STAGES.length - 1;
      const testMaterial = testButton.material as THREE.MeshStandardMaterial;
      testMaterial.color.setHex(testedRef.current ? 0x16a34a : 0x0d9488);
      testMaterial.emissive.setHex(testedRef.current ? 0x16a34a : 0x0d9488);
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0, null, false, "");
    cardTexture.needsUpdate = true;
    trialStartRef.current = performance.now() / 1000;

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);
    return () => {
      renderer.setAnimationLoop(null);
      controllers.forEach((controller) => controller.removeEventListener("selectstart", onControllerSelect as any));
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [choosePrediction, goToStage, performAction]);

  const enterVR = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> } }).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      window.setTimeout(() => playNarration(NARRATIONS[stageRef.current]), 900);
    } catch {
      setVrSupported(false);
    }
  }, []);

  const currentTrial = stage > 0 && stage <= TRIALS.length ? TRIALS[stage - 1] : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#12342f" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #0f766e 0%, #12342f 76%)" }}>
          <div style={{ maxWidth: 660, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🧂🥄💧</div>
            <div style={{ margin: "14px 0 10px", color: "#5eead4", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 7 • Activity 3
            </div>
            <h1 style={{ color: "#f0fdfa", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              Soluble and Insoluble Substances
            </h1>
            <p style={{ color: "#ccfbf1", lineHeight: 1.7 }}>
              Predict, stir and observe five substances. Distinguish dissolving from settling, suspension and floating.
            </p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
              <button onClick={() => { setStarted(true); playNarration(NARRATIONS[0]); }} style={secondaryButtonStyle}>💻 View in Browser</button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <>
          <aside style={{ position: "absolute", top: 70, right: 16, width: 365, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(18,52,47,0.95)", border: "1px solid rgba(94,234,212,0.42)", color: "#f0fdfa", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#5eead4", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 3 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            {currentTrial && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => choosePrediction("soluble")} disabled={tested} style={{ ...predictionButtonStyle, background: prediction === "soluble" ? "#15803d" : "rgba(34,197,94,0.16)" }}>
                    SOLUBLE
                  </button>
                  <button onClick={() => choosePrediction("insoluble")} disabled={tested} style={{ ...predictionButtonStyle, background: prediction === "insoluble" ? "#c2410c" : "rgba(249,115,22,0.16)" }}>
                    INSOLUBLE
                  </button>
                </div>
                <button onClick={performAction} disabled={!prediction && !tested} style={{ ...primaryButtonStyle, opacity: !prediction && !tested ? 0.55 : 1 }}>
                  {tested ? "Next substance →" : "🥄 Stir and observe"}
                </button>
                {feedback && (
                  <div role="status" style={{ marginTop: 11, padding: 11, borderRadius: 9, color: tested ? "#bbf7d0" : "#fde68a", background: "rgba(255,255,255,0.07)", lineHeight: 1.5 }}>
                    <strong>{feedback}</strong>
                    {tested && <div style={{ marginTop: 5, fontSize: "0.82rem" }}>{currentTrial.observation}</div>}
                  </div>
                )}
              </>
            )}
            {!currentTrial && stage < STAGES.length - 1 && <button onClick={performAction} style={primaryButtonStyle}>{STAGES[stage].action}</button>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
            </div>
            <button onClick={() => playNarration(tested && currentTrial ? NARRATIONS[7 + stage - 1] : NARRATIONS[stage])} style={secondaryButtonStyle}>🔊 Replay narration</button>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#ccfbf1", fontSize: "0.75rem" }}>
            Quest: trigger selects • A stirs/advances • B/right grip exits VR • Y goes back • joysticks move and turn
          </div>
        </>
      )}
    </div>
  );
}

const primaryButtonStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg, #0d9488, #0f766e)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 9,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(94,234,212,0.42)",
  background: "rgba(94,234,212,0.1)",
  color: "#ccfbf1",
} as const;

const predictionButtonStyle = {
  padding: "11px 8px",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.16)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#ccfbf1",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ccfbf1",
  cursor: "pointer",
} as const;
