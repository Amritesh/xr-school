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

type EnvironmentName = "monsoon" | "drought" | "restored";

const ENVIRONMENTS: Record<EnvironmentName, string> = {
  monsoon: "/environments/rainwater-sundargram-monsoon-360.png",
  drought: "/environments/rainwater-sundargram-drought-360.png",
  restored: "/environments/rainwater-sundargram-restored-360.png",
};

const STAGES = [
  {
    title: "Welcome to Sundargram",
    zone: "Village Square",
    environment: "monsoon" as const,
    cue: "Meet Droppy and accept the mission to find the lost raindrops.",
    detail:
      "Sundargram receives plenty of rain, but most of it is not collected for the dry months.",
    action: "Start the Guardian mission",
    saved: 0,
  },
  {
    title: "The Beautiful Rainy Day",
    zone: "Monsoon Trail",
    environment: "monsoon" as const,
    cue: "Follow rain from roofs, gardens and farms as it escapes into the drain.",
    detail:
      "The village receives 10,000 litres, but every litre is flowing away. Rainwater received: 10,000 L • collected: 0 L • lost: 10,000 L.",
    action: "Follow the lost raindrops",
    saved: 0,
  },
  {
    title: "Journey into the Future",
    zone: "Dry Summer",
    environment: "drought" as const,
    cue: "Travel forward in time and inspect the dry pond, fields and water queue.",
    detail:
      "Rain fell only a few months ago, but it was not stored. The pond is nearly empty and crops do not have enough water.",
    action: "Inspect the dry village",
    saved: 0,
  },
  {
    title: "Make the Right Choice",
    zone: "Future Village",
    environment: "drought" as const,
    cue: "Choose what the villagers should do with rainwater.",
    detail:
      "Allow it to enter drains, waste it on flooded roads, or collect and store it for future use?",
    action: "Choose: collect and store it",
    saved: 0,
  },
  {
    title: "Rainwater Guardian Map",
    zone: "Mission Control",
    environment: "monsoon" as const,
    cue: "Explore four mission points: a house, the school, a farm recharge pit and the pond.",
    detail:
      "Complete every location to guide the village toward the 10,000-litre target.",
    action: "Open the mission map",
    saved: 0,
  },
  {
    title: "Mission 1: Rooftop Collector",
    zone: "House Rooftop",
    environment: "monsoon" as const,
    cue: "Lift the gutters and lock them along the lower edge of the sloping roof.",
    detail:
      "A clean roof acts as a catchment. Gutters guide runoff into a downpipe instead of letting it spill onto the road.",
    action: "Install the rooftop gutters",
    saved: 1250,
  },
  {
    title: "Filter and Storage Tank",
    zone: "House Courtyard",
    environment: "monsoon" as const,
    cue: "Connect the pipe, divert the first dirty flow, then pass later rain through stones, sand and charcoal.",
    detail:
      "The filter removes leaves and suspended dirt before water enters a covered tank. Drinking water still requires proper treatment and testing.",
    action: "Connect the filter and tank",
    saved: 2500,
  },
  {
    title: "Mission 2: Save School Rain",
    zone: "Sundargram School",
    environment: "monsoon" as const,
    cue: "Connect the school’s wide roof to its underground storage tank.",
    detail:
      "The stored water can support the school garden and pathway cleaning during dry days.",
    action: "Complete the school system",
    saved: 5000,
  },
  {
    title: "Mission 3: Recharge Groundwater",
    zone: "Farm Edge",
    environment: "monsoon" as const,
    cue: "Build the recharge pit: large stones below, small stones in the middle and sand on top.",
    detail:
      "Water moves slowly through the layers and enters the soil, helping the groundwater level rise.",
    action: "Build the recharge pit",
    saved: 6500,
  },
  {
    title: "The Heavy Rain Challenge",
    zone: "Whole Village",
    environment: "monsoon" as const,
    cue: "Quickly route rain toward rooftop tanks, the school tank, recharge pits and the village pond.",
    detail:
      "Keep the roads clear and save the final 3,500 litres before the storm passes.",
    action: "Route every possible drop",
    saved: 10000,
  },
  {
    title: "The Return of Summer",
    zone: "Water-Secure Sundargram",
    environment: "restored" as const,
    cue: "See how stored rainwater keeps gardens, crops, animals and the school healthy.",
    detail:
      "Water collected in the rainy season is now available for careful non-drinking uses during the summer.",
    action: "Use stored water wisely",
    saved: 10000,
  },
  {
    title: "The Final Choice",
    zone: "Guardian Gallery",
    environment: "restored" as const,
    cue: "Compare a village that wastes rain with a village that saves it.",
    detail:
      "Choose the village with rooftop collection, covered tanks, groundwater recharge and healthy crops.",
    action: "Choose the water-saving village",
    saved: 10000,
  },
  {
    title: "Rainwater Guardian Celebration",
    zone: "Village Square",
    environment: "restored" as const,
    cue: "Raise the Guardian badge and promise to make every drop count.",
    detail:
      "Rainwater can be collected from rooftops, filtered, stored in covered tanks and allowed to recharge the ground.",
    action: "Make the Guardian promise",
    saved: 10000,
  },
];

