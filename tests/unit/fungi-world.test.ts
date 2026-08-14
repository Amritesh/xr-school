import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  FUNGI_STAGE_IDS,
  FUNGI_TARGET_IDS,
  createFungiWorld,
} from '../../apps/web/lib/world-builder/fungiWorld';

function worldPosition(object: THREE.Object3D) {
  return object.getWorldPosition(new THREE.Vector3()).toArray();
}

function isEffectivelyVisible(object: THREE.Object3D) {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (!cursor.visible) return false;
    cursor = cursor.parent;
  }
  return true;
}

describe('procedural fungi forest world', () => {
  it('exposes the exact seven stages and stable authored targets', () => {
    const world = createFungiWorld();

    expect(FUNGI_STAGE_IDS).toEqual([
      'fungal-forensics',
      'under-the-cap',
      'spore-flight',
      'five-day-time-lens',
      'fungi-at-work',
      'food-safety-scan',
      'forest-circle',
    ]);
    expect(Object.keys(world.targets)).toEqual([...FUNGI_TARGET_IDS]);
    expect(world.root).toBeInstanceOf(THREE.Group);
    expect(world.root.name).toBe('fungi-living-mycelium-world');

    world.dispose();
  });

  it('builds the same layout for the same seed and changes it for another seed', () => {
    const first = createFungiWorld({ seed: 7123 });
    const second = createFungiWorld({ seed: 7123 });
    const other = createFungiWorld({ seed: 7124 });
    const stableIds = ['mushroom', 'bread-mould', 'green-plant'] as const;

    expect(stableIds.map(id => worldPosition(first.targets[id])))
      .toEqual(stableIds.map(id => worldPosition(second.targets[id])));
    expect(first.snapshot().layoutSignature).toBe(second.snapshot().layoutSignature);
    expect(first.snapshot().layoutSignature).not.toBe(other.snapshot().layoutSignature);

    first.dispose();
    second.dispose();
    other.dispose();
  });

  it.each([
    ['fungal-forensics', ['mushroom', 'bread-mould', 'green-plant']],
    ['under-the-cap', ['hypha-tip-alpha', 'hypha-tip-beta', 'hypha-tip-gamma', 'hypha-network-label']],
    ['spore-flight', ['spore-guide', 'spore-landing']],
    ['five-day-time-lens', ['day-1', 'day-2', 'day-3', 'day-4', 'day-5']],
    ['fungi-at-work', [
      'yeast', 'dough', 'dough-before', 'dough-after',
      'role-bakery', 'role-medicine', 'role-compost',
    ]],
    ['food-safety-scan', ['fresh-item', 'mouldy-item', 'safety-warning', 'mould-hidden-hyphae']],
    ['forest-circle', ['quiz-mushroom-1', 'quiz-mushroom-2', 'quiz-mushroom-3', 'quiz-mushroom-4']],
  ] as const)('shows only relevant targets during %s', (stage, visibleIds) => {
    const world = createFungiWorld();
    world.setStage(stage);

    for (const [id, target] of Object.entries(world.targets)) {
      expect(isEffectivelyVisible(target), id).toBe(visibleIds.includes(id as never));
    }

    world.dispose();
  });

  it('projects touched hyphae with non-colour shape cues and reveals completion anchor', () => {
    const world = createFungiWorld();
    world.setStage('under-the-cap');
    world.setState({ touchedHyphae: ['hypha-tip-alpha', 'hypha-tip-beta', 'hypha-tip-gamma'] });

    const snapshot = world.snapshot();
    expect(snapshot.touchedHyphae).toEqual(['hypha-tip-alpha', 'hypha-tip-beta', 'hypha-tip-gamma']);
    expect(world.targets['hypha-tip-alpha'].scale.x).toBeGreaterThan(1);
    expect(world.targets['hypha-tip-alpha'].userData.shapeCue).toBe('star-collar');
    expect(world.targets['hypha-network-label'].userData.complete).toBe(true);

    world.dispose();
  });

  it('projects days one through five as progressively richer growth geometry', () => {
    const world = createFungiWorld();
    world.setStage('five-day-time-lens');
    const samples = [1, 2, 3, 4, 5].map(day => {
      world.setState({ currentDay: day, visitedDays: [day] });
      const display = world.root.getObjectByName(`bread-growth-day-${day}`);
      expect(display, `day ${day} display`).toBeDefined();
      expect(isEffectivelyVisible(display!), `day ${day} display`).toBe(true);
      const visibleNames: string[] = [];
      display!.traverse(object => {
        if (object instanceof THREE.Mesh && isEffectivelyVisible(object)
          && object.userData.growthStructure) visibleNames.push(object.name);
      });
      return { ...world.snapshot().growth, visibleNames };
    });

    expect(samples.map(sample => sample.phase)).toEqual([
      'landed-spore',
      'hyphae-visible',
      'mycelium-spreading',
      'spore-structures',
      'spores-released',
    ]);
    expect(samples.map(sample => sample.visibleStructures)).toEqual([1, 5, 13, 21, 37]);
    expect(samples.map(sample => sample.coverage)).toEqual([0.04, 0.18, 0.46, 0.7, 0.92]);
    expect(samples.map(sample => sample.visibleNames.filter(name => name.includes('landed-spore')).length))
      .toEqual([1, 1, 1, 1, 1]);
    expect(samples.map(sample => sample.visibleNames.filter(name => name.includes('hypha-')).length))
      .toEqual([0, 4, 4, 4, 4]);
    expect(samples.map(sample => sample.visibleNames.filter(name => name.includes('mycelium-')).length))
      .toEqual([0, 0, 8, 8, 8]);
    expect(samples.map(sample => sample.visibleNames.filter(name => name.includes('sporangium-')).length))
      .toEqual([0, 0, 0, 8, 8]);
    expect(samples.map(sample => sample.visibleNames.filter(name => name.includes('released-spore-')).length))
      .toEqual([0, 0, 0, 0, 16]);

    world.dispose();
  });

  it('projects useful, safety, quiz, completion, and sandbox state', () => {
    const world = createFungiWorld();
    world.setState({
      usefulRoleMatches: [
        { objectId: 'yeast', role: 'food' },
        { objectId: 'antibiotic-producing-fungus', role: 'medicine' },
        { objectId: 'saprotrophic-fungus', role: 'decomposer' },
      ],
      doughRise: 0.75,
      safetyDecisions: ['observe-without-touching-or-eating'],
      quizAnswers: [{
        questionId: 'development-order-observation', answer: 'spores', correct: true, independentTransfer: true,
      }],
      completed: true,
      sandboxEnabled: true,
      sandboxTemperatureC: 24,
      sandboxMoisturePercent: 82,
    });

    expect(world.targets['role-bakery'].userData.matched).toBe(true);
    expect(world.targets['role-medicine'].userData.matched).toBe(true);
    expect(world.targets['role-compost'].userData.matched).toBe(true);
    expect(world.targets['role-bakery'].scale.x).toBeGreaterThan(1);

    const beforeInvalidPair = world.snapshot();
    expect(() => world.setState({
      usefulRoleMatches: [{ objectId: 'yeast', role: 'medicine' }],
    })).toThrow(/useful role match/i);
    expect(world.snapshot()).toEqual(beforeInvalidPair);
    expect(world.targets['role-medicine'].scale.x).toBeGreaterThan(1);
    expect(world.targets['role-compost'].scale.x).toBeGreaterThan(1);
    expect(world.targets['safety-warning'].userData.resolved).toBe(true);
    expect(world.targets['quiz-mushroom-1'].userData.correct).toBe(true);
    world.setStage('forest-circle');
    expect(isEffectivelyVisible(world.targets['completion-badge'])).toBe(true);
    expect(isEffectivelyVisible(world.targets['sandbox-temperature'])).toBe(true);
    expect(world.snapshot()).toMatchObject({ completed: true, sandboxEnabled: true });

    world.dispose();
  });

  it('projects the latest quiz retry by stable question ID without shifting mushrooms', () => {
    const world = createFungiWorld();
    world.setStage('forest-circle');
    world.setState({
      quizAnswers: [
        {
          questionId: 'development-order-observation', answer: 'wrong',
          correct: false, independentTransfer: false,
        },
        {
          questionId: 'baking-fungus-observation', answer: 'yeast',
          correct: true, independentTransfer: false,
        },
        {
          questionId: 'development-order-observation', answer: 'correct-order',
          correct: true, independentTransfer: false,
        },
      ],
    });

    expect(world.targets['quiz-mushroom-1'].userData.correct).toBe(true);
    expect(world.targets['quiz-mushroom-2'].userData.correct).toBe(true);
    expect(world.targets['quiz-mushroom-3'].userData.correct).toBeUndefined();
    expect(world.targets['quiz-mushroom-4'].userData.correct).toBeUndefined();
    expect(world.targets['quiz-mushroom-1'].scale.x).toBeCloseTo(1.12);
    expect(world.targets['quiz-mushroom-2'].scale.x).toBeCloseTo(1.12);
    expect(() => world.setState({ quizAnswers: [{
      questionId: 'unknown-question', answer: 'x', correct: true, independentTransfer: false,
    }] })).toThrow(/question ID/i);

    world.dispose();
  });

  it('rejects prototype quiz IDs atomically and recovers with a valid projection', () => {
    const world = createFungiWorld();
    world.setStage('forest-circle');
    const before = world.snapshot();

    for (const questionId of ['toString', '__proto__']) {
      expect(() => world.setState({ quizAnswers: [{
        questionId, answer: 'prototype-value', correct: true, independentTransfer: false,
      }] })).toThrow(/quiz question ID is invalid/i);
      expect(world.snapshot()).toEqual(before);
      expect(world.targets['quiz-mushroom-1'].userData.correct).toBeUndefined();
      expect(world.targets['quiz-mushroom-2'].userData.correct).toBeUndefined();
      expect(world.targets['quiz-mushroom-3'].userData.correct).toBeUndefined();
      expect(world.targets['quiz-mushroom-4'].userData.correct).toBeUndefined();
    }

    world.setState({ quizAnswers: [{
      questionId: 'forest-transfer', answer: 'warm-damp-surface',
      correct: true, independentTransfer: true,
    }] });
    expect(world.targets['quiz-mushroom-4'].userData.correct).toBe(true);
    expect(world.targets['quiz-mushroom-1'].userData.correct).toBeUndefined();

    world.dispose();
  });

  it('shows before and risen dough side by side with observably different bounds', () => {
    const world = createFungiWorld();
    world.setStage('fungi-at-work');
    world.setState({ doughRisen: true });

    const before = world.targets['dough-before'];
    const after = world.targets['dough-after'];
    expect(isEffectivelyVisible(before)).toBe(true);
    expect(isEffectivelyVisible(after)).toBe(true);
    const beforeBounds = new THREE.Box3().setFromObject(before).getSize(new THREE.Vector3());
    const afterBounds = new THREE.Box3().setFromObject(after).getSize(new THREE.Vector3());
    expect(afterBounds.y).toBeGreaterThan(beforeBounds.y * 1.35);
    expect(after.getObjectByName('risen-dough-bubbles')).toBeDefined();
    expect(after.position.x).toBeGreaterThan(before.position.x);

    world.dispose();
  });

  it('authors visible safe and unsafe symbol geometry plus readable plaques', () => {
    const world = createFungiWorld();
    world.setStage('food-safety-scan');
    const visibleMeshNames = (target: THREE.Object3D) => {
      const names: string[] = [];
      target.traverse(object => {
        if (object instanceof THREE.Mesh && isEffectivelyVisible(object)
          && (object.material as THREE.Material).visible) names.push(object.name);
      });
      return names;
    };

    expect(visibleMeshNames(world.targets['fresh-item'])).toEqual(expect.arrayContaining([
      'safe-check-short-stroke',
      'safe-check-long-stroke',
      'safe-label-plaque',
    ]));
    expect(visibleMeshNames(world.targets['safety-warning'])).toEqual(expect.arrayContaining([
      'unsafe-warning-triangle',
      'unsafe-exclamation-stem',
      'unsafe-exclamation-dot',
      'unsafe-label-plaque',
    ]));
    expect(world.targets['fresh-item'].getObjectByName('safe-label-plaque')?.userData.text)
      .toBe('Fresh: check before using');
    expect(world.targets['safety-warning'].getObjectByName('unsafe-label-plaque')?.userData.text)
      .toBe('Mouldy: do not touch or eat');

    world.dispose();
  });

  it('freezes motion while paused or reduced-motion is active', () => {
    const world = createFungiWorld();
    world.setStage('spore-flight');
    const start = world.snapshot().sporeOffset;
    world.update(0.25, 0.25);
    const moving = world.snapshot().sporeOffset;
    expect(moving).not.toBe(start);

    world.pause();
    world.update(0.25, 0.5);
    expect(world.snapshot().sporeOffset).toBe(moving);
    world.resume();
    world.setReducedMotion(true);
    world.update(0.25, 0.75);
    expect(world.snapshot().sporeOffset).toBe(moving);
    world.setReducedMotion(false);
    world.update(0.25, 1);
    expect(world.snapshot().sporeOffset).not.toBe(moving);

    world.dispose();
  });

  it('updates ambient phase numerically from deterministic elapsed motion', () => {
    const world = createFungiWorld();
    expect(world.snapshot().ambientPhase).toBe(0);

    world.update(0.25, 0.25);
    expect(typeof world.snapshot().ambientPhase).toBe('number');
    expect(world.snapshot().ambientPhase).toBeCloseTo(Math.sin(0.25 * 0.7) * 0.12, 12);
    world.update(0.5, 0.75);
    expect(world.snapshot().ambientPhase).toBeCloseTo(Math.sin(0.75 * 0.7) * 0.12, 12);

    world.dispose();
  });

  it('keeps hit volumes and mist out of shadows while solids remain grounded', () => {
    const world = createFungiWorld();
    const hitVolumes: THREE.Mesh[] = [];
    const mistMeshes: THREE.Mesh[] = [];
    world.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name.endsWith('-hit-volume')) hitVolumes.push(object);
      if (object.name.startsWith('cool-mist-layer-')) mistMeshes.push(object);
    });

    expect(hitVolumes).toHaveLength(FUNGI_TARGET_IDS.length);
    expect(hitVolumes.every(mesh => !mesh.castShadow && !mesh.receiveShadow)).toBe(true);
    expect(mistMeshes).toHaveLength(3);
    expect(mistMeshes.every(mesh => !mesh.castShadow && !mesh.receiveShadow)).toBe(true);
    const mushroomSolid = world.targets.mushroom.children.find(object =>
      object instanceof THREE.Group,
    )?.children.find(object => object instanceof THREE.Mesh) as THREE.Mesh;
    const log = world.root.getObjectByName('fallen-log') as THREE.Mesh;
    expect(mushroomSolid.castShadow).toBe(true);
    expect(mushroomSolid.receiveShadow).toBe(true);
    expect(log.castShadow).toBe(true);
    expect(log.receiveShadow).toBe(true);

    world.dispose();
  });

  it('rejects unsupported stages and invalid numeric/domain projections', () => {
    const world = createFungiWorld();

    expect(() => world.setStage('not-a-stage' as never)).toThrow(/stage/i);
    expect(() => world.setState({ currentDay: 0 })).toThrow(/day/i);
    expect(() => world.setState({ currentDay: 2.5 })).toThrow(/integer/i);
    expect(() => world.setState({ doughRise: Number.NaN })).toThrow(/dough/i);
    expect(() => world.setState({ sandboxMoisturePercent: 101 })).toThrow(/moisture/i);
    expect(() => world.update(-1, 0)).toThrow(/delta/i);
    expect(() => world.update(0.1, Number.POSITIVE_INFINITY)).toThrow(/elapsed/i);

    world.dispose();
  });

  it('stays within the Quest draw-call and visible-triangle budget in every stage', () => {
    const world = createFungiWorld({ profile: 'questBaseline' });

    for (const stage of FUNGI_STAGE_IDS) {
      world.setStage(stage);
      if (stage === 'five-day-time-lens') world.setState({ currentDay: 5 });
      if (stage === 'fungi-at-work') world.setState({
        doughRisen: true,
        usefulRoleMatches: [
          { objectId: 'yeast', role: 'food' },
          { objectId: 'antibiotic-producing-fungus', role: 'medicine' },
          { objectId: 'saprotrophic-fungus', role: 'decomposer' },
        ],
      });
      if (stage === 'forest-circle') world.setState({ completed: true, sandboxEnabled: true });
      const metrics = world.metrics();
      expect(metrics.drawCalls, stage).toBeLessThanOrEqual(120);
      expect(metrics.visibleTriangles, stage).toBeLessThanOrEqual(250_000);
    }

    world.dispose();
  });

  it('disposes each owned resource exactly once and remains idempotent', () => {
    const world = createFungiWorld();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    world.root.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        geometries.add(object.geometry);
        const entries = Array.isArray(object.material) ? object.material : [object.material];
        entries.forEach(material => materials.add(material));
      }
    });
    const spies = [...geometries, ...materials].map(resource => vi.spyOn(resource, 'dispose'));

    world.dispose();
    world.dispose();

    expect(spies.length).toBeGreaterThan(0);
    spies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    expect(world.snapshot().disposed).toBe(true);
    expect(world.root.parent).toBeNull();
  });
});
