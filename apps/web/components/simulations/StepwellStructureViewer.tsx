"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Meet the Stepwell",
    cue: "Examine a water structure built deep into the ground.",
    detail: "A stepwell, also called a baoli or vav in different regions, combines a deep water store with long flights of steps.",
    action: "Open the structure",
  },
  {
    title: "Steps to the Water",
    cue: "Follow the symmetrical stairways from the surface to the reservoir.",
    detail: "Many rows of steps let people reach the water as its level rises after rain or falls during dry months.",
    action: "Descend the steps",
  },
  {
    title: "Landings, Pillars and Shade",
    cue: "Inspect the broad landings and shaded galleries between flights.",
    detail: "Landings provide resting and gathering places. Stone pillars support shaded spaces that remain cooler below ground.",
    action: "Reveal the shaded levels",
  },
  {
    title: "How Water Enters",
    cue: "Trace rainwater and groundwater moving toward the lowest chamber.",
    detail: "Stepwells can collect rain and surface runoff, and some also reach groundwater. Stone walls and the deep basin hold the supply.",
    action: "Send water inward",
  },
  {
    title: "Changing Water Level",
    cue: "Compare the reservoir after rain with the same reservoir in a dry period.",
    detail: "The water level changes with rainfall, use and groundwater conditions. The descending steps keep lower levels accessible.",
    action: "Lower the water level",
  },
  {
    title: "A Shared Water Place",
    cue: "See how the structure served both practical and community needs.",
    detail: "Stepwells stored precious water and offered cool gathering spaces. Protecting the catchment and keeping the water clean helped the whole community.",
    action: "Protect the water",
  },
  {
    title: "Structure Complete",
    cue: "Review the connected parts: catchment, steps, landings, pillars and reservoir.",
    detail: "The design follows water downward and gives people access at different levels. It is an example of architecture shaped by water scarcity.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 6, Every Drop Counts, Activity 2, A Stepwell Structure. A stepwell is a deep water structure with flights of steps leading down to stored water. In different parts of India, stepwells may be called baolis, baoris or vavs.",
  "Look at the long, symmetrical stairways. They descend level by level toward the reservoir. When the water level changes between rainy and dry seasons, people can walk farther down to reach it.",
  "Broad landings interrupt the long stairways. Pillars support shaded galleries and resting spaces. Because much of the structure is below ground and shaded, the lower levels can feel cooler than the surface.",
  "Now trace the water. Rain falling on the surrounding catchment can flow toward the stepwell as runoff. Some stepwells also reach groundwater. The deep stone-lined basin stores water at the lowest level.",
  "Watch the water level change. After good rain the reservoir rises and fewer steps are exposed. During a dry period the water falls, but the lower flights of steps still provide access. Water levels depend on rain, use and groundwater.",
  "A stepwell was more than a staircase. It stored scarce water and created a cool community space. Keeping waste out, protecting the surrounding catchment and using water carefully helped preserve the shared supply.",
  "You have identified the main parts of a stepwell: the catchment, descending steps, landings, pillars, shaded galleries and reservoir. Together they collect, store and provide access to water in a dry climate.",
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
  context.fillStyle = "#21170f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#f5c16c";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#f5c16c";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#f5e7d3";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = "#93c5fd";
  context.font = "bold 19px sans-serif";
  context.fillText(stage === 6 ? "Catchment • Steps • Shade • Reservoir" : `Action: ${STAGES[stage].action}`, 24, 230);
}

function makeArrow(color: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.38, 8), material);
  shaft.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10), material);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 0.25;
  group.add(shaft, tip);
  return group;
}

