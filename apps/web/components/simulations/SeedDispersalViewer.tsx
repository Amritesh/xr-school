"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Why Seeds Travel",
    cue: "Discover why a seed benefits from moving away from its parent plant.",
    detail: "Dispersal reduces crowding and competition for sunlight, water, minerals and space. It also helps plants reach new places.",
    action: "Release the first seeds",
  },
  {
    title: "Carried by Wind",
    cue: "Observe light seeds with hair-like tufts and winged seeds.",
    detail: "Cotton and dandelion-like seeds drift because they are light and have hairs. Drumstick and maple-like seeds have wings that slow their fall.",
    action: "Start the breeze",
  },
  {
    title: "Carried by Water",
    cue: "Test how a coconut can travel across water.",
    detail: "A coconut has a waterproof outer covering and a fibrous husk containing air spaces, so it can float to another shore.",
    action: "Float the coconut",
  },
  {
    title: "Hitchhiking on Animals",
    cue: "Look closely at the hooks on a burr-like fruit.",
    detail: "Hooks and spines catch on animal fur or people’s clothes. The seed is carried away and later falls off.",
    action: "Attach the burr",
  },
  {
    title: "Seeds Inside Fruits",
    cue: "Follow a fleshy fruit eaten by a bird.",
    detail: "Animals carry fruits or eat them. Hard seeds may be dropped or pass through the animal and reach a new place with natural manure.",
    action: "Follow the fruit seed",
  },
  {
    title: "Explosive Dispersal",
    cue: "Watch a ripe balsam-like pod split suddenly.",
    detail: "When some dry pods ripen, their walls spring apart and scatter seeds away from the parent plant.",
    action: "Burst the ripe pod",
  },
  {
    title: "Dispersal Challenge Complete",
    cue: "Compare the four main journeys: wind, water, animals and explosion.",
    detail: "Seed shape and covering suit the method of travel. Dispersal helps the next generation find space and resources to grow.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 5, Seeds and Seeds, Activity 2, Seed Dispersal. Plants cannot walk, but their seeds can travel. Dispersal reduces crowding near the parent plant and helps seedlings find sunlight, water, minerals and space.",
  "Wind carries very light seeds. Hair-like tufts act like parachutes, while thin wings make other seeds spin or glide. Start the breeze and watch them travel away from the parent plant.",
  "Water can carry seeds and fruits. A coconut has a waterproof outer layer and a fibrous husk with air spaces. This helps it float until it reaches a suitable shore.",
  "Some fruits have hooks or spines. They cling to animal fur or to people's clothes, travel with them, and later fall onto the ground in a new place.",
  "Animals also disperse seeds by carrying or eating fleshy fruits. Hard seeds may be dropped, or pass through the animal without being digested, and arrive with natural manure.",
  "Some plants disperse seeds by explosion. As a dry pod ripens, tension builds in its walls. The pod suddenly splits and throws its seeds away from the parent plant.",
  "You have explored four important methods of seed dispersal: wind, water, animals and explosive pods. Each seed has features suited to its journey, helping new plants grow with less competition.",
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
  context.fillStyle = "#102418";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#86efac";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#86efac";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#dcfce7";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(stage === 6 ? "Wind • Water • Animals • Explosion" : `Action: ${STAGES[stage].action}`, 24, 230);
}

function makeSeed(color = 0x8b5a2b, scale = 1) {
  const seed = new THREE.Mesh(
    new THREE.SphereGeometry(0.055 * scale, 12, 9),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82 }),
  );
  seed.scale.set(1.45, 0.72, 0.8);
  seed.castShadow = true;
  return seed;
}

function makeWindSeed(index: number) {
  const group = new THREE.Group();
  const seed = makeSeed(0x7c4a24, 0.75);
  group.add(seed);
  const tuftMaterial = new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 });
  for (let ray = 0; ray < 9; ray++) {
    const angle = (ray / 9) * Math.PI * 2;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.035, 0),
      new THREE.Vector3(Math.cos(angle) * 0.13, 0.18, Math.sin(angle) * 0.13),
    ]);
    group.add(new THREE.Line(geometry, tuftMaterial));
  }
  group.position.set(-1.45 + (index % 4) * 0.17, 1.25 + Math.floor(index / 4) * 0.16, -0.1);
  return group;
}

function makeBurr() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x66752d, roughness: 0.95 }),
  );
  group.add(body);
  for (let index = 0; index < 22; index++) {
    const direction = new THREE.Vector3(
      Math.sin(index * 2.17) * Math.cos(index * 0.51),
      Math.cos(index * 0.83),
      Math.sin(index * 1.37),
    ).normalize();
    const hook = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: 0x879b45, roughness: 0.9 }),
    );
    hook.position.copy(direction).multiplyScalar(0.22);
    hook.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    group.add(hook);
  }
  return group;
}

