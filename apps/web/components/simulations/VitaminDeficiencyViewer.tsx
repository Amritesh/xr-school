"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";
import { createScreenSafePanelFollower, drawFittedText } from "@/lib/vr/screenSafeTextPanel";

type VitaminId = "A" | "B1" | "C" | "D";

interface VitaminCase {
  id: VitaminId;
  color: string;
  threeColor: number;
  role: string;
  sources: string[];
  sourceEmoji: string;
  deficiency: string;
  symptoms: string;
}

const VITAMINS: VitaminCase[] = [
  {
    id: "A",
    color: "#fb923c",
    threeColor: 0xfb923c,
    role: "Keeps eyes and skin healthy",
    sources: ["Carrot", "Papaya", "Mango", "Green leafy vegetables"],
    sourceEmoji: "🥕",
    deficiency: "Night blindness",
    symptoms: "Difficulty seeing in dim light; severe lack may damage vision.",
  },
  {
    id: "B1",
    color: "#facc15",
    threeColor: 0xfacc15,
    role: "Helps release energy and supports nerves and muscles",
    sources: ["Whole grains", "Pulses", "Nuts and seeds"],
    sourceEmoji: "🌾",
    deficiency: "Beriberi",
    symptoms: "Weak muscles and very little energy.",
  },
  {
    id: "C",
    color: "#4ade80",
    threeColor: 0x4ade80,
    role: "Keeps gums healthy and helps wounds heal",
    sources: ["Amla", "Guava", "Orange", "Tomato"],
    sourceEmoji: "🍊",
    deficiency: "Scurvy",
    symptoms: "Bleeding gums and wounds that take longer to heal.",
  },
  {
    id: "D",
    color: "#60a5fa",
    threeColor: 0x60a5fa,
    role: "Helps the body build strong bones and teeth",
    sources: ["Sunlight", "Egg yolk", "Fish", "Fortified milk"],
    sourceEmoji: "☀️",
    deficiency: "Rickets",
    symptoms: "Soft, weak or bent bones in growing children.",
  },
];

const SOURCE_OPTIONS = ["Carrot", "Whole grains", "Orange", "Sunlight"];
const DEFICIENCY_OPTIONS = [
  "Night blindness",
  "Beriberi",
  "Scurvy",
  "Rickets",
];

const STAGES = [
  {
    title: "The Nutrition Mission",
    cue: "Explore how vitamins protect different parts of the body.",
    detail: "You will investigate vitamins A, B1, C and D.",
  },
  {
    title: "Choose a Vitamin",
    cue: "Select a vitamin capsule from the discovery wall.",
    detail: "Read its role before matching a source and deficiency.",
  },
  {
    title: "Match a Source",
    cue: "Choose one food or natural source that supplies this vitamin.",
    detail: "Each vitamin can have several sources; this activity uses one clear example.",
  },
  {
    title: "Spot the Deficiency",
    cue: "Choose the condition linked to a long-term lack of this vitamin.",
    detail: "A deficiency disease develops when a nutrient is missing for a long time.",
  },
  {
    title: "Check the Evidence",
    cue: "Submit both matches and study the body-system response.",
    detail: "Incorrect choices can be changed and checked again.",
  },
  {
    title: "Build a Balanced Plate",
    cue: "Complete all four cases and compare their sources and effects.",
    detail: "Varied foods and safe sunlight exposure help prevent vitamin deficiencies.",
  },
];

const NARRATIONS = [
  "Welcome to Activity 4, sources of vitamins and their deficiencies. Explore vitamins A, B one, C and D.",
  "Choose a vitamin. Read what it does for the body.",
  "Match the vitamin to a correct food or natural source.",
  "Now match the vitamin to the deficiency caused by a long-term lack of it.",
  "Check your evidence. Correct matches reveal the vitamin's role, sources and deficiency symptoms.",
  "Complete all four vitamin cases. A varied balanced diet helps the body get the vitamins it needs.",
];

function speakText(text: string) {
  playNarration(text);
}

