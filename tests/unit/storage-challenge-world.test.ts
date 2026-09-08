import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CHALLENGE_FOODS } from '@xr-school/simulation-runtime';
import {
  STORAGE_FOOD_IDS,
  createStorageChallengeWorld,
  type StorageChallengeProjection,
} from '../../apps/web/lib/storage-challenge/storageChallengeWorld';

function projection(
  overrides: Partial<StorageChallengeProjection> = {},
): StorageChallengeProjection {
  return {
    day: 0,
    temperatureC: 22,
    humidityPercent: 50,
    foods: STORAGE_FOOD_IDS.map((foodId) => ({
      foodId,
      surfaceCoverage: 0,
      sealed: false,
      spoiled: false,
    })),
    ...overrides,
  };
}

describe('createStorageChallengeWorld', () => {
  it('holds exactly the foods the challenge puts on the shelf', () => {
    const world = createStorageChallengeWorld();
    expect([...STORAGE_FOOD_IDS].sort()).toEqual(
      CHALLENGE_FOODS.map((food) => food.id).sort(),
    );
    for (const foodId of STORAGE_FOOD_IDS) {
      expect(world.foodAnchors[foodId]).toBeDefined();
    }
    world.dispose();
  });

  it('separates the four foods so each can be looked at on its own', () => {
    const world = createStorageChallengeWorld();
    world.project(projection());
    world.root.updateMatrixWorld(true);

    const boxes = STORAGE_FOOD_IDS.map((foodId) =>
      new THREE.Box3().setFromObject(world.foodAnchors[foodId]!),
    );
    for (let i = 0; i < boxes.length; i += 1) {
      expect(boxes[i]!.isEmpty()).toBe(false);
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(boxes[i]!.intersectsBox(boxes[j]!)).toBe(false);
      }
    }
    world.dispose();
  });

  it('shows mould in proportion to the coverage the model reports', () => {
    const world = createStorageChallengeWorld();

    world.project(projection());
    expect(world.snapshot().foods.every((food) => food.visibleSpecks === 0)).toBe(true);

    world.project(
      projection({
        day: 5,
        foods: [
          { foodId: 'bread', surfaceCoverage: 0.8, sealed: false, spoiled: true },
          { foodId: 'fruit', surfaceCoverage: 0.4, sealed: true, spoiled: true },
          { foodId: 'rice', surfaceCoverage: 0, sealed: true, spoiled: false },
          { foodId: 'chapati', surfaceCoverage: 0.1, sealed: false, spoiled: false },
        ],
      }),
    );
    const byId = Object.fromEntries(
      world.snapshot().foods.map((food) => [food.foodId, food]),
    );

    expect(byId.bread!.visibleSpecks).toBeGreaterThan(byId.fruit!.visibleSpecks);
    expect(byId.fruit!.visibleSpecks).toBeGreaterThan(byId.chapati!.visibleSpecks);
    expect(byId.rice!.visibleSpecks).toBe(0);
    world.dispose();
  });

  it('draws a wrap only where the learner actually sealed something', () => {
    const world = createStorageChallengeWorld();
    world.project(
      projection({
        foods: STORAGE_FOOD_IDS.map((foodId) => ({
          foodId,
          surfaceCoverage: 0,
          sealed: foodId === 'rice',
          spoiled: false,
        })),
      }),
    );

    const wrapVisible = (foodId: string) => {
      let visible = false;
      world.foodAnchors[foodId]!.traverse((object) => {
        if (object.name === 'wrap') visible = object.visible;
      });
      return visible;
    };

    expect(wrapVisible('rice')).toBe(true);
    expect(wrapVisible('bread')).toBe(false);
    world.dispose();
  });

  it('rejects a projection it cannot honestly render', () => {
    const world = createStorageChallengeWorld();
    world.project(projection());
    const before = world.snapshot();

    expect(() => world.project(projection({ day: -1 }))).toThrow(/day/i);
    expect(() =>
      world.project(
        projection({
          foods: [{ foodId: 'bread', surfaceCoverage: 4, sealed: false, spoiled: false }],
        }),
      ),
    ).toThrow(/coverage/i);
    expect(() =>
      world.project(
        projection({
          foods: [{ foodId: 'cake', surfaceCoverage: 0.2, sealed: false, spoiled: false }],
        }),
      ),
    ).toThrow(/cake/i);

    expect(world.snapshot()).toEqual(before);
    world.dispose();
  });

  it('stays cheap at full mould and disposes cleanly', () => {
    const world = createStorageChallengeWorld();
    world.project(
      projection({
        day: 7,
        foods: STORAGE_FOOD_IDS.map((foodId) => ({
          foodId,
          surfaceCoverage: 1,
          sealed: true,
          spoiled: true,
        })),
      }),
    );

    const metrics = world.metrics();
    expect(metrics.drawCalls).toBeLessThanOrEqual(60);
    expect(metrics.visibleTriangles).toBeLessThanOrEqual(120_000);

    for (let frame = 0; frame < 120; frame += 1) world.update(1 / 60, frame / 60);

    world.dispose();
    world.dispose();
    expect(world.snapshot().disposed).toBe(true);
    expect(world.root.children).toHaveLength(0);
    expect(() => world.project(projection())).toThrow(/disposed/i);
  });
});
