"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  { title: "Set Up Three Samples", cue: "Place equal amounts of fresh milk in clean containers under different storage conditions.", detail: "Changing only the storage condition makes the comparison fair.", action: "Observe fresh milk" },
  { title: "Hour 0 — Fresh Milk", cue: "All three samples look smooth and white at the start.", detail: "Never taste milk during a spoilage investigation. Use appearance and safe wafting only with adult supervision.", action: "Advance to 6 hours" },
  { title: "After 6 Hours", cue: "Warm uncovered milk begins changing first while refrigerated milk remains stable.", detail: "Warm conditions help microorganisms multiply more quickly.", action: "Advance to 12 hours" },
  { title: "After 12 Hours", cue: "The room-temperature milk smells sour and starts forming small clumps.", detail: "Acids produced by microorganisms make milk proteins join into curds and separate from watery whey.", action: "Advance to 24 hours" },
  { title: "After 24 Hours", cue: "Compare sour smell, clumps, separation and gas bubbles across the samples.", detail: "Boiling reduces many microorganisms, covering limits contamination, and refrigeration slows microbial growth.", action: "Explain the result" },
  { title: "Store Milk Safely", cue: "Keep milk clean, covered and cold, and use it within its safe storage time.", detail: "Accidental spoilage is different from controlled curd-making with a clean starter culture. Never use spoiled milk to make food.", action: "Investigation complete" },
];

const NARRATIONS = [
  "Welcome to Activity 2, Milk Spoilage. We will compare equal milk samples stored in three different conditions.",
  "At hour zero, all samples are smooth and white. Never taste milk during a spoilage investigation.",
  "After six hours, warm uncovered milk begins changing first. Warmth helps microorganisms multiply quickly.",
  "After twelve hours, the room temperature sample smells sour and forms clumps. Microbial acids make milk proteins form curds and separate from whey.",
  "After twenty four hours, the warm sample shows the most spoilage. Boiling, covering and refrigeration slow the changes.",
  "Store milk clean, covered and cold. Accidental spoilage is not the same as controlled curd making with a clean starter culture. Never consume spoiled milk.",
];

const CONDITIONS = [
  { name: "Uncovered • Room temperature", short: "WARM + OPEN", rate: 1, color: 0xef4444 },
  { name: "Boiled + covered", short: "BOILED + COVERED", rate: 0.55, color: 0xf59e0b },
  { name: "Covered + refrigerated", short: "REFRIGERATED", rate: 0.16, color: 0x38bdf8 },
];

function speakText(text: string) {
  playNarration(text);
}

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
  context.fillStyle = "#0b1b2b";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#bae6fd";
  context.font = "bold 20px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#e0f2fe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 122, canvas.width - 48, 28);
  context.fillStyle = "#fde68a";
  context.font = "bold 18px sans-serif";
  context.fillText(stage === 5 ? "Clean + covered + cold = slower spoilage" : STAGES[stage].action, 24, 234);
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 90;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#0b1b2b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "bold 26px sans-serif";
    context.textAlign = "center";
    context.fillText(text, canvas.width / 2, 55);
  }
  return new THREE.CanvasTexture(canvas);
}

