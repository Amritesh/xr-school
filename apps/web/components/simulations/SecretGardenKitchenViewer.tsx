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

type EnvironmentName = "garden" | "roots" | "xylem" | "leaf";

const ENVIRONMENTS: Record<EnvironmentName, string> = {
  garden: "/environments/nutrition-plants-garden-360.png",
  roots: "/environments/nutrition-plants-roots-360.png",
  xylem: "/environments/nutrition-plants-xylem-360.png",
  leaf: "/environments/nutrition-plants-leaf-cell-360.png",
};

const STAGES = [
  {
    title: "The Magical Garden",
    zone: "Garden Entrance",
    environment: "garden" as const,
    cue: "Meet Chlorie the Leaf and discover why green plants are called autotrophs.",
    detail:
      "Plants make their own food from simple substances using sunlight. This food-making process is photosynthesis.",
    action: "Accept Chlorie’s garden mission",
  },
  {
    title: "Journey Underground",
    zone: "Root-Hair Zone",
    environment: "roots" as const,
    cue: "Guide water and dissolved minerals from the soil into the fine root hairs.",
    detail:
      "Root hairs greatly increase the surface area available for absorbing water and dissolved minerals from moist soil.",
    action: "Absorb water through root hairs",
  },
  {
    title: "The Xylem Water Elevator",
    zone: "Inside the Stem",
    environment: "xylem" as const,
    cue: "Start the upward journey from roots, through the stem, toward the leaves.",
    detail:
      "Xylem transports water and dissolved minerals upward from the roots to the stem and leaves.",
    action: "Start xylem transport",
  },
  {
    title: "The Green Food Factory",
    zone: "Inside a Leaf Cell",
    environment: "leaf" as const,
    cue: "Activate the chloroplasts and let chlorophyll capture energy from sunlight.",
    detail:
      "Chloroplasts contain chlorophyll, the green pigment that captures light energy for photosynthesis.",
    action: "Switch on the chloroplasts",
  },
  {
    title: "The Stomata Gates",
    zone: "Lower Leaf Surface",
    environment: "leaf" as const,
    cue: "Open the guard cells so carbon dioxide can enter the leaf through a stoma.",
    detail:
      "Stomata are tiny pores, mostly on leaf surfaces. Guard cells control their opening and closing for gas exchange.",
    action: "Open the stoma",
  },
  {
    title: "The Photosynthesis Laboratory",
    zone: "Chloroplast Lab",
    environment: "leaf" as const,
    cue: "Bring water and carbon dioxide together while sunlight is captured by chlorophyll.",
    detail:
      "Light energy converts carbon dioxide and water into glucose. Oxygen is formed and excess glucose may be stored as starch.",
    action: "Make glucose and oxygen",
  },
  {
    title: "Oxygen Returns to the Air",
    zone: "Leaf Air Chamber",
    environment: "leaf" as const,
    cue: "Release oxygen from the leaf through the open stoma.",
    detail:
      "Much of the oxygen produced during photosynthesis diffuses out through stomata and becomes available to other living things.",
    action: "Release oxygen",
  },
  {
    title: "The Phloem Food Highway",
    zone: "Food Transport Network",
    environment: "xylem" as const,
    cue: "Send sugar from the leaf to roots, stems, flowers, fruits, seeds and young leaves.",
    detail:
      "Phloem transports dissolved sugars from source leaves to growing or storage parts. Some sugar is converted into starch for storage.",
    action: "Send food through phloem",
  },
  {
    title: "The Garden Comes Alive",
    zone: "Living Garden",
    environment: "garden" as const,
    cue: "Use the complete pathway to help the garden grow, flower and support life.",
    detail:
      "Green plants are producers. The food they make supports their own growth and begins many food chains.",
    action: "Restore the thriving garden",
  },
  {
    title: "Build Photosynthesis",
    zone: "Ingredient Challenge",
    environment: "leaf" as const,
    cue: "Select the four requirements and reject stone, fire and ready-made food.",
    detail:
      "Choose sunlight, water, carbon dioxide and chlorophyll. Remember: chlorophyll captures light; it is required but is not used up as a reactant.",
    action: "Select the next correct ingredient",
  },
  {
    title: "Guardian of the Green Kitchen",
    zone: "Garden Celebration",
    environment: "garden" as const,
    cue: "Complete the living equation and promise to protect the plants that support life.",
    detail:
      "Carbon dioxide + water — with light captured by chlorophyll — produces glucose + oxygen. Protect plants, and protect our living world.",
    action: "Make the Green Guardian promise",
  },
];

const NARRATIONS = [
  "Namaste, young explorers! Welcome to the secret kitchen of this beautiful garden. I am Chlorie, your leaf guide. Green plants are autotrophs because they can make their own food. Follow me through roots, stem and leaf to uncover the wonderful process called photosynthesis.",
  "Our journey begins beneath the soil. Look at the many fine root hairs touching moist soil particles. Their large surface area helps the plant absorb water and dissolved minerals. Guide the blue droplets into the root hairs so they can begin their journey upward.",
  "Now we are inside the plant's xylem. Xylem vessels form a water transport pathway from roots through the stem to the leaves. Start the water elevator and watch water and dissolved minerals rise toward the green food factory.",
  "Welcome inside a giant leaf cell. These green oval structures are chloroplasts. They contain chlorophyll, the pigment that gives leaves their green colour and captures energy from sunlight. Activate the chloroplasts and watch the leaf kitchen light up.",
  "A leaf also needs carbon dioxide from the air. These two curved guard cells surround a tiny pore called a stoma. Open the pore carefully. Carbon dioxide can now diffuse into the air spaces inside the leaf, ready for photosynthesis.",
  "All the requirements have arrived. Water came through xylem, carbon dioxide entered through stomata, and chlorophyll captured sunlight. Light energy helps form glucose from carbon dioxide and water, releasing oxygen. Extra glucose can be converted into starch and stored.",
  "Photosynthesis has produced oxygen. Guide the oxygen particles from the leaf's air spaces and out through the stoma. This oxygen joins the atmosphere and supports respiration in people, animals and many other living organisms.",
  "The glucose made in leaves can be changed into transport sugars. Phloem carries these dissolved sugars to roots, stems, flowers, fruits, seeds and growing leaves. Send food along the phloem highway so every part of the plant receives energy and building material.",
  "We are back in the garden. Because plants absorbed water, captured light, took in carbon dioxide and moved food to their tissues, the garden can grow and flower. Green plants are producers, and the food they make supports nearly every food chain.",
  "Time for your final ingredient challenge. Choose sunlight, water, carbon dioxide and chlorophyll. Reject stone, fire and ready-made food. Chlorophyll is the light-capturing pigment; carbon dioxide and water are the raw materials changed into glucose and oxygen.",
  "Wonderful work, Green Guardian! Remember the complete idea: carbon dioxide plus water, using light energy captured by chlorophyll, produces glucose and oxygen. Plants store some food as starch and transport sugars through phloem. Protect green plants, because their secret kitchens support life on Earth.",
];

