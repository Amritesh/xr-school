"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Meet the Anopheles Cycle",
    cue: "Discover the four connected stages of a malaria-carrying mosquito.",
    detail: "Anopheles mosquitoes pass through egg, larva, pupa and adult stages. The first three stages depend on water; only the adult flies.",
    action: "Begin with the eggs",
  },
  {
    title: "Eggs Float on Water",
    cue: "Watch a female Anopheles lay separate floating eggs.",
    detail: "A female lays eggs one at a time directly on water. Anopheles eggs have small side floats and do not tolerate drying out.",
    action: "Hatch the eggs",
  },
  {
    title: "Larvae — The Wigglers",
    cue: "Observe legless larvae feeding and breathing near the surface.",
    detail: "Larvae live in water, feed on tiny organisms and moult four times. Anopheles larvae have no breathing siphon, so they rest parallel to the water surface.",
    action: "Complete the fourth moult",
  },
  {
    title: "Pupae — The Tumblers",
    cue: "Follow the comma-shaped pupae as the adults form inside.",
    detail: "A pupa lives in water and breathes at the surface, but it does not feed. Its body changes dramatically during metamorphosis.",
    action: "Begin emergence",
  },
  {
    title: "Adult Emerges",
    cue: "Watch the pupal case split and the adult rise above the water.",
    detail: "The adult carefully emerges onto the water surface, rests while its body and wings harden, and then flies away.",
    action: "Follow the adult",
  },
  {
    title: "The Adult Female",
    cue: "See how an adult female continues the next generation.",
    detail: "Male and female mosquitoes use plant sugars for energy. Only females bite; a female needs a blood meal to develop eggs. A mosquito carries malaria only after becoming infected with Plasmodium.",
    action: "Continue the cycle",
  },
  {
    title: "Protect the Community",
    cue: "Identify safe actions that interrupt mosquito breeding and reduce bites.",
    detail: "Empty, scrub, cover or turn over household containers that collect water. Use bed nets and screens. Let trained community teams manage larger habitats and any mosquito-control products.",
    action: "Review the complete cycle",
  },
  {
    title: "Life Cycle Mastered",
    cue: "Trace the repeating sequence: egg, larva, pupa and adult.",
    detail: "Egg, larva and pupa are aquatic stages. The adult is the flying stage. Anopheles development from egg to adult often takes about 10 to 14 days, depending on species and conditions.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 8, A Treat for Mosquitoes, Activity 2, Life Cycle of the Mosquito. A malaria-carrying Anopheles mosquito passes through four stages: egg, larva, pupa and adult. The first three stages depend on water, while the adult can fly.",
  "An adult female Anopheles lays eggs one at a time directly on water. Each egg floats at the surface with tiny side floats. Unlike the eggs of some other mosquitoes, Anopheles eggs do not tolerate drying out.",
  "The eggs hatch into larvae. These legless wigglers live in water, feed on tiny organisms and moult four times as they grow. Anopheles larvae do not have a breathing siphon, so they usually lie parallel to the water surface and breathe through spiracles on the abdomen.",
  "After the fourth larval stage comes the comma-shaped pupa, sometimes called a tumbler. It remains in water and breathes at the surface, but it does not feed. Inside, metamorphosis changes the larva into an adult mosquito.",
  "The pupal case splits and the adult mosquito carefully emerges onto the water surface. It rests while its body and wings harden. When it is ready, the new adult takes its first flight.",
  "Adult males and females use plant sugars for energy. Only female mosquitoes bite people or animals. A female needs a blood meal to develop eggs, then returns to water to lay them. A mosquito can spread malaria only after it becomes infected with Plasmodium parasites.",
  "We can interrupt mosquito breeding around homes by emptying and scrubbing water containers, covering stored water, clearing blocked drains, and turning over unused items that collect rain. Bed nets and screens reduce bites. Larger habitats and mosquito-control products should be managed by trained adults and community teams.",
  "You have completed the Anopheles mosquito life cycle: egg, larva, pupa and adult. The first three stages are aquatic, and the adult is the flying stage. Development from egg to adult often takes about ten to fourteen days, depending on the species and conditions.",
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
  context.fillStyle = "#102a2d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#67e8f9";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#cffafe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = stage === STAGES.length - 1 ? "#86efac" : "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(
    stage === STAGES.length - 1 ? "Egg → Larva → Pupa → Adult → Egg" : `Action: ${STAGES[stage].action}`,
    24,
    245,
  );
}

