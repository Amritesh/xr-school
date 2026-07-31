"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const STAGES = [
  {
    title: "Arrive at the Training Rock",
    cue: "Survey the tall rock, the supervised route and the safety team.",
    detail: "In the NCERT story, the group walks 15 kilometres to Tekla village at 1,600 metres. Colonel Ram Singh waits near a 90-metre flat rock with pegs and ropes.",
    action: "Observe the climbing route",
  },
  {
    title: "Identify Hand and Foot Holds",
    cue: "Follow the glowing route and inspect each crack, ledge and firm hold.",
    detail: "Before climbing, the group is told to observe the rock carefully and identify holds—places where hands and feet can be placed securely.",
    action: "Check the equipment",
  },
  {
    title: "Helmet, Harness, Sling and Rope",
    cue: "Inspect the helmet, fitted harness, sling, locking connector and belay rope.",
    detail: "A trained instructor fits and checks every connection. This simulation is for learning only; real rock climbing requires qualified supervision and approved equipment.",
    action: "Try the first step",
  },
  {
    title: "The Rope Catches a Slip",
    cue: "Watch the safety system hold the learner after the first foot slips.",
    detail: "Sangeeta slips on her first step and swings from the rope. The secured sling and rope stop a fall while the instructor keeps the system controlled.",
    action: "Correct the climbing posture",
  },
  {
    title: "Keep the Body at 90 Degrees",
    cue: "Straighten the back and keep the body at a right angle while using the holds.",
    detail: "The instructor calls out: keep your body at an angle of 90 degrees, keep your back straight and do not bend. Sangeeta imagines the rock as flat ground and starts again.",
    action: "Climb hold by hold",
  },
  {
    title: "Move with Three Secure Points",
    cue: "Keep three points steady while moving one hand or foot to the next hold.",
    detail: "Test each hold before shifting weight. Move calmly, keep the safety rope tensioned and listen to the instructor’s directions.",
    action: "Reach the top marker",
  },
  {
    title: "Prepare to Rappel",
    cue: "Pause at the top marker and check the rope before descending.",
    detail: "After climbing, the group comes down using the rope in a special controlled way called rappelling. The instructor checks the connection and descent path.",
    action: "Rappel down the rock",
  },
  {
    title: "Rock Climbing Complete",
    cue: "Connect observation, equipment, posture, careful movement and courage.",
    detail: "Sangeeta faces her fear, learns from the slip, follows the instructor and completes both the climb and the rappel. Preparation turns courage into safe, disciplined action.",
    action: "Activity complete",
  },
] as const;

const NARRATIONS = [
  "Welcome to Chapter 9, Up You Go, Activity 2, Rock Climbing. In the NCERT story, the group walks fifteen kilometres to Tekla village, at a height of sixteen hundred metres. Colonel Ram Singh waits near a ninety metre flat rock with pegs and ropes. Look around the supervised training area and find the planned route.",
  "Before anyone starts climbing, observe the rock carefully. Identify the holds: firm cracks, edges and ledges where hands and feet can be placed. Follow the glowing route from the ground towards the top marker. A careful climber studies the next move before leaving a secure position.",
  "Now inspect the safety equipment. The learner wears a helmet and a properly fitted harness. A sling and locking connector attach the learner to the rope, while a trained instructor controls the belay. Every item and anchor must be checked. Never attempt real rock climbing without qualified supervision and approved equipment.",
  "The learner tries the first step, but the foot slips. In Sangeeta's story, she finds herself swinging from the rope. The secured sling, rope and instructor keep the slip controlled. She does not panic. She steadies herself, listens and prepares to try again.",
  "Listen to the instructor's advice: keep your body at an angle of ninety degrees while climbing. Keep your back straight. Do not bend. Sangeeta imagines the rock as flat ground, places her feet firmly and starts climbing again with a balanced posture.",
  "Climb hold by hold. Keep three secure points in contact while moving only one hand or foot at a time. Test the next hold before shifting weight, keep the rope tensioned and follow the instructor's directions. Calm movement is more important than speed.",
  "You have reached the top marker. Pause and check the rope before the descent. In the chapter, the group comes down using the rope in a special controlled way called rappelling. Lean back with a straight body, keep the feet against the rock and descend only when the instructor says the system is ready.",
  "Rock climbing complete. You observed the route, identified holds, checked the helmet, harness, sling and rope, recovered from a slip, used a straight ninety degree posture, climbed carefully and rappelled down. Courage grows when preparation, discipline and expert guidance work together.",
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
  context.fillStyle = "#17221f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#fbbf24";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#fbbf24";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 2  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#ecfccb";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = stage === STAGES.length - 1 ? "#86efac" : "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(
    stage === STAGES.length - 1
      ? "Observe → Connect → Balance → Climb → Rappel"
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
  radialSegments = 10,
) {
  const direction = to.clone().sub(from);
  const segment = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments),
    material,
  );
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  return segment;
}