const NARRATIONS = [
  "Namaste, young explorers! Welcome to Sundargram. I am Droppy, your water-drop guide. This village receives plenty of rain every year, but most of the rainwater is disappearing. Accept our mission, find the lost raindrops, and help save the village.",
  "The monsoon has arrived! Look around as rain falls on roofs, roads, gardens, farms, trees and open spaces. Sundargram receives ten thousand litres, but none is collected. Follow the roof runoff into the drain. All ten thousand litres are being lost.",
  "Let us travel a few months into the future. It is now a hot summer. The pond is almost dry, plants are wilting and farmers are worried. The village had plenty of rain, but it allowed the water to flow away instead of storing it.",
  "What should the villagers do with rainwater? Let it escape into drains, waste it on flooded roads, or collect and store it for future use? Choose collect and store it. Correct! You are ready to become a Rainwater Guardian.",
  "We are back in the rainy season. Our mission map shows a house rooftop, the school building, a farm recharge area and the village pond. Complete every mission and guide Sundargram toward its ten-thousand-litre target.",
  "Mission one begins at the house rooftop. Place gutters along the lower edge of the sloping roof. The roof catches rain over a wide area, and the gutters guide the runoff into a downpipe instead of allowing it to spill onto the road.",
  "Connect the downpipe to a first-flush chamber, filter and covered tank. The first dirty flow can carry leaves and dust, so it is diverted. Later water passes through stones, sand and charcoal. Filtering removes dirt, but drinking water still needs proper treatment and testing.",
  "The school has a large roof, so it can collect a great deal of rain. Connect its gutters and pipe to the underground tank. This stored water can be used for the school garden, cleaning pathways and other careful non-drinking uses.",
  "Now build a groundwater recharge pit. Place large stones at the bottom, small stones above them and sand on top. Rainwater passes slowly through the layers and enters the soil. Watch the groundwater level rise and nearby plants recover.",
  "Heavy rain alert! Guide water toward the house tank, school tank, recharge pit and village pond. Excellent work. The roads are clearing and the saved-water meter has reached ten thousand litres. You saved every possible drop.",
  "Travel forward to summer once more. This time the village is green and water-secure. Stored rainwater supports crops, gardens, cleaning and animals. The villagers no longer need to travel far because they saved rain during the monsoon.",
  "Compare the two villages. In one, rain flows away, the pond dries and crops suffer. In the other, rooftops collect water, covered tanks store it and recharge pits return it to the ground. Choose the village that saves rainwater.",
  "You have saved Sundargram! Raise your Rainwater Guardian badge and repeat: I promise to save water and make every drop count. Rainwater is a precious natural resource. Save rainwater, save our future. Every drop counts!",
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
    } else line = candidate;
  }
  if (line) context.fillText(line.trim(), x, currentY);
}

function drawCard(
  canvas: HTMLCanvasElement,
  stage: number,
  completed: boolean,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const info = STAGES[stage];
  context.fillStyle = "#082f49";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = completed ? "#86efac" : "#38bdf8";
  context.lineWidth = 7;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = "#7dd3fc";
  context.font = "bold 22px sans-serif";
  context.fillText(
    `RAINWATER GUARDIAN  •  ${stage + 1}/${STAGES.length}  •  ${info.zone}`,
    25,
    40,
  );
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(info.title, 25, 85);
  context.fillStyle = "#e0f2fe";
  context.font = "20px sans-serif";
  wrapText(context, info.cue, 25, 123, canvas.width - 50, 28);
  context.fillStyle = completed ? "#86efac" : "#fde68a";
  context.font = "bold 19px sans-serif";
  context.fillText(
    completed
      ? "✓ COMPLETE — PRESS A AGAIN TO CONTINUE"
      : `ACTION: ${info.action}`,
    25,
    244,
  );
}

function makePipe(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius = 0.055,
  color = 0xdbeafe,
) {
  const direction = end.clone().sub(start);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 16),
    new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.42 }),
  );
  pipe.position.copy(start).add(end).multiplyScalar(0.5);
  pipe.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  pipe.castShadow = true;
  return pipe;
}

function makePanel(
  title: string,
  subtitle: string,
  color: string,
  width = 1.65,
  height = 0.72,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 280;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "rgba(8,47,73,0.96)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = color;
    context.lineWidth = 12;
    context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    context.fillStyle = color;
    context.font = "bold 38px sans-serif";
    context.textAlign = "center";
    context.fillText(title, canvas.width / 2, 95);
    context.fillStyle = "#e0f2fe";
    context.font = "26px sans-serif";
    context.textAlign = "left";
    wrapText(context, subtitle, 45, 150, canvas.width - 90, 34);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
}

