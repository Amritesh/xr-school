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
    title: "Approach the Great Gate",
    cue: "Observe the height, heavy wooden doors, iron spikes and very thick stone walls.",
    detail:
      "At Golconda, the textbook children first notice the huge gate and massive walls. These features controlled entry and helped protect the people, homes and workplaces inside the fort.",
    action: "Inspect the gate closely",
  },
  {
    title: "Look Out from a Bastion",
    cue: "Compare a high rounded bastion with a long, straight section of wall.",
    detail:
      "A bastion projects outward from the wall, giving observers a wider view in several directions. Golconda's outer wall is described as having 87 bastions, with openings that allowed watch from protected positions.",
    action: "Reveal the wider field of view",
  },
  {
    title: "Read the Fort as a Town",
    cue: "Use the map and compass to locate gates, palaces, gardens, fields, workshops and water places.",
    detail:
      "Golconda was more than a ruler's residence. The map helped the children infer that farmers, craftspeople, workers and many families lived and worked inside this fortified town.",
    action: "Orient the fort map",
  },
  {
    title: "Investigate the Palace Ruins",
    cue: "Examine steps, arches, rooms and fine stone carving without touching the surfaces.",
    detail:
      "Ruined walls are evidence, not empty space. Their floors, halls, ventilation openings and carved details help us ask how buildings provided light, air and comfortable places centuries ago.",
    action: "Highlight the architectural clues",
  },
  {
    title: "Trace the Water Engineering",
    cue: "Follow water from a well to a chain of pots, storage tanks, clay pipes and terrace fountains.",
    detail:
      "The chapter shows how animal power, toothed wheels and a moving chain of pots could lift water. Tanks stored it and clay pipes carried it to different parts of the palace without electric pumps.",
    action: "Start the water-lifting model",
  },
  {
    title: "Test the Fort's Acoustics",
    cue: "Send a supervised clap from the gateway and watch sound waves travel toward the palace.",
    detail:
      "The children learn that a voice or clap near Fateh Darwaza could be heard at the king's palace. The shape and hard surfaces guide reflected sound; the simulation visualises this effect without claiming a single simple path.",
    action: "Send the acoustic signal",
  },
  {
    title: "Let Objects Tell Stories",
    cue: "Inspect pottery, metalwork and building traces, then separate evidence from imagination.",
    detail:
      "Maps, old paintings, records and excavated objects help historians study daily life. A broken pot is valuable evidence about materials and skills, but one object cannot tell us every detail by itself.",
    action: "Connect each clue to a question",
  },
  {
    title: "Protect the Story in the Walls",
    cue: "Leave every surface untouched, carry waste out and report damage instead of adding marks.",
    detail:
      "Historic walls have survived rulers, work, celebration, conflict and weather. Visitors protect that shared story by following site rules, staying on paths and never scratching or writing on the monument.",
    action: "Visit complete",
  },
] as const;

