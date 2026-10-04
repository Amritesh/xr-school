"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createQuestVrControls } from "./questVrControls";
import { playNarration, stopNarration, unlockNarration } from "./narrationAudio";

const STAGES = [
  { title: "Meet the Insect Hunter", cue: "Why does this plant have a deep, cup-shaped leaf?", detail: "Pitcher plants often grow where the soil contains very little usable nitrogen.", action: "Inspect the pitcher" },
  { title: "A Modified Leaf", cue: "Look at the pitcher, its slippery rim and the lid above the opening.", detail: "The trap is a modified leaf—not a flower and not a mouth.", action: "Release the insect" },
  { title: "Nectar Attracts", cue: "Sweet nectar and colour guide a small insect toward the rim.", detail: "The plant attracts insects chemically and visually; it does not chase them.", action: "Watch the insect land" },
  { title: "Slippery Rim", cue: "The insect loses its grip and slides down the smooth inner wall.", detail: "Downward-pointing structures and a slippery surface make escape difficult.", action: "Follow the fall" },
  { title: "Digestive Fluid", cue: "Fluid inside the pitcher breaks down the insect's soft tissues.", detail: "Digestive enzymes release mineral nutrients, especially nitrogen compounds.", action: "Trace the nutrients" },
  { title: "Nutrients Absorbed", cue: "The pitcher wall absorbs released nutrients and carries them into the plant.", detail: "These nutrients supplement poor soil and support growth.", action: "Explain the plant's food" },
  { title: "Plant, Not Animal", cue: "The green leaves still use sunlight, water and carbon dioxide to make sugars.", detail: "The insect supplies minerals—not the plant's main food energy. The pitcher plant still photosynthesises.", action: "Activity complete" },
];

const NARRATIONS = [
  "Welcome to Seeds and Seeds, Activity 1, Pitcher Plant, the insect hunter. Let us discover why this unusual plant traps insects.",
  "The pitcher is a modified leaf. It has a slippery rim, a deep chamber and a lid above the opening.",
  "Colour and sweet nectar attract a small insect to the pitcher rim. The plant does not chase its prey.",
  "The insect slips on the smooth rim and falls down the inner wall. Downward pointing structures make climbing out difficult.",
  "Digestive fluid and enzymes break down the insect's soft tissues and release mineral nutrients such as nitrogen compounds.",
  "The pitcher wall absorbs the released minerals. This helps the plant grow in nutrient poor soil.",
  "The pitcher plant is still a green plant. It makes sugars by photosynthesis. Insects provide extra minerals, not its main food energy.",
];

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

function drawCard(canvas: HTMLCanvasElement, stage: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#102016";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#a3e635";
  context.lineWidth = 5;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#bef264";
  context.font = "bold 20px sans-serif";
  context.fillText(`Activity 1  •  Stage ${stage + 1}/${STAGES.length}`, 24, 38);
  context.fillStyle = "#ffffff";
  context.font = "bold 30px sans-serif";
  context.fillText(STAGES[stage].title, 24, 82);
  context.fillStyle = "#ecfccb";
  context.font = "20px sans-serif";
  wrapText(context, STAGES[stage].cue, 24, 122, canvas.width - 48, 28);
  context.fillStyle = "#fde68a";
  context.font = "bold 18px sans-serif";
  context.fillText(stage === 6 ? "Insects supply minerals • Sunlight supplies energy" : STAGES[stage].action, 24, 234);
}

function makeInsect() {
  const group = new THREE.Group();
  group.name = "realistic-housefly";
  const dark = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.48, metalness: 0.12 });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), dark);
  abdomen.scale.set(1.45, 0.72, 0.72);
  abdomen.rotation.z = Math.PI / 2;
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 12), new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.55 }));
  thorax.position.x = 0.09;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), dark);
  head.position.x = 0.17;
  group.add(abdomen, thorax, head);
  const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.22, clearcoat: 0.8 });
  for (const z of [-0.036, 0.036]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), eyeMaterial);
    eye.position.set(0.195, 0.01, z);
    group.add(eye);
  }
  const wings: THREE.Mesh[] = [];
  const wingMaterial = new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.58, roughness: 0.08, transmission: 0.2, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 10), wingMaterial);
    wing.scale.set(1.65, 0.055, 0.62);
    wing.position.set(0.015, 0.055, side * 0.085);
    wing.rotation.y = side * 0.34;
    wings.push(wing);
    group.add(wing);
  }
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  for (const x of [-0.035, 0.04, 0.105]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.18, 6), legMaterial);
      leg.position.set(x, -0.075, side * 0.065);
      leg.rotation.x = side * 0.72;
      leg.rotation.z = (x - 0.04) * 4;
      group.add(leg);
    }
  }
  group.userData.wings = wings;
  return group;
}