function updateSegment(segment: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
  const direction = to.clone().sub(from);
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.scale.y = direction.length();
  segment.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
}

function makeHelmet(color: number) {
  const helmet = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    new THREE.MeshStandardMaterial({ color, roughness: 0.43 }),
  );
  shell.rotation.x = Math.PI;
  const brim = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.025, 8, 22, Math.PI * 1.3),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
  );
  brim.rotation.set(Math.PI / 2, 0, -0.45);
  brim.position.set(0.035, -0.06, -0.03);
  helmet.add(shell, brim);
  return helmet;
}

function makeClimber() {
  const climber = new THREE.Group();
  climber.name = "learner secured in a fitted climbing harness";
  const jacket = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.76 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x26364a, roughness: 0.86 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x312e2a, roughness: 0.92 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b6547, roughness: 0.84 });
  const harness = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.66 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 8, 14), jacket);
  torso.name = "straight climber torso";
  torso.position.y = 1.28;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), skin);
  head.position.y = 1.89;
  const helmet = makeHelmet(0xfacc15);
  helmet.name = "checked climbing helmet";
  helmet.position.y = 2.05;
  climber.add(torso, head, helmet);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.035, 8, 26), harness);
  belt.name = "properly fitted climbing harness and sling";
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.02;
  climber.add(belt);

  for (const side of [-1, 1]) {
    const thighLoop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 20), harness);
    thighLoop.rotation.x = Math.PI / 2;
    thighLoop.position.set(side * 0.12, 0.76, 0);
    climber.add(thighLoop);
    const arm = segmentBetween(
      new THREE.Vector3(side * 0.17, 1.55, 0),
      new THREE.Vector3(side * 0.38, 1.8 + (side > 0 ? 0.12 : -0.08), -0.24),
      0.06,
      jacket,
    );
    arm.name = "hand reaching for a secure rock hold";
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
    hand.position.set(side * 0.4, 1.85 + (side > 0 ? 0.12 : -0.08), -0.27);
    const leg = segmentBetween(
      new THREE.Vector3(side * 0.12, 0.91, 0),
      new THREE.Vector3(side * 0.28, 0.24 + (side > 0 ? 0.2 : 0), -0.2),
      0.08,
      trousers,
    );
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.34), boot);
    shoe.name = "climbing shoe pressed onto a foothold";
    shoe.position.set(side * 0.29, 0.2 + (side > 0 ? 0.2 : 0), -0.28);
    climber.add(arm, hand, leg, shoe);
  }
  return climber;
}

function makeInstructor() {
  const instructor = new THREE.Group();
  instructor.name = "trained climbing instructor controlling the belay";
  const jacket = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x273444, roughness: 0.86 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8b5d42, roughness: 0.84 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 8, 12), jacket);
  torso.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin);
  head.position.y = 1.78;
  const helmet = makeHelmet(0xef4444);
  helmet.position.y = 1.94;
  const legs = [-1, 1].map((side) =>
    segmentBetween(
      new THREE.Vector3(side * 0.1, 0.9, 0),
      new THREE.Vector3(side * 0.16, 0.12, side * 0.03),
      0.075,
      dark,
    ),
  );
  const belayArm = segmentBetween(
    new THREE.Vector3(0.16, 1.4, 0),
    new THREE.Vector3(0.42, 1.12, -0.12),
    0.055,
    jacket,
  );
  instructor.add(torso, head, helmet, ...legs, belayArm);
  instructor.position.set(-2.2, 0, -0.55);
  return instructor;
}