function segmentBetween(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = to.clone().sub(from);
  const segment = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.82, direction.length(), 7),
    material,
  );
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return segment;
}

function makeAnophelesEgg() {
  const egg = new THREE.Group();
  egg.name = "Anopheles egg with lateral floats";
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0x37322e, roughness: 0.72 }),
  );
  body.scale.set(1.8, 0.54, 0.58);
  const floatMaterial = new THREE.MeshStandardMaterial({ color: 0xd5cbb7, roughness: 0.86 });
  for (const side of [-1, 1]) {
    const lateralFloat = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), floatMaterial);
    lateralFloat.name = "lateralFloat";
    lateralFloat.scale.set(1.25, 0.4, 0.7);
    lateralFloat.position.z = side * 0.048;
    egg.add(lateralFloat);
  }
  egg.add(body);
  return egg;
}

function makeLarva(index: number) {
  const larva = new THREE.Group();
  larva.name = "Anopheles larva parallel to water surface";
  larva.userData.phase = index * 0.9;
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0x7b5b35, roughness: 0.86 });
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xb69356, roughness: 0.9 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), headMaterial);
  head.position.x = -0.34;
  larva.add(head);
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), bodyMaterial);
  thorax.position.x = -0.21;
  larva.add(thorax);
  for (let segment = 0; segment < 8; segment += 1) {
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.052 - segment * 0.002, 12, 8), bodyMaterial);
    abdomen.name = "larvalAbdomen";
    abdomen.position.x = -0.08 + segment * 0.095;
    abdomen.scale.set(1.18, 0.72, 0.78);
    abdomen.userData.segment = segment;
    larva.add(abdomen);
  }
  const brushMaterial = new THREE.LineBasicMaterial({ color: 0x5a3d25, transparent: true, opacity: 0.84 });
  for (const side of [-1, 1]) {
    for (let brush = 0; brush < 4; brush += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.385, 0, side * 0.018),
        new THREE.Vector3(-0.47, (brush - 1.5) * 0.015, side * (0.04 + brush * 0.008)),
      ]);
      larva.add(new THREE.Line(geometry, brushMaterial));
    }
  }
  return larva;
}

function makePupa(index: number) {
  const pupa = new THREE.Group();
  pupa.name = "comma-shaped mosquito pupa";
  pupa.userData.phase = index * 1.15;
  const shell = new THREE.MeshStandardMaterial({ color: 0x7b4d2c, roughness: 0.78 });
  const cephalothorax = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), shell);
  cephalothorax.scale.set(1.1, 0.9, 0.84);
  pupa.add(cephalothorax);
  for (let segment = 0; segment < 6; segment += 1) {
    const angle = segment * 0.34;
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.058 - segment * 0.004, 12, 8), shell);
    abdomen.position.set(0.1 + Math.sin(angle) * 0.23, -0.06 - (1 - Math.cos(angle)) * 0.25, 0);
    abdomen.scale.set(1.05, 0.72, 0.8);
    pupa.add(abdomen);
  }
  const trumpetMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.75 });
  for (const side of [-1, 1]) {
    const trumpet = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.11, 8), trumpetMaterial);
    trumpet.position.set(-0.03, 0.14, side * 0.055);
    pupa.add(trumpet);
  }
  return pupa;
}