const NARRATIONS = [
  "Welcome to Chapter 10, Walls Tell Stories, Activity 1, A Visit to an Ancient Fort. We are entering Golconda Fort in Hyderabad. Begin at the great gateway. Notice its height, the heavy wooden doors, pointed iron spikes and the enormous thickness of the stone walls. These are not decorations alone. Together they controlled entry and helped protect the busy settlement inside.",
  "Now compare the straight fort wall with a rounded bastion. A bastion projects outward and rises above the wall, so a watcher can observe a much wider area and more than one direction. The chapter tells us that the outer wall of Golconda has eighty-seven bastions. Look through the openings and notice how the stone protects the observer while preserving a distant view.",
  "Study the fort map and find the four directions. Mark the gates, palaces, gardens, fields, workshops and water places. Golconda was not only a palace for a ruler. The map suggests a complete fortified town where farmers, craftspeople, workers, families and officials lived and worked. A map turns scattered ruins into connected evidence about a community.",
  "Walk carefully among the palace ruins. Observe the steps, arches, rooms, carved stone and openings for air and daylight. Missing roofs and broken walls do not make the place meaningless. Their shapes help us ask how halls were arranged and how people created comfortable spaces centuries ago. Look closely, but never touch or climb on fragile remains.",
  "Trace the old water system. Animal power could turn toothed wheels, moving a chain of pots that lifted water from a well. Water then collected in tanks and travelled through clay pipes to rooms, gardens and fountains, even at higher levels. This engineering used gravity, stored energy and careful planning long before electric pumps were available.",
  "At Fateh Darwaza, make one supervised clap. The hard curved surfaces reflect and guide sound, allowing a signal from the gateway to be heard near the palace. Watch the rings show several reflected paths. The exact acoustic pattern is complex, but the experience teaches us that builders understood how the form and material of a space could help communication.",
  "Now examine the evidence collected around the fort: pottery fragments, metal objects, maps, paintings, records and building marks. Each clue can answer some questions about materials, work and daily life. Historians compare several sources because one broken pot cannot prove every detail. Use evidence first, and clearly label anything that is only an informed imagination.",
  "Complete the visit by protecting the monument. Do not scratch names, touch carvings, remove stones or leave rubbish. Stay on marked paths and tell a responsible adult or site worker if you see damage. The walls have witnessed centuries of life and change. When we care for them, their evidence remains available for the next generation. Your ancient fort visit is complete.",
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
  context.fillStyle = "#24180f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#f5c16c";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#f5c16c";
  context.font = "bold 21px sans-serif";
  context.fillText(
    `Activity 1  •  Stage ${stage + 1}/${STAGES.length}`,
    24,
    38,
  );
  context.fillStyle = "#fff7ed";
  context.font = "bold 29px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#fde7c5";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 120, canvas.width - 48, 28);
  context.fillStyle = stage === STAGES.length - 1 ? "#86efac" : "#fcd34d";
  context.font = "bold 19px sans-serif";
  context.fillText(
    stage === STAGES.length - 1
      ? "Gate → Bastion → Map → Palace → Water → Sound → Evidence → Care"
      : `Action: ${STAGES[stage].action}`,
    24,
    245,
  );
}

function makeGate() {
  const group = new THREE.Group();
  group.name = "great Golconda gateway with heavy doors and iron spikes";
  const stone = new THREE.MeshStandardMaterial({
    color: 0x776551,
    roughness: 0.94,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x3f2818,
    roughness: 0.9,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: 0x292524,
    metalness: 0.68,
    roughness: 0.42,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.1, 0.22), wood);
  door.name = "heavy wooden fort door controlling the main entrance";
  door.position.y = 1.56;
  group.add(door);
  for (const x of [-1.55, 1.55]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.1, 0.85), stone);
    pier.position.set(x, 2.05, 0.1);
    group.add(pier);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.65, 0.9), stone);
  lintel.position.set(0, 3.78, 0.1);
  group.add(lintel);
  const spikes: THREE.Mesh[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.42, 10),
        iron,
      );
      spike.name = "pointed iron spike fixed to the historic gate";
      spike.rotation.x = Math.PI / 2;
      spike.position.set(-0.8 + column * 0.4, 0.7 + row * 0.48, 0.34);
      group.add(spike);
      spikes.push(spike);
    }
  }
  group.userData.spikes = spikes;
  return group;
}

function makeBastion() {
  const group = new THREE.Group();
  group.name = "high rounded bastion projecting from the straight fort wall";
  const stone = new THREE.MeshStandardMaterial({
    color: 0x756653,
    roughness: 0.96,
  });
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.9, 3.2, 28),
    stone,
  );
  tower.position.y = 1.6;
  group.add(tower);
  const openings: THREE.Mesh[] = [];
  for (let index = 0; index < 9; index += 1) {
    const angle = -1.15 + index * 0.285;
    const opening = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.42, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x15120f }),
    );
    opening.name = "protected lookout opening with a wide field of view";
    opening.position.set(Math.sin(angle) * 1.67, 2.45, Math.cos(angle) * 1.67);
    opening.rotation.y = angle;
    group.add(opening);
    openings.push(opening);
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const merlon = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.62, 0.42),
      stone,
    );
    merlon.position.set(Math.sin(angle) * 1.58, 3.5, Math.cos(angle) * 1.58);
    merlon.rotation.y = angle;
    group.add(merlon);
  }
  group.userData.openings = openings;
  return group;
}