function makeDroppy() {
  const group = new THREE.Group();
  group.name = "Droppy, the Rainwater Guardian guide";
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x28b8e8,
    emissive: 0x075985,
    emissiveIntensity: 0.12,
    roughness: 0.1,
    metalness: 0.04,
    transmission: 0.08,
    clearcoat: 1,
  });
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 28, 22),
    waterMaterial,
  );
  body.scale.set(0.82, 1.12, 0.68);
  body.position.y = 0.62;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.55, 24),
    waterMaterial,
  );
  tip.position.y = 1.15;
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x082f49 });
  for (const x of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 12),
      eyeMaterial,
    );
    eye.position.set(x, 0.71, 0.28);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.033, 12, 10),
      pupilMaterial,
    );
    pupil.position.set(x, 0.71, 0.35);
    group.add(eye, pupil);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.018, 8, 24, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x082f49 }),
  );
  smile.position.set(0, 0.52, 0.35);
  smile.rotation.z = Math.PI;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.58 }),
  );
  cap.position.y = 1.2;
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.05, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.6 }),
  );
  brim.position.set(0, 1.18, 0.18);
  group.add(body, tip, smile, cap, brim);
  return group;
}

function makeRoofSystem() {
  const group = new THREE.Group();
  group.name = "Life-size rooftop rainwater collector";
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.85, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xd8c59f, roughness: 0.95 }),
  );
  wall.position.y = 0.92;
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xa9492d,
    roughness: 0.94,
  });
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.14, 2.15),
    roofMaterial,
  );
  left.position.set(-1.02, 2.05, 0);
  left.rotation.z = -0.38;
  const right = left.clone();
  right.position.x = 1.02;
  right.rotation.z = 0.38;
  const gutterMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.42,
    roughness: 0.35,
  });
  const gutter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 4.25, 18, 1, true, 0, Math.PI),
    gutterMaterial,
  );
  gutter.rotation.z = Math.PI / 2;
  gutter.position.set(0, 1.63, 1.05);
  gutter.userData.restY = gutter.position.y;
  gutter.userData.startY = -0.35;
  const pipe = makePipe(
    new THREE.Vector3(2.04, 1.63, 1.05),
    new THREE.Vector3(2.04, 0.46, 1.05),
    0.075,
  );
  const filter = new THREE.Group();
  const filterWall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 1.2, 24, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xbfdbfe,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
    }),
  );
  filterWall.position.y = 0.68;
  filter.add(filterWall);
  [
    { y: 0.27, color: 0x616a73 },
    { y: 0.55, color: 0xd5bf91 },
    { y: 0.83, color: 0x292524 },
  ].forEach(({ y, color }) => {
    const layer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.24, 22),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    layer.position.y = y;
    filter.add(layer);
  });
  filter.position.set(1.22, 0, 1.05);
  const tank = new THREE.Group();
  const tankWall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 1.6, 30, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x176b65,
      roughness: 0.6,
      side: THREE.DoubleSide,
    }),
  );
  tankWall.position.y = 0.82;
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.66, 0.16, 28),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.82,
      roughness: 0.08,
    }),
  );
  water.name = "house-tank-water";
  water.position.y = 0.14;
  const cover = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.76, 0.12, 30),
    new THREE.MeshStandardMaterial({ color: 0x134e4a, roughness: 0.62 }),
  );
  cover.position.y = 1.67;
  tank.add(tankWall, water, cover);
  tank.position.set(-1.35, 0, 1.2);
  group.add(wall, left, right, gutter, pipe, filter, tank);
  group.userData.gutter = gutter;
  group.userData.filter = filter;
  group.userData.tankWater = water;
  return group;
}

function makeSchoolSystem() {
  const group = new THREE.Group();
  group.name = "School rooftop and underground storage mission";
  const school = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 1.8, 1.7),
    new THREE.MeshStandardMaterial({ color: 0xf4d06f, roughness: 0.92 }),
  );
  school.position.y = 0.9;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(4.95, 0.2, 2.05),
    new THREE.MeshStandardMaterial({ color: 0x8f3f2b, roughness: 0.9 }),
  );
  roof.position.y = 1.9;
  const pipe = makePipe(
    new THREE.Vector3(2.32, 1.8, 0.92),
    new THREE.Vector3(2.32, 0.25, 0.92),
    0.09,
  );
  const undergroundTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 1.6, 28, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0x0e7490,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    }),
  );
  undergroundTank.rotation.z = Math.PI / 2;
  undergroundTank.position.set(1.1, -0.15, 1.2);
  const garden = new THREE.Group();
  for (let index = 0; index < 12; index += 1) {
    const plant = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4d9f48, roughness: 0.94 }),
    );
    plant.scale.set(1, 1.35, 1);
    plant.position.set(
      -2 + (index % 6) * 0.38,
      0.16,
      1.15 + Math.floor(index / 6) * 0.34,
    );
    garden.add(plant);
  }
  group.add(school, roof, pipe, undergroundTank, garden);
  group.userData.pipe = pipe;
  group.userData.garden = garden;
  return group;
}

function makeRechargePit() {
  const group = new THREE.Group();
  group.name = "Groundwater recharge pit with ordered layers";
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.15, 12, 40),
    new THREE.MeshStandardMaterial({ color: 0x68635b, roughness: 1 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.12;
  group.add(rim);
  const layers = [
    { name: "large stones", y: -0.35, color: 0x57534e, scale: 1 },
    { name: "small stones", y: -0.08, color: 0x8b8174, scale: 0.93 },
    { name: "sand", y: 0.18, color: 0xd4b77d, scale: 0.87 },
  ];
  layers.forEach(({ name, y, color, scale }) => {
    const layer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88 * scale, 0.88 * scale, 0.24, 26),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    layer.name = name;
    layer.position.y = y + 0.9;
    layer.userData.restY = y;
    group.add(layer);
  });
  const groundwater = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.1, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.42,
    }),
  );
  groundwater.name = "rising-groundwater";
  groundwater.position.y = -0.65;
  group.add(groundwater);
  group.userData.groundwater = groundwater;
  return group;
}

