'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { computeFocusFrame, createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';

const CATEGORIES = [
  { id: 'plant', label: 'Plant source', color: '#4ade80', threeColor: 0x4ade80, cue: 'Fields, trees, grains, pulses, fruits, vegetables, oils, and spices.' },
  { id: 'animal', label: 'Animal source', color: '#fb7185', threeColor: 0xfb7185, cue: 'Milk, eggs, fish, meat, and honey come from animals or animal activity.' },
  { id: 'fungal', label: 'Fungal source', color: '#c084fc', threeColor: 0xc084fc, cue: 'Mushrooms are fungi, not plants, even though they grow from soil or compost.' },
] as const;

const ITEMS = [
  { id: 'rice', label: 'Rice', source: 'plant', clue: 'A grain harvested from a paddy plant.' },
  { id: 'tomato', label: 'Tomato', source: 'plant', clue: 'A fruit from a flowering plant.' },
  { id: 'dal', label: 'Dal', source: 'plant', clue: 'A pulse from legume seeds.' },
  { id: 'milk', label: 'Milk', source: 'animal', clue: 'Produced by cows, buffaloes, goats, and other mammals.' },
  { id: 'egg', label: 'Egg', source: 'animal', clue: 'Laid by hens and other birds.' },
  { id: 'honey', label: 'Honey', source: 'animal', clue: 'Made by bees from flower nectar.' },
  { id: 'fish', label: 'Fish', source: 'animal', clue: 'Food from an aquatic animal.' },
  { id: 'mushroom', label: 'Mushroom', source: 'fungal', clue: 'The visible fruiting body of a fungus.' },
] as const;

const STAGES = [
  { title: 'Inspect', cue: 'Read the clue on each food token before sorting.' },
  { title: 'Plant Sources', cue: 'Look for grains, pulses, fruits, vegetables, oils, and spices.' },
  { title: 'Animal Sources', cue: 'Look for milk, eggs, fish, honey, and other animal products.' },
  { title: 'Review', cue: 'Fix any misplaced tokens and explain one tricky source.' },
] as const;

const NARRATIONS = STAGES.map(stage => `${stage.title}. ${stage.cue}`);

const NARRATION_AUDIO_URLS = [
  '/audio/food-sources/stage-01.mp3',
  '/audio/food-sources/stage-02.mp3',
  '/audio/food-sources/stage-03.mp3',
  '/audio/food-sources/stage-04.mp3',
];

type CategoryId = (typeof CATEGORIES)[number]['id'];
type ItemId = (typeof ITEMS)[number]['id'];
type Assignments = Partial<Record<ItemId, CategoryId>>;

const ITEM_AUDIO_URLS: Record<ItemId, string> = {
  rice: '/audio/food-sources/item-rice.mp3',
  tomato: '/audio/food-sources/item-tomato.mp3',
  dal: '/audio/food-sources/item-dal.mp3',
  milk: '/audio/food-sources/item-milk.mp3',
  egg: '/audio/food-sources/item-egg.mp3',
  honey: '/audio/food-sources/item-honey.mp3',
  fish: '/audio/food-sources/item-fish.mp3',
  mushroom: '/audio/food-sources/item-mushroom.mp3',
};

const ASSIGNMENT_AUDIO_URLS: Record<`${ItemId}-${CategoryId}`, string> = {
  'rice-plant': '/audio/food-sources/assign-rice-plant.mp3',
  'rice-animal': '/audio/food-sources/assign-rice-animal.mp3',
  'rice-fungal': '/audio/food-sources/assign-rice-fungal.mp3',
  'tomato-plant': '/audio/food-sources/assign-tomato-plant.mp3',
  'tomato-animal': '/audio/food-sources/assign-tomato-animal.mp3',
  'tomato-fungal': '/audio/food-sources/assign-tomato-fungal.mp3',
  'dal-plant': '/audio/food-sources/assign-dal-plant.mp3',
  'dal-animal': '/audio/food-sources/assign-dal-animal.mp3',
  'dal-fungal': '/audio/food-sources/assign-dal-fungal.mp3',
  'milk-plant': '/audio/food-sources/assign-milk-plant.mp3',
  'milk-animal': '/audio/food-sources/assign-milk-animal.mp3',
  'milk-fungal': '/audio/food-sources/assign-milk-fungal.mp3',
  'egg-plant': '/audio/food-sources/assign-egg-plant.mp3',
  'egg-animal': '/audio/food-sources/assign-egg-animal.mp3',
  'egg-fungal': '/audio/food-sources/assign-egg-fungal.mp3',
  'honey-plant': '/audio/food-sources/assign-honey-plant.mp3',
  'honey-animal': '/audio/food-sources/assign-honey-animal.mp3',
  'honey-fungal': '/audio/food-sources/assign-honey-fungal.mp3',
  'fish-plant': '/audio/food-sources/assign-fish-plant.mp3',
  'fish-animal': '/audio/food-sources/assign-fish-animal.mp3',
  'fish-fungal': '/audio/food-sources/assign-fish-fungal.mp3',
  'mushroom-plant': '/audio/food-sources/assign-mushroom-plant.mp3',
  'mushroom-animal': '/audio/food-sources/assign-mushroom-animal.mp3',
  'mushroom-fungal': '/audio/food-sources/assign-mushroom-fungal.mp3',
};

