'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  COLOUR_ADVENTURE_COLOURS,
  COLOUR_ADVENTURE_STAGES,
  COLOUR_ADVENTURE_VR_REQUIREMENTS,
  COLOUR_MEMORY_QUESTIONS,
  answerColourMemoryQuestion,
  createColourAdventureProgress,
  getColourMemoryScore,
  isColourAdventureStageComplete,
  recordColourAdventureAction,
  type ColourAdventureProgress,
  type ColourAdventureStageId,
  type ColourId,
} from '@/lib/colourAdventureLesson';
import {
  playSimulationNarration,
  stopSimulationNarration,
} from '@/lib/simulationAudio';

const colourHexById = new Map(COLOUR_ADVENTURE_COLOURS.map(colour => [colour.id, colour.hex]));
const colourNameById = new Map(COLOUR_ADVENTURE_COLOURS.map(colour => [colour.id, colour.name]));

const STAGE_FRAMES: Record<ColourAdventureStageId, {
  position: [number, number, number];
  target: [number, number, number];
}> = Object.fromEntries(
  COLOUR_ADVENTURE_STAGES.map((stage, index) => [
    stage.id,
    index === 0
      ? { position: [0, 1.45, 5.2], target: [0, 1.25, 0] }
      : stage.id === 'find-colours'
        ? { position: [0, 1.35, 4.4], target: [0, 1.3, 0] }
        : stage.id === 'memory-check'
          ? { position: [0, 1.4, 4.6], target: [0, 1.2, -0.2] }
          : stage.id === 'celebration'
            ? { position: [0, 1.55, 5.4], target: [0, 1.35, -0.4] }
            : { position: [0, 1.35, 4.1], target: [0, 1.25, -0.2] },
  ]),
) as Record<ColourAdventureStageId, { position: [number, number, number]; target: [number, number, number] }>;

function hexToNumber(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function makeTextTexture(
  title: string,
  subtitle = '',
  accent = '#facc15',
  width = 640,
  height = 240,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(15,23,42,.96)');
  gradient.addColorStop(1, 'rgba(30,64,175,.9)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = accent;
  ctx.font = '900 28px sans-serif';
  ctx.fillText('CLASS 1 - COLOUR ADVENTURE', 28, 48);
  ctx.fillStyle = '#f8fafc';
  ctx.font = title.length > 16 ? '900 48px sans-serif' : '900 64px sans-serif';
  ctx.fillText(title, 28, 126);
  ctx.fillStyle = '#dbeafe';
  ctx.font = '28px sans-serif';
  ctx.fillText(subtitle, 28, 182);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function material(color: number, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.42,
    transparent: opacity < 1,
    opacity,
  });
}

function makeLabel(text: string, accent = '#facc15') {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.54),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(text, '', accent, 460, 150),
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
    new THREE.SphereGeometry(0.2, 28, 20),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.85,
      roughness: 0.24,
    }),
  );
  target.name = `colour-action-${actionId}`;
  target.position.set(...position);
  target.userData.actionId = actionId;
  target.userData.baseColor = color;
  const labelMesh = makeLabel(label, `#${color.toString(16).padStart(6, '0')}`);
  labelMesh.position.set(0, 0.38, 0);
  labelMesh.scale.setScalar(0.48);
  target.add(labelMesh);
  group.add(target);
  targets.push(target);
  return target;
}

function addParticleRing(group: THREE.Group, name: string, color: number, count = 120) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 1.2 + (index % 7) * 0.16;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.8 + (index % 11) * 0.15;
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

