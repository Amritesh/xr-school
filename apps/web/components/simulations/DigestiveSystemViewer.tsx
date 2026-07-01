'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DIGESTIVE_PATHWAY,
  DIGESTIVE_QUIZ_QUESTIONS,
  DIGESTIVE_STAGES,
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
  'healthy-fruit': 'Fruit',
  'healthy-vegetables': 'Vegetables',
  'healthy-water': 'Drink Water',
  'healthy-wash-hands': 'Wash Hands',
  'healthy-chew-well': 'Chew Well',
  'healthy-exercise': 'Exercise',
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
  'healthy-fruit': 'Fruit provides fibre and useful nutrients.',
  'healthy-vegetables': 'Vegetables help make meals varied and fibre-rich.',
  'healthy-water': 'Water helps food and waste move through the body.',
  'healthy-wash-hands': 'Clean hands help keep harmful germs away from food.',
  'healthy-chew-well': 'Chewing well gives digestion a good start.',
  'healthy-exercise': 'Movement supports a strong, active body.',
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
  const habitActions = [
    ['healthy-fruit', 'Fruit', 0xf97316],
    ['healthy-vegetables', 'Vegetables', 0x22c55e],
    ['healthy-water', 'Water', COLORS.water],
    ['healthy-wash-hands', 'Wash Hands', COLORS.cyan],
    ['healthy-chew-well', 'Chew Well', COLORS.amber],
    ['healthy-exercise', 'Exercise', COLORS.purple],
  ] as const;
  habitActions.forEach(([actionId, label, color], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    addActionTarget(
      healthy,
      interactiveTargets,
      actionId,
      label,
      [-1.05 + column * 1.05, 1.75 - row * 0.95, 0.25],
      color,
    );
  });
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.58, 0.52, 28, 1, true),
    organMaterial(0x166534, 0.7),
  );
  basket.name = 'healthy-food-basket';
  basket.position.set(0, 0.25, 0);
  healthy.add(basket);

  const recap = groups.get('recap')!;
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
  const comfortModeRef = useRef(true);
  const animatedRefs = useRef<{
    guideOrb?: THREE.Mesh;
    stomachOrgan?: THREE.Mesh;
    bolus?: THREE.Mesh;
    chyme?: THREE.Mesh;
    bloodVessel?: THREE.Mesh;
  }>({});

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState<DigestiveProgress>(() => createDigestiveProgress());
  const [feedback, setFeedback] = useState('Choose Start Journey when you are ready.');
  const [comfortMode, setComfortMode] = useState(true);
  const [muted, setMuted] = useState(false);

  const stage = DIGESTIVE_STAGES[stageIndex];
  const completedActionIds = progress.completedActions[stage.id] ?? [];
  const stageComplete = isStageComplete(progress, stage.id);
  const quizScore = getQuizScore(progress);
  const badgeEarned = hasDigestiveExplorerBadge(progress);
  const quizFinished = DIGESTIVE_QUIZ_QUESTIONS.every(
    question => Boolean(progress.quizAnswers[question.id]),
  );

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
    setFeedback(nextStage.instruction);
    speak(`${nextStage.title}. ${nextStage.subtitle} ${nextStage.instruction}`, nextIndex);
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
    for (const [id, group] of stageGroupsRef.current) {
      group.visible = id === stage.id;
    }
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071426);
    scene.fog = new THREE.Fog(0x071426, 7.5, 18);

    const camera = new THREE.PerspectiveCamera(
      62,
      mount.clientWidth / mount.clientHeight,
      0.05,
      50,
    );
    camera.position.set(0, 1.7, 5.2);
    camera.lookAt(0, 1.25, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.25, 0);
    controls.enableDamping = true;
    controls.minDistance = 3.8;
    controls.maxDistance = 6.8;
    controls.maxPolarAngle = Math.PI * 0.62;

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
    const built = buildDigestiveStageGroups(scene, interactiveTargets);
    stageGroupsRef.current = built.groups;
    animatedRefs.current = built;

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

    const raycaster = new THREE.Raycaster();
    const controllerMatrix = new THREE.Matrix4();
    const onControllerSelect = (event: any) => {
      const controller = event.target as THREE.Object3D;
      controllerMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllerMatrix);
      const hits = raycaster.intersectObjects(interactiveTargets, false)
        .filter(hit => hit.object.visible && hit.object.parent?.visible);
      const hit = hits[0]?.object;
      const navigationDelta = hit?.userData.navigationDelta as number | undefined;
      if (typeof navigationDelta === 'number') {
        goToStageRef.current(stageIndexRef.current + navigationDelta);
        return;
      }
      const actionId = hit?.userData.actionId as string | undefined;
      if (actionId) performActionRef.current(actionId);
    };

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
    controller0.addEventListener('select', onControllerSelect);
    controller1.addEventListener('select', onControllerSelect);
    scene.add(controller0, controller1);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const time = clock.getElapsedTime();
      const intensity = comfortModeRef.current ? 0.35 : 1;
      const { guideOrb, stomachOrgan, bolus, chyme, bloodVessel } = animatedRefs.current;
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
      interactiveTargets.forEach((target, index) => {
        if (target.visible && target.parent?.visible) {
          target.rotation.y = time * 0.35 + index * 0.2;
        }
      });
      controls.update();
      renderer.render(scene, camera);
    });

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      controller0.removeEventListener('select', onControllerSelect);
      controller1.removeEventListener('select', onControllerSelect);
      controls.dispose();
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
    setFeedback(DIGESTIVE_STAGES[0].instruction);
    speak(
      `${DIGESTIVE_STAGES[0].title}. ${DIGESTIVE_STAGES[0].subtitle} ${DIGESTIVE_STAGES[0].instruction}`,
      0,
    );
  }, [speak]);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    setStarted(true);
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
    } catch {
      setFeedback('VR could not start, so the complete browser lesson remains available.');
    }
    speak(
      `${DIGESTIVE_STAGES[0].title}. ${DIGESTIVE_STAGES[0].subtitle} ${DIGESTIVE_STAGES[0].instruction}`,
      0,
    );
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
