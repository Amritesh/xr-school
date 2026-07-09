'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ClassroomSync } from '@/components/robotree/ClassroomSync';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  PREPOSITION_DEFINITIONS,
  PREPOSITION_MEMORY_QUESTIONS,
  PREPOSITION_PRACTICE_CHALLENGES,
  PREPOSITION_STAGES,
  PREPOSITION_VR_REQUIREMENTS,
  answerPrepositionMemoryQuestion,
  answerPrepositionPractice,
  createPrepositionProgress,
  getPrepositionDefinition,
  getPrepositionMemoryScore,
  isPrepositionStageComplete,
  recordPrepositionAction,
  type PrepositionId,
  type PrepositionProgress,
  type PrepositionStageId,
} from '@/lib/prepositionAdventureLesson';
import {
  playSimulationNarration,
  stopSimulationNarration,
} from '@/lib/simulationAudio';

const STAGE_FRAMES: Record<PrepositionStageId, {
  position: [number, number, number];
  target: [number, number, number];
}> = {
  intro: { position: [0, 1.45, 5.2], target: [0, 1.22, 0] },
  'learn-prepositions': { position: [0, 1.38, 4.5], target: [0, 1.2, -0.35] },
  'preposition-practice': { position: [0, 1.35, 4.4], target: [0, 1.12, -0.25] },
  'memory-check': { position: [0, 1.42, 4.65], target: [0, 1.25, -0.35] },
  celebration: { position: [0, 1.58, 5.5], target: [0, 1.35, -0.45] },
};

const prepositionColors = [
  0xef4444,
  0xf97316,
  0xfacc15,
  0x22c55e,
  0x14b8a6,
  0x38bdf8,
  0x3b82f6,
  0x8b5cf6,
  0xec4899,
  0xf472b6,
  0xa3e635,
  0xf59e0b,
  0x06b6d4,
];

function makeTextTexture(title: string, subtitle = '', accent = '#facc15', width = 640, height = 240) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(30,27,75,.96)');
  gradient.addColorStop(1, 'rgba(20,83,45,.9)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = accent;
  ctx.font = '900 28px sans-serif';
  ctx.fillText('CLASS 2 - ENGLISH ADVENTURE', 28, 48);
  ctx.fillStyle = '#f8fafc';
  ctx.font = title.length > 18 ? '900 44px sans-serif' : '900 60px sans-serif';
  ctx.fillText(title, 28, 124);
  ctx.fillStyle = '#dcfce7';
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
    emissiveIntensity: 0.15,
    roughness: 0.42,
    transparent: opacity < 1,
    opacity,
  });
}

function makeLabel(title: string, subtitle = '', accent = '#facc15') {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, 0.58),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(title, subtitle, accent, 520, 180),
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
) {
  const target = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 28, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.24,
    }),
  );
  target.name = `preposition-action-${actionId}`;
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

function addParticleRing(group: THREE.Group, name: string, color: number, count = 140) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 1.1 + (index % 8) * 0.16;
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