function addMagicClassroom(scene: THREE.Scene) {
  const room = new THREE.Group();
  room.name = 'class-1-magical-circular-colour-classroom-no-students';
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 96),
    material(0x312e81, 0.9),
  );
  floor.name = 'interactive-rainbow-floor';
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(3.7, 3.7, 2.6, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.18,
      roughness: 0.55,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide,
    }),
  );
  wall.name = 'colourful-circular-walls';
  wall.position.y = 1.3;
  room.add(wall);

  for (let index = 0; index < 7; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.75 + index * 0.24, 0.018, 8, 96),
      material([0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899][index]),
    );
    ring.name = `rainbow-ceiling-light-${index + 1}`;
    ring.position.y = 2.75;
    ring.rotation.x = Math.PI / 2;
    room.add(ring);
  }

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.2),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('Learning of Colours', 'Touch, play, remember', '#facc15', 760, 320),
      transparent: true,
    }),
  );
  board.name = 'large-3d-led-smart-board';
  board.position.set(0, 1.8, -2.95);
  room.add(board);

  const teacher = new THREE.Group();
  teacher.name = 'animated-friendly-teacher-guide';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.72, 8, 18), material(0xf472b6));
  body.position.y = 0.72;
  teacher.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 22, 16), material(0xf8c9a5));
  head.position.y = 1.25;
  teacher.add(head);
  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.58, 6, 12), material(0xfacc15));
  hand.name = 'teacher-slow-hand-gesture';
  hand.rotation.z = -1;
  hand.position.set(0.32, 0.98, 0);
  teacher.add(hand);
  teacher.position.set(-1.85, 0.04, -1.95);
  room.add(teacher);

  for (let index = 0; index < 10; index += 1) {
    const colour = COLOUR_ADVENTURE_COLOURS[index];
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), material(hexToNumber(colour.hex), 0.88));
    balloon.name = `floating-${colour.id}-balloon`;
    const angle = (index / 10) * Math.PI * 2;
    balloon.position.set(Math.cos(angle) * 2.45, 1.55 + (index % 3) * 0.24, Math.sin(angle) * 2.25);
    room.add(balloon);
  }

  addParticleRing(room, 'magic-sparkle-butterflies-clouds-and-colour-particles', 0xfacc15, 180);
  return { room, teacher };
}

function addColourObject(group: THREE.Group, label: string, color: number, index: number) {
  const angle = -0.75 + index * 0.5;
  const object = new THREE.Group();
  object.name = `large-colour-object-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), material(color));
  base.scale.set(1 + (index % 2) * 0.2, 0.78 + (index % 3) * 0.08, 1);
  object.add(base);
  const labelMesh = makeLabel(label, `#${color.toString(16).padStart(6, '0')}`);
  labelMesh.position.set(0, 0.44, 0);
  labelMesh.scale.setScalar(0.42);
  object.add(labelMesh);
  object.position.set(Math.sin(angle) * 1.6, 1.1 + (index % 2) * 0.25, -0.45 + Math.cos(angle) * 0.25);
  group.add(object);
}

function buildColourStageGroups(scene: THREE.Scene, targets: THREE.Object3D[]) {
  const groups = new Map<ColourAdventureStageId, THREE.Group>();
  for (const stage of COLOUR_ADVENTURE_STAGES) {
    const group = new THREE.Group();
    group.name = `colour-stage-${stage.id}`;
    group.visible = stage.id === 'intro';
    scene.add(group);
    groups.set(stage.id, group);
  }

  const intro = groups.get('intro')!;
  const rainbow = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.055, 16, 96, Math.PI), material(0xfacc15));
  rainbow.name = 'rainbow-appears-classroom-introduction';
  rainbow.position.set(0, 1.4, -0.5);
  rainbow.rotation.z = Math.PI;
  intro.add(rainbow);
  addActionTarget(intro, targets, 'start-colour-adventure', 'Start', 0xfacc15, [0, 0.78, 0.85]);

  for (const colour of COLOUR_ADVENTURE_COLOURS) {
    const group = groups.get(`learn-${colour.id}` as ColourAdventureStageId)!;
    const colorNumber = hexToNumber(colour.hex);
    const world = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 48, 28),
      new THREE.MeshStandardMaterial({
        color: colorNumber,
        emissive: colorNumber,
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      }),
    );
    world.name = `${colour.id}-world-room-transform`;
    world.position.y = 1.2;
    group.add(world);
    colour.objects.forEach((object, index) => addColourObject(group, object, colorNumber, index));
    addParticleRing(group, `${colour.id}-stars-sparkles-confetti`, colorNumber, 90);
    addActionTarget(
      group,
      targets,
      `touch-${colour.id}-balloon`,
      colour.name,
      colorNumber,
      [0, 1.2, 0.85],
    );
  }

  const find = groups.get('find-colours')!;
  COLOUR_ADVENTURE_COLOURS.forEach((colour, index) => {
    const angle = (index / COLOUR_ADVENTURE_COLOURS.length) * Math.PI * 2;
    addActionTarget(
      find,
      targets,
      `find-${colour.id}`,
      colour.name,
      hexToNumber(colour.hex),
      [Math.cos(angle) * 1.55, 1.2 + (index % 2) * 0.24, Math.sin(angle) * 0.48],
    );
  });
  addParticleRing(find, 'find-colours-stars-coins-rainbow-reward', 0xfacc15, 150);

  const memory = groups.get('memory-check')!;
  const memoryBoard = makeLabel('Memory Game', '#67e8f9');
  memoryBoard.name = 'holographic-memory-check-board';
  memoryBoard.position.set(0, 1.95, -0.55);
  memory.add(memoryBoard);
  ['red', 'blue', 'yellow', 'green'].forEach((colourId, index) => {
    const colorNumber = hexToNumber(colourHexById.get(colourId as ColourId) ?? '#ffffff');
    addActionTarget(
      memory,
      targets,
      `memory-pad-${colourId}`,
      colourNameById.get(colourId as ColourId) ?? colourId,
      colorNumber,
      [-1.25 + index * 0.85, 0.95, 0.72],
    );
  });
  addActionTarget(memory, targets, 'complete-memory-check', 'Finish', 0x22c55e, [0, 0.48, 0.9]);

  const celebration = groups.get('celebration')!;
  for (let index = 0; index < 14; index += 1) {
    const colour = COLOUR_ADVENTURE_COLOURS[index % COLOUR_ADVENTURE_COLOURS.length];
    const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), material(hexToNumber(colour.hex)));
    star.name = `final-celebration-colour-star-${index + 1}`;
    star.position.set(-1.8 + index * 0.28, 1 + Math.sin(index) * 0.42, -0.2 + Math.cos(index) * 0.28);
    celebration.add(star);
  }
  addParticleRing(celebration, 'rainbow-finale-balloons-butterflies-confetti', 0xfacc15, 220);

  return { groups };
}