export default function MilkSpoilageViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const cardNeedsUpdateRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr?.isSessionSupported?.("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
    }
  }, []);

  const goToStage = useCallback((next: number) => {
    const safe = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safe;
    setStage(safe);
    cardNeedsUpdateRef.current = true;
    speakText(NARRATIONS[safe]);
  }, []);
  const advance = useCallback(() => { if (stageRef.current < STAGES.length - 1) goToStage(stageRef.current + 1); }, [goToStage]);

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
    scene.background = new THREE.Color(0x061423);
    scene.fog = new THREE.Fog(0x061423, 11, 25);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/food-courtyard-360.png", { exposure: 1.02 });
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(0, 2.4, 6.1);
    camera.lookAt(0, 1.35, 0);
    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x172033, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 7, 5);
    light.castShadow = true;
    scene.add(light);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x172b3f, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 2.7), new THREE.MeshStandardMaterial({ color: 0x704728, roughness: 0.86 }));
    table.position.y = 0.78;
    table.receiveShadow = true;
    scene.add(table);

    const samples: { milk: THREE.Mesh; curds: THREE.Mesh[]; bubbles: THREE.Mesh[]; index: number }[] = [];
    CONDITIONS.forEach((condition, index) => {
      const x = -1.8 + index * 1.8;
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.47, 1.25, 30, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.28, roughness: 0.05, transmission: 0.62, side: THREE.DoubleSide }));
      glass.position.set(x, 1.5, 0.05);
      scene.add(glass);
      const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.82, 28), new THREE.MeshStandardMaterial({ color: 0xfffdf2, roughness: 0.4, transparent: true, opacity: 0.92 }));
      milk.position.set(x, 1.29, 0.05);
      scene.add(milk);
      const curds: THREE.Mesh[] = [];
      for (let piece = 0; piece < 12; piece++) {
        const curd = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (piece % 3) * 0.012, 9, 7), new THREE.MeshStandardMaterial({ color: 0xfff7d6, roughness: 0.85 }));
        curd.position.set(x - 0.28 + (piece % 4) * 0.18, 1.05 + Math.floor(piece / 4) * 0.22, -0.15 + (piece % 3) * 0.14);
        curd.visible = false;
        scene.add(curd);
        curds.push(curd);
      }
      const bubbles: THREE.Mesh[] = [];
      for (let bubbleIndex = 0; bubbleIndex < 7; bubbleIndex++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
        bubble.position.set(x - 0.22 + (bubbleIndex % 4) * 0.14, 1.04 + (bubbleIndex % 3) * 0.25, 0.18);
        bubble.visible = false;
        scene.add(bubble);
        bubbles.push(bubble);
      }
      samples.push({ milk, curds, bubbles, index });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.58, 0.08, 28), new THREE.MeshStandardMaterial({ color: condition.color, roughness: 0.65 }));
      base.position.set(x, 0.92, 0.05);
      scene.add(base);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.32), new THREE.MeshBasicMaterial({ map: makeLabel(condition.short) }));
      label.position.set(x, 2.35, -0.72);
      scene.add(label);
    });

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.09), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(0, 3.15, -1.45);
    scene.add(card);
    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.08), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }));
      button.name = name;
      button.position.set(x, 1.35, -1.05);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.42);
    const nextButton = makeButton("btn-next", 0x0ea5e9, 0.42);
    const interactables = [previousButton, nextButton];
    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (hit?.object.name === "btn-next") advance();
      else if (hit?.object.name === "btn-previous") goToStage(stageRef.current - 1);
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({ renderer, scene, camera, controllers, onPrimary: advance, onBack: () => goToStage(stageRef.current - 1), onNarrate: () => speakText(NARRATIONS[stageRef.current]), startPosition: new THREE.Vector3(0, 0, 2.6) });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.45, 0);
    controls.enableDamping = true;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      questVr.update();
      const current = stageRef.current;
      const elapsed = clock.getElapsedTime();
      samples.forEach(({ milk, curds, bubbles, index }) => {
        const change = [0, 0, 0.24, 0.58, 1, 1][current] * CONDITIONS[index].rate;
        const material = milk.material as THREE.MeshStandardMaterial;
        material.color.setRGB(1, 0.99 - change * 0.22, 0.94 - change * 0.34);
        material.opacity = 0.92 - change * 0.18;
        curds.forEach((curd, piece) => { curd.visible = change > 0.32 + piece * 0.035; });
        bubbles.forEach((bubble, bubbleIndex) => {
          bubble.visible = change > 0.55 + bubbleIndex * 0.04;
          bubble.position.y = 1.02 + ((elapsed * 0.16 + bubbleIndex / bubbles.length) % 1) * 0.75;
        });
      });
      if (cardNeedsUpdateRef.current) {
        drawCard(cardCanvas, current);
        cardTexture.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;
    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
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
  }, [advance, goToStage]);

  const enterVR = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> } }).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: ["bounded-floor", "hand-tracking"] });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      window.setTimeout(() => speakText(NARRATIONS[stageRef.current]), 900);
    } catch { setVrSupported(false); }
  }, []);

  return <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#061423" }}>
    <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    {!started && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #075985 0%, #061423 72%)" }}><div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 74 }}>🥛🦠❄️</div><div style={{ margin: "14px 0 10px", color: "#7dd3fc", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Class 5 EVS • Chapter 4 • Activity 2</div>
      <h1 style={{ color: "#f0f9ff", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>Milk Spoilage</h1>
      <p style={{ color: "#e0f2fe", lineHeight: 1.7 }}>Compare milk over 24 hours and discover how boiling, covering and refrigeration slow spoilage.</p>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>{vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}<button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={secondaryButtonStyle}>💻 View in Browser</button></div>
    </div></div>}
    {started && <><aside style={{ position: "absolute", top: 70, right: 16, width: 365, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(6,20,35,0.95)", border: "1px solid rgba(125,211,252,0.42)", color: "#f0f9ff", backdropFilter: "blur(10px)" }}>
      <div style={{ color: "#7dd3fc", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity 2 • Stage {stage + 1}/{STAGES.length}</div>
      <h2 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>{STAGES[stage].title}</h2><p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
      <div style={{ padding: 11, borderRadius: 9, background: "rgba(125,211,252,0.08)", border: "1px solid rgba(125,211,252,0.2)", marginBottom: 13 }}><div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div></div>
      <button onClick={advance} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1 }}>{STAGES[stage].action}</button>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button><button onClick={() => speakText(NARRATIONS[stage])} style={navButtonStyle}>🔊 Narrate</button></div>
      <div role="status" style={{ marginTop: 12, color: stage === 5 ? "#86efac" : "#fde68a", fontSize: "0.78rem", lineHeight: 1.5, textAlign: "center" }}>{stage === 5 ? "Conclusion: keep milk clean, covered and cold" : "Compare all three milk samples"}</div>
      {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
    </aside><div style={{ position: "absolute", bottom: 16, left: 16, color: "#7dd3fc", fontSize: "0.75rem" }}>Quest: trigger selects • A advances • B/right grip exits VR • Y goes back • joysticks move and turn</div></>}
  </div>;
}

const primaryButtonStyle = { width: "100%", padding: "11px 16px", borderRadius: 9, border: 0, background: "linear-gradient(135deg, #0ea5e9, #0369a1)", color: "#ffffff", fontWeight: 800, cursor: "pointer" } as const;
const secondaryButtonStyle = { ...primaryButtonStyle, marginTop: 10, border: "1px solid rgba(125,211,252,0.42)", background: "rgba(125,211,252,0.1)", color: "#bae6fd" } as const;
const bodyCopyStyle = { margin: "0 0 12px", color: "#e0f2fe", fontSize: "0.84rem", lineHeight: 1.58 } as const;
const navButtonStyle = { flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e0f2fe", cursor: "pointer" } as const;