const CHALLENGE_ITEMS = [
  { name: "Sunlight", emoji: "☀️", correct: true, color: 0xfacc15 },
  { name: "Water", emoji: "💧", correct: true, color: 0x38bdf8 },
  { name: "Carbon Dioxide", emoji: "CO₂", correct: true, color: 0xa7f3d0 },
  { name: "Chlorophyll", emoji: "🍃", correct: true, color: 0x22c55e },
  { name: "Stone", emoji: "🪨", correct: false, color: 0x94a3b8 },
  { name: "Fire", emoji: "🔥", correct: false, color: 0xf97316 },
  { name: "Ready-made Food", emoji: "🍛", correct: false, color: 0xd97706 },
];

const CORRECT_INGREDIENTS = CHALLENGE_ITEMS.filter((item) => item.correct).map(
  (item) => item.name,
);

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
  ingredients: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const info = STAGES[stage];
  context.fillStyle = "#052e16";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = completed ? "#fde68a" : "#4ade80";
  context.lineWidth = 7;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = "#86efac";
  context.font = "bold 22px sans-serif";
  context.fillText(
    `SECRET GARDEN  •  ${stage + 1}/${STAGES.length}  •  ${info.zone}`,
    25,
    40,
  );
  context.fillStyle = "#ffffff";
  context.font = "bold 31px sans-serif";
  context.fillText(info.title, 25, 86);
  context.fillStyle = "#dcfce7";
  context.font = "20px sans-serif";
  wrapText(context, info.cue, 25, 125, canvas.width - 50, 28);
  context.fillStyle = completed ? "#fde68a" : "#bbf7d0";
  context.font = "bold 19px sans-serif";
  const status =
    stage === 9 && !completed
      ? `INGREDIENTS FOUND: ${ingredients}/4`
      : completed
        ? "✓ DISCOVERY COMPLETE — PRESS A AGAIN TO CONTINUE"
        : `ACTION: ${info.action}`;
  context.fillText(status, 25, 244);
}

function makePanel(
  title: string,
  subtitle: string,
  color = "#86efac",
  width = 2.4,
  height = 0.9,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 760;
  canvas.height = 300;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "rgba(5,46,22,0.96)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = color;
    context.lineWidth = 12;
    context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    context.fillStyle = color;
    context.font = "bold 39px sans-serif";
    context.textAlign = "center";
    context.fillText(title, canvas.width / 2, 96);
    context.fillStyle = "#ecfdf5";
    context.font = "27px sans-serif";
    context.textAlign = "left";
    wrapText(context, subtitle, 48, 160, canvas.width - 96, 37);
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

function makeChlorie() {
  const group = new THREE.Group();
  group.name = "Chlorie the Leaf guide";
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.43, 28, 22),
    new THREE.MeshPhysicalMaterial({
      color: 0x22c55e,
      emissive: 0x14532d,
      emissiveIntensity: 0.28,
      roughness: 0.36,
      clearcoat: 0.45,
    }),
  );
  leaf.scale.set(0.72, 1.28, 0.24);
  leaf.rotation.z = -0.2;
  leaf.position.y = 0.78;
  const vein = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.035, 0.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9f99d }),
  );
  vein.position.set(-0.03, 0.75, 0.12);
  vein.rotation.z = -0.2;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.42, 12),
    new THREE.MeshStandardMaterial({ color: 0x4d7c0f }),
  );
  stem.position.set(0.11, 0.22, 0);
  stem.rotation.z = -0.4;
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dark = new THREE.MeshBasicMaterial({ color: 0x052e16 });
  for (const x of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.067, 14, 10), white);
    eye.position.set(x - 0.1, 0.89, 0.12);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 8), dark);
    pupil.position.set(x - 0.1, 0.89, 0.18);
    group.add(eye, pupil);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.015, 8, 22, Math.PI),
    dark,
  );
  smile.position.set(-0.1, 0.7, 0.16);
  smile.rotation.z = Math.PI;
  group.add(leaf, vein, stem, smile);
  return group;
}

