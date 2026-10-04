"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Read the Snow-Mountain Route",
    cue: "Observe the weather, slope and marker poles before leaving the 2,134-metre camp.",
    detail:
      "The textbook group woke to falling snow and planned a climb toward 2,700 metres. A trained leader checks visibility, wind, surface snow and the safe return time before the group moves.",
    action: "Approve the marked route",
  },
  {
    title: "Prepare Warm Layers and Equipment",
    cue: "Check boots, warm layers, gloves, eye protection, water, whistle and walking sticks.",
    detail:
      "Clothing is layered so damp or warm layers can be adjusted. Firm boots improve grip, gloves protect hands, and eye protection reduces glare from bright snow. The leader checks every learner.",
    action: "Complete the equipment check",
  },
  {
    title: "Move as One Group",
    cue: "Follow the marker poles, keep visual contact and match the slowest member's pace.",
    detail:
      "The chapter describes a leader who helps others, watches anyone who feels unwell and stays near the back. No learner leaves the marked route or climbs alone.",
    action: "Begin the supervised climb",
  },
  {
    title: "Plant, Step, Balance",
    cue: "Plant the stick, test the snow, then take one short deliberate step.",
    detail:
      "The group used sticks because it kept slipping on the snow. Short steps keep the body balanced, while a planted stick provides an extra contact point before weight moves forward.",
    action: "Practise careful snow steps",
  },
  {
    title: "Practise on the Fixed Safety Rope",
    cue: "At the training section, let the instructor inspect the anchor and clip the safety line.",
    detail:
      "A fixed-rope section is used only under trained supervision. The learner checks the harness connection, keeps the rope above the body and moves one attachment at a time past each anchor.",
    action: "Cross the protected section",
  },
  {
    title: "Respond to a Slip",
    cue: "Stop, stay calm and let the protected system hold while the group follows the instructor.",
    detail:
      "The simulation shows a small controlled training slip. The safety connection limits movement, the learner regains three stable contact points, and the team does not pull or rush unpredictably.",
    action: "Recover a stable stance",
  },
  {
    title: "Reach the 2,700 Metre Snowfield",
    cue: "Arrive together, count the group and observe the snow-covered mountains.",
    detail:
      "By afternoon, the textbook group reached the snow-covered mountains at about 2,700 metres. The achievement belongs to the whole group because everyone travelled carefully and helped one another.",
    action: "Complete the height check",
  },
  {
    title: "Return Before Conditions Change",
    cue: "Turn back on the marked route while visibility and energy remain good.",
    detail:
      "Reaching a high point is only half the journey. A responsible group descends together, carries all equipment and waste, reports any discomfort, and never treats this simulation as real mountaineering training.",
    action: "Activity complete",
  },
] as const;

