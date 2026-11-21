import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createForceLabState,
  reduceForceLab,
  type ForceLabAction,
  type ForceLabSceneId,
  type ForceLabState,
} from '../../apps/web/lib/forceLabLesson';
import { FORCE_LAB, kickSpeed, rampExitSpeed, rollingDistance } from '../../apps/web/lib/forceLabPhysics';
import { createForceLabScene } from '../../apps/web/lib/forceLabScene';
import type { GlbAssetLoader } from '../../apps/web/lib/world-builder/glbAssets';

const fallbackOnly: GlbAssetLoader = {
  load: () => Promise.reject(new Error('offline')),
  loadOrFallback: (_url, fallback) => Promise.resolve(fallback()),
  dispose: () => undefined,
};

const at = (scene: ForceLabSceneId): ForceLabState => ({ ...createForceLabState(), scene });

async function setup(reducedMotion = false) {
  const events: ForceLabAction[] = [];
  const scene = new THREE.Scene();
  const world = await createForceLabScene(scene, fallbackOnly, {
    reducedMotion,
    onEvent: event => events.push(event),
  });
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 0.02) world.update(0.02);
  };
  return { scene, world, events, run };
}

describe('force lab scene', () => {
  it('shows only the current scene', async () => {
    const { world } = await setup();
    world.apply(at('playground'));
    expect(world.groups.playground.visible).toBe(true);
    expect(world.groups.store.visible).toBe(false);
    expect(world.groups.friction.visible).toBe(false);
  });

  describe('store', () => {
    it('reports a push once the trolley reaches the counter, with a push arrow while moving', async () => {
      const { world, events } = await setup();
      world.apply(at('store'));
      world.dragTo('trolley', world.dragGoal('trolley').clone().lerp(world.dragStart('trolley'), 0.5));
      expect(world.arrowVisible()).toBe(true);
      expect(events).toEqual([]);
      world.dragTo('trolley', world.dragGoal('trolley'));
      world.dragTo('trolley', world.dragGoal('trolley'));
      expect(events).toEqual([{ type: 'push-trolley' }]);
    });

    it('reports a pull once the wagon reaches the shelf', async () => {
      const { world, events } = await setup();
      world.apply(at('store'));
      world.dragTo('wagon', world.dragGoal('wagon'));
      expect(events).toEqual([{ type: 'pull-wagon' }]);
    });

    it('opens the door by pulling and closes it by pushing', async () => {
      const { world, events } = await setup();
      world.apply(at('store'));
      world.dragTo('door', world.dragGoal('door'));
      world.dragTo('door', world.dragStart('door'));
      expect(events).toEqual([{ type: 'open-door' }, { type: 'close-door' }]);
    });
  });

  describe('playground', () => {
    it('kicks the ball at a speed set by the hand and lets a side tap change its direction', async () => {
      const { world, events, run } = await setup();
      world.apply(at('playground'));
      world.kick(3);
      expect(events[0]).toEqual({ type: 'kick', ballSpeed: kickSpeed(3) });
      const start = world.ballPosition().clone();
      run(0.3);
      expect(world.ballPosition().distanceTo(start)).toBeGreaterThan(0.3);
      world.tap(1);
      const tap = events[1] as Extract<ForceLabAction, { type: 'side-tap' }>;
      expect(tap.type).toBe('side-tap');
      expect(tap.directionChange).toBeGreaterThan(15);
    });

    it('puts the ball back on the line for the next kick', async () => {
      const { world, run } = await setup();
      world.apply(at('playground'));
      const spot = world.ballPosition().clone();
      world.kick(2);
      run(1);
      world.resetBall();
      expect(world.ballPosition().distanceTo(spot)).toBeLessThan(1e-6);
    });
  });

  describe('friction', () => {
    it('releases the car from the same line and reports where it stopped', async () => {
      const { world, events, run } = await setup();
      world.apply(reduceForceLab(at('friction'), { type: 'predict-friction', option: 'rough' }));
      world.releaseCar('carpet');
      run(6);
      const expected = rollingDistance(rampExitSpeed(FORCE_LAB.rampHeight), FORCE_LAB.surfaces.carpet);
      const release = events[0] as Extract<ForceLabAction, { type: 'release-car' }>;
      expect(release.surface).toBe('carpet');
      expect(release.distance).toBeCloseTo(expected, 1);
      expect(world.flagVisible('carpet')).toBe(true);
      expect(world.flagVisible('tile')).toBe(false);
    });
  });

  describe('wall', () => {
    it('bounces a thrown ball back off the wall', async () => {
      const { world, events, run } = await setup();
      world.apply(at('wall'));
      world.throwBall(new THREE.Vector3(0.2, 0, -3));
      run(3);
      const bounce = events.find(e => e.type === 'wall-bounce') as Extract<ForceLabAction, { type: 'wall-bounce' }>;
      expect(bounce.directionChange).toBeGreaterThan(90);
    });

    it('lets the racket hit the fed ball towards the wall', async () => {
      const { world, events, run } = await setup();
      world.apply(at('wall'));
      world.feedBall();
      for (let t = 0; t < 6 && !world.ballInReach(); t += 0.02) world.update(0.02);
      expect(world.ballInReach()).toBe(true);
      world.swing(0);
      const hit = events.find(e => e.type === 'racket-hit') as Extract<ForceLabAction, { type: 'racket-hit' }>;
      expect(hit.directionChange).toBeGreaterThan(20);
      run(0.5);
    });

    it('does nothing when swinging at no ball', async () => {
      const { world, events } = await setup();
      world.apply(at('wall'));
      world.swing(0);
      expect(events).toEqual([]);
    });
  });

  it('gives each scene its own camera view and VR standing spot', async () => {
    const { world } = await setup();
    const spots = (['store', 'playground', 'friction', 'wall'] as const).map(id => world.vrSpotFor(id));
    for (const spot of spots) expect(spot.y).toBe(0);
    expect(world.focusFor('friction').target.y).toBeGreaterThan(0.5);
  });

  it('removes everything on dispose', async () => {
    const { scene, world } = await setup();
    world.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
