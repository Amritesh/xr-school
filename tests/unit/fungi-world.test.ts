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
    ['fungi-at-work', ['yeast', 'dough', 'role-bakery', 'role-medicine', 'role-compost']],
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
      return world.snapshot().growth;
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

    world.dispose();
  });

  it('projects useful, safety, quiz, completion, and sandbox state', () => {
    const world = createFungiWorld();
    world.setState({
      usefulRoleMatches: [
        { objectId: 'bread-mould', role: 'food' },
        { objectId: 'mushroom', role: 'medicine' },
      ],
      doughRise: 0.75,
      safetyDecisions: ['observe-without-touching-or-eating'],
      quizAnswers: [{
        questionId: 'q1', answer: 'spores', correct: true, independentTransfer: true,
      }],
      completed: true,
      sandboxEnabled: true,
      sandboxTemperatureC: 24,
      sandboxMoisturePercent: 82,
    });

    expect(world.targets.dough.scale.y).toBeCloseTo(1.6);
    expect(world.targets['safety-warning'].userData.resolved).toBe(true);
    expect(world.targets['quiz-mushroom-1'].userData.correct).toBe(true);
    world.setStage('forest-circle');
    expect(isEffectivelyVisible(world.targets['completion-badge'])).toBe(true);
    expect(isEffectivelyVisible(world.targets['sandbox-temperature'])).toBe(true);
    expect(world.snapshot()).toMatchObject({ completed: true, sandboxEnabled: true });

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