function drawLabCard(
  canvas: HTMLCanvasElement,
  stage: number,
  vitamin: VitaminCase,
  completed: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#081526";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = vitamin.color;
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = vitamin.color;
  context.font = "bold 21px sans-serif";
  context.fillText(
    `Activity 4  •  Stage ${stage + 1}/${STAGES.length}  •  ${completed}/4 solved`,
    24,
    38,
  );
  drawFittedText(context, STAGES[stage].title, {
    x: 24, y: 54, width: canvas.width - 48, height: 48,
    color: "#ffffff", fontWeight: 800, maxFontSize: 30, minFontSize: 21,
    maxLines: 2, verticalAlign: "middle",
  });
  drawFittedText(context, STAGES[stage].cue, {
    x: 24, y: 111, width: canvas.width - 48, height: 88,
    color: "#cbd5e1", maxFontSize: 20, minFontSize: 15, maxLines: 4,
  });
  drawFittedText(context, `Vitamin ${vitamin.id}: ${vitamin.role}`, {
    x: 24, y: 211, width: canvas.width - 48, height: 42,
    color: vitamin.color, fontWeight: 800, maxFontSize: 22, minFontSize: 15,
    maxLines: 2, verticalAlign: "middle",
  });
}

function makeVitaminModel(vitamin: VitaminCase) {
  const group = new THREE.Group();
  const capsule = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.32, 8, 18),
    new THREE.MeshPhysicalMaterial({
      color: vitamin.threeColor,
      emissive: vitamin.threeColor,
      emissiveIntensity: 0.2,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.8,
    }),
  );
  capsule.rotation.z = Math.PI / 2;
  capsule.castShadow = true;
  group.add(capsule);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.025, 10, 48),
    new THREE.MeshBasicMaterial({
      color: vitamin.threeColor,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

export default function VitaminDeficiencyViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const vitaminRef = useRef<VitaminId>("A");
  const sourceRef = useRef(SOURCE_OPTIONS[0]);
  const deficiencyRef = useRef(DEFICIENCY_OPTIONS[0]);
  const modelRef = useRef<THREE.Group | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const completedRef = useRef<Record<VitaminId, boolean>>({
    A: false,
    B1: false,
    C: false,
    D: false,
  });

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [vitaminId, setVitaminId] = useState<VitaminId>("A");
  const [sourceChoice, setSourceChoice] = useState(SOURCE_OPTIONS[0]);
  const [deficiencyChoice, setDeficiencyChoice] = useState(
    DEFICIENCY_OPTIONS[0],
  );
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState<Record<VitaminId, boolean>>({
    A: false,
    B1: false,
    C: false,
    D: false,
  });

  const vitamin =
    VITAMINS.find((item) => item.id === vitaminId) ?? VITAMINS[0];
  const completedCount = Object.values(completed).filter(Boolean).length;

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

  const selectVitamin = useCallback((nextId: VitaminId) => {
    const nextVitamin =
      VITAMINS.find((item) => item.id === nextId) ?? VITAMINS[0];
    vitaminRef.current = nextId;
    sourceRef.current = SOURCE_OPTIONS[0];
    deficiencyRef.current = DEFICIENCY_OPTIONS[0];
    setVitaminId(nextId);
    setSourceChoice(SOURCE_OPTIONS[0]);
    setDeficiencyChoice(DEFICIENCY_OPTIONS[0]);
    setFeedback("");
    stageRef.current = 2;
    setStage(2);
    cardNeedsUpdateRef.current = true;
    speakText(`Vitamin ${nextId}. ${nextVitamin.role}. Match its source.`);
  }, []);

  const checkMatch = useCallback(() => {
    const current =
      VITAMINS.find((item) => item.id === vitaminRef.current) ?? VITAMINS[0];
    const sourceCorrect = current.sources.includes(sourceRef.current);
    const deficiencyCorrect = deficiencyRef.current === current.deficiency;
    if (sourceCorrect && deficiencyCorrect) {
      const nextCompleted = {
        ...completedRef.current,
        [current.id]: true,
      };
      completedRef.current = nextCompleted;
      setCompleted(nextCompleted);
      setFeedback(
        `Correct! ${current.sources.join(", ")} supply vitamin ${current.id}. Its deficiency can cause ${current.deficiency}: ${current.symptoms}`,
      );
      stageRef.current =
        Object.values(nextCompleted).filter(Boolean).length === VITAMINS.length
          ? 5
          : 4;
      setStage(stageRef.current);
      speakText(
        `Correct. Vitamin ${current.id} deficiency can cause ${current.deficiency}. ${current.symptoms}`,
      );
    } else {
      const hint = !sourceCorrect
        ? `Try another source for vitamin ${current.id}.`
        : `The source is correct. Recheck the deficiency.`;
      setFeedback(hint);
      speakText(hint);
    }
    cardNeedsUpdateRef.current = true;
  }, []);

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
    scene.background = new THREE.Color(0x061321);
    scene.fog = new THREE.Fog(0x061321, 9, 20);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/nutrition-lab-360.png");
    const camera = new THREE.PerspectiveCamera(
      68,
      mount.clientWidth / mount.clientHeight,
      0.05,
      60,
    );
    camera.position.set(0, 1.75, 4.1);
    camera.lookAt(0, 1.35, 0);
    scene.add(new THREE.HemisphereLight(0xc7f5ff, 0x152238, 1.4));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 6, 4);
    light.castShadow = true;
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 64),
      new THREE.MeshStandardMaterial({ color: 0x102b35, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.3, 48),
      new THREE.MeshStandardMaterial({
        color: 0x173c4c,
        metalness: 0.35,
        roughness: 0.45,
      }),
    );
    platform.position.y = 0.15;
    platform.receiveShadow = true;
    scene.add(platform);

    const model = makeVitaminModel(VITAMINS[0]);
    model.position.set(0, 1.35, 0);
    scene.add(model);
    modelRef.current = model;

    const body = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9d8e8,
      transparent: true,
      opacity: 0.72,
    });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 16),
      bodyMaterial,
    );
    head.position.y = 2.02;
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.65, 8, 16),
      bodyMaterial,
    );
    torso.position.y = 1.35;
    body.add(head, torso);
    for (const x of [-0.18, 0.18]) {
      const limb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.055, 0.62, 6, 12),
        bodyMaterial,
      );
      limb.position.set(x, 0.62, 0);
      body.add(limb);
    }
    body.position.set(1.5, 0, -0.4);
    scene.add(body);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 700;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.88),
      new THREE.MeshBasicMaterial({ map: cardTexture }),
    );
    card.position.set(-1.25, 2.15, -0.9);
    scene.add(card);
    const cardFollower = createScreenSafePanelFollower(card, {
      panelWidth: 2.2,
      panelHeight: 0.88,
    });

    const makeButton = (name: string, color: number, x: number, y: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.12, 0.07),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.18,
        }),
      );
      button.name = name;
      button.position.set(x, y, -0.75);
      scene.add(button);
      return button;
    };
    const vitaminButtons = VITAMINS.map((item, index) =>
      makeButton(
        `btn-vitamin-${item.id}`,
        item.threeColor,
        -1.15 + index * 0.4,
        1.42,
      ),
    );
    const sourceButton = makeButton("btn-source", 0x22d3ee, 0.65, 1.42);
    const deficiencyButton = makeButton(
      "btn-deficiency",
      0xa78bfa,
      1.05,
      1.42,
    );
    const checkButton = makeButton("btn-check", 0x22c55e, 1.5, 1.42);
    checkButton.scale.x = 1.2;
    const interactables = [
      ...vitaminButtons,
      sourceButton,
      deficiencyButton,
      checkButton,
    ];

    const chooseNext = (items: string[], current: string) =>
      items[(items.indexOf(current) + 1) % items.length];
    const controllerRaycaster = new THREE.Raycaster();
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
      if (hit.object.name.startsWith("btn-vitamin-")) {
        selectVitamin(
          hit.object.name.replace("btn-vitamin-", "") as VitaminId,
        );
      } else if (hit.object.name === "btn-source") {
        const next = chooseNext(SOURCE_OPTIONS, sourceRef.current);
        sourceRef.current = next;
        setSourceChoice(next);
        stageRef.current = 3;
        setStage(3);
      } else if (hit.object.name === "btn-deficiency") {
        const next = chooseNext(DEFICIENCY_OPTIONS, deficiencyRef.current);
        deficiencyRef.current = next;
        setDeficiencyChoice(next);
        stageRef.current = 4;
        setStage(4);
      } else if (hit.object.name === "btn-check") checkMatch();
      cardNeedsUpdateRef.current = true;
    };

    const controllerVisual = () => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      return ray;
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      controller.add(controllerVisual());
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: checkMatch,
      onBack: () => {
        stageRef.current = Math.max(0, stageRef.current - 1);
        setStage(stageRef.current);
        cardNeedsUpdateRef.current = true;
        speakText(NARRATIONS[stageRef.current]);
      },
      onNarrate: () => speakText(NARRATIONS[stageRef.current]),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      questVr.update();
      const current =
        VITAMINS.find((item) => item.id === vitaminRef.current) ?? VITAMINS[0];
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawLabCard(
          cardCanvasRef.current,
          stageRef.current,
          current,
          Object.values(completedRef.current).filter(Boolean).length,
        );
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      if (modelRef.current) {
        modelRef.current.rotation.y = elapsed * 0.45;
        modelRef.current.position.y = 1.35 + Math.sin(elapsed * 1.7) * 0.08;
      }
      const activeCamera = renderer.xr.isPresenting
        ? renderer.xr.getCamera()
        : camera;
      cardFollower.update(activeCamera);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawLabCard(cardCanvas, 0, VITAMINS[0], 0);
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
  }, [checkMatch, selectVitamin]);

  useEffect(() => {
    const oldModel = modelRef.current;
    const parent = oldModel?.parent;
    if (!oldModel || !parent) return;
    parent.remove(oldModel);
    oldModel.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material))
        mesh.material.forEach((material) => material.dispose());
      else mesh.material?.dispose();
    });
    const nextModel = makeVitaminModel(vitamin);
    nextModel.position.set(0, 1.35, 0);
    parent.add(nextModel);
    modelRef.current = nextModel;
  }, [vitamin]);

  const goToStage = (next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    setStage(safeStage);
    cardNeedsUpdateRef.current = true;
    speakText(NARRATIONS[safeStage]);
  };

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
      setStarted(true);
      window.setTimeout(() => speakText(NARRATIONS[stageRef.current]), 900);
    } catch {
      setVrSupported(false);
    }
  }, []);

  const chooseSource = (value: string) => {
    sourceRef.current = value;
    setSourceChoice(value);
    setFeedback("");
    goToStage(3);
  };
  const chooseDeficiency = (value: string) => {
    deficiencyRef.current = value;
    setDeficiencyChoice(value);
    setFeedback("");
    goToStage(4);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#061321",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(circle at 50% 35%, #164e63 0%, #030712 72%)",
          }}
        >
          <div style={{ maxWidth: 610, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>🥕🍊☀️</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#67e8f9",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 6 • Chapter 2 • Activity 4
            </div>
            <h1
              style={{
                color: "#f8fafc",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              Sources of Vitamins and Their Deficiencies
            </h1>
            <p style={{ color: "#a5b4c6", lineHeight: 1.7 }}>
              Match vitamins A, B1, C and D to their sources and deficiency
              conditions inside an immersive nutrition discovery lab.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 26,
              }}
            >
              {vrSupported && (
                <button onClick={enterVR} style={primaryButtonStyle}>
                  🥽 Enter in VR
                </button>
              )}
              <button
                onClick={() => {
                  setStarted(true);
                  speakText(NARRATIONS[0]);
                }}
                style={secondaryButtonStyle}
              >
                💻 View in Browser
              </button>
            </div>
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
              padding: 9,
              borderRadius: 12,
              background: "rgba(3,7,18,0.9)",
              backdropFilter: "blur(8px)",
            }}
          >
            {VITAMINS.map((item) => (
              <button
                key={item.id}
                onClick={() => selectVitamin(item.id)}
                style={{
                  padding: "8px 13px",
                  borderRadius: 8,
                  border:
                    item.id === vitaminId
                      ? `1px solid ${item.color}`
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    item.id === vitaminId
                      ? `${item.color}22`
                      : "rgba(255,255,255,0.04)",
                  color: item.id === vitaminId ? item.color : "#94a3b8",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Vitamin {item.id} {completed[item.id] ? "✓" : ""}
              </button>
            ))}
          </div>

          <aside
            style={{
              position: "absolute",
              top: 74,
              right: 16,
              width: 330,
              maxHeight: "calc(100vh - 92px)",
              overflowY: "auto",
              padding: 17,
              borderRadius: 14,
              background: "rgba(3,7,18,0.94)",
              border: `1px solid ${vitamin.color}55`,
              color: "#f8fafc",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: vitamin.color,
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Activity 4 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 7px", fontSize: "1.08rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 10,
                borderRadius: 9,
                background: `${vitamin.color}16`,
                border: `1px solid ${vitamin.color}38`,
                marginBottom: 12,
              }}
            >
              <strong style={{ color: vitamin.color }}>
                Vitamin {vitamin.id}
              </strong>
              <div style={{ ...bodyCopyStyle, marginTop: 4 }}>
                {vitamin.role}
              </div>
            </div>

            <label style={labelStyle}>Choose a source</label>
            <div style={choiceGridStyle}>
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => chooseSource(option)}
                  style={choiceButtonStyle(option === sourceChoice)}
                >
                  {option}
                </button>
              ))}
            </div>
            <label style={labelStyle}>Choose the deficiency</label>
            <div style={choiceGridStyle}>
              {DEFICIENCY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => chooseDeficiency(option)}
                  style={choiceButtonStyle(option === deficiencyChoice)}
                >
                  {option}
                </button>
              ))}
            </div>
            <button onClick={checkMatch} style={primaryButtonStyle}>
              Check both matches
            </button>
            {feedback && (
              <div
                role="status"
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  color: completed[vitaminId] ? "#86efac" : "#fde68a",
                  background: completed[vitaminId]
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(234,179,8,0.1)",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                {feedback}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => goToStage(stage - 1)}
                disabled={stage === 0}
                style={navButtonStyle}
              >
                ← Previous
              </button>
              <button
                onClick={() => goToStage(stage + 1)}
                disabled={stage === STAGES.length - 1}
                style={navButtonStyle}
              >
                Next →
              </button>
            </div>
            <div
              style={{
                marginTop: 10,
                textAlign: "center",
                color: "#64748b",
                fontSize: "0.72rem",
              }}
            >
              {completedCount}/4 vitamin cases completed
            </div>
            {vrSupported && (
              <button onClick={enterVR} style={secondaryButtonStyle}>
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
            Quest: trigger selects • A checks • B/right grip exits VR • Y goes back • joysticks move and turn
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
  background: "linear-gradient(135deg, #0891b2, #2563eb)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(34,211,238,0.4)",
  background: "rgba(34,211,238,0.1)",
  color: "#67e8f9",
} as const;

const bodyCopyStyle = {
  margin: "0 0 11px",
  color: "#cbd5e1",
  fontSize: "0.82rem",
  lineHeight: 1.5,
} as const;

const labelStyle = {
  display: "block",
  color: "#94a3b8",
  fontSize: "0.72rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "11px 0 7px",
} as const;

const choiceGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
  marginBottom: 8,
} as const;

const choiceButtonStyle = (active: boolean) =>
  ({
    minHeight: 42,
    padding: "7px 8px",
    borderRadius: 8,
    border: active
      ? "1px solid #22d3ee"
      : "1px solid rgba(255,255,255,0.09)",
    background: active
      ? "rgba(34,211,238,0.14)"
      : "rgba(255,255,255,0.04)",
    color: active ? "#67e8f9" : "#cbd5e1",
    fontSize: "0.76rem",
    fontWeight: 700,
    cursor: "pointer",
  }) as const;

const navButtonStyle = {
  flex: 1,
  padding: 8,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  cursor: "pointer",
} as const;