function makeMapTable() {
  const group = new THREE.Group();
  group.name =
    "fort map linking gates palaces gardens workshops and water places";
  const wood = new THREE.MeshStandardMaterial({
    color: 0x563a25,
    roughness: 0.86,
  });
  const mapMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8bb82,
    roughness: 0.92,
  });
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 0.12, 2.25),
    mapMaterial,
  );
  slab.position.y = 1.15;
  group.add(slab);
  for (const x of [-1.25, 1.25]) {
    for (const z of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), wood);
      leg.position.set(x, 0.55, z);
      group.add(leg);
    }
  }
  const places: THREE.Mesh[] = [];
  const specs = [
    [-1.05, -0.55, 0x9a3412],
    [-0.3, 0.45, 0x15803d],
    [0.35, -0.25, 0x1d4ed8],
    [1.05, 0.55, 0x7c3aed],
    [0.95, -0.65, 0xb45309],
  ] as const;
  specs.forEach(([x, z, color], index) => {
    const place = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12 + index * 0.025, 0.3),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.08,
      }),
    );
    place.name = ["gate", "garden", "water tank", "palace", "workshop"][index];
    place.position.set(x, 1.27, z);
    group.add(place);
    places.push(place);
  });
  const compass = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.62, 3),
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xdc2626,
      emissiveIntensity: 0.18,
    }),
  );
  compass.name = "north direction used to orient the Golconda map";
  compass.rotation.x = Math.PI / 2;
  compass.rotation.z = Math.PI;
  compass.position.set(-1.28, 1.34, 0.82);
  group.add(compass);
  group.userData.places = places;
  group.userData.compass = compass;
  return group;
}

function makePalaceRuins() {
  const group = new THREE.Group();
  group.name =
    "palace ruins preserving clues about rooms light air and carving";
  const stone = new THREE.MeshStandardMaterial({
    color: 0xa78b68,
    roughness: 0.96,
  });
  const carvings: THREE.Mesh[] = [];
  for (let index = 0; index < 3; index += 1) {
    const x = -1.5 + index * 1.5;
    for (const side of [-0.48, 0.48]) {
      const column = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 2.15, 0.36),
        stone,
      );
      column.position.set(x + side, 1.08, 0);
      group.add(column);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.26, 0.38), stone);
    top.position.set(x, 2.06, 0);
    group.add(top);
    const carving = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.16, 0.035, 48, 8),
      new THREE.MeshStandardMaterial({
        color: 0xd6b98c,
        roughness: 0.72,
        emissive: 0xd6b98c,
        emissiveIntensity: 0.04,
      }),
    );
    carving.name = "fine stone carving observed without touching";
    carving.position.set(x, 1.65, 0.23);
    carving.scale.set(1, 1.35, 0.45);
    group.add(carving);
    carvings.push(carving);
  }
  group.userData.carvings = carvings;
  return group;
}