const NARRATIONS = [
  "Welcome to Chapter 9, Up You Go, Activity 4, Snow Mountain Climbing. The group wakes at the two thousand one hundred and thirty-four metre camp and sees fresh snow. Today they will climb carefully toward two thousand seven hundred metres. Begin by reading the weather, the slope and the marker poles with a trained leader. The climb starts only when the route and return time are safe.",
  "Prepare for cold and bright snow. Wear adjustable warm layers, firm boots, gloves and eye protection. Carry water and a whistle, and check both walking sticks. The equipment supports safe movement, but it does not replace trained supervision or good decisions. The leader checks every member before the group leaves.",
  "Move as one group along the marked route. Match the pace of the slowest member and keep everyone in sight. The textbook describes a leader who helps others, watches anyone who feels unwell and stays near the back. No one takes a shortcut or climbs alone.",
  "The snow is slippery, just as the textbook group discovered. Use a simple rhythm: plant the stick, test the surface, then take one short step. Keep the body balanced over the feet and avoid sudden turns. The stick becomes an extra point of contact, helping you notice soft or uneven snow before shifting your weight.",
  "You have reached a short fixed-rope practice section. Only a trained instructor sets and checks this system. Inspect the anchor, harness connection and safety line. Keep the rope above the body and move carefully past one anchor at a time. This is protected practice, not permission to climb a real mountain without expert training.",
  "A boot slips a short distance during the protected exercise. Stay calm. The safety connection limits the movement. Follow the instructor, plant the stick or boot securely, and rebuild three stable points of contact before standing upright. Teammates remain steady and do not pull the rope unpredictably.",
  "By afternoon the group reaches the snow-covered mountains at about two thousand seven hundred metres. Count every member, pause in the protected snowfield and observe the white ridges. The chapter celebrates courage, but the achievement also comes from preparation, discipline and helping one another.",
  "Now turn back while visibility, weather and energy remain good. Follow the same marker poles, keep the group together and carry every item and piece of waste down. Snow Mountain Climbing complete. You used route reading, equipment checks, teamwork, walking sticks, a protected rope and careful decisions to reach the snowfield and return responsibly.",
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
  context.fillStyle = "#10253a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#a7f3d0";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#a7f3d0";
  context.font = "bold 21px sans-serif";
  context.fillText(
    `Activity 4  •  Stage ${stage + 1}/${STAGES.length}`,
    24,
    38,
  );
  context.fillStyle = "#f8fafc";
  context.font = "bold 29px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#dbeafe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = stage === STAGES.length - 1 ? "#86efac" : "#bae6fd";
  context.font = "bold 19px sans-serif";
  context.fillText(
    stage === STAGES.length - 1
      ? "Observe → Equip → Group → Step → Protect → Recover → Return"
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

function makeClimber() {
  const climber = new THREE.Group();
  climber.name =
    "supervised learner using short steps and walking sticks on snow";
  const coat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.8,
  });
  const trousers = new THREE.MeshStandardMaterial({
    color: 0x172033,
    roughness: 0.9,
  });
  const boot = new THREE.MeshStandardMaterial({
    color: 0x171717,
    roughness: 0.85,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: 0x9a6548,
    roughness: 0.84,
  });
  const helmetMaterial = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.48,
  });
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.23, 0.62, 8, 16),
    coat,
  );
  torso.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), skin);
  head.position.y = 1.95;
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    helmetMaterial,
  );
  helmet.name = "fitted helmet checked by the instructor";
  helmet.position.y = 2.02;
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.62, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.78 }),
  );
  backpack.name = "light group rucksack with water and warm layer";
  backpack.position.set(0, 1.38, 0.23);
  climber.add(torso, head, helmet, backpack);

  const stickMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.5,
    roughness: 0.48,
  });
  const limbs: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const upperLeg = segmentBetween(
      new THREE.Vector3(side * 0.13, 1.03, 0),
      new THREE.Vector3(side * 0.17, 0.55, side * 0.05),
      0.075,
      trousers,
    );
    const lowerLeg = segmentBetween(
      new THREE.Vector3(side * 0.17, 0.55, side * 0.05),
      new THREE.Vector3(side * 0.22, 0.12, -0.06),
      0.065,
      trousers,
    );
    const bootMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.14, 0.36),
      boot,
    );
    bootMesh.name = "firm boot testing compacted snow";
    bootMesh.position.set(side * 0.22, 0.1, -0.14);
    const arm = segmentBetween(
      new THREE.Vector3(side * 0.23, 1.55, 0),
      new THREE.Vector3(side * 0.46, 1.1, -0.08),
      0.06,
      coat,
    );
    const stick = segmentBetween(
      new THREE.Vector3(side * 0.46, 1.15, -0.08),
      new THREE.Vector3(side * 0.68, 0.02, -0.55),
      0.022,
      stickMaterial,
    );
    stick.name = "walking stick planted before each short careful step";
    climber.add(upperLeg, lowerLeg, bootMesh, arm, stick);
    limbs.push(upperLeg, lowerLeg, arm, stick);
  }
  const harness = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.03, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }),
  );
  harness.name =
    "training harness connected only at the supervised rope section";
  harness.rotation.x = Math.PI / 2;
  harness.position.y = 1.13;
  climber.add(harness);
  climber.userData.limbs = limbs;
  climber.userData.harness = harness;
  return climber;
}

