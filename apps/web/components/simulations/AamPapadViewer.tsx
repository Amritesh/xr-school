"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  { title: "Prepare the Sunny Platform", cue: "Set a clean mat on a raised frame in a sunny place.", detail: "A raised, clean drying surface keeps the mango pulp away from the ground while sunlight and moving air help remove moisture.", action: "Set up the platform" },
  { title: "Choose Ripe Mangoes", cue: "Wash ripe mangoes and clean your hands and utensils.", detail: "Ripe mangoes are soft and full of sweet pulp. Clean preparation helps keep dirt and unwanted microorganisms out.", action: "Wash and select mangoes" },
  { title: "Extract and Strain the Pulp", cue: "Remove the peel and seed, then press the pulp through a strainer.", detail: "Straining removes fibres and produces smooth mango pulp that can be spread into an even sheet.", action: "Strain the mango pulp" },
  { title: "Mix Sugar and Jaggery", cue: "Stir sugar and jaggery evenly into the smooth pulp.", detail: "They sweeten the pulp and help preservation. The mixture must be smooth before it is spread.", action: "Mix the ingredients" },
  { title: "Spread a Thin Layer", cue: "Pour the sweetened pulp onto the clean mat and spread it evenly.", detail: "A thin layer dries more evenly than a thick pool because more surface is exposed to warm air and sunlight.", action: "Spread the first layer" },
  { title: "Sun-dry and Add Layers", cue: "Let each layer dry, then add another thin layer. Continue daily for about four weeks.", detail: "Sun-drying removes water slowly. Repeated layers build a thick sheet that can be stored beyond mango season.", action: "Complete four weeks of layers" },
  { title: "Peel, Cut and Store", cue: "Lift the dry mango sheet, cut it into pieces and keep it in a clean, dry container.", detail: "The finished mamidi tandra, or aam papad, is firm and flexible. Less moisture helps it keep much longer than fresh mango pulp.", action: "Aam papad complete" },
];