function makePlant() {
  const group = new THREE.Group();
  group.name = "Green autotroph plant";
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f7d32,
    roughness: 0.8,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 1.75, 14),
    stemMaterial,
  );
  stem.position.y = 0.9;
  group.add(stem);
  for (let index = 0; index < 8; index += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 18, 12),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? 0x22c55e : 0x4ade80,
        roughness: 0.72,
      }),
    );
    leaf.scale.set(1.25, 0.42, 0.18);
    leaf.position.set(
      (index % 2 ? 1 : -1) * (0.24 + (index % 3) * 0.04),
      0.45 + index * 0.17,
      0,
    );
    leaf.rotation.z = (index % 2 ? 1 : -1) * 0.46;
    group.add(leaf);
  }
  const flower = new THREE.Group();
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.64,
  });
  for (let index = 0; index < 7; index += 1) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 14, 10),
      flowerMaterial,
    );
    petal.scale.set(0.55, 1.1, 0.32);
    const angle = (index / 7) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.17, Math.sin(angle) * 0.17, 0);
    petal.rotation.z = angle;
    flower.add(petal);
  }
  flower.position.y = 1.88;
  group.add(flower);
  group.userData.flower = flower;
  return group;
}

function makeRootSystem() {
  const group = new THREE.Group();
  group.name = "Root system and absorbing root hairs";
  const rootMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8c39f,
    roughness: 0.96,
  });
  const roots: THREE.Mesh[] = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.25, 0),
      new THREE.Vector3(Math.cos(angle) * 0.35, 0.9, Math.sin(angle) * 0.35),
      new THREE.Vector3(Math.cos(angle) * 0.78, 0.47, Math.sin(angle) * 0.78),
      new THREE.Vector3(Math.cos(angle) * 1.3, 0.16, Math.sin(angle) * 1.3),
    ]);
    const root = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 30, 0.075 - index * 0.003, 10, false),
      rootMaterial,
    );
    group.add(root);
    roots.push(root);
    for (let hairIndex = 0; hairIndex < 7; hairIndex += 1) {
      const t = 0.36 + hairIndex * 0.085;
      const point = curve.getPoint(t);
      const hair = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.004, 0.25, 6),
        rootMaterial,
      );
      hair.position.copy(point);
      hair.position.y += 0.03;
      hair.rotation.z = Math.PI / 2 + Math.sin(hairIndex) * 0.35;
      hair.rotation.y = angle;
      group.add(hair);
    }
  }
  const droplets: THREE.Mesh[] = [];
  for (let index = 0; index < 32; index += 1) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshPhysicalMaterial({
        color: index % 4 ? 0x38bdf8 : 0xfacc15,
        emissive: index % 4 ? 0x075985 : 0x854d0e,
        emissiveIntensity: 0.5,
        roughness: 0.08,
        transparent: true,
        opacity: 0.9,
      }),
    );
    const angle = (index / 32) * Math.PI * 2;
    const radius = 1.45 + (index % 5) * 0.11;
    drop.position.set(
      Math.cos(angle) * radius,
      0.16 + (index % 6) * 0.12,
      Math.sin(angle) * radius,
    );
    drop.userData.start = drop.position.clone();
    drop.userData.target = new THREE.Vector3(
      Math.cos(angle) * 0.78,
      0.48,
      Math.sin(angle) * 0.78,
    );
    group.add(drop);
    droplets.push(drop);
  }
  group.userData.droplets = droplets;
  group.userData.roots = roots;
  return group;
}

function makeXylemSystem() {
  const group = new THREE.Group();
  group.name = "Xylem water elevator from roots to leaves";
  for (let index = 0; index < 5; index += 1) {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 3.6, 22, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: index % 2 ? 0x84cc16 : 0xb78343,
        transparent: true,
        opacity: 0.34,
        roughness: 0.34,
        side: THREE.DoubleSide,
      }),
    );
    tube.position.set(-1.1 + index * 0.55, 1.75, -0.2);
    group.add(tube);
  }
  const droplets: THREE.Mesh[] = [];
  for (let index = 0; index < 42; index += 1) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 8),
      new THREE.MeshPhysicalMaterial({
        color: index % 5 ? 0x38bdf8 : 0xfacc15,
        emissive: 0x075985,
        emissiveIntensity: 0.6,
        roughness: 0.05,
      }),
    );
    drop.userData.offset = index / 42;
    drop.userData.lane = index % 5;
    group.add(drop);
    droplets.push(drop);
  }
  const panel = makePanel(
    "ROOTS  →  STEM  →  LEAVES",
    "Xylem carries water and dissolved minerals upward",
    "#7dd3fc",
    2.65,
    0.84,
  );
  panel.position.set(0, 2.35, 0.25);
  group.add(panel);
  group.userData.droplets = droplets;
  return group;
}

function makeLeafFactory() {
  const group = new THREE.Group();
  group.name = "Leaf cell with chloroplasts and chlorophyll";
  const cell = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 32, 22),
    new THREE.MeshPhysicalMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.16,
      roughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  cell.scale.set(1.5, 0.86, 0.72);
  cell.position.y = 1.05;
  group.add(cell);
  const chloroplasts: THREE.Mesh[] = [];
  for (let index = 0; index < 12; index += 1) {
    const chloroplast = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 18, 12),
      new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        emissive: 0x14532d,
        emissiveIntensity: 0.45,
        roughness: 0.42,
      }),
    );
    chloroplast.scale.set(1.45, 0.55, 0.46);
    const angle = (index / 12) * Math.PI * 2;
    chloroplast.position.set(
      Math.cos(angle) * (0.65 + (index % 3) * 0.2),
      1.05 + Math.sin(angle) * 0.62,
      -0.05 + (index % 2) * 0.25,
    );
    chloroplast.rotation.z = angle + Math.PI / 2;
    group.add(chloroplast);
    chloroplasts.push(chloroplast);
  }
  const beams: THREE.Mesh[] = [];
  for (let index = 0; index < 5; index += 1) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.12, 2.4, 12),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.24,
      }),
    );
    beam.position.set(-0.8 + index * 0.4, 2.2, 0.4);
    beam.rotation.z = -0.25;
    group.add(beam);
    beams.push(beam);
  }
  group.userData.chloroplasts = chloroplasts;
  group.userData.beams = beams;
  return group;
}