function makeGearStation() {
  const station = new THREE.Group();
  station.name = "cold-weather equipment check station";
  const shelfMaterial = new THREE.MeshStandardMaterial({
    color: 0x5b4636,
    roughness: 0.92,
  });
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.1, 0.65),
    shelfMaterial,
  );
  shelf.position.y = 0.56;
  station.add(shelf);
  const items: THREE.Mesh[] = [];
  const itemSpecs = [
    { name: "insulated boot with firm tread", color: 0x171717, x: -0.9 },
    { name: "warm glove protecting the hand", color: 0xf97316, x: -0.3 },
    { name: "snow glare eye protection", color: 0x38bdf8, x: 0.3 },
    { name: "water bottle carried for hydration", color: 0x2563eb, x: 0.9 },
  ];
  itemSpecs.forEach((spec, index) => {
    const geometry =
      index === 3
        ? new THREE.CylinderGeometry(0.13, 0.13, 0.45, 16)
        : new THREE.BoxGeometry(0.38, 0.24, 0.28);
    const item = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.68,
        emissive: spec.color,
        emissiveIntensity: 0.04,
      }),
    );
    item.name = spec.name;
    item.position.set(spec.x, 0.79, 0);
    station.add(item);
    items.push(item);
  });
  station.userData.items = items;
  return station;
}

function makeMarkedRoute() {
  const route = new THREE.Group();
  route.name = "marked supervised route connecting 2134 and 2700 metres";
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.65,
  });
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 0.25,
  });
  const markers: THREE.Mesh[] = [];
  for (let index = 0; index < 9; index += 1) {
    const x = -4.2 + index * 1.05;
    const z = 3.4 - index * 0.85;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 1.05, 8),
      poleMaterial,
    );
    pole.position.set(x, 0.52 + index * 0.018, z);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.025),
      markerMaterial,
    );
    flag.name = "visible route marker checked before and during the climb";
    flag.position.set(x + 0.14, 0.92 + index * 0.018, z);
    route.add(pole, flag);
    markers.push(flag);
  }
  route.userData.markers = markers;
  return route;
}

function makeFootprints() {
  const prints = new THREE.Group();
  prints.name = "short deliberate footprints following the marked snow route";
  const material = new THREE.MeshStandardMaterial({
    color: 0x9fb2c3,
    roughness: 1,
  });
  const meshes: THREE.Mesh[] = [];
  for (let index = 0; index < 18; index += 1) {
    const progress = index / 17;
    const print = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.065, 0.16, 4, 8),
      material,
    );
    print.name = "compacted short step kept within the marked route";
    print.scale.set(0.9, 0.18, 1.25);
    print.rotation.set(Math.PI / 2, 0, -0.58);
    print.position.set(
      THREE.MathUtils.lerp(-4.1, 4.15, progress) + (index % 2 ? 0.12 : -0.12),
      0.026,
      THREE.MathUtils.lerp(3.15, -3.2, progress),
    );
    prints.add(print);
    meshes.push(print);
  }
  prints.userData.meshes = meshes;
  return prints;
}