export default function PitcherPlantViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageRef = useRef(0);
  const cardNeedsUpdateRef = useRef(true);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      (navigator as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr?.isSessionSupported?.("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
    }
  }, []);

  const goToStage = useCallback((next: number) => {
    const safe = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
    stageRef.current = safe;
    setStage(safe);
    cardNeedsUpdateRef.current = true;
    speakText(NARRATIONS[safe]);
  }, []);
  const advance = useCallback(() => { if (stageRef.current < STAGES.length - 1) goToStage(stageRef.current + 1); }, [goToStage]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10251a);
    scene.fog = new THREE.FogExp2(0x10251a, 0.035);
    const bogEnvironment = new THREE.TextureLoader().load("/environments/pitcher-plant-bog-360.png");
    bogEnvironment.mapping = THREE.EquirectangularReflectionMapping;
    bogEnvironment.colorSpace = THREE.SRGBColorSpace;
    scene.background = bogEnvironment;
    scene.environment = bogEnvironment;
    scene.backgroundBlurriness = 0.02;
    scene.environmentIntensity = 0.42;
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(0, 2.4, 6.1);
    camera.lookAt(0, 1.55, 0);
    scene.add(new THREE.HemisphereLight(0xecfccb, 0x142b1a, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 7, 5);
    light.castShadow = true;
    scene.add(light);
    const groundCanvas = document.createElement("canvas");
    groundCanvas.width = groundCanvas.height = 512;
    const groundContext = groundCanvas.getContext("2d")!;
    groundContext.fillStyle = "#233f2a";
    groundContext.fillRect(0, 0, 512, 512);
    for (let index = 0; index < 1800; index += 1) {
      const shade = 35 + (index * 17) % 34;
      groundContext.fillStyle = `rgba(${shade - 12},${shade + 22},${shade - 5},${0.12 + (index % 5) * 0.025})`;
      const size = 1 + (index % 5);
      groundContext.fillRect((index * 73) % 512, (index * 149) % 512, size, size);
    }
    const groundTexture = new THREE.CanvasTexture(groundCanvas);
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(5, 5);
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(5.4, 72), new THREE.MeshStandardMaterial({ map: groundTexture, color: 0x8aa17e, roughness: 0.96, transparent: true, opacity: 0.72 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const pot = new THREE.Mesh(new THREE.SphereGeometry(1.02, 36, 18), new THREE.MeshStandardMaterial({ color: 0x263b25, roughness: 1 }));
    pot.scale.y = 0.25;
    pot.position.y = 0.08;
    scene.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.07, 36), new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 1 }));
    soil.position.y = 0.28;
    scene.add(soil);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.55, 14), new THREE.MeshStandardMaterial({ color: 0x3f8f3d, roughness: 0.8 }));
    stem.position.set(-0.3, 1.5, 0);
    scene.add(stem);

    const skinCanvas = document.createElement("canvas");
    skinCanvas.width = 512; skinCanvas.height = 256;
    const skinContext = skinCanvas.getContext("2d")!;
    const skinGradient = skinContext.createLinearGradient(0, 0, 512, 0);
    skinGradient.addColorStop(0, "#567c25"); skinGradient.addColorStop(0.48, "#a7c957"); skinGradient.addColorStop(1, "#4f772d");
    skinContext.fillStyle = skinGradient; skinContext.fillRect(0, 0, 512, 256);
    for (let index = 0; index < 36; index += 1) {
      skinContext.strokeStyle = `rgba(${index % 2 ? 116 : 91},${index % 2 ? 38 : 51},${index % 2 ? 31 : 25},${0.28 + (index % 4) * 0.045})`;
      skinContext.lineWidth = 1.2 + (index % 3) * 0.7;
      const x = (index * 83) % 512;
      skinContext.beginPath(); skinContext.moveTo(x, 256); skinContext.bezierCurveTo(x - 34, 202, x + 31, 116, x + 9, 0); skinContext.stroke();
      if (index % 2 === 0) {
        skinContext.beginPath(); skinContext.moveTo(x - 8, 176); skinContext.quadraticCurveTo(x - 34, 155, x - 48, 129); skinContext.stroke();
        skinContext.beginPath(); skinContext.moveTo(x + 7, 108); skinContext.quadraticCurveTo(x + 34, 91, x + 43, 65); skinContext.stroke();
      }
    }
    for (let index = 0; index < 55; index += 1) {
      skinContext.fillStyle = `rgba(112,39,31,${0.08 + (index % 4) * 0.025})`;
      skinContext.beginPath();
      skinContext.ellipse((index * 97) % 512, (index * 61) % 256, 5 + (index % 5) * 2, 3 + (index % 3) * 2, index * 0.4, 0, Math.PI * 2);
      skinContext.fill();
    }
    const skinTexture = new THREE.CanvasTexture(skinCanvas);
    skinTexture.wrapS = THREE.RepeatWrapping;
    skinTexture.colorSpace = THREE.SRGBColorSpace;
    const pitcherMaterial = new THREE.MeshPhysicalMaterial({ map: skinTexture, color: 0xd9f99d, roughness: 0.5, clearcoat: 0.18, clearcoatRoughness: 0.62, side: THREE.DoubleSide });
    const pitcherProfile = [
      new THREE.Vector2(0.2, 0), new THREE.Vector2(0.31, 0.1), new THREE.Vector2(0.37, 0.35),
      new THREE.Vector2(0.35, 0.64), new THREE.Vector2(0.28, 0.98), new THREE.Vector2(0.3, 1.22),
      new THREE.Vector2(0.43, 1.42),
    ];
    const pitcher = new THREE.Mesh(new THREE.LatheGeometry(pitcherProfile, 48), pitcherMaterial);
    pitcher.position.set(0.28, 0.72, 0);
    pitcher.rotation.z = -0.08;
    pitcher.castShadow = true;
    scene.add(pitcher);
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), pitcherMaterial);
    bottom.scale.y = 0.75;
    bottom.position.set(0.34, 0.74, 0);
    scene.add(bottom);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.075, 16, 48), new THREE.MeshPhysicalMaterial({ color: 0x8f3028, roughness: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.5 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0.22, 2.16, 0);
    scene.add(rim);
    const innerThroat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.23, 0.58, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x47221d, roughness: 0.58, side: THREE.BackSide }));
    innerThroat.position.set(0.23, 1.88, 0);
    innerThroat.rotation.z = -0.08;
    scene.add(innerThroat);
    const opening = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), new THREE.MeshPhysicalMaterial({ color: 0x24100e, roughness: 0.38, side: THREE.DoubleSide }));
    opening.rotation.x = -Math.PI / 2;
    opening.position.set(0.22, 2.155, 0);
    scene.add(opening);
    const peristomeRibs: THREE.Mesh[] = [];
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.SphereGeometry(0.018, 7, 5), new THREE.MeshStandardMaterial({ color: index % 2 ? 0xb85d4d : 0xe0a172, roughness: 0.46 }));
      rib.scale.set(0.7, 0.45, 1.8);
      rib.position.set(0.22 + Math.cos(angle) * 0.43, 2.172, Math.sin(angle) * 0.43);
      rib.rotation.y = -angle;
      peristomeRibs.push(rib);
      scene.add(rib);
    }
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 16), new THREE.MeshPhysicalMaterial({ color: 0x557f35, roughness: 0.66, clearcoat: 0.08, side: THREE.DoubleSide }));
    lid.scale.set(1.05, 0.08, 0.72);
    lid.rotation.set(-0.62, 0.08, -0.32);
    lid.position.set(-0.01, 2.44, -0.12);
    lid.castShadow = true;
    scene.add(lid);
    const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 24), new THREE.MeshPhysicalMaterial({ color: 0x7c2d12, transparent: true, opacity: 0.72, roughness: 0.18 }));
    fluid.position.set(0.34, 0.86, 0);
    scene.add(fluid);

    // A restrained bog habitat: wet peat, shallow water, sedges and fallen leaves.
    const habitat = new THREE.Group();
    habitat.name = "nutrient-poor-bog-habitat";
    const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0x385d50, roughness: 0.16, metalness: 0.04, transmission: 0.14, transparent: true, opacity: 0.72 });
    for (let index = 0; index < 5; index += 1) {
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.55 + index * 0.08, 32), waterMaterial);
      water.rotation.x = -Math.PI / 2;
      water.scale.set(1.7, 0.72, 1);
      water.position.set(-3.2 + index * 1.55, 0.012, -1.9 + (index % 2) * 0.55);
      habitat.add(water);
    }
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.025, 0); bladeShape.quadraticCurveTo(-0.01, 0.55, 0, 0.88); bladeShape.quadraticCurveTo(0.03, 0.48, 0.025, 0); bladeShape.closePath();
    const bladeGeometry = new THREE.ShapeGeometry(bladeShape);
    const sedgeMaterials = [0x315c2b, 0x477a36, 0x6b8f45].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, side: THREE.DoubleSide }));
    for (let index = 0; index < 54; index += 1) {
      const angle = index * 2.399;
      const radius = 2.1 + (index % 9) * 0.22;
      const blade = new THREE.Mesh(bladeGeometry, sedgeMaterials[index % sedgeMaterials.length]);
      blade.position.set(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius - 0.55);
      blade.rotation.y = angle + (index % 4) * 0.35;
      blade.rotation.z = (index % 3 - 1) * 0.14;
      blade.scale.setScalar(0.56 + (index % 6) * 0.075);
      habitat.add(blade);
    }
    const fallenLeafShape = new THREE.Shape();
    fallenLeafShape.moveTo(0, 0.28); fallenLeafShape.bezierCurveTo(0.22, 0.19, 0.24, -0.14, 0, -0.3); fallenLeafShape.bezierCurveTo(-0.24, -0.14, -0.22, 0.19, 0, 0.28);
    const fallenLeafGeometry = new THREE.ShapeGeometry(fallenLeafShape);
    for (let index = 0; index < 10; index += 1) {
      const leaf = new THREE.Mesh(fallenLeafGeometry, new THREE.MeshStandardMaterial({ color: index % 2 ? 0x805b2a : 0x64763b, roughness: 0.94, side: THREE.DoubleSide }));
      leaf.rotation.x = -Math.PI / 2;
      leaf.rotation.z = index * 1.71;
      leaf.position.set(Math.sin(index * 2.7) * 3.3, 0.025, Math.cos(index * 1.9) * 2.6 - 0.7);
      leaf.scale.setScalar(0.5 + (index % 3) * 0.13);
      habitat.add(leaf);
    }
    scene.add(habitat);

    // Downward-pointing hairs form a visible one-way path into the pitcher.
    const trapHairs: THREE.Mesh[] = [];
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x8f713f, roughness: 0.72 });
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const hair = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.15, 5), hairMaterial);
      hair.position.set(0.22 + Math.cos(angle) * 0.32, 1.87, Math.sin(angle) * 0.32);
      hair.rotation.z = Math.PI + Math.cos(angle) * 0.34;
      hair.rotation.x = Math.sin(angle) * 0.34;
      hair.visible = false;
      trapHairs.push(hair);
      scene.add(hair);
    }

    const nectarDrops = Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2;
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xd9b76e, emissive: 0x7c5b20, emissiveIntensity: 0.12, roughness: 0.08, transmission: 0.28, transparent: true, opacity: 0.88, clearcoat: 1 }));
      drop.position.set(0.22 + Math.cos(angle) * 0.43, 2.18, Math.sin(angle) * 0.43);
      drop.visible = false;
      scene.add(drop);
      return drop;
    });

    const digestiveBubbles = Array.from({ length: 12 }, (_, index) => {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.015 + (index % 3) * 0.006, 10, 7), new THREE.MeshPhysicalMaterial({ color: 0xb97545, transparent: true, opacity: 0.5, roughness: 0.08, transmission: 0.35 }));
      bubble.visible = false;
      scene.add(bubble);
      return bubble;
    });

    const rootMaterial = new THREE.LineBasicMaterial({ color: 0x8fa66b, transparent: true, opacity: 0.7 });
    const rootPoints: THREE.Vector3[] = [];
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      rootPoints.push(new THREE.Vector3(-0.05, 0.42, 0), new THREE.Vector3(Math.cos(angle) * 0.58, 0.14, Math.sin(angle) * 0.58));
    }
    const glowingRoots = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rootPoints), rootMaterial);
    glowingRoots.visible = false;
    scene.add(glowingRoots);

    const leafMaterial = new THREE.MeshPhysicalMaterial({ color: 0x3f7d3d, side: THREE.DoubleSide, roughness: 0.68, clearcoat: 0.08 });
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), leafMaterial);
      leaf.scale.set(1.45, 0.62, 0.1);
      leaf.rotation.z = side * 0.32;
      leaf.rotation.y = side * 0.12;
      leaf.position.set(-0.3 + side * 0.55, 1.65 + side * 0.12, -0.05);
      leaf.castShadow = true;
      scene.add(leaf);
      const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.014, 0.88, 8), new THREE.MeshStandardMaterial({ color: 0xa2b76f, roughness: 0.8 }));
      vein.position.copy(leaf.position);
      vein.position.z += 0.045;
      vein.rotation.z = Math.PI / 2 + side * 0.32;
      scene.add(vein);
    }
    const tendrilCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.13, 1.72, 0), new THREE.Vector3(0.35, 1.62, 0.03),
      new THREE.Vector3(0.48, 1.28, 0.02), new THREE.Vector3(0.36, 0.94, 0),
    ]);
    const tendril = new THREE.Mesh(new THREE.TubeGeometry(tendrilCurve, 28, 0.018, 8, false), new THREE.MeshStandardMaterial({ color: 0x638c3d, roughness: 0.78 }));
    scene.add(tendril);

    const sunlightRays = new THREE.Group();
    sunlightRays.name = "photosynthesis-sunlight-rays";
    for (let index = 0; index < 5; index += 1) {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.08, 2.2, 10), new THREE.MeshBasicMaterial({ color: 0xffefb0, transparent: true, opacity: 0.08, depthWrite: false }));
      ray.position.set(1.25 + index * 0.18, 3.3, -0.55 + index * 0.16);
      ray.rotation.z = -0.58;
      sunlightRays.add(ray);
    }
    sunlightRays.visible = false;
    scene.add(sunlightRays);
    const sugarParticles = Array.from({ length: 16 }, (_, index) => {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: 0x9bc58d, roughness: 0.58 }));
      particle.visible = false;
      particle.position.set(-0.75 + (index % 4) * 0.28, 1.5 + Math.floor(index / 4) * 0.18, ((index % 3) - 1) * 0.14);
      scene.add(particle);
      return particle;
    });

    const ambientMotes = Array.from({ length: 12 }, (_, index) => {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.006 + (index % 2) * 0.003, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe6dcc1, transparent: true, opacity: 0.24, depthWrite: false }));
      mote.position.set(Math.sin(index * 2.17) * 3.2, 0.55 + (index % 7) * 0.43, Math.cos(index * 1.73) * 2.7 - 0.5);
      scene.add(mote);
      return mote;
    });
    const insect = makeInsect();
    insect.position.set(-1.25, 2.55, 0.45);
    scene.add(insect);
    const nutrientParticles = Array.from({ length: 18 }, (_, index) => {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      particle.visible = false;
      particle.position.set(0.24, 1 + (index % 6) * 0.17, ((index % 3) - 1) * 0.12);
      scene.add(particle);
      return particle;
    });

    const cardCanvas = document.createElement("canvas");
    cardCanvas.width = 720;
    cardCanvas.height = 280;
    const cardTexture = new THREE.CanvasTexture(cardCanvas);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.09), new THREE.MeshBasicMaterial({ map: cardTexture }));
    card.position.set(-1.25, 3.05, -1.45);
    scene.add(card);
    const makeButton = (name: string, color: number, x: number) => {
      const button = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.08), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }));
      button.name = name;
      button.position.set(x, 1.35, -1.15);
      scene.add(button);
      return button;
    };
    const previousButton = makeButton("btn-previous", 0x64748b, -0.45);
    const nextButton = makeButton("btn-next", 0x84cc16, 0.45);
    const interactables = [previousButton, nextButton];
    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hit = raycaster.intersectObjects(interactables)[0];
      if (hit?.object.name === "btn-next") advance();
      else if (hit?.object.name === "btn-previous") goToStage(stageRef.current - 1);
    };
    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xbef264 }));
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -0.9;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });
    const questVr = createQuestVrControls({ renderer, scene, camera, controllers, onPrimary: advance, onBack: () => goToStage(stageRef.current - 1), onNarrate: () => speakText(NARRATIONS[stageRef.current]), startPosition: new THREE.Vector3(0, 0, 2.6) });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      questVr.update();
      const elapsed = clock.getElapsedTime();
      const current = stageRef.current;
      const flyWings = insect.userData.wings as THREE.Mesh[];
      flyWings.forEach((wing, index) => { wing.rotation.x = Math.sin(elapsed * 75) * 0.72 * (index ? -1 : 1); });
      insect.rotation.y = Math.sin(elapsed * 2.8) * 0.18;
      if (current < 2) insect.position.set(-1.25, 2.55 + Math.sin(elapsed * 2) * 0.05, 0.45);
      else if (current === 2) insect.position.set(-0.35 + Math.sin(elapsed) * 0.08, 2.35, 0.28);
      else if (current === 3) insect.position.set(0.18, 1.55 + Math.sin(elapsed * 1.5) * 0.2, 0.08);
      else insect.position.set(0.32, 0.95, 0.05);
      insect.visible = current < 5;
      trapHairs.forEach((hair, index) => {
        hair.visible = current >= 1 && current <= 3;
        hair.scale.y = 0.9 + Math.sin(elapsed * 3 + index) * 0.08;
      });
      nectarDrops.forEach((drop, index) => {
        drop.visible = current === 2;
        const pulse = 0.82 + Math.sin(elapsed * 4 + index * 0.7) * 0.22;
        drop.scale.setScalar(pulse);
      });
      digestiveBubbles.forEach((bubble, index) => {
        bubble.visible = current === 4;
        const progress = (elapsed * 0.3 + index / digestiveBubbles.length) % 1;
        bubble.position.set(0.34 + Math.sin(index * 2.4) * 0.16, 0.88 + progress * 0.72, Math.cos(index * 1.8) * 0.14);
        bubble.scale.setScalar(1 - progress * 0.45);
      });
      glowingRoots.visible = current === 5;
      rootMaterial.opacity = 0.58 + Math.sin(elapsed * 3) * 0.24;
      sunlightRays.visible = current === 6;
      sunlightRays.children.forEach((ray, index) => { ray.position.y = 3.3 + Math.sin(elapsed * 1.8 + index) * 0.05; });
      sugarParticles.forEach((particle, index) => {
        particle.visible = current === 6;
        if (current === 6) particle.rotation.y = particle.rotation.x = elapsed * (0.7 + index * 0.025);
      });
      ambientMotes.forEach((mote, index) => {
        mote.position.y += Math.sin(elapsed * 0.7 + index) * 0.0008;
        mote.position.x += Math.cos(elapsed * 0.5 + index) * 0.0005;
      });
      nutrientParticles.forEach((particle, index) => {
        particle.visible = current >= 4;
        if (current >= 4) {
          const progress = (elapsed * 0.22 + index / nutrientParticles.length) % 1;
          particle.position.y = 0.9 + progress * 1.25;
          particle.position.x = 0.3 - progress * 0.55;
        }
      });
      if (cardNeedsUpdateRef.current) {
        drawCard(cardCanvas, current);
        cardTexture.needsUpdate = true;
        cardNeedsUpdateRef.current = false;
      }
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      card.lookAt(activeCamera.position);
      interactables.forEach((button) => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });
    drawCard(cardCanvas, 0);
    cardTexture.needsUpdate = true;
    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener("resize", resize);
    return () => {
      renderer.setAnimationLoop(null);
      controllers.forEach((controller) => controller.removeEventListener("selectstart", onControllerSelect as any));
      controls.dispose();
      questVr.dispose();
      bogEnvironment.dispose();
      renderer.dispose();
      window.removeEventListener("resize", resize);
      stopNarration();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [advance, goToStage]);

  const enterVR = useCallback(async () => {
    const xr = (navigator as Navigator & { xr?: { requestSession?: (mode: string, options: object) => Promise<XRSession> } }).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: ["bounded-floor", "hand-tracking"] });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      // Quest briefly changes audio routing while immersive mode starts. Waiting
      // for that transition prevents the narration source from being cut off.
      window.setTimeout(() => speakText(NARRATIONS[stageRef.current]), 900);
    } catch { setVrSupported(false); }
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#07170d" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, #365314 0%, #07170d 72%)" }}><div style={{ maxWidth: 650, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 74 }}>🌿🪰</div>
        <div style={{ margin: "14px 0 10px", color: "#bef264", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Class 5 EVS • Chapter 5 • Activity 1</div>
        <h1 style={{ color: "#f7fee7", fontSize: "clamp(2.1rem, 5vw, 3.1rem)", lineHeight: 1.08, margin: "0 0 14px" }}>Pitcher Plant — The Insect Hunter</h1>
        <p style={{ color: "#ecfccb", lineHeight: 1.7 }}>Follow an insect into a pitcher leaf and discover how the plant gains minerals while still making sugars through photosynthesis.</p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 26 }}>{vrSupported && <button onClick={enterVR} style={primaryButtonStyle}>🥽 Enter in VR</button>}<button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={secondaryButtonStyle}>💻 View in Browser</button></div>
      </div></div>}
      {started && <><aside style={{ position: "absolute", top: 70, right: 16, width: 365, maxHeight: "calc(100vh - 88px)", overflowY: "auto", padding: 18, borderRadius: 14, background: "rgba(16,32,22,0.95)", border: "1px solid rgba(163,230,53,0.42)", color: "#f7fee7", backdropFilter: "blur(10px)" }}>
        <div style={{ color: "#bef264", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity 1 • Stage {stage + 1}/{STAGES.length}</div>
        <h2 style={{ margin: "10px 0 8px", fontSize: "1.2rem" }}>{STAGES[stage].title}</h2>
        <p style={bodyCopyStyle}>{STAGES[stage].cue}</p>
        <div style={{ padding: 11, borderRadius: 9, background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", marginBottom: 13 }}><div style={{ ...bodyCopyStyle, margin: 0 }}>{STAGES[stage].detail}</div></div>
        <button onClick={advance} disabled={stage === STAGES.length - 1} style={{ ...primaryButtonStyle, opacity: stage === STAGES.length - 1 ? 0.55 : 1 }}>{STAGES[stage].action}</button>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={() => goToStage(stage - 1)} disabled={stage === 0} style={navButtonStyle}>← Previous</button><button onClick={() => speakText(NARRATIONS[stage])} style={navButtonStyle}>🔊 Narrate</button></div>
        <div role="status" style={{ marginTop: 12, color: stage === 6 ? "#86efac" : "#fde68a", fontSize: "0.78rem", lineHeight: 1.5, textAlign: "center" }}>{stage === 6 ? "Conclusion: insects provide minerals, not energy" : "Observe the pitcher before advancing"}</div>
        {vrSupported && <button onClick={enterVR} style={secondaryButtonStyle}>🥽 Enter VR</button>}
      </aside><div style={{ position: "absolute", bottom: 16, left: 16, color: "#bef264", fontSize: "0.75rem" }}>Quest: trigger selects • A advances • B/right grip exits VR • Y goes back • joysticks move and turn</div></>}
    </div>
  );
}

const primaryButtonStyle = { width: "100%", padding: "11px 16px", borderRadius: 9, border: 0, background: "linear-gradient(135deg, #84cc16, #3f6212)", color: "#ffffff", fontWeight: 800, cursor: "pointer" } as const;
const secondaryButtonStyle = { ...primaryButtonStyle, marginTop: 10, border: "1px solid rgba(163,230,53,0.42)", background: "rgba(163,230,53,0.1)", color: "#d9f99d" } as const;
const bodyCopyStyle = { margin: "0 0 12px", color: "#ecfccb", fontSize: "0.84rem", lineHeight: 1.58 } as const;
const navButtonStyle = { flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#ecfccb", cursor: "pointer" } as const;