function setTargetComplete(target: THREE.Object3D) {
  const mesh = target as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (!material?.color) return;
  material.emissiveIntensity = 1.4;
  target.scale.setScalar(1.2);
}

export default function ColourAdventureViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stageGroupsRef = useRef<Map<ColourAdventureStageId, THREE.Group>>(new Map());
  const interactiveTargetsRef = useRef<THREE.Object3D[]>([]);
  const stageIndexRef = useRef(0);
  const progressRef = useRef<ColourAdventureProgress>(createColourAdventureProgress());
  const performActionRef = useRef<(actionId: string) => void>(() => undefined);
  const goToStageRef = useRef<(index: number) => void>(() => undefined);
  const focusStageRef = useRef<(stageId: ColourAdventureStageId, animate?: boolean) => void>(() => undefined);
  const comfortModeRef = useRef(true);
  const animatedRefs = useRef<{ teacher?: THREE.Group }>({});

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState<ColourAdventureProgress>(() => createColourAdventureProgress());
  const [feedback, setFeedback] = useState('Touch Start when you are ready.');
  const [muted, setMuted] = useState(false);
  const [comfortMode, setComfortMode] = useState(true);
  const [memoryQuestionIndex, setMemoryQuestionIndex] = useState(0);

  const stage = COLOUR_ADVENTURE_STAGES[stageIndex];
  const completedActionIds = progress.completedActions[stage.id] ?? [];
  const stageComplete = isColourAdventureStageComplete(progress, stage.id);
  const memoryQuestion = COLOUR_MEMORY_QUESTIONS[memoryQuestionIndex];
  const memoryScore = getColourMemoryScore(progress);

  const speak = useCallback((text: string, cueIndex = stageIndexRef.current) => {
    if (muted) return;
    void playSimulationNarration(text, cueIndex);
  }, [muted]);

  const performAction = useCallback((actionId: string) => {
    const currentStage = COLOUR_ADVENTURE_STAGES[stageIndexRef.current];
    if (currentStage.requiredActionIds.includes(actionId)) {
      setProgress(current => {
        const next = recordColourAdventureAction(current, currentStage.id, actionId);
        progressRef.current = next;
        return next;
      });
      const target = interactiveTargetsRef.current.find(item => item.userData.actionId === actionId);
      if (target) setTargetComplete(target);
      const message = actionId === 'complete-memory-check'
        ? 'Wonderful remembering! You finished the colour memory game.'
        : 'Wonderful! Stars and sparkles for you.';
      setFeedback(message);
      speak(message);
      return;
    }

    const memoryPrefix = 'memory-pad-';
    if (currentStage.id === 'memory-check' && actionId.startsWith(memoryPrefix)) {
      const colourId = actionId.replace(memoryPrefix, '') as ColourId;
      const correct = colourId === memoryQuestion.correctColourId;
      setProgress(current => {
        const next = answerColourMemoryQuestion(current, memoryQuestion.id, colourId);
        progressRef.current = next;
        return next;
      });
      const message = correct
        ? `Correct! ${memoryQuestion.objectName} is ${colourNameById.get(colourId)}.`
        : `That's okay. ${memoryQuestion.objectName} is ${colourNameById.get(memoryQuestion.correctColourId)}. Let's try the next one.`;
      setFeedback(message);
      speak(message, 30 + memoryQuestionIndex);
      setMemoryQuestionIndex(index => Math.min(index + 1, COLOUR_MEMORY_QUESTIONS.length - 1));
      return;
    }
  }, [memoryQuestion, memoryQuestionIndex, speak]);
  performActionRef.current = performAction;

  const goToStage = useCallback((requestedIndex: number) => {
    const currentIndex = stageIndexRef.current;
    const nextIndex = Math.min(Math.max(requestedIndex, 0), COLOUR_ADVENTURE_STAGES.length - 1);
    if (nextIndex > currentIndex && !isColourAdventureStageComplete(progressRef.current, COLOUR_ADVENTURE_STAGES[currentIndex].id)) {
      setFeedback(COLOUR_ADVENTURE_STAGES[currentIndex].interactionPrompt);
      return;
    }
    stageIndexRef.current = nextIndex;
    setStageIndex(nextIndex);
    const nextStage = COLOUR_ADVENTURE_STAGES[nextIndex];
    focusStageRef.current(nextStage.id, true);
    setFeedback(nextStage.interactionPrompt);
    speak(nextStage.teacherNarration, nextIndex);
  }, [speak]);
  goToStageRef.current = goToStage;

  const restart = useCallback(() => {
    const fresh = createColourAdventureProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    setStageIndex(0);
    stageIndexRef.current = 0;
    setMemoryQuestionIndex(0);
    setFeedback('Touch Start when you are ready.');
    stopSimulationNarration();
    interactiveTargetsRef.current.forEach(target => {
      target.scale.setScalar(1);
      const mesh = target as THREE.Mesh;
      const materialValue = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (materialValue && typeof target.userData.baseColor === 'number') {
        materialValue.emissiveIntensity = 0.85;
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
    scene.background = new THREE.Color(0x1e1b4b);
    scene.fog = new THREE.Fog(0x1e1b4b, 6.5, 14);

    const camera = new THREE.PerspectiveCamera(62, mount.clientWidth / mount.clientHeight, 0.05, 40);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    const focusStage = (stageId: ColourAdventureStageId, animate = true) => {
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x312e81, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(3, 5, 3);
    scene.add(key);
    const rainbowLight = new THREE.PointLight(0xfacc15, 2.1, 7);
    rainbowLight.position.set(0, 2.4, 0.5);
    scene.add(rainbowLight);

    const classroom = addMagicClassroom(scene);
    animatedRefs.current = { teacher: classroom.teacher };
    const interactiveTargets: THREE.Object3D[] = [];
    interactiveTargetsRef.current = interactiveTargets;
    const built = buildColourStageGroups(scene, interactiveTargets);
    stageGroupsRef.current = built.groups;

    const nav = new THREE.Group();
    nav.name = 'colour-vr-controller-navigation';
    const back = addActionTarget(nav, interactiveTargets, 'colour-nav-back', 'Back', 0xa855f7, [-1, 0.42, 1.1]);
    back.userData.navigationDelta = -1;
    const next = addActionTarget(nav, interactiveTargets, 'colour-nav-next', 'Next', 0x22c55e, [1, 0.42, 1.1]);
    next.userData.navigationDelta = 1;
    scene.add(nav);

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    const makeRay = () => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]),
      new THREE.LineBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.8 }),
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
      const time = elapsed;
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      const intensity = comfortModeRef.current ? 0.4 : 1;
      rainbowLight.intensity = 1.8 + Math.sin(time * 1.4) * 0.3 * intensity;
      const { teacher } = animatedRefs.current;
      if (teacher) {
        teacher.rotation.y = Math.sin(time * 0.9) * 0.08 * intensity;
        teacher.position.y = 0.04 + Math.sin(time * 1.6) * 0.025 * intensity;
      }
      scene.traverse(object => {
        if (object instanceof THREE.Points) object.rotation.y = time * 0.05 * intensity;
        if (object instanceof THREE.Mesh && (
          object.name.includes('balloon')
          || object.name.includes('star')
          || object.name.includes('large-colour-object')
        )) {
          object.userData.startY ??= object.position.y;
          object.position.y = object.userData.startY + Math.sin(time * 1.6 + object.position.x) * 0.045 * intensity;
          object.rotation.y += delta * 0.25 * intensity;
        }
      });
      interactiveTargets.forEach((target, index) => {
        if (target.visible && target.parent?.visible) {
          target.rotation.y = time * 0.35 + index * 0.16;
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
    setFeedback(COLOUR_ADVENTURE_STAGES[0].interactionPrompt);
    speak(COLOUR_ADVENTURE_STAGES[0].teacherNarration, 0);
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
      setFeedback('VR could not start, so the browser adventure is ready.');
    }
    speak(COLOUR_ADVENTURE_STAGES[0].teacherNarration, 0);
  }, [speak]);

  const stageProgressLabel = useMemo(() => {
    if (stage.id === 'memory-check') return `${Object.keys(progress.memoryAnswers).length}/${COLOUR_MEMORY_QUESTIONS.length} answers`;
    if (stage.requiredActionIds.length === 0) return 'Ready';
    return `${completedActionIds.length}/${stage.requiredActionIds.length} actions`;
  }, [completedActionIds.length, progress.memoryAnswers, stage.id, stage.requiredActionIds.length]);

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

      {!started && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'radial-gradient(circle at 50% 34%, rgba(250,204,21,.2), rgba(30,27,75,.94) 68%)',
          color: '#f8fafc',
          textAlign: 'center',
        }}>
          <section style={{ width: 'min(720px, 100%)' }}>
            <div style={{ color: '#fde68a', fontWeight: 900, letterSpacing: '.14em', fontSize: 13 }}>
              CLASS 1 - 8 TO 10 MINUTES - META QUEST 3S
            </div>
            <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(2.4rem, 8vw, 5rem)', lineHeight: 0.95 }}>
              Learning of Colours
            </h1>
            <p style={{ margin: '0 auto 22px', maxWidth: 620, color: '#e0e7ff', fontSize: 18, lineHeight: 1.6 }}>
              A magical colour adventure with balloons, butterflies, rainbow worlds,
              simple games, stars, and a friendly teacher guide.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              {COLOUR_ADVENTURE_VR_REQUIREMENTS.slice(0, 5).map(item => (
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
              <button type="button" onClick={startLesson} style={primaryButtonStyle}>Open Adventure</button>
              {vrSupported && <button type="button" onClick={enterVR} style={secondaryButtonStyle}>Enter VR</button>}
            </div>
          </section>
        </div>
      )}

      {started && (
        <>
          <header className="colour-hud-header" style={{
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
              <strong>Stage {stageIndex + 1} / {COLOUR_ADVENTURE_STAGES.length}</strong>
              <span style={{ color: '#fde68a', marginLeft: 10 }}>{stage.title}</span>
            </div>
            <div className="colour-utility-controls" style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
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
              <button type="button" aria-label="Restart adventure" onClick={restart} style={utilityButtonStyle}>
                Restart
              </button>
            </div>
          </header>

          <aside className="colour-stage-panel" style={{
            position: 'absolute',
            zIndex: 8,
            right: 16,
            top: 78,
            bottom: 16,
            width: 'min(360px, calc(100vw - 32px))',
            overflowY: 'auto',
            padding: 18,
            borderRadius: 18,
            border: '1px solid rgba(253,230,138,.28)',
            background: 'linear-gradient(160deg,rgba(30,27,75,.94),rgba(67,56,202,.86))',
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

            {stage.id !== 'memory-check' ? (
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
                      {complete ? 'Star ' : ''}{actionId.includes('touch-')
                        ? actionId.replace('touch-', '').replace('-balloon', '').toUpperCase()
                        : actionId.includes('find-') ? actionId.replace('find-', '').toUpperCase() : 'Start'}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>{memoryQuestion.prompt}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {memoryQuestion.optionIds.map(colourId => (
                    <button
                      key={colourId}
                      type="button"
                      onClick={() => performAction(`memory-pad-${colourId}`)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,.25)',
                        background: colourHexById.get(colourId),
                        color: colourId === 'white' || colourId === 'yellow' ? '#111827' : '#fff',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {colourNameById.get(colourId)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => performAction('complete-memory-check')}
                  disabled={Object.keys(progress.memoryAnswers).length < COLOUR_MEMORY_QUESTIONS.length}
                  style={actionButtonStyle(Object.keys(progress.memoryAnswers).length >= COLOUR_MEMORY_QUESTIONS.length)}
                >
                  Finish Memory Game
                </button>
                <span>Score: {memoryScore.correct}/{memoryScore.total}</span>
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
                disabled={stageIndex === COLOUR_ADVENTURE_STAGES.length - 1 || !stageComplete}
                onClick={() => goToStage(stageIndex + 1)}
                style={navButtonStyle(stageIndex === COLOUR_ADVENTURE_STAGES.length - 1 || !stageComplete)}
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
  background: 'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)',
  color: 'white',
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
    background: disabled ? 'rgba(30,41,59,.45)' : 'rgba(124,58,237,.48)',
    color: disabled ? '#94a3b8' : '#fff7ed',
    fontWeight: 900,
    cursor: disabled ? 'default' : 'pointer',
  } as const;
}
