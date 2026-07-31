"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import { applyRealisticEnvironment } from "./realisticEnvironment";

const RIVER_LENGTH = 18;
const RIVER_WIDTH = 3.8;

const STAGES = [
  {
    title: "Survey the Mountain River",
    cue: "Observe the cold current, the two banks and the supervised crossing route.",
    detail: "After an eight-kilometre trek, the group in the NCERT story reaches a fast-flowing mountain river. A trained instructor has prepared a protected route across it.",
    action: "Inspect the safety equipment",
  },
  {
    title: "Check Before You Cross",
    cue: "Identify the helmet, harness, sling, locking connector and thick main rope.",
    detail: "Adventure equipment must be checked and fitted by a trained instructor. This simulation is for learning—not for attempting a real river crossing without expert supervision.",
    action: "Inspect both anchors",
  },
  {
    title: "Test the Piton Anchors",
    cue: "Follow the thick rope from one bank to the other.",
    detail: "The textbook describes the rope as tightly fixed to pegs, or pitons, on both banks. Secure anchors keep the main rope in place while the safety system is checked.",
    action: "Attach the safety sling",
  },
  {
    title: "Clip In to the Main Rope",
    cue: "Connect the learner's secured harness and sling to the thick rope.",
    detail: "The sling and locking connector link the learner to the main rope. The instructor confirms the attachment before anyone enters the water.",
    action: "Step into the icy water",
  },
  {
    title: "Cross with Firm Footsteps",
    cue: "Hold the rope and place each foot carefully on the riverbed.",
    detail: "Face the crossing, keep both hands on the rope and test each foothold before shifting weight. The safety sling stays connected while the learner moves slowly.",
    action: "Meet the strongest current",
  },
  {
    title: "Recover from a Slip",
    cue: "See how the safety connection supports the learner while balance is regained.",
    detail: "In the story, Sangeeta loses her balance and the rope slips from her hands, but the sling keeps her connected. She listens, regains her grip and pulls herself forward.",
    action: "Reach the far bank",
  },
  {
    title: "Help the Team Across",
    cue: "Encourage the next person and repeat the instructor's safety reminders.",
    detail: "Courage grows through preparation, support and calm action. A responsible group leader stays attentive, helps others and follows the instructor.",
    action: "Review the adventure",
  },
  {
    title: "River Crossing Complete",
    cue: "Connect equipment, technique, teamwork and courage.",
    detail: "The thick rope, secure piton anchors, fitted sling and trained instructor create a protected system. Careful footsteps and teamwork help the learner complete the challenge.",
    action: "Activity complete",
  },
];