function makeEquipmentStation() {
  const station = new THREE.Group();
  station.name = "inspected helmet rope sling and climbing equipment";
  const mat = new THREE.MeshStandardMaterial({ color: 0x725038, roughness: 0.92 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 0.68), mat);
  bench.position.y = 0.68;
  station.add(bench);
  for (const x of [-0.62, 0.62]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.68, 0.1), mat);
    leg.position.set(x, 0.34, 0);
    station.add(leg);
  }
  const helmet = makeHelmet(0xfacc15);
  helmet.position.set(-0.5, 0.9, 0);
  helmet.scale.setScalar(0.72);
  const ropeCoil = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.045, 10, 30),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.78 }),
  );
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(0.05, 0.8, 0);
  const connector = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.025, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xc8d2dc, metalness: 0.82, roughness: 0.25 }),
  );
  connector.name = "locking connector and safety sling";
  connector.scale.x = 0.67;
  connector.position.set(0.53, 0.86, 0);
  station.add(helmet, ropeCoil, connector);
  station.position.set(2.1, 0, 0.4);
  return station;
}

function makeRockFace() {
  const group = new THREE.Group();
  group.name = "realistic ninety metre training rock scaled for the simulation";
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 7.9, 0.75, 6, 8, 2),
    new THREE.MeshStandardMaterial({ color: 0x62594e, roughness: 1 }),
  );
  backing.position.set(0, 3.72, -2.38);
  backing.castShadow = true;
  backing.receiveShadow = true;
  group.add(backing);

  const rockMaterials = [0x6f665a, 0x756b5e, 0x5c554d, 0x817465].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.54 + ((row + column) % 3) * 0.07, 1),
        rockMaterials[(row * 3 + column) % rockMaterials.length],
      );
      rock.name = "rough natural rock texture";
      rock.scale.set(1.15 + (column % 2) * 0.2, 0.78, 0.34 + (row % 2) * 0.08);
      rock.position.set(
        -2.65 + column * 0.88 + Math.sin(row * 2.1 + column) * 0.12,
        0.42 + row * 0.94 + Math.sin(column * 1.7) * 0.08,
        -1.94 + Math.sin(row + column * 2.2) * 0.08,
      );
      rock.rotation.set(row * 0.14, column * 0.23, (row - column) * 0.08);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    }
  }

  const routePositions = [
    [-0.55, 0.52], [0.02, 0.92], [0.65, 1.3], [0.93, 1.78],
    [0.36, 2.16], [-0.28, 2.53], [-0.74, 2.98], [-0.12, 3.38],
    [0.55, 3.78], [0.93, 4.22], [0.28, 4.62], [-0.38, 5.02],
    [-0.86, 5.46], [-0.28, 5.92], [0.38, 6.36], [0.08, 6.82],
  ] as const;
  const holds = routePositions.map(([x, y], index) => {
    const hold = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.13 + (index % 3) * 0.018, 1),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? 0xc4a97a : 0x9f835e,
        roughness: 0.96,
        emissive: 0xf59e0b,
        emissiveIntensity: 0,
      }),
    );
    hold.name = index % 2 ? "firm hand hold" : "firm foot hold";
    hold.position.set(x, y, -1.48);
    hold.scale.set(1.35, 0.62, 0.72);
    hold.userData.routeIndex = index;
    group.add(hold);
    return hold;
  });

  const anchorMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8c4cd,
    metalness: 0.82,
    roughness: 0.26,
  });
  for (const x of [-0.18, 0.18]) {
    const piton = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.42, 10), anchorMaterial);
    piton.name = "checked top rope piton";
    piton.position.set(x, 7.23, -1.58);
    piton.rotation.x = Math.PI / 2;
    group.add(piton);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.017, 8, 20), anchorMaterial);
    ring.position.set(x, 7.26, -1.38);
    group.add(ring);
  }
  return { group, holds };
}

