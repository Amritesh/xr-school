'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  MONEY_IDENTIFICATION_ROUNDS,
  MONEY_MEMORY_QUESTIONS,
  MONEY_SHOP_ITEMS,
  MONEY_TOWN_MONEY,
  MONEY_TOWN_STAGES,
  MONEY_TOWN_VR_REQUIREMENTS,
  answerMoneyIdentificationRound,
  answerMoneyMemoryQuestion,
  createMoneyTownProgress,
  getMoneyDefinition,
  getMoneyMemoryScore,
  isMoneyTownStageComplete,
  recordMoneyTownAction,
  type MoneyId,
  type MoneyKind,
  type MoneyTownProgress,
  type MoneyTownStageId,
} from '@/lib/moneyTownLesson';
import {
  playSimulationNarration,
  stopSimulationNarration,
} from '@/lib/simulationAudio';

const STAGE_FRAMES: Record<MoneyTownStageId, {
  position: [number, number, number];
  target: [number, number, number];
}> = {
  intro: { position: [0, 1.45, 5.3], target: [0, 1.25, 0] },
  'learn-coins': { position: [0, 1.35, 4.2], target: [0, 1.15, -0.25] },
  'learn-notes': { position: [0, 1.4, 4.55], target: [0, 1.35, -0.6] },
  'coins-vs-notes': { position: [0, 1.4, 4.8], target: [0, 1.3, -0.4] },
  'identify-money': { position: [0, 1.35, 4.4], target: [0, 1.2, -0.15] },
  'shopping-challenge': { position: [0, 1.45, 5.4], target: [0, 1.1, -0.6] },
  'memory-check': { position: [0, 1.38, 4.6], target: [0, 1.2, -0.35] },
  celebration: { position: [0, 1.58, 5.6], target: [0, 1.35, -0.5] },
};

const moneyColorByKind: Record<MoneyKind, number> = {
  coin: 0xfbbf24,
  note: 0x86efac,
};

function makeTextTexture(
  title: string,
  subtitle = '',
  accent = '#fbbf24',
  width = 640,
  height = 240,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(69,26,3,.96)');
  gradient.addColorStop(1, 'rgba(21,94,117,.92)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = accent;
  ctx.font = '900 28px sans-serif';
  ctx.fillText('CLASS 1 - INTRODUCTION TO MONEY', 28, 48);
  ctx.fillStyle = '#fff7ed';
  ctx.font = title.length > 18 ? '900 44px sans-serif' : '900 60px sans-serif';
  ctx.fillText(title, 28, 124);
  ctx.fillStyle = '#fde68a';
  ctx.font = '27px sans-serif';
  ctx.fillText(subtitle, 28, 181);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function material(color: number, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.16,
    roughness: 0.38,
    metalness: color === 0xfbbf24 ? 0.25 : 0.02,
    transparent: opacity < 1,
    opacity,
  });
}

function makeLabel(text: string, subtitle = '', accent = '#fbbf24') {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.58),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(text, subtitle, accent, 520, 180),
      transparent: true,
      depthTest: false,
    }),
  );
}

function addActionTarget(
  group: THREE.Group,
  targets: THREE.Object3D[],
  actionId: string,
  label: string,
  color: number,
  position: [number, number, number],
  shape: 'sphere' | 'box' = 'sphere',
) {
  const geometry = shape === 'box'
    ? new THREE.BoxGeometry(0.58, 0.34, 0.06)
    : new THREE.SphereGeometry(0.2, 28, 18);
  const target = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.75,
      roughness: 0.24,
    }),
  );
  target.name = `money-action-${actionId}`;
  target.position.set(...position);
  target.userData.actionId = actionId;
  target.userData.baseColor = color;

  const labelMesh = makeLabel(label, '', `#${color.toString(16).padStart(6, '0')}`);
  labelMesh.position.set(0, 0.38, 0);
  labelMesh.scale.setScalar(0.42);
  target.add(labelMesh);

  group.add(target);
  targets.push(target);
  return target;
}

