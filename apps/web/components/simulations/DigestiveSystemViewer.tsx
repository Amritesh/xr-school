'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  computeFocusFrame,
  createGuidedCamera,
} from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import { createPresentationPipeline } from '@/lib/world-builder/presentationPipeline';
import {
  DIGESTIVE_CLASSROOM_FEATURES,
  DIGESTIVE_EDUCATIONAL_OBJECTIVES,
  DIGESTIVE_HEALTHY_SORT_ACTIONS,
  DIGESTIVE_IMMERSION_REQUIREMENTS,
  DIGESTIVE_PATHWAY,
  DIGESTIVE_PERFORMANCE_TARGETS,
  DIGESTIVE_QUIZ_QUESTIONS,
  DIGESTIVE_STAGES,
  DIGESTIVE_VR_FEATURES,
  answerQuizQuestion,
  createDigestiveProgress,
  getQuizScore,
  hasDigestiveExplorerBadge,
  isStageComplete,
  recordStageAction,
  type DigestiveProgress,
  type DigestiveStageId,
} from '@/lib/digestiveLesson';
import {
  playSimulationNarration,
  stopSimulationNarration,
} from '@/lib/simulationAudio';

const COLORS = {
  cyan: 0x38bdf8,
  green: 0x4ade80,
  amber: 0xfbbf24,
  coral: 0xfb7185,
  purple: 0xa78bfa,
  liver: 0x9f4a54,
  gallbladder: 0x65a30d,
  pancreas: 0xf59e86,
  intestine: 0xf6a5b7,
  blood: 0xef4444,
  water: 0x60a5fa,
} as const;

const BODY_TRAVEL_STAGE_IDS: readonly DigestiveStageId[] = [
  'mouth',
  'esophagus',
  'stomach',
  'supporting-organs',
  'small-intestine',
  'large-intestine',
  'rectum-anus',
] as const;

const STAGE_CAMERA_FRAMES: Record<DigestiveStageId, {
  position: [number, number, number];
  target: [number, number, number];
}> = {
  welcome: { position: [0, 1.7, 5.2], target: [0, 1.25, -0.65] },
  mouth: { position: [0, 1.32, 0.92], target: [0, 1.36, -0.12] },
  esophagus: { position: [0, 1.85, 0.96], target: [0, 1.28, -0.18] },
  stomach: { position: [0.18, 1.35, 1.12], target: [0.05, 1.18, -0.15] },
  'supporting-organs': { position: [0.35, 1.42, 1.24], target: [0, 1.42, -0.05] },
  'small-intestine': { position: [0.1, 1.28, 1.38], target: [0.18, 1.2, -0.18] },
  'large-intestine': { position: [0, 1.24, 1.3], target: [0, 1.2, -0.1] },
  'rectum-anus': { position: [0, 1.22, 1.2], target: [0, 0.86, -0.1] },
  'healthy-habits': { position: [0, 1.65, 4.4], target: [0, 1.1, -0.35] },
  recap: { position: [0, 1.65, 4.6], target: [0, 1.35, -0.25] },
};

type DigestiveAssetSlot = {
  id: string;
  stageId: DigestiveStageId;
  src: string;
  label: string;
  position: [number, number, number];
  scale: number;
  rotation?: [number, number, number];
};

const DIGESTIVE_GLTF_ASSET_SLOTS: readonly DigestiveAssetSlot[] = [
  {
    id: 'teacher-guide-rig',
    stageId: 'welcome',
    src: '/assets/digestive/teacher-guide-rig.glb',
    label: 'Rigged AI teacher guide with pointing and face-player animation clips',
    position: [-2.35, 0.08, -1.2],
    scale: 1,
  },
  {
    id: 'futuristic-science-room',
    stageId: 'welcome',
    src: '/assets/digestive/futuristic-science-room.glb',
    label: 'Futuristic science room with smart board, holograms, lab equipment, and portal',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'mouth-interior-environment',
    stageId: 'mouth',
    src: '/assets/digestive/mouth-interior-environment.glb',
    label: 'Inside-mouth environment with gums, teeth, tongue, saliva emitters, and bolus states',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'esophagus-peristalsis-tunnel',
    stageId: 'esophagus',
    src: '/assets/digestive/esophagus-peristalsis-tunnel.glb',
    label: 'Animated esophagus tunnel with contraction blendshapes and bolus path',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'stomach-chamber-digestion',
    stageId: 'stomach',
    src: '/assets/digestive/stomach-chamber-digestion.glb',
    label: 'Living stomach chamber with wall contractions, acid particles, enzyme wheel, and chyme morph',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'helper-organs-chamber',
    stageId: 'supporting-organs',
    src: '/assets/digestive/helper-organs-chamber.glb',
    label: 'Liver, gallbladder, pancreas chamber with bile and enzyme flow animations',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'small-intestine-villi-world',
    stageId: 'small-intestine',
    src: '/assets/digestive/small-intestine-villi-world.glb',
    label: 'Large walk-through intestine folds with villi, nutrient particles, and pulsing blood vessels',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'large-intestine-water-world',
    stageId: 'large-intestine',
    src: '/assets/digestive/large-intestine-water-world.glb',
    label: 'Large intestine environment with water absorption particles and waste transformation states',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'rectum-exit-pathway',
    stageId: 'rectum-anus',
    src: '/assets/digestive/rectum-exit-pathway.glb',
    label: 'Respectful final pathway animation for storage and exit',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'healthy-habits-table',
    stageId: 'healthy-habits',
    src: '/assets/digestive/healthy-habits-table.glb',
    label: 'Clean futuristic sorting table with food cards, baskets, and celebration emitters',
    position: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'holographic-quiz-arena',
    stageId: 'recap',
    src: '/assets/digestive/holographic-quiz-arena.glb',
    label: 'Floating quiz card arena with answer glow, applause particles, and badge reveal',
    position: [0, 0, 0],
    scale: 1,
  },
] as const;

const ACTION_LABELS: Record<string, string> = {
  'start-journey': 'Start Journey',
  'place-food': 'Place Food in Mouth',
  'peristalsis-wave-1': 'Trigger Wave 1',
  'peristalsis-wave-2': 'Trigger Wave 2',
  'peristalsis-wave-3': 'Trigger Wave 3',
  'mixer-turn-1': 'Turn Mixer 1',
  'mixer-turn-2': 'Turn Mixer 2',
  'mixer-turn-3': 'Turn Mixer 3',
  'inspect-liver': 'Inspect Liver',
  'inspect-gallbladder': 'Inspect Gallbladder',
  'inspect-pancreas': 'Inspect Pancreas',
  'absorb-nutrient-1': 'Absorb Protein',
  'absorb-nutrient-2': 'Absorb Sugar',
  'absorb-nutrient-3': 'Absorb Vitamins',
  'absorb-water-1': 'Absorb Water 1',
  'absorb-water-2': 'Absorb Water 2',
  'absorb-water-3': 'Absorb Water 3',
  'sort-apple-healthy': 'Apple -> Healthy',
  'sort-pizza-unhealthy': 'Pizza -> Limit Often',
  'sort-milk-healthy': 'Milk -> Healthy',
  'sort-chips-unhealthy': 'Chips -> Limit Often',
  'sort-banana-healthy': 'Banana -> Healthy',
  'sort-burger-unhealthy': 'Burger -> Limit Often',
  'sort-water-healthy': 'Water -> Healthy',
  'sort-soft-drink-unhealthy': 'Soft Drink -> Limit Often',
};

const ACTION_FEEDBACK: Record<string, string> = {
  'start-journey': 'The digestive pathway is glowing. First stop: the mouth!',
  'place-food': 'Crunch! Teeth, tongue, and saliva have formed a soft bolus.',
  'peristalsis-wave-1': 'The first muscles squeeze behind the bolus.',
  'peristalsis-wave-2': 'The muscle wave continues down the esophagus.',
  'peristalsis-wave-3': 'The bolus reaches the stomach—peristalsis complete!',
  'mixer-turn-1': 'The stomach begins churning food with digestive juices.',
  'mixer-turn-2': 'Churning breaks the food into smaller pieces.',
  'mixer-turn-3': 'The mixture is now called chyme.',
  'inspect-liver': 'The liver produces bile, which helps digest fats.',
  'inspect-gallbladder': 'The gallbladder stores and releases bile.',
  'inspect-pancreas': 'The pancreas releases juices that help digest food.',
  'absorb-nutrient-1': 'Protein building blocks enter the blood.',
  'absorb-nutrient-2': 'Simple sugars enter the blood for energy.',
  'absorb-nutrient-3': 'Vitamins pass through the villi into the blood.',
  'absorb-water-1': 'Water moves from the large intestine back into the body.',
  'absorb-water-2': 'More water is recovered.',
  'absorb-water-3': 'Water absorption is complete and solid waste remains.',
  'sort-apple-healthy': 'Apple belongs in the healthy basket: it gives fibre and nutrients.',
  'sort-pizza-unhealthy': 'Pizza is a sometimes food, so it goes in the limit-often basket.',
  'sort-milk-healthy': 'Milk belongs in the healthy basket because it supports growth and strength.',
  'sort-chips-unhealthy': 'Chips are a sometimes snack, so choose them less often.',
  'sort-banana-healthy': 'Banana belongs in the healthy basket and gives quick energy.',
  'sort-burger-unhealthy': 'Burger is a sometimes food, so balance it with healthier meals.',
  'sort-water-healthy': 'Water belongs in the healthy basket and helps digestion move smoothly.',
  'sort-soft-drink-unhealthy': 'Soft drink is a sometimes drink, so water is the better daily choice.',
};