function addMagicEnglishEnvironment(scene: THREE.Scene) {
  const world = new THREE.Group();
  world.name = 'class-2-magical-english-adventure-no-students';
  scene.add(world);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.1, 96), material(0x14532d, 0.94));
  floor.name = 'rainbow-adventure-floor';
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 2.8, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: 0.25,
      roughness: 0.55,
      side: THREE.BackSide,
    }),
  );
  wall.name = 'magical-classroom-transforms-to-toy-room-garden-playground-reading-corner-tree-house-animal-park-castle';
  wall.position.y = 1.35;
  world.add(wall);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.24),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('Prepositions', 'Where are the objects?', '#facc15', 760, 320),
      transparent: true,
    }),
  );
  board.name = 'large-smartboard-preposition-practice-memory-check';
  board.position.set(0, 1.82, -3.05);
  world.add(board);

  const teacher = new THREE.Group();
  teacher.name = 'friendly-animated-teacher-guide-smiles-speaks-slowly-never-strict';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.74, 8, 18), material(0x8b5cf6));
  body.position.y = 0.72;
  teacher.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 22, 16), material(0xf8c9a5));
  head.position.y = 1.25;
  teacher.add(head);
  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.58, 6, 12), material(0xfacc15));
  hand.name = 'teacher-encouraging-wave-and-clap';
  hand.rotation.z = -1;
  hand.position.set(0.32, 0.98, 0);
  teacher.add(hand);
  teacher.position.set(-2.05, 0.04, -1.95);
  world.add(teacher);

  ['Rainbow', 'Toy Room', 'Garden', 'Playground', 'Tree House', 'Animal Park', 'Magic Castle'].forEach((name, index) => {
    const prop = new THREE.Group();
    prop.name = `${name.toLowerCase().replace(/\s+/g, '-')}-alive-scene`;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.42), material(prepositionColors[index]));
    base.position.y = 0.25;
    prop.add(base);
    const label = makeLabel(name, 'Explore', '#fde68a');
    label.position.set(0, 0.72, 0.02);
    label.scale.setScalar(0.42);
    prop.add(label);
    const angle = (index / 7) * Math.PI * 2;
    prop.position.set(Math.cos(angle) * 2.35, 0, Math.sin(angle) * 2.0 - 0.25);
    world.add(prop);
  });

  addParticleRing(world, 'rainbow-butterflies-floating-stars-happy-birds-clouds-flowers-balloons', 0xfacc15, 200);
  return { world, teacher };
}

function addPrepositionObject(group: THREE.Group, label: string, objectName: string, anchorName: string, color: number, index: number) {
  const root = new THREE.Group();
  root.name = `large-3d-preposition-scene-${label.toLowerCase().replace(/\s+/g, '-')}-${objectName.toLowerCase()}`;
  const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.5), material(0x92400e));
  anchor.name = `${anchorName.toLowerCase().replace(/\s+/g, '-')}-anchor`;
  anchor.position.y = 0.42;
  root.add(anchor);
  const object = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 18), material(color));
  object.name = `${objectName.toLowerCase().replace(/\s+/g, '-')}-movable-object`;
  object.position.set(0, 0.88, 0.08);
  root.add(object);
  const text = makeLabel(label, `${objectName} + ${anchorName}`, '#fef08a');
  text.position.set(0, 1.25, 0);
  text.scale.setScalar(0.46);
  root.add(text);
  const angle = -1.35 + index * 0.23;
  root.position.set(Math.sin(angle) * 2.1, 0, -0.35 + Math.cos(angle) * 0.7);
  root.scale.setScalar(0.78);
  group.add(root);
}

