"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Visit the Cotton Field",
    cue: "Discover how soft cotton fibre begins its journey on a farm.",
    detail: "Cotton is a plant fibre. Farmers grow it as a crop before its fibres can become yarn and fabric.",
    action: "Enter the field",
  },
  {
    title: "Prepare Black Soil",
    cue: "Loosen and level the dark soil so roots can spread.",
    detail: "Cotton grows well in warm conditions and black soil. Prepared soil also helps seeds receive air and water.",
    action: "Prepare the soil",
  },
  {
    title: "Sow Cotton Seeds",
    cue: "Place seeds in evenly spaced rows and cover them lightly.",
    detail: "Spacing gives each cotton plant room for sunlight, water and healthy root growth.",
    action: "Sow the seeds",
  },
  {
    title: "Give Water and Warmth",
    cue: "Water the field gently and let the warm climate support growth.",
    detail: "The seeds germinate, and young green cotton plants emerge from the soil.",
    action: "Water the rows",
  },
  {
    title: "Watch Flowers Form Bolls",
    cue: "Observe flowers changing into green fruits called cotton bolls.",
    detail: "Cotton fibres and seeds develop together inside each protective boll.",
    action: "Grow the bolls",
  },
  {
    title: "Let the Bolls Mature",
    cue: "Wait until the ripe bolls burst open and reveal white cotton.",
    detail: "The fluffy fibres surrounding the seeds become visible when mature cotton bolls split open.",
    action: "Open the ripe bolls",
  },
  {
    title: "Pick the Cotton",
    cue: "Harvest the clean, dry cotton from the open bolls.",
    detail: "The picked cotton is ready for ginning, where fibres are separated from seeds before spinning.",
    action: "Farming complete",
  },
];

const NARRATIONS = [
  "Welcome to Activity 1, Cotton Farming. Cotton fibre begins its journey as a crop in the field.",
  "Prepare the black soil. Loose, level soil gives cotton roots air, water and room to grow.",
  "Sow cotton seeds in evenly spaced rows and cover them lightly with soil.",
  "Water the rows gently. In warm conditions, seedlings emerge and grow into green cotton plants.",
  "Watch the flowers form green fruits called cotton bolls. Fibres and seeds develop inside them.",
  "Let the bolls mature. Ripe cotton bolls burst open and reveal soft white fibres around the seeds.",
  "Pick the clean, dry cotton. It will next be ginned to separate the fibres from the seeds.",
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

function drawFieldCard(canvas: HTMLCanvasElement, stage: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#08150e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#86efac";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#86efac";
  context.font = "bold 21px sans-serif";
  context.fillText(
    `Activity 1  •  Stage ${stage + 1}/${STAGES.length}`,
    24,
    38,
  );
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#d1fae5";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = "#fef3c7";
  context.font = "bold 20px sans-serif";
  context.fillText(
    stage === STAGES.length - 1
      ? "Cotton harvested • Next: ginning"
      : `Next field task: ${STAGES[stage].action}`,
    24,
    230,
  );
}

function createCottonPlant(x: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, 0.3, z);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 1.25, 8),
    new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.9 }),
  );
  stem.position.y = 0.62;
  stem.name = "seedling";
  group.add(stem);

  for (let index = 0; index < 5; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const y = 0.35 + index * 0.2;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4f9f45, roughness: 0.85 }),
    );
    leaf.scale.set(1.45, 0.35, 0.75);
    leaf.position.set(side * 0.16, y, 0);
    leaf.rotation.z = side * 0.45;
    leaf.name = "leaf";
    group.add(leaf);
  }

  for (let index = 0; index < 3; index++) {
    const bollGroup = new THREE.Group();
    bollGroup.position.set((index - 1) * 0.2, 1 + (index % 2) * 0.18, 0);
    bollGroup.name = "boll";
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x6b8f3d, roughness: 0.9 }),
    );
    shell.name = "boll-shell";
    bollGroup.add(shell);
    for (let puff = 0; puff < 4; puff++) {
      const cotton = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xfffdf4, roughness: 1 }),
      );
      cotton.position.set(
        Math.cos((puff * Math.PI) / 2) * 0.065,
        Math.sin((puff * Math.PI) / 2) * 0.055,
        0.04,
      );
      cotton.name = "cotton";
      bollGroup.add(cotton);
    }
    group.add(bollGroup);
  }
  return group;
}

