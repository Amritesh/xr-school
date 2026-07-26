"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Save the Rain",
    cue: "Find out why rainfall should be collected instead of allowed to run away.",
    detail: "Rain may arrive during only part of the year. Storing some of it can provide water later and reduce pressure on other sources.",
    action: "Begin the rain",
  },
  {
    title: "The Roof Catchment",
    cue: "Watch the sloping roof receive rain over a wide area.",
    detail: "A clean roof acts as a catchment. Its slope guides many small drops toward the lower edge.",
    action: "Collect roof runoff",
  },
  {
    title: "Gutter and Downpipe",
    cue: "Trace water along the gutter and down through the pipe.",
    detail: "The gutter catches water from the roof edge. A downpipe carries it toward the cleaning and storage system without spilling.",
    action: "Open the downpipe",
  },
  {
    title: "Discard the First Dirty Flow",
    cue: "Divert the first rain that washes dust and leaves from the roof.",
    detail: "A first-flush arrangement keeps the initial dirty runoff out of the tank. A mesh screen can also stop larger debris.",
    action: "Divert the first flush",
  },
  {
    title: "Filter the Water",
    cue: "Pass the later runoff through a simple filter.",
    detail: "A filter with clean gravel and sand can remove suspended dirt. Filtering improves stored water but does not automatically make it safe to drink.",
    action: "Run water through filter",
  },
  {
    title: "Store and Reuse",
    cue: "Fill a covered tank and send water to useful tasks.",
    detail: "A covered tank reduces contamination and mosquito breeding. Stored rainwater can support cleaning and gardening; drinking requires appropriate treatment and testing.",
    action: "Fill the storage tank",
  },
  {
    title: "Every Drop Counts",
    cue: "Review the complete path from cloud to careful reuse.",
    detail: "Catchment, gutter, first flush, filter, covered tank and careful use work as one rainwater-harvesting system.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 6, Every Drop Counts, Activity 1, The Storage of Rainwater. Rain may fall for only part of the year. If we collect and store some rainfall, it can be available later and reduce pressure on wells, rivers and water supplies.",
  "The sloping roof is the catchment. It receives rain over a wide area and guides the drops toward its lower edge. Keeping the roof reasonably clean improves the quality of the collected runoff.",
  "A gutter runs along the lower edge of the roof. It catches the flowing water and leads it into a downpipe. The pipe carries the runoff toward the cleaning and storage system without wasting it.",
  "The first rain can wash dust, bird droppings and leaves from the roof. A first-flush arrangement diverts this initial dirty water away from the tank. A mesh screen can stop larger debris.",
  "After the first flush, runoff can pass through a simple filter. Layers such as clean gravel and sand trap suspended dirt. This improves the water, but filtration alone does not guarantee that it is safe for drinking.",
  "The filtered rainwater enters a covered storage tank. A tight cover reduces contamination and mosquito breeding. Stored rainwater can be used for gardening or cleaning. Drinking water needs suitable treatment and testing.",
  "You have completed the rainwater journey: catch it on a clean roof, guide it through gutters and a downpipe, divert the first dirty flow, filter later runoff, store it in a covered tank and use it carefully. Every drop counts.",
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

function drawCard(canvas: HTMLCanvasElement, stage: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#0c2230";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#67e8f9";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 1  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#cffafe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(stage === 6 ? "Catch • Clean • Store • Reuse" : `Action: ${STAGES[stage].action}`, 24, 230);
}

function makePipe(start: THREE.Vector3, end: THREE.Vector3, radius = 0.055) {
  const direction = end.clone().sub(start);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 14),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.35 }),
  );
  pipe.position.copy(start).add(end).multiplyScalar(0.5);
  pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  pipe.castShadow = true;
  return pipe;
}