type MountainAmbience = { start: () => void; stop: () => void };

function createMountainAmbience(): MountainAmbience {
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  const start = () => {
    if (source) {
      void context?.resume();
      return;
    }
    const AudioContextConstructor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    context = new AudioContextConstructor();
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let index = 0; index < data.length; index += 1) {
      smooth = smooth * 0.992 + (Math.random() * 2 - 1) * 0.008;
      data[index] = smooth;
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.45;
    const gain = context.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  };
  const stop = () => {
    try {
      source?.stop();
    } catch {
      // The source can already be stopped when the immersive session closes.
    }
    source = null;
    void context?.close();
    context = null;
  };
  return { start, stop };
}

export default function RockClimbingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const stageStartRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const ambienceRef = useRef<MountainAmbience | null>(null);
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
    scene.fog = new THREE.Fog(0xb7cad0, 14, 38);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/up-you-go-rock-climbing-360.png",
      { exposure: 1.02, intensity: 0.5 },
    );
    const camera = new THREE.PerspectiveCamera(
      64,
      mount.clientWidth / mount.clientHeight,
      0.05,
      70,
    );
    camera.position.set(4.55, 3.1, 5.4);
    camera.lookAt(0, 2.5, -1.5);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x33443d, 1.75));
    const sun = new THREE.DirectionalLight(0xffefcf, 2.4);
    sun.position.set(-4, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(12, 64),
      new THREE.MeshStandardMaterial({ color: 0x5e6249, roughness: 1 }),
    );
    ground.name = "mountain training ground";
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const pebbles = Array.from({ length: 58 }, (_, index) => {
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + (index % 4) * 0.03, 0),
        new THREE.MeshStandardMaterial({
          color: [0x7b7469, 0x5f5a53, 0x908678][index % 3],
          roughness: 1,
        }),
      );
      const angle = index * 2.399;
      const radius = 1.3 + (index % 11) * 0.5;
      stone.position.set(Math.cos(angle) * radius, 0.05, Math.sin(angle) * radius);
      stone.scale.y = 0.48;
      stone.rotation.set(index * 0.13, index * 0.29, index * 0.07);
      scene.add(stone);
      return stone;
    });

    const { group: rockFace, holds } = makeRockFace();
    scene.add(rockFace);
    const climber = makeClimber();
    climber.position.set(-0.55, 0, -1.12);
    scene.add(climber);
    const instructor = makeInstructor();
    scene.add(instructor);
    const equipment = makeEquipmentStation();
    scene.add(equipment);

    const ropeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.76,
    });
    const anchorPoint = new THREE.Vector3(0, 7.26, -1.36);
    const climberRope = segmentBetween(
      anchorPoint,
      new THREE.Vector3(-0.55, 1.02, -1.12),
      0.028,
      ropeMaterial,
      12,
    );
    climberRope.name = "tensioned top rope connected to the learner sling";
    scene.add(climberRope);
    const belayRope = segmentBetween(
      anchorPoint,
      new THREE.Vector3(-1.8, 1.08, -0.68),
      0.025,
      ropeMaterial,
      12,
    );
    belayRope.name = "belay rope controlled by the trained instructor";
    scene.add(belayRope);

    const connector = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.019, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xcbd5df, metalness: 0.82, roughness: 0.25 }),
    );
    connector.name = "locked sling connector";
    connector.scale.x = 0.66;
    connector.rotation.x = Math.PI / 2;
    scene.add(connector);

    const routeLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        holds.map((hold) => hold.position.clone().add(new THREE.Vector3(0, 0, 0.08))),
      ),
      new THREE.LineDashedMaterial({
        color: 0xfbbf24,
        dashSize: 0.16,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.72,
      }),
    );
    routeLine.name = "planned hand and foot hold route";
    routeLine.computeLineDistances();
    scene.add(routeLine);

    const angleGuide = new THREE.Group();
    angleGuide.name = "visible ninety degree body posture guide";
    const guideMaterial = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.82,
    });
    angleGuide.add(
      segmentBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.15, 0), 0.018, guideMaterial),
      segmentBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1.15), 0.018, guideMaterial),
    );
    const corner = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 18, Math.PI / 2), guideMaterial);
    corner.rotation.y = Math.PI / 2;
    angleGuide.add(corner);
    angleGuide.position.set(1.4, 2.35, -1.42);
    angleGuide.visible = false;
    scene.add(angleGuide);

    const topMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.75, 10),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 }),
    );
    topMarker.name = "top of the supervised climbing route";
    topMarker.position.set(0.08, 7.25, -1.38);
    scene.add(topMarker);
    const markerFlag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        side: THREE.DoubleSide,
        roughness: 0.72,
      }),
    );
    markerFlag.position.set(0.38, 7.47, -1.38);
    topMarker.add(markerFlag);

    const chalkCount = 90;
    const chalkPositions = new Float32Array(chalkCount * 3);
    for (let index = 0; index < chalkCount; index += 1) {
      chalkPositions[index * 3] = (Math.random() - 0.5) * 0.7;
      chalkPositions[index * 3 + 1] = Math.random() * 0.9;
      chalkPositions[index * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    const chalkGeometry = new THREE.BufferGeometry();
    chalkGeometry.setAttribute("position", new THREE.BufferAttribute(chalkPositions, 3));
    const chalkDust = new THREE.Points(
      chalkGeometry,
      new THREE.PointsMaterial({
        color: 0xf8fafc,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    chalkDust.name = "small chalk particles near moving hands";
    scene.add(chalkDust);

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
    card.position.set(2.15, 3.1, 0.45);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22 }),
      );
      button.name = name;
      button.position.set(x, 1.08, 0.72);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, 1.4);
    const actionButton = makeButton("btn-action", 0xd97706, 2.15);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0xf59e0b, 2.9);
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
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
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
      startPosition: new THREE.Vector3(0.6, 0, 3.35),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.65, -1.5);
    controls.enableDamping = true;
    controls.minDistance = 2.6;
    controls.maxDistance = 7.8;
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

      let climberX = -0.55;
      let climberY = 0;
      let climberZ = -1.12;
      let climberLeanZ = 0;
      let climberLeanX = 0;
      if (currentStage === 3) {
        climberY = 0.35;
        climberX = -0.38 + Math.sin(stageAge * 2.3) * 0.18;
        climberZ = -0.88;
        climberLeanZ = Math.sin(stageAge * 2.3) * 0.18;
        climberLeanX = -0.32;
      } else if (currentStage === 4) {
        const progress = THREE.MathUtils.smoothstep(Math.min(stageAge / 3.8, 1), 0, 1);
        climberX = THREE.MathUtils.lerp(-0.55, 0.12, progress);
        climberY = THREE.MathUtils.lerp(0.2, 1.6, progress);
        climberZ = -1.05;
        climberLeanX = -0.08;
      } else if (currentStage === 5) {
        const progress = THREE.MathUtils.smoothstep(Math.min(stageAge / 5.8, 1), 0, 1);
        climberX = Math.sin(progress * Math.PI * 3.2) * 0.55;
        climberY = THREE.MathUtils.lerp(1.55, 4.35, progress);
        climberZ = -1.06;
        climberLeanZ = Math.sin(stageAge * 1.7) * 0.035;
      } else if (currentStage === 6) {
        climberX = 0.05;
        climberY = 5.55;
        climberZ = -1.03;
        climberLeanX = -0.1;
      } else if (currentStage === 7) {
        const rappel = THREE.MathUtils.smoothstep(Math.min(stageAge / 6, 1), 0, 1);
        climberX = 0.05 + Math.sin(stageAge * 1.2) * 0.06;
        climberY = THREE.MathUtils.lerp(5.45, 0.25, rappel);
        climberZ = -0.74;
        climberLeanX = -0.72;
      }
      climber.position.set(climberX, climberY, climberZ);
      climber.rotation.set(climberLeanX, 0, climberLeanZ);

      const harnessPoint = new THREE.Vector3(climberX, climberY + 1.02, climberZ);
      updateSegment(climberRope, anchorPoint, harnessPoint);
      connector.position.copy(harnessPoint);
      connector.rotation.z = Math.sin(elapsed * 2.2) * 0.08;

      routeLine.visible = currentStage === 1 || currentStage === 5;
      holds.forEach((hold, index) => {
        const material = hold.material as THREE.MeshStandardMaterial;
        const highlighted = currentStage === 1
          || (currentStage === 5 && index <= Math.floor((Math.min(stageAge / 5.8, 1)) * holds.length));
        material.emissiveIntensity = highlighted
          ? 0.28 + Math.sin(elapsed * 4 + index * 0.55) * 0.16
          : 0;
        const pulse = highlighted ? 1 + Math.sin(elapsed * 4 + index) * 0.05 : 1;
        hold.scale.set(1.35 * pulse, 0.62 * pulse, 0.72 * pulse);
      });
      equipment.visible = currentStage === 2;
      equipment.position.y = equipment.visible ? Math.sin(elapsed * 1.9) * 0.025 : 0;
      angleGuide.visible = currentStage === 4;
      angleGuide.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.035);
      topMarker.scale.setScalar(currentStage === 6 ? 1 + Math.sin(elapsed * 4) * 0.08 : 1);
      markerFlag.rotation.y = Math.sin(elapsed * 2.3) * 0.2;
      instructor.rotation.y = Math.sin(elapsed * 0.65) * 0.1;

      chalkDust.visible = currentStage >= 4 && currentStage <= 6;
      chalkDust.position.set(climberX, climberY + 1.45, climberZ + 0.15);
      chalkDust.rotation.y = elapsed * 0.15;
      (chalkDust.material as THREE.PointsMaterial).opacity =
        0.38 + Math.sin(elapsed * 2.2) * 0.12;
      pebbles.forEach((pebble, index) => {
        pebble.rotation.y += 0.00015 * (index % 3);
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
    const mountainAmbience = createMountainAmbience();
    ambienceRef.current = mountainAmbience;
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
      mountainAmbience.stop();
      ambienceRef.current = null;
      chalkGeometry.dispose();
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
        background: "#17221f",
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
            background: "radial-gradient(circle at 50% 30%, #4d5d45 0%, #17221f 74%)",
          }}
        >
          <div style={{ maxWidth: 680, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>🧗🏽‍♀️🪢🏔️</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#fbbf24",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 5 • Chapter 9 • Activity 2
            </div>
            <h1
              style={{
                color: "#f7fee7",
                fontSize: "clamp(2.1rem, 5vw, 3.1rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              Rock Climbing
            </h1>
            <p style={{ color: "#ecfccb", lineHeight: 1.7 }}>
              Learn the supervised climbing sequence from the NCERT story:
              observe the holds, connect the safety system, recover from a slip,
              climb with a straight posture and rappel down.
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
              background: "rgba(23,34,31,0.95)",
              border: "1px solid rgba(251,191,36,0.42)",
              color: "#f7fee7",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#fbbf24",
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Activity 2 • Stage {stage + 1}/{STAGES.length}
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.18rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
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
                color: stage === 7 ? "#86efac" : "#fde68a",
                fontSize: "0.76rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {stage === 7
                ? "Activity complete • Observation, safety, balance and courage"
                : `${stage} of 7 rock-climbing discoveries completed`}
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
              color: "#ecfccb",
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
  background: "linear-gradient(135deg, #d97706, #b45309)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(251,191,36,0.42)",
  background: "rgba(251,191,36,0.1)",
  color: "#fef3c7",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#ecfccb",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ecfccb",
  cursor: "pointer",
} as const;
