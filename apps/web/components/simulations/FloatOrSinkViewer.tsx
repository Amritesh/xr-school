"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";
import { createScreenSafePanelFollower, drawFittedText } from "@/lib/vr/screenSafeTextPanel";

type Outcome = "float" | "sink";

const TRIALS: {
  name: string;
  material: string;
  outcome: Outcome;
  clue: string;
  explanation: string;
}[] = [
  {
    name: "Dry leaf",
    material: "plant material",
    outcome: "float",
    clue: "It is light, broad and rests gently on the surface.",
    explanation: "The dry leaf floats because its broad shape and low average density let the water support it.",
  },
  {
    name: "Stone",
    material: "rock",
    outcome: "sink",
    clue: "It feels compact and heavy for its size.",
    explanation: "The stone sinks because it is denser than water, so its weight is greater than the upward support from the displaced water.",
  },
  {
    name: "Cork",
    material: "cork",
    outcome: "float",
    clue: "Its material contains many tiny air spaces.",
    explanation: "The cork floats because its many air spaces make its average density lower than water.",
  },
  {
    name: "Steel spoon",
    material: "steel",
    outcome: "sink",
    clue: "It is solid metal and displaces only a small amount of water.",
    explanation: "The solid steel spoon sinks because its average density is greater than water.",
  },
  {
    name: "Closed empty bottle",
    material: "plastic and trapped air",
    outcome: "float",
    clue: "Its cap is closed, trapping a large volume of air inside.",
    explanation: "The closed empty bottle floats because the trapped air lowers the average density of the bottle and its contents.",
  },
  {
    name: "Glass marble",
    material: "solid glass",
    outcome: "sink",
    clue: "It is small but compact, with no trapped air.",
    explanation: "The solid glass marble sinks because glass is denser than water.",
  },
];

const STAGES = [
  {
    title: "Make a Prediction",
    cue: "Objects do not float or sink simply because they are big or small. Observe, predict, and then test each one.",
    action: "Start the first trial",
  },
  ...TRIALS.map((trial) => ({
    title: `Test the ${trial.name}`,
    cue: `${trial.material} • ${trial.clue}`,
    action: "Test in water",
  })),
  {
    title: "What Did We Discover?",
    cue: "Floating depends on the balance between an object's weight and the upward push from the water it displaces.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 7, Experiments with Water, Activity 1, What Floats, What Sinks? You will predict what happens to six familiar objects, test each one in water, and compare your prediction with the observation. Never decide only from size. Material, shape and trapped air can all matter.",
  "First, observe the dry leaf. It is made from plant material. It is light and broad, and it can rest gently on the surface. Predict whether it will float or sink. Point to a prediction button, select it, and then press A or select Test in Water.",
  "Now observe the stone. It is compact and feels heavy for its size. Predict whether it will float or sink, then test your prediction.",
  "Observe the cork. Its material contains many tiny air spaces. Predict what will happen when it is placed in water, then test it.",
  "Observe the steel spoon. It is solid metal and displaces only a small amount of water. Predict whether it will float or sink, then test it.",
  "Observe the closed empty plastic bottle. Its cap traps a large volume of air. Predict what will happen, then test the bottle in water.",
  "Finally, observe the solid glass marble. It is small but compact and contains no trapped air. Predict whether it will float or sink, then test it.",
  "Excellent experimenting. The leaf, cork and closed empty bottle floated. The stone, steel spoon and glass marble sank. Size alone did not decide the result. An object floats when the upward push from displaced water can balance its weight; material, shape and trapped air affect that balance.",
  "The dry leaf floats. Its broad shape and low average density let the water support it at the surface.",
  "The stone sinks. Rock is denser than water, so the stone's weight is greater than the upward support from the water it displaces.",
  "The cork floats. Tiny air spaces inside the cork make its average density lower than water.",
  "The solid steel spoon sinks. Its average density is greater than water, and its shape does not enclose enough air to help it float.",
  "The closed empty bottle floats. Trapped air lowers the average density of the bottle and its contents, while the bottle displaces a useful volume of water.",
  "The solid glass marble sinks. Glass is denser than water, and the marble contains no trapped air.",
];

function drawCard(
  canvas: HTMLCanvasElement,
  stage: number,
  prediction: Outcome | null,
  tested: boolean,
  feedback: string,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#082f49";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#38bdf8";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#7dd3fc";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 1  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  drawFittedText(context, STAGES[stage].title, {
    x: 24, y: 54, width: canvas.width - 48, height: 48,
    color: "#ffffff", fontWeight: 800, maxFontSize: 30, minFontSize: 21,
    maxLines: 2, verticalAlign: "middle",
  });
  drawFittedText(context, STAGES[stage].cue, {
    x: 24, y: 111, width: canvas.width - 48, height: 88,
    color: "#e0f2fe", maxFontSize: 20, minFontSize: 15, maxLines: 4,
  });
  const status = feedback || (prediction ? `Prediction: ${prediction.toUpperCase()} • Now test it` : stage > 0 && stage < 7 ? "Choose FLOAT or SINK, then test" : STAGES[stage].action);
  drawFittedText(context, status, {
    x: 24, y: 211, width: canvas.width - 48, height: 45,
    color: tested ? "#86efac" : prediction ? "#fde68a" : "#bae6fd",
    fontWeight: 800, maxFontSize: 19, minFontSize: 13, maxLines: 2,
    verticalAlign: "middle",
  });
}