const NARRATIONS = [
  "Welcome to Chapter 9, Up You Go, Activity 1, River Crossing Adventure. After an eight kilometre trek, the group reaches a cold, fast-flowing mountain river. A trained instructor has prepared a supervised crossing route. Look at the two banks, the moving water and the thick rope stretched across the river.",
  "Before anyone enters the river, inspect the equipment. The learner wears a helmet and a properly fitted harness. A safety sling with a locking connector links the learner to the thick main rope. Every item must be checked by a trained instructor. Never try a real river crossing without expert supervision and approved equipment.",
  "Trace the thick rope from one bank to the other. In the textbook, it is tightly fixed to strong pegs called pitons on both sides. The instructor checks each anchor, the knots and the tension before the crossing begins.",
  "Now the instructor attaches the learner's secured harness and sling to the main rope. The locking connector closes around the rope. The learner is connected before stepping into the water, and the instructor confirms the system.",
  "Enter the cold water slowly. Keep both hands on the rope. Place each foot firmly on the rocky riverbed and test the foothold before shifting your weight. Move one careful step at a time while the safety sling remains attached.",
  "The current becomes stronger and the learner slips. In Sangeeta's story, the rope slipped from her hands, but the sling kept her connected. Listen to the instructor, regain the rope, steady both feet and continue calmly.",
  "The learner reaches the far bank and turns to encourage the group. A responsible teammate reminds others to hold the rope, move slowly and follow the instructor. Courage does not mean ignoring risk. It means preparing well and acting carefully even when you feel afraid.",
  "River crossing complete. You inspected the equipment, checked the piton anchors, attached the safety sling, used firm footsteps, recovered from a slip and supported the team. The lesson joins safety, discipline, courage and cooperation.",
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
  context.fillStyle = "#102b35";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#7dd3fc";
  context.font = "bold 21px sans-serif";
  context.fillText(`Activity 1  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#e0f2fe";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = stage === STAGES.length - 1 ? "#86efac" : "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(
    stage === STAGES.length - 1
      ? "Inspect → Connect → Cross → Recover → Support"
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
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return segment;
}

function updateSegment(
  segment: THREE.Mesh,
  from: THREE.Vector3,
  to: THREE.Vector3,
) {
  const direction = to.clone().sub(from);
  segment.position.copy(from).add(to).multiplyScalar(0.5);
  segment.scale.y = direction.length();
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function makeBraidedRope(from: THREE.Vector3, to: THREE.Vector3) {
  const rope = new THREE.Group();
  rope.name = "realistic braided main rope tied across the river";
  const colours = [0xd89b3c, 0xf0bd62, 0xa96824];
  for (let strand = 0; strand < 3; strand += 1) {
    const points = Array.from({ length: 65 }, (_, index) => {
      const progress = index / 64;
      const centre = from.clone().lerp(to, progress);
      const twist = progress * Math.PI * 22 + strand * ((Math.PI * 2) / 3);
      centre.x += Math.cos(twist) * 0.027;
      centre.y += Math.sin(twist) * 0.027 - Math.sin(progress * Math.PI) * 0.055;
      return centre;
    });
    const curve = new THREE.CatmullRomCurve3(points);
    const strandMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 128, 0.024, 7, false),
      new THREE.MeshStandardMaterial({
        color: colours[strand],
        roughness: 0.9,
      }),
    );
    strandMesh.castShadow = true;
    rope.add(strandMesh);
  }
  return rope;
}

function makeRiverWaterMaterial() {
  return new THREE.ShaderMaterial({
    name: "animated fast river water with foam",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uCurrent: { value: 1 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uCurrent;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float longWave = sin(position.x * 3.7 - uTime * 4.8 * uCurrent) * 0.035;
        float crossWave = sin(position.y * 7.2 + uTime * 3.1) * 0.022;
        float detailWave = sin((position.x + position.y) * 9.0 - uTime * 7.0) * 0.012;
        vWave = longWave + crossWave + detailWave;
        transformed.z += vWave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uCurrent;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        float streakA = sin(vUv.x * 126.0 - uTime * 7.0 * uCurrent + sin(vUv.y * 19.0) * 2.0);
        float streakB = sin(vUv.x * 76.0 - uTime * 5.0 * uCurrent - vUv.y * 23.0);
        float foam = smoothstep(0.72, 0.98, streakA * 0.5 + 0.5);
        foam += smoothstep(0.84, 1.0, streakB * 0.5 + 0.5) * 0.65;
        foam *= 0.4 + smoothstep(0.015, 0.06, abs(vWave));
        float bankFade = smoothstep(0.0, 0.065, vUv.y)
          * (1.0 - smoothstep(0.935, 1.0, vUv.y));
        float lengthFade = smoothstep(0.0, 0.025, vUv.x)
          * (1.0 - smoothstep(0.975, 1.0, vUv.x));
        float riverFade = bankFade * lengthFade;
        vec3 deepWater = vec3(0.025, 0.28, 0.39);
        vec3 shallowWater = vec3(0.08, 0.55, 0.68);
        vec3 colour = mix(deepWater, shallowWater, 0.48 + vUv.y * 0.18);
        colour = mix(colour, vec3(0.86, 0.96, 0.98), clamp(foam, 0.0, 0.9));
        gl_FragColor = vec4(
          colour,
          (0.54 + clamp(foam, 0.0, 0.32)) * riverFade
        );
      }
    `,
  });
}