type ActionButtonsProps = {
  actionIds: readonly string[];
  completedActionIds: readonly string[];
  performAction: (actionId: string) => void;
};

function ActionButtons({
  actionIds,
  completedActionIds,
  performAction,
}: ActionButtonsProps) {
  if (actionIds.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {actionIds.map(actionId => {
        const complete = completedActionIds.includes(actionId);
        return (
          <button
            key={actionId}
            type="button"
            disabled={complete}
            onClick={() => performAction(actionId)}
            style={{
              padding: '10px 11px',
              borderRadius: 10,
              border: complete ? '1px solid rgba(74,222,128,.55)' : '1px solid rgba(56,189,248,.42)',
              background: complete ? 'rgba(22,101,52,.45)' : 'rgba(14,116,144,.23)',
              color: complete ? '#bbf7d0' : '#e0f2fe',
              fontWeight: 800,
              cursor: complete ? 'default' : 'pointer',
              textAlign: 'left',
            }}
          >
            {complete ? '✓ ' : ''}{ACTION_LABELS[actionId] ?? actionId}
          </button>
        );
      })}
    </div>
  );
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const candidate = `${line}${word} `;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      ctx.fillText(line.trim(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line.trim(), x, currentY);
}

function makeTextTexture(
  title: string,
  subtitle: string,
  accent = '#38bdf8',
  width = 768,
  height = 300,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(6,20,38,.98)');
  gradient.addColorStop(1, 'rgba(12,39,56,.96)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = accent;
  ctx.font = '800 26px sans-serif';
  ctx.fillText('XR SCHOOL · CLASS 5', 34, 48);
  ctx.fillStyle = '#f8fafc';
  ctx.font = title.length > 25 ? '800 44px sans-serif' : '800 54px sans-serif';
  wrapCanvasText(ctx, title, 34, 112, width - 68, 52);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '28px sans-serif';
  wrapCanvasText(ctx, subtitle, 34, 220, width - 68, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLabel(text: string, color = '#e0f2fe', width = 360) {
  const texture = makeTextTexture(text, '', color, width, 120);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width / 320, 0.38),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  return mesh;
}

function organMaterial(color: number, opacity = 0.92) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.12,
    roughness: 0.48,
    transparent: opacity < 1,
    opacity,
  });
}

function addActionTarget(
  group: THREE.Group,
  interactiveTargets: THREE.Object3D[],
  actionId: string,
  label: string,
  position: [number, number, number],
  color: number = COLORS.cyan,
) {
  const target = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    }),
  );
  target.name = `digestive-action-${actionId}`;
  target.position.set(...position);
  target.userData.actionId = actionId;
  target.userData.baseColor = color;
  const labelMesh = makeLabel(label, `#${color.toString(16).padStart(6, '0')}`, 300);
  labelMesh.scale.setScalar(0.62);
  labelMesh.position.set(0, 0.31, 0);
  target.add(labelMesh);
  group.add(target);
  interactiveTargets.push(target);
  return target;
}

function addTube(
  group: THREE.Group,
  points: THREE.Vector3[],
  radius: number,
  color: number,
  name: string,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 14, false),
    organMaterial(color, 0.88),
  );
  tube.name = name;
  group.add(tube);
  return tube;
}

function addParticleField(
  group: THREE.Group,
  name: string,
  count: number,
  color: number,
  radius = 1.8,
) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const y = ((index % 17) / 16 - 0.5) * radius;
    const ringRadius = radius * (0.35 + ((index * 7) % 19) / 28);
    positions[index * 3] = Math.cos(angle) * ringRadius;
    positions[index * 3 + 1] = y + 1.25;
    positions[index * 3 + 2] = Math.sin(angle) * ringRadius;
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color,
      size: 0.035,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  particles.name = name;
  group.add(particles);
  return particles;
}

function prepareProductionAsset(root: THREE.Object3D, slot: DigestiveAssetSlot) {
  root.name = `production-gltf-${slot.id}`;
  root.position.set(...slot.position);
  root.scale.setScalar(slot.scale);
  if (slot.rotation) root.rotation.set(...slot.rotation);
  root.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as THREE.MeshStandardMaterial;
      if ('roughness' in standard) standard.roughness = Math.max(standard.roughness ?? 0.45, 0.42);
      if ('metalness' in standard) standard.metalness = Math.min(standard.metalness ?? 0.08, 0.12);
    }
  });
}

function loadProductionDigestiveAssets(
  groups: Map<DigestiveStageId, THREE.Group>,
  animationMixers: THREE.AnimationMixer[],
  onAssetLoaded: (slot: DigestiveAssetSlot) => void,
) {
  const loader = new GLTFLoader();
  for (const slot of DIGESTIVE_GLTF_ASSET_SLOTS) {
    const group = groups.get(slot.stageId);
    if (!group) continue;
    loader.load(
      slot.src,
      gltf => {
        prepareProductionAsset(gltf.scene, slot);
        gltf.scene.userData.productionAssetSlot = slot.id;
        gltf.scene.userData.productionAssetLabel = slot.label;
        group.add(gltf.scene);
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          for (const clip of gltf.animations) mixer.clipAction(clip).play();
          animationMixers.push(mixer);
        }
        onAssetLoaded(slot);
      },
      undefined,
      () => {
        group.userData.pendingProductionAssets = [
          ...((group.userData.pendingProductionAssets as string[] | undefined) ?? []),
          slot.id,
        ];
      },
    );
  }
}