function makeMissionMap() {
  const group = new THREE.Group();
  group.name = "Four-location Rainwater Guardian mission map";
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.18, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x345149, roughness: 0.85 }),
  );
  base.position.y = 0.92;
  group.add(base);
  const labels = ["🏠 HOUSE", "🏫 SCHOOL", "🌾 FARM", "🏞 POND"];
  const positions = [
    [-1.05, 1.15, -0.55],
    [1.05, 1.15, -0.55],
    [-1.05, 1.15, 0.55],
    [1.05, 1.15, 0.55],
  ];
  labels.forEach((label, index) => {
    const marker = makePanel(
      label,
      "Guardian mission point",
      "#67e8f9",
      1.25,
      0.48,
    );
    marker.position.set(
      positions[index][0],
      positions[index][1],
      positions[index][2],
    );
    marker.rotation.x = -Math.PI / 2;
    group.add(marker);
  });
  return group;
}

function makeChoiceGallery() {
  const group = new THREE.Group();
  group.name = "Rainwater choice gallery";
  const choices = [
    {
      title: "LET IT DRAIN",
      subtitle: "Rain is lost",
      color: "#f87171",
      x: -1.85,
    },
    {
      title: "COLLECT + STORE",
      subtitle: "Correct Guardian choice",
      color: "#86efac",
      x: 0,
    },
    {
      title: "FLOOD ROADS",
      subtitle: "Water is wasted",
      color: "#fbbf24",
      x: 1.85,
    },
  ];
  choices.forEach(({ title, subtitle, color, x }) => {
    const panel = makePanel(title, subtitle, color);
    panel.position.set(x, 1.35, 0);
    group.add(panel);
  });
  return group;
}

function makeChallengeBeacons() {
  const group = new THREE.Group();
  group.name = "Heavy rain routing challenge";
  const colors = [0x38bdf8, 0x22d3ee, 0x34d399, 0x60a5fa];
  const positions = [
    [-1.6, 0.55, 0],
    [-0.55, 0.55, -0.65],
    [0.55, 0.55, -0.65],
    [1.6, 0.55, 0],
  ];
  positions.forEach((position, index) => {
    const beacon = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.065, 12, 28),
      new THREE.MeshStandardMaterial({
        color: colors[index],
        emissive: colors[index],
        emissiveIntensity: 0.85,
      }),
    );
    beacon.name = ["house tank", "school tank", "recharge pit", "village pond"][
      index
    ];
    beacon.position.set(position[0], position[1], position[2]);
    beacon.rotation.x = Math.PI / 2;
    group.add(beacon);
  });
  return group;
}

function makeGuardianBadge() {
  const group = new THREE.Group();
  group.name = "Rainwater Guardian badge";
  const medal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.12, 36),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.65,
      roughness: 0.24,
      emissive: 0x713f12,
      emissiveIntensity: 0.16,
    }),
  );
  medal.rotation.x = Math.PI / 2;
  const drop = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      roughness: 0.08,
      clearcoat: 1,
    }),
  );
  drop.scale.set(0.75, 1.1, 0.35);
  drop.position.z = 0.13;
  const leftRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.72, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 }),
  );
  leftRibbon.position.set(-0.22, -0.74, -0.02);
  leftRibbon.rotation.z = 0.18;
  const rightRibbon = leftRibbon.clone();
  rightRibbon.position.x = 0.22;
  rightRibbon.rotation.z = -0.18;
  group.add(leftRibbon, rightRibbon, medal, drop);
  return group;
}

function registerHotspot(
  root: THREE.Object3D,
  stage: number,
  interactables: THREE.Object3D[],
) {
  root.traverse((object) => {
    object.userData.hotspotStage = stage;
    if (object instanceof THREE.Mesh) interactables.push(object);
  });
}