function makeStoma() {
  const group = new THREE.Group();
  group.name = "Stoma controlled by two guard cells";
  const guardMaterial = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x14532d,
    emissiveIntensity: 0.35,
    roughness: 0.5,
  });
  const guards: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const guard = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.2, 14, 36, Math.PI * 1.5),
      guardMaterial,
    );
    guard.scale.set(0.62, 1.12, 0.72);
    guard.position.set(side * 0.34, 1.1, 0);
    guard.rotation.z = side < 0 ? -Math.PI * 0.75 : Math.PI * 0.25;
    group.add(guard);
    guards.push(guard);
  }
  const carbonDioxide: THREE.Mesh[] = [];
  for (let index = 0; index < 20; index += 1) {
    const molecule = new THREE.Group();
    molecule.name = "carbon dioxide molecule";
    [-0.07, 0, 0.07].forEach((x, atomIndex) => {
      const atom = new THREE.Mesh(
        new THREE.SphereGeometry(atomIndex === 1 ? 0.05 : 0.043, 10, 8),
        new THREE.MeshStandardMaterial({
          color: atomIndex === 1 ? 0x64748b : 0xf87171,
          emissive: atomIndex === 1 ? 0x111827 : 0x7f1d1d,
          emissiveIntensity: 0.35,
        }),
      );
      atom.position.x = x;
      molecule.add(atom);
    });
    molecule.position.set(
      -1.6 + (index % 8) * 0.42,
      0.35 + (index % 5) * 0.35,
      0.45 + (index % 3) * 0.18,
    );
    molecule.userData.start = molecule.position.clone();
    molecule.userData.offset = index / 20;
    group.add(molecule);
    carbonDioxide.push(molecule as unknown as THREE.Mesh);
  }
  group.userData.guards = guards;
  group.userData.carbonDioxide = carbonDioxide;
  return group;
}

function makePhotosynthesisLab() {
  const group = new THREE.Group();
  group.name = "Photosynthesis laboratory producing glucose oxygen and starch";
  const ingredients = [
    { title: "WATER", subtitle: "from xylem", color: "#7dd3fc", x: -1.6 },
    {
      title: "CARBON DIOXIDE",
      subtitle: "from stomata",
      color: "#a7f3d0",
      x: 0,
    },
    {
      title: "LIGHT",
      subtitle: "captured by chlorophyll",
      color: "#fde047",
      x: 1.6,
    },
  ];
  ingredients.forEach(({ title, subtitle, color, x }) => {
    const panel = makePanel(title, subtitle, color, 1.35, 0.6);
    panel.position.set(x, 1.55, 0);
    group.add(panel);
  });
  const product = makePanel(
    "GLUCOSE + OXYGEN",
    "Food is formed • extra glucose can be stored as starch",
    "#fef08a",
    2.7,
    0.78,
  );
  product.position.set(0, 0.55, 0.15);
  product.scale.setScalar(0.05);
  group.add(product);
  const particles: THREE.Mesh[] = [];
  for (let index = 0; index < 30; index += 1) {
    const particle = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.045 + (index % 4) * 0.008, 1),
      new THREE.MeshStandardMaterial({
        color:
          index % 3 === 0 ? 0xfde047 : index % 3 === 1 ? 0x38bdf8 : 0xa7f3d0,
        emissive: 0x365314,
        emissiveIntensity: 0.45,
      }),
    );
    particle.userData.offset = index / 30;
    group.add(particle);
    particles.push(particle);
  }
  const starch = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 22, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0xfef3c7,
      emissive: 0x92400e,
      emissiveIntensity: 0.22,
      roughness: 0.25,
    }),
  );
  starch.name = "starch storage granule";
  starch.position.set(1.45, 0.48, 0.3);
  starch.scale.setScalar(0.05);
  group.add(starch);
  group.userData.product = product;
  group.userData.particles = particles;
  group.userData.starch = starch;
  return group;
}

function makeOxygenRelease() {
  const group = new THREE.Group();
  group.name = "Oxygen release through stomata";
  const gate = makePanel(
    "OXYGEN TO THE AIR",
    "Oxygen diffuses through the open stoma and supports life",
    "#bae6fd",
    2.65,
    0.8,
  );
  gate.position.set(0, 1.8, 0);
  group.add(gate);
  const oxygen: THREE.Group[] = [];
  for (let index = 0; index < 24; index += 1) {
    const molecule = new THREE.Group();
    molecule.name = "oxygen molecule";
    for (const x of [-0.045, 0.045]) {
      const atom = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 11, 8),
        new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          emissive: 0x0369a1,
          emissiveIntensity: 0.7,
        }),
      );
      atom.position.x = x;
      molecule.add(atom);
    }
    molecule.userData.offset = index / 24;
    group.add(molecule);
    oxygen.push(molecule);
  }
  group.userData.oxygen = oxygen;
  return group;
}

function makePhloemNetwork() {
  const group = new THREE.Group();
  group.name = "Phloem carries food to plant organs";
  const tubeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.48,
    roughness: 0.32,
  });
  const destinations = [
    new THREE.Vector3(-1.55, 0.35, 0),
    new THREE.Vector3(-0.9, 1.5, 0),
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(0.9, 1.55, 0),
    new THREE.Vector3(1.55, 0.38, 0),
  ];
  destinations.forEach((destination, index) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.1, 0),
      new THREE.Vector3(destination.x * 0.45, 1.15, 0),
      destination,
    ]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 26, 0.075, 10, false),
      tubeMaterial,
    );
    tube.name = "phloem transport tube";
    group.add(tube);
    const organ = new THREE.Mesh(
      index === 3
        ? new THREE.SphereGeometry(0.25, 18, 14)
        : new THREE.IcosahedronGeometry(0.24, 1),
      new THREE.MeshStandardMaterial({
        color: [0x8b5a2b, 0x22c55e, 0x84cc16, 0xf472b6, 0xf59e0b][index],
        roughness: 0.72,
      }),
    );
    organ.position.copy(destination);
    organ.name = ["roots", "young leaves", "stem", "flower", "fruit and seeds"][
      index
    ];
    group.add(organ);
  });
  const foodParticles: THREE.Mesh[] = [];
  for (let index = 0; index < 45; index += 1) {
    const sugar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.045, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xca8a04,
        emissiveIntensity: 0.72,
      }),
    );
    sugar.userData.offset = index / 45;
    sugar.userData.lane = index % destinations.length;
    group.add(sugar);
    foodParticles.push(sugar);
  }
  group.userData.destinations = destinations;
  group.userData.foodParticles = foodParticles;
  return group;
}