function addClassroomEnvironment(scene: THREE.Scene) {
  const classroom = new THREE.Group();
  classroom.name = 'modern-futuristic-science-classroom';
  scene.add(classroom);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    emissive: 0x0e7490,
    emissiveIntensity: 0.05,
    roughness: 0.72,
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbff4ff,
    transparent: true,
    opacity: 0.42,
    roughness: 0.08,
    transmission: 0.2,
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.2), wallMaterial);
  backWall.name = 'blue-white-science-room-back-wall';
  backWall.position.set(0, 1.65, -2.35);
  classroom.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 3.2), wallMaterial);
  leftWall.name = 'science-room-left-wall-with-holographic-window';
  leftWall.position.set(-4.3, 1.65, 0.1);
  leftWall.rotation.y = Math.PI / 2;
  classroom.add(leftWall);

  const smartBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 1.45),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(
        'Journey Through Digestion',
        'Teacher AI guide - organs, absorption, quiz, and badge.',
        '#38bdf8',
        900,
        360,
      ),
      transparent: true,
    }),
  );
  smartBoard.name = 'interactive-smart-board-digestive-journey';
  smartBoard.position.set(0, 2.05, -2.28);
  classroom.add(smartBoard);

  const humanHologram = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 1.18, 16, 36),
    new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      emissive: 0x0891b2,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
      transmission: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  humanHologram.name = 'human-body-hologram';
  humanHologram.position.set(1.95, 1.26, -1.05);
  classroom.add(humanHologram);

  const digestiveHologram = new THREE.Group();
  digestiveHologram.name = 'digestive-system-hologram-growing';
  digestiveHologram.position.set(1.95, 1.34, -1.05);
  addTube(digestiveHologram, [
    new THREE.Vector3(0, 0.58, 0),
    new THREE.Vector3(0, 0.18, 0),
    new THREE.Vector3(0.13, -0.12, 0),
    new THREE.Vector3(-0.08, -0.34, 0),
    new THREE.Vector3(0.05, -0.62, 0),
  ], 0.035, COLORS.coral, 'holographic-digestive-path');
  classroom.add(digestiveHologram);

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.045, 20, 96),
    new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: COLORS.cyan,
      emissiveIntensity: 1.15,
      transparent: true,
      opacity: 0.86,
    }),
  );
  portal.name = 'glowing-shrink-portal-to-mouth';
  portal.position.set(0, 1.2, -1.18);
  classroom.add(portal);

  const teacher = new THREE.Group();
  teacher.name = 'teacher-ai-avatar';
  const teacherBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.74, 8, 18), organMaterial(0x2563eb));
  teacherBody.position.y = 0.72;
  teacher.add(teacherBody);
  const teacherHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), organMaterial(0xf8c9a5));
  teacherHead.position.y = 1.28;
  teacher.add(teacherHead);
  const pointerArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.62, 6, 12), organMaterial(COLORS.cyan));
  pointerArm.name = 'teacher-pointing-arm';
  pointerArm.rotation.z = -1.05;
  pointerArm.position.set(0.34, 0.98, 0);
  teacher.add(pointerArm);
  teacher.position.set(-2.35, 0.08, -1.2);
  classroom.add(teacher);

  const windowGroup = new THREE.Group();
  windowGroup.name = 'holographic-window-soft-ambient-lighting';
  for (let index = 0; index < 3; index += 1) {
    const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.62), glassMaterial);
    windowPane.position.set(-4.25, 2.05, -1.45 + index * 0.82);
    windowPane.rotation.y = Math.PI / 2;
    windowGroup.add(windowPane);
    const sunRay = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 8), organMaterial(0xfacc15, 0.42));
    sunRay.name = `sunlight-beam-${index + 1}`;
    sunRay.rotation.z = Math.PI / 2;
    sunRay.position.set(-3.92, 1.84, -1.45 + index * 0.82);
    windowGroup.add(sunRay);
  }
  classroom.add(windowGroup);

  const ceilingLights = new THREE.Group();
  ceilingLights.name = 'animated-lighting-projector-spatial-speakers';
  for (let index = 0; index < 4; index += 1) {
    const lightPanel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 36), organMaterial(0xe0f2fe, 0.75));
    lightPanel.position.set(-2.1 + index * 1.4, 3.15, 0.2);
    lightPanel.rotation.x = Math.PI / 2;
    ceilingLights.add(lightPanel);
  }
  const projector = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 14), organMaterial(0x334155));
  projector.name = 'classroom-projector';
  projector.position.set(0, 2.86, 0.45);
  ceilingLights.add(projector);
  const speakerLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.22, 8, 16), organMaterial(0x0f172a));
  speakerLeft.name = 'left-speaker';
  speakerLeft.position.set(-2.15, 2.38, -2.2);
  ceilingLights.add(speakerLeft);
  const speakerRight = speakerLeft.clone();
  speakerRight.name = 'right-speaker';
  speakerRight.position.x = 2.15;
  ceilingLights.add(speakerRight);
  const wallClock = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 32), organMaterial(0xf8fafc));
  wallClock.name = 'wall-clock';
  wallClock.rotation.x = Math.PI / 2;
  wallClock.position.set(3.35, 2.34, -2.26);
  ceilingLights.add(wallClock);
  classroom.add(ceilingLights);

  const floatingPanel = makeLabel('Floating UI: Digestive Journey', '#38bdf8', 620);
  floatingPanel.name = 'floating-ui-panel-digestive-journey';
  floatingPanel.position.set(-1.65, 1.8, -0.85);
  floatingPanel.scale.setScalar(0.62);
  classroom.add(floatingPanel);

  const labTable = new THREE.Group();
  labTable.name = 'science-lab-equipment-holographic-table';
  const tableRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 12, 72), organMaterial(0x475569));
  tableRing.name = 'holographic-lab-table-ring';
  tableRing.rotation.x = Math.PI / 2;
  tableRing.position.y = 0.54;
  labTable.add(tableRing);
  for (let index = 0; index < 4; index += 1) {
    const vial = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 8, 18), organMaterial([COLORS.cyan, COLORS.green, COLORS.amber, COLORS.purple][index]));
    vial.name = `floating-lab-vial-${index + 1}`;
    vial.position.set(-0.42 + index * 0.28, 0.76 + Math.sin(index) * 0.04, 0);
    labTable.add(vial);
  }
  labTable.position.set(2.55, 0, -0.95);
  classroom.add(labTable);

  addParticleField(classroom, 'spatial-science-room-ambience-particles', 90, COLORS.cyan, 2.4);

  const ambientMarker = makeLabel('Spatial ambience: quiet lab, holograms, portal energy', '#bae6fd', 760);
  ambientMarker.name = 'spatial-science-room-ambience-no-student-npcs';
  ambientMarker.position.set(-2.8, 2.62, -2.22);
  ambientMarker.scale.setScalar(0.5);
  classroom.add(ambientMarker);

  return { classroom, teacher, portal, humanHologram, digestiveHologram };
}

function addImmersiveStageEnvironment(
  group: THREE.Group,
  stageId: DigestiveStageId,
  color: number,
  name: string,
) {
  const chamber = new THREE.Mesh(
    new THREE.SphereGeometry(3.65, 64, 36),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.14,
      roughness: 0.48,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    }),
  );
  chamber.name = name;
  chamber.position.set(0, 1.25, 0);
  group.add(chamber);
  const membraneLight = new THREE.PointLight(color, 1.25, 5.4);
  membraneLight.name = `${stageId}-soft-organ-bloom-light`;
  membraneLight.position.set(0, 1.55, 0.6);
  group.add(membraneLight);
  for (let index = 0; index < 5; index += 1) {
    const fold = new THREE.Mesh(
      new THREE.TorusGeometry(1.15 + index * 0.26, 0.018, 8, 96),
      organMaterial(color, 0.42),
    );
    fold.name = `${stageId}-procedural-pbr-organ-fold-${index + 1}`;
    fold.rotation.x = Math.PI / 2 + index * 0.08;
    fold.rotation.z = index * 0.5;
    fold.position.set(Math.sin(index) * 0.14, 1.1 + index * 0.22, -0.24 + index * 0.05);
    group.add(fold);
  }
  addParticleField(group, `${stageId}-floating-particles-instanced`, 180, color, 3.1);
  return chamber;
}

function addMouthEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'mouth', 0xfb7185, 'inside-mouth-gum-walls-warm-lighting');
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 18), organMaterial(0xfffbeb));
    tooth.name = `surrounding-realistic-tooth-${index + 1}`;
    tooth.position.set(Math.cos(angle) * 1.12, 1.58 + Math.sin(index * 0.7) * 0.1, Math.sin(angle) * 0.72);
    tooth.rotation.z = Math.PI;
    group.add(tooth);
  }
  const salivaFlow = addTube(group, [
    new THREE.Vector3(-0.82, 1.82, 0.35),
    new THREE.Vector3(-0.28, 1.52, 0.42),
    new THREE.Vector3(0.4, 1.28, 0.34),
    new THREE.Vector3(0.9, 1.08, 0.25),
  ], 0.025, COLORS.water, 'flowing-saliva-streams');
  (salivaFlow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
  const fallingFood = new THREE.Mesh(new THREE.SphereGeometry(0.13, 22, 16), organMaterial(0xf97316));
  fallingFood.name = 'food-falls-from-above';
  fallingFood.position.set(-0.45, 2.42, 0.2);
  group.add(fallingFood);
}

function addEsophagusEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'esophagus', 0xf472b6, 'living-esophagus-tunnel-peristalsis-walls');
  for (let index = 0; index < 8; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.025, 10, 72), organMaterial(COLORS.purple, 0.58));
    ring.name = `peristalsis-wall-contraction-ring-${index + 1}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 2.45 - index * 0.28, -0.25 + index * 0.04);
    group.add(ring);
  }
}

function addStomachEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'stomach', 0xbe123c, 'huge-living-stomach-chamber-contracting-walls');
  for (let index = 0; index < 18; index += 1) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (index % 3) * 0.012, 12, 10), organMaterial(COLORS.amber, 0.6));
    bubble.name = `acid-particle-steam-bubble-${index + 1}`;
    bubble.position.set(Math.sin(index * 1.7) * 1.15, 0.65 + (index % 9) * 0.17, Math.cos(index * 1.3) * 0.55);
    group.add(bubble);
  }
}

function addHelperOrganEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'supporting-organs', 0x7c2d12, 'realistic-helper-organ-digestive-chamber');
  const bileFlow = addTube(group, [
    new THREE.Vector3(-0.48, 1.38, 0.42),
    new THREE.Vector3(-0.12, 1.12, 0.48),
    new THREE.Vector3(0.36, 0.96, 0.35),
  ], 0.026, COLORS.gallbladder, 'animated-bile-flow-stream');
  (bileFlow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
  const enzymeFlow = addTube(group, [
    new THREE.Vector3(0.32, 0.96, 0.15),
    new THREE.Vector3(0.55, 0.88, 0.35),
    new THREE.Vector3(0.75, 0.76, 0.22),
  ], 0.023, COLORS.pancreas, 'pancreas-enzyme-release-stream');
  (enzymeFlow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
}

function addSmallIntestineEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'small-intestine', 0xf9a8d4, 'largest-scene-giant-intestinal-folds');
  for (let index = 0; index < 24; index += 1) {
    const villus = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.38 + (index % 4) * 0.04, 8, 14), organMaterial(0xfbcfe8, 0.72));
    villus.name = `large-surrounding-villus-${index + 1}`;
    const angle = (index / 24) * Math.PI * 2;
    villus.position.set(Math.cos(angle) * (1.05 + (index % 3) * 0.18), 0.85 + (index % 5) * 0.26, Math.sin(angle) * 0.72);
    villus.rotation.z = Math.sin(angle) * 0.5;
    group.add(villus);
  }
}

function addLargeIntestineEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'large-intestine', 0xbd5a67, 'cool-large-intestine-water-absorption-environment');
  for (let index = 0; index < 12; index += 1) {
    const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), organMaterial(COLORS.water, 0.72));
    droplet.name = `glowing-blue-water-particle-${index + 1}`;
    droplet.scale.set(0.75, 1.25, 0.75);
    droplet.position.set(Math.sin(index) * 1.22, 0.75 + (index % 6) * 0.25, Math.cos(index * 1.4) * 0.48);
    group.add(droplet);
  }
}

function addHolographicQuizEnvironment(group: THREE.Group) {
  addImmersiveStageEnvironment(group, 'recap', COLORS.cyan, 'floating-holographic-quiz-card-arena');
  for (let index = 0; index < 5; index += 1) {
    const card = makeLabel(`Quiz Card ${index + 1}`, '#67e8f9', 360);
    card.name = `floating-holographic-quiz-card-${index + 1}`;
    card.position.set(-1.4 + index * 0.7, 2.22 + Math.sin(index) * 0.08, -0.15);
    card.scale.setScalar(0.46);
    group.add(card);
  }
}

function buildDigestiveStageGroups(
  scene: THREE.Scene,
  interactiveTargets: THREE.Object3D[],
) {
  const groups = new Map<DigestiveStageId, THREE.Group>();
  for (const stage of DIGESTIVE_STAGES) {
    const group = new THREE.Group();
    group.name = `digestive-stage-${stage.id}`;
    group.visible = stage.id === 'welcome';
    scene.add(group);
    groups.set(stage.id, group);
  }

  const welcome = groups.get('welcome')!;
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.86, 1.5, 12, 28),
    new THREE.MeshPhysicalMaterial({
      color: 0x8bd5ff,
      transparent: true,
      opacity: 0.16,
      roughness: 0.25,
      transmission: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  torso.position.set(0, 1.42, 0);
  torso.scale.set(1, 1.12, 0.55);
  welcome.add(torso);
  const pathway = addTube(welcome, [
    new THREE.Vector3(0, 2.25, 0),
    new THREE.Vector3(0, 1.65, 0),
    new THREE.Vector3(0.22, 1.25, 0),
    new THREE.Vector3(0, 0.86, 0),
    new THREE.Vector3(0, 0.38, 0),
  ], 0.07, COLORS.coral, 'complete-digestive-pathway');
  (pathway.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
  const guideOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 28, 20),
    new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: COLORS.cyan,
      emissiveIntensity: 1.4,
    }),
  );
  guideOrb.name = 'animated-guide-orb';
  guideOrb.position.set(1.25, 2.25, 0.1);
  welcome.add(guideOrb);
  addActionTarget(
    welcome,
    interactiveTargets,
    'start-journey',
    'Start Journey',
    [0, 0.18, 0.7],
    COLORS.green,
  );

  const mouth = groups.get('mouth')!;
  addMouthEnvironment(mouth);
  const mouthCavity = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 36, 24),
    organMaterial(0x9f1239, 0.86),
  );
  mouthCavity.name = 'mouth';
  mouthCavity.scale.set(1.25, 0.75, 0.55);
  mouthCavity.position.set(0, 1.45, 0);
  mouth.add(mouthCavity);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.18, 0.13),
        organMaterial(0xfffbeb),
      );
      tooth.position.set(-0.46 + i * 0.13, 1.62 - row * 0.38, 0.38);
      tooth.rotation.z = (i - 3.5) * 0.035;
      mouth.add(tooth);
    }
  }
  const tongue = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 28, 18),
    organMaterial(0xfb7185),
  );
  tongue.name = 'tongue-and-saliva';
  tongue.scale.set(1, 0.28, 0.58);
  tongue.position.set(0, 1.24, 0.3);
  mouth.add(tongue);
  addActionTarget(mouth, interactiveTargets, 'place-food', 'Place Food', [-1.15, 1.44, 0.4], 0xf97316);

  const esophagus = groups.get('esophagus')!;
  addEsophagusEnvironment(esophagus);
  const foodPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 2.3, 28, 1, true),
    organMaterial(0xfda4af, 0.35),
  );
  foodPipe.name = 'esophagus-food-pipe';
  foodPipe.position.set(0, 1.35, 0);
  esophagus.add(foodPipe);
  const bolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 20, 16),
    organMaterial(0xf59e0b),
  );
  bolus.name = 'bolus';
  bolus.position.set(0, 2.14, 0);
  esophagus.add(bolus);
  [1.92, 1.36, 0.8].forEach((y, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.055, 12, 32),
      organMaterial(COLORS.purple),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    esophagus.add(ring);
    addActionTarget(
      esophagus,
      interactiveTargets,
      `peristalsis-wave-${index + 1}`,
      `Wave ${index + 1}`,
      [0.66, y, 0],
      COLORS.purple,
    );
  });

  const stomach = groups.get('stomach')!;
  addStomachEnvironment(stomach);
  const stomachOrgan = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 40, 30),
    organMaterial(0xfb7185, 0.82),
  );
  stomachOrgan.name = 'stomach';
  stomachOrgan.scale.set(0.84, 1.18, 0.62);
  stomachOrgan.rotation.z = -0.36;
  stomachOrgan.position.set(0.12, 1.35, 0);
  stomach.add(stomachOrgan);
  const chyme = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 28, 20),
    organMaterial(0xf59e0b, 0.72),
  );
  chyme.name = 'chyme-and-digestive-juices';
  chyme.scale.set(0.85, 0.55, 0.45);
  chyme.position.set(0.1, 1.12, 0.32);
  stomach.add(chyme);
  [0, 1, 2].forEach(index => {
    addActionTarget(
      stomach,
      interactiveTargets,
      `mixer-turn-${index + 1}`,
      `Mix ${index + 1}`,
      [-1.05 + index * 1.05, 0.35, 0.48],
      COLORS.amber,
    );
  });

  const helpers = groups.get('supporting-organs')!;
  addHelperOrganEnvironment(helpers);
  const liver = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 36, 24),
    organMaterial(COLORS.liver),
  );
  liver.name = 'liver-produces-bile';
  liver.scale.set(1.35, 0.55, 0.65);
  liver.position.set(-0.38, 1.72, 0);
  helpers.add(liver);
  const gallbladder = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 24, 18),
    organMaterial(COLORS.gallbladder),
  );
  gallbladder.name = 'gallbladder-stores-bile';
  gallbladder.scale.set(0.62, 1, 0.58);
  gallbladder.position.set(-0.08, 1.35, 0.42);
  helpers.add(gallbladder);
  const pancreas = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.85, 8, 20),
    organMaterial(COLORS.pancreas),
  );
  pancreas.name = 'pancreas-digestive-juices';
  pancreas.rotation.z = Math.PI / 2;
  pancreas.position.set(0.25, 0.98, 0.15);
  helpers.add(pancreas);
  addActionTarget(helpers, interactiveTargets, 'inspect-liver', 'Liver', [-1.25, 2.18, 0.2], COLORS.liver);
  addActionTarget(helpers, interactiveTargets, 'inspect-gallbladder', 'Gallbladder', [0, 2.18, 0.2], COLORS.gallbladder);
  addActionTarget(helpers, interactiveTargets, 'inspect-pancreas', 'Pancreas', [1.25, 2.18, 0.2], COLORS.pancreas);

  const small = groups.get('small-intestine')!;
  addSmallIntestineEnvironment(small);
  const smallPath: THREE.Vector3[] = [];
  for (let i = 0; i < 30; i++) {
    smallPath.push(new THREE.Vector3(
      Math.sin(i * 0.75) * 0.72,
      2.05 - i * 0.05,
      Math.cos(i * 0.75) * 0.13,
    ));
  }
  addTube(small, smallPath, 0.095, COLORS.intestine, 'small-intestine-villi');
  const bloodVessel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 2.25, 22),
    organMaterial(COLORS.blood, 0.75),
  );
  bloodVessel.name = 'blood-vessel';
  bloodVessel.position.set(1.25, 1.3, 0);
  small.add(bloodVessel);
  [0x4ade80, 0xfbbf24, 0xa78bfa].forEach((color, index) => {
    addActionTarget(
      small,
      interactiveTargets,
      `absorb-nutrient-${index + 1}`,
      ['Protein', 'Sugar', 'Vitamins'][index],
      [-0.68 + index * 0.68, 0.42, 0.4],
      color,
    );
  });

  const large = groups.get('large-intestine')!;
  addLargeIntestineEnvironment(large);
  addTube(large, [
    new THREE.Vector3(-0.78, 0.65, 0),
    new THREE.Vector3(-0.78, 1.95, 0),
    new THREE.Vector3(0.78, 1.95, 0),
    new THREE.Vector3(0.78, 0.65, 0),
    new THREE.Vector3(0.2, 0.48, 0),
  ], 0.16, 0xd97786, 'large-intestine-water-absorption');
  [0, 1, 2].forEach(index => {
    addActionTarget(
      large,
      interactiveTargets,
      `absorb-water-${index + 1}`,
      `Water ${index + 1}`,
      [-0.62 + index * 0.62, 1.28, 0.45],
      COLORS.water,
    );
  });
  const waste = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.34, 8, 18),
    organMaterial(0x92400e),
  );
  waste.name = 'forming-solid-waste';
  waste.position.set(0.2, 0.45, 0);
  large.add(waste);

  const finalStage = groups.get('rectum-anus')!;
  addImmersiveStageEnvironment(finalStage, 'rectum-anus', 0xb45361, 'minimal-rectum-smooth-transition-environment');
  const rectum = addTube(finalStage, [
    new THREE.Vector3(0, 1.75, 0),
    new THREE.Vector3(0.05, 1.15, 0),
    new THREE.Vector3(0, 0.58, 0),
  ], 0.17, 0xb45361, 'rectum-anus');
  (rectum.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.32;
  const downArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.45, 18),
    organMaterial(COLORS.amber),
  );
  downArrow.name = 'waste-removal-arrow';
  downArrow.rotation.x = Math.PI;
  downArrow.position.set(0, 0.25, 0);
  finalStage.add(downArrow);
  const finalLabel = makeLabel('Rectum stores · Anus removes', '#fbbf24', 640);
  finalLabel.position.set(0, 2.25, 0);
  finalStage.add(finalLabel);

  const healthy = groups.get('healthy-habits')!;
  addImmersiveStageEnvironment(healthy, 'healthy-habits', 0x0f766e, 'clean-futuristic-science-room-sorting-return');
  const habitActions = [
    ['sort-apple-healthy', 'Apple', 0xf97316],
    ['sort-pizza-unhealthy', 'Pizza', 0xf43f5e],
    ['sort-milk-healthy', 'Milk', 0xe0f2fe],
    ['sort-chips-unhealthy', 'Chips', COLORS.amber],
    ['sort-banana-healthy', 'Banana', 0xfacc15],
    ['sort-burger-unhealthy', 'Burger', 0x92400e],
    ['sort-water-healthy', 'Water', COLORS.water],
    ['sort-soft-drink-unhealthy', 'Soft Drink', COLORS.purple],
  ] as const;
  habitActions.forEach(([actionId, label, color], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    addActionTarget(
      healthy,
      interactiveTargets,
      actionId,
      label,
      [-1.55 + column * 1.02, 1.72 - row * 0.9, 0.25],
      color,
    );
  });
  const healthyBasket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.44, 0.42, 28, 1, true),
    organMaterial(0x166534, 0.7),
  );
  healthyBasket.name = 'healthy-food-basket';
  healthyBasket.position.set(-0.72, 0.25, 0);
  healthy.add(healthyBasket);
  const healthyLabel = makeLabel('Healthy Basket', '#4ade80', 420);
  healthyLabel.position.set(-0.72, 0.76, 0.03);
  healthyLabel.scale.setScalar(0.48);
  healthy.add(healthyLabel);
  const limitBasket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.44, 0.42, 28, 1, true),
    organMaterial(0x92400e, 0.68),
  );
  limitBasket.name = 'limit-often-food-basket';
  limitBasket.position.set(0.72, 0.25, 0);
  healthy.add(limitBasket);
  const limitLabel = makeLabel('Limit Often', '#fbbf24', 420);
  limitLabel.position.set(0.72, 0.76, 0.03);
  limitLabel.scale.setScalar(0.48);
  healthy.add(limitLabel);

  const recap = groups.get('recap')!;
  addHolographicQuizEnvironment(recap);
  DIGESTIVE_PATHWAY.forEach((organ, index) => {
    const x = -2.1 + index * 0.7;
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 18, 14),
      organMaterial(index === 0 ? COLORS.cyan : COLORS.coral),
    );
    node.position.set(x, 1.32 + Math.sin(index * 0.8) * 0.2, 0);
    recap.add(node);
    const label = makeLabel(organ, '#f8fafc', 280);
    label.scale.setScalar(0.45);
    label.position.set(x, 1.8 + Math.sin(index * 0.8) * 0.2, 0);
    recap.add(label);
    if (index < DIGESTIVE_PATHWAY.length - 1) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          node.position,
          new THREE.Vector3(x + 0.7, 1.32 + Math.sin((index + 1) * 0.8) * 0.2, 0),
        ]),
        new THREE.LineBasicMaterial({ color: COLORS.amber }),
      );
      recap.add(line);
    }
  });
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.1, 6),
    organMaterial(COLORS.amber),
  );
  badge.name = 'Digestive Explorer completion badge';
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0, 0.42, 0);
  recap.add(badge);

  return { groups, guideOrb, stomachOrgan, bolus, chyme, bloodVessel };
}

function setTargetComplete(target: THREE.Object3D) {
  const mesh = target as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (!material?.color) return;
  material.color.setHex(COLORS.green);
  material.emissive?.setHex(COLORS.green);
  material.emissiveIntensity = 0.72;
  target.scale.setScalar(0.78);
}

export default function DigestiveSystemViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageGroupsRef = useRef<Map<DigestiveStageId, THREE.Group>>(new Map());
  const interactiveTargetsRef = useRef<THREE.Object3D[]>([]);
  const stageIndexRef = useRef(0);
  const progressRef = useRef<DigestiveProgress>(createDigestiveProgress());
  const performActionRef = useRef<(actionId: string) => void>(() => undefined);
  const goToStageRef = useRef<(stageIndex: number) => void>(() => undefined);
  const focusStageRef = useRef<(stageId: DigestiveStageId, animate?: boolean) => void>(() => undefined);
  const scienceRoomObjectsRef = useRef<THREE.Object3D[]>([]);
  const productionMixersRef = useRef<THREE.AnimationMixer[]>([]);
  const comfortModeRef = useRef(true);
  const animatedRefs = useRef<{
    guideOrb?: THREE.Mesh;
    stomachOrgan?: THREE.Mesh;
    bolus?: THREE.Mesh;
    chyme?: THREE.Mesh;
    bloodVessel?: THREE.Mesh;
    classroom?: THREE.Group;
    teacher?: THREE.Group;
    portal?: THREE.Mesh;
    humanHologram?: THREE.Mesh;
    digestiveHologram?: THREE.Group;
  }>({});

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState<DigestiveProgress>(() => createDigestiveProgress());
  const [feedback, setFeedback] = useState('Choose Start Journey when you are ready.');
  const [comfortMode, setComfortMode] = useState(true);
  const [muted, setMuted] = useState(false);
  const [transitionCue, setTransitionCue] = useState('');

  const stage = DIGESTIVE_STAGES[stageIndex];
  const completedActionIds = progress.completedActions[stage.id] ?? [];
  const stageComplete = isStageComplete(progress, stage.id);
  const quizScore = getQuizScore(progress);
  const badgeEarned = hasDigestiveExplorerBadge(progress);
  const quizFinished = DIGESTIVE_QUIZ_QUESTIONS.every(
    question => Boolean(progress.quizAnswers[question.id]),
  );
  const introFeatureChips = [
    DIGESTIVE_VR_FEATURES[1],
    DIGESTIVE_VR_FEATURES[2],
    DIGESTIVE_CLASSROOM_FEATURES[2],
    DIGESTIVE_IMMERSION_REQUIREMENTS[0],
    DIGESTIVE_PERFORMANCE_TARGETS[0],
    DIGESTIVE_EDUCATIONAL_OBJECTIVES[3],
  ];
  const sortingActionCount = DIGESTIVE_HEALTHY_SORT_ACTIONS.length;

  const speak = useCallback((text: string, cueIndex = stageIndexRef.current) => {
    if (muted) return;
    void playSimulationNarration(text, cueIndex);
  }, [muted]);

  const performAction = useCallback((actionId: string) => {
    const currentStage = DIGESTIVE_STAGES[stageIndexRef.current];
    if (!currentStage.requiredActionIds.includes(actionId)) return;

    setProgress(current => {
      const next = recordStageAction(current, currentStage.id, actionId);
      progressRef.current = next;
      return next;
    });

    const target = interactiveTargetsRef.current.find(
      item => item.userData.actionId === actionId,
    );
    if (target) setTargetComplete(target);

    const nextFeedback = ACTION_FEEDBACK[actionId] ?? 'Great observation!';
    setFeedback(nextFeedback);
    speak(nextFeedback);
  }, [speak]);
  performActionRef.current = performAction;

  const goToStage = useCallback((requestedIndex: number) => {
    const currentIndex = stageIndexRef.current;
    const nextIndex = Math.min(Math.max(requestedIndex, 0), DIGESTIVE_STAGES.length - 1);
    if (nextIndex > currentIndex && !isStageComplete(progressRef.current, DIGESTIVE_STAGES[currentIndex].id)) {
      setFeedback(`Complete this task first: ${DIGESTIVE_STAGES[currentIndex].instruction}`);
      return;
    }

    stageIndexRef.current = nextIndex;
    setStageIndex(nextIndex);
    const nextStage = DIGESTIVE_STAGES[nextIndex];
    focusStageRef.current(nextStage.id, true);
    setFeedback(nextStage.instruction);
    setTransitionCue(nextStage.cinematicTransition);
    speak(nextStage.teacherNarration, nextIndex);
  }, [speak]);
  goToStageRef.current = goToStage;

  const chooseQuizAnswer = useCallback((questionId: string, answerId: string) => {
    setProgress(current => {
      const next = answerQuizQuestion(current, questionId, answerId);
      progressRef.current = next;
      return next;
    });
    const question = DIGESTIVE_QUIZ_QUESTIONS.find(item => item.id === questionId)!;
    const correct = question.correctAnswerId === answerId;
    const message = `${correct ? 'Correct! ' : 'Good try. '}${question.explanation}`;
    setFeedback(message);
    speak(message, 20 + DIGESTIVE_QUIZ_QUESTIONS.findIndex(item => item.id === questionId));
  }, [speak]);

  const restart = useCallback(() => {
    const fresh = createDigestiveProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    stageIndexRef.current = 0;
    setStageIndex(0);
    setTransitionCue('');
    setFeedback('Choose Start Journey when you are ready.');
    interactiveTargetsRef.current.forEach(target => {
      const mesh = target as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (material?.color && typeof target.userData.baseColor === 'number') {
        material.color.setHex(target.userData.baseColor);
        material.emissive?.setHex(target.userData.baseColor);
        material.emissiveIntensity = 0.55;
      }
      target.scale.setScalar(1);
    });
    stopSimulationNarration();
  }, []);

  useEffect(() => {
    comfortModeRef.current = comfortMode;
  }, [comfortMode]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    if (!transitionCue) return undefined;
    const timeout = window.setTimeout(() => setTransitionCue(''), 5800);
    return () => window.clearTimeout(timeout);
  }, [transitionCue]);

  useEffect(() => {
    const isInsideBody = BODY_TRAVEL_STAGE_IDS.includes(stage.id);
    for (const [id, group] of stageGroupsRef.current) {
      group.visible = id === stage.id;
    }
    for (const object of scienceRoomObjectsRef.current) {
      object.visible = !isInsideBody;
    }
    focusStageRef.current(stage.id, true);
  }, [stage.id]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const presentationPipeline = createPresentationPipeline(renderer, 'browserEnhanced');
    presentationPipeline.resize(
      mount.clientWidth,
      mount.clientHeight,
      Math.min(window.devicePixelRatio, 1.5),
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071426);
    scene.fog = new THREE.Fog(0x071426, 7.5, 18);

    const camera = new THREE.PerspectiveCamera(
      62,
      mount.clientWidth / mount.clientHeight,
      0.05,
      50,
    );

    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    const focusStage = (stageId: DigestiveStageId, animate = true) => {
      const frame = STAGE_CAMERA_FRAMES[stageId];
      guidedCamera.focusOn(
        {
          position: new THREE.Vector3(...frame.position),
          target: new THREE.Vector3(...frame.target),
        },
        { animate },
      );
    };
    focusStageRef.current = focusStage;
    focusStage('welcome', false);

    scene.add(new THREE.HemisphereLight(0xc7eeff, 0x132036, 1.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const accent = new THREE.PointLight(COLORS.cyan, 1.8, 8);
    accent.position.set(-3, 2.8, 1.5);
    scene.add(accent);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({
        color: 0x10233a,
        roughness: 0.9,
        metalness: 0.05,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const labRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.9, 0.035, 10, 96),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.3 }),
    );
    labRing.rotation.x = Math.PI / 2;
    labRing.position.y = 0.015;
    scene.add(labRing);

    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(3.25, 1.27),
      new THREE.MeshBasicMaterial({
        map: makeTextTexture(
          'Digestive System Journey',
          'Explore the hidden path from food to fuel.',
        ),
        transparent: true,
      }),
    );
    title.position.set(0, 3.2, -1.35);
    scene.add(title);

    const interactiveTargets: THREE.Object3D[] = [];
    interactiveTargetsRef.current = interactiveTargets;
    const classroomBuilt = addClassroomEnvironment(scene);
    scienceRoomObjectsRef.current = [
      floor,
      labRing,
      title,
      classroomBuilt.classroom,
    ];
    const built = buildDigestiveStageGroups(scene, interactiveTargets);
    stageGroupsRef.current = built.groups;
    animatedRefs.current = { ...built, ...classroomBuilt };
    const productionMixers: THREE.AnimationMixer[] = [];
    productionMixersRef.current = productionMixers;
    loadProductionDigestiveAssets(built.groups, productionMixers, slot => {
      const group = built.groups.get(slot.stageId);
      if (!group) return;
      group.userData.hasProductionAsset = true;
      for (const child of group.children) {
        if (child.userData.productionAssetSlot) continue;
        if (child.name.startsWith('digestive-action-')) continue;
        child.visible = false;
      }
    });

    const vrNavigation = new THREE.Group();
    vrNavigation.name = 'digestive-vr-navigation';
    const previousTarget = addActionTarget(
      vrNavigation,
      interactiveTargets,
      'digestive-nav-previous',
      'Previous',
      [-1.15, 0.28, 1.05],
      COLORS.purple,
    );
    previousTarget.userData.navigationDelta = -1;
    const nextTarget = addActionTarget(
      vrNavigation,
      interactiveTargets,
      'digestive-nav-next',
      'Next',
      [1.15, 0.28, 1.05],
      COLORS.green,
    );
    nextTarget.userData.navigationDelta = 1;
    scene.add(vrNavigation);

    const makeControllerRay = () => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -3.4),
      ]),
      new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.76 }),
    );

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    controller0.add(makeControllerRay());
    controller1.add(makeControllerRay());
    scene.add(controller0, controller1);

    // ── Selection: one shared raycasting/highlight system for mouse + XR.
    // Lets desktop learners click organs directly, not just the HTML
    // action buttons, matching Circuit and Pollination ──────────────────
    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [controller0, controller1],
      onSelect: (id, object) => {
        const navigationDelta = object.userData.navigationDelta as number | undefined;
        if (typeof navigationDelta === 'number') {
          goToStageRef.current(stageIndexRef.current + navigationDelta);
          return;
        }
        const actionId = object.userData.actionId as string | undefined;
        if (actionId) performActionRef.current(actionId);
        interactionSystem.setSelected(id);
        guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 3 }));
      },
    });
    for (const target of interactiveTargets) {
      const isNavigationTarget = typeof target.userData.navigationDelta === 'number';
      interactionSystem.register(
        target.name,
        target,
        isNavigationTarget ? {} : { highlightColor: '#ffe08a' },
      );
    }

    const clock = new THREE.Clock();
    let elapsed = 0;
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      elapsed += delta;
      const time = elapsed;
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      const intensity = comfortModeRef.current ? 0.35 : 1;
      for (const mixer of productionMixersRef.current) mixer.update(delta * intensity);
      const {
        guideOrb,
        stomachOrgan,
        bolus,
        chyme,
        bloodVessel,
        teacher,
        portal,
        humanHologram,
        digestiveHologram,
      } = animatedRefs.current;
      if (guideOrb) {
        guideOrb.position.y = 2.25 + Math.sin(time * 1.6) * 0.08 * intensity;
        guideOrb.rotation.y = time * 0.45;
      }
      if (stomachOrgan) {
        stomachOrgan.scale.x = 0.84 + Math.sin(time * 2.2) * 0.035 * intensity;
        stomachOrgan.scale.y = 1.18 - Math.sin(time * 2.2) * 0.045 * intensity;
      }
      if (bolus) bolus.position.y = 1.5 + Math.sin(time * 0.8) * 0.62 * intensity;
      if (chyme) chyme.rotation.y = time * 1.2 * intensity;
      if (bloodVessel) {
        const material = bloodVessel.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.18 + (Math.sin(time * 2) + 1) * 0.14 * intensity;
      }
      if (teacher) {
        teacher.rotation.y = Math.sin(time * 0.65) * 0.08 * intensity;
        teacher.position.y = 0.08 + Math.sin(time * 1.25) * 0.025 * intensity;
      }
      if (portal) {
        portal.rotation.z = time * 0.48;
        const material = portal.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.9 + (Math.sin(time * 2.4) + 1) * 0.4 * intensity;
      }
      if (humanHologram) humanHologram.rotation.y = time * 0.24 * intensity;
      if (digestiveHologram) {
        digestiveHologram.rotation.y = Math.sin(time * 0.5) * 0.18 * intensity;
        digestiveHologram.scale.setScalar(1 + (Math.sin(time * 0.9) + 1) * 0.04 * intensity);
      }
      const activeStageGroup = stageGroupsRef.current.get(DIGESTIVE_STAGES[stageIndexRef.current].id);
      activeStageGroup?.traverse(object => {
        if (object instanceof THREE.Points) {
          object.rotation.y = time * 0.025 * intensity;
          object.rotation.x = Math.sin(time * 0.18) * 0.04 * intensity;
          return;
        }
        if (!(object instanceof THREE.Mesh)) return;
        if (object.name.includes('peristalsis-wall-contraction-ring')) {
          const pulse = 1 + Math.sin(time * 3.2 + object.position.y * 2.2) * 0.11 * intensity;
          object.scale.set(pulse, pulse, pulse);
        } else if (object.name.includes('procedural-pbr-organ-fold')) {
          object.rotation.z += delta * 0.08 * intensity;
        } else if (object.name.includes('acid-particle-steam-bubble')) {
          object.position.y += delta * (0.08 + object.scale.y * 0.02) * intensity;
          if (object.position.y > 2.35) object.position.y = 0.55;
        } else if (object.name.includes('large-surrounding-villus')) {
          object.rotation.z = Math.sin(time * 1.4 + object.position.x) * 0.24 * intensity;
        } else if (object.name.includes('floating-holographic-quiz-card')) {
          object.userData.initialY ??= object.position.y;
          object.position.y = object.userData.initialY + Math.sin(time * 1.5 + object.position.x) * 0.05 * intensity;
          object.rotation.y = Math.sin(time * 0.9 + object.position.x) * 0.1 * intensity;
        } else if (object.name.includes('surrounding-realistic-tooth')) {
          object.userData.initialY ??= object.position.y;
          object.position.y = object.userData.initialY + Math.sin(time * 1.2) * 0.035 * intensity;
        } else if (object.name.includes('food-falls-from-above')) {
          object.position.y = 1.05 + ((Math.sin(time * 0.85) + 1) * 0.7);
        }
      });
      interactiveTargets.forEach((target, index) => {
        if (target.visible && target.parent?.visible) {
          target.rotation.y = time * 0.35 + index * 0.2;
        }
      });
      presentationPipeline.render(scene, camera);
    });

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      presentationPipeline.resize(
        mount.clientWidth,
        mount.clientHeight,
        Math.min(window.devicePixelRatio, 1.5),
      );
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      scienceRoomObjectsRef.current = [];
      focusStageRef.current = () => undefined;
      productionMixersRef.current = [];
      interactionSystem.dispose();
      guidedCamera.dispose();
      presentationPipeline.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.filter(Boolean).forEach(material => {
          const standard = material as THREE.MeshStandardMaterial;
          standard.map?.dispose();
          standard.dispose();
        });
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      stopSimulationNarration();
    };
  }, []);

  const startBrowserLesson = useCallback(() => {
    setStarted(true);
    focusStageRef.current(DIGESTIVE_STAGES[0].id, true);
    setFeedback(DIGESTIVE_STAGES[0].instruction);
    setTransitionCue(DIGESTIVE_STAGES[0].cinematicTransition);
    speak(DIGESTIVE_STAGES[0].teacherNarration, 0);
  }, [speak]);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    setStarted(true);
    focusStageRef.current(DIGESTIVE_STAGES[0].id, true);
    setTransitionCue(DIGESTIVE_STAGES[0].cinematicTransition);
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
    } catch {
      setFeedback('VR could not start, so the complete browser lesson remains available.');
    }
    speak(DIGESTIVE_STAGES[0].teacherNarration, 0);
  }, [speak]);

  const stageProgressLabel = useMemo(() => {
    if (stage.requiredActionIds.length === 0) return 'Ready';
    return `${completedActionIds.length}/${stage.requiredActionIds.length} actions`;
  }, [completedActionIds.length, stage.requiredActionIds.length]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: '#071426',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {started && transitionCue && (
        <div
          className="digestive-cinematic-transition"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9,
            pointerEvents: 'none',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: 'radial-gradient(circle at 50% 45%, rgba(56,189,248,.18), rgba(2,6,23,.72) 68%)',
            color: '#e0f2fe',
            textAlign: 'center',
            animation: 'digestive-cinematic-fade 5.8s ease forwards',
          }}
        >
          <div style={{
            maxWidth: 620,
            padding: '18px 22px',
            borderRadius: 18,
            border: '1px solid rgba(103,232,249,.28)',
            background: 'rgba(3,13,27,.66)',
            boxShadow: '0 0 70px rgba(34,211,238,.25)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ color: '#67e8f9', fontSize: 12, fontWeight: 900, letterSpacing: '.14em' }}>
              CINEMATIC TRANSITION
            </div>
            <p style={{ margin: '8px 0 0', lineHeight: 1.55, fontWeight: 800 }}>
              {transitionCue}
            </p>
          </div>
        </div>
      )}

      {!started && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'radial-gradient(circle at 50% 34%, rgba(17,94,119,.92), #06111f 68%)',
        }}>
          <section style={{ width: 'min(680px, 100%)', textAlign: 'center', color: '#f8fafc' }}>
            <div style={{ color: '#67e8f9', fontWeight: 900, letterSpacing: '.15em', fontSize: 13 }}>
              CLASS 5 · 10 MINUTES · META QUEST 3S
            </div>
            <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(2.3rem, 7vw, 4.5rem)', lineHeight: 0.98 }}>
              Journey Through Digestion
            </h1>
            <p style={{ margin: '0 auto 26px', maxWidth: 580, color: '#cbd5e1', fontSize: 18, lineHeight: 1.65 }}>
              Follow food from the first bite to nutrient absorption. Meet every organ,
              operate the hidden processes, and earn your Digestive Explorer badge.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              flexWrap: 'wrap',
              margin: '0 auto 24px',
              maxWidth: 620,
            }}>
              {introFeatureChips.map(item => (
                <span
                  key={item}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(103,232,249,.28)',
                    background: 'rgba(8,47,73,.44)',
                    color: '#cffafe',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={startBrowserLesson}
                style={{
                  padding: '14px 22px',
                  borderRadius: 12,
                  border: '1px solid #67e8f9',
                  background: 'linear-gradient(135deg,#0891b2,#2563eb)',
                  color: 'white',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Open Lesson
              </button>
              {vrSupported && (
                <button
                  type="button"
                  onClick={enterVR}
                  style={{
                    padding: '14px 22px',
                    borderRadius: 12,
                    border: '1px solid rgba(103,232,249,.55)',
                    background: 'rgba(8,145,178,.16)',
                    color: '#cffafe',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  Enter VR
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {started && (
        <>
          <header className="digestive-hud-header" style={{
            position: 'absolute',
            top: 14,
            left: 14,
            right: 14,
            zIndex: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            pointerEvents: 'none',
          }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: 13,
              background: 'rgba(3,13,27,.88)',
              border: '1px solid rgba(103,232,249,.25)',
              color: '#f8fafc',
              backdropFilter: 'blur(12px)',
            }}>
              <strong>Stage {stageIndex + 1} / {DIGESTIVE_STAGES.length}</strong>
              <span style={{ color: '#67e8f9', marginLeft: 10 }}>{stage.title}</span>
            </div>
            <div className="digestive-utility-controls" style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={() => {
                  setMuted(value => {
                    if (!value) stopSimulationNarration();
                    return !value;
                  });
                }}
                style={utilityButtonStyle}
              >
                {muted ? 'Narration off' : 'Narration on'}
              </button>
              <button
                type="button"
                onClick={() => setComfortMode(value => !value)}
                style={utilityButtonStyle}
              >
                Comfort mode {comfortMode ? 'on' : 'off'}
              </button>
              <button
                type="button"
                aria-label="Restart lesson"
                onClick={restart}
                style={utilityButtonStyle}
              >
                Restart
              </button>
            </div>
          </header>

          <aside className="digestive-stage-panel" style={{
            position: 'absolute',
            zIndex: 8,
            right: 16,
            top: 78,
            bottom: 16,
            width: 'min(370px, calc(100vw - 32px))',
            overflowY: 'auto',
            padding: 18,
            borderRadius: 18,
            border: '1px solid rgba(56,189,248,.24)',
            background: 'linear-gradient(160deg,rgba(3,13,27,.94),rgba(8,47,73,.9))',
            color: '#f8fafc',
            boxShadow: '0 24px 70px rgba(0,0,0,.34)',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{ color: '#67e8f9', fontSize: 12, fontWeight: 900, letterSpacing: '.13em' }}>
              {stageProgressLabel.toUpperCase()}
            </div>
            <h2 style={{ margin: '7px 0 8px', fontSize: 24 }}>{stage.title}</h2>
            <p style={{ color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 10px' }}>{stage.subtitle}</p>
            <p style={{
              margin: '0 0 16px',
              padding: '11px 12px',
              borderRadius: 11,
              background: 'rgba(56,189,248,.1)',
              color: '#e0f2fe',
              lineHeight: 1.45,
              fontSize: 14,
            }}>
              {stage.instruction}
            </p>
            <div style={{
              display: 'grid',
              gap: 8,
              margin: '0 0 16px',
              padding: '11px 12px',
              borderRadius: 11,
              background: 'rgba(15,23,42,.55)',
              border: '1px solid rgba(148,163,184,.16)',
              color: '#dbeafe',
              fontSize: 13,
              lineHeight: 1.45,
            }}>
              <div><strong style={{ color: '#67e8f9' }}>Teacher AI:</strong> {stage.teacherNarration}</div>
              <div><strong style={{ color: '#67e8f9' }}>Interaction:</strong> {stage.interactionPrompt}</div>
              <div><strong style={{ color: '#67e8f9' }}>Cinematic:</strong> {stage.cinematicTransition}</div>
              <div><strong style={{ color: '#67e8f9' }}>Scene:</strong> {stage.visualTreatment}</div>
              <div><strong style={{ color: '#67e8f9' }}>Spatial audio:</strong> {stage.spatialAudioProfile}</div>
              <div><strong style={{ color: '#67e8f9' }}>Cues:</strong> {stage.soundCues.join(', ')}</div>
              {stage.id === 'healthy-habits' && (
                <div><strong style={{ color: '#67e8f9' }}>Sorting:</strong> {sortingActionCount} food cards</div>
              )}
            </div>

            {stage.id !== 'recap' ? (
              <ActionButtons
                actionIds={stage.requiredActionIds}
                completedActionIds={completedActionIds}
                performAction={performAction}
              />
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {DIGESTIVE_QUIZ_QUESTIONS.map((question, index) => {
                  const selected = progress.quizAnswers[question.id];
                  return (
                    <fieldset
                      key={question.id}
                      style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 12,
                        border: '1px solid rgba(148,163,184,.22)',
                      }}
                    >
                      <legend style={{ padding: '0 5px', fontWeight: 900 }}>
                        {index + 1}. {question.prompt}
                      </legend>
                      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                        {question.options.map(option => {
                          const isSelected = selected === option.id;
                          const isCorrect = isSelected && option.id === question.correctAnswerId;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => chooseQuizAnswer(question.id, option.id)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: isSelected
                                  ? `1px solid ${isCorrect ? '#4ade80' : '#fbbf24'}`
                                  : '1px solid rgba(148,163,184,.2)',
                                background: isSelected
                                  ? isCorrect ? 'rgba(22,101,52,.42)' : 'rgba(146,64,14,.42)'
                                  : 'rgba(15,23,42,.65)',
                                color: '#f8fafc',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
                {quizFinished && (
                  <div style={{
                    padding: 16,
                    borderRadius: 14,
                    textAlign: 'center',
                    border: '1px solid rgba(251,191,36,.55)',
                    background: 'linear-gradient(135deg,rgba(120,53,15,.55),rgba(22,101,52,.45))',
                  }}>
                    <div style={{ fontSize: 34 }} aria-hidden="true">⬡</div>
                    <strong style={{ display: 'block', color: '#fde68a', fontSize: 19 }}>
                      Digestive Explorer
                    </strong>
                    <span style={{ color: '#d1fae5' }}>
                      Score: {quizScore.correct}/{quizScore.total}
                      {badgeEarned ? ' · Badge earned!' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div
              aria-live="polite"
              style={{
                minHeight: 58,
                marginTop: 16,
                padding: 11,
                borderRadius: 10,
                background: 'rgba(15,23,42,.72)',
                color: '#bae6fd',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {feedback}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                aria-label="Previous stage"
                disabled={stageIndex === 0}
                onClick={() => goToStage(stageIndex - 1)}
                style={navigationButtonStyle(stageIndex === 0)}
              >
                ← Previous
              </button>
              <button
                type="button"
                aria-label="Next stage"
                disabled={stageIndex === DIGESTIVE_STAGES.length - 1 || !stageComplete}
                onClick={() => goToStage(stageIndex + 1)}
                style={navigationButtonStyle(
                  stageIndex === DIGESTIVE_STAGES.length - 1 || !stageComplete,
                )}
              >
                Next →
              </button>
            </div>
          </aside>

          <nav
            className="digestive-stage-nav"
            aria-label="Lesson stages"
            style={{
              position: 'absolute',
              zIndex: 7,
              left: 16,
              bottom: 16,
              width: 'min(720px, calc(100vw - 430px))',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              padding: 8,
              borderRadius: 13,
              background: 'rgba(3,13,27,.82)',
              border: '1px solid rgba(148,163,184,.16)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {DIGESTIVE_STAGES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Stage ${index + 1}: ${item.title}`}
                onClick={() => index <= stageIndex && goToStage(index)}
                disabled={index > stageIndex}
                style={{
                  flex: '0 0 34px',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: index === stageIndex ? '1px solid #67e8f9' : '1px solid transparent',
                  background: index === stageIndex ? 'rgba(8,145,178,.45)' : 'rgba(30,41,59,.7)',
                  color: index <= stageIndex ? '#e0f2fe' : '#475569',
                  fontWeight: 900,
                  cursor: index <= stageIndex ? 'pointer' : 'default',
                }}
              >
                {index + 1}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

const utilityButtonStyle = {
  padding: '9px 11px',
  borderRadius: 10,
  border: '1px solid rgba(103,232,249,.26)',
  background: 'rgba(3,13,27,.86)',
  color: '#cffafe',
  fontWeight: 800,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
} as const;

function navigationButtonStyle(disabled: boolean) {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: disabled ? '1px solid rgba(71,85,105,.3)' : '1px solid rgba(56,189,248,.45)',
    background: disabled ? 'rgba(30,41,59,.4)' : 'rgba(3,105,161,.45)',
    color: disabled ? '#64748b' : '#e0f2fe',
    fontWeight: 900,
    cursor: disabled ? 'default' : 'pointer',
  } as const;
}