export default function CottonFarmingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const plantRefs = useRef<THREE.Group[]>([]);
  const seedRefs = useRef<THREE.Mesh[]>([]);
  const waterRefs = useRef<THREE.Mesh[]>([]);
  const basketCottonRef = useRef<THREE.Group | null>(null);
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
    if (stageRef.current < STAGES.length - 1) {
      goToStage(stageRef.current + 1);
    }
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
    scene.background = new THREE.Color(0x9bd7ff);
    scene.fog = new THREE.Fog(0x9bd7ff, 12, 28);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/cotton-field-360.png", { intensity: 0.46, exposure: 1.08 });
    const camera = new THREE.PerspectiveCamera(
      65,
      mount.clientWidth / mount.clientHeight,
      0.05,
      60,
    );
    camera.position.set(0, 2.2, 5.4);
    camera.lookAt(0, 1, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3f4a2c, 2));
    const sunlight = new THREE.DirectionalLight(0xfff2bf, 2.5);
    sunlight.position.set(5, 8, 4);
    sunlight.castShadow = true;
    scene.add(sunlight);

    const field = new THREE.Mesh(
      new THREE.CircleGeometry(5.8, 72),
      new THREE.MeshStandardMaterial({ color: 0x6f4b2f, roughness: 1 }),
    );
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);

    for (let row = -2; row <= 2; row++) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.12, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x3f2b22, roughness: 1 }),
      );
      ridge.position.set(0, 0.06, row * 0.65);
      scene.add(ridge);
    }

    const seeds: THREE.Mesh[] = [];
    const plants: THREE.Group[] = [];
    for (let row = -2; row <= 2; row++) {
      for (let column = -3; column <= 3; column++) {
        const x = column * 0.7;
        const z = row * 0.65;
        const seed = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x9a6a3a }),
        );
        seed.scale.set(1.3, 0.6, 0.8);
        seed.position.set(x, 0.17, z);
        scene.add(seed);
        seeds.push(seed);
        const plant = createCottonPlant(x, z);
        scene.add(plant);
        plants.push(plant);
      }
    }
    seedRefs.current = seeds;
    plantRefs.current = plants;

    const droplets: THREE.Mesh[] = [];
    for (let index = 0; index < 26; index++) {
      const droplet = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      droplet.position.set(
        ((index % 7) - 3) * 0.7,
        1 + (index % 4) * 0.22,
        (Math.floor(index / 7) - 1.5) * 0.65,
      );
      scene.add(droplet);
      droplets.push(droplet);
    }
    waterRefs.current = droplets;

    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.44, 0.55, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xb7793f, roughness: 0.95 }),
    );
    basket.position.set(3.2, 0.28, 0);
    scene.add(basket);
    const basketCotton = new THREE.Group();
    for (let index = 0; index < 18; index++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xfffdf4, roughness: 1 }),
      );
      puff.position.set(
        ((index % 5) - 2) * 0.16,
        0.48 + Math.floor(index / 5) * 0.1,
        ((index % 3) - 1) * 0.14,
      );
      basketCotton.add(puff);
    }
    basketCotton.position.x = 3.2;
    scene.add(basketCotton);
    basketCottonRef.current = basketCotton;

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.02),
      new THREE.MeshBasicMaterial({ map: cardTexture }),
    );
    card.position.set(-1.4, 2.45, -1.7);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.16, 0.08),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.18,
        }),
      );
      button.name = name;
      button.position.set(x, 1.25, -1.2);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.75);
    const actionButton = makeButton("btn-action", 0x16a34a, 0);
    actionButton.scale.x = 1.3;
    const nextButton = makeButton("btn-next", 0x0ea5e9, 0.75);
    const interactables = [previousButton, actionButton, nextButton];

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-action") performAction();
      else if (hit.object.name === "btn-previous")
        goToStage(stageRef.current - 1);
      else if (hit.object.name === "btn-next")
        goToStage(stageRef.current + 1);
    };

    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
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
    controls.target.set(0, 0.85, 0);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      questVr.update();
      const currentStage = stageRef.current;
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawFieldCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }

      seedRefs.current.forEach((seed) => {
        seed.visible = currentStage === 2;
      });
      waterRefs.current.forEach((drop, index) => {
        drop.visible = currentStage === 3;
        drop.position.y =
          0.35 + ((elapsed * 1.4 + index * 0.11) % 1.2);
      });
      plantRefs.current.forEach((plant, plantIndex) => {
        plant.visible = currentStage >= 3;
        const growth = currentStage === 3 ? 0.28 : currentStage === 4 ? 0.72 : 1;
        plant.scale.setScalar(growth);
        plant.traverse((object) => {
          if (object.name === "leaf") object.visible = currentStage >= 3;
          if (object.name === "boll") object.visible = currentStage >= 4;
          if (object.name === "cotton") object.visible = currentStage >= 5;
          if (object.name === "boll-shell") object.visible = currentStage === 4;
        });
        plant.rotation.z = Math.sin(elapsed * 0.8 + plantIndex) * 0.015;
      });
      basket.visible = currentStage === 6;
      basketCotton.visible = currentStage === 6;

      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawFieldCard(cardCanvas, 0);
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
        controller.removeEventListener("selectstart", onControllerSelect as any),
      );
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
        xr?: {
          requestSession?: (mode: string, options: object) => Promise<XRSession>;
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

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#9bd7ff" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "linear-gradient(180deg, #7dd3fc 0%, #d9f99d 55%, #4d7c0f 100%)" }}>
          <div style={{ maxWidth: 620, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🌱☀️☁️</div>
            <div style={{ margin: "14px 0 10px", color: "#14532d", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 6 • Chapter 3 • Activity 1
            </div>
            <h1 style={{ color: "#052e16", fontSize: "clamp(2.2rem, 5vw, 3.2rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              Cotton Farming
            </h1>
            <p style={{ color: "#1f3b27", lineHeight: 1.7 }}>
              Grow cotton from seed to open boll, then harvest the soft fibre in an immersive farm.
            </p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 340, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(5,46,22,0.94)", border: "1px solid rgba(134,239,172,0.45)", color: "#f0fdf4", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#86efac", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 1 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(134,239,172,0.08)", border: "1px solid rgba(134,239,172,0.2)", marginBottom: 13 }}>
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
            <div role="status" style={{ marginTop: 12, color: stage === 6 ? "#fef08a" : "#a7f3d0", fontSize: "0.76rem", lineHeight: 1.5, textAlign: "center" }}>
              {stage === 6 ? "Cotton harvested • Ready for ginning" : `${stage} of 6 field tasks completed`}
            </div>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#14532d", fontSize: "0.75rem", fontWeight: 700 }}>
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
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(20,83,45,0.45)",
  background: "rgba(255,255,255,0.55)",
  color: "#14532d",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#d1fae5",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#e2e8f0",
  cursor: "pointer",
} as const;