export default function RainwaterStorageViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const actionTimeRef = useRef(0);
  const completedStagesRef = useRef(new Set<number>());
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cardNeedsUpdateRef = useRef(true);
  const transitionTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<number>>(
    () => new Set(),
  );
  const [waterSaved, setWaterSaved] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

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

  const playMissionSound = useCallback((currentStage: number) => {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type =
      currentStage === 2 ? "sine" : currentStage === 9 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(
      currentStage === 2 ? 180 : 440 + currentStage * 24,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      currentStage === 2 ? 120 : 760,
      now + 0.55,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.75);
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    actionTimeRef.current = performance.now() / 1000;
    setStage(safeStage);
    setWaterSaved(
      Math.max(
        0,
        ...Array.from(completedStagesRef.current, (completedStage) =>
          STAGES[completedStage].saved,
        ),
      ),
    );
    cardNeedsUpdateRef.current = true;
    setTransitioning(true);
    if (transitionTimerRef.current)
      window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(
      () => setTransitioning(false),
      650,
    );
    playNarration(NARRATIONS[safeStage]);
  }, []);

  const performAction = useCallback(() => {
    const currentStage = stageRef.current;
    if (completedStagesRef.current.has(currentStage)) {
      if (currentStage < STAGES.length - 1) goToStage(currentStage + 1);
      return;
    }
    completedStagesRef.current.add(currentStage);
    setCompletedStages(new Set(completedStagesRef.current));
    setWaterSaved(STAGES[currentStage].saved);
    actionTimeRef.current = performance.now() / 1000;
    cardNeedsUpdateRef.current = true;
    playMissionSound(currentStage);
  }, [goToStage, playMissionSound]);

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
    scene.fog = new THREE.Fog(0x6d8995, 18, 44);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      ENVIRONMENTS.monsoon,
      {
        exposure: 1.02,
        intensity: 0.44,
      },
    );
    const environmentTextures: Record<EnvironmentName, THREE.Texture | null> = {
      monsoon: scene.background as THREE.Texture,
      drought: null,
      restored: null,
    };
    const textureLoader = new THREE.TextureLoader();
    (["drought", "restored"] as const).forEach((name) => {
      environmentTextures[name] = textureLoader.load(ENVIRONMENTS[name]);
      environmentTextures[name]!.mapping =
        THREE.EquirectangularReflectionMapping;
      environmentTextures[name]!.colorSpace = THREE.SRGBColorSpace;
    });

    const camera = new THREE.PerspectiveCamera(
      68,
      mount.clientWidth / mount.clientHeight,
      0.05,
      90,
    );
    camera.position.set(0, 2.05, 5.2);
    camera.lookAt(0, 1.1, 0);
    scene.add(new THREE.HemisphereLight(0xe0f7ff, 0x31413b, 1.65));
    const daylight = new THREE.DirectionalLight(0xf0f9ff, 1.85);
    daylight.position.set(-4, 8, 4);
    daylight.castShadow = true;
    scene.add(daylight);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x526f68,
      roughness: 0.92,
      transparent: true,
      opacity: 0.2,
    });
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 64),
      groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const stageGroups: THREE.Group[] = Array.from(
      { length: STAGES.length },
      () => new THREE.Group(),
    );
    stageGroups.forEach((group, index) => {
      group.name = `scene-${index}-${STAGES[index].title}`;
      scene.add(group);
    });

    const droppy = makeDroppy();
    droppy.position.set(-1.55, 0.12, 0.42);
    scene.add(droppy);

    const lostFlow = new THREE.Group();
    lostFlow.name = "Ten thousand litres escaping to the drain";
    stageGroups[1].add(lostFlow);
    const drain = makePipe(
      new THREE.Vector3(-1.8, 0.16, 0.3),
      new THREE.Vector3(1.8, 0.16, 0.3),
      0.15,
      0x374151,
    );
    drain.rotation.y = 0.14;
    lostFlow.add(drain);

    const droughtProps = new THREE.Group();
    droughtProps.name = "Dry summer evidence";
    for (let index = 0; index < 5; index += 1) {
      const bucket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.16, 0.32, 18, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x9a6b45, roughness: 0.86 }),
      );
      bucket.position.set(
        -1.2 + index * 0.55,
        0.17,
        0.05 + Math.sin(index) * 0.2,
      );
      droughtProps.add(bucket);
    }
    stageGroups[2].add(droughtProps);

    const choiceGallery = makeChoiceGallery();
    choiceGallery.position.set(0, 0, -0.15);
    stageGroups[3].add(choiceGallery);

    const missionMap = makeMissionMap();
    missionMap.position.set(0, 0, -0.1);
    stageGroups[4].add(missionMap);

    const roofSystem = makeRoofSystem();
    roofSystem.position.set(0, 0, -0.5);
    stageGroups[5].add(roofSystem);
    const roofSystemComplete = makeRoofSystem();
    roofSystemComplete.position.copy(roofSystem.position);
    stageGroups[6].add(roofSystemComplete);

    const schoolSystem = makeSchoolSystem();
    schoolSystem.position.set(0, 0, -0.5);
    stageGroups[7].add(schoolSystem);

    const rechargePit = makeRechargePit();
    rechargePit.position.set(0, 0.42, -0.2);
    stageGroups[8].add(rechargePit);

    const challengeBeacons = makeChallengeBeacons();
    challengeBeacons.position.set(0, 0.05, -0.2);
    stageGroups[9].add(challengeBeacons);

    const restoredPanel = makePanel(
      "10,000 LITRES SAVED",
      "Green farms • healthy pond • water for dry days",
      "#86efac",
      2.8,
      1.05,
    );
    restoredPanel.position.set(0.35, 1.55, -0.25);
    stageGroups[10].add(restoredPanel);

    const comparison = new THREE.Group();
    comparison.name = "Village without storage versus village with storage";
    const without = makePanel(
      "WITHOUT STORAGE",
      "Dry pond • lost rain • weak crops",
      "#f87171",
      2.35,
      1.0,
    );
    without.position.set(-1.35, 1.45, -0.15);
    const withStorage = makePanel(
      "WITH STORAGE",
      "Covered tanks • recharge • healthy crops",
      "#86efac",
      2.35,
      1.0,
    );
    withStorage.position.set(1.35, 1.45, -0.15);
    comparison.add(without, withStorage);
    stageGroups[11].add(comparison);

    const badge = makeGuardianBadge();
    badge.position.set(0.3, 1.48, -0.15);
    stageGroups[12].add(badge);

    const rain: THREE.Mesh[] = [];
    for (let index = 0; index < 110; index += 1) {
      const drop = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.009, 0.11, 3, 5),
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.8,
        }),
      );
      drop.position.set(
        ((index * 1.73) % 9) - 4.5,
        0.8 + ((index * 0.47) % 4.8),
        ((index * 2.09) % 7) - 3.5,
      );
      scene.add(drop);
      rain.push(drop);
    }

    const flowDrops: THREE.Mesh[] = [];
    for (let index = 0; index < 34; index += 1) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 9, 7),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.94,
        }),
      );
      drop.userData.offset = index / 34;
      scene.add(drop);
      flowDrops.push(drop);
    }

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 820;
    cardCanvas.height = 285;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(2.85, 0.99),
      new THREE.MeshBasicMaterial({ map: cardTexture, transparent: true }),
    );
    card.position.set(-1.55, 2.55, 0.48);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.19, 0.09),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.28,
        }),
      );
      button.name = name;
      button.position.set(x, 1.2, 0.66);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.82);
    const actionButton = makeButton("btn-action", 0x0891b2, 0);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0x2563eb, 0.82);
    const buttonInteractables: THREE.Object3D[] = [
      previousButton,
      actionButton,
      nextButton,
    ];
    const stageInteractables: THREE.Object3D[] = [];
    stageGroups.forEach((group, index) =>
      registerHotspot(group, index, stageInteractables),
    );
    const raycaster = new THREE.Raycaster();

    const findNamedAncestor = (
      object: THREE.Object3D | null,
    ): THREE.Object3D | null => {
      let current = object;
      while (current) {
        if (current.name.startsWith("btn-")) return current;
        current = current.parent;
      }
      return null;
    };

    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(
        [...buttonInteractables, ...stageInteractables],
        true,
      )[0];
      if (!hit) return;
      const button = findNamedAncestor(hit.object);
      if (button?.name === "btn-action") performAction();
      else if (button?.name === "btn-previous") goToStage(stageRef.current - 1);
      else if (button?.name === "btn-next") {
        if (completedStagesRef.current.has(stageRef.current))
          goToStage(stageRef.current + 1);
      } else if (hit.object.userData.hotspotStage === stageRef.current)
        performAction();
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 2.2, 4),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -1.1;
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
    controls.target.set(0, 1.15, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    const pointerDown = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    const setPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    };
    const onPointerDown = (event: PointerEvent) =>
      pointerDown.set(event.clientX, event.clientY);
    const onPointerUp = (event: PointerEvent) => {
      if (
        Math.hypot(
          event.clientX - pointerDown.x,
          event.clientY - pointerDown.y,
        ) > 8
      )
        return;
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(stageInteractables, true)[0];
      if (hit?.object.userData.hotspotStage === stageRef.current)
        performAction();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const clock = new THREE.Clock();
    let lastEnvironment: EnvironmentName | null = null;
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const currentStage = stageRef.current;
      const info = STAGES[currentStage];
      const completed = completedStagesRef.current.has(currentStage);
      const actionAge = Math.max(
        0,
        performance.now() / 1000 - actionTimeRef.current,
      );
      questVr.update();

      if (lastEnvironment !== info.environment) {
        const texture =
          environmentTextures[info.environment] ?? environmentTextures.monsoon;
        scene.background = texture;
        scene.environment = texture;
        scene.fog = new THREE.Fog(
          info.environment === "drought" ? 0xc7a77c : 0x6d8995,
          18,
          44,
        );
        groundMaterial.color.setHex(
          info.environment === "drought" ? 0x987958 : 0x526f68,
        );
        renderer.toneMappingExposure =
          info.environment === "drought" ? 1.08 : 1.02;
        lastEnvironment = info.environment;
      }
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(cardCanvasRef.current, currentStage, completed);
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }

      stageGroups.forEach((group, index) => {
        group.visible = index === currentStage;
      });
      const isRaining = info.environment === "monsoon";
      rain.forEach((drop, index) => {
        drop.visible = isRaining;
        if (!drop.visible) return;
        drop.position.y -=
          (currentStage === 9 ? 0.08 : 0.045) + (index % 5) * 0.004;
        if (drop.position.y < 0.08) drop.position.y = 5.5;
      });

      flowDrops.forEach((drop) => {
        const progress =
          (elapsed * (currentStage === 9 ? 0.55 : 0.32) +
            (drop.userData.offset as number)) %
          1;
        drop.visible = [1, 5, 6, 7, 8, 9].includes(currentStage);
        if (!drop.visible) return;
        if (currentStage === 1)
          drop.position.set(-2 + progress * 4, 0.3 - progress * 0.12, 0.25);
        else if (currentStage === 5)
          drop.position.set(
            -1.9 + progress * 3.8,
            1.78 - Math.abs(progress - 0.5) * 0.5,
            0.62,
          );
        else if (currentStage === 6)
          drop.position.set(
            2.02 - progress * 3.25,
            1.62 - progress * 1.25,
            0.56,
          );
        else if (currentStage === 7)
          drop.position.set(
            2.25 - progress * 2.15,
            1.72 - progress * 1.45,
            0.42,
          );
        else if (currentStage === 8)
          drop.position.set(
            0.45 * Math.sin(progress * Math.PI * 4),
            1.6 - progress * 2,
            -0.15,
          );
        else
          drop.position.set(
            -2 + progress * 4,
            1.8 - progress * 1.5,
            Math.sin(progress * Math.PI * 4) * 0.55,
          );
      });

      const gutter = roofSystem.userData.gutter as THREE.Mesh;
      const roofWater = roofSystem.userData.tankWater as THREE.Mesh;
      const clonedWater = roofSystemComplete.getObjectByName(
        "house-tank-water",
      ) as THREE.Mesh | undefined;
      if (gutter) {
        const progress =
          completed && currentStage === 5
            ? Math.min(actionAge / 1.25, 1)
            : currentStage === 5
              ? 0
              : 1;
        gutter.position.y = THREE.MathUtils.lerp(
          gutter.userData.startY as number,
          gutter.userData.restY as number,
          progress,
        );
      }
      [roofWater, clonedWater].forEach((water) => {
        if (!water) return;
        const shouldFill = currentStage === 6 && completed;
        const fill = shouldFill
          ? Math.min(actionAge / 2.2, 1)
          : currentStage === 6
            ? 0.1
            : 0.58;
        water.scale.y = 0.25 + fill * 7.5;
        water.position.y = 0.12 + fill * 0.57;
      });

      const groundwater = rechargePit.userData.groundwater as THREE.Mesh;
      if (groundwater) {
        const rise =
          currentStage === 8 && completed ? Math.min(actionAge / 2, 1) : 0;
        groundwater.position.y = -0.65 + rise * 0.7;
        groundwater.scale.setScalar(0.7 + rise * 0.45);
      }
      rechargePit.children.forEach((child) => {
        if (typeof child.userData.restY !== "number") return;
        const settle =
          currentStage === 8 && completed ? Math.min(actionAge / 1.4, 1) : 0;
        child.position.y = THREE.MathUtils.lerp(
          (child.userData.restY as number) + 0.9,
          child.userData.restY as number,
          settle,
        );
      });
      challengeBeacons.children.forEach((beacon, index) => {
        const active = currentStage === 9 && completed;
        const pulse = 1 + (active ? Math.sin(elapsed * 5 + index) * 0.18 : 0);
        beacon.scale.setScalar(pulse);
        const material = (beacon as THREE.Mesh)
          .material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = active ? 1.6 : 0.5;
      });
      if (currentStage === 12) {
        badge.rotation.y = Math.sin(elapsed * 0.8) * 0.25;
        badge.position.y = 1.48 + Math.sin(elapsed * 1.6) * 0.08;
        if (completed)
          badge.scale.lerp(new THREE.Vector3(1.35, 1.35, 1.35), 0.04);
      }

      droppy.position.y = 0.12 + Math.sin(elapsed * 1.8) * 0.09;
      droppy.rotation.y = Math.sin(elapsed * 0.7) * 0.08;
      const activeCamera = renderer.xr.isPresenting
        ? renderer.xr.getCamera()
        : camera;
      card.lookAt(activeCamera.position);
      buttonInteractables.forEach((button) =>
        button.lookAt(activeCamera.position),
      );
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    drawCard(cardCanvas, 0, false);
    cardTexture.needsUpdate = true;
    actionTimeRef.current = performance.now() / 1000;

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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      questVr.dispose();
      realisticEnvironment.dispose();
      environmentTextures.drought?.dispose();
      environmentTextures.restored?.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [goToStage, performAction]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current)
        window.clearTimeout(transitionTimerRef.current);
      void audioContextRef.current?.close();
    },
    [],
  );

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

  const currentComplete = completedStages.has(stage);
  const missionComplete = completedStages.has(STAGES.length - 1);
  const waterPercent = Math.min(100, (waterSaved / 10000) * 100);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#082f49",
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
              "radial-gradient(circle at 50% 25%, #0e7490 0%, #082f49 72%)",
          }}
        >
          <div style={{ maxWidth: 720, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 82 }}>💧🧢🌧️🏘️</div>
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
              Class 5 • Chapter 6 • Every Drop Counts
            </div>
            <h1
              style={{
                color: "#f0f9ff",
                fontSize: "clamp(2.15rem, 5vw, 3.4rem)",
                lineHeight: 1.05,
                margin: "0 0 12px",
              }}
            >
              The Secret of the Lost Raindrops
            </h1>
            <p
              style={{
                color: "#e0f2fe",
                lineHeight: 1.7,
                maxWidth: 620,
                margin: "0 auto",
              }}
            >
              Join Droppy in Sundargram. Travel through time, build real
              rainwater-harvesting systems and save 10,000 litres before summer
              returns.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 25,
              }}
            >
              {vrSupported && (
                <button onClick={enterVR} style={primaryButtonStyle}>
                  🥽 Start Mission in VR
                </button>
              )}
              <button
                onClick={() => {
                  unlockNarration();
                  setStarted(true);
                  playNarration(NARRATIONS[0]);
                }}
                style={secondaryButtonStyle}
              >
                💻 Start Mission in Browser
              </button>
            </div>
          </div>
        </div>
      )}

      {started && (
        <>
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(560px, calc(100vw - 40px))",
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(8,47,73,0.9)",
              border: "1px solid rgba(125,211,252,0.48)",
              color: "#f0f9ff",
              backdropFilter: "blur(10px)",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: "0.75rem",
                fontWeight: 800,
              }}
            >
              <span>💧 WATER SAVED</span>
              <span>{waterSaved.toLocaleString("en-IN")} / 10,000 L</span>
            </div>
            <div
              style={{
                height: 9,
                marginTop: 7,
                borderRadius: 99,
                overflow: "hidden",
                background: "rgba(255,255,255,0.14)",
              }}
            >
              <div
                style={{
                  width: `${waterPercent}%`,
                  height: "100%",
                  borderRadius: 99,
                  background:
                    "linear-gradient(90deg, #22d3ee, #38bdf8, #86efac)",
                  transition: "width 900ms ease",
                }}
              />
            </div>
          </div>

          <aside
            style={{
              position: "absolute",
              top: 76,
              right: 16,
              width: 370,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 96px)",
              overflowY: "auto",
              padding: 18,
              borderRadius: 15,
              background: "rgba(8,47,73,0.94)",
              border: "1px solid rgba(125,211,252,0.45)",
              color: "#f0f9ff",
              backdropFilter: "blur(12px)",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                color: "#7dd3fc",
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              <span>
                Mission {stage + 1}/{STAGES.length}
              </span>
              <span>{STAGES[stage].zone}</span>
            </div>
            <h2 style={{ margin: "10px 0 8px", fontSize: "1.22rem" }}>
              {STAGES[stage].title}
            </h2>
            <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "rgba(125,211,252,0.08)",
                border: "1px solid rgba(125,211,252,0.2)",
                marginBottom: 11,
              }}
            >
              <div style={{ ...bodyCopyStyle, margin: 0 }}>
                {STAGES[stage].detail}
              </div>
            </div>
            <button
              onClick={performAction}
              disabled={missionComplete}
              style={{
                ...primaryButtonStyle,
                opacity: missionComplete ? 0.62 : 1,
              }}
            >
              {missionComplete
                ? "🏅 Guardian mission complete"
                : currentComplete
                  ? "Continue to the next mission →"
                  : STAGES[stage].action}
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button
                onClick={() => goToStage(stage - 1)}
                disabled={stage === 0}
                style={{ ...navButtonStyle, opacity: stage === 0 ? 0.45 : 1 }}
              >
                ← Previous
              </button>
              <button
                onClick={() => goToStage(stage + 1)}
                disabled={!currentComplete || stage === STAGES.length - 1}
                style={{
                  ...navButtonStyle,
                  opacity:
                    !currentComplete || stage === STAGES.length - 1 ? 0.45 : 1,
                }}
              >
                Next →
              </button>
            </div>
            <div
              role="status"
              style={{
                marginTop: 11,
                color: currentComplete ? "#86efac" : "#fde68a",
                fontSize: "0.76rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {currentComplete
                ? "Discovery complete • press Continue or controller A"
                : "Point and select the glowing model, or use the action button"}
            </div>
            <button
              onClick={() => playNarration(NARRATIONS[stage])}
              style={secondaryButtonStyle}
            >
              🔊 Replay Droppy’s narration
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
              maxWidth: 620,
              padding: "7px 10px",
              borderRadius: 9,
              background: "rgba(8,47,73,0.82)",
              color: "#e0f2fe",
              fontSize: "0.72rem",
              zIndex: 4,
            }}
          >
            Quest: point + trigger interacts • A completes/continues • B or
            right grip exits VR • Y goes back • joysticks walk and turn
          </div>
        </>
      )}

      <div
        aria-hidden={!transitioning}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 8,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
          background: transitioning ? "rgba(2,23,39,0.68)" : "transparent",
          opacity: transitioning ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        <div
          style={{
            padding: "14px 24px",
            borderRadius: 14,
            background: "rgba(8,47,73,0.92)",
            border: "1px solid #7dd3fc",
            color: "#f0f9ff",
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#7dd3fc",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Travelling to
          </div>
          <div style={{ marginTop: 5 }}>{STAGES[stage].zone}</div>
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg, #0284c7, #0e7490)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 7,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(125,211,252,0.42)",
  background: "rgba(125,211,252,0.1)",
  color: "#e0f2fe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 11px",
  color: "#e0f2fe",
  fontSize: "0.83rem",
  lineHeight: 1.52,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.07)",
  color: "#e0f2fe",
  cursor: "pointer",
} as const;
