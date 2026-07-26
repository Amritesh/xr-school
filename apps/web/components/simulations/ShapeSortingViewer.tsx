"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { applyRealisticEnvironment } from "./realisticEnvironment";

type ShapeGroup = "Sphere" | "Cylinder" | "Cuboid" | "Cone";

const GROUPS: { name: ShapeGroup; color: number; css: string }[] = [
  { name: "Sphere", color: 0x38bdf8, css: "#38bdf8" },
  { name: "Cylinder", color: 0xfbbf24, css: "#fbbf24" },
  { name: "Cuboid", color: 0xa78bfa, css: "#a78bfa" },
  { name: "Cone", color: 0x4ade80, css: "#4ade80" },
];

const OBJECTS: { name: string; material: string; shape: ShapeGroup; clue: string }[] = [
  { name: "Rubber ball", material: "rubber", shape: "Sphere", clue: "It is round in every direction and has no flat face." },
  { name: "Orange", material: "plant material", shape: "Sphere", clue: "Although its surface is textured, its overall shape is nearly spherical." },
  { name: "Tin can", material: "metal", shape: "Cylinder", clue: "It has two circular faces joined by one curved surface." },
  { name: "Piece of chalk", material: "chalk", shape: "Cylinder", clue: "Its long body is curved and its two ends are circular." },
  { name: "Book", material: "paper", shape: "Cuboid", clue: "It has six flat rectangular faces." },
  { name: "Wooden block", material: "wood", shape: "Cuboid", clue: "Its faces are flat and its edges meet at corners." },
  { name: "Party hat", material: "paper", shape: "Cone", clue: "It has one circular base and narrows to a point." },
  { name: "Traffic cone", material: "plastic", shape: "Cone", clue: "Its broad circular base tapers upward to a point." },
];

const INTRO_NARRATION = "Welcome to Chapter 4, Sorting Materials into Groups. In this activity, sort everyday objects according to their overall shape.";

const NARRATIONS = [
  "Observe the Rubber ball, made of rubber. It is round in every direction and has no flat face. Which shape group does it belong to?",
  "Observe the Orange, made of plant material. Although its surface is textured, its overall shape is nearly spherical. Which shape group does it belong to?",
  "Observe the Tin can, made of metal. It has two circular faces joined by one curved surface. Which shape group does it belong to?",
  "Observe the Piece of chalk, made of chalk. Its long body is curved and its two ends are circular. Which shape group does it belong to?",
  "Observe the Book, made of paper. It has six flat rectangular faces. Which shape group does it belong to?",
  "Observe the Wooden block, made of wood. Its faces are flat and its edges meet at corners. Which shape group does it belong to?",
  "Observe the Party hat, made of paper. It has one circular base and narrows to a point. Which shape group does it belong to?",
  "Observe the Traffic cone, made of plastic. Its broad circular base tapers upward to a point. Which shape group does it belong to?",
];
const COMPLETE_NARRATION = "Excellent work. You sorted all eight objects by shape. Objects made from different materials can belong to the same shape group.";

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

function drawCard(canvas: HTMLCanvasElement, objectIndex: number, feedback: string) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#10251f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#4ade80";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#86efac";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 1  •  Object ${Math.min(objectIndex + 1, OBJECTS.length)}/${OBJECTS.length}`, 24, 38);
  if (objectIndex >= OBJECTS.length) {
    context.fillStyle = "#ffffff";
    context.font = "bold 31px sans-serif";
    context.fillText("Sorting complete!", 24, 86);
    context.fillStyle = "#d1fae5";
    context.font = "20px sans-serif";
    wrapText(context, "Different materials can share the same shape. Shape is one useful property for grouping objects.", 24, 126, canvas.width - 48, 28);
    return;
  }
  const item = OBJECTS[objectIndex];
  context.fillStyle = "#ffffff";
  context.font = "bold 31px sans-serif";
  context.fillText(`Sort: ${item.name}`, 24, 82);
  context.fillStyle = "#d1fae5";
  context.font = "20px sans-serif";
  wrapText(context, `${item.material} • ${item.clue}`, 24, 122, canvas.width - 48, 27);
  context.fillStyle = feedback.startsWith("Try") ? "#fca5a5" : "#bbf7d0";
  context.font = "bold 19px sans-serif";
  context.fillText(feedback || "Choose: sphere, cylinder, cuboid, or cone", 24, 234);
}