function makeChallengeRack() {
  const group = new THREE.Group();
  group.name = "Seven selectable photosynthesis ingredients";
  const objects = new Map<string, THREE.Mesh>();
  CHALLENGE_ITEMS.forEach((item, index) => {
    const angle = (index / CHALLENGE_ITEMS.length) * Math.PI * 2;
    const token = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.25, 2),
      new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: item.color,
        emissiveIntensity: 0.24,
        roughness: 0.44,
      }),
    );
    token.name = `ingredient-${item.name}`;
    token.userData.ingredient = item.name;
    token.userData.correct = item.correct;
    token.userData.baseY = 1.15 + Math.sin(angle) * 0.7;
    token.position.set(Math.cos(angle) * 1.65, token.userData.baseY, 0.05);
    group.add(token);
    objects.set(item.name, token);
    const label = makePanel(
      item.name.toUpperCase(),
      item.correct ? "possible requirement" : "possible distractor",
      "#bbf7d0",
      1.05,
      0.43,
    );
    label.position.set(token.position.x, token.position.y - 0.46, 0.06);
    label.scale.setScalar(0.72);
    group.add(label);
  });
  group.userData.objects = objects;
  return group;
}

function makeFinale() {
  const group = new THREE.Group();
  group.name = "Photosynthesis final summary and Green Guardian badge";
  const equation = makePanel(
    "CARBON DIOXIDE + WATER",
    "light captured by chlorophyll  →  GLUCOSE + OXYGEN",
    "#fde68a",
    3.5,
    1.05,
  );
  equation.position.set(0, 1.7, 0);
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.12, 36),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x854d0e,
      emissiveIntensity: 0.55,
      metalness: 0.62,
      roughness: 0.3,
    }),
  );
  badge.name = "Green Guardian badge";
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0, 0.55, 0.15);
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 }),
  );
  leaf.scale.set(0.64, 1.25, 0.25);
  leaf.position.copy(badge.position);
  leaf.position.z += 0.08;
  group.add(equation, badge, leaf);
  group.userData.badge = badge;
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

