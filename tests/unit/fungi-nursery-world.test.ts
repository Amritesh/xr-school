import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { evaluateFungalExperiment } from '@xr-school/simulation-runtime';
import type { FungalExperimentOutput } from '@xr-school/simulation-runtime';
import {
  FUNGI_MISSIONS,
  type FungiLandmarkId,
  type FungiMissionId,
} from '../../apps/web/lib/fungi/fungiExperienceDirector';
import {
  FUNGI_NURSERY_LANDMARK_IDS,
  createFungiNurseryWorld,
  type FungiNurseryWorldProjection,
} from '../../apps/web/lib/world-builder/fungiNurseryWorld';

const DORMANT = evaluateFungalExperiment({
  temperatureC: 6,
  moisturePercent: 14,
  substrate: 'dry-paper',
  elapsedHours: 6,
  inoculumViability: 0.9,
});

const SPORULATING = evaluateFungalExperiment({
  temperatureC: 27,
  moisturePercent: 88,
  substrate: 'bread',
  elapsedHours: 120,
  inoculumViability: 1,
});

function projection(
  overrides: Partial<FungiNurseryWorldProjection> = {},
): FungiNurseryWorldProjection {
  return {
    missionId: 'diagnose',
    growth: DORMANT,
    airflow: { directionRadians: 0, strength: 0 },
    spore: { released: false, position: [0, 1, 0], outcome: 'pending' },
    yeast: { temperatureC: 20, elapsedHours: 0, inoculated: false },
    litter: { temperatureC: 20, elapsedHours: 0, initialLitterMassGrams: 120 },
    safetyScanDepth: 0,
    highlightedEvidenceIds: [],
    ...overrides,
  };
}

function boundsOf(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

function isAttachedTo(object: THREE.Object3D, root: THREE.Object3D) {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor === root) return true;
    cursor = cursor.parent;
  }
  return false;
}

