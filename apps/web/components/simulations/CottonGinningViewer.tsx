"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "The Ginning Mission",
    cue: "How can we separate soft cotton fibres from the seeds inside them?",
    detail: "Freshly picked cotton contains fibres wrapped around many seeds. These must be separated before spinning.",
    action: "Begin the investigation",
  },
  {
    title: "Inspect Picked Cotton",
    cue: "Open a cotton boll and look closely at the fibre-covered seeds.",
    detail: "The white fibres cling tightly to the seeds, so simply shaking the cotton will not separate them.",
    action: "Inspect fibre and seeds",
  },
  {
    title: "Load the Cotton Gin",
    cue: "Place a small bundle of dry picked cotton on the feed tray.",
    detail: "Feed an even layer toward the rollers so the machine can grip the fibres safely.",
    action: "Load picked cotton",
  },
  {
    title: "Turn the Rollers",
    cue: "Rotate the handle and watch the rollers pull the fibres forward.",
    detail: "The narrow gap lets soft fibres pass through while the larger seeds cannot follow them.",
    action: "Turn the gin handle",
  },
  {
    title: "Collect Both Outputs",
    cue: "Gather the clean cotton fibre and the separated cotton seeds.",
    detail: "Ginning produces two visible groups: fluffy fibre on one side and seeds in a separate tray.",
    action: "Collect fibre and seeds",
  },
  {
    title: "Confirm the Process",
    cue: "Compare the input with the two separated outputs.",
    detail: "Ginning is the process of separating cotton fibres from cotton seeds. The clean fibres are now ready for spinning into yarn.",
    action: "Ginning complete",
  },
];

const NARRATIONS = [
  "Welcome to Activity 2, the process of cotton ginning. Your mission is to separate cotton fibres from their seeds.",
  "Inspect the picked cotton. Soft white fibres are wrapped tightly around several seeds.",
  "Load a thin, even bundle of dry cotton onto the ginning machine's feed tray.",
  "Turn the handle. The rollers pull fibres through a narrow gap while the larger seeds are held back and fall away.",
  "Collect both outputs. Clean fluffy fibre gathers on one side, and separated cotton seeds collect below.",
  "Ginning means separating cotton fibres from cotton seeds. The clean fibre is ready for spinning into yarn.",
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

function drawGinningCard(canvas: HTMLCanvasElement, stage: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#111827";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#fbbf24";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#fbbf24";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#e5e7eb";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = "#fde68a";
  context.font = "bold 20px sans-serif";
  context.fillText(
    stage === STAGES.length - 1
      ? "Fibres separated • Ready for spinning"
      : `Current task: ${STAGES[stage].action}`,
    24,
    230,
  );
}

function makeCottonBundle(puffCount: number, seedCount: number) {
  const group = new THREE.Group();
  for (let index = 0; index < puffCount; index++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfffdf4, roughness: 1 }),
    );
    puff.position.set(
      ((index % 4) - 1.5) * 0.13,
      Math.floor(index / 4) * 0.1,
      ((index % 3) - 1) * 0.08,
    );
    group.add(puff);
  }
  for (let index = 0; index < seedCount; index++) {
    const seed = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }),
    );
    seed.scale.set(1.35, 0.75, 0.8);
    seed.position.set(
      ((index % 3) - 1) * 0.15,
      0.02 + Math.floor(index / 3) * 0.09,
      0.05,
    );
    group.add(seed);
  }
  return group;
}

