"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";
import { createScreenSafePanelFollower, drawFittedText } from "@/lib/vr/screenSafeTextPanel";

type SampleId = "peanut" | "coconut" | "rice";

interface FoodSample {
  id: SampleId;
  name: string;
  emoji: string;
  color: number;
  lipidLevel: "high" | "moderate" | "low";
  result: string;
}

const SAMPLES: FoodSample[] = [
  {
    id: "peanut",
    name: "Peanut",
    emoji: "🥜",
    color: 0xb7793f,
    lipidLevel: "high",
    result: "A clear translucent patch remains: lipids are present.",
  },
  {
    id: "coconut",
    name: "Dry coconut",
    emoji: "🥥",
    color: 0xf1e6ca,
    lipidLevel: "moderate",
    result: "A translucent patch remains: lipids are present.",
  },
  {
    id: "rice",
    name: "Rice grain",
    emoji: "🍚",
    color: 0xf4f0dc,
    lipidLevel: "low",
    result: "No lasting translucent patch: little or no lipid is detected.",
  },
];

const STAGES = [
  {
    title: "🧪 The Investigation",
    cue: "Can a simple sheet of paper reveal which foods contain lipids?",
    detail:
      "Lipids, commonly called fats, store energy. Today you will compare peanut, dry coconut, and rice.",
    action: "Choose a sample to begin.",
  },
  {
    title: "🥜 Choose a Food Sample",
    cue: "Predict which sample will leave a lasting translucent patch.",
    detail:
      "A fair comparison uses a fresh paper sheet and a similar amount of each food.",
    action: "Select peanut, dry coconut, or rice.",
  },
  {
    title: "📄 Place and Fold",
    cue: "Place the sample in the centre of clean white paper and fold the paper around it.",
    detail:
      "Wrapping the food keeps the crushed material together and transfers any lipid to the paper.",
    action: "Press “Place on paper”.",
  },
  {
    title: "🪨 Crush Carefully",
    cue: "Crush the wrapped sample firmly without tearing the paper.",
    detail:
      "Pressure releases substances from the food. The paper must remain intact for a clear observation.",
    action: "Press and hold “Crush sample”.",
  },
  {
    title: "⏳ Remove and Dry",
    cue: "Remove the food pieces and allow the paper to dry.",
    detail:
      "This step matters: a water mark disappears as it dries, while a lipid patch remains.",
    action: "Press “Remove and dry”.",
  },
  {
    title: "💡 Hold Against Light",
    cue: "Lift the dry paper toward the lamp and look for a translucent patch.",
    detail:
      "A translucent area lets more light through than clean paper and does not disappear after drying.",
    action: "Press “Test against light”.",
  },
  {
    title: "📊 Compare the Evidence",
    cue: "Compare the observations, then decide which foods contain lipids.",
    detail:
      "Peanut and dry coconut should leave persistent translucent patches. Rice should leave little or no lasting patch.",
    action: "Test another sample or complete the investigation.",
  },
];

const NARRATIONS = [
  "Welcome to the Class 6 food-testing laboratory. Your question is: can paper reveal which foods contain lipids?",
  "Choose a food sample and make a prediction. You can compare peanut, dry coconut, and rice.",
  "Place the food in the centre of clean white paper, then fold the paper around it.",
  "Crush the wrapped sample carefully. Do not tear the paper.",
  "Remove the food pieces and let the paper dry. Water marks disappear, but lipid patches remain.",
  "Hold the dry paper against the light. A lasting translucent patch is evidence that lipids are present.",
  "Compare your evidence. Peanut and dry coconut contain lipids and leave translucent patches. Rice leaves little or no lasting patch.",
];

function speakText(text: string) {
  playNarration(text);
}