function makeObject(item: (typeof OBJECTS)[number], index: number) {
  const material = new THREE.MeshStandardMaterial({
    color: [0x2563eb, 0xf97316, 0x94a3b8, 0xf8fafc, 0x0ea5e9, 0xa16207, 0xec4899, 0xf97316][index],
    roughness: index === 2 ? 0.3 : 0.72,
    metalness: index === 2 ? 0.6 : 0,
  });
  let geometry: THREE.BufferGeometry;
  if (item.shape === "Sphere") geometry = new THREE.SphereGeometry(0.23, 24, 18);
  else if (item.shape === "Cylinder") geometry = new THREE.CylinderGeometry(0.17, 0.17, 0.46, 24);
  else if (item.shape === "Cuboid") geometry = new THREE.BoxGeometry(0.52, 0.18, 0.38);
  else geometry = new THREE.ConeGeometry(0.25, 0.55, 24);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.name = `object-${index}`;
  return mesh;
}

export default function ShapeSortingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectIndexRef = useRef(0);
  const feedbackRef = useRef("");
  const cardNeedsUpdateRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [objectIndex, setObjectIndex] = useState(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr
        ?.isSessionSupported?.("immersive-vr")
        .then(setVrSupported)
        .catch(() => setVrSupported(false));
    }
  }, []);

  const announceCurrent = useCallback((index: number) => {
    if (index >= OBJECTS.length) {
      speakText(COMPLETE_NARRATION);
      return;
    }
    speakText(NARRATIONS[index]);
  }, []);

  const goToObject = useCallback((next: number) => {
    const safe = THREE.MathUtils.clamp(next, 0, OBJECTS.length);
    objectIndexRef.current = safe;
    feedbackRef.current = "";
    setObjectIndex(safe);
    setFeedback("");
    cardNeedsUpdateRef.current = true;
    announceCurrent(safe);
  }, [announceCurrent]);

  const sortInto = useCallback((group: ShapeGroup) => {
    const current = objectIndexRef.current;
    if (current >= OBJECTS.length) return;
    const item = OBJECTS[current];
    if (item.shape !== group) {
      const message = `Try again: ${item.clue}`;
      feedbackRef.current = message;
      setFeedback(message);
      cardNeedsUpdateRef.current = true;
      speakText(`Not quite. ${item.clue}`);
      return;
    }
    const message = `Correct! ${item.name} → ${group}`;
    feedbackRef.current = message;
    setFeedback(message);
    cardNeedsUpdateRef.current = true;
    speakText(`${message}.`);
    window.setTimeout(() => goToObject(current + 1), 650);
  }, [goToObject]);

  const sortCorrectly = useCallback(() => {
    const current = objectIndexRef.current;
    if (current < OBJECTS.length) sortInto(OBJECTS[current].shape);
  }, [sortInto]);

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
    scene.background = new THREE.Color(0x0b1f1a);
    scene.fog = new THREE.Fog(0x0b1f1a, 10, 24);
    const realisticEnvironment = applyRealisticEnvironment(scene, renderer, "/environments/materials-classroom-360.png");
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(0, 2.3, 5.3);
    camera.lookAt(0, 1.15, 0);
    scene.add(new THREE.HemisphereLight(0xd1fae5, 0x1c1917, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 7, 5);
    light.castShadow = true;
    scene.add(light);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: 0x25483d, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 2.5), new THREE.MeshStandardMaterial({ color: 0x7c4f2c, roughness: 0.85 }));
    table.position.y = 0.78;
    table.receiveShadow = true;
    scene.add(table);

    const objectMeshes = OBJECTS.map((item, index) => {
      const mesh = makeObject(item, index);
      mesh.position.set(0, 1.25, 0.15);
      scene.add(mesh);
      return mesh;
    });

    const bins: THREE.Mesh[] = [];
    GROUPS.forEach((group, index) => {
      const bin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.46, 0.22, 28, 1, true),
        new THREE.MeshStandardMaterial({ color: group.color, transparent: true, opacity: 0.72, roughness: 0.65, side: THREE.DoubleSide }),
      );
      bin.position.set(-2.1 + index * 1.4, 0.99, -0.68);
      bin.name = `bin-${group.name}`;
      scene.add(bin);
      bins.push(bin);

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256;
      labelCanvas.height = 80;
      const labelContext = labelCanvas.getContext("2d");
      if (labelContext) {
        labelContext.fillStyle = "#10251f";
        labelContext.fillRect(0, 0, 256, 80);
        labelContext.fillStyle = "#ffffff";
        labelContext.font = "bold 28px sans-serif";
        labelContext.textAlign = "center";
        labelContext.fillText(group.name, 128, 50);
      }
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.28), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) }));
      label.position.set(bin.position.x, 1.14, -1.23);
      scene.add(label);
    });

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.09), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(0, 2.65, -1.55);
    scene.add(card);

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(bins)[0];
      if (hit) sortInto(hit.object.name.replace("bin-", "") as ShapeGroup);
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0x86efac }));
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
      onPrimary: sortCorrectly,
      onBack: () => goToObject(objectIndexRef.current - 1),
      onNarrate: () => announceCurrent(objectIndexRef.current),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      questVr.update();
      const elapsed = clock.getElapsedTime();
      const current = objectIndexRef.current;
      objectMeshes.forEach((mesh, index) => {
        if (index === current && current < OBJECTS.length) {
          mesh.visible = true;
          mesh.position.set(0, 1.27 + Math.sin(elapsed * 2.1) * 0.04, 0.15);
          mesh.rotation.y = elapsed * 0.45;
          mesh.scale.setScalar(1.25);
        } else if (index < current) {
          mesh.visible = true;
          const groupIndex = GROUPS.findIndex((group) => group.name === OBJECTS[index].shape);
          const sameShapeBefore = OBJECTS.slice(0, index).filter((item) => item.shape === OBJECTS[index].shape).length;
          mesh.position.set(-2.1 + groupIndex * 1.4 + (sameShapeBefore ? 0.18 : -0.18), 1.11, -0.68);
          mesh.scale.setScalar(0.55);
        } else mesh.visible = false;
      });
      if (cardNeedsUpdateRef.current) {
        drawCard(cardCanvas, current, feedbackRef.current);
        cardTexture.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0, "");
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
  }, [announceCurrent, goToObject, sortCorrectly, sortInto]);

  const enterVR = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> } }).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: ["bounded-floor", "hand-tracking"] });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      window.setTimeout(() => announceCurrent(objectIndexRef.current), 900);
    } catch {
      setVrSupported(false);
    }
  }, [announceCurrent]);

  const complete = objectIndex >= OBJECTS.length;
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#0b1f1a" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #166534 0%, #0b1f1a 72%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>⚽🥫📘🔺</div>
            <div style={{ margin: "14px 0 10px", color: "#86efac", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Class 6 • Chapter 4 • Activity 1</div>
            <h1 style={{ color: "#ecfdf5", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.08, margin: "0 0 14px" }}>Sorting Materials According to Their Shape</h1>
            <p style={{ color: "#d1fae5", lineHeight: 1.7 }}>Observe eight everyday objects and group them as spheres, cylinders, cuboids, or cones.</p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}
              <button onClick={() => { setStarted(true); speakText(INTRO_NARRATION); window.setTimeout(() => announceCurrent(0), 1200); }} style={secondaryButtonStyle}>💻 View in Browser</button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <>
          <aside style={{ position: "absolute", top: 70, right: 16, width: 360, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(11,31,26,0.95)", border: "1px solid rgba(74,222,128,0.42)", color: "#ecfdf5", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#86efac", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity 1 • {complete ? "Complete" : `Object ${objectIndex + 1}/${OBJECTS.length}`}</div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>{complete ? "Excellent sorting!" : OBJECTS[objectIndex].name}</h2>
            <p style={bodyCopyStyle}>{complete ? "Different materials can have the same shape. Shape is one observable property we can use to group objects." : `${OBJECTS[objectIndex].material} • ${OBJECTS[objectIndex].clue}`}</p>
            {!complete && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                {GROUPS.map((group) => <button key={group.name} onClick={() => sortInto(group.name)} style={{ ...shapeButtonStyle, borderColor: group.css, color: group.css }}>{group.name}</button>)}
              </div>
            )}
            <div role="status" style={{ minHeight: 42, marginTop: 12, color: feedback.startsWith("Try") ? "#fca5a5" : "#bbf7d0", fontSize: "0.8rem", lineHeight: 1.5, textAlign: "center" }}>{complete ? "8 of 8 objects sorted correctly" : feedback || "Select the matching shape group"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => goToObject(objectIndex - 1)} disabled={objectIndex === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => announceCurrent(objectIndex)} style={navButtonStyle}>🔊 Narrate</button>
            </div>
            {complete && <button onClick={() => goToObject(0)} style={primaryButtonStyle}>Sort again</button>}
            {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
          </aside>
          <div style={{ position: "absolute", bottom: 16, left: 16, color: "#bbf7d0", fontSize: "0.75rem" }}>Quest: trigger selects a bin • A sorts • B/right grip exits VR • Y goes back • joysticks move and turn</div>
        </>
      )}
    </div>
  );
}

const primaryButtonStyle = { width: "100%", padding: "11px 16px", borderRadius: 9, border: 0, background: "linear-gradient(135deg, #22c55e, #15803d)", color: "#ffffff", fontWeight: 800, cursor: "pointer" } as const;
const secondaryButtonStyle = { ...primaryButtonStyle, marginTop: 10, border: "1px solid rgba(74,222,128,0.42)", background: "rgba(74,222,128,0.1)", color: "#bbf7d0" } as const;
const shapeButtonStyle = { padding: "12px 10px", borderRadius: 9, border: "1px solid", background: "rgba(255,255,255,0.04)", fontWeight: 800, cursor: "pointer" } as const;
const bodyCopyStyle = { margin: "0 0 13px", color: "#d1fae5", fontSize: "0.85rem", lineHeight: 1.6 } as const;
const navButtonStyle = { flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#d1fae5", cursor: "pointer" } as const;
