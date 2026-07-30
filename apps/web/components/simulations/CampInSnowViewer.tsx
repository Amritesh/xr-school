"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Reach the 2,134 Metre Camp",
    cue: "Survey the snowy campsite and choose a safe, level place for the night.",
    detail:
      "On 18 February 1984, the group stopped at 2,134 metres. A trained leader checks the weather, wind, ground and distance from steep slopes before anyone begins.",
    action: "Choose the tent site",
  },
  {
    title: "Build a Double-Layer Tent",
    cue: "Place one sheet on the ground and raise two separated tent layers.",
    detail:
      "The story describes double-layered plastic sheets for both the tent and ground. Still air trapped between the layers slows heat transfer and helps the inside stay warmer.",
    action: "Raise the double layers",
  },
  {
    title: "Secure Pegs and Guy Lines",
    cue: "Push every peg firmly and tighten opposite guy lines against the wind.",
    detail:
      "When the group tied one side, the wind lifted the other. Working together, they pulled, tugged, checked each peg and finally secured the tent.",
    action: "Tension every line",
  },
  {
    title: "Dig a Drain Around the Tent",
    cue: "Form a shallow channel outside the groundsheet without weakening the pegs.",
    detail:
      "A drain guides melting snow and rainwater away from the sleeping area. The trench stays outside the tent edge so water does not collect beneath the groundsheet.",
    action: "Complete the drainage channel",
  },
  {
    title: "Cook at a Safe Stone Chulha",
    cue: "Build the cooking place away from the tent and heat a simple meal together.",
    detail:
      "The hungry group collected firewood and stones to make a chulha. Fire is handled only by trained adults, away from tent fabric, with water ready and the embers fully extinguished.",
    action: "Prepare the warm meal",
  },
  {
    title: "Leave the Campsite Clean",
    cue: "Collect every food wrapper and piece of waste in the camp bag.",
    detail:
      "After the meal, the group put all waste in a bag. Mountain visitors carry rubbish back instead of burying, burning or leaving it where it can harm wildlife.",
    action: "Pack all the waste",
  },
  {
    title: "Rest in Feather Sleeping Bags",
    cue: "Step into the dry sleeping bag and close it around the body.",
    detail:
      "The soft feathers trap many tiny pockets of air. Like the tent’s double layer, this trapped air slows heat loss and helps a tired camper stay warm through the cold night.",
    action: "Settle in for the night",
  },
  {
    title: "Wake to Falling Snow",
    cue: "Use walking sticks, take short steps and climb carefully toward 2,700 metres.",
    detail:
      "The next morning everything looked white. The group walked carefully because the snow was slippery, using sticks for balance before reaching the snow-covered mountains by afternoon.",
    action: "Activity complete",
  },
] as const;

const NARRATIONS = [
  "Welcome to Chapter 9, Up You Go, Activity 3, Camp in the Snow. On the eighteenth of February, nineteen eighty-four, the group reached a height of two thousand one hundred and thirty-four metres. They would spend the night here. Look around with the leader and choose a level campsite away from steep slopes and other hazards.",
  "Now build the shelter described in the story. Put a protective sheet on the snowy ground, then raise two tent layers with a small gap between them. The still air trapped between the layers slows the movement of heat. This insulation helps the inside of the tent stay warmer than the cold air outside.",
  "The mountain wind pulls hard at the tent. When the group tied one side, the other side flew up. Work as a team. Push each peg firmly into the ground, tighten opposite guy lines evenly, and check every connection until the tent remains stable.",
  "Dig a shallow drainage channel around the outside of the tent. The channel guides melting snow or rainwater away from the groundsheet. Keep it beyond the tent edge and away from the pegs, so the sleeping area stays dry and the anchors remain firm.",
  "Everyone is hungry. In the textbook story, the group collects firewood and stones to make a chulha and cook food. In a real camp, only trained adults manage fire, well away from tents and dry equipment. Keep water ready and extinguish every ember after cooking.",
  "The meal is finished, but the campsite is not finished with us. Collect every scrap and wrapper in the waste bag. Carry rubbish back from the mountain. A responsible camper leaves the ground, plants and wildlife as clean and undisturbed as possible.",
  "It is time to rest. The group climbs into sleeping bags filled with soft feathers. The feathers hold many small pockets of still air, which slow heat loss from the body. Keep the sleeping bag dry, close it comfortably and notice how insulation works in both the bag and the double-layer tent.",
  "Morning arrives with soft, fluffy snowflakes. Trees, grass and mountains look white. The group must climb higher, towards two thousand seven hundred metres. Snow is slippery, so take short careful steps and use walking sticks for balance. Camp in the Snow complete: shelter, insulation, drainage, warmth, cleanliness and teamwork made the night possible.",
];

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
    } else {
      line = candidate;
    }
  }
  if (line) context.fillText(line.trim(), x, currentY);
}