const categoryById = Object.fromEntries(CATEGORIES.map(category => [category.id, category])) as Record<CategoryId, (typeof CATEGORIES)[number]>;
const itemById = Object.fromEntries(ITEMS.map(item => [item.id, item])) as Record<ItemId, (typeof ITEMS)[number]>;

function score(assignments: Assignments) {
  const correct = ITEMS.filter(item => assignments[item.id] === item.source).length;
  const placed = Object.keys(assignments).length;
  const misplaced = ITEMS.filter(item => assignments[item.id] && assignments[item.id] !== item.source);
  return { correct, placed, misplaced, total: ITEMS.length, percent: Math.round((correct / ITEMS.length) * 100) };
}

function tokenPosition(itemIndex: number, assignments: Assignments) {
  const item = ITEMS[itemIndex];
  const assigned = assignments[item.id];
  if (!assigned) {
    const x = -1.75 + (itemIndex % 4) * 1.15;
    const z = itemIndex < 4 ? 1.1 : 1.85;
    return new THREE.Vector3(x, 0.55, z);
  }

  const categoryIndex = CATEGORIES.findIndex(category => category.id === assigned);
  const siblings = ITEMS.filter(food => assignments[food.id] === assigned);
  const siblingIndex = siblings.findIndex(food => food.id === item.id);
  return new THREE.Vector3(-2.05 + categoryIndex * 2.05 + (siblingIndex % 2) * 0.42, 0.72, -0.9 + Math.floor(siblingIndex / 2) * 0.42);
}

function makeLabelTexture(label: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.82 }));
}

function assignmentAudioUrl(itemId: ItemId, categoryId: CategoryId) {
  return ASSIGNMENT_AUDIO_URLS[`${itemId}-${categoryId}`];
}