function makeTrialObject(index: number) {
  const group = new THREE.Group();
  group.name = `trial-object-${index}`;
  if (index === 0) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.34, 0);
    shape.quadraticCurveTo(-0.08, 0.26, 0.36, 0.02);
    shape.quadraticCurveTo(0.08, -0.23, -0.34, 0);
    const leaf = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 10),
      new THREE.MeshStandardMaterial({ color: 0x6f8f3d, roughness: 0.92, side: THREE.DoubleSide }),
    );
    leaf.rotation.x = -Math.PI / 2;
    const vein = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6),
      new THREE.MeshStandardMaterial({ color: 0x435d28, roughness: 1 }),
    );
    vein.rotation.z = Math.PI / 2;
    vein.rotation.x = Math.PI / 2;
    group.add(leaf, vein);
  } else if (index === 1) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3, 1),
      new THREE.MeshStandardMaterial({ color: 0x6b6d69, roughness: 0.97 }),
    );
    stone.scale.set(1.18, 0.78, 0.92);
    group.add(stone);
  } else if (index === 2) {
    const cork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.19, 0.5, 18),
      new THREE.MeshStandardMaterial({ color: 0xb77b43, roughness: 1, bumpScale: 0.08 }),
    );
    cork.rotation.z = Math.PI / 2;
    group.add(cork);
  } else if (index === 3) {
    const metal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.88 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.66, 0.055), metal);
    handle.position.y = 0.17;
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    bowl.scale.set(0.82, 1, 0.38);
    bowl.position.y = -0.25;
    bowl.rotation.x = Math.PI;
    group.add(handle, bowl);
    group.rotation.z = -0.35;
  } else if (index === 4) {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.23, 0.72, 22),
      new THREE.MeshPhysicalMaterial({ color: 0xcffafe, transparent: true, opacity: 0.52, roughness: 0.18, transmission: 0.18 }),
    );
    const shoulder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.2, 0.18, 22),
      new THREE.MeshPhysicalMaterial({ color: 0xcffafe, transparent: true, opacity: 0.52, roughness: 0.18 }),
    );
    shoulder.position.y = 0.45;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.1, 20),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.42 }),
    );
    cap.position.y = 0.59;
    group.add(body, shoulder, cap);
    group.rotation.z = Math.PI / 2;
  } else {
    const marble = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 28, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.08, transmission: 0.15, clearcoat: 1 }),
    );
    const swirl = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.018, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }),
    );
    swirl.rotation.x = Math.PI / 2;
    group.add(marble, swirl);
  }
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