function drawInstructionCard(
  canvas: HTMLCanvasElement,
  stage: number,
  sample: FoodSample,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#07111f";
  ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`Activity 3  •  Stage ${stage + 1} of ${STAGES.length}`, 22, 38);
  drawFittedText(ctx, STAGES[stage].title, {
    x: 22, y: 55, width: canvas.width - 44, height: 44,
    color: "#ffffff", fontWeight: 800, maxFontSize: 28, minFontSize: 20,
    maxLines: 2, verticalAlign: "middle",
  });
  drawFittedText(ctx, STAGES[stage].cue, {
    x: 22, y: 106, width: canvas.width - 44, height: 88,
    color: "#cbd5e1", maxFontSize: 20, minFontSize: 15, maxLines: 4,
  });
  drawFittedText(ctx, `Current sample: ${sample.name}`, {
    x: 22, y: 211, width: canvas.width - 44, height: 31,
    color: "#facc15", fontWeight: 800, maxFontSize: 18, minFontSize: 14,
    maxLines: 1, verticalAlign: "middle",
  });
}

function makeFoodMesh(sample: FoodSample) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: sample.color,
    roughness: 0.75,
  });
  if (sample.id === "peanut") {
    const first = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 14, 10),
      material,
    );
    const second = first.clone();
    first.scale.set(1, 0.75, 1.25);
    second.scale.set(1, 0.75, 1.25);
    first.position.x = -0.075;
    second.position.x = 0.075;
    group.add(first, second);
  } else if (sample.id === "coconut") {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.08, 20, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x6b3f22, roughness: 0.9 }),
    );
    const flesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, 0.084, 20, 1, false, 0, Math.PI),
      material,
    );
    group.add(shell, flesh);
  } else {
    for (let index = 0; index < 9; index++) {
      const grain = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.018, 0.07, 4, 8),
        material,
      );
      grain.rotation.z = Math.PI / 2;
      grain.position.set(
        ((index % 3) - 1) * 0.055,
        0.01 + Math.floor(index / 3) * 0.014,
        (Math.floor(index / 3) - 1) * 0.04,
      );
      group.add(grain);
    }
  }
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true;
  });
  return group;
}