function makeAdultAnopheles() {
  const mosquito = new THREE.Group();
  mosquito.name = "Realistic adult female Anopheles mosquito";
  const dark = new THREE.MeshStandardMaterial({ color: 0x29221f, roughness: 0.72 });
  const brown = new THREE.MeshStandardMaterial({ color: 0x5b4033, roughness: 0.8 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd8c9a9, roughness: 0.82 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x090706, roughness: 0.28 });
  const wingMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9eef0,
    transparent: true,
    opacity: 0.44,
    roughness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.064, 0.37, 12), brown);
  abdomen.rotation.z = Math.PI / 2;
  abdomen.position.x = 0.11;
  mosquito.add(abdomen);
  for (const x of [-0.01, 0.065, 0.14, 0.215]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.013, 12), pale);
    band.rotation.z = Math.PI / 2;
    band.position.x = x;
    mosquito.add(band);
  }
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), dark);
  thorax.scale.set(1.15, 0.92, 0.9);
  thorax.position.x = -0.13;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), brown);
  head.position.x = -0.255;
  mosquito.add(thorax, head);

  for (const side of [-1, 1]) {
    const compoundEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), eye);
    compoundEye.position.set(-0.277, 0.012, side * 0.035);
    compoundEye.scale.set(1, 0.9, 0.72);
    mosquito.add(compoundEye);
    const antennaBase = new THREE.Vector3(-0.285, 0.025, side * 0.024);
    const antennaJoint = new THREE.Vector3(-0.39, 0.065, side * 0.085);
    const antennaTip = new THREE.Vector3(-0.49, 0.09, side * 0.15);
    mosquito.add(
      segmentBetween(antennaBase, antennaJoint, 0.0038, dark),
      segmentBetween(antennaJoint, antennaTip, 0.0024, dark),
    );
    const palp = segmentBetween(
      new THREE.Vector3(-0.285, -0.012, side * 0.018),
      new THREE.Vector3(-0.47, -0.018, side * 0.035),
      0.0038,
      pale,
    );
    mosquito.add(palp);
    const wingPivot = new THREE.Group();
    wingPivot.position.set(-0.12, 0.045, side * 0.045);
    wingPivot.userData.wing = true;
    wingPivot.userData.side = side;
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.19, 30), wingMaterial);
    wing.scale.set(1.65, 0.52, 1);
    wing.rotation.x = Math.PI / 2;
    wing.position.set(0.09, 0, side * 0.16);
    wingPivot.add(wing);
    mosquito.add(wingPivot);
  }

  const proboscis = segmentBetween(
    new THREE.Vector3(-0.292, -0.005, 0),
    new THREE.Vector3(-0.59, -0.012, 0),
    0.0045,
    dark,
  );
  mosquito.add(proboscis);
  const origins = [-0.19, -0.12, -0.045];
  const sweep = [-0.17, 0.015, 0.2];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      const hip = new THREE.Vector3(origins[index], -0.035, side * 0.047);
      const knee = new THREE.Vector3(origins[index] + sweep[index] * 0.48, -0.16, side * (0.21 + index * 0.025));
      const ankle = new THREE.Vector3(origins[index] + sweep[index], -0.285, side * (0.43 + index * 0.045));
      const foot = new THREE.Vector3(ankle.x + sweep[index] * 0.25, -0.31, ankle.z + side * 0.12);
      mosquito.add(
        segmentBetween(hip, knee, 0.0048, brown),
        segmentBetween(knee, ankle, 0.0036, dark),
        segmentBetween(ankle, foot, 0.0023, pale),
      );
    }
  }
  mosquito.scale.setScalar(2.05);
  return mosquito;
}

function makeWaterContainer(x: number, z: number, color: number) {
  const group = new THREE.Group();
  const vessel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.3, 0.55, 24, 1, true),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82, side: THREE.DoubleSide }),
  );
  vessel.position.y = 0.35;
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7 }),
  );
  lid.position.y = 0.67;
  const check = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.035, 8, 22, Math.PI * 1.55),
    new THREE.MeshStandardMaterial({ color: 0x86efac, emissive: 0x22c55e, emissiveIntensity: 0.35 }),
  );
  check.rotation.z = -0.6;
  check.position.set(0, 1.05, 0);
  group.add(vessel, lid, check);
  group.position.set(x, 0, z);
  return group;
}