export default function FloatOrSinkViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const predictionRef = useRef<Outcome | null>(null);
  const testedRef = useRef(false);
  const trialStartRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const objectsRef = useRef<THREE.Group[]>([]);
  const rippleRef = useRef<THREE.Mesh[]>([]);
  const bubblesRef = useRef<THREE.Mesh[]>([]);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [prediction, setPrediction] = useState<Outcome | null>(null);
  const [tested, setTested] = useState(false);
  const [feedback, setFeedback] = useState("");
  const feedbackRef = useRef("");

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
    setStage(safeStage);
    setPrediction(null);
    setTested(false);
    feedbackRef.current = "";
    setFeedback("");
    cardNeedsUpdateRef.current = true;
    playNarration(NARRATIONS[safeStage]);
  }, []);

  const choosePrediction = useCallback((choice: Outcome) => {
    if (stageRef.current < 1 || stageRef.current > TRIALS.length || testedRef.current) return;
    predictionRef.current = choice;
    setPrediction(choice);
    setFeedbackState(`Prediction: ${choice.toUpperCase()} • Ready to test`);
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
      setFeedbackState("Choose FLOAT or SINK first");
      return;
    }
    const trialIndex = currentStage - 1;
    const trial = TRIALS[trialIndex];
    testedRef.current = true;
    trialStartRef.current = performance.now() / 1000;
    setTested(true);
    const correct = predictionRef.current === trial.outcome;
    setFeedbackState(`${correct ? "Correct!" : "Good test!"} It ${trial.outcome}s.`);
    playNarration(NARRATIONS[8 + trialIndex]);
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
    scene.fog = new THREE.Fog(0xa9c6d3, 18, 36);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/float-sink-school-lab-360.png",
      { exposure: 0.98, intensity: 0.42 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 70);
    camera.position.set(0, 2.05, 5.2);
    camera.lookAt(0, 1.05, 0);
    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.75));
    const daylight = new THREE.DirectionalLight(0xffffff, 2.1);
    daylight.position.set(-4, 7, 4);
    daylight.castShadow = true;
    scene.add(daylight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, transparent: true, opacity: 0.72 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.18, 2.45),
      new THREE.MeshStandardMaterial({ color: 0x60432e, roughness: 0.82 }),
    );
    table.position.set(0, 0.58, 0);
    table.receiveShadow = true;
    table.castShadow = true;
    scene.add(table);
    for (const x of [-1.75, 1.75]) {
      for (const z of [-0.82, 0.82]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 1.08, 0.18),
          new THREE.MeshStandardMaterial({ color: 0x49301f, roughness: 0.9 }),
        );
        leg.position.set(x, 0.02, z);
        leg.castShadow = true;
        scene.add(leg);
      }
    }

    const tank = new THREE.Group();
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(2.75, 0.95, 1.42),
      new THREE.MeshPhysicalMaterial({
        color: 0x28a9d6,
        transparent: true,
        opacity: 0.48,
        roughness: 0.08,
        transmission: 0.24,
        depthWrite: false,
      }),
    );
    water.position.y = 1.17;
    tank.add(water);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdaf6ff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      transmission: 0.55,
      side: THREE.DoubleSide,
    });
    const front = new THREE.Mesh(new THREE.BoxGeometry(2.92, 1.35, 0.045), glassMaterial);
    front.position.set(0, 1.22, 0.74);
    const back = front.clone();
    back.position.z = -0.74;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.35, 1.52), glassMaterial);
    left.position.set(-1.46, 1.22, 0);
    const right = left.clone();
    right.position.x = 1.46;
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.055, 1.52), glassMaterial);
    bottom.position.y = 0.55;
    tank.add(front, back, left, right, bottom);
    scene.add(tank);

    const objects = TRIALS.map((_, index) => {
      const object = makeTrialObject(index);
      object.position.set(0, 2.22, 0);
      object.visible = false;
      scene.add(object);
      return object;
    });
    objectsRef.current = objects;

    const ripples: THREE.Mesh[] = [];
    for (let index = 0; index < 3; index++) {
      const ripple = new THREE.Mesh(
        new THREE.TorusGeometry(0.2 + index * 0.13, 0.012, 8, 36),
        new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.75 }),
      );
      ripple.rotation.x = Math.PI / 2;
      ripple.position.y = 1.66;
      ripple.visible = false;
      scene.add(ripple);
      ripples.push(ripple);
    }
    rippleRef.current = ripples;

    const bubbles: THREE.Mesh[] = [];
    for (let index = 0; index < 14; index++) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + (index % 3) * 0.009, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.72 }),
      );
      bubble.userData.offset = index / 14;
      bubble.visible = false;
      scene.add(bubble);
      bubbles.push(bubble);
    }
    bubblesRef.current = bubbles;

    const resultPlatforms = [
      { label: "FLOATS", x: -2.25, color: 0x22c55e },
      { label: "SINKS", x: 2.25, color: 0xf97316 },
    ];
    resultPlatforms.forEach(({ label, x, color }) => {
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.62, 0.18, 28),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.14, roughness: 0.55 }),
      );
      stand.position.set(x, 0.78, -0.05);
      stand.userData.label = label;
      scene.add(stand);
    });

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 1.11), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.38, 2.72, -1.92);
    scene.add(card);
    const cardFollower = createScreenSafePanelFollower(card, {
      panelWidth: 2.85,
      panelHeight: 1.11,
    });

    const makeButton = (name: string, color: number, x: number, width = 0.66) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.15, -1.58);
      scene.add(button);
      return button;
    };
    const floatButton = makeButton("btn-float", 0x16a34a, -0.9);
    const testButton = makeButton("btn-test", 0x0284c7, 0, 0.78);
    const sinkButton = makeButton("btn-sink", 0xea580c, 0.9);
    const interactables = [floatButton, testButton, sinkButton];
    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-float") choosePrediction("float");
      else if (hit.object.name === "btn-sink") choosePrediction("sink");
      else performAction();
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
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
    controls.target.set(0, 1.18, 0);
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
      objects.forEach((object, index) => {
        const isCurrent = index === trialIndex;
        object.visible = isCurrent;
        if (!isCurrent) return;
        object.rotation.y += 0.006;
        if (!testedRef.current) {
          object.position.set(0, 2.17 + Math.sin(elapsed * 1.7) * 0.035, 0);
          object.rotation.z += 0.002;
        } else {
          const targetY = TRIALS[index].outcome === "float" ? 1.67 : 0.72;
          const progress = 1 - Math.exp(-trialAge * 2.4);
          object.position.y = THREE.MathUtils.lerp(2.17, targetY, progress);
          if (TRIALS[index].outcome === "float" && progress > 0.86) {
            object.position.y += Math.sin(elapsed * 2.2) * 0.025;
            object.rotation.z = Math.sin(elapsed * 1.4) * 0.08;
          }
        }
      });
      ripples.forEach((ripple, index) => {
        const show = trialIndex >= 0 && trialIndex < TRIALS.length && testedRef.current && trialAge > 0.2;
        ripple.visible = show;
        if (show) {
          const wave = (trialAge * 0.65 + index * 0.25) % 1;
          ripple.scale.setScalar(0.35 + wave * 1.8);
          (ripple.material as THREE.MeshBasicMaterial).opacity = (1 - wave) * 0.7;
        }
      });
      bubbles.forEach((bubble, index) => {
        const sinking = trialIndex >= 0 && trialIndex < TRIALS.length && testedRef.current && TRIALS[trialIndex].outcome === "sink";
        bubble.visible = sinking && trialAge < 3.3;
        if (bubble.visible) {
          const progress = (trialAge * 0.55 + (bubble.userData.offset as number)) % 1;
          bubble.position.set(
            Math.sin(index * 2.1) * 0.18,
            0.72 + progress * 0.88,
            Math.cos(index * 1.6) * 0.18,
          );
        }
      });
      const showTrialButtons = currentStage > 0 && currentStage <= TRIALS.length;
      floatButton.visible = showTrialButtons && !testedRef.current;
      sinkButton.visible = showTrialButtons && !testedRef.current;
      testButton.visible = currentStage < STAGES.length - 1;
      const testMaterial = testButton.material as THREE.MeshStandardMaterial;
      testMaterial.color.setHex(testedRef.current ? 0x16a34a : 0x0284c7);
      testMaterial.emissive.setHex(testedRef.current ? 0x16a34a : 0x0284c7);
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      cardFollower.update(activeCamera);
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
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#082f49" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #075985 0%, #082f49 76%)" }}>
          <div style={{ maxWidth: 660, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🪶🪨💧</div>
            <div style={{ margin: "14px 0 10px", color: "#7dd3fc", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 7 • Activity 1
            </div>
            <h1 style={{ color: "#f0f9ff", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              What Floats, What Sinks?
            </h1>
            <p style={{ color: "#dbeafe", lineHeight: 1.7 }}>
              Predict and test six familiar objects in a transparent water tank. Watch the water surface, bubbles, and each object&apos;s complete journey.
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 360, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(8,47,73,0.95)", border: "1px solid rgba(125,211,252,0.42)", color: "#f0f9ff", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#7dd3fc", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 1 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            {currentTrial && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => choosePrediction("float")} disabled={tested} style={{ ...predictionButtonStyle, background: prediction === "float" ? "#15803d" : "rgba(34,197,94,0.16)" }}>
                    ↑ FLOAT
                  </button>
                  <button onClick={() => choosePrediction("sink")} disabled={tested} style={{ ...predictionButtonStyle, background: prediction === "sink" ? "#c2410c" : "rgba(249,115,22,0.16)" }}>
                    ↓ SINK
                  </button>
                </div>
                <button onClick={performAction} disabled={!prediction && !tested} style={{ ...primaryButtonStyle, opacity: !prediction && !tested ? 0.55 : 1 }}>
                  {tested ? "Next object →" : "💧 Test in water"}
                </button>
                {feedback && (
                  <div role="status" style={{ marginTop: 11, padding: 11, borderRadius: 9, color: tested ? "#bbf7d0" : "#fde68a", background: "rgba(255,255,255,0.07)", lineHeight: 1.5 }}>
                    <strong>{feedback}</strong>
                    {tested && <div style={{ marginTop: 5, fontSize: "0.82rem" }}>{currentTrial.explanation}</div>}
                  </div>
                )}
              </>
            )}
            {!currentTrial && stage < STAGES.length - 1 && <button onClick={performAction} style={primaryButtonStyle}>{STAGES[stage].action}</button>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
            </div>
            <button onClick={() => playNarration(tested && currentTrial ? NARRATIONS[8 + stage - 1] : NARRATIONS[stage])} style={secondaryButtonStyle}>🔊 Replay narration</button>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#dbeafe", fontSize: "0.75rem" }}>
            Quest: trigger selects • A tests/advances • B/right grip exits VR • Y goes back • joysticks move and turn
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
  background: "linear-gradient(135deg, #0284c7, #0369a1)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 9,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(125,211,252,0.42)",
  background: "rgba(125,211,252,0.1)",
  color: "#e0f2fe",
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
  color: "#dbeafe",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#e0f2fe",
  cursor: "pointer",
} as const;