function addMoneyModel(
  group: THREE.Group,
  targets: THREE.Object3D[],
  moneyId: MoneyId,
  actionId: string,
  position: [number, number, number],
) {
  const definition = getMoneyDefinition(moneyId);
  const color = moneyColorByKind[definition.kind];
  const money = new THREE.Group();
  money.name = `large-3d-indian-${definition.id}`;
  money.position.set(...position);

  const visual = definition.kind === 'coin'
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.055, 48), material(color))
    : new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.035), material(color));
  visual.name = `${definition.label}-${definition.shape}-${definition.material}`;
  visual.rotation.x = definition.kind === 'coin' ? Math.PI / 2 : 0;
  money.add(visual);

  const value = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.26),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(definition.label, definition.material, definition.kind === 'coin' ? '#fef3c7' : '#bbf7d0', 420, 160),
      transparent: true,
      depthTest: false,
    }),
  );
  value.position.set(0, 0.04, 0.05);
  value.scale.setScalar(definition.kind === 'coin' ? 0.72 : 0.9);
  money.add(value);

  const target = addActionTarget(
    money,
    targets,
    actionId,
    definition.label,
    color,
    [0, -0.55, 0.04],
    definition.kind === 'coin' ? 'sphere' : 'box',
  );
  target.scale.setScalar(0.85);
  group.add(money);
  return money;
}

function addParticleRing(group: THREE.Group, name: string, color: number, count = 140) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 1.15 + (index % 8) * 0.16;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.85 + (index % 13) * 0.12;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color,
      size: 0.045,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  particles.name = name;
  group.add(particles);
}

function addMoneyTownEnvironment(scene: THREE.Scene) {
  const town = new THREE.Group();
  town.name = 'class-1-magic-money-town-no-students';
  scene.add(town);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 96), material(0x0f766e, 0.94));
  floor.name = 'rainbow-pathways-market-floor';
  floor.rotation.x = -Math.PI / 2;
  town.add(floor);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(4.3, 4.3, 2.8, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0f766e,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: 0.24,
      roughness: 0.55,
      side: THREE.BackSide,
    }),
  );
  wall.name = 'colorful-money-adventure-park-classroom-transform';
  wall.position.y = 1.35;
  town.add(wall);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.24),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('Magic Money Town', 'Coins, notes, shops, memory', '#fbbf24', 760, 320),
      transparent: true,
    }),
  );
  board.name = 'large-digital-smartboard-money-values-quizzes-rewards';
  board.position.set(0, 1.82, -3.08);
  town.add(board);

  const piggy = new THREE.Group();
  piggy.name = 'giant-smiling-piggy-bank';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 36, 24), material(0xf9a8d4));
  body.scale.set(1.25, 0.85, 0.82);
  piggy.add(body);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 18), material(0xfb7185));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.02, 0.39);
  piggy.add(nose);
  piggy.position.set(1.75, 0.55, -1.35);
  town.add(piggy);

  const fountain = new THREE.Group();
  fountain.name = 'coin-fountain-floating-golden-coins';
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.24, 48), material(0x0891b2));
  bowl.position.y = 0.18;
  fountain.add(bowl);
  for (let index = 0; index < 12; index += 1) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24), material(0xfbbf24));
    coin.rotation.x = Math.PI / 2;
    const angle = (index / 12) * Math.PI * 2;
    coin.position.set(Math.cos(angle) * 0.55, 0.65 + (index % 3) * 0.14, Math.sin(angle) * 0.55);
    fountain.add(coin);
  }
  fountain.position.set(-1.65, 0, -1.15);
  town.add(fountain);

  const teacher = new THREE.Group();
  teacher.name = 'friendly-animated-teacher-guide-smiles-waves-no-students';
  const teacherBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.74, 8, 18), material(0x14b8a6));
  teacherBody.position.y = 0.72;
  teacher.add(teacherBody);
  const teacherHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 22, 16), material(0xf8c9a5));
  teacherHead.position.y = 1.25;
  teacher.add(teacherHead);
  const teacherHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.58, 6, 12), material(0xfacc15));
  teacherHand.name = 'teacher-slow-encouraging-gesture';
  teacherHand.rotation.z = -1;
  teacherHand.position.set(0.32, 0.98, 0);
  teacher.add(teacherHand);
  teacher.position.set(-2.05, 0.04, -1.95);
  town.add(teacher);

  ['Toy Market', 'Fruit Stall', 'Candy Shop', 'Balloon Shop', 'Mini Bank'].forEach((shop, index) => {
    const shopGroup = new THREE.Group();
    shopGroup.name = `${shop.toLowerCase().replace(/\s+/g, '-')}-child-friendly-shop`;
    const stall = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.72, 0.45), material([0x38bdf8, 0x22c55e, 0xf97316, 0xa855f7, 0x0ea5e9][index]));
    stall.position.y = 0.36;
    shopGroup.add(stall);
    const sign = makeLabel(shop, 'Price board', '#fde68a');
    sign.position.set(0, 0.94, 0.02);
    sign.scale.setScalar(0.5);
    shopGroup.add(sign);
    shopGroup.position.set(-2 + index, 0, -2.55 + (index % 2) * 0.2);
    town.add(shopGroup);
  });

  addParticleRing(town, 'animated-birds-happy-background-music-and-magical-sparkles', 0xfde047, 180);
  return { town, teacher, piggy };
}