const NARRATIONS = [
  "Welcome to Mangoes Round the Year, Activity 3, the making of aam papad, also called mamidi tandra. First prepare a clean raised mat in a sunny place.",
  "Choose ripe mangoes. Wash the fruit, your hands and all utensils before beginning.",
  "Remove the peel and seed, collect the mango pulp and strain away the fibres to make it smooth.",
  "Add sugar and jaggery to the smooth pulp and stir until the mixture is even.",
  "Pour the sweetened mango pulp onto the clean mat and spread one thin, even layer.",
  "Let the layer dry in the sun. Add another thin layer after it dries and repeat this process each day for about four weeks.",
  "Peel the dried sheet from the mat, cut it into pieces and store it in a clean, dry container. Removing moisture lets us enjoy mango after its season.",
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
  context.fillStyle = "#261409";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#facc15";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#fde047";
  context.font = "bold 20px sans-serif";
  context.fillText(`Activity 3  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#fef3c7";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 122, canvas.width - 48, 28);
  context.fillStyle = "#fdba74";
  context.font = "bold 18px sans-serif";
  context.fillText(stage === STAGES.length - 1 ? "Fresh pulp → sun-dried fruit leather" : STAGES[stage].action, 24, 234);
}

function makeMango(x: number, z: number) {
  const mango = new THREE.Mesh(new THREE.SphereGeometry(0.22, 22, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.72 }));
  mango.scale.set(0.82, 1.18, 0.72);
  mango.rotation.z = -0.2;
  mango.position.set(x, 1.18, z);
  mango.castShadow = true;
  return mango;
}

export default function AamPapadViewer() {
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
    scene.background = new THREE.Color(0x4a220b);
    scene.fog = new THREE.Fog(0x4a220b, 11, 25);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/food-courtyard-360.png", { exposure: 1.02 });
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(0, 2.35, 6.2);
    camera.lookAt(0, 1.2, 0);
    scene.add(new THREE.HemisphereLight(0xfff7d6, 0x422006, 1.8));
    const sun = new THREE.DirectionalLight(0xfff1b8, 2.4);
    sun.position.set(4, 7, 3);
    sun.castShadow = true;
    scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x76522d, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 2.7), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.88 }));
    table.position.y = 0.78;
    table.receiveShadow = true;
    scene.add(table);

    const mangoGroup = new THREE.Group();
    mangoGroup.add(makeMango(-2.15, 0.1), makeMango(-1.72, 0.02), makeMango(-1.92, 0.38));
    scene.add(mangoGroup);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.3, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.34, side: THREE.DoubleSide }));
    bowl.position.set(-0.72, 1.03, 0.12);
    scene.add(bowl);
    const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 28), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 }));
    pulp.position.set(-0.72, 1.19, 0.12);
    scene.add(pulp);
    const strainer = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.08, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, wireframe: true, metalness: 0.7 }));
    strainer.position.set(-0.72, 1.43, 0.12);
    scene.add(strainer);

    const sugar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.35, 20), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }));
    sugar.position.set(0.45, 1.08, 0.28);
    scene.add(sugar);
    const jaggery = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.36), new THREE.MeshStandardMaterial({ color: 0x9a5b23, roughness: 0.95 }));
    jaggery.position.set(0.95, 1.08, 0.28);
    scene.add(jaggery);

    const frame = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b3f1f, roughness: 0.9 });
    for (const x of [-1.35, 1.35]) for (const z of [-0.72, 0.72]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.78, 10), wood);
      pole.position.set(x, 0.42, z);
      frame.add(pole);
    }
    const mat = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.07, 1.6), new THREE.MeshStandardMaterial({ color: 0xd6a35d, roughness: 1 }));
    mat.position.y = 0.82;
    frame.add(mat);
    frame.position.set(1.65, 0.86, -0.1);
    scene.add(frame);
    const sheetMaterial = new THREE.MeshStandardMaterial({ color: 0xea7a0b, roughness: 0.78, transparent: true, opacity: 0.95 });
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.035, 1.28), sheetMaterial);
    sheet.position.set(1.65, 1.705, -0.1);
    scene.add(sheet);
    const cutPieces = new THREE.Group();
    for (let row = 0; row < 2; row++) for (let column = 0; column < 4; column++) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.42), new THREE.MeshStandardMaterial({ color: 0xc65d08, roughness: 0.8 }));
      piece.position.set(0.92 + column * 0.5, 1.76, -0.35 + row * 0.48);
      cutPieces.add(piece);
    }
    scene.add(cutPieces);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.09), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(0, 2.8, -1.55);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.08), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }));
      button.name = name;
      button.position.set(x, 1.33, -1.08);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.42);
    const nextButton = makeButton("btn-next", 0xf59e0b, 0.42);
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
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({ renderer, scene, camera, controllers, onPrimary: advance, onBack: () => goToStage(stageRef.current - 1), onNarrate: () => speakText(NARRATIONS[stageRef.current]), startPosition: new THREE.Vector3(0, 0, 2.6) });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    renderer.setAnimationLoop(() => {
      questVr.update();
      const current = stageRef.current;
      mangoGroup.visible = current >= 1 && current <= 2;
      bowl.visible = current >= 2 && current <= 4;
      pulp.visible = current >= 2 && current <= 4;
      strainer.visible = current === 2;
      sugar.visible = current === 3;
      jaggery.visible = current === 3;
      frame.visible = current === 0 || current >= 4;
      sheet.visible = current >= 4 && current <= 5;
      cutPieces.visible = current === 6;
      sheet.scale.y = current === 5 ? 4.5 : 1;
      sheetMaterial.color.set(current === 5 ? 0xc65d08 : 0xea7a0b);
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
    } catch { setVrSupported(false); }
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#4a220b" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #b45309 0%, #4a220b 72%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 74 }}>🥭☀️🍬</div>
            <div style={{ margin: "14px 0 10px", color: "#fde047", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Class 5 EVS • Chapter 4 • Activity 3</div>
            <h1 style={{ color: "#fffbeb", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>The Making of Aam Papad</h1>
            <p style={{ color: "#fef3c7", lineHeight: 1.7 }}>Turn ripe mango pulp into mamidi tandra by straining, sweetening, spreading and sun-drying many thin layers.</p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
              <button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={secondaryButtonStyle}>💻 View in Browser</button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <>
          <aside style={{ position: "absolute", top: 70, right: 16, width: 365, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(38,20,9,0.95)", border: "1px solid rgba(250,204,21,0.42)", color: "#fffbeb", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#fde047", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity 3 • Stage {stage + 1}/{STAGES.length}</div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", marginBottom: 13 }}><div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div></div>
            <button onClick={advance} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1 }}>{STAGES[stage].action}</button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => speakText(NARRATIONS[stage])} style={navButtonStyle}>🔊 Narrate</button>
            </div>
            <div role="status" style={{ marginTop: 12, color: stage === 6 ? "#86efac" : "#fde68a", fontSize: "0.78rem", lineHeight: 1.5, textAlign: "center" }}>{stage === 6 ? "Aam papad ready • Mango preserved beyond summer" : `${stage} of 6 preparation steps completed`}</div>
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#fde047", fontSize: "0.75rem" }}>Quest: trigger selects • A advances • B/right grip exits VR • Y goes back • joysticks move and turn</div>
        </>
      )}
    </div>
  );
}

const primaryButtonStyle = { width: "100%", padding: "11px 16px", borderRadius: 9, border: 0, background: "linear-gradient(135deg, #f59e0b, #b45309)", color: "#ffffff", fontWeight: 800, cursor: "pointer" } as const;
const secondaryButtonStyle = { ...primaryButtonStyle, marginTop: 10, border: "1px solid rgba(250,204,21,0.42)", background: "rgba(250,204,21,0.1)", color: "#fef08a" } as const;
const bodyCopyStyle = { margin: "0 0 12px", color: "#fef3c7", fontSize: "0.84rem", lineHeight: 1.58 } as const;
const navButtonStyle = { flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fef3c7", cursor: "pointer" } as const;