export default function CottonGinningViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const rollersRef = useRef<THREE.Mesh[]>([]);
  const handleRef = useRef<THREE.Group | null>(null);
  const rawCottonRef = useRef<THREE.Group | null>(null);
  const cleanFibreRef = useRef<THREE.Group | null>(null);
  const seedsRef = useRef<THREE.Group | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);

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

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    setStage(safeStage);
    cardNeedsUpdateRef.current = true;
    speakText(NARRATIONS[safeStage]);
  }, []);

  const performAction = useCallback(() => {
    if (stageRef.current < STAGES.length - 1) goToStage(stageRef.current + 1);
  }, [goToStage]);

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
    scene.background = new THREE.Color(0x172033);
    scene.fog = new THREE.Fog(0x172033, 10, 22);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/cotton-ginning-workshop-360.png", { exposure: 1.03 });
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1.15, 0);
    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x34251b, 1.7));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 6, 4);
    light.castShadow = true;
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: 0x453122, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.22, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x7c5435, roughness: 0.88 }),
    );
    table.position.y = 0.72;
    table.receiveShadow = true;
    scene.add(table);

    const machine = new THREE.Group();
    machine.position.set(0, 0.88, 0);
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.65, roughness: 0.35 });
    for (const x of [-0.58, 0.58]) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.18), metalMaterial);
      upright.position.set(x, 0.5, 0);
      machine.add(upright);
    }
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.18), metalMaterial);
    topBar.position.y = 1.02;
    machine.add(topBar);
    const rollers: THREE.Mesh[] = [];
    for (const y of [0.44, 0.66]) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 1.05, 20),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.24 }),
      );
      roller.rotation.z = Math.PI / 2;
      roller.position.y = y;
      machine.add(roller);
      rollers.push(roller);
    }
    rollersRef.current = rollers;
    const feedTray = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.06, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.4 }),
    );
    feedTray.position.set(-1.18, 0.55, 0);
    feedTray.rotation.z = -0.12;
    machine.add(feedTray);

    const handle = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), metalMaterial);
    arm.position.y = 0.23;
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.24, 12),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }),
    );
    grip.rotation.z = Math.PI / 2;
    grip.position.y = 0.46;
    handle.add(arm, grip);
    handle.position.set(0.72, 0.55, 0);
    machine.add(handle);
    handleRef.current = handle;
    scene.add(machine);

    const rawCotton = makeCottonBundle(15, 6);
    rawCotton.position.set(-1.45, 1.55, 0.1);
    scene.add(rawCotton);
    rawCottonRef.current = rawCotton;
    const cleanFibre = makeCottonBundle(20, 0);
    cleanFibre.position.set(1.55, 1.08, 0);
    scene.add(cleanFibre);
    cleanFibreRef.current = cleanFibre;
    const seeds = makeCottonBundle(0, 12);
    seeds.position.set(0, 0.9, 0.75);
    scene.add(seeds);
    seedsRef.current = seeds;

    const fibreTray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.58, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.75 }),
    );
    fibreTray.position.set(1.55, 0.9, 0);
    scene.add(fibreTray);
    const seedTray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.48, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }),
    );
    seedTray.position.set(0, 0.83, 0.75);
    scene.add(seedTray);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.02), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.25, 2.5, -1.45);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.16, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18 }),
      );
      button.name = name;
      button.position.set(x, 1.2, -1.25);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.78);
    const actionButton = makeButton("btn-action", 0xf59e0b, 0);
    actionButton.scale.x = 1.3;
    const nextButton = makeButton("btn-next", 0x3b82f6, 0.78);
    const interactables = [previousButton, actionButton, nextButton];

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-action") performAction();
      else if (hit.object.name === "btn-previous") goToStage(stageRef.current - 1);
      else if (hit.object.name === "btn-next") goToStage(stageRef.current + 1);
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
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
      onNarrate: () => speakText(NARRATIONS[stageRef.current]),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.7;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      questVr.update();
      const currentStage = stageRef.current;
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawGinningCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      const running = currentStage === 3;
      rollersRef.current.forEach((roller, index) => {
        if (running) roller.rotation.x = elapsed * (index === 0 ? 3.8 : -3.8);
      });
      if (handleRef.current && running) handleRef.current.rotation.z = -elapsed * 3.8;
      if (rawCottonRef.current) {
        rawCottonRef.current.visible = currentStage >= 1 && currentStage <= 3;
        const travel = currentStage < 3 ? 0 : Math.min(1, (Math.sin(elapsed * 1.2) + 1) / 2);
        rawCottonRef.current.position.x = currentStage === 3 ? -1.45 + travel * 0.85 : -1.45;
        rawCottonRef.current.scale.setScalar(currentStage === 3 ? 1 - travel * 0.25 : 1);
      }
      if (cleanFibreRef.current) cleanFibreRef.current.visible = currentStage >= 4;
      if (seedsRef.current) seedsRef.current.visible = currentStage >= 4;
      fibreTray.visible = currentStage >= 4;
      seedTray.visible = currentStage >= 4;

      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawGinningCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;

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
  }, [goToStage, performAction]);

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> };
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

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#172033" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #854d0e 0%, #172033 72%)" }}>
          <div style={{ maxWidth: 620, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>☁️⚙️🌰</div>
            <div style={{ margin: "14px 0 10px", color: "#fbbf24", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 6 • Chapter 3 • Activity 2
            </div>
            <h1 style={{ color: "#fffbeb", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              The Process of Cotton Ginning
            </h1>
            <p style={{ color: "#e5e7eb", lineHeight: 1.7 }}>
              Operate a cotton gin and discover how picked cotton becomes clean fibre ready for spinning.
            </p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
              <button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={secondaryButtonStyle}>
                💻 View in Browser
              </button>
            </div>
          </div>
        </div>
      )}

      {started && (
        <>
          <aside style={{ position: "absolute", top: 70, right: 16, width: 350, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(17,24,39,0.95)", border: "1px solid rgba(251,191,36,0.42)", color: "#fffbeb", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#fbbf24", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 2 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", marginBottom: 13 }}>
              <div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div>
            </div>
            <button
              onClick={performAction}
              disabled={stage === STAGES.length - 1}
              style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1, cursor: stage === STAGES.length - 1 ? "not-allowed" : "pointer" }}
            >
              {STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
            </div>
            <div role="status" style={{ marginTop: 12, color: stage === 5 ? "#86efac" : "#fde68a", fontSize: "0.76rem", lineHeight: 1.5, textAlign: "center" }}>
              {stage === 5 ? "Ginning complete • Clean fibre ready for spinning" : `${stage} of 5 ginning tasks completed`}
            </div>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#fde68a", fontSize: "0.75rem" }}>
            Quest: trigger selects • A advances • B/right grip exits VR • Y goes back • joysticks move and turn
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
  background: "linear-gradient(135deg, #f59e0b, #b45309)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(251,191,36,0.42)",
  background: "rgba(251,191,36,0.1)",
  color: "#fde68a",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#e5e7eb",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  cursor: "pointer",
} as const;
