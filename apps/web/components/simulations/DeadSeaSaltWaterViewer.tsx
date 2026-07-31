"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Meet the Dead Sea",
    cue: "Explore a landlocked salt lake with calm water, an arid mountain basin and salt crystals along the shore.",
    detail: "The Dead Sea is a lake, not an ocean. Water flows in and evaporates, while much of its dissolved salt remains behind.",
    action: "Compare the waters",
  },
  {
    title: "Fresh Water and Salt Water",
    cue: "Inspect two equal tanks. The left tank contains fresh water; the right tank will become a concentrated salt solution.",
    detail: "The same volume of salt water contains dissolved material as well as water, so it has more mass and a greater density.",
    action: "Pour in the salt",
  },
  {
    title: "Dissolve the Salt",
    cue: "Watch salt crystals separate into particles and spread through the right tank.",
    detail: "Dissolved salt does not vanish. Its particles mix among the water particles, increasing the solution's density.",
    action: "Test fresh water",
  },
  {
    title: "Egg in Fresh Water",
    cue: "Release an egg into the left tank and follow its journey.",
    detail: "The egg sinks because its average density is greater than the fresh water around it.",
    action: "Test salt water",
  },
  {
    title: "Egg in Salt Water",
    cue: "Release the same kind of egg into the concentrated salt solution.",
    detail: "The denser salt water produces a stronger upward buoyant force for the same displaced volume, so the egg rises and floats.",
    action: "Reveal the forces",
  },
  {
    title: "Why Floating Is Easier",
    cue: "Observe a reclining swimmer model and compare the upward push of the water with the downward pull of weight.",
    detail: "A person's weight does not disappear. Dense salt water supplies a larger upward force, making the body easier to support near the surface.",
    action: "Explore salt-water effects",
  },
  {
    title: "Effects of Very Salty Water",
    cue: "Study salt crystals, a freshwater-life comparison and safe-use reminders.",
    detail: "Extreme salinity is unsuitable for most familiar fish and aquatic plants, though some microorganisms survive. The water must not be drunk or allowed into eyes or open cuts.",
    action: "Complete the investigation",
  },
  {
    title: "Salt, Density and Buoyancy",
    cue: "Review the complete chain: evaporation concentrates salt, dissolved salt raises density, and denser water increases buoyant support.",
    detail: "Salt does not make an object lighter. It changes the water, so the upward force can balance the object's weight sooner.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 7, Experiments with Water, Activity 2, Dead Sea: Salt Water and Its Effects. The Dead Sea is a landlocked salt lake in a hot, dry basin. Water evaporates strongly, but dissolved salts remain, so the lake becomes extremely salty.",
  "Compare the two tanks. The left contains fresh water. The right will contain concentrated salt water. Equal volumes do not have equal mass: dissolved salt adds matter, so the salt solution has greater density.",
  "Pour the salt into the right tank. The crystals break into particles too small to see and spread among the water particles. The salt has not vanished. It remains dissolved and increases the density of the solution.",
  "Now release an egg into fresh water. The egg moves downward and settles near the bottom because its average density is greater than the density of fresh water.",
  "Release the same kind of egg into concentrated salt water. It drops briefly, then rises toward the surface. Denser salt water gives a stronger upward buoyant force for the same volume of displaced water, allowing the egg to float.",
  "The swimmer model shows the same principle. Gravity still pulls the body downward, but dense salt water provides a larger upward push. When the forces balance, the body rests high near the surface. Floating is easier, but normal water-safety rules still apply.",
  "Very salty water has important effects. Salt crystals can form as water evaporates. The extreme salinity is unsuitable for most familiar fish and aquatic plants, although some salt-tolerant microorganisms can survive. Never drink the water, and keep it away from eyes and open cuts.",
  "You have completed the investigation. Evaporation concentrates dissolved salts. Dissolved salt increases the water's density. Denser water can provide more buoyant support, so an egg or a person floats higher. The salt changes the water; it does not make the floating object lighter.",
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
  context.fillStyle = "#123047";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#a5f3fc";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#e0f2fe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 27);
  context.fillStyle = "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(stage === STAGES.length - 1 ? "Salt ↑  Density ↑  Buoyant support ↑" : `Action: ${STAGES[stage].action}`, 24, 244);
}

