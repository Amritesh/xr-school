"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

type MineralId = "Calcium" | "Iodine" | "Iron";

interface MineralCase {
  id: MineralId;
  color: string;
  threeColor: number;
  role: string;
  sources: string[];
  sourceEmoji: string;
  bodyFunction: string;
  importance: string;
}

const MINERALS: MineralCase[] = [
  {
    id: "Calcium",
    color: "#60a5fa",
    threeColor: 0x60a5fa,
    role: "Builds strong bones and teeth",
    sources: ["Milk and curd", "Ragi", "Sesame seeds", "Green leafy vegetables"],
    sourceEmoji: "🥛",
    bodyFunction: "Strong bones and teeth",
    importance: "Calcium supports the structure and strength of bones and teeth.",
  },
  {
    id: "Iodine",
    color: "#facc15",
    threeColor: 0xfacc15,
    role: "Supports normal growth and thyroid function",
    sources: ["Iodized salt", "Sea fish", "Seaweed"],
    sourceEmoji: "🧂",
    bodyFunction: "Healthy thyroid and growth",
    importance: "Iodine helps the thyroid control growth and how the body uses energy.",
  },
  {
    id: "Iron",
    color: "#4ade80",
    threeColor: 0x4ade80,
    role: "Helps blood carry oxygen around the body",
    sources: ["Green leafy vegetables", "Beans", "Jaggery", "Meat"],
    sourceEmoji: "🥬",
    bodyFunction: "Healthy red blood cells",
    importance: "Iron is needed to make haemoglobin, which carries oxygen in blood.",
  },
];

const SOURCE_OPTIONS = ["Milk and curd", "Iodized salt", "Green leafy vegetables"];
const BODY_FUNCTION_OPTIONS = [
  "Strong bones and teeth",
  "Healthy thyroid and growth",
  "Healthy red blood cells",
];

const STAGES = [
  {
    title: "The Nutrition Mission",
    cue: "Explore how minerals protect different parts of the body.",
    detail: "You will investigate calcium, iodine and iron.",
  },
  {
    title: "Choose a Mineral",
    cue: "Select a mineral specimen from the discovery wall.",
    detail: "Read its role before matching a food source and a body function.",
  },
  {
    title: "Match a Source",
    cue: "Choose one food or natural source that supplies this mineral.",
    detail: "Each mineral has several sources; this activity uses one representative match.",
  },
  {
    title: "Match Its Body Job",
    cue: "Choose the body function that this mineral supports.",
    detail: "Minerals are needed in small amounts but perform essential jobs.",
  },
  {
    title: "Check the Evidence",
    cue: "Submit both matches and study the body-system response.",
    detail: "Incorrect choices can be changed and checked again.",
  },
  {
    title: "Build a Balanced Plate",
    cue: "Complete all three cases and compare their sources and jobs.",
    detail: "A varied balanced diet supplies the minerals the body needs.",
  },
];

const NARRATIONS = [
  "Welcome to Activity 5, the sources of minerals in food. Explore calcium, iodine and iron.",
  "Choose a mineral. Read what it does for the body.",
  "Match the mineral to a correct food or natural source.",
  "Now match the mineral to the important job it performs in the body.",
  "Check your evidence. Correct matches reveal the mineral's sources and body function.",
  "Complete all three mineral cases. A varied balanced diet helps the body get the minerals it needs.",
];