function drawCard(canvas: HTMLCanvasElement, stage: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const complete = stage === STAGES.length - 1;
  context.fillStyle = "#102238";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#7dd3fc";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 3  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#f8fafc";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#dbeafe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = complete ? "#86efac" : "#bae6fd";
  context.font = "bold 19px sans-serif";
  context.fillText(
    complete
      ? "Choose → Insulate → Anchor → Drain → Warm → Clean → Rest"
      : `Action: ${STAGES[stage].action}`,
    24,
    245,
  );
}

function segmentBetween(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = to.clone().sub(from);
  const segment = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
    material,
  );
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  return segment;
}

function makeTent() {
  const tent = new THREE.Group();
  tent.name = "wind-secured double-layer tent with insulated groundsheet";
  const innerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfed7aa,
    transparent: true,
    opacity: 0.58,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const outerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.9,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    roughness: 0.88,
  });
  const groundsheet = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.045, 2.55), groundMaterial);
  groundsheet.name = "double-layer ground protection beneath the tent";
  groundsheet.position.y = 0.055;
  tent.add(groundsheet);

  const inner = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.48, 4), innerMaterial);
  inner.name = "inner tent layer trapping still insulating air";
  inner.rotation.y = Math.PI / 4;
  inner.scale.z = 0.82;
  inner.position.y = 0.82;
  const outer = new THREE.Mesh(new THREE.ConeGeometry(1.52, 1.68, 4), outerMaterial);
  outer.name = "outer weather-resistant tent layer";
  outer.rotation.y = Math.PI / 4;
  outer.scale.z = 0.84;
  outer.position.y = 0.92;
  outer.castShadow = true;
  tent.add(inner, outer);

  const pegMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7c8d6,
    metalness: 0.65,
    roughness: 0.35,
  });
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.7 });
  const pegPositions = [
    new THREE.Vector3(-1.9, 0.08, -1.35),
    new THREE.Vector3(1.9, 0.08, -1.35),
    new THREE.Vector3(-1.9, 0.08, 1.35),
    new THREE.Vector3(1.9, 0.08, 1.35),
  ];
  const roofPoints = [
    new THREE.Vector3(-0.85, 1.5, -0.6),
    new THREE.Vector3(0.85, 1.5, -0.6),
    new THREE.Vector3(-0.85, 1.5, 0.6),
    new THREE.Vector3(0.85, 1.5, 0.6),
  ];
  pegPositions.forEach((position, index) => {
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.42, 8), pegMaterial);
    peg.name = "firmly seated tent peg";
    peg.position.copy(position);
    peg.rotation.z = index % 2 ? -0.24 : 0.24;
    const line = segmentBetween(roofPoints[index], position, 0.012, ropeMaterial);
    line.name = "tensioned guy line resisting mountain wind";
    tent.add(peg, line);
  });
  tent.userData.outerMaterial = outerMaterial;
  tent.userData.innerMaterial = innerMaterial;
  return tent;
}