function makeWaterSystem() {
  const group = new THREE.Group();
  group.name =
    "non-electric water-lifting model with wheels pots tank and clay pipes";
  const stone = new THREE.MeshStandardMaterial({
    color: 0x74675a,
    roughness: 0.93,
  });
  const bronze = new THREE.MeshStandardMaterial({
    color: 0x8a5a2b,
    metalness: 0.38,
    roughness: 0.57,
  });
  const clay = new THREE.MeshStandardMaterial({
    color: 0xb75b35,
    roughness: 0.92,
  });
  const water = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.75,
    emissive: 0x0284c7,
    emissiveIntensity: 0.12,
  });
  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.15, 0.75, 24, 1, true),
    stone,
  );
  well.name = "well supplying the fort water system";
  well.position.y = 0.38;
  group.add(well);
  const waterSurface = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 32),
    water,
  );
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.14;
  group.add(waterSurface);
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.08, 12, 40),
    bronze,
  );
  wheel.name = "toothed wheel transferring motion to the pot chain";
  wheel.position.set(0, 1.55, 0);
  group.add(wheel);
  const pots: THREE.Mesh[] = [];
  for (let index = 0; index < 12; index += 1) {
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), clay);
    pot.name = "pot in the moving chain lifting water from the well";
    group.add(pot);
    pots.push(pot);
  }
  const tank = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 1.15), stone);
  tank.name = "storage tank receiving lifted water";
  tank.position.set(2.2, 0.35, 0);
  group.add(tank);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3.2, 12),
    clay,
  );
  pipe.name = "clay pipe carrying stored water toward palace fountains";
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(2.7, 1.05, 0);
  group.add(pipe);
  group.userData.wheel = wheel;
  group.userData.pots = pots;
  group.userData.water = waterSurface;
  return group;
}

function makeEvidenceDisplay() {
  const group = new THREE.Group();
  group.name =
    "evidence display comparing pottery metal maps paintings and records";
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.18, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x5e4939, roughness: 0.9 }),
  );
  pedestal.position.y = 0.7;
  group.add(pedestal);
  const materials = [0xb45309, 0x0e7490, 0xa16207, 0x7c2d12];
  const clues: THREE.Mesh[] = [];
  materials.forEach((color, index) => {
    const geometry =
      index === 0
        ? new THREE.CylinderGeometry(0.2, 0.28, 0.55, 18)
        : index === 1
          ? new THREE.SphereGeometry(0.22, 16, 12)
          : new THREE.BoxGeometry(0.44, 0.34, 0.12);
    const clue = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.68,
        metalness: index === 1 ? 0.5 : 0,
        emissive: color,
        emissiveIntensity: 0.04,
      }),
    );
    clue.name = [
      "pottery fragment",
      "bronze object",
      "historic map",
      "old record or painting",
    ][index];
    clue.position.set(-1.15 + index * 0.78, 1.03, 0);
    group.add(clue);
    clues.push(clue);
  });
  group.userData.clues = clues;
  return group;
}

function makeHeritageWall() {
  const group = new THREE.Group();
  group.name =
    "protected monument wall observed without scratching touching or writing";
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.2, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x806f5b, roughness: 0.98 }),
  );
  wall.position.y = 1.1;
  group.add(wall);
  const damageMarks: THREE.Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const mark = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.2 + index * 0.025,
        0.025,
        8,
        18,
        Math.PI * 1.35,
      ),
      new THREE.MeshBasicMaterial({
        color: 0xb91c1c,
        transparent: true,
        opacity: 0.72,
      }),
    );
    mark.name =
      "example of visitor damage that must never be added to a monument";
    mark.position.set(-0.7 + index * 0.45, 1 + (index % 2) * 0.3, 0.24);
    mark.rotation.z = index * 0.7;
    group.add(mark);
    damageMarks.push(mark);
  }
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.06, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.65,
    }),
  );
  halo.name = "heritage care reminder protecting the shared historical record";
  halo.position.y = 1.25;
  group.add(halo);
  group.userData.marks = damageMarks;
  group.userData.halo = halo;
  return group;
}