function makeFixedRope() {
  const system = new THREE.Group();
  system.name = "instructor-checked fixed-rope practice system";
  const anchorMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.72,
    roughness: 0.3,
  });
  const ropeMaterial = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.72,
  });
  const anchorPoints = [
    new THREE.Vector3(-1.9, 0.65, -1.8),
    new THREE.Vector3(-0.65, 1.05, -2.6),
    new THREE.Vector3(0.65, 1.38, -3.25),
  ];
  const anchors: THREE.Mesh[] = [];
  anchorPoints.forEach((point, index) => {
    const anchor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.75, 10),
      anchorMaterial,
    );
    anchor.name = "fixed-rope anchor inspected by the trained instructor";
    anchor.position.copy(point);
    anchor.rotation.z = -0.12;
    system.add(anchor);
    anchors.push(anchor);
    if (index > 0) {
      const rope = segmentBetween(
        anchorPoints[index - 1],
        point,
        0.018,
        ropeMaterial,
      );
      rope.name = "fixed safety rope kept above the learner's body";
      system.add(rope);
    }
  });
  system.userData.anchors = anchors;
  system.userData.points = anchorPoints;
  return system;
}

function makeAltitudeMarker() {
  const marker = new THREE.Group();
  marker.name = "arrival marker at the 2700 metre snowfield";
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x5b4636,
    roughness: 0.9,
  });
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.065, 2.2, 10),
    postMaterial,
  );
  post.position.y = 1.1;
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x34d399,
      emissiveIntensity: 0.45,
    }),
  );
  beacon.name = "group height check at approximately 2700 metres";
  beacon.position.set(0, 2.25, 0);
  marker.add(post, beacon);
  marker.userData.beacon = beacon;
  return marker;
}

type WindAmbience = { start: () => void; stop: () => void };

function createWindAmbience(): WindAmbience {
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  const start = () => {
    if (source) {
      void context?.resume();
      return;
    }
    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;
    context = new AudioContextConstructor();
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 3,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let index = 0; index < data.length; index += 1) {
      smooth = smooth * 0.996 + (Math.random() * 2 - 1) * 0.004;
      data[index] = smooth;
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 920;
    const gain = context.createGain();
    gain.gain.value = 0.04;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  };
  const stop = () => {
    try {
      source?.stop();
    } catch {
      // The source may already be stopped when an XR session closes.
    }
    source = null;
    void context?.close();
    context = null;
  };
  return { start, stop };
}