function makeDrain() {
  const drain = new THREE.Group();
  drain.name = "shallow drainage channel guiding meltwater away";
  const channel = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.11, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x3f5261, roughness: 1 }),
  );
  channel.rotation.x = Math.PI / 2;
  channel.scale.z = 0.72;
  channel.position.y = 0.015;
  const water = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.045, 6, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.58,
      roughness: 0.18,
    }),
  );
  water.name = "meltwater flowing around instead of beneath the tent";
  water.rotation.x = Math.PI / 2;
  water.scale.z = 0.72;
  water.position.y = 0.045;
  drain.add(channel, water);
  return drain;
}

function makeChulha() {
  const chulha = new THREE.Group();
  chulha.name = "supervised stone chulha placed safely away from tent fabric";
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x59636e, roughness: 1 });
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17, 0), stoneMaterial);
    stone.position.set(Math.cos(angle) * 0.48, 0.13, Math.sin(angle) * 0.48);
    stone.scale.set(1.2, 0.65, 0.95);
    chulha.add(stone);
  }
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.33, 0.29, 0.36, 20),
    new THREE.MeshStandardMaterial({ color: 0x303943, metalness: 0.62, roughness: 0.38 }),
  );
  pot.name = "cooking pot for the group meal";
  pot.position.y = 0.66;
  chulha.add(pot);
  const flames = [0xff3d00, 0xffa000, 0xffe082].map((color, index) => {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 - index * 0.025, 0.42 - index * 0.08, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 }),
    );
    flame.name = "small supervised cooking flame";
    flame.position.set((index - 1) * 0.11, 0.34, Math.sin(index) * 0.07);
    chulha.add(flame);
    return flame;
  });
  chulha.userData.flames = flames;
  return chulha;
}

function makeSleepingBag() {
  const bag = new THREE.Group();
  bag.name = "dry feather-filled sleeping bag trapping warm air";
  const shell = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.74 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.25, 10, 18), shell);
  body.rotation.z = Math.PI / 2;
  body.scale.y = 0.9;
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 24, Math.PI), shell);
  hood.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  hood.position.x = -0.88;
  bag.add(body, hood);
  bag.position.set(0, 0.35, 0);
  return bag;
}

function makeWasteStation() {
  const group = new THREE.Group();
  group.name = "leave-no-trace waste collection station";
  const bag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.38, 0.85, 16),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }),
  );
  bag.name = "sealed camp waste bag carried back from the mountain";
  bag.position.y = 0.43;
  group.add(bag);
  const litterMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 });
  const litter = Array.from({ length: 6 }, (_, index) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.1), litterMaterial);
    piece.name = "small food wrapper to be collected";
    piece.position.set(-0.7 + index * 0.24, 0.05, Math.sin(index * 2.1) * 0.32);
    group.add(piece);
    return piece;
  });
  group.userData.litter = litter;
  return group;
}

function makeWalker() {
  const walker = new THREE.Group();
  walker.name = "camper taking short careful steps with two walking sticks";
  const coat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b6547, roughness: 0.84 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 8, 14), coat);
  torso.position.y = 1.28;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin);
  head.position.y = 1.88;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  cap.position.y = 1.95;
  walker.add(torso, head, cap);
  for (const side of [-1, 1]) {
    const leg = segmentBetween(
      new THREE.Vector3(side * 0.12, 0.95, 0),
      new THREE.Vector3(side * 0.17, 0.15, side * 0.12),
      0.075,
      dark,
    );
    const stick = segmentBetween(
      new THREE.Vector3(side * 0.34, 1.45, 0),
      new THREE.Vector3(side * 0.52, 0.05, -0.28),
      0.025,
      new THREE.MeshStandardMaterial({ color: 0x6b4f34, roughness: 0.95 }),
    );
    stick.name = "walking stick improving balance on slippery snow";
    walker.add(leg, stick);
  }
  return walker;
}

type SnowAmbience = { start: () => void; stop: () => void };