type RiverAmbience = {
  start: () => void;
  setIntensity: (value: number) => void;
  stop: () => void;
};

function createRiverAmbience(): RiverAmbience {
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;

  const start = () => {
    if (source) {
      void context?.resume();
      return;
    }
    const AudioContextConstructor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    context = new AudioContextConstructor();
    const seconds = 3;
    const buffer = context.createBuffer(2, context.sampleRate * seconds, context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      let previous = 0;
      for (let index = 0; index < data.length; index += 1) {
        const noise = Math.random() * 2 - 1;
        previous = previous * 0.82 + noise * 0.18;
        data[index] = previous * 0.72 + noise * 0.08;
      }
    }
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1350;
    filter.Q.value = 0.65;
    gain = context.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  };

  const setIntensity = (value: number) => {
    if (!gain || !context) return;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.linearRampToValueAtTime(value, context.currentTime + 0.45);
  };

  const stop = () => {
    try {
      source?.stop();
    } catch {
      // The source may already have stopped while leaving immersive mode.
    }
    source = null;
    gain = null;
    void context?.close();
    context = null;
  };

  return { start, setIntensity, stop };
}

function makeFirstPersonCrossingView() {
  const view = new THREE.Group();
  view.name = "first-person rope gripping view";
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xd99b3e, roughness: 0.9 });
  const gloveMaterial = new THREE.MeshStandardMaterial({ color: 0x242f3a, roughness: 0.78 });
  const sleeveMaterial = new THREE.MeshStandardMaterial({ color: 0xe08b18, roughness: 0.84 });
  const closeRope = segmentBetween(
    new THREE.Vector3(0, -0.1, -0.5),
    new THREE.Vector3(0, -0.1, -2.6),
    0.032,
    ropeMaterial,
    12,
  );
  closeRope.name = "rope continuing through the learner viewpoint";
  view.add(closeRope);
  for (const side of [-1, 1]) {
    const handZ = side < 0 ? -0.82 : -1.08;
    const sleeve = segmentBetween(
      new THREE.Vector3(side * 0.3, -0.43, -0.3),
      new THREE.Vector3(side * 0.1, -0.2, handZ + 0.12),
      0.052,
      sleeveMaterial,
      12,
    );
    const glove = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.1, 6, 12), gloveMaterial);
    glove.name = "gloved hand gripping rope";
    glove.position.set(side * 0.085, -0.1, handZ);
    glove.rotation.set(Math.PI / 2, 0, side * 0.35);
    view.add(sleeve, glove);
  }
  const harnessTether = segmentBetween(
    new THREE.Vector3(0.22, -0.42, -0.4),
    new THREE.Vector3(0.05, -0.13, -0.9),
    0.012,
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 }),
  );
  harnessTether.name = "first-person visible safety tether";
  view.add(harnessTether);
  view.visible = false;
  return view;
}

function makePitonAnchor(z: number) {
  const group = new THREE.Group();
  group.name = "realistic tested piton anchor";
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x59636b, roughness: 0.98 });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xabb7c3,
    roughness: 0.34,
    metalness: 0.78,
  });
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xd89b3c, roughness: 0.9 });
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 2), rockMaterial);
  rock.scale.set(1.15, 0.58, 0.9);
  rock.position.y = 0.28;
  rock.castShadow = true;
  group.add(rock);
  for (const x of [-0.18, 0.18]) {
    const piton = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.52, 10), metalMaterial);
    piton.rotation.z = x < 0 ? -0.2 : 0.2;
    piton.position.set(x, 0.58, 0);
    group.add(piton);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 18), metalMaterial);
    ring.position.set(x, 0.82, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    group.add(
      segmentBetween(
        new THREE.Vector3(x, 0.82, 0),
        new THREE.Vector3(0, 1.35, 0),
        0.028,
        ropeMaterial,
        10,
      ),
    );
  }
  const masterConnector = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 20), metalMaterial);
  masterConnector.position.y = 1.36;
  masterConnector.scale.x = 0.68;
  group.add(masterConnector);
  group.position.set(0, 0, z);
  return group;
}