function makeBird() {
  const bird = new THREE.Group();
  const feather = new THREE.MeshStandardMaterial({ color: 0x315b7d, roughness: 0.82 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 12), feather);
  body.scale.set(1.35, 0.85, 0.85);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), feather);
  head.position.set(0.27, 0.13, 0);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.45, 0.12, 0);
  const wing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.88 }));
  wing.scale.set(1.2, 0.25, 0.75);
  wing.position.set(-0.02, 0.04, 0.18);
  bird.add(body, head, beak, wing);
  return bird;
}

export default function SeedDispersalViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const windSeedsRef = useRef<THREE.Group[]>([]);
  const coconutRef = useRef<THREE.Mesh | null>(null);
  const burrRef = useRef<THREE.Group | null>(null);
  const birdRef = useRef<THREE.Group | null>(null);
  const fruitSeedRef = useRef<THREE.Mesh | null>(null);
  const podHalvesRef = useRef<THREE.Mesh[]>([]);
  const burstSeedsRef = useRef<THREE.Mesh[]>([]);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const actionTimeRef = useRef(0);
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
    scene.fog = new THREE.Fog(0xb7d9b5, 15, 34);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/seed-dispersal-habitat-360.png",
      { exposure: 1.02, intensity: 0.42 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 70);
    camera.position.set(0, 2.05, 5.1);
    camera.lookAt(0, 1.15, 0);
    scene.add(new THREE.HemisphereLight(0xe8fff0, 0x43532d, 1.8));
    const sun = new THREE.DirectionalLight(0xfff4d6, 2.1);
    sun.position.set(-4, 7, 3);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x557a36, roughness: 1, transparent: true, opacity: 0.94 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.4, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95 }),
    );
    platform.position.y = 0.09;
    platform.receiveShadow = true;
    scene.add(platform);

    const parentPlant = new THREE.Group();
    for (let index = 0; index < 7; index++) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.026, 0.8 + index * 0.04, 8),
        new THREE.MeshStandardMaterial({ color: 0x3f6d2a, roughness: 0.95 }),
      );
      stem.position.set(-1.45 + (index % 3) * 0.18, 0.55, -0.05 + Math.floor(index / 3) * 0.12);
      stem.rotation.z = (index - 3) * 0.035;
      parentPlant.add(stem);
    }
    scene.add(parentPlant);

    const windSeeds = Array.from({ length: 12 }, (_, index) => makeWindSeed(index));
    windSeeds.forEach((seed) => scene.add(seed));
    windSeedsRef.current = windSeeds;

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 40),
      new THREE.MeshPhysicalMaterial({ color: 0x43a6c6, transparent: true, opacity: 0.72, roughness: 0.18, metalness: 0.08 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0.05, 0.22, 0.45);
    scene.add(water);
    const coconut = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 22, 16),
      new THREE.MeshStandardMaterial({ color: 0x75451f, roughness: 1, bumpScale: 0.2 }),
    );
    coconut.scale.set(1.18, 0.9, 0.9);
    scene.add(coconut);
    coconutRef.current = coconut;

    const furPatch = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9b18b, roughness: 1 }),
    );
    furPatch.scale.set(1.35, 0.65, 0.8);
    furPatch.position.set(1.25, 0.72, 0.2);
    scene.add(furPatch);
    const burr = makeBurr();
    scene.add(burr);
    burrRef.current = burr;

    const bird = makeBird();
    scene.add(bird);
    birdRef.current = bird;
    const fruitSeed = makeSeed(0xc99134, 1.05);
    scene.add(fruitSeed);
    fruitSeedRef.current = fruitSeed;

    const podMaterial = new THREE.MeshStandardMaterial({ color: 0x8f9f3a, roughness: 0.9 });
    const podHalves = [-1, 1].map((side) => {
      const half = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.72, 8, 12), podMaterial);
      half.scale.set(0.55, 1, 0.72);
      half.position.set(side * 0.06, 1.02, -0.25);
      scene.add(half);
      return half;
    });
    podHalvesRef.current = podHalves;
    const burstSeeds = Array.from({ length: 9 }, (_, index) => {
      const seed = makeSeed(0x3f2d1d, 0.8);
      seed.userData.direction = new THREE.Vector3(
        ((index % 3) - 1) * 0.68,
        0.45 + (index % 4) * 0.13,
        (Math.floor(index / 3) - 1) * 0.6,
      );
      scene.add(seed);
      return seed;
    });
    burstSeedsRef.current = burstSeeds;

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 1.03), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.4, 2.45, -1.65);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.17, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.22, -1.42);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.8);
    const actionButton = makeButton("btn-action", 0x22c55e, 0);
    actionButton.scale.x = 1.3;
    const nextButton = makeButton("btn-next", 0x3b82f6, 0.8);
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
        new THREE.MeshBasicMaterial({ color: 0x86efac }),
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
      startPosition: new THREE.Vector3(0, 0, 2.35),
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.1, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const stageAge = Math.max(0, performance.now() / 1000 - actionTimeRef.current);
      const currentStage = stageRef.current;
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      windSeeds.forEach((seed, index) => {
        seed.visible = currentStage === 1 || currentStage === 6;
        const travel = currentStage === 1 ? Math.min(stageAge * 0.24, 1) : 0.45;
        seed.position.x = -1.4 + (index % 4) * 0.16 + travel * (2.2 + index * 0.06);
        seed.position.y = 1.2 + Math.floor(index / 4) * 0.16 + Math.sin(elapsed * 2 + index) * 0.17;
        seed.position.z = -0.2 + Math.sin(index * 1.7 + elapsed) * 0.28;
        seed.rotation.y = elapsed + index;
      });
      water.visible = currentStage === 2 || currentStage === 6;
      if (coconutRef.current) {
        coconutRef.current.visible = water.visible;
        coconutRef.current.position.set(-0.68 + Math.min(stageAge * 0.22, 1.35), 0.38 + Math.sin(elapsed * 2) * 0.035, 0.45);
        coconutRef.current.rotation.z = elapsed * 0.22;
      }
      furPatch.visible = currentStage === 3 || currentStage === 6;
      if (burrRef.current) {
        burrRef.current.visible = furPatch.visible;
        const attach = currentStage === 3 ? Math.min(stageAge * 0.65, 1) : 1;
        burrRef.current.position.set(-0.55 + attach * 1.55, 0.78, 0.38 - attach * 0.12);
        burrRef.current.rotation.y = elapsed;
      }
      if (birdRef.current) {
        birdRef.current.visible = currentStage === 4 || currentStage === 6;
        birdRef.current.position.set(-1.1 + Math.sin(elapsed * 0.45) * 0.32, 1.45 + Math.sin(elapsed * 2.1) * 0.08, 0.25);
      }
      if (fruitSeedRef.current) {
        fruitSeedRef.current.visible = currentStage === 4 || currentStage === 6;
        const fall = currentStage === 4 ? Math.min(stageAge * 0.42, 1) : 1;
        fruitSeedRef.current.position.set(-0.55 + fall * 1.7, 1.42 - fall * 1.02, 0.25);
      }
      podHalves.forEach((half, index) => {
        half.visible = currentStage === 5 || currentStage === 6;
        const burst = currentStage === 5 ? Math.min(stageAge * 1.6, 1) : 1;
        const side = index === 0 ? -1 : 1;
        half.position.set(side * (0.06 + burst * 0.28), 1.02, -0.25);
        half.rotation.z = side * burst * 0.75;
      });
      burstSeeds.forEach((seed, index) => {
        seed.visible = currentStage === 5 || currentStage === 6;
        const burst = currentStage === 5 ? Math.min(stageAge * 1.25, 1) : 1;
        seed.position.copy((seed.userData.direction as THREE.Vector3).clone().multiplyScalar(burst));
        seed.position.y += 1.05 - burst * burst * (0.25 + (index % 3) * 0.08);
        seed.position.z -= 0.25;
        seed.rotation.x = elapsed * (2 + index * 0.15);
      });
      parentPlant.visible = currentStage === 0 || currentStage === 1 || currentStage === 6;
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
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#102418" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #35642e 0%, #102418 73%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🌬️🥥🐦🌱</div>
            <div style={{ margin: "14px 0 10px", color: "#86efac", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 5 • Activity 2
            </div>
            <h1 style={{ color: "#f0fdf4", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              Seed Dispersal
            </h1>
            <p style={{ color: "#dcfce7", lineHeight: 1.7 }}>
              Send seeds on four journeys and discover how wind, water, animals and bursting pods help plants spread.
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 350, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(16,36,24,0.95)", border: "1px solid rgba(134,239,172,0.42)", color: "#f0fdf4", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#86efac", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 2 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(134,239,172,0.08)", border: "1px solid rgba(134,239,172,0.2)", marginBottom: 13 }}>
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
              {stage === 6 ? "Challenge complete • Four dispersal methods mastered" : `${stage} of 6 seed journeys completed`}
            </div>
            <button onClick={() => playNarration(NARRATIONS[stage])} style={secondaryButtonStyle}>🔊 Replay narration</button>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#dcfce7", fontSize: "0.75rem" }}>
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
  background: "linear-gradient(135deg, #22c55e, #15803d)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(134,239,172,0.42)",
  background: "rgba(134,239,172,0.1)",
  color: "#dcfce7",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#dcfce7",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#dcfce7",
  cursor: "pointer",
} as const;
