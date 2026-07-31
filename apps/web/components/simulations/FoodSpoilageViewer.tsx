"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Set Up the Investigation",
    cue: "Compare equal mango pieces stored in four different conditions.",
    detail: "All samples begin fresh so storage is the only condition that changes.",
    action: "Observe fresh samples",
  },
  {
    title: "Day 0 — Fresh Mango",
    cue: "Look for colour, smell, texture and visible growth without tasting anything.",
    detail: "Fresh mango is yellow-orange, firm and has a pleasant fruity smell.",
    action: "Advance to Day 1",
  },
  {
    title: "Day 1 — First Changes",
    cue: "The uncovered warm sample begins softening before the protected samples.",
    detail: "Warmth, air and microorganisms can speed up food spoilage.",
    action: "Advance to Day 3",
  },
  {
    title: "Day 3 — Compare Carefully",
    cue: "Notice discoloration and mould on the warm samples. Never smell mould closely.",
    detail: "The refrigerated and salted samples change more slowly because their conditions hinder microbial growth.",
    action: "Advance to Day 5",
  },
  {
    title: "Day 5 — Strong Evidence",
    cue: "The uncovered mango has spoiled most, while cold and salt delayed spoilage.",
    detail: "Spoilage signs include changed colour, soft or slimy texture, unpleasant odour and mould growth.",
    action: "Explain the result",
  },
  {
    title: "What Slows Spoilage?",
    cue: "Cooling, covering and preserving can keep food usable for longer.",
    detail: "These methods slow spoilage; they do not make already spoiled food safe. When in doubt, do not taste it.",
    action: "Investigation complete",
  },
];

const NARRATIONS = [
  "Welcome to Mangoes Round the Year, Activity 1, Food Spoilage. We will compare equal mango pieces stored in four different conditions.",
  "On day zero all mango pieces are fresh. Observe colour, smell and texture, but never taste food during a spoilage investigation.",
  "By day one the uncovered mango at room temperature starts softening first. Warmth, air and microorganisms can speed spoilage.",
  "By day three, discoloration and mould appear on the warmer samples. Refrigeration and salt slow the changes.",
  "By day five, the uncovered sample shows the strongest spoilage. Changed colour, slimy texture, bad odour and mould are warning signs.",
  "Cooling, covering and preserving with salt can delay spoilage. They cannot make already spoiled food safe. When in doubt, do not taste it.",
];