export default function MosquitoLifeCycleViewer() {
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
    scene.fog = new THREE.Fog(0xa8d0cb, 16, 36);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/mosquito-life-cycle-wetland-360.png",
      { exposure: 1.02, intensity: 0.48 },
    );
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 70);
    camera.position.set(0, 2.05, 5.15);
    camera.lookAt(0, 1.08, 0);
    scene.add(new THREE.HemisphereLight(0xe7fffb, 0x314b3b, 1.9));
    const sun = new THREE.DirectionalLight(0xfff2cf, 2.2);
    sun.position.set(-4, 7, 3);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x536f4a, roughness: 1, transparent: true, opacity: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.25, 3.45, 0.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x725a3e, roughness: 0.94 }),
    );
    platform.position.y = 0.1;
    platform.receiveShadow = true;
    scene.add(platform);
    const pondRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.12, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0x6f6c52, roughness: 0.95 }),
    );
    pondRim.rotation.x = Math.PI / 2;
    pondRim.position.y = 0.31;
    scene.add(pondRim);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.78, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x2798b5,
        transparent: true,
        opacity: 0.7,
        roughness: 0.14,
        metalness: 0.08,
        transmission: 0.1,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.32;
    scene.add(water);

    const eggs = Array.from({ length: 24 }, (_, index) => {
      const egg = makeAnophelesEgg();
      egg.userData.angle = (index / 24) * Math.PI * 2;
      egg.userData.radius = 0.35 + (index % 6) * 0.17;
      scene.add(egg);
      return egg;
    });
    const larvae = Array.from({ length: 8 }, (_, index) => {
      const larva = makeLarva(index);
      larva.scale.setScalar(0.72);
      scene.add(larva);
      return larva;
    });
    const pupae = Array.from({ length: 6 }, (_, index) => {
      const pupa = makePupa(index);
      pupa.scale.setScalar(0.8);
      scene.add(pupa);
      return pupa;
    });
    const adult = makeAdultAnopheles();
    scene.add(adult);

    const protectedContainers = [
      makeWaterContainer(-1.15, 0.2, 0x3b82f6),
      makeWaterContainer(0, -0.35, 0xd97706),
      makeWaterContainer(1.15, 0.2, 0x64748b),
    ];
    protectedContainers.forEach((container) => scene.add(container));

    const cycleRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.035, 8, 72),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0891b2, emissiveIntensity: 0.24 }),
    );
    cycleRing.rotation.x = Math.PI / 2;
    cycleRing.position.y = 0.39;
    scene.add(cycleRing);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 290;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 1.1), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.45, 2.48, -1.72);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.17, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.2, -1.5);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.8);
    const actionButton = makeButton("btn-action", 0x14b8a6, 0);
    actionButton.scale.x = 1.3;
    const nextButton = makeButton("btn-next", 0x38bdf8, 0.8);
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
      startPosition: new THREE.Vector3(0, 0, 2.45),
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.08, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.6;
    controls.maxDistance = 7.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const stageAge = Math.max(0, performance.now() / 1000 - stageStartRef.current);
      const currentStage = stageRef.current;
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }

      cycleRing.visible = currentStage === 0 || currentStage === 7;
      eggs.forEach((egg, index) => {
        egg.visible = currentStage === 1 || currentStage === 7;
        if (!egg.visible) return;
        if (currentStage === 7) {
          egg.position.set(-1.18 + (index % 6) * 0.1, 0.48, -0.52 + Math.floor(index / 6) * 0.08);
          egg.scale.setScalar(0.65);
        } else {
          const angle = egg.userData.angle as number;
          const radius = egg.userData.radius as number;
          egg.position.set(Math.cos(angle) * radius, 0.37 + Math.sin(elapsed * 1.4 + index) * 0.008, Math.sin(angle) * radius);
          egg.scale.setScalar(Math.min(Math.max(stageAge * 1.8 - index * 0.08, 0), 1));
          egg.rotation.y = angle;
        }
      });

      larvae.forEach((larva, index) => {
        larva.visible = currentStage === 2 || currentStage === 7;
        if (!larva.visible) return;
        const phase = larva.userData.phase as number;
        if (currentStage === 7) {
          larva.position.set(-0.75 + (index % 4) * 0.25, 0.58, 1.05 + Math.floor(index / 4) * 0.22);
          larva.scale.setScalar(0.42);
        } else {
          const angle = (index / larvae.length) * Math.PI * 2;
          larva.position.set(Math.cos(angle) * (0.55 + (index % 3) * 0.25), 0.48, Math.sin(angle) * (0.55 + (index % 3) * 0.25));
          larva.rotation.y = angle + Math.sin(elapsed * 4 + phase) * 0.28;
          larva.rotation.z = Math.sin(elapsed * 7 + phase) * 0.08;
          larva.children.forEach((part) => {
            if (part.userData.segment !== undefined) {
              part.position.y = Math.sin(elapsed * 8 + phase + (part.userData.segment as number) * 0.7) * 0.018;
            }
          });
        }
      });

      pupae.forEach((pupa, index) => {
        pupa.visible = currentStage === 3 || (currentStage === 4 && index === 0) || currentStage === 7;
        if (!pupa.visible) return;
        const phase = pupa.userData.phase as number;
        if (currentStage === 7) {
          pupa.position.set(0.82 + (index % 3) * 0.22, 0.58, 0.76 + Math.floor(index / 3) * 0.28);
          pupa.scale.setScalar(0.5);
          pupa.rotation.set(0, 0, 0);
        } else if (currentStage === 4) {
          pupa.position.set(0, 0.5, 0);
          pupa.scale.setScalar(Math.max(0.35, 0.8 - Math.min(stageAge, 1.8) * 0.22));
        } else {
          const angle = (index / pupae.length) * Math.PI * 2;
          pupa.position.set(Math.cos(angle) * 0.85, 0.5 + Math.sin(elapsed * 2.8 + phase) * 0.035, Math.sin(angle) * 0.85);
          pupa.rotation.z = Math.sin(elapsed * 4.2 + phase) * 0.34;
          pupa.rotation.y = angle;
        }
      });

      adult.visible = currentStage === 0 || currentStage === 1 || currentStage === 4 || currentStage === 5 || currentStage === 7;
      if (adult.visible) {
        adult.children.forEach((child) => {
          if (child.userData.wing) child.rotation.x = Math.sin(elapsed * 46) * 0.9 * (child.userData.side as number);
        });
        if (currentStage === 4) {
          const emergence = Math.min(stageAge / 3.2, 1);
          adult.position.set(0, 0.66 + emergence * 1.1, 0);
          adult.rotation.set(0, -0.3, 0.28 - emergence * 0.28);
          adult.scale.setScalar(0.72 + emergence * 0.28);
        } else if (currentStage === 5) {
          const x = Math.sin(elapsed * 0.92) * 1.05 + Math.sin(elapsed * 2.4) * 0.16;
          const y = 1.68 + Math.sin(elapsed * 1.6) * 0.2;
          const z = Math.cos(elapsed * 0.78) * 0.45 + Math.sin(elapsed * 2.1) * 0.1;
          const dx = Math.cos(elapsed * 0.92) * 0.966 + Math.cos(elapsed * 2.4) * 0.384;
          const dz = -Math.sin(elapsed * 0.78) * 0.351 + Math.cos(elapsed * 2.1) * 0.21;
          adult.position.set(x, y, z);
          adult.rotation.y = Math.atan2(-dz, dx);
          adult.rotation.z = Math.sin(elapsed * 1.6) * 0.08;
          adult.scale.setScalar(1);
        } else if (currentStage === 7) {
          adult.position.set(1.2, 1.65, -0.7);
          adult.rotation.set(0, -0.8, 0);
          adult.scale.setScalar(0.76);
        } else {
          adult.position.set(0.9 + Math.sin(elapsed * 0.7) * 0.28, 1.55 + Math.sin(elapsed * 1.8) * 0.08, -0.2);
          adult.rotation.y = -elapsed * 0.7;
          adult.scale.setScalar(0.9);
        }
      }

      protectedContainers.forEach((container, index) => {
        container.visible = currentStage === 6;
        if (container.visible) {
          container.position.y = Math.sin(elapsed * 1.8 + index) * 0.025;
        }
      });
      water.scale.setScalar(currentStage === 6 ? 0.56 : 1);
      water.material.opacity = currentStage === 6 ? 0.42 : 0.7;

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
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#102a2d" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #1f6665 0%, #102a2d 73%)" }}>
          <div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 76 }}>🥚〰️🦟💧</div>
            <div style={{ margin: "14px 0 10px", color: "#67e8f9", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Class 5 • Chapter 8 • Activity 2
            </div>
            <h1 style={{ color: "#ecfeff", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>
              Life Cycle of the Mosquito
            </h1>
            <p style={{ color: "#cffafe", lineHeight: 1.7 }}>
              Enter a wetland nursery and follow an Anopheles mosquito through egg, larva, pupa and adult.
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
          <aside style={{ position: "absolute", top: 70, right: 16, width: 350, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(16,42,45,0.95)", border: "1px solid rgba(103,232,249,0.42)", color: "#ecfeff", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#67e8f9", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Activity 2 • Stage {stage + 1}/{STAGES.length}
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
            <div role="status" style={{ marginTop: 12, color: stage === 7 ? "#86efac" : "#fde68a", fontSize: "0.76rem", lineHeight: 1.5, textAlign: "center" }}>
              {stage === 7 ? "Cycle complete • Four life stages mastered" : `${stage} of 7 lifecycle discoveries completed`}
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
  background: "linear-gradient(135deg, #14b8a6, #0e7490)",
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