function makeHelmet(color: number) {
  const helmet = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    new THREE.MeshStandardMaterial({ color, roughness: 0.46 }),
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

function makeLearner() {
  const learner = new THREE.Group();
  learner.name = "learner secured to safety sling";
  const jacket = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.76 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x26364a, roughness: 0.86 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x302a25, roughness: 0.92 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9a6848, roughness: 0.84 });
  const harness = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.66 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.56, 8, 14), jacket);
  torso.name = "weatherproof jacket";
  torso.position.y = 1.28;
  torso.castShadow = true;
  learner.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), skin);
  head.position.y = 1.91;
  learner.add(head);
  const helmet = makeHelmet(0xfacc15);
  helmet.position.y = 2.08;
  learner.add(helmet);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.035, 8, 26), harness);
  belt.name = "properly fitted harness";
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.05;
  learner.add(belt);
  for (const side of [-1, 1]) {
    const thighLoop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 20), harness);
    thighLoop.rotation.x = Math.PI / 2;
    thighLoop.position.set(side * 0.12, 0.76, 0);
    learner.add(thighLoop);
    const arm = new THREE.Group();
    arm.name = "hand holding main rope";
    const upper = segmentBetween(
      new THREE.Vector3(side * 0.18, 1.55, 0),
      new THREE.Vector3(side * 0.38, 1.38, -0.08),
      0.065,
      jacket,
    );
    const lower = segmentBetween(
      new THREE.Vector3(side * 0.38, 1.38, -0.08),
      new THREE.Vector3(side * 0.25, 1.48, -0.28),
      0.052,
      skin,
    );
    arm.add(upper, lower);
    learner.add(arm);
    const leg = new THREE.Group();
    const upperLeg = segmentBetween(
      new THREE.Vector3(side * 0.12, 0.92, 0),
      new THREE.Vector3(side * 0.16, 0.48, side * 0.03),
      0.09,
      trousers,
    );
    const lowerLeg = segmentBetween(
      new THREE.Vector3(side * 0.16, 0.48, side * 0.03),
      new THREE.Vector3(side * 0.2, 0.12, side * 0.05),
      0.075,
      trousers,
    );
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.34), boot);
    shoe.position.set(side * 0.2, 0.08, -0.1 + side * 0.02);
    leg.add(upperLeg, lowerLeg, shoe);
    learner.add(leg);
  }
  return learner;
}

function makeGuide() {
  const guide = new THREE.Group();
  guide.name = "trained river crossing instructor";
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
  const signalArm = segmentBetween(
    new THREE.Vector3(-0.16, 1.42, 0),
    new THREE.Vector3(-0.46, 1.92, 0),
    0.055,
    jacket,
  );
  guide.add(torso, head, helmet, ...legs, signalArm);
  guide.position.set(-1.05, 0, -2.05);
  return guide;
}

function makeEquipmentStation() {
  const station = new THREE.Group();
  station.name = "checked adventure safety equipment";
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.12, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x74523c, roughness: 0.92 }),
  );
  table.position.y = 0.76;
  station.add(table);
  for (const x of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.75, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x4b3729, roughness: 0.95 }),
    );
    leg.position.set(x, 0.38, 0);
    station.add(leg);
  }
  const helmet = makeHelmet(0xfacc15);
  helmet.position.set(-0.55, 0.98, 0);
  helmet.scale.setScalar(0.75);
  station.add(helmet);
  const ropeCoil = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.045, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xe2a447, roughness: 0.84 }),
  );
  ropeCoil.name = "thick rope coil";
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(0.04, 0.88, 0);
  station.add(ropeCoil);
  const carabiner = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xb8c6d2, roughness: 0.28, metalness: 0.8 }),
  );
  carabiner.name = "locking connector and safety sling";
  carabiner.scale.set(0.68, 1, 1);
  carabiner.position.set(0.56, 0.93, 0);
  station.add(carabiner);
  station.position.set(-1.7, 0, 2.2);
  return station;
}