function createSnowAmbience(): SnowAmbience {
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  const start = () => {
    if (source) {
      void context?.resume();
      return;
    }
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    context = new AudioContextConstructor();
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let index = 0; index < data.length; index += 1) {
      smooth = smooth * 0.997 + (Math.random() * 2 - 1) * 0.003;
      data[index] = smooth;
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 780;
    const gain = context.createGain();
    gain.gain.value = 0.055;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  };
  const stop = () => {
    try {
      source?.stop();
    } catch {
      // The ambient source may already be stopped when the XR session closes.
    }
    source = null;
    void context?.close();
    context = null;
  };
  return { start, stop };
}

export default function CampInSnowViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const stageStartRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const ambienceRef = useRef<SnowAmbience | null>(null);
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
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcbdbea, 16, 42);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/up-you-go-camp-in-snow-360.png",
      { exposure: 1.04, intensity: 0.52 },
    );
    const camera = new THREE.PerspectiveCamera(
      64,
      mount.clientWidth / mount.clientHeight,
      0.05,
      80,
    );
    camera.position.set(5.7, 3.4, 6.4);
    camera.lookAt(0, 1.2, -0.4);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x354a60, 2.2));
    const sun = new THREE.DirectionalLight(0xffe4c4, 2.4);
    sun.position.set(-6, 11, 5);
    sun.castShadow = true;
    scene.add(sun);

    const snowGround = new THREE.Mesh(
      new THREE.CircleGeometry(14, 80),
      new THREE.MeshStandardMaterial({ color: 0xe8f2fa, roughness: 0.98 }),
    );
    snowGround.name = "level snowy campsite checked by the trained leader";
    snowGround.rotation.x = -Math.PI / 2;
    snowGround.receiveShadow = true;
    scene.add(snowGround);

    const tent = makeTent();
    tent.position.set(-0.7, 0, -1.0);
    scene.add(tent);
    const drain = makeDrain();
    drain.position.copy(tent.position);
    scene.add(drain);
    const chulha = makeChulha();
    chulha.position.set(3.5, 0, -0.7);
    scene.add(chulha);
    const waste = makeWasteStation();
    waste.position.set(3.05, 0, 1.4);
    scene.add(waste);
    const sleepingBag = makeSleepingBag();
    sleepingBag.position.set(-0.7, 0.28, -0.8);
    sleepingBag.rotation.y = 0.25;
    scene.add(sleepingBag);
    const walker = makeWalker();
    walker.position.set(-3.2, 0, 1.2);
    scene.add(walker);

    const heightMarker = new THREE.Group();
    heightMarker.name = "height marker showing 2134 metres and next goal 2700 metres";
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.9 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 10), postMaterial);
    post.position.y = 1.1;
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.55, 4),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.72 }),
    );
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(0.3, 1.8, 0);
    heightMarker.add(post, arrow);
    heightMarker.position.set(-4.1, 0, -1.8);
    scene.add(heightMarker);

    const snowCount = 1000;
    const snowPositions = new Float32Array(snowCount * 3);
    for (let index = 0; index < snowCount; index += 1) {
      snowPositions[index * 3] = (Math.random() - 0.5) * 22;
      snowPositions[index * 3 + 1] = Math.random() * 10;
      snowPositions[index * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
    const snowfall = new THREE.Points(
      snowGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.075,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    snowfall.name = "soft fluffy snowfall visible throughout the mountain camp";
    scene.add(snowfall);

    const airPocketCount = 34;
    const airPocketPositions = new Float32Array(airPocketCount * 3);
    for (let index = 0; index < airPocketCount; index += 1) {
      const angle = (index / airPocketCount) * Math.PI * 2;
      airPocketPositions[index * 3] = -0.7 + Math.cos(angle) * (1.28 + (index % 2) * 0.1);
      airPocketPositions[index * 3 + 1] = 0.35 + Math.random() * 1.1;
      airPocketPositions[index * 3 + 2] = -1 + Math.sin(angle) * 0.78;
    }
    const airPocketGeometry = new THREE.BufferGeometry();
    airPocketGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(airPocketPositions, 3),
    );
    const airPockets = new THREE.Points(
      airPocketGeometry,
      new THREE.PointsMaterial({
        color: 0xfde68a,
        size: 0.085,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    airPockets.name = "visualisation of still air trapped between two tent layers";
    scene.add(airPockets);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 290;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.2),
      new THREE.MeshBasicMaterial({ map: cardTexture }),
    );
    card.position.set(2.6, 3.05, 1.25);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22 }),
      );
      button.name = name;
      button.position.set(x, 1.08, 1.55);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, 1.85);
    const actionButton = makeButton("btn-action", 0x0284c7, 2.6);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0x0ea5e9, 3.35);
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
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
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
      startPosition: new THREE.Vector3(0.4, 0, 2.5),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.2, 1.2, -0.5);
    controls.enableDamping = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;
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

      const outerMaterial = tent.userData.outerMaterial as THREE.MeshPhysicalMaterial;
      const innerMaterial = tent.userData.innerMaterial as THREE.MeshPhysicalMaterial;
      const tentProgress = currentStage >= 1 ? THREE.MathUtils.smoothstep(Math.min(stageAge / 3, 1), 0, 1) : 0.35;
      tent.scale.y = tentProgress;
      outerMaterial.opacity = currentStage === 1 ? 0.42 : 0.9;
      innerMaterial.opacity = currentStage === 1 ? 0.82 : 0.58;
      tent.rotation.z = currentStage === 2
        ? Math.sin(elapsed * 3.4) * Math.max(0, 0.07 - Math.min(stageAge / 55, 0.06))
        : 0;
      airPockets.visible = currentStage === 1 || currentStage === 6;
      airPockets.rotation.y = elapsed * 0.08;
      (airPockets.material as THREE.PointsMaterial).opacity =
        0.65 + Math.sin(elapsed * 2.4) * 0.18;

      drain.visible = currentStage >= 3;
      const drainScale = currentStage === 3
        ? THREE.MathUtils.smoothstep(Math.min(stageAge / 2.8, 1), 0, 1)
        : 1;
      drain.scale.setScalar(drainScale);

      chulha.visible = currentStage === 4;
      const flames = chulha.userData.flames as THREE.Mesh[];
      flames.forEach((flame, index) => {
        flame.scale.y = 0.82 + Math.sin(elapsed * 7 + index) * 0.22;
        flame.rotation.y = elapsed * (0.5 + index * 0.08);
      });

      waste.visible = currentStage === 5;
      const litter = waste.userData.litter as THREE.Mesh[];
      litter.forEach((piece, index) => {
        const collect = THREE.MathUtils.smoothstep(
          Math.min(Math.max(stageAge - index * 0.32, 0) / 1.5, 1),
          0,
          1,
        );
        piece.position.x = THREE.MathUtils.lerp(-0.7 + index * 0.24, 0, collect);
        piece.position.y = THREE.MathUtils.lerp(0.05, 0.54, collect);
        piece.scale.setScalar(1 - collect * 0.75);
      });

      sleepingBag.visible = currentStage === 6;
      sleepingBag.scale.setScalar(
        currentStage === 6 ? 1 + Math.sin(elapsed * 1.8) * 0.025 : 1,
      );
      walker.visible = currentStage === 7;
      if (currentStage === 7) {
        const progress = THREE.MathUtils.smoothstep(Math.min(stageAge / 7, 1), 0, 1);
        walker.position.set(
          THREE.MathUtils.lerp(-3.2, 2.8, progress),
          0,
          THREE.MathUtils.lerp(1.2, -3.8, progress),
        );
        walker.rotation.y = -0.7;
        walker.rotation.z = Math.sin(elapsed * 3.2) * 0.025;
      }

      snowfall.visible = currentStage === 7 || currentStage === 0;
      const positions = snowGeometry.attributes.position.array as Float32Array;
      for (let index = 0; index < snowCount; index += 1) {
        positions[index * 3 + 1] -= 0.012 + (index % 5) * 0.002;
        positions[index * 3] += Math.sin(elapsed + index) * 0.001;
        if (positions[index * 3 + 1] < 0) positions[index * 3 + 1] = 10;
      }
      snowGeometry.attributes.position.needsUpdate = true;
      heightMarker.scale.setScalar(currentStage === 0 || currentStage === 7
        ? 1 + Math.sin(elapsed * 3) * 0.03
        : 1);

      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    drawCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;
    stageStartRef.current = performance.now() / 1000;
    const snowAmbience = createSnowAmbience();
    ambienceRef.current = snowAmbience;
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
      snowAmbience.stop();
      ambienceRef.current = null;
      snowGeometry.dispose();
      airPocketGeometry.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [goToStage, performAction]);

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> };
      }
    ).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      ambienceRef.current?.start();
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
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#102238",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(circle at 50% 28%, #4f7391 0%, #102238 76%)",
          }}
        >
          <div style={{ maxWidth: 700, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>🏕️❄️🏔️</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#7dd3fc",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 5 • Chapter 9 • Activity 3
            </div>
            <h1
              style={{
                color: "#f8fafc",
                fontSize: "clamp(2.1rem, 5vw, 3.1rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              Camp in the Snow
            </h1>
            <p style={{ color: "#dbeafe", lineHeight: 1.7 }}>
              Build the 2,134-metre snow camp from the NCERT story: insulate a
              double-layer tent, secure it against wind, drain meltwater, cook
              responsibly, clean the site and rest warmly before the snowy climb.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 26,
              }}
            >
              {vrSupported && (
                <button onClick={enterVR} style={primaryButtonStyle}>
                  🥽 Enter in VR
                </button>
              )}
              <button
                onClick={() => {
                  setStarted(true);
                  ambienceRef.current?.start();
                  playNarration(NARRATIONS[0]);
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
          <aside
            style={{
              position: "absolute",
              top: 70,
              right: 16,
              width: 350,
              maxHeight: "calc(100vh - 88px)",
              overflowY: "auto",
              padding: 18,
              borderRadius: 14,
              background: "rgba(16,34,56,0.95)",
              border: "1px solid rgba(125,211,252,0.48)",
              color: "#f8fafc",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#7dd3fc",
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Activity 3 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "rgba(125,211,252,0.08)",
                border: "1px solid rgba(125,211,252,0.22)",
                marginBottom: 13,
              }}
            >
              <div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div>
            </div>
            <button
              onClick={performAction}
              disabled={stage === STAGES.length - 1}
              style={{
                ...primaryButtonStyle,
                opacity: stage === STAGES.length - 1 ? 0.55 : 1,
                cursor: stage === STAGES.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              {STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => goToStage(stage - 1)}
                disabled={stage === 0}
                style={navButtonStyle}
              >
                ← Previous
              </button>
              <button
                onClick={() => goToStage(stage + 1)}
                disabled={stage === STAGES.length - 1}
                style={navButtonStyle}
              >
                Next →
              </button>
            </div>
            <div
              role="status"
              style={{
                marginTop: 12,
                color: stage === 7 ? "#86efac" : "#bae6fd",
                fontSize: "0.76rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {stage === 7
                ? "Activity complete • Shelter, insulation, care and teamwork"
                : `${stage} of 7 snow-camp discoveries completed`}
            </div>
            <button
              onClick={() => playNarration(NARRATIONS[stage])}
              style={secondaryButtonStyle}
            >
              🔊 Replay narration
            </button>
            {vrSupported && (
              <button onClick={enterVR} style={secondaryButtonStyle}>
                🥽 Enter VR
              </button>
            )}
          </aside>
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              color: "#dbeafe",
              fontSize: "0.75rem",
            }}
          >
            Quest: trigger selects • A advances • B/right grip exits VR • Y goes back •
            joysticks move and turn
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
  background: "linear-gradient(135deg, #0284c7, #0369a1)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(125,211,252,0.48)",
  background: "rgba(125,211,252,0.1)",
  color: "#e0f2fe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#dbeafe",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#dbeafe",
  cursor: "pointer",
} as const;