function buildPrepositionStages(scene: THREE.Scene, targets: THREE.Object3D[]) {
  const groups = new Map<PrepositionStageId, THREE.Group>();
  for (const stage of PREPOSITION_STAGES) {
    const group = new THREE.Group();
    group.name = `preposition-stage-${stage.id}`;
    group.visible = stage.id === 'intro';
    scene.add(group);
    groups.set(stage.id, group);
  }

  const intro = groups.get('intro')!;
  addActionTarget(intro, targets, 'start-preposition-adventure', 'Start', 0xfacc15, [0, 0.78, 0.92]);
  addParticleRing(intro, 'floating-books-butterflies-rainbow-magic-sparkles-introduction', 0xfacc15, 180);

  const learn = groups.get('learn-prepositions')!;
  PREPOSITION_DEFINITIONS.forEach((definition, index) => {
    const color = prepositionColors[index % prepositionColors.length];
    addPrepositionObject(learn, definition.label, definition.objectName, definition.anchorName, color, index);
    const action = addActionTarget(
      learn,
      targets,
      definition.actionId,
      definition.label,
      color,
      [-1.85 + (index % 7) * 0.62, 0.52 + Math.floor(index / 7) * 0.42, 1.0],
    );
    action.scale.setScalar(0.82);
  });
  addParticleRing(learn, 'stars-object-glow-positive-feedback-for-every-preposition', 0xfef08a, 170);

  const practice = groups.get('preposition-practice')!;
  PREPOSITION_PRACTICE_CHALLENGES.forEach((challenge, index) => {
    const definition = getPrepositionDefinition(challenge.correctPrepositionId);
    addActionTarget(
      practice,
      targets,
      `practice-choice-${challenge.id}-${definition.id}`,
      definition.label,
      prepositionColors[index % prepositionColors.length],
      [-1.55 + (index % 4) * 1.05, 0.92 + Math.floor(index / 4) * 0.48, 0.72],
    );
  });
  addParticleRing(practice, 'randomized-practice-stars-gold-coins-fireworks-teacher-applause', 0xfbbf24, 170);

  const memory = groups.get('memory-check')!;
  const board = makeLabel('Memory Check', 'Choose the preposition', '#67e8f9');
  board.name = 'magic-castle-memory-check-answer-cards';
  board.position.set(0, 1.88, -0.55);
  memory.add(board);
  ['A', 'B', 'C', 'D'].forEach((label, index) => {
    addActionTarget(memory, targets, `memory-option-${index}`, label, prepositionColors[index], [-1.2 + index * 0.8, 0.92, 0.72]);
  });
  addActionTarget(memory, targets, 'complete-preposition-memory-check', 'Finish', 0x22c55e, [0, 0.45, 0.95]);
  addParticleRing(memory, 'correct-card-glow-stars-sparkles-teacher-claps', 0x67e8f9, 150);

  const celebration = groups.get('celebration')!;
  ['Preposition Explorer', 'Grammar Star', 'English Champion'].forEach((badge, index) => {
    const badgeMesh = makeLabel(badge, 'Badge', ['#facc15', '#86efac', '#f0abfc'][index]);
    badgeMesh.name = `achievement-badge-${badge.toLowerCase().replace(/\s+/g, '-')}`;
    badgeMesh.position.set(-1.2 + index * 1.2, 1.25, -0.2);
    badgeMesh.scale.setScalar(0.58);
    celebration.add(badgeMesh);
  });
  addParticleRing(celebration, 'rainbow-butterflies-confetti-stars-final-english-adventure-celebration', 0xfacc15, 240);

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

export default function PrepositionAdventureViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageGroupsRef = useRef<Map<PrepositionStageId, THREE.Group>>(new Map());
  const interactiveTargetsRef = useRef<THREE.Object3D[]>([]);
  const stageIndexRef = useRef(0);
  const progressRef = useRef<PrepositionProgress>(createPrepositionProgress());
  const performActionRef = useRef<(actionId: string) => void>(() => undefined);
  const goToStageRef = useRef<(index: number) => void>(() => undefined);
  const focusStageRef = useRef<(stageId: PrepositionStageId, animate?: boolean) => void>(() => undefined);
  const comfortModeRef = useRef(true);
  const animatedRefs = useRef<{ teacher?: THREE.Group }>({});

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState<PrepositionProgress>(() => createPrepositionProgress());
  const [feedback, setFeedback] = useState('Touch Start when you are ready.');
  const [muted, setMuted] = useState(false);
  const [comfortMode, setComfortMode] = useState(true);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [memoryQuestionIndex, setMemoryQuestionIndex] = useState(0);

  const stage = PREPOSITION_STAGES[stageIndex];
  const completedActionIds = progress.completedActions[stage.id] ?? [];
  const stageComplete = isPrepositionStageComplete(progress, stage.id);
  const practiceChallenge = PREPOSITION_PRACTICE_CHALLENGES[practiceIndex];
  const memoryQuestion = PREPOSITION_MEMORY_QUESTIONS[memoryQuestionIndex];
  const memoryScore = getPrepositionMemoryScore(progress);

  const speak = useCallback((text: string, cueIndex = stageIndexRef.current) => {
    if (muted) return;
    void playSimulationNarration(text, cueIndex);
  }, [muted]);

  const completeAction = useCallback((actionId: string, message = 'Excellent! Stars and sparkles for you.') => {
    const currentStage = PREPOSITION_STAGES[stageIndexRef.current];
    setProgress(current => {
      const next = recordPrepositionAction(current, currentStage.id, actionId);
      progressRef.current = next;
      return next;
    });
    const target = interactiveTargetsRef.current.find(item => item.userData.actionId === actionId);
    if (target) markTargetComplete(target);
    setFeedback(message);
    speak(message);
  }, [speak]);

  const performAction = useCallback((actionId: string) => {
    const currentStage = PREPOSITION_STAGES[stageIndexRef.current];

    if (currentStage.requiredActionIds.includes(actionId)) {
      completeAction(actionId);
      return;
    }

    const practicePrefix = `practice-choice-${practiceChallenge.id}-`;
    if (currentStage.id === 'preposition-practice' && actionId.startsWith(practicePrefix)) {
      const prepositionId = actionId.replace(practicePrefix, '') as PrepositionId;
      const correct = prepositionId === practiceChallenge.correctPrepositionId;
      setProgress(current => {
        const next = answerPrepositionPractice(current, practiceChallenge.id, prepositionId);
        progressRef.current = next;
        return next;
      });
      const message = correct
        ? `Correct! ${getPrepositionDefinition(prepositionId).label} is right.`
        : `Good try. Look again for ${getPrepositionDefinition(practiceChallenge.correctPrepositionId).label}.`;
      setFeedback(message);
      speak(message, 20 + practiceIndex);
      if (correct) setPracticeIndex(index => Math.min(index + 1, PREPOSITION_PRACTICE_CHALLENGES.length - 1));
      return;
    }

    const memoryPrefix = 'memory-option-';
    if (currentStage.id === 'memory-check' && actionId.startsWith(memoryPrefix)) {
      const optionIndex = Number(actionId.replace(memoryPrefix, ''));
      const prepositionId = memoryQuestion.optionIds[optionIndex];
      const correct = prepositionId === memoryQuestion.correctPrepositionId;
      setProgress(current => {
        const next = answerPrepositionMemoryQuestion(current, memoryQuestion.id, prepositionId);
        progressRef.current = next;
        return next;
      });
      const message = correct
        ? `Correct! ${getPrepositionDefinition(prepositionId).label}.`
        : `That is okay. The answer is ${getPrepositionDefinition(memoryQuestion.correctPrepositionId).label}.`;
      setFeedback(message);
      speak(message, 40 + memoryQuestionIndex);
      setMemoryQuestionIndex(index => Math.min(index + 1, PREPOSITION_MEMORY_QUESTIONS.length - 1));
    }
  }, [completeAction, memoryQuestion, memoryQuestionIndex, practiceChallenge, practiceIndex, speak]);
  performActionRef.current = performAction;

  const goToStage = useCallback((requestedIndex: number) => {
    const currentIndex = stageIndexRef.current;
    const nextIndex = Math.min(Math.max(requestedIndex, 0), PREPOSITION_STAGES.length - 1);
    if (nextIndex > currentIndex && !isPrepositionStageComplete(progressRef.current, PREPOSITION_STAGES[currentIndex].id)) {
      setFeedback(PREPOSITION_STAGES[currentIndex].interactionPrompt);
      return;
    }
    stageIndexRef.current = nextIndex;
    setStageIndex(nextIndex);
    const nextStage = PREPOSITION_STAGES[nextIndex];
    focusStageRef.current(nextStage.id, true);
    setFeedback(nextStage.interactionPrompt);
    speak(nextStage.teacherNarration, nextIndex);
  }, [speak]);
  goToStageRef.current = goToStage;

  const restart = useCallback(() => {
    const fresh = createPrepositionProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    setStageIndex(0);
    stageIndexRef.current = 0;
    setPracticeIndex(0);
    setMemoryQuestionIndex(0);
    setFeedback('Touch Start when you are ready.');
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
    scene.background = new THREE.Color(0x1e1b4b);
    scene.fog = new THREE.Fog(0x1e1b4b, 7, 15);

    const camera = new THREE.PerspectiveCamera(62, mount.clientWidth / mount.clientHeight, 0.05, 40);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    const focusStage = (stageId: PrepositionStageId, animate = true) => {
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x312e81, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 5, 4);
    scene.add(key);
    const sparkleLight = new THREE.PointLight(0xfacc15, 2.2, 8);
    sparkleLight.position.set(0, 2.4, 0.4);
    scene.add(sparkleLight);

    const environment = addMagicEnglishEnvironment(scene);
    animatedRefs.current = { teacher: environment.teacher };
    const interactiveTargets: THREE.Object3D[] = [];
    interactiveTargetsRef.current = interactiveTargets;
    stageGroupsRef.current = buildPrepositionStages(scene, interactiveTargets);

    const nav = new THREE.Group();
    nav.name = 'preposition-vr-controller-navigation';
    const back = addActionTarget(nav, interactiveTargets, 'preposition-nav-back', 'Back', 0x0ea5e9, [-1, 0.42, 1.1]);
    back.userData.navigationDelta = -1;
    const next = addActionTarget(nav, interactiveTargets, 'preposition-nav-next', 'Next', 0x22c55e, [1, 0.42, 1.1]);
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
      const { teacher } = animatedRefs.current;
      if (teacher) {
        teacher.rotation.y = Math.sin(elapsed * 0.9) * 0.08 * intensity;
        teacher.position.y = 0.04 + Math.sin(elapsed * 1.6) * 0.025 * intensity;
      }
      scene.traverse(object => {
        if (object instanceof THREE.Points) object.rotation.y = elapsed * 0.05 * intensity;
        if (object.name.includes('large-3d-preposition-scene') || object.name.includes('alive-scene')) {
          object.rotation.y += delta * 0.16 * intensity;
        }
        if (object instanceof THREE.Mesh && (object.name.includes('movable-object') || object.name.includes('badge'))) {
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
    setFeedback(PREPOSITION_STAGES[0].interactionPrompt);
    speak(PREPOSITION_STAGES[0].teacherNarration, 0);
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
      setFeedback('VR could not start, so the browser English Adventure is ready.');
    }
    speak(PREPOSITION_STAGES[0].teacherNarration, 0);
  }, [speak]);

  const stageProgressLabel = useMemo(() => {
    if (stage.id === 'preposition-practice') return `${Object.keys(progress.practiceAnswers).length}/${PREPOSITION_PRACTICE_CHALLENGES.length} challenges`;
    if (stage.id === 'memory-check') return `${Object.keys(progress.memoryAnswers).length}/${PREPOSITION_MEMORY_QUESTIONS.length} answers`;
    if (stage.requiredActionIds.length === 0) return 'Ready';
    return `${completedActionIds.length}/${stage.requiredActionIds.length} actions`;
  }, [completedActionIds.length, progress.memoryAnswers, progress.practiceAnswers, stage.id, stage.requiredActionIds.length]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: '#1e1b4b',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <ClassroomSync
        stageIndex={stageIndex}
        stageCount={PREPOSITION_STAGES.length}
        completed={stageIndex >= PREPOSITION_STAGES.length - 1 && stageComplete}
        started={started}
      />

      {!started && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'radial-gradient(circle at 50% 34%, rgba(250,204,21,.2), rgba(30,27,75,.95) 68%)',
          color: '#f8fafc',
          textAlign: 'center',
        }}>
          <section style={{ width: 'min(760px, 100%)' }}>
            <div style={{ color: '#fde68a', fontWeight: 900, letterSpacing: '.14em', fontSize: 13 }}>
              CLASS 2 - ENGLISH - 8 TO 10 MINUTES - META QUEST 3S
            </div>
            <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(2.4rem, 8vw, 5rem)', lineHeight: 0.96 }}>
              Prepositions Adventure
            </h1>
            <p style={{ margin: '0 auto 22px', maxWidth: 660, color: '#e0e7ff', fontSize: 18, lineHeight: 1.6 }}>
              Explore toy rooms, gardens, playgrounds, tree houses, animal parks,
              and a magic castle while learning where objects are.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              {PREPOSITION_VR_REQUIREMENTS.slice(0, 5).map(item => (
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
              <button type="button" onClick={startLesson} style={primaryButtonStyle}>Open English Adventure</button>
              {vrSupported && <button type="button" onClick={enterVR} style={secondaryButtonStyle}>Enter VR</button>}
            </div>
          </section>
        </div>
      )}

      {started && (
        <>
          <header className="preposition-hud-header" style={{
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
              <strong>Stage {stageIndex + 1} / {PREPOSITION_STAGES.length}</strong>
              <span style={{ color: '#fde68a', marginLeft: 10 }}>{stage.title}</span>
            </div>
            <div className="preposition-utility-controls" style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
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
              <button type="button" aria-label="Restart English Adventure" onClick={restart} style={utilityButtonStyle}>
                Restart
              </button>
            </div>
          </header>

          <aside className="preposition-stage-panel" style={{
            position: 'absolute',
            zIndex: 8,
            right: 16,
            top: 78,
            bottom: 16,
            width: 'min(380px, calc(100vw - 32px))',
            overflowY: 'auto',
            padding: 18,
            borderRadius: 18,
            border: '1px solid rgba(253,230,138,.3)',
            background: 'linear-gradient(160deg,rgba(30,27,75,.94),rgba(20,83,45,.88))',
            color: '#f8fafc',
            boxShadow: '0 24px 70px rgba(0,0,0,.34)',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{ color: '#fde68a', fontSize: 12, fontWeight: 900, letterSpacing: '.13em' }}>
              {stageProgressLabel.toUpperCase()}
            </div>
            <h2 style={{ margin: '7px 0 8px', fontSize: 24 }}>{stage.title}</h2>
            <p style={{ color: '#e0e7ff', lineHeight: 1.5, margin: '0 0 10px' }}>{stage.interactionPrompt}</p>
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

            {stage.id === 'preposition-practice' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>{practiceChallenge.prompt}</strong>
                <button
                  type="button"
                  onClick={() => performAction(`practice-choice-${practiceChallenge.id}-${practiceChallenge.correctPrepositionId}`)}
                  style={actionButtonStyle(false)}
                >
                  Place It Correctly
                </button>
              </div>
            ) : stage.id === 'memory-check' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>{memoryQuestion.prompt}</strong>
                <span style={{ color: '#bbf7d0' }}>{memoryQuestion.sceneDescription}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {memoryQuestion.optionIds.map((prepositionId, index) => (
                    <button
                      key={prepositionId}
                      type="button"
                      onClick={() => performAction(`memory-option-${index}`)}
                      style={actionButtonStyle(false)}
                    >
                      {getPrepositionDefinition(prepositionId).label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => performAction('complete-preposition-memory-check')}
                  disabled={Object.keys(progress.memoryAnswers).length < PREPOSITION_MEMORY_QUESTIONS.length}
                  style={actionButtonStyle(Object.keys(progress.memoryAnswers).length >= PREPOSITION_MEMORY_QUESTIONS.length)}
                >
                  Finish Memory Check
                </button>
                <span>Score: {memoryScore.correct}/{memoryScore.total}</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {stage.requiredActionIds.map(actionId => {
                  const complete = completedActionIds.includes(actionId);
                  const definition = PREPOSITION_DEFINITIONS.find(item => item.actionId === actionId);
                  return (
                    <button
                      key={actionId}
                      type="button"
                      disabled={complete}
                      onClick={() => performAction(actionId)}
                      style={actionButtonStyle(complete)}
                    >
                      {complete ? 'Done ' : ''}{definition?.label ?? 'Start'}
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
                disabled={stageIndex === PREPOSITION_STAGES.length - 1 || !stageComplete}
                onClick={() => goToStage(stageIndex + 1)}
                style={navButtonStyle(stageIndex === PREPOSITION_STAGES.length - 1 || !stageComplete)}
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

const primaryButtonStyle = {
  padding: '14px 22px',
  borderRadius: 14,
  border: '1px solid #fde68a',
  background: 'linear-gradient(135deg,#facc15,#22c55e,#38bdf8)',
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
  background: 'rgba(30,27,75,.82)',
  border: '1px solid rgba(253,230,138,.28)',
  color: '#f8fafc',
  backdropFilter: 'blur(12px)',
} as const;

const utilityButtonStyle = {
  padding: '9px 11px',
  borderRadius: 10,
  border: '1px solid rgba(253,230,138,.28)',
  background: 'rgba(30,27,75,.82)',
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
    background: disabled ? 'rgba(30,41,59,.45)' : 'rgba(34,197,94,.48)',
    color: disabled ? '#94a3b8' : '#fff7ed',
    fontWeight: 900,
    cursor: disabled ? 'default' : 'pointer',
  } as const;
}