export default function AncientFortVisitViewer() {
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
    scene.fog = new THREE.Fog(0xc9b797, 22, 55);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      "/environments/walls-tell-stories-ancient-fort-360.png",
      { exposure: 1.02, intensity: 0.52 },
    );
    const camera = new THREE.PerspectiveCamera(
      64,
      mount.clientWidth / mount.clientHeight,
      0.05,
      95,
    );
    camera.position.set(7.2, 4.4, 7.4);
    camera.lookAt(0, 1.25, -0.4);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x3f382f, 2.15));
    const sun = new THREE.DirectionalLight(0xffe0ad, 2.8);
    sun.position.set(-8, 12, 5);
    sun.castShadow = true;
    scene.add(sun);

    const courtyard = new THREE.Mesh(
      new THREE.CircleGeometry(12, 96),
      new THREE.MeshStandardMaterial({ color: 0x9b8266, roughness: 0.98 }),
    );
    courtyard.name = "marked visitor courtyard inside the ancient fort";
    courtyard.rotation.x = -Math.PI / 2;
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    const gate = makeGate();
    gate.position.set(-4.6, 0, -2.2);
    gate.rotation.y = 0.34;
    scene.add(gate);
    const bastion = makeBastion();
    bastion.position.set(4.5, 0, -2.6);
    scene.add(bastion);
    const mapTable = makeMapTable();
    mapTable.position.set(-3.2, 0, 2.6);
    scene.add(mapTable);
    const palace = makePalaceRuins();
    palace.position.set(2.7, 0, 2.6);
    palace.rotation.y = -0.28;
    scene.add(palace);
    const waterSystem = makeWaterSystem();
    waterSystem.position.set(-0.65, 0, -3.9);
    waterSystem.scale.setScalar(0.82);
    scene.add(waterSystem);
    const evidence = makeEvidenceDisplay();
    evidence.position.set(-0.2, 0, 2.3);
    scene.add(evidence);
    const heritageWall = makeHeritageWall();
    heritageWall.position.set(4.8, 0, 1.5);
    heritageWall.rotation.y = -0.65;
    scene.add(heritageWall);

    const soundRings: THREE.Mesh[] = [];
    for (let index = 0; index < 8; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.025, 10, 38),
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.7,
        }),
      );
      ring.name =
        "visual model of reflected sound travelling from gateway toward palace";
      ring.rotation.y = Math.PI / 2;
      scene.add(ring);
      soundRings.push(ring);
    }

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
    card.position.set(2.8, 3.2, 1.0);
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
      button.position.set(x, 1.08, 1.28);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x78716c, 2.05);
    const actionButton = makeButton("btn-action", 0xb45309, 2.8);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0x0f766e, 3.55);
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
        new THREE.MeshBasicMaterial({ color: 0xf5c16c }),
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
      startPosition: new THREE.Vector3(0.2, 0, 2.35),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.25, -0.4);
    controls.enableDamping = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 10.5;
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

      gate.visible = currentStage === 0 || currentStage === 7;
      const spikes = gate.userData.spikes as THREE.Mesh[];
      spikes.forEach((spike, index) => {
        spike.scale.setScalar(
          currentStage === 0 ? 1 + Math.sin(elapsed * 3 + index) * 0.08 : 1,
        );
      });

      bastion.visible = currentStage === 1;
      const openings = bastion.userData.openings as THREE.Mesh[];
      openings.forEach((opening, index) => {
        (opening.material as THREE.MeshBasicMaterial).color.setHSL(
          0.12,
          0.75,
          0.2 + Math.sin(elapsed * 2.5 + index) * 0.07,
        );
      });

      mapTable.visible = currentStage === 2;
      const places = mapTable.userData.places as THREE.Mesh[];
      places.forEach((place, index) => {
        place.position.y = 1.27 + Math.sin(elapsed * 2.6 + index) * 0.05;
        (place.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.18 + Math.sin(elapsed * 2.4 + index) * 0.08;
      });
      (mapTable.userData.compass as THREE.Mesh).rotation.z =
        Math.PI + Math.sin(elapsed) * 0.08;

      palace.visible = currentStage === 3;
      const carvings = palace.userData.carvings as THREE.Mesh[];
      carvings.forEach((carving, index) => {
        carving.rotation.y = elapsed * 0.2 + index;
        (carving.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.12 + Math.sin(elapsed * 2 + index) * 0.08;
      });

      waterSystem.visible = currentStage === 4;
      const wheel = waterSystem.userData.wheel as THREE.Mesh;
      wheel.rotation.z = elapsed * 0.85;
      const pots = waterSystem.userData.pots as THREE.Mesh[];
      pots.forEach((pot, index) => {
        const angle = elapsed * 0.85 + (index / pots.length) * Math.PI * 2;
        pot.position.set(
          Math.sin(angle) * 0.82,
          1.55 + Math.cos(angle) * 0.82,
          0,
        );
      });
      const waterSurface = waterSystem.userData.water as THREE.Mesh;
      waterSurface.scale.setScalar(1 + Math.sin(elapsed * 2.1) * 0.035);

      soundRings.forEach((ring, index) => {
        ring.visible = currentStage === 5;
        const progress = (stageAge * 0.34 + index / soundRings.length) % 1;
        ring.position.set(
          THREE.MathUtils.lerp(-4.1, 2.7, progress),
          1.25 + Math.sin(progress * Math.PI) * 1.1,
          THREE.MathUtils.lerp(-1.8, 2.3, progress),
        );
        ring.scale.setScalar(0.7 + progress * 2.3);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          (1 - progress) * 0.72;
      });

      evidence.visible = currentStage === 6;
      const clues = evidence.userData.clues as THREE.Mesh[];
      clues.forEach((clue, index) => {
        clue.rotation.y = elapsed * (0.32 + index * 0.04);
        clue.position.y = 1.03 + Math.sin(elapsed * 2.5 + index) * 0.05;
      });

      heritageWall.visible = currentStage === 7;
      const marks = heritageWall.userData.marks as THREE.Mesh[];
      marks.forEach((mark, index) => {
        (mark.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          0.72 - stageAge * 0.13 - index * 0.04,
        );
      });
      const halo = heritageWall.userData.halo as THREE.Mesh;
      halo.rotation.z = elapsed * 0.18;
      halo.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.05);

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
        background: "#24180f",
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
              "radial-gradient(circle at 50% 25%, #8b6842 0%, #24180f 76%)",
          }}
        >
          <div style={{ maxWidth: 720, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 72 }}>🏰🧭🏺</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#f5c16c",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 5 • Chapter 10 • Activity 1
            </div>
            <h1
              style={{
                color: "#fff7ed",
                fontSize: "clamp(2.1rem, 5vw, 3.1rem)",
                lineHeight: 1.08,
                margin: "0 0 14px",
              }}
            >
              A Visit to an Ancient Fort
            </h1>
            <p style={{ color: "#fde7c5", lineHeight: 1.7 }}>
              Explore Golconda's great gate, bastions, map, palace ruins, water
              engineering, acoustics and historical evidence, then complete the
              visit by protecting the monument.
            </p>
            <p
              style={{ color: "#fed7aa", fontSize: "0.8rem", lineHeight: 1.55 }}
            >
              Virtual field visit • Observe without touching, climbing,
              scratching or removing anything
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
              width: 360,
              maxHeight: "calc(100vh - 88px)",
              overflowY: "auto",
              padding: 18,
              borderRadius: 14,
              background: "rgba(36,24,15,0.95)",
              border: "1px solid rgba(245,193,108,0.48)",
              color: "#fff7ed",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#f5c16c",
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
                background: "rgba(245,193,108,0.08)",
                border: "1px solid rgba(245,193,108,0.22)",
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
                color: stage === 7 ? "#86efac" : "#fed7aa",
                fontSize: "0.76rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {stage === 7
                ? "Visit complete • Observe, understand and protect"
                : `${stage} of 7 fort discoveries completed`}
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
              color: "#fde7c5",
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
  background: "linear-gradient(135deg, #b45309, #92400e)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 8,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(245,193,108,0.48)",
  background: "rgba(245,193,108,0.1)",
  color: "#fff7ed",
} as const;

const bodyCopyStyle = {
  margin: "0 0 12px",
  color: "#fde7c5",
  fontSize: "0.83rem",
  lineHeight: 1.62,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(245,193,108,0.26)",
  background: "rgba(180,83,9,0.18)",
  color: "#fff7ed",
  cursor: "pointer",
} as const;