export default function SecretGardenKitchenViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const actionTimeRef = useRef(0);
  const completedStagesRef = useRef(new Set<number>());
  const selectedIngredientsRef = useRef(new Set<string>());
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
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    () => new Set(),
  );
  const [challengeFeedback, setChallengeFeedback] = useState(
    "Find the four requirements for photosynthesis.",
  );
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

  const playDiscoverySound = useCallback((success: boolean) => {
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
    oscillator.type = success ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(success ? 480 : 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      success ? 820 : 125,
      now + 0.45,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.065, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.62);
  }, []);

  const goToStage = useCallback((next: number) => {
    const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safeStage;
    actionTimeRef.current = performance.now() / 1000;
    setStage(safeStage);
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

  const markStageComplete = useCallback(
    (currentStage: number) => {
      if (completedStagesRef.current.has(currentStage)) return;
      completedStagesRef.current.add(currentStage);
      setCompletedStages(new Set(completedStagesRef.current));
      actionTimeRef.current = performance.now() / 1000;
      cardNeedsUpdateRef.current = true;
      playDiscoverySound(true);
    },
    [playDiscoverySound],
  );

  const selectIngredient = useCallback(
    (name: string) => {
      const item = CHALLENGE_ITEMS.find((candidate) => candidate.name === name);
      if (!item || selectedIngredientsRef.current.has(name)) return;
      if (!item.correct) {
        setChallengeFeedback(`${name} is not required. Try another choice.`);
        playDiscoverySound(false);
        return;
      }
      selectedIngredientsRef.current.add(name);
      setSelectedIngredients(new Set(selectedIngredientsRef.current));
      setChallengeFeedback(
        `${name} selected — ${selectedIngredientsRef.current.size} of 4 found.`,
      );
      cardNeedsUpdateRef.current = true;
      playDiscoverySound(true);
      if (selectedIngredientsRef.current.size === CORRECT_INGREDIENTS.length) {
        setChallengeFeedback(
          "Excellent! Sunlight, water, carbon dioxide and chlorophyll are all present.",
        );
        markStageComplete(9);
      }
    },
    [markStageComplete, playDiscoverySound],
  );

  const performAction = useCallback(() => {
    const currentStage = stageRef.current;
    if (completedStagesRef.current.has(currentStage)) {
      if (currentStage < STAGES.length - 1) goToStage(currentStage + 1);
      return;
    }
    if (currentStage === 9) {
      const nextIngredient = CORRECT_INGREDIENTS.find(
        (name) => !selectedIngredientsRef.current.has(name),
      );
      if (nextIngredient) selectIngredient(nextIngredient);
      return;
    }
    markStageComplete(currentStage);
  }, [goToStage, markStageComplete, selectIngredient]);

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
    scene.fog = new THREE.Fog(0x52715c, 16, 44);
    const realisticEnvironment = applyRealisticEnvironment(
      scene,
      renderer,
      ENVIRONMENTS.garden,
      { exposure: 1.03, intensity: 0.46 },
    );
    const environmentTextures: Record<EnvironmentName, THREE.Texture | null> = {
      garden: scene.background as THREE.Texture,
      roots: null,
      xylem: null,
      leaf: null,
    };
    const textureLoader = new THREE.TextureLoader();
    (["roots", "xylem", "leaf"] as const).forEach((name) => {
      const texture = textureLoader.load(ENVIRONMENTS[name]);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      environmentTextures[name] = texture;
    });

    const camera = new THREE.PerspectiveCamera(
      68,
      mount.clientWidth / mount.clientHeight,
      0.05,
      90,
    );
    camera.position.set(0, 2.05, 5.1);
    camera.lookAt(0, 1.1, 0);
    scene.add(new THREE.HemisphereLight(0xecfccb, 0x253226, 1.7));
    const sunlight = new THREE.DirectionalLight(0xfff7d6, 1.9);
    sunlight.position.set(-4, 8, 4);
    sunlight.castShadow = true;
    scene.add(sunlight);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x466454,
      roughness: 0.96,
      transparent: true,
      opacity: 0.18,
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

    const chlorie = makeChlorie();
    chlorie.position.set(-1.72, 0.08, 0.4);
    scene.add(chlorie);

    const welcomePlant = makePlant();
    welcomePlant.position.set(0.25, 0, -0.12);
    stageGroups[0].add(welcomePlant);
    const welcomePanel = makePanel(
      "GREEN PLANTS ARE AUTOTROPHS",
      "They make their own food through photosynthesis",
      "#86efac",
      3.2,
      0.86,
    );
    welcomePanel.position.set(0.45, 2.25, 0);
    stageGroups[0].add(welcomePanel);

    const rootSystem = makeRootSystem();
    rootSystem.position.set(0.2, 0, -0.1);
    stageGroups[1].add(rootSystem);

    const xylemSystem = makeXylemSystem();
    xylemSystem.position.set(0.1, 0, -0.2);
    stageGroups[2].add(xylemSystem);

    const leafFactory = makeLeafFactory();
    leafFactory.position.set(0.15, 0.05, -0.1);
    stageGroups[3].add(leafFactory);

    const stoma = makeStoma();
    stoma.position.set(0.2, 0.05, -0.1);
    stageGroups[4].add(stoma);

    const photosynthesisLab = makePhotosynthesisLab();
    photosynthesisLab.position.set(0.2, 0, -0.1);
    stageGroups[5].add(photosynthesisLab);

    const oxygenRelease = makeOxygenRelease();
    oxygenRelease.position.set(0.2, 0, -0.1);
    stageGroups[6].add(oxygenRelease);

    const phloemNetwork = makePhloemNetwork();
    phloemNetwork.position.set(0.2, 0, -0.1);
    stageGroups[7].add(phloemNetwork);

    const gardenReward = makePlant();
    gardenReward.position.set(0.25, 0, -0.1);
    gardenReward.scale.setScalar(0.68);
    const producerPanel = makePanel(
      "PLANTS ARE PRODUCERS",
      "Their food supports growth and begins many food chains",
      "#fde68a",
      2.8,
      0.8,
    );
    producerPanel.position.set(0.35, 2.18, 0);
    stageGroups[8].add(gardenReward, producerPanel);

    const challengeRack = makeChallengeRack();
    challengeRack.position.set(0.2, 0, -0.1);
    stageGroups[9].add(challengeRack);

    const finale = makeFinale();
    finale.position.set(0.25, 0, -0.1);
    stageGroups[10].add(finale);

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 850;
    cardCanvas.height = 285;
    cardCanvasRef.current = cardCanvas;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    cardTextureRef.current = cardTexture;
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(2.95, 0.99),
      new THREE.MeshBasicMaterial({ map: cardTexture, transparent: true }),
    );
    card.position.set(-1.5, 2.58, 0.5);
    scene.add(card);

    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.19, 0.09),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.3,
        }),
      );
      button.name = name;
      button.position.set(x, 1.18, 0.68);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.82);
    const actionButton = makeButton("btn-action", 0x16a34a, 0);
    actionButton.scale.x = 1.32;
    const nextButton = makeButton("btn-next", 0x65a30d, 0.82);
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

    const findInteractiveAncestor = (object: THREE.Object3D | null) => {
      let current = object;
      while (current) {
        if (current.name.startsWith("btn-") || current.userData.ingredient)
          return current;
        current = current.parent;
      }
      return object;
    };

    const handleHit = (object: THREE.Object3D) => {
      const target = findInteractiveAncestor(object);
      if (!target) return;
      if (target.name === "btn-action") performAction();
      else if (target.name === "btn-previous") goToStage(stageRef.current - 1);
      else if (target.name === "btn-next") {
        if (completedStagesRef.current.has(stageRef.current))
          goToStage(stageRef.current + 1);
      } else if (
        stageRef.current === 9 &&
        typeof target.userData.ingredient === "string"
      )
        selectIngredient(target.userData.ingredient);
      else if (object.userData.hotspotStage === stageRef.current)
        performAction();
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
      if (hit) handleHit(hit.object);
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 2.2, 4),
        new THREE.MeshBasicMaterial({ color: 0x86efac }),
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
      startPosition: new THREE.Vector3(0, 0, 2.4),
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.12, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.05;
    controls.maxDistance = 8;
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
      if (hit) handleHit(hit.object);
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
          environmentTextures[info.environment] ?? environmentTextures.garden;
        scene.background = texture;
        scene.environment = texture;
        scene.fog = new THREE.Fog(
          info.environment === "roots"
            ? 0x4b3828
            : info.environment === "xylem"
              ? 0x52663a
              : 0x52715c,
          16,
          44,
        );
        groundMaterial.color.setHex(
          info.environment === "roots"
            ? 0x493829
            : info.environment === "leaf"
              ? 0x315c36
              : 0x466454,
        );
        renderer.toneMappingExposure =
          info.environment === "leaf" ? 0.96 : 1.03;
        lastEnvironment = info.environment;
      }
      if (cardNeedsUpdateRef.current && cardCanvasRef.current) {
        drawCard(
          cardCanvasRef.current,
          currentStage,
          completed,
          selectedIngredientsRef.current.size,
        );
        if (cardTextureRef.current) cardTextureRef.current.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }

      stageGroups.forEach((group, index) => {
        group.visible = index === currentStage;
      });

      const rootDrops = rootSystem.userData.droplets as THREE.Mesh[];
      rootDrops.forEach((drop, index) => {
        const progress =
          currentStage === 1 && completed
            ? Math.min(actionAge / 2 + index * 0.012, 1)
            : 0;
        drop.position.lerpVectors(
          drop.userData.start as THREE.Vector3,
          drop.userData.target as THREE.Vector3,
          progress,
        );
        drop.scale.setScalar(1 - progress * 0.45);
      });

      const xylemDrops = xylemSystem.userData.droplets as THREE.Mesh[];
      xylemDrops.forEach((drop) => {
        const speed = currentStage === 2 && completed ? 0.46 : 0.15;
        const progress =
          (elapsed * speed + (drop.userData.offset as number)) % 1;
        const lane = drop.userData.lane as number;
        drop.position.set(-1 + lane * 0.55, 0.05 + progress * 3.4, -0.18);
      });

      const chloroplasts = leafFactory.userData.chloroplasts as THREE.Mesh[];
      chloroplasts.forEach((chloroplast, index) => {
        const pulse =
          1 +
          (currentStage === 3 && completed
            ? Math.sin(elapsed * 4 + index) * 0.12
            : 0);
        chloroplast.scale.set(1.45 * pulse, 0.55 * pulse, 0.46 * pulse);
        const material = chloroplast.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity =
          completed && currentStage === 3 ? 1.35 : 0.45;
      });

      const guards = stoma.userData.guards as THREE.Mesh[];
      const opening =
        currentStage === 4 && completed ? Math.min(actionAge / 1.2, 1) : 0;
      guards[0].position.x = -0.34 - opening * 0.24;
      guards[1].position.x = 0.34 + opening * 0.24;
      const carbonDioxide = stoma.userData.carbonDioxide as THREE.Mesh[];
      carbonDioxide.forEach((molecule, index) => {
        const progress = opening
          ? (elapsed * 0.28 + (molecule.userData.offset as number)) % 1
          : 0;
        const start = molecule.userData.start as THREE.Vector3;
        molecule.position.lerpVectors(
          start,
          new THREE.Vector3(0, 1.08, -0.55),
          progress,
        );
        molecule.position.y += Math.sin(elapsed * 2 + index) * 0.025;
      });

      const labParticles = photosynthesisLab.userData.particles as THREE.Mesh[];
      labParticles.forEach((particle, index) => {
        const progress =
          (elapsed * (completed && currentStage === 5 ? 0.5 : 0.14) +
            (particle.userData.offset as number)) %
          1;
        const angle = progress * Math.PI * 2 + index;
        particle.position.set(
          Math.cos(angle) * (1.4 - progress),
          1.5 - progress * 0.92,
          Math.sin(angle) * 0.2,
        );
      });
      const labProduct = photosynthesisLab.userData.product as THREE.Mesh;
      const starch = photosynthesisLab.userData.starch as THREE.Mesh;
      const productScale =
        currentStage === 5 && completed ? Math.min(actionAge / 1.2, 1) : 0.05;
      labProduct.scale.setScalar(productScale);
      starch.scale.setScalar(productScale * 0.85);

      const oxygen = oxygenRelease.userData.oxygen as THREE.Group[];
      oxygen.forEach((molecule, index) => {
        const progress =
          (elapsed * (currentStage === 6 && completed ? 0.35 : 0.09) +
            (molecule.userData.offset as number)) %
          1;
        molecule.position.set(
          Math.sin(index * 1.7) * (0.25 + progress * 1.35),
          0.2 + progress * 2.6,
          0.1 + Math.cos(index) * 0.22,
        );
        molecule.scale.setScalar(completed ? 1 : 0.42);
      });

      const foodParticles = phloemNetwork.userData
        .foodParticles as THREE.Mesh[];
      const destinations = phloemNetwork.userData
        .destinations as THREE.Vector3[];
      foodParticles.forEach((particle, index) => {
        const progress =
          (elapsed * (currentStage === 7 && completed ? 0.32 : 0.08) +
            (particle.userData.offset as number)) %
          1;
        const destination = destinations[particle.userData.lane as number];
        const start = new THREE.Vector3(0, 2.05, 0);
        particle.position.lerpVectors(start, destination, progress);
        particle.position.y += Math.sin(progress * Math.PI) * 0.2;
      });

      if (currentStage === 8) {
        const target = completed ? 1.2 : 0.68;
        gardenReward.scale.lerp(
          new THREE.Vector3(target, target, target),
          0.035,
        );
        const flower = gardenReward.userData.flower as THREE.Group;
        flower.rotation.z += completed ? 0.008 : 0.002;
      }

      const challengeObjects = challengeRack.userData.objects as Map<
        string,
        THREE.Mesh
      >;
      challengeObjects.forEach((object, name) => {
        object.position.y =
          (object.userData.baseY as number) +
          Math.sin(elapsed * 1.8 + object.position.x) * 0.06;
        object.rotation.y += 0.01;
        const material = object.material as THREE.MeshStandardMaterial;
        const selected = selectedIngredientsRef.current.has(name);
        material.emissiveIntensity = selected ? 1.7 : 0.24;
        object.scale.lerp(
          new THREE.Vector3(
            selected ? 1.24 : 1,
            selected ? 1.24 : 1,
            selected ? 1.24 : 1,
          ),
          0.08,
        );
      });

      if (currentStage === 10) {
        const badge = finale.userData.badge as THREE.Mesh;
        badge.rotation.z += completed ? 0.012 : 0.004;
        badge.position.y = 0.55 + Math.sin(elapsed * 1.8) * 0.08;
      }

      chlorie.position.y = 0.08 + Math.sin(elapsed * 1.8) * 0.08;
      chlorie.rotation.y = Math.sin(elapsed * 0.7) * 0.08;
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

    drawCard(cardCanvas, 0, false, 0);
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
      environmentTextures.roots?.dispose();
      environmentTextures.xylem?.dispose();
      environmentTextures.leaf?.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [goToStage, performAction, selectIngredient]);

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
  const knowledgePercent = Math.round(
    (completedStages.size / STAGES.length) * 100,
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#052e16",
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
              "radial-gradient(circle at 50% 20%, #166534 0%, #052e16 72%)",
          }}
        >
          <div style={{ maxWidth: 740, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 80 }}>🌿☀️💧🍃</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#86efac",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 7 • Science • Nutrition in Plants
            </div>
            <h1
              style={{
                color: "#f0fdf4",
                fontSize: "clamp(2.1rem, 5vw, 3.5rem)",
                lineHeight: 1.05,
                margin: "0 0 12px",
              }}
            >
              The Secret Kitchen of the Garden
            </h1>
            <p
              style={{
                color: "#dcfce7",
                lineHeight: 1.7,
                maxWidth: 650,
                margin: "0 auto",
              }}
            >
              Join Chlorie and travel from moist root hairs through xylem into a
              giant leaf cell. Build photosynthesis, release oxygen and send
              food through the living plant.
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
                  🥽 Enter the Garden in VR
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
                💻 Explore in Browser
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
              background: "rgba(5,46,22,0.9)",
              border: "1px solid rgba(134,239,172,0.48)",
              color: "#f0fdf4",
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
              <span>🍃 GREEN KITCHEN KNOWLEDGE</span>
              <span>{knowledgePercent}%</span>
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
                  width: `${knowledgePercent}%`,
                  height: "100%",
                  borderRadius: 99,
                  background:
                    "linear-gradient(90deg, #22c55e, #84cc16, #fde047)",
                  transition: "width 700ms ease",
                }}
              />
            </div>
          </div>

          <aside
            style={{
              position: "absolute",
              top: 76,
              right: 16,
              width: 380,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 96px)",
              overflowY: "auto",
              padding: 18,
              borderRadius: 15,
              background: "rgba(5,46,22,0.94)",
              border: "1px solid rgba(134,239,172,0.45)",
              color: "#f0fdf4",
              backdropFilter: "blur(12px)",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                color: "#86efac",
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              <span>
                Discovery {stage + 1}/{STAGES.length}
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
                background: "rgba(134,239,172,0.08)",
                border: "1px solid rgba(134,239,172,0.2)",
                marginBottom: 11,
              }}
            >
              <div style={{ ...bodyCopyStyle, margin: 0 }}>
                {STAGES[stage].detail}
              </div>
            </div>

            {stage === 9 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                {CHALLENGE_ITEMS.map((item) => {
                  const selected = selectedIngredients.has(item.name);
                  return (
                    <button
                      key={item.name}
                      onClick={() => selectIngredient(item.name)}
                      style={{
                        padding: "8px 7px",
                        borderRadius: 8,
                        border: selected
                          ? "1px solid #fde047"
                          : "1px solid rgba(255,255,255,0.18)",
                        background: selected
                          ? "rgba(250,204,21,0.2)"
                          : "rgba(255,255,255,0.07)",
                        color: "#f0fdf4",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    >
                      {item.emoji} {item.name} {selected ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={performAction}
              disabled={missionComplete}
              style={{
                ...primaryButtonStyle,
                opacity: missionComplete ? 0.62 : 1,
              }}
            >
              {missionComplete
                ? "🏅 Green Guardian mission complete"
                : currentComplete
                  ? "Continue to the next discovery →"
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
                color: currentComplete ? "#fde68a" : "#bbf7d0",
                fontSize: "0.76rem",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {stage === 9
                ? challengeFeedback
                : currentComplete
                  ? "Discovery complete • press Continue or controller A"
                  : "Point and select the glowing model, or use the action button"}
            </div>
            <button
              onClick={() => playNarration(NARRATIONS[stage])}
              style={secondaryButtonStyle}
            >
              🔊 Replay Chlorie’s narration
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
              maxWidth: 650,
              padding: "7px 10px",
              borderRadius: 9,
              background: "rgba(5,46,22,0.84)",
              color: "#dcfce7",
              fontSize: "0.72rem",
              zIndex: 4,
            }}
          >
            Quest: point + trigger selects • A acts/continues • B or right grip
            exits VR • Y goes back • left joystick walks • right joystick turns
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
          background: transitioning ? "rgba(2,23,10,0.7)" : "transparent",
          opacity: transitioning ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        <div
          style={{
            padding: "14px 24px",
            borderRadius: 14,
            background: "rgba(5,46,22,0.94)",
            border: "1px solid #86efac",
            color: "#f0fdf4",
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#86efac",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Chlorie is guiding you to
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
  background: "linear-gradient(135deg, #16a34a, #65a30d)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 7,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(134,239,172,0.42)",
  background: "rgba(134,239,172,0.1)",
  color: "#dcfce7",
} as const;

const bodyCopyStyle = {
  margin: "0 0 11px",
  color: "#dcfce7",
  fontSize: "0.83rem",
  lineHeight: 1.52,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.07)",
  color: "#dcfce7",
  cursor: "pointer",
} as const;