function makeTank(x: number, waterColor: number) {
  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 1.03, 1.08),
    new THREE.MeshPhysicalMaterial({
      color: waterColor,
      transparent: true,
      opacity: 0.46,
      transmission: 0.22,
      roughness: 0.08,
      depthWrite: false,
    }),
  );
  water.position.y = 1.18;
  group.add(water);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe0faff,
    transparent: true,
    opacity: 0.22,
    transmission: 0.55,
    roughness: 0.08,
    side: THREE.DoubleSide,
  });
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.42, 0.045), glassMaterial);
  front.position.set(0, 1.2, 0.57);
  const back = front.clone();
  back.position.z = -0.57;
  const sideA = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.42, 1.18), glassMaterial);
  sideA.position.set(-0.74, 1.2, 0);
  const sideB = sideA.clone();
  sideB.position.x = 0.74;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.05, 1.18), glassMaterial);
  bottom.position.y = 0.49;
  group.add(front, back, sideA, sideB, bottom);
  group.position.x = x;
  return { group, water };
}

function makeEgg(color: number) {
  const egg = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 28, 20),
    new THREE.MeshStandardMaterial({ color, roughness: 0.48 }),
  );
  egg.scale.set(0.84, 1.16, 0.84);
  egg.castShadow = true;
  return egg;
}

function makeArrow(color: number, direction: 1 | -1) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 12), material);
  shaft.position.y = direction * 0.36;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.25, 16), material);
  head.position.y = direction * 0.84;
  if (direction < 0) head.rotation.z = Math.PI;
  group.add(shaft, head);
  return group;
}

function makeFloatingSwimmer() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98962, roughness: 0.8 });
  const clothing = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.68 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), skin);
  head.position.x = -0.83;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.72, 8, 16), clothing);
  torso.rotation.z = Math.PI / 2;
  const legs = [-0.16, 0.16].map((z) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.65, 7, 12), skin);
    leg.rotation.z = Math.PI / 2;
    leg.position.set(0.72, 0, z);
    return leg;
  });
  const arms = [-0.34, 0.34].map((z) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.48, 7, 12), skin);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-0.04, 0, z);
    return arm;
  });
  group.add(head, torso, ...legs, ...arms);
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return group;
}

export default function DeadSeaSaltWaterViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const stageStartRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
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
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    stageStartRef.current = performance.now() / 1000;
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
    scene.fog = new THREE.Fog(0xc8dfdf, 20, 42);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/dead-sea-salt-shore-360.png",
      { exposure: 1.02, intensity: 0.46 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 75);
    camera.position.set(0, 2.08, 5.3);
    camera.lookAt(0, 1.12, 0);
    scene.add(new THREE.HemisphereLight(0xf0fdff, 0x6b5741, 1.85));
    const sun = new THREE.DirectionalLight(0xfff4dc, 2.2);
    sun.position.set(-4, 8, 3);
    sun.castShadow = true;
    scene.add(sun);

    const shore = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 64),
      new THREE.MeshStandardMaterial({ color: 0xbca987, roughness: 0.98, transparent: true, opacity: 0.74 }),
    );
    shore.rotation.x = -Math.PI / 2;
    shore.receiveShadow = true;
    scene.add(shore);

    const experimentTable = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.18, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x8c7658, roughness: 0.82 }),
    );
    experimentTable.position.y = 0.42;
    experimentTable.receiveShadow = true;
    scene.add(experimentTable);

    const freshTank = makeTank(-0.88, 0x2aa9dd);
    const saltTank = makeTank(0.88, 0x0e94b8);
    scene.add(freshTank.group, saltTank.group);

    const freshEgg = makeEgg(0xf8e6c6);
    freshEgg.position.set(-0.88, 2.25, 0);
    freshEgg.visible = false;
    scene.add(freshEgg);
    const saltEgg = makeEgg(0xffedd5);
    saltEgg.position.set(0.88, 2.25, 0);
    saltEgg.visible = false;
    scene.add(saltEgg);

    const saltGrains: THREE.Mesh[] = [];
    for (let index = 0; index < 70; index++) {
      const grain = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.025 + (index % 3) * 0.008, 0),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72, transparent: true, opacity: 0.88 }),
      );
      grain.userData.offset = index / 70;
      grain.position.set(0.35 + ((index * 0.37) % 1.1), 2.6, -0.45 + ((index * 0.23) % 0.9));
      grain.visible = false;
      scene.add(grain);
      saltGrains.push(grain);
    }

    const saltScoop = new THREE.Group();
    const scoopBowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xb7c1c8, metalness: 0.72, roughness: 0.25, side: THREE.DoubleSide }),
    );
    scoopBowl.rotation.x = Math.PI;
    const scoopHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.28 }),
    );
    scoopHandle.rotation.z = Math.PI / 2;
    scoopHandle.position.x = -0.4;
    saltScoop.add(scoopBowl, scoopHandle);
    saltScoop.position.set(0.9, 2.55, 0);
    saltScoop.rotation.z = -0.35;
    saltScoop.visible = false;
    scene.add(saltScoop);

    const ripples: THREE.Mesh[] = [];
    for (const x of [-0.88, 0.88]) {
      for (let index = 0; index < 3; index++) {
        const ripple = new THREE.Mesh(
          new THREE.TorusGeometry(0.11 + index * 0.08, 0.01, 8, 30),
          new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.65 }),
        );
        ripple.rotation.x = Math.PI / 2;
        ripple.position.set(x, 1.71, 0);
        ripple.userData.tankX = x;
        ripple.userData.index = index;
        ripple.visible = false;
        scene.add(ripple);
        ripples.push(ripple);
      }
    }

    const lakeSlice = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 0.22, 64),
      new THREE.MeshPhysicalMaterial({ color: 0x0d9ac2, transparent: true, opacity: 0.6, roughness: 0.12, transmission: 0.18 }),
    );
    lakeSlice.position.set(0, 0.65, -1.8);
    lakeSlice.visible = false;
    scene.add(lakeSlice);
    const swimmer = makeFloatingSwimmer();
    swimmer.position.set(0, 0.85, -1.55);
    swimmer.visible = false;
    scene.add(swimmer);
    const upwardArrow = makeArrow(0x22d3ee, 1);
    upwardArrow.position.set(0, 0.84, -1.55);
    upwardArrow.visible = false;
    scene.add(upwardArrow);
    const downwardArrow = makeArrow(0xfb923c, -1);
    downwardArrow.position.set(0, 1.72, -1.55);
    downwardArrow.visible = false;
    scene.add(downwardArrow);

    const saltCrystals = new THREE.Group();
    for (let index = 0; index < 36; index++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.06 + (index % 4) * 0.018, 0),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.52, metalness: 0.05 }),
      );
      const angle = (index / 36) * Math.PI * 2;
      crystal.position.set(Math.cos(angle) * (2.25 + (index % 3) * 0.12), 0.12, Math.sin(angle) * 1.65);
      crystal.rotation.set(index * 0.31, index * 0.19, index * 0.11);
      saltCrystals.add(crystal);
    }
    saltCrystals.visible = false;
    scene.add(saltCrystals);

    const fishGroup = new THREE.Group();
    for (let index = 0; index < 5; index++) {
      const fish = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        new THREE.MeshStandardMaterial({ color: [0xf59e0b, 0x22c55e, 0x3b82f6][index % 3], roughness: 0.7 }),
      );
      fish.scale.set(1.65, 0.75, 0.45);
      fish.position.set(-0.88 + ((index % 2) - 0.5) * 0.48, 0.86 + Math.floor(index / 2) * 0.24, (index % 3 - 1) * 0.22);
      fish.userData.phase = index * 0.7;
      fishGroup.add(fish);
    }
    fishGroup.visible = false;
    scene.add(fishGroup);

    const microbeGroup = new THREE.Group();
    for (let index = 0; index < 18; index++) {
      const microbe = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + (index % 3) * 0.008, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.78 }),
      );
      microbe.position.set(0.45 + ((index * 0.37) % 0.86), 0.75 + ((index * 0.19) % 0.7), -0.35 + ((index * 0.23) % 0.7));
      microbe.userData.phase = index * 0.5;
      microbeGroup.add(microbe);
    }
    microbeGroup.visible = false;
    scene.add(microbeGroup);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 1.11), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.4, 2.82, -2.15);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22 }),
      );
      button.name = name;
      button.position.set(x, 1.12, -1.62);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.82);
    const actionButton = makeButton("btn-action", 0x0891b2, 0);
    actionButton.scale.x = 1.34;
    const nextButton = makeButton("btn-next", 0x2563eb, 0.82);
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
    controls.maxDistance = 7.8;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const currentStage = stageRef.current;
      const stageAge = Math.max(0, performance.now() / 1000 - stageStartRef.current);
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      freshTank.group.visible = currentStage >= 1 && currentStage !== 5;
      saltTank.group.visible = currentStage >= 1 && currentStage !== 5;
      saltScoop.visible = currentStage === 2;
      saltGrains.forEach((grain, index) => {
        const pouring = currentStage === 2;
        const dissolved = currentStage >= 3 && currentStage !== 5;
        grain.visible = pouring || dissolved;
        if (pouring) {
          const fall = (stageAge * 0.42 + (grain.userData.offset as number)) % 1;
          grain.position.set(0.55 + ((index * 0.37) % 0.72), 2.45 - fall * 1.55, -0.38 + ((index * 0.23) % 0.76));
          grain.scale.setScalar(1 - fall * 0.55);
        } else if (dissolved) {
          grain.position.set(0.35 + ((index * 0.37) % 1.08), 0.72 + ((index * 0.19) % 0.88), -0.44 + ((index * 0.23) % 0.88));
          grain.scale.setScalar(0.38);
          grain.position.y += Math.sin(elapsed * 1.3 + index) * 0.012;
        }
      });
      freshEgg.visible = currentStage === 3 || currentStage === 7;
      saltEgg.visible = currentStage === 4 || currentStage === 7;
      if (freshEgg.visible) {
        const progress = currentStage === 7 ? 1 : 1 - Math.exp(-stageAge * 2.1);
        freshEgg.position.set(-0.88, THREE.MathUtils.lerp(2.24, 0.73, progress), 0);
        freshEgg.rotation.z += 0.004;
      }
      if (saltEgg.visible) {
        const progress = currentStage === 7 ? 1 : 1 - Math.exp(-stageAge * 2.15);
        const dip = stageAge < 0.72 ? THREE.MathUtils.lerp(2.24, 1.2, Math.min(stageAge / 0.72, 1)) : THREE.MathUtils.lerp(1.2, 1.59, Math.min((stageAge - 0.72) / 1.2, 1));
        saltEgg.position.set(0.88, currentStage === 7 ? 1.59 : dip, 0);
        saltEgg.rotation.z = Math.sin(elapsed * 1.5) * 0.05;
      }
      ripples.forEach((ripple) => {
        const freshRipple = ripple.userData.tankX < 0 && (currentStage === 3 || currentStage === 7);
        const saltRipple = ripple.userData.tankX > 0 && (currentStage === 4 || currentStage === 7);
        ripple.visible = freshRipple || saltRipple;
        if (ripple.visible) {
          const wave = (elapsed * 0.48 + (ripple.userData.index as number) * 0.26) % 1;
          ripple.scale.setScalar(0.45 + wave * 1.45);
          (ripple.material as THREE.MeshBasicMaterial).opacity = (1 - wave) * 0.6;
        }
      });
      const showForces = currentStage === 5 || currentStage === 7;
      lakeSlice.visible = showForces;
      swimmer.visible = showForces;
      upwardArrow.visible = currentStage === 5;
      downwardArrow.visible = currentStage === 5;
      if (swimmer.visible) swimmer.position.y = 0.87 + Math.sin(elapsed * 1.35) * 0.025;
      if (upwardArrow.visible) upwardArrow.scale.y = 0.95 + Math.sin(elapsed * 2.1) * 0.08;
      if (downwardArrow.visible) downwardArrow.scale.y = 0.95 - Math.sin(elapsed * 2.1) * 0.08;
      const showEffects = currentStage === 6 || currentStage === 7;
      saltCrystals.visible = showEffects;
      fishGroup.visible = currentStage === 6;
      microbeGroup.visible = currentStage === 6;
      fishGroup.children.forEach((fish) => {
        fish.position.x += Math.sin(elapsed * 1.4 + (fish.userData.phase as number)) * 0.0008;
        fish.rotation.y = Math.sin(elapsed + (fish.userData.phase as number)) * 0.22;
      });
      microbeGroup.children.forEach((microbe) => {
        microbe.position.y += Math.sin(elapsed * 1.2 + (microbe.userData.phase as number)) * 0.0007;
      });
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;
    stageStartRef.current = performance.now() / 1000;

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
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#123047" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #0e7490 0%, #123047 76%)" }}>
          <div style={{ maxWidth: 660, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🧂💧🥚</div>
            <div style={{ margin: "14px 0 10px", color: "#67e8f9", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 7 • Activity 2
            </div>
            <h1 style={{ color: "#f0fdff", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              Dead Sea: Salt Water and Its Effects
            </h1>
            <p style={{ color: "#cffafe", lineHeight: 1.7 }}>
              Dissolve salt, compare an egg in fresh and salt water, reveal the forces on a floating body, and explore the effects of extreme salinity.
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 360, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(18,48,71,0.95)", border: "1px solid rgba(103,232,249,0.42)", color: "#f0fdff", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#67e8f9", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 2 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>{STAGES[stage].title}</h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div style={{ padding: 11, borderRadius: 9, background: "rgba(103,232,249,0.08)", border: "1px solid rgba(103,232,249,0.2)", marginBottom: 13 }}>
              <div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div>
            </div>
            <button onClick={performAction} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1 }}>
              {STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button>
              <button onClick={() => goToStage(stage + 1)} disabled={stage === STAGES.length - 1} style={navButtonStyle}>Next →</button>
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