describe('createFungiNurseryWorld', () => {
  it('presents every landmark of the clearing at once, spatially separated', () => {
    const world = createFungiNurseryWorld();
    world.project(projection());

    expect([...FUNGI_NURSERY_LANDMARK_IDS].sort()).toEqual(
      [...new Set(FUNGI_MISSIONS.map((mission) => mission.persistentLandmarkId))].sort(),
    );

    const boxes = new Map<FungiLandmarkId, THREE.Box3>();
    for (const id of FUNGI_NURSERY_LANDMARK_IDS) {
      const landmark = world.landmarks[id];
      expect(landmark, `${id} missing`).toBeDefined();
      expect(isAttachedTo(landmark, world.root)).toBe(true);
      expect(landmark.visible).toBe(true);
      const box = boundsOf(landmark);
      expect(box.isEmpty(), `${id} rendered nothing`).toBe(false);
      boxes.set(id, box);
    }

    const ids = [...FUNGI_NURSERY_LANDMARK_IDS];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = boxes.get(ids[i]!)!;
        const b = boxes.get(ids[j]!)!;
        expect(
          a.intersectsBox(b),
          `${ids[i]} overlaps ${ids[j]}`,
        ).toBe(false);
      }
    }
    world.dispose();
  });

  it('never removes or hides a landmark as missions change', () => {
    const world = createFungiNurseryWorld();
    const before = new Map<FungiLandmarkId, THREE.Object3D>();
    world.project(projection());
    for (const id of FUNGI_NURSERY_LANDMARK_IDS) before.set(id, world.landmarks[id]);

    const missionIds: FungiMissionId[] = FUNGI_MISSIONS.map((mission) => mission.id);
    for (const missionId of [...missionIds, ...missionIds.slice().reverse()]) {
      world.project(projection({ missionId }));
      for (const id of FUNGI_NURSERY_LANDMARK_IDS) {
        const landmark = world.landmarks[id];
        expect(landmark, `${id} replaced during ${missionId}`).toBe(before.get(id));
        expect(isAttachedTo(landmark, world.root), `${id} detached during ${missionId}`).toBe(true);
        expect(landmark.visible, `${id} hidden during ${missionId}`).toBe(true);
      }
    }
    world.dispose();
  });

  it('grows visible colony structure only as the biological model does', () => {
    const world = createFungiNurseryWorld();

    world.project(projection({ growth: DORMANT }));
    const dormant = world.snapshot();

    world.project(projection({ growth: SPORULATING }));
    const sporulating = world.snapshot();

    expect(SPORULATING.colonyRadiusMm).toBeGreaterThan(DORMANT.colonyRadiusMm);
    expect(sporulating.colony.radiusMm).toBeGreaterThan(dormant.colony.radiusMm);
    expect(sporulating.colony.visibleBranches).toBeGreaterThan(dormant.colony.visibleBranches);
    expect(sporulating.colony.visibleSporangia).toBeGreaterThan(dormant.colony.visibleSporangia);
    expect(sporulating.colony.releasedSpores).toBeGreaterThan(dormant.colony.releasedSpores);
    expect(sporulating.colony.coverage).toBeGreaterThan(dormant.colony.coverage);
    world.dispose();
  });

  it('renders a monotonic colony across a continuous growth series', () => {
    const world = createFungiNurseryWorld();
    const radii: number[] = [];
    const branches: number[] = [];

    for (const elapsedHours of [0, 12, 36, 72, 120]) {
      const growth: FungalExperimentOutput = evaluateFungalExperiment({
        temperatureC: 25,
        moisturePercent: 80,
        substrate: 'bread',
        elapsedHours,
        inoculumViability: 0.95,
      });
      world.project(projection({ missionId: 'growth-chamber', growth }));
      radii.push(world.snapshot().colony.radiusMm);
      branches.push(world.snapshot().colony.visibleBranches);
    }

    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(branches).toEqual([...branches].sort((a, b) => a - b));
    expect(new Set(radii).size).toBeGreaterThan(3);
    world.dispose();
  });

  it('raises the yeast dough above its no-yeast control only when inoculated and warm', () => {
    const world = createFungiNurseryWorld();

    world.project(
      projection({
        missionId: 'useful-fungi',
        yeast: { temperatureC: 30, elapsedHours: 0, inoculated: true },
      }),
    );
    const atStart = world.snapshot().yeast;
    expect(atStart.doughVolumeMl).toBeCloseTo(atStart.controlVolumeMl, 6);

    world.project(
      projection({
        missionId: 'useful-fungi',
        yeast: { temperatureC: 30, elapsedHours: 6, inoculated: true },
      }),
    );
    const risen = world.snapshot().yeast;
    expect(risen.doughVolumeMl).toBeGreaterThan(risen.controlVolumeMl);
    expect(risen.doughMeshScale).toBeGreaterThan(risen.controlMeshScale);

    world.project(
      projection({
        missionId: 'useful-fungi',
        yeast: { temperatureC: 30, elapsedHours: 6, inoculated: false },
      }),
    );
    const uninoculated = world.snapshot().yeast;
    expect(uninoculated.doughVolumeMl).toBeCloseTo(uninoculated.controlVolumeMl, 6);
    world.dispose();
  });

  it('consumes litter mass while releasing visible nutrient markers', () => {
    const world = createFungiNurseryWorld();

    world.project(
      projection({
        missionId: 'useful-fungi',
        litter: { temperatureC: 26, elapsedHours: 0, initialLitterMassGrams: 120 },
      }),
    );
    const fresh = world.snapshot().decomposition;

    world.project(
      projection({
        missionId: 'useful-fungi',
        litter: { temperatureC: 26, elapsedHours: 96, initialLitterMassGrams: 120 },
      }),
    );
    const decomposed = world.snapshot().decomposition;

    expect(decomposed.remainingLitterMassGrams).toBeLessThan(fresh.remainingLitterMassGrams);
    expect(decomposed.releasedNutrientsGrams).toBeGreaterThan(fresh.releasedNutrientsGrams);
    expect(decomposed.visibleNutrientMarkers).toBeGreaterThan(fresh.visibleNutrientMarkers);
    expect(decomposed.litterMeshScale).toBeLessThan(fresh.litterMeshScale);
    world.dispose();
  });

  it('reveals hidden hyphae only as deep as the scanner has actually reached', () => {
    const world = createFungiNurseryWorld();

    world.project(projection({ missionId: 'safety', safetyScanDepth: 0 }));
    const unscanned = world.snapshot();

    world.project(projection({ missionId: 'safety', safetyScanDepth: 0.85 }));
    const scanned = world.snapshot();

    expect(unscanned.safety.revealedHyphae).toBe(0);
    expect(scanned.safety.revealedHyphae).toBeGreaterThan(0);
    expect(scanned.safety.revealDepth).toBeCloseTo(0.85, 6);
    world.dispose();
  });

  it('places a released spore where the flight actually ended', () => {
    const world = createFungiNurseryWorld();

    world.project(
      projection({
        missionId: 'spore-flight',
        spore: { released: true, position: [-1.25, 1.4, -0.5], outcome: 'germinating' },
      }),
    );
    const snapshot = world.snapshot();

    expect(snapshot.spore.released).toBe(true);
    expect(snapshot.spore.outcome).toBe('germinating');
    expect(snapshot.spore.position[0]).toBeCloseTo(-1.25, 6);
    expect(snapshot.spore.position[1]).toBeCloseTo(1.4, 6);
    expect(snapshot.spore.position[2]).toBeCloseTo(-0.5, 6);
    world.dispose();
  });

  it('rejects an invalid projection before mutating anything', () => {
    const world = createFungiNurseryWorld();
    world.project(projection({ growth: SPORULATING, safetyScanDepth: 0.6 }));
    const before = world.snapshot();

    expect(() => world.project(projection({ missionId: 'nowhere' as FungiMissionId }))).toThrow(
      /mission/i,
    );
    expect(() => world.project(projection({ safetyScanDepth: Number.NaN }))).toThrow(/finite/i);
    expect(() =>
      world.project(projection({ safetyScanDepth: 4 })),
    ).toThrow(/scan depth/i);
    expect(() =>
      world.project(
        projection({ spore: { released: true, position: [0, 1] as never, outcome: 'dormant' } }),
      ),
    ).toThrow(/position/i);
    expect(() =>
      world.project(projection({ growth: { ...SPORULATING, colonyRadiusMm: -1 } })),
    ).toThrow(/growth/i);

    expect(world.snapshot()).toEqual(before);
    world.dispose();
  });

  it('stays inside the frame budget at maximum projection', () => {
    const world = createFungiNurseryWorld();
    world.project(
      projection({
        missionId: 'growth-chamber',
        growth: SPORULATING,
        spore: { released: true, position: [0, 1.2, 0], outcome: 'germinating' },
        yeast: { temperatureC: 32, elapsedHours: 8, inoculated: true },
        litter: { temperatureC: 30, elapsedHours: 120, initialLitterMassGrams: 120 },
        safetyScanDepth: 1,
      }),
    );

    const metrics = world.metrics();
    expect(metrics.drawCalls).toBeLessThanOrEqual(120);
    expect(metrics.visibleTriangles).toBeLessThanOrEqual(250_000);
    world.dispose();
  });

  it('creates no geometry, material, or object per frame', () => {
    const world = createFungiNurseryWorld();
    world.project(projection({ growth: SPORULATING }));

    const count = () => {
      let objects = 0;
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      world.root.traverse((object) => {
        objects += 1;
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) {
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            materials.add(material);
          }
        }
      });
      return { objects, geometries: geometries.size, materials: materials.size };
    };

    const before = count();
    for (let frame = 0; frame < 180; frame += 1) world.update(1 / 60, frame / 60);
    expect(count()).toEqual(before);
    world.dispose();
  });

  it('disposes every owned resource exactly once across dispose and remount', () => {
    const world = createFungiNurseryWorld();
    world.project(projection({ growth: SPORULATING }));

    const disposals = new Map<object, number>();
    const track = (resource: { dispose(): void }) => {
      const original = resource.dispose.bind(resource);
      resource.dispose = () => {
        disposals.set(resource, (disposals.get(resource) ?? 0) + 1);
        original();
      };
    };

    const owned: Array<{ dispose(): void }> = [];
    world.root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry && !owned.includes(mesh.geometry)) owned.push(mesh.geometry);
      if (mesh.material) {
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (!owned.includes(material)) owned.push(material);
        }
      }
    });
    expect(owned.length).toBeGreaterThan(0);
    for (const resource of owned) track(resource);

    world.dispose();
    world.dispose();

    for (const resource of owned) {
      expect(disposals.get(resource), 'resource disposed the wrong number of times').toBe(1);
    }
    expect(world.snapshot().disposed).toBe(true);
    expect(world.root.children).toHaveLength(0);

    const remounted = createFungiNurseryWorld();
    remounted.project(projection());
    expect(remounted.snapshot().disposed).toBe(false);
    remounted.dispose();
  });

  it('refuses to project after disposal instead of resurrecting the clearing', () => {
    const world = createFungiNurseryWorld();
    world.project(projection());
    world.dispose();

    expect(() => world.project(projection())).toThrow(/disposed/i);
  });
});