export default function SnowMountainClimbingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const stageStartRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const ambienceRef = useRef<WindAmbience | null>(null);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (
        navigator as Navigator & {
          xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
        }
      ).xr
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
    scene.fog = new THREE.Fog(0xc8d9e8, 18, 48);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/up-you-go-snow-mountain-climbing-360.png",
      { exposure: 1.03, intensity: 0.55 },
    );
    const camera = new THREE.PerspectiveCamera(
      64,
      mount.clientWidth / mount.clientHeight,
      0.05,
      85,
    );
    camera.position.set(5.7, 3.5, 6.8);
    camera.lookAt(0, 1.1, -0.7);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x334155, 2.15));
    const sun = new THREE.DirectionalLight(0xfff4df, 2.6);
    sun.position.set(-7, 12, 5);
    sun.castShadow = true;
    scene.add(sun);

    const snowGround = new THREE.Mesh(
      new THREE.CircleGeometry(14, 96),
      new THREE.MeshStandardMaterial({ color: 0xe7f0f7, roughness: 0.97 }),
    );
    snowGround.name =
      "broad protected snowfield used for supervised mountain learning";
    snowGround.rotation.x = -Math.PI / 2;
    snowGround.receiveShadow = true;
    scene.add(snowGround);

    const route = makeMarkedRoute();
    scene.add(route);
    const footprints = makeFootprints();
    scene.add(footprints);
    const climber = makeClimber();
    climber.position.set(-4.2, 0, 3.2);
    climber.rotation.y = -0.62;
    scene.add(climber);
    const gear = makeGearStation();
    gear.position.set(-3.4, 0, 0.85);
    scene.add(gear);
    const fixedRope = makeFixedRope();
    scene.add(fixedRope);
    const altitudeMarker = makeAltitudeMarker();
    altitudeMarker.position.set(4.35, 0, -3.45);
    scene.add(altitudeMarker);

    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 1.15),
      new THREE.MeshStandardMaterial({
        color: 0xc9d8e4,
        roughness: 1,
        transparent: true,
        opacity: 0.66,
      }),
    );
    trail.name = "compacted path kept between visible route markers";
    trail.rotation.set(-Math.PI / 2, 0, -0.65);
    trail.position.set(0, 0.018, -0.05);
    scene.add(trail);

    const snowCount = 820;
    const snowPositions = new Float32Array(snowCount * 3);
    for (let index = 0; index < snowCount; index += 1) {
      snowPositions[index * 3] = (Math.random() - 0.5) * 24;
      snowPositions[index * 3 + 1] = Math.random() * 10;
      snowPositions[index * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(snowPositions, 3),
    );
    const snowfall = new THREE.Points(
      snowGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.065,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
    );
    snowfall.name =
      "gentle realistic snowfall moving across the marked mountain route";
    scene.add(snowfall);

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
    card.position.set(2.75, 3.15, 1.35);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.08),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.24,
        }),
      );
      button.name = name;
      button.position.set(x, 1.08, 1.62);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, 2.0);
    const actionButton = makeButton("btn-action", 0x059669, 2.75);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0x0d9488, 3.5);
    const interactables = [previousButton, actionButton, nextButton];

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (!hit) return;
      if (hit.object.name === "btn-action") performAction();
      else if (hit.object.name === "btn-previous")
        goToStage(stageRef.current - 1);
      else goToStage(stageRef.current + 1);
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4),
        new THREE.MeshBasicMaterial({ color: 0xa7f3d0 }),
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
      startPosition: new THREE.Vector3(0.25, 0, 2.45),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.15, -0.6);
    controls.enableDamping = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 9.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const stageAge = Math.max(
        0,
        performance.now() / 1000 - stageStartRef.current,
      );
      const currentStage = stageRef.current;
      questVr.update();
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }

      const markers = route.userData.markers as THREE.Mesh[];
      markers.forEach((marker, index) => {
        const material = marker.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity =
          currentStage === 0 || currentStage === 2 || currentStage === 7
            ? 0.42 + Math.sin(elapsed * 3 + index * 0.45) * 0.18
            : 0.12;
      });

      gear.visible = currentStage === 1;
      const items = gear.userData.items as THREE.Mesh[];
      items.forEach((item, index) => {
        item.position.y = 0.79 + Math.sin(elapsed * 2.6 + index) * 0.045;
        (item.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.18 + Math.sin(elapsed * 2.4 + index) * 0.08;
      });

      footprints.visible = currentStage >= 2;
      const printMeshes = footprints.userData.meshes as THREE.Mesh[];
      printMeshes.forEach((print, index) => {
        print.visible = currentStage > 2 || stageAge > index * 0.17;
      });

      fixedRope.visible = currentStage === 4 || currentStage === 5;
      const harness = climber.userData.harness as THREE.Mesh;
      harness.visible = currentStage === 4 || currentStage === 5;

      let routeProgress = 0;
      if (currentStage === 2) routeProgress = Math.min(stageAge / 7, 0.34);
      else if (currentStage === 3)
        routeProgress = 0.34 + Math.min(stageAge / 7, 0.23);
      else if (currentStage === 4 || currentStage === 5) routeProgress = 0.58;
      else if (currentStage >= 6) routeProgress = 1;
      climber.position.set(
        THREE.MathUtils.lerp(-4.2, 4.15, routeProgress),
        THREE.MathUtils.lerp(0, 0.32, routeProgress),
        THREE.MathUtils.lerp(3.2, -3.2, routeProgress),
      );
      climber.rotation.y = -0.62;
      climber.rotation.z =
        currentStage === 5
          ? THREE.MathUtils.lerp(
              -0.32,
              0,
              THREE.MathUtils.smoothstep(Math.min(stageAge / 4, 1), 0, 1),
            )
          : Math.sin(elapsed * 3.2) *
            (currentStage >= 2 && currentStage <= 4 ? 0.018 : 0);
      climber.position.y +=
        currentStage >= 2 && currentStage <= 4
          ? Math.abs(Math.sin(elapsed * 2.9)) * 0.035
          : 0;

      altitudeMarker.visible = currentStage >= 6;
      const beacon = altitudeMarker.userData.beacon as THREE.Mesh;
      beacon.scale.setScalar(1 + Math.sin(elapsed * 3.1) * 0.1);
      beacon.rotation.y = elapsed * 0.6;

      snowfall.visible =
        currentStage === 0 || currentStage === 3 || currentStage === 7;
      const positions = snowGeometry.attributes.position.array as Float32Array;
      for (let index = 0; index < snowCount; index += 1) {
        positions[index * 3 + 1] -= 0.011 + (index % 5) * 0.0018;
        positions[index * 3] += Math.sin(elapsed * 0.8 + index) * 0.0014;
        if (positions[index * 3 + 1] < 0) positions[index * 3 + 1] = 10;
      }
      snowGeometry.attributes.position.needsUpdate = true;

      const activeCamera = renderer.xr.isPresenting
        ? renderer.xr.getCamera()
        : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    drawCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;
    stageStartRef.current = performance.now() / 1000;
    const ambience = createWindAmbience();
    ambienceRef.current = ambience;
    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);
    return () => {
      renderer.setAnimationLoop(null);
      controllers.forEach((controller) =>
        controller.removeEventListener(
          "selectstart",
          onControllerSelect as any,
        ),
      );
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      ambience.stop();
      ambienceRef.current = null;
      snowGeometry.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [goToStage, performAction]);

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: {
          requestSession?: (
            mode: string,
            options: object,
          ) => Promise<XRSession>;
        };
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
        background: "#10253a",
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
            background:
              "radial-gradient(circle at 50% 25%, #6385a0 0%, #10253a 76%)",
          }}
        >
          <div style={{ maxWidth: 710, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>🏔️🥾❄️</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#a7f3d0",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 5 • Chapter 9 • Activity 4
            </div>
            <h1
              style={{
                color: "#f8fafc",
                fontSize: "clamp(2.1rem, 5vw, 3.1rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              Snow Mountain Climbing
            </h1>
            <p style={{ color: "#dbeafe", lineHeight: 1.7 }}>
              Follow the textbook group from its 2,134-metre snow camp toward
              the 2,700-metre snowfield. Read the route, check equipment, use
              walking sticks, practise a protected rope section and return as
              one team.
            </p>
            <p
              style={{ color: "#bae6fd", fontSize: "0.8rem", lineHeight: 1.55 }}
            >
              Educational simulation only • Real snow travel requires trained
              leaders, local permission and professional safety systems.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 24,
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
              background: "rgba(16,37,58,0.95)",
              border: "1px solid rgba(167,243,208,0.48)",
              color: "#f8fafc",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#a7f3d0",
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Activity 4 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "rgba(167,243,208,0.08)",
                border: "1px solid rgba(167,243,208,0.22)",
                marginBottom: 13,
              }}
            >
              <div style={{ ...bodyCopyStyle, margin: 0 }}>
                {STAGES[stage].detail}
              </div>
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
                ? "Activity complete • Prepare, climb and return together"
                : `${stage} of 7 mountain-route discoveries completed`}
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
            Quest: trigger selects • A advances • B/right grip exits VR • Y goes
            back • joysticks move and turn
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
  background: "linear-gradient(135deg, #059669, #0f766e)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(167,243,208,0.48)",
  background: "rgba(167,243,208,0.1)",
  color: "#ecfdf5",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#dbeafe",
  fontSize: "0.83rem",
  lineHeight: 1.62,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(167,243,208,0.26)",
  background: "rgba(15,118,110,0.18)",
  color: "#ecfdf5",
  cursor: "pointer",
} as const;