export default function RainwaterStorageViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const actionTimeRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const rainRef = useRef<THREE.Mesh[]>([]);
  const flowDropsRef = useRef<THREE.Mesh[]>([]);
  const roofRef = useRef<THREE.Group | null>(null);
  const pipeRef = useRef<THREE.Group | null>(null);
  const firstFlushRef = useRef<THREE.Group | null>(null);
  const filterRef = useRef<THREE.Group | null>(null);
  const tankWaterRef = useRef<THREE.Mesh | null>(null);
  const gardenRef = useRef<THREE.Group | null>(null);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr
        ?.isSessionSupported?.("immersive-vr")
        .then(setVrSupported)
        .catch(() => setVrSupported(false));
    }
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    actionTimeRef.current = performance.now() / 1000;
    setStage(safeStage);
    cardNeedsUpdateRef.current = true;
    playNarration(NARRATIONS[safeStage]);
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
    scene.fog = new THREE.Fog(0x78909b, 16, 34);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/rainwater-storage-courtyard-360.png",
      { exposure: 0.96, intensity: 0.4 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 70);
    camera.position.set(0, 2.1, 5.35);
    camera.lookAt(0, 1.1, 0);
    scene.add(new THREE.HemisphereLight(0xdaf5ff, 0x30444a, 1.75));
    const daylight = new THREE.DirectionalLight(0xe8f5ff, 1.9);
    daylight.position.set(-4, 7, 4);
    daylight.castShadow = true;
    scene.add(daylight);

    const courtyard = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x647a76, roughness: 0.83, transparent: true, opacity: 0.82 }),
    );
    courtyard.rotation.x = -Math.PI / 2;
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    const roof = new THREE.Group();
    const tileMaterial = new THREE.MeshStandardMaterial({ color: 0x9f4f36, roughness: 0.92 });
    const leftSlope = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 1.8), tileMaterial);
    leftSlope.position.set(-0.98, 2.05, -0.2);
    leftSlope.rotation.z = -0.34;
    const rightSlope = leftSlope.clone();
    rightSlope.position.x = 0.98;
    rightSlope.rotation.z = 0.34;
    roof.add(leftSlope, rightSlope);
    for (const x of [-2.02, 2.02]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 1.7, 1.65),
        new THREE.MeshStandardMaterial({ color: 0xcbb995, roughness: 0.96 }),
      );
      wall.position.set(x, 1.12, -0.2);
      roof.add(wall);
    }
    scene.add(roof);
    roofRef.current = roof;

    const pipeSystem = new THREE.Group();
    const gutter = makePipe(new THREE.Vector3(-2.25, 1.66, 0.73), new THREE.Vector3(2.25, 1.66, 0.73), 0.07);
    const downpipe = makePipe(new THREE.Vector3(2.16, 1.66, 0.73), new THREE.Vector3(2.16, 0.62, 0.73), 0.065);
    const transfer = makePipe(new THREE.Vector3(2.16, 0.62, 0.73), new THREE.Vector3(1.25, 0.62, 0.73), 0.06);
    pipeSystem.add(gutter, downpipe, transfer);
    scene.add(pipeSystem);
    pipeRef.current = pipeSystem;

    const firstFlush = new THREE.Group();
    const chamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.9, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x8299a6, transparent: true, opacity: 0.72, roughness: 0.3 }),
    );
    chamber.position.set(1.9, 0.68, 0.72);
    const dirtyWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.42, 16),
      new THREE.MeshStandardMaterial({ color: 0x70543b, transparent: true, opacity: 0.8 }),
    );
    dirtyWater.position.set(1.9, 0.44, 0.72);
    const meshScreen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.045, 18),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35, wireframe: true }),
    );
    meshScreen.position.set(1.25, 0.66, 0.73);
    firstFlush.add(chamber, dirtyWater, meshScreen);
    scene.add(firstFlush);
    firstFlushRef.current = firstFlush;

    const filter = new THREE.Group();
    const filterWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 1.05, 24, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.3, roughness: 0.2, side: THREE.DoubleSide }),
    );
    filterWall.position.set(0.75, 0.78, 0.73);
    filter.add(filterWall);
    const layers = [
      { y: 0.43, color: 0x7c5c3e, radius: 0.32 },
      { y: 0.69, color: 0xd7c59f, radius: 0.32 },
      { y: 0.94, color: 0x6b7280, radius: 0.32 },
    ];
    layers.forEach(({ y, color, radius }) => {
      const layer = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.22, 24),
        new THREE.MeshStandardMaterial({ color, roughness: 1 }),
      );
      layer.position.set(0.75, y, 0.73);
      filter.add(layer);
    });
    scene.add(filter);
    filterRef.current = filter;

    const tank = new THREE.Group();
    const tankWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 1.55, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xb0a68f, roughness: 0.9, side: THREE.DoubleSide }),
    );
    tankWall.position.set(-0.65, 0.88, 0.45);
    const tankCover = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.82, 0.13, 28),
      new THREE.MeshStandardMaterial({ color: 0x766b58, roughness: 0.9 }),
    );
    tankCover.position.set(-0.65, 1.69, 0.45);
    const tankWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.35, 28),
      new THREE.MeshPhysicalMaterial({ color: 0x1e91b8, transparent: true, opacity: 0.77, roughness: 0.13 }),
    );
    tankWater.position.set(-0.65, 0.25, 0.45);
    tank.add(tankWall, tankCover, tankWater);
    scene.add(tank);
    tankWaterRef.current = tankWater;

    const garden = new THREE.Group();
    for (let index = 0; index < 9; index++) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.025, 0.42, 7),
        new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.95 }),
      );
      stem.position.set(-2.2 + (index % 3) * 0.3, 0.25, 0.55 + Math.floor(index / 3) * 0.25);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 7),
        new THREE.MeshStandardMaterial({ color: 0x4f9850, roughness: 0.95 }),
      );
      leaf.scale.set(1.4, 0.45, 0.75);
      leaf.position.copy(stem.position).setY(0.46);
      garden.add(stem, leaf);
    }
    scene.add(garden);
    gardenRef.current = garden;

    const rain: THREE.Mesh[] = [];
    for (let index = 0; index < 46; index++) {
      const drop = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.011, 0.09, 3, 5),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.82 }),
      );
      drop.position.set(((index * 1.73) % 6) - 3, 1.2 + ((index * 0.47) % 3), ((index * 2.09) % 4) - 2);
      scene.add(drop);
      rain.push(drop);
    }
    rainRef.current = rain;

    const flowDrops: THREE.Mesh[] = [];
    for (let index = 0; index < 22; index++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }),
      );
      drop.userData.offset = index / 22;
      scene.add(drop);
      flowDrops.push(drop);
    }
    flowDropsRef.current = flowDrops;

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 1.03), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.45, 2.72, -1.85);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.17, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.18, -1.52);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.8);
    const actionButton = makeButton("btn-action", 0x0891b2, 0);
    actionButton.scale.x = 1.3;
    const nextButton = makeButton("btn-next", 0x2563eb, 0.8);
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
      else goToStage(stageRef.current + 1);
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
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
    controls.target.set(0, 1.1, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.8;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const currentStage = stageRef.current;
      const stageAge = Math.max(0, performance.now() / 1000 - actionTimeRef.current);
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      rain.forEach((drop, index) => {
        drop.visible = currentStage === 0 || currentStage === 1 || currentStage === 6;
        if (drop.visible) {
          drop.position.y -= 0.028 + (index % 5) * 0.004;
          if (drop.position.y < 0.15) drop.position.y = 4.1;
        }
      });
      if (roofRef.current) roofRef.current.visible = currentStage <= 2 || currentStage === 6;
      if (pipeRef.current) pipeRef.current.visible = currentStage >= 2;
      if (firstFlushRef.current) firstFlushRef.current.visible = currentStage === 3 || currentStage === 6;
      if (filterRef.current) filterRef.current.visible = currentStage === 4 || currentStage === 6;
      if (gardenRef.current) gardenRef.current.visible = currentStage >= 5;
      flowDrops.forEach((drop, index) => {
        drop.visible = currentStage >= 1;
        const progress = (elapsed * 0.24 + (drop.userData.offset as number)) % 1;
        if (currentStage === 1) drop.position.set(-1.8 + progress * 3.6, 2.38 - Math.abs(progress - 0.5) * 1.25, 0.55);
        else if (currentStage === 2) drop.position.set(2.15, 1.65 - progress * 1.05, 0.73);
        else if (currentStage === 3) drop.position.set(1.9, 1.05 - progress * 0.7, 0.72);
        else if (currentStage === 4) drop.position.set(0.75, 1.28 - progress * 0.95, 0.73);
        else {
          drop.position.set(0.35 - progress, 0.66 - progress * 0.25, 0.55);
        }
      });
      if (tankWaterRef.current) {
        const fill = currentStage >= 5 ? Math.min(stageAge * 0.18, 1) : currentStage === 6 ? 1 : 0.14;
        tankWaterRef.current.scale.y = 0.25 + fill * 2.7;
        tankWaterRef.current.position.y = 0.25 + fill * 0.47;
      }
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;
    actionTimeRef.current = performance.now() / 1000;

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

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#0c2230" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #155e75 0%, #0c2230 74%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🌧️🏠🛢️🌱</div>
            <div style={{ margin: "14px 0 10px", color: "#67e8f9", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 6 • Activity 1
            </div>
            <h1 style={{ color: "#ecfeff", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              The Storage of Rainwater
            </h1>
            <p style={{ color: "#cffafe", lineHeight: 1.7 }}>
              Build the journey from rooftop rain to a clean, covered storage tank and careful reuse.
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 350, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(12,34,48,0.95)", border: "1px solid rgba(103,232,249,0.42)", color: "#ecfeff", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#67e8f9", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 1 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(103,232,249,0.08)", border: "1px solid rgba(103,232,249,0.2)", marginBottom: 13 }}>
              <div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div>
            </div>
            <button onClick={performAction} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1, cursor: stage === STAGES.length - 1 ? "not-allowed" : "pointer" }}>
              {STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
            </div>
            <div role="status" style={{ marginTop: 12, color: stage === 6 ? "#86efac" : "#fde68a", fontSize: "0.76rem", lineHeight: 1.5, textAlign: "center" }}>
              {stage === 6 ? "System complete • Rainwater ready for careful reuse" : `${stage} of 6 harvesting steps completed`}
            </div>
            <button onClick={() => playNarration(NARRATIONS[stage])} style={secondaryButtonStyle}>🔊 Replay narration</button>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#cffafe", fontSize: "0.75rem" }}>
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
  background: "linear-gradient(135deg, #0891b2, #0e7490)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(103,232,249,0.42)",
  background: "rgba(103,232,249,0.1)",
  color: "#cffafe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#cffafe",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#cffafe",
  cursor: "pointer",
} as const;