function buildMoneyTownStages(scene: THREE.Scene, targets: THREE.Object3D[]) {
  const groups = new Map<MoneyTownStageId, THREE.Group>();
  for (const stage of MONEY_TOWN_STAGES) {
    const group = new THREE.Group();
    group.name = `money-town-stage-${stage.id}`;
    group.visible = stage.id === 'intro';
    scene.add(group);
    groups.set(stage.id, group);
  }

  const intro = groups.get('intro')!;
  addActionTarget(intro, targets, 'enter-money-town', 'Enter', 0xfbbf24, [0, 0.78, 0.92]);
  addParticleRing(intro, 'welcome-fireworks-coins-spin-notes-float-piggy-bank-smiles', 0xfbbf24, 160);

  const coinStage = groups.get('learn-coins')!;
  MONEY_TOWN_MONEY.filter(money => money.kind === 'coin').forEach((money, index) => {
    addMoneyModel(coinStage, targets, money.id, `grab-${money.id}`, [-1.35 + index * 0.9, 1.24, -0.45]);
  });
  addParticleRing(coinStage, 'coin-sparkle-glow-outline-star-reward', 0xfbbf24, 150);

  const noteStage = groups.get('learn-notes')!;
  MONEY_TOWN_MONEY.filter(money => money.kind === 'note').forEach((money, index) => {
    addMoneyModel(noteStage, targets, money.id, `touch-${money.id}`, [-1.85 + index * 0.74, 1.38 + (index % 2) * 0.22, -0.5]);
  });
  addParticleRing(noteStage, 'paper-note-flutter-rainbow-card-trail', 0x86efac, 150);

  const compareStage = groups.get('coins-vs-notes')!;
  const coinBoard = makeLabel('COIN', 'Round - Metal - Small', '#fbbf24');
  coinBoard.name = 'coin-side-round-metal-small';
  coinBoard.position.set(-0.9, 1.62, -0.45);
  compareStage.add(coinBoard);
  const noteBoard = makeLabel('NOTE', 'Paper - Rectangle - Foldable', '#86efac');
  noteBoard.name = 'note-side-paper-rectangular-foldable';
  noteBoard.position.set(0.9, 1.62, -0.45);
  compareStage.add(noteBoard);
  addActionTarget(compareStage, targets, 'select-coin-side', 'Coin', 0xfbbf24, [-0.9, 0.92, 0.65]);
  addActionTarget(compareStage, targets, 'select-note-side', 'Note', 0x86efac, [0.9, 0.92, 0.65], 'box');

  const identifyStage = groups.get('identify-money')!;
  MONEY_IDENTIFICATION_ROUNDS.forEach((round, roundIndex) => {
    const roundRoot = new THREE.Group();
    roundRoot.name = `identification-round-${round.id}`;
    roundRoot.position.y = roundIndex * 0.02;
    round.optionIds.forEach((moneyId, optionIndex) => {
      const angle = -1.05 + optionIndex * 0.7;
      addMoneyModel(
        roundRoot,
        targets,
        moneyId,
        `identify-option-${round.id}-${moneyId}`,
        [Math.sin(angle) * 1.4, 1.05 + (optionIndex % 2) * 0.25, Math.cos(angle) * 0.28],
      );
    });
    identifyStage.add(roundRoot);
  });
  addParticleRing(identifyStage, 'identification-correct-stars-wrong-gentle-pop', 0xfef3c7, 130);

  const shopStage = groups.get('shopping-challenge')!;
  MONEY_SHOP_ITEMS.forEach((item, index) => {
    const shop = new THREE.Group();
    shop.name = `${item.shop.toLowerCase().replace(/\s+/g, '-')}-${item.name.toLowerCase()}-costs-rs-${item.price}`;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 0.5), material([0x22c55e, 0xa855f7, 0xf97316][index]));
    counter.position.y = 0.28;
    shop.add(counter);
    const sign = makeLabel(`${item.name}: Rs ${item.price}`, item.shop, '#fde68a');
    sign.position.set(0, 0.82, 0);
    sign.scale.setScalar(0.52);
    shop.add(sign);
    addActionTarget(shop, targets, `buy-${item.id}`, `Pay Rs ${item.price}`, 0xfbbf24, [0, 1.22, 0.2]);
    shop.position.set(-1.25 + index * 1.25, 0, -0.35);
    shopStage.add(shop);
  });
  addParticleRing(shopStage, 'cash-box-receipt-shopkeeper-smiles-fireworks', 0xfbbf24, 150);

  const memoryStage = groups.get('memory-check')!;
  const memoryBoard = makeLabel('Memory Check', 'Coins and Currency', '#67e8f9');
  memoryBoard.name = 'mini-bank-counter-memory-check-board';
  memoryBoard.position.set(0, 1.88, -0.55);
  memoryStage.add(memoryBoard);
  ['A', 'B', 'C', 'D'].forEach((label, index) => {
    addActionTarget(memoryStage, targets, `memory-option-${index}`, label, [0xfbbf24, 0x86efac, 0x38bdf8, 0xf472b6][index], [-1.2 + index * 0.8, 0.92, 0.72], 'box');
  });
  addActionTarget(memoryStage, targets, 'complete-money-memory-check', 'Finish', 0x22c55e, [0, 0.45, 0.95]);

  const celebration = groups.get('celebration')!;
  for (let index = 0; index < 18; index += 1) {
    const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), material([0xfbbf24, 0x86efac, 0x38bdf8, 0xf472b6][index % 4]));
    star.name = `money-explorer-celebration-star-${index + 1}`;
    star.position.set(-2.1 + index * 0.25, 1 + Math.sin(index) * 0.45, -0.2 + Math.cos(index) * 0.26);
    celebration.add(star);
  }
  addParticleRing(celebration, 'golden-coin-rain-confetti-rainbow-teacher-goodbye', 0xfbbf24, 240);

  return groups;
}