export default function FoodSourcesSortingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tokenRefs = useRef<THREE.Mesh[]>([]);
  const platformRefs = useRef<THREE.Mesh[]>([]);
  const assignmentRef = useRef<Assignments>({});
  const selectedItemRef = useRef<ItemId>('rice');
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<ItemId>('rice');
  const [assignments, setAssignments] = useState<Assignments>({});

  const result = useMemo(() => score(assignments), [assignments]);
  const selectedItem = itemById[selectedItemId];

  useEffect(() => {
    assignmentRef.current = assignments;
  }, [assignments]);

  useEffect(() => {
    selectedItemRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10140f);
    scene.fog = new THREE.Fog(0x10140f, 8, 18);

    const camera = new THREE.PerspectiveCamera(64, mount.clientWidth / mount.clientHeight, 0.05, 50);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    guidedCamera.focusOn(
      { position: new THREE.Vector3(0, 3.6, 5.4), target: new THREE.Vector3(0, 0.7, 0) },
      { animate: false },
    );

    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x172013, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    scene.add(key);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x172013, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const table = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.25, 3.9), new THREE.MeshStandardMaterial({ color: 0x4b3b2a, roughness: 0.65 }));
    table.position.y = 0.32;
    table.receiveShadow = true;
    scene.add(table);

    platformRefs.current = CATEGORIES.map((category, index) => {
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.12, 1.15),
        new THREE.MeshStandardMaterial({ color: category.threeColor, transparent: true, opacity: 0.42, roughness: 0.45 })
      );
      platform.name = `food-platform-${category.id}`;
      platform.position.set(-2.05 + index * 2.05, 0.53, -1.05);
      scene.add(platform);

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(1.25, 0.5),
        new THREE.MeshBasicMaterial({ map: makeLabelTexture(category.label.replace(' source', ''), category.color) })
      );
      label.position.set(platform.position.x, 0.62, -1.85);
      label.rotation.x = -0.3;
      scene.add(label);
      return platform;
    });

    const tokenGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 32);
    tokenRefs.current = ITEMS.map((item, index) => {
      const token = new THREE.Mesh(tokenGeometry, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
      token.name = `food-token-${item.id}`;
      token.castShadow = true;
      token.position.copy(tokenPosition(index, assignmentRef.current));
      scene.add(token);

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.72, 0.32),
        new THREE.MeshBasicMaterial({ map: makeLabelTexture(item.label, '#facc15') })
      );
      label.position.set(0, 0.19, 0);
      label.rotation.x = -Math.PI / 2;
      token.add(label);
      return token;
    });

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    controller0.add(makeControllerRay());
    controller1.add(makeControllerRay());
    scene.add(controller0, controller1);

    // ── Selection: one shared raycasting/highlight system for mouse + XR.
    // Lets desktop learners click tokens and platforms directly ──────────
    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [controller0, controller1],
      onSelect: (id, object) => {
        if (id.startsWith('food-token-')) {
          const itemId = id.replace('food-token-', '') as ItemId;
          const item = itemById[itemId];
          if (!item) return;
          selectedItemRef.current = itemId;
          setSelectedItemId(itemId);
          void playSimulationNarration(`${item.label}. ${item.clue}`, ITEMS.findIndex(option => option.id === itemId), ITEM_AUDIO_URLS[itemId]);
        } else if (id.startsWith('food-platform-')) {
          const categoryId = id.replace('food-platform-', '') as CategoryId;
          const itemId = selectedItemRef.current;
          const item = itemById[itemId];
          const category = categoryById[categoryId];
          if (!item || !category) return;
          setAssignments(current => ({ ...current, [itemId]: categoryId }));
          const cueIndex = CATEGORIES.findIndex(option => option.id === categoryId);
          void playSimulationNarration(
            `${item.label}. ${item.clue} You placed it in ${category.label}. ${categoryId === item.source ? 'That is correct.' : `Check again: it belongs to ${categoryById[item.source].label}.`}`,
            cueIndex,
            assignmentAudioUrl(itemId, categoryId)
          );
        }
        interactionSystem.setSelected(id);
        guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 3.2 }));
      },
    });
    for (const token of tokenRefs.current) {
      interactionSystem.register(token.name, token, { highlightColor: '#facc15' });
    }
    for (const platform of platformRefs.current) {
      const categoryId = platform.name.replace('food-platform-', '') as CategoryId;
      interactionSystem.register(platform.name, platform, { highlightColor: categoryById[categoryId].color });
    }

    const clock = new THREE.Clock();
    let elapsedTotal = 0;
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      elapsedTotal += delta;
      const elapsed = elapsedTotal;
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      tokenRefs.current.forEach((token, index) => {
        const target = tokenPosition(index, assignmentRef.current);
        token.position.lerp(target, 0.08);
        token.rotation.y = Math.sin(elapsed * 1.4 + index) * 0.08;
        const item = ITEMS[index];
        const category = assignmentRef.current[item.id];
        const material = token.material as THREE.MeshStandardMaterial;
        if (!category) {
          material.color.setHex(0xf8fafc);
          material.emissive.setHex(0x000000);
        } else if (category === item.source) {
          material.color.setHex(categoryById[category].threeColor);
          material.emissive.setHex(categoryById[category].threeColor);
          material.emissiveIntensity = 0.22;
        } else {
          material.color.setHex(0xf97316);
          material.emissive.setHex(0xf97316);
          material.emissiveIntensity = 0.28;
        }
      });
      renderer.render(scene, camera);
    });

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      interactionSystem.dispose();
      guidedCamera.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      tokenRefs.current = [];
      platformRefs.current = [];
      stopSimulationNarration();
    };
  }, []);

  function assignItemToCategory(itemId: ItemId, categoryId: CategoryId) {
    const item = itemById[itemId];
    const category = categoryById[categoryId];
    selectedItemRef.current = itemId;
    setSelectedItemId(itemId);
    setAssignments(current => ({ ...current, [itemId]: categoryId }));
    void playSimulationNarration(
      `${item.label}. ${item.clue} You placed it in ${category.label}. ${categoryId === item.source ? 'That is correct.' : `Check again: it belongs to ${categoryById[item.source].label}.`}`,
      CATEGORIES.findIndex(option => option.id === categoryId),
      assignmentAudioUrl(itemId, categoryId)
    );
  }

  function assign(categoryId: CategoryId) {
    assignItemToCategory(selectedItemRef.current, categoryId);
  }

  function reset() {
    setAssignments({});
    assignmentRef.current = {};
    selectedItemRef.current = 'rice';
    setSelectedItemId('rice');
    setStageIndex(0);
    void playSimulationNarration(NARRATIONS[0], 0, NARRATION_AUDIO_URLS[0]);
  }

  function startExperience() {
    setStarted(true);
    void playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex]);
  }

  function setFoodStage(index: number) {
    setStageIndex(index);
    void playSimulationNarration(NARRATIONS[index], index, NARRATION_AUDIO_URLS[index]);
  }

  function selectFoodItem(itemId: ItemId) {
    const item = itemById[itemId];
    selectedItemRef.current = itemId;
    setSelectedItemId(itemId);
    void playSimulationNarration(`${item.label}. ${item.clue}`, ITEMS.findIndex(option => option.id === itemId), ITEM_AUDIO_URLS[itemId]);
  }

  async function enterVr() {
    setStarted(true);
    void playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex]);
    const renderer = rendererRef.current;
    if (!renderer || !navigator.xr) return;
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    await renderer.xr.setSession(session);
  }

  return (
    <>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      {!started && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 50% 20%, rgba(38,61,35,0.92), rgba(16,20,15,0.96) 62%)' }}>
        <div style={{ maxWidth: 680, color: '#f8fafc', textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#86efac', fontWeight: 800, marginBottom: 16 }}>Class 6 Science</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1, margin: 0 }}>Sources of Food Sorting Lab</h1>
          <p style={{ color: '#cbd5c4', fontSize: '1.08rem', lineHeight: 1.6, margin: '22px auto 30px' }}>Inspect everyday foods, sort them by plant, animal, or fungal source, and correct misconceptions with immediate visual feedback.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={startExperience} style={buttonStyle('#4ade80', '#102017')}>View in Browser</button>
            <button onClick={enterVr} disabled={!vrSupported} style={buttonStyle(vrSupported ? '#facc15' : '#4b5563', '#111827')}>{vrSupported ? 'Enter VR' : 'VR unavailable'}</button>
          </div>
        </div>
      </div>
      )}
      {started && (
      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ color: '#86efac', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Sources of Food</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, lineHeight: 1.1 }}>{STAGES[stageIndex].title}</h2>
          </div>
          <strong style={{ color: '#facc15' }}>{result.correct}/{result.total}</strong>
        </div>
        <p style={{ margin: '12px 0', color: '#cbd5c4', lineHeight: 1.45 }}>{STAGES[stageIndex].cue}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
          {STAGES.map((stage, index) => (
            <button key={stage.title} onClick={() => setFoodStage(index)} style={smallButtonStyle(index === stageIndex ? '#86efac' : '#1f2937', index === stageIndex ? '#102017' : '#f8fafc')}>{stage.title}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
          {ITEMS.map(item => (
            <button key={item.id} onClick={() => selectFoodItem(item.id)} style={smallButtonStyle(item.id === selectedItemId ? '#facc15' : '#24301f', item.id === selectedItemId ? '#1f1600' : '#f8fafc')}>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12, background: 'rgba(0,0,0,0.18)', marginBottom: 12 }}>
          <strong>{selectedItem.label}</strong>
          <p style={{ margin: '6px 0 0', color: '#cbd5c4', lineHeight: 1.4 }}>{selectedItem.clue}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {CATEGORIES.map(category => (
            <button key={category.id} onClick={() => assign(category.id)} title={category.cue} style={smallButtonStyle(category.color, '#10140f')}>{category.label.replace(' source', '')}</button>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <span style={{ color: result.misplaced.length ? '#fb923c' : '#86efac', fontSize: 13 }}>{result.placed} placed · {result.percent}% correct</span>
          <button onClick={reset} style={smallButtonStyle('#334155', '#f8fafc')}>Reset</button>
        </div>
      </section>
      )}
    </>
  );
}

function buttonStyle(background: string, color: string): CSSProperties {
  return {
    border: 0,
    borderRadius: 8,
    padding: '12px 18px',
    background,
    color,
    fontWeight: 800,
    cursor: 'pointer',
  };
}

function smallButtonStyle(background: string, color: string): CSSProperties {
  return {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 7,
    padding: '8px 9px',
    background,
    color,
    fontWeight: 800,
    cursor: 'pointer',
    minHeight: 36,
  };
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  right: 18,
  top: 18,
  width: 'min(430px, calc(100vw - 36px))',
  maxHeight: 'calc(100vh - 36px)',
  overflowY: 'auto',
  borderRadius: 8,
  padding: 16,
  background: 'rgba(12, 18, 11, 0.88)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#f8fafc',
  backdropFilter: 'blur(12px)',
};