function speakText(text: string) {
  playNarration(text);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
) {
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

function drawLabCard(
  canvas: HTMLCanvasElement,
  stage: number,
  mineral: MineralCase,
  completed: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#081526";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = mineral.color;
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = mineral.color;
  context.font = "bold 21px sans-serif";
  context.fillText(
    `Activity 5  •  Stage ${stage + 1}/${STAGES.length}  •  ${completed}/3 solved`,
    24,
    38,
  );
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#cbd5e1";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = mineral.color;
  context.font = "bold 22px sans-serif";
  context.fillText(`Mineral ${mineral.id}: ${mineral.role}`, 24, 222);
}

function makeMineralModel(mineral: MineralCase) {
  const group = new THREE.Group();
  const crystal = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.3, 0),
    new THREE.MeshPhysicalMaterial({
      color: mineral.threeColor,
      emissive: mineral.threeColor,
      emissiveIntensity: 0.2,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.8,
    }),
  );
  crystal.scale.y = 1.35;
  crystal.castShadow = true;
  group.add(crystal);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.025, 10, 48),
    new THREE.MeshBasicMaterial({
      color: mineral.threeColor,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

export default function MineralSourcesViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const mineralRef = useRef<MineralId>("Calcium");
  const sourceRef = useRef(SOURCE_OPTIONS[0]);
  const bodyFunctionRef = useRef(BODY_FUNCTION_OPTIONS[0]);
  const modelRef = useRef<THREE.Group | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const completedRef = useRef<Record<MineralId, boolean>>({
    Calcium: false,
    Iodine: false,
    Iron: false,
  });

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [mineralId, setMineralId] = useState<MineralId>("Calcium");
  const [sourceChoice, setSourceChoice] = useState(SOURCE_OPTIONS[0]);
  const [bodyFunctionChoice, setBodyFunctionChoice] = useState(
    BODY_FUNCTION_OPTIONS[0],
  );
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState<Record<MineralId, boolean>>({
    Calcium: false,
    Iodine: false,
    Iron: false,
  });

  const mineral =
    MINERALS.find((item) => item.id === mineralId) ?? MINERALS[0];
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

  const selectMineral = useCallback((nextId: MineralId) => {
    const nextMineral =
      MINERALS.find((item) => item.id === nextId) ?? MINERALS[0];
    mineralRef.current = nextId;
    sourceRef.current = SOURCE_OPTIONS[0];
    bodyFunctionRef.current = BODY_FUNCTION_OPTIONS[0];
    setMineralId(nextId);
    setSourceChoice(SOURCE_OPTIONS[0]);
    setBodyFunctionChoice(BODY_FUNCTION_OPTIONS[0]);
    setFeedback("");
    stageRef.current = 2;
    setStage(2);
    cardNeedsUpdateRef.current = true;
    speakText(`Mineral ${nextId}. ${nextMineral.role}. Match its source.`);
  }, []);

  const checkMatch = useCallback(() => {
    const current =
      MINERALS.find((item) => item.id === mineralRef.current) ?? MINERALS[0];
    const sourceCorrect = current.sources.includes(sourceRef.current);
    const bodyFunctionCorrect = bodyFunctionRef.current === current.bodyFunction;
    if (sourceCorrect && bodyFunctionCorrect) {
      const nextCompleted = {
        ...completedRef.current,
        [current.id]: true,
      };
      completedRef.current = nextCompleted;
      setCompleted(nextCompleted);
      setFeedback(
        `Correct! ${current.sources.join(", ")} supply ${current.id}. It supports ${current.bodyFunction.toLowerCase()}. ${current.importance}`,
      );
      stageRef.current =
        Object.values(nextCompleted).filter(Boolean).length === MINERALS.length
          ? 5
          : 4;
      setStage(stageRef.current);
      speakText(
        `Correct. ${current.id} supports ${current.bodyFunction.toLowerCase()}. ${current.importance}`,
      );
    } else {
      const hint = !sourceCorrect
        ? `Try another source for mineral ${current.id}.`
        : "The source is correct. Recheck the body function.";
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

    const model = makeMineralModel(MINERALS[0]);
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
    const mineralButtons = MINERALS.map((item, index) =>
      makeButton(
        `btn-mineral-${item.id}`,
        item.threeColor,
        -1.15 + index * 0.4,
        1.42,
      ),
    );
    const sourceButton = makeButton("btn-source", 0x22d3ee, 0.65, 1.42);
    const bodyFunctionButton = makeButton(
      "btn-bodyFunction",
      0xa78bfa,
      1.05,
      1.42,
    );
    const checkButton = makeButton("btn-check", 0x22c55e, 1.5, 1.42);
    checkButton.scale.x = 1.2;
    const interactables = [
      ...mineralButtons,
      sourceButton,
      bodyFunctionButton,
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
      if (hit.object.name.startsWith("btn-mineral-")) {
        selectMineral(
          hit.object.name.replace("btn-mineral-", "") as MineralId,
        );
      } else if (hit.object.name === "btn-source") {
        const next = chooseNext(SOURCE_OPTIONS, sourceRef.current);
        sourceRef.current = next;
        setSourceChoice(next);
        stageRef.current = 3;
        setStage(3);
      } else if (hit.object.name === "btn-bodyFunction") {
        const next = chooseNext(BODY_FUNCTION_OPTIONS, bodyFunctionRef.current);
        bodyFunctionRef.current = next;
        setBodyFunctionChoice(next);
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
        MINERALS.find((item) => item.id === mineralRef.current) ?? MINERALS[0];
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
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawLabCard(cardCanvas, 0, MINERALS[0], 0);
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
  }, [checkMatch, selectMineral]);

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
    const nextModel = makeMineralModel(mineral);
    nextModel.position.set(0, 1.35, 0);
    parent.add(nextModel);
    modelRef.current = nextModel;
  }, [mineral]);

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
  const chooseBodyFunction = (value: string) => {
    bodyFunctionRef.current = value;
    setBodyFunctionChoice(value);
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
            <div style={{ fontSize: 72 }}>🥛🧂🥬</div>
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
              Class 6 • Chapter 2 • Activity 5
            </div>
            <h1
              style={{
                color: "#f8fafc",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              The Sources of Minerals in Food
            </h1>
            <p style={{ color: "#a5b4c6", lineHeight: 1.7 }}>
              Match calcium, iodine and iron to their food sources and body
              functions inside an immersive nutrition discovery lab.
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
            {MINERALS.map((item) => (
              <button
                key={item.id}
                onClick={() => selectMineral(item.id)}
                style={{
                  padding: "8px 13px",
                  borderRadius: 8,
                  border:
                    item.id === mineralId
                      ? `1px solid ${item.color}`
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    item.id === mineralId
                      ? `${item.color}22`
                      : "rgba(255,255,255,0.04)",
                  color: item.id === mineralId ? item.color : "#94a3b8",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Mineral {item.id} {completed[item.id] ? "✓" : ""}
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
              border: `1px solid ${mineral.color}55`,
              color: "#f8fafc",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: mineral.color,
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Activity 5 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 7px", fontSize: "1.08rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 10,
                borderRadius: 9,
                background: `${mineral.color}16`,
                border: `1px solid ${mineral.color}38`,
                marginBottom: 12,
              }}
            >
              <strong style={{ color: mineral.color }}>
                Mineral {mineral.id}
              </strong>
              <div style={{ ...bodyCopyStyle, marginTop: 4 }}>
                {mineral.role}
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
            <label style={labelStyle}>Choose its body function</label>
            <div style={choiceGridStyle}>
              {BODY_FUNCTION_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => chooseBodyFunction(option)}
                  style={choiceButtonStyle(option === bodyFunctionChoice)}
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
                  color: completed[mineralId] ? "#86efac" : "#fde68a",
                  background: completed[mineralId]
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
              {completedCount}/3 mineral cases completed
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