export default function LipidTestViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const sampleRef = useRef<SampleId>("peanut");
  const paperRef = useRef<THREE.Mesh | null>(null);
  const patchRef = useRef<THREE.Mesh | null>(null);
  const foodRef = useRef<THREE.Group | null>(null);
  const lampRef = useRef<THREE.PointLight | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const crushProgressRef = useRef(0);
  const testedRef = useRef<Record<SampleId, boolean>>({
    peanut: false,
    coconut: false,
    rice: false,
  });

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [sampleId, setSampleId] = useState<SampleId>("peanut");
  const [crushProgress, setCrushProgress] = useState(0);
  const [tested, setTested] = useState<Record<SampleId, boolean>>({
    peanut: false,
    coconut: false,
    rice: false,
  });

  const sample = SAMPLES.find((item) => item.id === sampleId) ?? SAMPLES[0];

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (
        navigator as Navigator & {
          xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
        }
      ).xr
        ?.isSessionSupported?.("immersive-vr")
        .then(setVrSupported)
        .catch(() => setVrSupported(false));
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1b2b);
    scene.fog = new THREE.Fog(0x0b1b2b, 8, 20);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/nutrition-lab-360.png");

    const camera = new THREE.PerspectiveCamera(
      68,
      mount.clientWidth / mount.clientHeight,
      0.05,
      60,
    );
    camera.position.set(0, 2.05, 5.4);
    camera.lookAt(0, 1.15, 0);

    scene.add(new THREE.HemisphereLight(0xb9e6ff, 0x172033, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(4, 7, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x18283a, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6),
      new THREE.MeshStandardMaterial({ color: 0x10243a, roughness: 0.95 }),
    );
    backWall.position.set(0, 3, -4);
    backWall.visible = false;
    scene.add(backWall);

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.16, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 }),
    );
    bench.position.set(0, 0.9, 0);
    bench.castShadow = true;
    bench.receiveShadow = true;
    scene.add(bench);
    for (const x of [-1.55, 1.55]) {
      for (const z of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.9, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x49301c, roughness: 0.9 }),
        );
        leg.position.set(x, 0.45, z);
        scene.add(leg);
      }
    }

    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.78),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    paper.rotation.x = -Math.PI / 2;
    paper.position.set(0.2, 1.0, 0);
    paper.receiveShadow = true;
    scene.add(paper);
    paperRef.current = paper;

    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0xf3d089,
        transparent: true,
        opacity: 0,
        transmission: 0.25,
        roughness: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0.2, 1.008, 0);
    scene.add(patch);
    patchRef.current = patch;

    const food = makeFoodMesh(SAMPLES[0]);
    food.position.set(-0.85, 1.08, 0.1);
    scene.add(food);
    foodRef.current = food;

    const lampStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 1.25, 12),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.7,
        roughness: 0.35,
      }),
    );
    lampStand.position.set(1.25, 1.55, -0.3);
    scene.add(lampStand);
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.27, 0.35, 20, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.4,
        roughness: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    lampShade.rotation.x = Math.PI;
    lampShade.position.set(1.25, 2.18, -0.3);
    scene.add(lampShade);
    const lamp = new THREE.PointLight(0xffefb0, 0.25, 5, 1.5);
    lamp.position.set(1.25, 2.0, -0.3);
    scene.add(lamp);
    lampRef.current = lamp;

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 620;
    cardCanvas.height = 260;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, 0.78),
      new THREE.MeshBasicMaterial({ map: cardTexture }),
    );
    card.position.set(-1.0, 1.95, -0.7);
    scene.add(card);
    const cardFollower = createScreenSafePanelFollower(card, {
      panelWidth: 1.85,
      panelHeight: 0.78,
    });

    const buttonMaterial = (color: number) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.18,
        roughness: 0.45,
      });
    const previousButton = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.11, 0.06),
      buttonMaterial(0x475569),
    );
    previousButton.name = "btn-previous";
    previousButton.position.set(-0.75, 1.38, -0.65);
    const nextButton = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.11, 0.06),
      buttonMaterial(0x0891b2),
    );
    nextButton.name = "btn-next";
    nextButton.position.set(-0.4, 1.38, -0.65);
    scene.add(previousButton, nextButton);

    const sampleButtons = SAMPLES.map((item, index) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.1, 0.06),
        buttonMaterial(item.color),
      );
      button.name = `btn-sample-${item.id}`;
      button.position.set(0.1 + index * 0.32, 1.38, -0.65);
      scene.add(button);
      return button;
    });
    const actionButton = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.06),
      buttonMaterial(0xeab308),
    );
    actionButton.name = "btn-action";
    actionButton.position.set(1.2, 1.38, -0.65);
    scene.add(actionButton);
    const interactables = [
      previousButton,
      nextButton,
      actionButton,
      ...sampleButtons,
    ];

    const controllerRaycaster = new THREE.Raycaster();
    const controllerVisual = () => {
      const group = new THREE.Group();
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.6, 4),
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0.5,
        }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.8;
      group.add(ray);
      return group;
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    const changeStageFromScene = (next: number) => {
      const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
      stageRef.current = safeStage;
      cardNeedsUpdateRef.current = true;
      setStage(safeStage);
      speakText(NARRATIONS[safeStage]);
    };
    const chooseSampleFromScene = (nextId: SampleId) => {
      sampleRef.current = nextId;
      crushProgressRef.current = 0;
      setSampleId(nextId);
      setCrushProgress(0);
      cardNeedsUpdateRef.current = true;
      if (stageRef.current < 1 || stageRef.current === STAGES.length - 1) {
        changeStageFromScene(1);
      }
    };
    const runStageAction = () => {
      if (stageRef.current < 2) changeStageFromScene(2);
      else if (stageRef.current === 2) changeStageFromScene(3);
      else if (stageRef.current === 3) {
        crushProgressRef.current = 1;
        setCrushProgress(1);
        changeStageFromScene(4);
      } else if (stageRef.current === 4) changeStageFromScene(5);
      else if (stageRef.current === 5) {
        testedRef.current = { ...testedRef.current, [sampleRef.current]: true };
        setTested(testedRef.current);
        changeStageFromScene(6);
      }
    };
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      controllerRaycaster.ray.origin.setFromMatrixPosition(
        controller.matrixWorld,
      );
      controllerRaycaster.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(controller.quaternion);
      const hit = controllerRaycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-previous")
        changeStageFromScene(stageRef.current - 1);
      else if (hit.object.name === "btn-next")
        changeStageFromScene(stageRef.current + 1);
      else if (hit.object.name === "btn-action") runStageAction();
      else if (hit.object.name.startsWith("btn-sample-"))
        chooseSampleFromScene(
          hit.object.name.replace("btn-sample-", "") as SampleId,
        );
    };
    controllers.forEach((controller) => {
      controller.add(controllerVisual());
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: runStageAction,
      onBack: () => changeStageFromScene(stageRef.current - 1),
      onNarrate: () => speakText(NARRATIONS[stageRef.current]),
      startPosition: new THREE.Vector3(0, 0, 2.6),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.15, 0);
    controls.enableDamping = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minDistance = 3.2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      questVr.update();
      const currentSample =
        SAMPLES.find((item) => item.id === sampleRef.current) ?? SAMPLES[0];
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawInstructionCard(
          cardCanvasRef.current,
          stageRef.current,
          currentSample,
        );
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }

      if (foodRef.current) {
        foodRef.current.rotation.y = Math.sin(elapsed * 0.8) * 0.08;
        const onPaper = stageRef.current >= 2 && stageRef.current <= 4;
        const targetX = onPaper ? 0.2 : -0.85;
        foodRef.current.position.x +=
          (targetX - foodRef.current.position.x) * 0.08;
        foodRef.current.position.y = 1.08 - crushProgressRef.current * 0.035;
        foodRef.current.scale.y +=
          (1 - crushProgressRef.current * 0.55 - foodRef.current.scale.y) * 0.1;
        foodRef.current.visible = stageRef.current < 5;
      }

      if (paperRef.current) {
        const liftPaper = stageRef.current >= 5;
        paperRef.current.rotation.x +=
          ((liftPaper ? 0 : -Math.PI / 2) - paperRef.current.rotation.x) * 0.08;
        paperRef.current.position.y +=
          ((liftPaper ? 1.62 : 1.0) - paperRef.current.position.y) * 0.08;
        paperRef.current.position.x +=
          ((liftPaper ? 0.65 : 0.2) - paperRef.current.position.x) * 0.08;
      }

      if (patchRef.current) {
        const visible = stageRef.current >= 4;
        const opacity =
          currentSample.lipidLevel === "high"
            ? 0.52
            : currentSample.lipidLevel === "moderate"
              ? 0.36
              : 0.04;
        (patchRef.current.material as THREE.MeshPhysicalMaterial).opacity =
          visible ? opacity : 0;
        patchRef.current.rotation.x +=
          ((stageRef.current >= 5 ? 0 : -Math.PI / 2) -
            patchRef.current.rotation.x) *
          0.08;
        patchRef.current.position.set(
          paperRef.current?.position.x ?? 0.2,
          (paperRef.current?.position.y ?? 1) + 0.008,
          0.01,
        );
      }
      if (lampRef.current)
        lampRef.current.intensity +=
          ((stageRef.current >= 5 ? 3.2 : 0.25) - lampRef.current.intensity) *
          0.08;

      const activeCamera = renderer.xr.isPresenting
        ? renderer.xr.getCamera()
        : camera;
      cardFollower.update(activeCamera);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    drawInstructionCard(cardCanvas, 0, SAMPLES[0]);
    cardTexture.needsUpdate = true;

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);
    return () => {
      renderer.setAnimationLoop(null);
      controllers.forEach((controller) =>
        controller.removeEventListener(
          "selectstart",
          onControllerSelect as any,
        ),
      );
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const food = foodRef.current;
    if (!food) return;
    const parent = food.parent;
    parent?.remove(food);
    food.traverse((object) => {
      if ((object as THREE.Mesh).geometry)
        (object as THREE.Mesh).geometry.dispose();
      const material = (object as THREE.Mesh).material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    const nextFood = makeFoodMesh(sample);
    nextFood.position.set(stage >= 2 && stage <= 4 ? 0.2 : -0.85, 1.08, 0.1);
    parent?.add(nextFood);
    foodRef.current = nextFood;
  }, [sample, stage]);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    cardNeedsUpdateRef.current = true;
    setStage(safeStage);
    speakText(NARRATIONS[safeStage]);
  }, []);

  const chooseSample = (nextId: SampleId) => {
    sampleRef.current = nextId;
    crushProgressRef.current = 0;
    setSampleId(nextId);
    setCrushProgress(0);
    cardNeedsUpdateRef.current = true;
    if (stage < 1 || stage === STAGES.length - 1) goToStage(1);
  };

  const performAction = () => {
    if (stage < 2) goToStage(2);
    else if (stage === 2) goToStage(3);
    else if (stage === 3) {
      crushProgressRef.current = 1;
      setCrushProgress(1);
      goToStage(4);
    } else if (stage === 4) goToStage(5);
    else if (stage === 5) {
      const nextTested = { ...tested, [sampleId]: true };
      testedRef.current = nextTested;
      setTested(nextTested);
      goToStage(6);
    }
  };

  const enterVR = useCallback(async () => {
    if (
      !rendererRef.current ||
      !(
        navigator as Navigator & {
          xr?: {
            requestSession?: (
              mode: string,
              options: object,
            ) => Promise<XRSession>;
          };
        }
      ).xr?.requestSession
    )
      return;
    try {
      unlockNarration();
      const session = await (
        navigator as Navigator & {
          xr: {
            requestSession: (
              mode: string,
              options: object,
            ) => Promise<XRSession>;
          };
        }
      ).xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      window.setTimeout(() => speakText(NARRATIONS[stageRef.current]), 900);
    } catch {
      setVrSupported(false);
    }
  }, []);

  const actionLabel =
    stage <= 1
      ? "Place on paper"
      : stage === 2
        ? "Fold paper"
        : stage === 3
          ? "Crush sample"
          : stage === 4
            ? "Remove and dry"
            : stage === 5
              ? "Test against light"
              : "Investigation complete";
  const testCount = Object.values(tested).filter(Boolean).length;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#07111f",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 50% 35%, #12304b 0%, #030712 72%)",
          }}
        >
          <div style={{ maxWidth: 580, padding: "28px", textAlign: "center" }}>
            <div style={{ fontSize: 76, marginBottom: 14 }}>🥜📄💡</div>
            <div
              style={{
                color: "#22d3ee",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Class 6 • Chapter 2 • Activity 3
            </div>
            <h1
              style={{
                color: "#f8fafc",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              Test the Presence of Lipids
            </h1>
            <p
              style={{
                color: "#a5b4c6",
                lineHeight: 1.7,
                margin: "0 auto 28px",
                maxWidth: 510,
              }}
            >
              Enter a virtual food laboratory. Crush samples on paper, dry the
              sheets, inspect them against light, and use evidence to identify
              foods containing lipids.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {vrSupported && (
                <button
                  onClick={enterVR}
                  style={{
                    padding: "14px 26px",
                    borderRadius: 12,
                    border: 0,
                    background: "linear-gradient(135deg, #0891b2, #2563eb)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  🥽 Enter in VR
                </button>
              )}
              <button
                onClick={() => {
                  setStarted(true);
                  speakText(NARRATIONS[0]);
                }}
                style={{
                  padding: "14px 26px",
                  borderRadius: 12,
                  border: "1px solid rgba(34,211,238,0.4)",
                  background: "rgba(34,211,238,0.1)",
                  color: "#67e8f9",
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                💻 View in Browser
              </button>
            </div>
            {!vrSupported && (
              <p
                style={{ marginTop: 18, color: "#64748b", fontSize: "0.8rem" }}
              >
                Open over HTTPS in Meta Quest Browser to enable immersive VR.
              </p>
            )}
          </div>
        </div>
      )}

      {started && (
        <>
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 8,
              padding: "9px 12px",
              borderRadius: 12,
              background: "rgba(3,7,18,0.9)",
              border: "1px solid rgba(34,211,238,0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            {SAMPLES.map((item) => (
              <button
                key={item.id}
                onClick={() => chooseSample(item.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border:
                    item.id === sampleId
                      ? "1px solid #22d3ee"
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    item.id === sampleId
                      ? "rgba(34,211,238,0.16)"
                      : "rgba(255,255,255,0.04)",
                  color: item.id === sampleId ? "#67e8f9" : "#94a3b8",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {item.emoji} {item.name} {tested[item.id] ? "✓" : ""}
              </button>
            ))}
          </div>

          <aside
            style={{
              position: "absolute",
              top: 76,
              right: 16,
              width: 292,
              padding: 17,
              borderRadius: 14,
              background: "rgba(3,7,18,0.93)",
              border: "1px solid rgba(34,211,238,0.22)",
              color: "#f8fafc",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#22d3ee",
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Activity 3 • Stage {stage + 1}/{STAGES.length}
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(34,211,238,0.2)",
                margin: "9px 0 12px",
              }}
            />
            <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>
              {STAGES[stage].title}
            </h2>
            <p
              style={{
                margin: "0 0 8px",
                color: "#d3dce8",
                fontSize: "0.84rem",
                lineHeight: 1.55,
              }}
            >
              {STAGES[stage].cue}
            </p>
            <p
              style={{
                margin: "0 0 12px",
                color: "#7f91a8",
                fontSize: "0.76rem",
                lineHeight: 1.55,
              }}
            >
              {STAGES[stage].detail}
            </p>
            {stage === 6 && tested[sampleId] && (
              <div
                style={{
                  padding: "9px 10px",
                  borderRadius: 8,
                  background:
                    sample.lipidLevel === "low"
                      ? "rgba(148,163,184,0.1)"
                      : "rgba(250,204,21,0.1)",
                  border: `1px solid ${sample.lipidLevel === "low" ? "rgba(148,163,184,0.25)" : "rgba(250,204,21,0.28)"}`,
                  color: sample.lipidLevel === "low" ? "#cbd5e1" : "#fde047",
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                  marginBottom: 12,
                }}
              >
                {sample.result}
              </div>
            )}
            <button
              onClick={performAction}
              disabled={stage === 6}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: 0,
                background: stage === 6 ? "#334155" : "#0891b2",
                color: "#fff",
                fontWeight: 800,
                cursor: stage === 6 ? "not-allowed" : "pointer",
                opacity: stage === 6 ? 0.55 : 1,
              }}
            >
              {actionLabel}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button
                onClick={() => goToStage(stage - 1)}
                disabled={stage === 0}
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: stage === 0 ? "#475569" : "#e2e8f0",
                  cursor: stage === 0 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => goToStage(stage + 1)}
                disabled={stage === STAGES.length - 1}
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: stage === STAGES.length - 1 ? "#475569" : "#e2e8f0",
                  cursor:
                    stage === STAGES.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
            <button
              onClick={() => speakText(NARRATIONS[stage])}
              style={{
                width: "100%",
                marginTop: 9,
                padding: 8,
                borderRadius: 8,
                border: "1px solid rgba(250,204,21,0.3)",
                background: "rgba(250,204,21,0.08)",
                color: "#fde047",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔊 Play narration
            </button>
            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: "0.72rem",
                textAlign: "center",
              }}
            >
              {testCount}/3 samples tested{" "}
              {crushProgress > 0 ? "• sample crushed" : ""}
            </div>
            {vrSupported && (
              <button
                onClick={enterVR}
                style={{
                  width: "100%",
                  marginTop: 9,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid rgba(34,211,238,0.3)",
                  background: "rgba(34,211,238,0.08)",
                  color: "#67e8f9",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🥽 Enter VR
              </button>
            )}
          </aside>

          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              color: "#64748b",
              fontSize: "0.74rem",
            }}
          >
            Quest: trigger selects • A advances • B/right grip exits VR • Y goes back • joysticks move and turn
          </div>
        </>
      )}
    </div>
  );
}