const CONDITIONS = [
  { name: "Open • Room temperature", short: "OPEN", rate: 1, color: 0xef4444 },
  { name: "Covered • Room temperature", short: "COVERED", rate: 0.72, color: 0xf59e0b },
  { name: "Refrigerated", short: "COLD", rate: 0.25, color: 0x38bdf8 },
  { name: "Mixed with salt", short: "SALTED", rate: 0.16, color: 0x4ade80 },
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
  context.fillStyle = "#23130b";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#fb923c";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#fdba74";
  context.font = "bold 20px sans-serif";
  context.fillText(`Activity 1  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#ffedd5";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 122, canvas.width - 48, 28);
  context.fillStyle = "#fde68a";
  context.font = "bold 18px sans-serif";
  context.fillText(stage === STAGES.length - 1 ? "Cold + covered + preserved = slower spoilage" : STAGES[stage].action, 24, 234);
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 90;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#23130b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "bold 27px sans-serif";
    context.textAlign = "center";
    context.fillText(text, canvas.width / 2, 55);
  }
  return new THREE.CanvasTexture(canvas);
}

export default function FoodSpoilageViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const cardNeedsUpdateRef = useRef(true);
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
    const safe = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safe;
    setStage(safe);
    cardNeedsUpdateRef.current = true;
    speakText(NARRATIONS[safe]);
  }, []);

  const advance = useCallback(() => {
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
    scene.background = new THREE.Color(0x25130a);
    scene.fog = new THREE.Fog(0x25130a, 11, 25);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/food-courtyard-360.png", { exposure: 1.02 });
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(0, 2.4, 6.2);
    camera.lookAt(0, 1.2, 0);
    scene.add(new THREE.HemisphereLight(0xffedd5, 0x3f1d0b, 1.75));
    const light = new THREE.DirectionalLight(0xffffff, 2.1);
    light.position.set(4, 7, 5);
    light.castShadow = true;
    scene.add(light);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x4a2d1c, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 2.7), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 }));
    table.position.y = 0.78;
    table.receiveShadow = true;
    scene.add(table);

    const mangoes: { fruit: THREE.Mesh; mould: THREE.Mesh[]; index: number }[] = [];
    CONDITIONS.forEach((condition, index) => {
      const x = -2.35 + index * 1.57;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.56, 0.09, 28), new THREE.MeshStandardMaterial({ color: condition.color, roughness: 0.65 }));
      plate.position.set(x, 0.94, 0.1);
      scene.add(plate);
      const fruitMaterial = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.76 });
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), fruitMaterial);
      fruit.scale.set(1.25, 0.55, 0.8);
      fruit.position.set(x, 1.12, 0.1);
      fruit.castShadow = true;
      scene.add(fruit);
      const mould: THREE.Mesh[] = [];
      for (let spot = 0; spot < 7; spot++) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(0.035 + spot * 0.006, 10, 8), new THREE.MeshStandardMaterial({ color: spot % 2 ? 0x166534 : 0xe5e7eb, roughness: 1 }));
        patch.position.set(x - 0.18 + (spot % 4) * 0.12, 1.25 + Math.floor(spot / 4) * 0.035, 0.1 + (spot % 2) * 0.15);
        patch.visible = false;
        scene.add(patch);
        mould.push(patch);
      }
      mangoes.push({ fruit, mould, index });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.32), new THREE.MeshBasicMaterial({ map: makeLabel(condition.short) }));
      label.position.set(x, 1.58, -0.82);
      scene.add(label);
    });

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.09), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(0, 2.72, -1.55);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.08), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }));
      button.name = name;
      button.position.set(x, 1.32, -1.05);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.42);
    const nextButton = makeButton("btn-next", 0xf97316, 0.42);
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
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xfdba74 }));
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({ renderer, scene, camera, controllers, onPrimary: advance, onBack: () => goToStage(stageRef.current - 1), onNarrate: () => speakText(NARRATIONS[stageRef.current]), startPosition: new THREE.Vector3(0, 0, 2.6) });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.15, 0);
    controls.enableDamping = true;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    renderer.setAnimationLoop(() => {
      questVr.update();
      const current = stageRef.current;
      mangoes.forEach(({ fruit, mould, index }) => {
        const condition = CONDITIONS[index];
        const dayFactor = [0, 0, 0.2, 0.58, 1, 1][current] * condition.rate;
        const material = fruit.material as THREE.MeshStandardMaterial;
        material.color.setRGB(1 - dayFactor * 0.48, 0.72 - dayFactor * 0.48, 0.12 - dayFactor * 0.06);
        fruit.scale.y = 0.55 - dayFactor * 0.13;
        fruit.rotation.z = dayFactor * 0.12;
        mould.forEach((patch, spot) => { patch.visible = dayFactor > 0.38 + spot * 0.07; });
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
    } catch {
      setVrSupported(false);
    }
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#25130a" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #9a3412 0%, #25130a 72%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 74 }}>🥭🦠❄️</div>
            <div style={{ margin: "14px 0 10px", color: "#fdba74", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Class 5 EVS • Chapter 4 • Activity 1</div>
            <h1 style={{ color: "#fff7ed", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>Mangoes Round the Year: Food Spoilage</h1>
            <p style={{ color: "#ffedd5", lineHeight: 1.7 }}>Compare mango pieces over five days and discover how covering, cooling and salt slow food spoilage.</p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
              <button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={secondaryButtonStyle}>💻 View in Browser</button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <>
          <aside style={{ position: "absolute", top: 70, right: 16, width: 365, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(35,19,11,0.95)", border: "1px solid rgba(251,146,60,0.42)", color: "#fff7ed", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#fdba74", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity 1 • Stage {stage + 1}/{STAGES.length}</div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", marginBottom: 13 }}><div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div></div>
            <button onClick={advance} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1 }}>{STAGES[stage].action}</button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => speakText(NARRATIONS[stage])} style={navButtonStyle}>🔊 Narrate</button>
            </div>
            <div role="status" style={{ marginTop: 12, color: stage === 5 ? "#86efac" : "#fde68a", fontSize: "0.78rem", lineHeight: 1.5, textAlign: "center" }}>{stage === 5 ? "Conclusion: safe storage slows spoilage" : "Observe all four samples before advancing"}</div>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#fdba74", fontSize: "0.75rem" }}>Quest: trigger selects • A advances • B/right grip exits VR • Y goes back • joysticks move and turn</div>
        </>
      )}
    </div>
  );
}

const primaryButtonStyle = { width: "100%", padding: "11px 16px", borderRadius: 9, border: 0, background: "linear-gradient(135deg, #f97316, #c2410c)", color: "#ffffff", fontWeight: 800, cursor: "pointer" } as const;
const secondaryButtonStyle = { ...primaryButtonStyle, marginTop: 10, border: "1px solid rgba(251,146,60,0.42)", background: "rgba(251,146,60,0.1)", color: "#fed7aa" } as const;
const bodyCopyStyle = { margin: "0 0 12px", color: "#ffedd5", fontSize: "0.84rem", lineHeight: 1.58 } as const;
const navButtonStyle = { flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#ffedd5", cursor: "pointer" } as const;