function makeFlowArrow(x: number, z: number) {
  const arrow = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.32,
    transparent: true,
    opacity: 0.74,
  });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.09), material);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 8), material);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 0.43;
  arrow.add(shaft, tip);
  arrow.position.set(x, 0.22, z);
  return arrow;
}

export default function RiverCrossingAdventureViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const stageStartRef = useRef(0);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const riverAmbienceRef = useRef<RiverAmbience | null>(null);
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
    riverAmbienceRef.current?.setIntensity(safeStage === 4 || safeStage === 5 ? 0.075 : 0.035);
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
    scene.fog = new THREE.Fog(0xb8d6e1, 17, 42);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/up-you-go-river-crossing-360.png",
      { exposure: 1.02, intensity: 0.5 },
    );
    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.05, 80);
    camera.position.set(4.8, 3.15, 6.4);
    camera.lookAt(0, 1.05, 0);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xe8f7ff, 0x314653, 1.9));
    const sun = new THREE.DirectionalLight(0xffedc7, 2.35);
    sun.position.set(-5, 8, 4);
    sun.castShadow = true;
    scene.add(sun);

    const riverWaterMaterial = makeRiverWaterMaterial();
    const riverWater = new THREE.Mesh(
      new THREE.PlaneGeometry(RIVER_LENGTH, RIVER_WIDTH, 180, 64),
      riverWaterMaterial,
    );
    riverWater.name = "cold fast-flowing mountain water with animated foam";
    riverWater.rotation.x = -Math.PI / 2;
    riverWater.position.y = 0.12;
    scene.add(riverWater);

    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7779, roughness: 0.98 });
    const stones = Array.from({ length: 36 }, (_, index) => {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (index % 5) * 0.035, 0), stoneMaterial);
      stone.scale.set(1.25, 0.6, 0.9);
      stone.position.set(
        -3.35 + ((index * 1.37) % 6.7),
        0.035,
        -1.5 + ((index * 0.83) % 3.0),
      );
      stone.rotation.set(index * 0.17, index * 0.31, index * 0.11);
      stone.castShadow = true;
      scene.add(stone);
      return stone;
    });

    const mainRope = makeBraidedRope(
      new THREE.Vector3(0, 1.48, 2.45),
      new THREE.Vector3(0, 1.48, -2.45),
    );
    scene.add(mainRope);

    const foamParticleCount = 760;
    const foamPositions = new Float32Array(foamParticleCount * 3);
    const foamBaseX = new Float32Array(foamParticleCount);
    const foamBaseZ = new Float32Array(foamParticleCount);
    const foamPhase = new Float32Array(foamParticleCount);
    for (let index = 0; index < foamParticleCount; index += 1) {
      foamBaseX[index] = -RIVER_LENGTH / 2 + Math.random() * RIVER_LENGTH;
      foamPositions[index * 3] = foamBaseX[index];
      foamBaseZ[index] = -RIVER_WIDTH / 2 + 0.18
        + Math.random() * (RIVER_WIDTH - 0.36);
      foamPositions[index * 3 + 1] = 0.19 + Math.random() * 0.035;
      foamPositions[index * 3 + 2] = foamBaseZ[index];
      foamPhase[index] = Math.random() * Math.PI * 2;
    }
    const foamGeometry = new THREE.BufferGeometry();
    foamGeometry.setAttribute("position", new THREE.BufferAttribute(foamPositions, 3));
    const foamParticles = new THREE.Points(
      foamGeometry,
      new THREE.PointsMaterial({
        color: 0xe7f8fb,
        size: 0.048,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    foamParticles.name = "fast current foam and spray particles";
    scene.add(foamParticles);

    const shorelineFoamMaterial = new THREE.MeshBasicMaterial({
      color: 0xdff8fb,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const shorelineFoam = [-RIVER_WIDTH / 2 + 0.08, RIVER_WIDTH / 2 - 0.08].map((z, sideIndex) => {
      const points = Array.from({ length: 80 }, (_, index) => {
        const progress = index / 79;
        return new THREE.Vector3(
          -RIVER_LENGTH / 2 + 0.2 + progress * (RIVER_LENGTH - 0.4),
          0.205,
          z + Math.sin(progress * Math.PI * 7 + sideIndex) * 0.075,
        );
      });
      const foam = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, 0.014, 6, false),
        shorelineFoamMaterial,
      );
      foam.name = "irregular shoreline foam";
      scene.add(foam);
      return foam;
    });

    const nearAnchor = makePitonAnchor(2.54);
    const farAnchor = makePitonAnchor(-2.54);
    scene.add(nearAnchor, farAnchor);

    const learner = makeLearner();
    learner.position.set(0.32, 0.12, 2.0);
    learner.rotation.y = Math.PI;
    scene.add(learner);
    const guide = makeGuide();
    scene.add(guide);
    const equipment = makeEquipmentStation();
    scene.add(equipment);

    const carabiner = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.022, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xd7e2ea, roughness: 0.25, metalness: 0.84 }),
    );
    carabiner.name = "locked connector on main rope";
    carabiner.scale.set(0.68, 1, 1);
    carabiner.rotation.x = Math.PI / 2;
    scene.add(carabiner);
    const tether = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1, 10),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.75 }),
    );
    tether.name = "safety sling remains connected";
    scene.add(tether);

    const firstPersonCrossingView = makeFirstPersonCrossingView();
    camera.add(firstPersonCrossingView);

    const splashMaterial = new THREE.MeshBasicMaterial({
      color: 0xe3f7fa,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const splashRings = Array.from({ length: 12 }, (_, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.18, 28),
        splashMaterial.clone(),
      );
      ring.name = "learner foot splash";
      ring.rotation.x = -Math.PI / 2;
      ring.userData.phase = index / 12;
      scene.add(ring);
      return ring;
    });
    const droplets = Array.from({ length: 48 }, (_, index) => {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.012 + (index % 4) * 0.003, 6, 5),
        new THREE.MeshBasicMaterial({
          color: 0xcdf3f7,
          transparent: true,
          opacity: 0.78,
        }),
      );
      drop.name = "cold water spray droplet";
      drop.userData.phase = (index / 48) * Math.PI * 2;
      scene.add(drop);
      return drop;
    });

    const riverAmbience = createRiverAmbience();
    riverAmbienceRef.current = riverAmbience;

    const flowArrows = [
      makeFlowArrow(-1.8, -0.72),
      makeFlowArrow(-0.65, 0.6),
      makeFlowArrow(0.7, -0.12),
      makeFlowArrow(1.78, 0.78),
    ];
    flowArrows.forEach((arrow) => scene.add(arrow));

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
    card.position.set(-2.05, 2.65, -2.25);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      button.name = name;
      button.position.set(x, 1.08, -2.12);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.75);
    const actionButton = makeButton("btn-action", 0x0284c7, 0);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0x38bdf8, 0.75);
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
      startPosition: new THREE.Vector3(0.65, 0, 2.3),
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.02, 0);
    controls.enableDamping = true;
    controls.minDistance = 3.1;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.025;
    const wideCameraPosition = camera.position.clone();
    const wideCameraTarget = controls.target.clone();
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

      riverWaterMaterial.uniforms.uTime.value = elapsed;
      riverWaterMaterial.uniforms.uCurrent.value = currentStage === 4 || currentStage === 5 ? 1.35 : 1;
      const foamSpeed = currentStage === 4 || currentStage === 5 ? 1.35 : 0.9;
      const foamPositionAttribute = foamGeometry.getAttribute("position") as THREE.BufferAttribute;
      for (let index = 0; index < foamParticleCount; index += 1) {
        foamPositions[index * 3] = -RIVER_LENGTH / 2
          + THREE.MathUtils.euclideanModulo(
            foamBaseX[index] + elapsed * foamSpeed + RIVER_LENGTH / 2,
            RIVER_LENGTH,
          );
        foamPositions[index * 3 + 1] = 0.19 + Math.sin(elapsed * 5 + foamPhase[index]) * 0.026;
        foamPositions[index * 3 + 2] = foamBaseZ[index]
          + Math.sin(elapsed * 2.5 + foamPhase[index]) * 0.045;
      }
      foamPositionAttribute.needsUpdate = true;
      shorelineFoam.forEach((foam, index) => {
        foam.position.x = Math.sin(elapsed * 1.8 + index * 1.7) * 0.035;
      });
      stones.forEach((stone, index) => {
        stone.position.y = 0.035 + Math.sin(elapsed * 1.9 + index * 0.7) * 0.004;
      });
      flowArrows.forEach((arrow, index) => {
        arrow.visible = currentStage === 0;
        arrow.position.x = -2.8 + ((elapsed * 0.62 + index * 1.35) % 5.6);
      });

      equipment.visible = currentStage === 1;
      equipment.position.y = equipment.visible ? Math.sin(elapsed * 1.8) * 0.025 : 0;
      nearAnchor.visible = currentStage >= 2;
      farAnchor.visible = currentStage >= 2;
      const anchorPulse = 1 + (currentStage === 2 ? Math.sin(elapsed * 4) * 0.045 : 0);
      nearAnchor.scale.setScalar(anchorPulse);
      farAnchor.scale.setScalar(anchorPulse);

      let learnerZ = 2;
      let learnerX = 0.32;
      let learnerY = 0.12;
      let learnerLean = 0;
      if (currentStage === 3) {
        learnerZ = 1.72;
        learnerX = 0.24;
      } else if (currentStage === 4) {
        const progress = THREE.MathUtils.smoothstep(Math.min(stageAge / 4.4, 1), 0, 1);
        learnerZ = THREE.MathUtils.lerp(1.65, 0.12, progress);
        learnerX = 0.2 + Math.sin(stageAge * 3.4) * 0.06;
        learnerY = 0.06 + Math.sin(stageAge * 5.2) * 0.02;
      } else if (currentStage === 5) {
        learnerZ = -0.42;
        learnerX = 0.2;
        const recovery = THREE.MathUtils.smoothstep(Math.min(stageAge / 3.2, 1), 0, 1);
        learnerLean = THREE.MathUtils.lerp(0.72, 0, recovery);
        learnerY = THREE.MathUtils.lerp(-0.08, 0.06, recovery);
      } else if (currentStage >= 6) {
        learnerZ = -1.92;
        learnerX = 0.38;
        learnerY = 0.12;
      }
      learner.position.set(learnerX, learnerY, learnerZ);
      learner.rotation.set(0, Math.PI, learnerLean);
      const crossingActive = currentStage === 4 || currentStage === 5;
      learner.visible = !crossingActive;
      card.visible = !crossingActive;
      interactables.forEach((button) => {
        button.visible = !crossingActive;
      });
      firstPersonCrossingView.visible = crossingActive;
      firstPersonCrossingView.position.y = Math.sin(elapsed * 4.2) * 0.012;
      firstPersonCrossingView.rotation.z = currentStage === 5
        ? Math.sin(elapsed * 3.4) * 0.045
        : Math.sin(elapsed * 2.1) * 0.012;
      splashRings.forEach((ring, index) => {
        ring.visible = crossingActive;
        if (!ring.visible) return;
        const cycle = THREE.MathUtils.euclideanModulo(stageAge * 0.85 + ring.userData.phase, 1);
        const footSide = index % 2 === 0 ? -1 : 1;
        ring.position.set(
          learnerX + footSide * 0.16,
          0.225,
          learnerZ + (index % 3 - 1) * 0.11,
        );
        ring.scale.setScalar(0.55 + cycle * 2.5);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.68;
      });
      droplets.forEach((drop, index) => {
        drop.visible = crossingActive;
        if (!drop.visible) return;
        const cycle = THREE.MathUtils.euclideanModulo(
          stageAge * (0.8 + (index % 5) * 0.08) + index / droplets.length,
          1,
        );
        const phase = drop.userData.phase as number;
        drop.position.set(
          learnerX + Math.cos(phase) * (0.18 + cycle * 0.42),
          0.18 + Math.sin(cycle * Math.PI) * (0.34 + (index % 4) * 0.05),
          learnerZ + Math.sin(phase) * (0.18 + cycle * 0.35),
        );
        (drop.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.78;
      });

      const connected = currentStage >= 3 && currentStage <= 6;
      carabiner.visible = connected && !crossingActive;
      tether.visible = connected && !crossingActive;
      if (carabiner.visible) {
        carabiner.position.set(0, 1.48, learnerZ);
        carabiner.rotation.z = Math.sin(elapsed * 2.2) * 0.08;
        updateSegment(
          tether,
          new THREE.Vector3(learnerX, learnerY + 1.05, learnerZ),
          new THREE.Vector3(0, 1.43, learnerZ),
        );
      }

      guide.visible = currentStage >= 3 && !crossingActive;
      guide.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
      if (currentStage >= 6) guide.position.x = -0.85;

      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) {
        if (crossingActive) {
          controls.enabled = false;
          const immersiveCameraPosition = new THREE.Vector3(
            0.58,
            1.64 + Math.sin(elapsed * 3.7) * 0.018,
            learnerZ + 1.2,
          );
          camera.position.lerp(immersiveCameraPosition, 0.075);
          camera.lookAt(0, 1.18, learnerZ - 1.65);
        } else if (!controls.enabled) {
          camera.position.lerp(wideCameraPosition, 0.08);
          controls.target.lerp(wideCameraTarget, 0.08);
          camera.lookAt(controls.target);
          if (camera.position.distanceTo(wideCameraPosition) < 0.12) controls.enabled = true;
        } else {
          controls.update();
        }
      }
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
      controllers.forEach((controller) =>
        controller.removeEventListener("selectstart", onControllerSelect as any),
      );
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      riverAmbience.stop();
      riverAmbienceRef.current = null;
      riverWaterMaterial.dispose();
      foamGeometry.dispose();
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
      riverAmbienceRef.current?.start();
      riverAmbienceRef.current?.setIntensity(0.035);
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
        background: "#102b35",
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
            background: "radial-gradient(circle at 50% 32%, #24697a 0%, #102b35 72%)",
          }}
        >
          <div style={{ maxWidth: 680, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>🏔️🪢🌊</div>
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
              Class 5 • Chapter 9 • Activity 1
            </div>
            <h1
              style={{
                color: "#f0f9ff",
                fontSize: "clamp(2.1rem, 5vw, 3.1rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              River Crossing Adventure
            </h1>
            <p style={{ color: "#e0f2fe", lineHeight: 1.7 }}>
              Join a supervised mountain adventure and learn how equipment,
              careful movement, courage and teamwork support a protected river crossing.
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
                  riverAmbienceRef.current?.start();
                  riverAmbienceRef.current?.setIntensity(0.035);
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
              background: "rgba(16,43,53,0.95)",
              border: "1px solid rgba(125,211,252,0.42)",
              color: "#f0f9ff",
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
              Activity 1 • Stage {stage + 1}/{STAGES.length}
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
                border: "1px solid rgba(125,211,252,0.2)",
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
                ? "Adventure complete • Safety, courage and teamwork mastered"
                : `${stage} of 7 river-crossing discoveries completed`}
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
              color: "#e0f2fe",
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
  border: "1px solid rgba(125,211,252,0.42)",
  background: "rgba(125,211,252,0.1)",
  color: "#e0f2fe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#e0f2fe",
  fontSize: "0.84rem",
  lineHeight: 1.55,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#e0f2fe",
  cursor: "pointer",
} as const;