function markTargetComplete(target: THREE.Object3D) {
  const mesh = target as THREE.Mesh;
  const meshMaterial = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (meshMaterial?.emissiveIntensity !== undefined) {
    meshMaterial.emissiveIntensity = 1.35;
  }
  target.scale.setScalar(1.16);
}

export default function MoneyTownViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageGroupsRef = useRef<Map<MoneyTownStageId, THREE.Group>>(new Map());
  const interactiveTargetsRef = useRef<THREE.Object3D[]>([]);
  const stageIndexRef = useRef(0);
  const progressRef = useRef<MoneyTownProgress>(createMoneyTownProgress());
  const performActionRef = useRef<(actionId: string) => void>(() => undefined);
  const goToStageRef = useRef<(index: number) => void>(() => undefined);
  const focusStageRef = useRef<(stageId: MoneyTownStageId, animate?: boolean) => void>(() => undefined);
  const comfortModeRef = useRef(true);
  const animatedRefs = useRef<{ teacher?: THREE.Group; piggy?: THREE.Group }>({});

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState<MoneyTownProgress>(() => createMoneyTownProgress());
  const [feedback, setFeedback] = useState('Touch Enter when you are ready.');
  const [muted, setMuted] = useState(false);
  const [comfortMode, setComfortMode] = useState(true);
  const [identificationIndex, setIdentificationIndex] = useState(0);
  const [memoryQuestionIndex, setMemoryQuestionIndex] = useState(0);

  const stage = MONEY_TOWN_STAGES[stageIndex];
  const completedActionIds = progress.completedActions[stage.id] ?? [];
  const stageComplete = isMoneyTownStageComplete(progress, stage.id);
  const identificationRound = MONEY_IDENTIFICATION_ROUNDS[identificationIndex];
  const memoryQuestion = MONEY_MEMORY_QUESTIONS[memoryQuestionIndex];
  const memoryScore = getMoneyMemoryScore(progress);

  const speak = useCallback((text: string, cueIndex = stageIndexRef.current) => {
    if (muted) return;
    void playSimulationNarration(text, cueIndex);
  }, [muted]);

  const completeAction = useCallback((actionId: string, message = 'Wonderful! Stars and sparkles for you.') => {
    const currentStage = MONEY_TOWN_STAGES[stageIndexRef.current];
    setProgress(current => {
      const next = recordMoneyTownAction(current, currentStage.id, actionId);
      progressRef.current = next;
      return next;
    });
    const target = interactiveTargetsRef.current.find(item => item.userData.actionId === actionId);
    if (target) markTargetComplete(target);
    setFeedback(message);
    speak(message);
  }, [speak]);

  const performAction = useCallback((actionId: string) => {
    const currentStage = MONEY_TOWN_STAGES[stageIndexRef.current];

    if (currentStage.requiredActionIds.includes(actionId)) {
      completeAction(actionId);
      return;
    }

    const identificationPrefix = `identify-option-${identificationRound.id}-`;
    if (currentStage.id === 'identify-money' && actionId.startsWith(identificationPrefix)) {
      const moneyId = actionId.replace(identificationPrefix, '') as MoneyId;
      const selected = getMoneyDefinition(moneyId);
      const correct = moneyId === identificationRound.correctMoneyId;
      setProgress(current => {
        const next = answerMoneyIdentificationRound(current, identificationRound.id, moneyId);
        progressRef.current = next;
        return next;
      });
      const target = interactiveTargetsRef.current.find(item => item.userData.actionId === actionId);
      if (target && correct) markTargetComplete(target);
      const message = correct
        ? `Excellent! ${selected.label} is correct.`
        : `That is okay. Look for ${getMoneyDefinition(identificationRound.correctMoneyId).label}.`;
      setFeedback(message);
      speak(message, 20 + identificationIndex);
      if (correct) setIdentificationIndex(index => Math.min(index + 1, MONEY_IDENTIFICATION_ROUNDS.length - 1));
      return;
    }

    const memoryPrefix = 'memory-option-';
    if (currentStage.id === 'memory-check' && actionId.startsWith(memoryPrefix)) {
      const optionIndex = Number(actionId.replace(memoryPrefix, ''));
      const answer = memoryQuestion.options[optionIndex];
      const correct = answer === memoryQuestion.correctAnswer;
      setProgress(current => {
        const next = answerMoneyMemoryQuestion(current, memoryQuestion.id, answer);
        progressRef.current = next;
        return next;
      });
      const message = correct
        ? `Correct! ${answer}.`
        : `That is okay. The correct answer is ${memoryQuestion.correctAnswer}.`;
      setFeedback(message);
      speak(message, 40 + memoryQuestionIndex);
      setMemoryQuestionIndex(index => Math.min(index + 1, MONEY_MEMORY_QUESTIONS.length - 1));
    }
  }, [completeAction, identificationIndex, identificationRound, memoryQuestion, memoryQuestionIndex, speak]);
  performActionRef.current = performAction;

  const goToStage = useCallback((requestedIndex: number) => {
    const currentIndex = stageIndexRef.current;
    const nextIndex = Math.min(Math.max(requestedIndex, 0), MONEY_TOWN_STAGES.length - 1);
    if (nextIndex > currentIndex && !isMoneyTownStageComplete(progressRef.current, MONEY_TOWN_STAGES[currentIndex].id)) {
      setFeedback(MONEY_TOWN_STAGES[currentIndex].interactionPrompt);
      return;
    }
    stageIndexRef.current = nextIndex;
    setStageIndex(nextIndex);
    const nextStage = MONEY_TOWN_STAGES[nextIndex];
    focusStageRef.current(nextStage.id, true);
    setFeedback(nextStage.interactionPrompt);
    speak(nextStage.teacherNarration, nextIndex);
  }, [speak]);
  goToStageRef.current = goToStage;

  const restart = useCallback(() => {
    const fresh = createMoneyTownProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    setStageIndex(0);
    stageIndexRef.current = 0;
    setIdentificationIndex(0);
    setMemoryQuestionIndex(0);
    setFeedback('Touch Enter when you are ready.');
    stopSimulationNarration();
    interactiveTargetsRef.current.forEach(target => {
      target.scale.setScalar(1);
      const mesh = target as THREE.Mesh;
      const meshMaterial = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (meshMaterial && typeof target.userData.baseColor === 'number') {
        meshMaterial.emissiveIntensity = 0.75;
      }
    });
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
    renderer.toneMappingExposure = 1.12;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 7, 15);

    const camera = new THREE.PerspectiveCamera(62, mount.clientWidth / mount.clientHeight, 0.05, 40);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    const focusStage = (stageId: MoneyTownStageId, animate = true) => {
      const frame = STAGE_FRAMES[stageId];
      guidedCamera.focusOn(
        {
          position: new THREE.Vector3(...frame.position),
          target: new THREE.Vector3(...frame.target),
        },
        { animate },
      );
    };
    focusStageRef.current = focusStage;
    focusStage('intro', false);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x064e3b, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 5, 4);
    scene.add(key);
    const sparkleLight = new THREE.PointLight(0xfbbf24, 2.2, 8);
    sparkleLight.position.set(0, 2.4, 0.4);
    scene.add(sparkleLight);

    const environment = addMoneyTownEnvironment(scene);
    animatedRefs.current = { teacher: environment.teacher, piggy: environment.piggy };
    const interactiveTargets: THREE.Object3D[] = [];
    interactiveTargetsRef.current = interactiveTargets;
    stageGroupsRef.current = buildMoneyTownStages(scene, interactiveTargets);

    const nav = new THREE.Group();
    nav.name = 'money-town-vr-controller-navigation';
    const back = addActionTarget(nav, interactiveTargets, 'money-nav-back', 'Back', 0x0ea5e9, [-1, 0.42, 1.1]);
    back.userData.navigationDelta = -1;
    const next = addActionTarget(nav, interactiveTargets, 'money-nav-next', 'Next', 0x22c55e, [1, 0.42, 1.1]);
    next.userData.navigationDelta = 1;
    scene.add(nav);

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    const makeRay = () => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]),
      new THREE.LineBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.82 }),
    );
    controller0.add(makeRay());
    controller1.add(makeRay());
    scene.add(controller0, controller1);

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
      },
    });
    for (const target of interactiveTargets) {
      interactionSystem.register(target.name, target, { highlightColor: '#fff7ad' });
    }

    const clock = new THREE.Clock();
    let elapsed = 0;
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      elapsed += delta;
      const intensity = comfortModeRef.current ? 0.42 : 1;
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      sparkleLight.intensity = 1.85 + Math.sin(elapsed * 1.3) * 0.28 * intensity;
      const { teacher, piggy } = animatedRefs.current;
      if (teacher) {
        teacher.rotation.y = Math.sin(elapsed * 0.9) * 0.08 * intensity;
        teacher.position.y = 0.04 + Math.sin(elapsed * 1.6) * 0.025 * intensity;
      }
      if (piggy) {
        piggy.position.y = 0.55 + Math.sin(elapsed * 1.2) * 0.03 * intensity;
      }
      scene.traverse(object => {
        if (object instanceof THREE.Points) object.rotation.y = elapsed * 0.05 * intensity;
        if (object.name.includes('large-3d-indian') || object.name.includes('floating-golden-coins')) {
          object.rotation.y += delta * 0.32 * intensity;
        }
        if (object instanceof THREE.Mesh && (object.name.includes('star') || object.name.includes('shop'))) {
          object.userData.startY ??= object.position.y;
          object.position.y = object.userData.startY + Math.sin(elapsed * 1.5 + object.position.x) * 0.035 * intensity;
        }
      });
      interactiveTargets.forEach((target, index) => {
        if (target.visible && target.parent?.visible) {
          target.rotation.y = elapsed * 0.3 + index * 0.12;
        }
      });
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
      interactionSystem.dispose();
      guidedCamera.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.filter(Boolean).forEach(item => {
          const standard = item as THREE.Material & { map?: THREE.Texture };
          standard.map?.dispose();
          standard.dispose();
        });
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      stopSimulationNarration();
    };
  }, []);

  const startLesson = useCallback(() => {
    setStarted(true);
    setFeedback(MONEY_TOWN_STAGES[0].interactionPrompt);
    speak(MONEY_TOWN_STAGES[0].teacherNarration, 0);
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
      setFeedback('VR could not start, so the browser Money Town is ready.');
    }
    speak(MONEY_TOWN_STAGES[0].teacherNarration, 0);
  }, [speak]);

  const stageProgressLabel = useMemo(() => {
    if (stage.id === 'identify-money') return `${Object.keys(progress.identificationAnswers).length}/${MONEY_IDENTIFICATION_ROUNDS.length} rounds`;
    if (stage.id === 'memory-check') return `${Object.keys(progress.memoryAnswers).length}/${MONEY_MEMORY_QUESTIONS.length} answers`;
    if (stage.requiredActionIds.length === 0) return 'Ready';
    return `${completedActionIds.length}/${stage.requiredActionIds.length} actions`;
  }, [completedActionIds.length, progress.identificationAnswers, progress.memoryAnswers, stage.id, stage.requiredActionIds.length]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: '#0f172a',
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
          background: 'radial-gradient(circle at 50% 34%, rgba(251,191,36,.22), rgba(15,23,42,.95) 68%)',
          color: '#fff7ed',
          textAlign: 'center',
        }}>
          <section style={{ width: 'min(760px, 100%)' }}>
            <div style={{ color: '#fde68a', fontWeight: 900, letterSpacing: '.14em', fontSize: 13 }}>
              CLASS 1 - MATHEMATICS - 8 TO 10 MINUTES - META QUEST 3S
            </div>
            <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(2.3rem, 8vw, 5rem)', lineHeight: 0.96 }}>
              Introduction to Money
            </h1>
            <p style={{ margin: '0 auto 22px', maxWidth: 650, color: '#ffedd5', fontSize: 18, lineHeight: 1.6 }}>
              Explore Magic Money Town, identify Indian coins and currency notes,
              shop for simple objects, and complete a cheerful memory check.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              {MONEY_TOWN_VR_REQUIREMENTS.slice(0, 5).map(item => (
                <span
                  key={item}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,.12)',
                    border: '1px solid rgba(255,255,255,.18)',
                    color: '#fef3c7',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={startLesson} style={primaryButtonStyle}>Open Money Town</button>
              {vrSupported && <button type="button" onClick={enterVR} style={secondaryButtonStyle}>Enter VR</button>}
            </div>
          </section>
        </div>
      )}

      {started && (
        <>
          <header className="money-hud-header" style={{
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
            <div style={panelHeaderStyle}>
              <strong>Stage {stageIndex + 1} / {MONEY_TOWN_STAGES.length}</strong>
              <span style={{ color: '#fde68a', marginLeft: 10 }}>{stage.title}</span>
            </div>
            <div className="money-utility-controls" style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
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
                {muted ? 'Voice off' : 'Voice on'}
              </button>
              <button type="button" onClick={() => setComfortMode(value => !value)} style={utilityButtonStyle}>
                Comfort {comfortMode ? 'on' : 'off'}
              </button>
              <button type="button" aria-label="Restart Money Town" onClick={restart} style={utilityButtonStyle}>
                Restart
              </button>
            </div>
          </header>

          <aside className="money-stage-panel" style={{
            position: 'absolute',
            zIndex: 8,
            right: 16,
            top: 78,
            bottom: 16,
            width: 'min(370px, calc(100vw - 32px))',
            overflowY: 'auto',
            padding: 18,
            borderRadius: 18,
            border: '1px solid rgba(253,230,138,.32)',
            background: 'linear-gradient(160deg,rgba(69,26,3,.94),rgba(15,118,110,.88))',
            color: '#fff7ed',
            boxShadow: '0 24px 70px rgba(0,0,0,.34)',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{ color: '#fde68a', fontSize: 12, fontWeight: 900, letterSpacing: '.13em' }}>
              {stageProgressLabel.toUpperCase()}
            </div>
            <h2 style={{ margin: '7px 0 8px', fontSize: 24 }}>{stage.title}</h2>
            <p style={{ color: '#ffedd5', lineHeight: 1.5, margin: '0 0 10px' }}>{stage.interactionPrompt}</p>
            <p style={{
              margin: '0 0 14px',
              padding: '11px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,.11)',
              color: '#fff7ed',
              lineHeight: 1.45,
              fontSize: 14,
            }}>
              {stage.teacherNarration}
            </p>

            {stage.id === 'identify-money' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>{identificationRound.prompt}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {identificationRound.optionIds.map(moneyId => {
                    const money = getMoneyDefinition(moneyId);
                    return (
                      <button
                        key={moneyId}
                        type="button"
                        onClick={() => performAction(`identify-option-${identificationRound.id}-${moneyId}`)}
                        style={actionButtonStyle(false)}
                      >
                        {money.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : stage.id === 'memory-check' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>{memoryQuestion.prompt}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {memoryQuestion.options.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => performAction(`memory-option-${index}`)}
                      style={actionButtonStyle(false)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => performAction('complete-money-memory-check')}
                  disabled={Object.keys(progress.memoryAnswers).length < MONEY_MEMORY_QUESTIONS.length}
                  style={actionButtonStyle(Object.keys(progress.memoryAnswers).length >= MONEY_MEMORY_QUESTIONS.length)}
                >
                  Finish Memory Check
                </button>
                <span>Score: {memoryScore.correct}/{memoryScore.total}</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {stage.requiredActionIds.map(actionId => {
                  const complete = completedActionIds.includes(actionId);
                  return (
                    <button
                      key={actionId}
                      type="button"
                      disabled={complete}
                      onClick={() => performAction(actionId)}
                      style={actionButtonStyle(complete)}
                    >
                      {complete ? 'Done ' : ''}{formatActionLabel(actionId)}
                    </button>
                  );
                })}
              </div>
            )}

            <div aria-live="polite" style={{
              minHeight: 56,
              marginTop: 16,
              padding: 11,
              borderRadius: 12,
              background: 'rgba(15,23,42,.62)',
              color: '#fef3c7',
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              {feedback}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                aria-label="Previous stage"
                disabled={stageIndex === 0}
                onClick={() => goToStage(stageIndex - 1)}
                style={navButtonStyle(stageIndex === 0)}
              >
                Back
              </button>
              <button
                type="button"
                aria-label="Next stage"
                disabled={stageIndex === MONEY_TOWN_STAGES.length - 1 || !stageComplete}
                onClick={() => goToStage(stageIndex + 1)}
                style={navButtonStyle(stageIndex === MONEY_TOWN_STAGES.length - 1 || !stageComplete)}
              >
                Next
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function formatActionLabel(actionId: string) {
  const money = MONEY_TOWN_MONEY.find(item => actionId.endsWith(item.id));
  if (money) return money.label;
  const shop = MONEY_SHOP_ITEMS.find(item => actionId === `buy-${item.id}`);
  if (shop) return shop.name;
  if (actionId.includes('coin-side')) return 'Coin side';
  if (actionId.includes('note-side')) return 'Note side';
  if (actionId.includes('enter')) return 'Enter';
  return actionId.replace(/-/g, ' ');
}

const primaryButtonStyle = {
  padding: '14px 22px',
  borderRadius: 14,
  border: '1px solid #fde68a',
  background: 'linear-gradient(135deg,#fbbf24,#14b8a6,#38bdf8)',
  color: '#111827',
  fontWeight: 900,
  cursor: 'pointer',
} as const;

const secondaryButtonStyle = {
  padding: '14px 22px',
  borderRadius: 14,
  border: '1px solid rgba(253,230,138,.5)',
  background: 'rgba(255,255,255,.12)',
  color: '#fef3c7',
  fontWeight: 900,
  cursor: 'pointer',
} as const;

const panelHeaderStyle = {
  padding: '10px 14px',
  borderRadius: 13,
  background: 'rgba(69,26,3,.82)',
  border: '1px solid rgba(253,230,138,.28)',
  color: '#fff7ed',
  backdropFilter: 'blur(12px)',
} as const;

const utilityButtonStyle = {
  padding: '9px 11px',
  borderRadius: 10,
  border: '1px solid rgba(253,230,138,.28)',
  background: 'rgba(69,26,3,.82)',
  color: '#fef3c7',
  fontWeight: 800,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
} as const;

function actionButtonStyle(complete: boolean) {
  return {
    padding: '11px 10px',
    borderRadius: 12,
    border: complete ? '1px solid rgba(74,222,128,.58)' : '1px solid rgba(253,230,138,.36)',
    background: complete ? 'rgba(22,101,52,.55)' : 'rgba(255,255,255,.12)',
    color: complete ? '#dcfce7' : '#fef3c7',
    fontWeight: 900,
    cursor: complete ? 'default' : 'pointer',
  } as const;
}

function navButtonStyle(disabled: boolean) {
  return {
    padding: '10px 12px',
    borderRadius: 12,
    border: disabled ? '1px solid rgba(148,163,184,.25)' : '1px solid rgba(253,230,138,.45)',
    background: disabled ? 'rgba(30,41,59,.45)' : 'rgba(20,184,166,.48)',
    color: disabled ? '#94a3b8' : '#fff7ed',
    fontWeight: 900,
    cursor: disabled ? 'default' : 'pointer',
  } as const;
}