export default function StepwellStructureViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const actionTimeRef = useRef(0);
  const waterRef = useRef<THREE.Mesh | null>(null);
  const stairsRef = useRef<THREE.Mesh[]>([]);
  const galleriesRef = useRef<THREE.Group | null>(null);
  const rainRef = useRef<THREE.Mesh[]>([]);
  const arrowsRef = useRef<THREE.Group[]>([]);
  const cleanBarrierRef = useRef<THREE.Group | null>(null);
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
    scene.fog = new THREE.Fog(0xc8a97c, 17, 36);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/stepwell-courtyard-360.png",
      { exposure: 1.02, intensity: 0.42 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 70);
    camera.position.set(0, 2.15, 5.5);
    camera.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight(0xfff2d7, 0x3c352d, 1.65));
    const sun = new THREE.DirectionalLight(0xffedc7, 2.2);
    sun.position.set(-4, 7, 4);
    sun.castShadow = true;
    scene.add(sun);

    const stone = new THREE.MeshStandardMaterial({ color: 0xb38350, roughness: 0.92 });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x795534, roughness: 0.96 });
    const highlightedStone = new THREE.MeshStandardMaterial({ color: 0xe0ae6e, emissive: 0x5b3415, emissiveIntensity: 0.25, roughness: 0.9 });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.75, 0.18, 48), darkStone);
    platform.position.y = 0.08;
    platform.receiveShadow = true;
    scene.add(platform);

    const cutaway = new THREE.Group();
    cutaway.position.set(0, 0.25, 0);
    const stairs: THREE.Mesh[] = [];
    const levelCount = 8;
    for (let level = 0; level < levelCount; level++) {
      const height = 1.52 - level * 0.18;
      const distance = 2.05 - level * 0.22;
      const width = 0.72 + level * 0.03;
      for (const side of [-1, 1]) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, 0.48), stone);
        step.position.set(side * distance, height, 0);
        step.castShadow = true;
        step.receiveShadow = true;
        cutaway.add(step);
        stairs.push(step);
      }
      if (level % 2 === 1) {
        for (const z of [-0.66, 0.66]) {
          const landing = new THREE.Mesh(new THREE.BoxGeometry(distance * 2 + width, 0.13, 0.42), darkStone);
          landing.position.set(0, height - 0.03, z);
          cutaway.add(landing);
        }
      }
    }
    stairsRef.current = stairs;

    const basinWall = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.6, 1.45), darkStone);
    basinWall.position.y = 0.22;
    cutaway.add(basinWall);
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(1.26, 0.12, 1.26),
      new THREE.MeshPhysicalMaterial({
        color: 0x1b7893,
        transparent: true,
        opacity: 0.84,
        roughness: 0.12,
        metalness: 0.08,
      }),
    );
    water.position.y = 0.55;
    cutaway.add(water);
    waterRef.current = water;
    scene.add(cutaway);

    const galleries = new THREE.Group();
    for (const side of [-1, 1]) {
      for (const z of [-0.78, 0.78]) {
        for (const xOffset of [-0.34, 0.34]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.082, 0.9, 8), stone);
          pillar.position.set(side * (1.55 + xOffset * 0.16), 1.35, z);
          pillar.castShadow = true;
          galleries.add(pillar);
        }
        const roof = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.13, 0.52), darkStone);
        roof.position.set(side * 1.55, 1.84, z);
        galleries.add(roof);
      }
    }
    scene.add(galleries);
    galleriesRef.current = galleries;

    const rain: THREE.Mesh[] = [];
    for (let index = 0; index < 34; index++) {
      const drop = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.012, 0.09, 3, 5),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 }),
      );
      drop.position.set(((index * 1.67) % 5) - 2.5, 1.4 + ((index * 0.43) % 2.4), ((index * 2.13) % 3.4) - 1.7);
      scene.add(drop);
      rain.push(drop);
    }
    rainRef.current = rain;

    const arrows: THREE.Group[] = [];
    for (let index = 0; index < 8; index++) {
      const arrow = makeArrow(0x38bdf8);
      const side = index % 2 === 0 ? -1 : 1;
      arrow.position.set(side * (2.8 - Math.floor(index / 2) * 0.52), 0.48 + Math.floor(index / 2) * 0.24, 1.15);
      arrow.rotation.z = side < 0 ? -0.35 : Math.PI + 0.35;
      scene.add(arrow);
      arrows.push(arrow);
    }
    arrowsRef.current = arrows;

    const cleanBarrier = new THREE.Group();
    for (const x of [-1.2, -0.4, 0.4, 1.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), darkStone);
      post.position.set(x, 0.52, 1.48);
      cleanBarrier.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.08, 0.08), darkStone);
    rail.position.set(0, 0.75, 1.48);
    cleanBarrier.add(rail);
    scene.add(cleanBarrier);
    cleanBarrierRef.current = cleanBarrier;

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 1.03), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.45, 2.62, -1.8);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.17, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.2, -1.55);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.8);
    const actionButton = makeButton("btn-action", 0xd97706, 0);
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
        new THREE.MeshBasicMaterial({ color: 0xf5c16c }),
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
    controls.target.set(0, 1.05, 0);
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
      stairs.forEach((step, index) => {
        const visibleCount = currentStage === 0 ? Math.floor(Math.min(1, stageAge * 0.7) * stairs.length) : stairs.length;
        step.visible = index <= visibleCount;
        step.material = currentStage === 1 && index % 5 === 0 ? highlightedStone : stone;
      });
      if (galleriesRef.current) {
        galleriesRef.current.visible = currentStage === 2 || currentStage === 5 || currentStage === 6;
        galleriesRef.current.rotation.y = Math.sin(elapsed * 0.35) * 0.015;
      }
      rain.forEach((drop, index) => {
        drop.visible = currentStage === 3 || currentStage === 6;
        if (drop.visible) {
          drop.position.y -= 0.025 + (index % 4) * 0.004;
          if (drop.position.y < 0.5) drop.position.y = 3.4;
        }
      });
      arrows.forEach((arrow, index) => {
        arrow.visible = currentStage === 3 || currentStage === 6;
        const pulse = 0.88 + Math.sin(elapsed * 3 + index) * 0.14;
        arrow.scale.setScalar(pulse);
      });
      if (waterRef.current) {
        const targetHeight = currentStage === 4 ? 0.25 : currentStage >= 3 ? 0.55 : 0.4;
        waterRef.current.position.y += (targetHeight - waterRef.current.position.y) * 0.035;
        waterRef.current.rotation.y = Math.sin(elapsed * 0.8) * 0.01;
      }
      if (cleanBarrierRef.current) cleanBarrierRef.current.visible = currentStage === 5 || currentStage === 6;
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
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#21170f" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #7a4b25 0%, #21170f 74%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🏛️💧🪜</div>
            <div style={{ margin: "14px 0 10px", color: "#f5c16c", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 6 • Activity 2
            </div>
            <h1 style={{ color: "#fff7ed", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              A Stepwell Structure
            </h1>
            <p style={{ color: "#f5e7d3", lineHeight: 1.7 }}>
              Explore the stairs, shaded landings and deep reservoir of an ingenious traditional water structure.
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 350, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(33,23,15,0.95)", border: "1px solid rgba(245,193,108,0.42)", color: "#fff7ed", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#f5c16c", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 2 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(245,193,108,0.08)", border: "1px solid rgba(245,193,108,0.2)", marginBottom: 13 }}>
              <div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div>
            </div>
            <button onClick={performAction} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1, cursor: stage === STAGES.length - 1 ? "not-allowed" : "pointer" }}>
              {STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
            </div>
            <div role="status" style={{ marginTop: 12, color: stage === 6 ? "#86efac" : "#93c5fd", fontSize: "0.76rem", lineHeight: 1.5, textAlign: "center" }}>
              {stage === 6 ? "Structure complete • Every part connects people to water" : `${stage} of 6 structure discoveries completed`}
            </div>
            <button onClick={() => playNarration(NARRATIONS[stage])} style={secondaryButtonStyle}>🔊 Replay narration</button>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#f5e7d3", fontSize: "0.75rem" }}>
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
  background: "linear-gradient(135deg, #d97706, #92400e)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(245,193,108,0.42)",
  background: "rgba(245,193,108,0.1)",
  color: "#f5e7d3",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#f5e7d3",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#f5e7d3",
  cursor: "pointer",
} as const;
