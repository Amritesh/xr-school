import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createRainwaterState,
  reduceRainwater,
  type RainwaterAction,
  type RainwaterState,
} from '../../apps/web/lib/rainwaterLesson';
import { createRainwaterScene } from '../../apps/web/lib/rainwaterScene';
import { createStorm, routeStorm, stepStorm } from '../../apps/web/lib/rainwaterStorm';
import type { GlbAssetLoader } from '../../apps/web/lib/world-builder/glbAssets';

const fallbackOnly: GlbAssetLoader = {
  load: () => Promise.reject(new Error('offline')),
  loadOrFallback: (_url, fallback) => Promise.resolve(fallback()),
  dispose: () => undefined,
};
const go: RainwaterAction = { type: 'continue' };
const apply = (state: RainwaterState, ...actions: RainwaterAction[]) =>
  actions.reduce(reduceRainwater, state);
const put = (piece: string, socket: string): RainwaterAction[] => [
  { type: 'assembly', action: { kind: 'pick', pieceId: piece } },
  { type: 'assembly', action: { kind: 'place', socketId: socket } },
];

const atDrought = () => apply(createRainwaterState(), { type: 'observe' }, go);
const atRooftop = () => apply(atDrought(), { type: 'choose', option: 'collect' }, go);
const rooftopDone = () =>
  apply(
    atRooftop(),
    ...put('gutter-1', 'gutter-socket-1'),
    ...put('gutter-2', 'gutter-socket-2'),
    ...put('gutter-3', 'gutter-socket-3'),
    ...put('gutter-4', 'gutter-socket-4'),
  );
const filterDone = () =>
  apply(
    rooftopDone(),
    go,
    { type: 'open-first-flush' },
    ...put('stones', 'filter-top'),
    ...put('sand', 'filter-middle'),
    ...put('charcoal', 'filter-bottom'),
  );
const atSchool = () => apply(filterDone(), go);
const schoolDone = () =>
  apply(
    atSchool(),
    ...put('school-gutter', 'school-gutter-socket'),
    ...put('school-pipe', 'school-pipe-socket'),
    ...put('school-tank', 'school-tank-socket'),
  );
const atRecharge = () => apply(schoolDone(), go);
const rechargeDone = () =>
  apply(
    atRecharge(),
    ...put('large-stones', 'pit-bottom'),
    ...put('small-stones', 'pit-middle'),
    ...put('pit-sand', 'pit-top'),
  );
const atStorm = () => apply(rechargeDone(), go);
const atSummer = (routed = 3500) =>
  apply(atStorm(), { type: 'storm-finished', routedLitres: routed }, go);

async function setup(reducedMotion = false) {
  const scene = new THREE.Scene();
  const world = await createRainwaterScene(scene, fallbackOnly, { reducedMotion });
  return { scene, world };
}

describe('rainwater world stages', () => {
  it('shows school pieces only on the school stage', async () => {
    const { world } = await setup();
    world.apply(filterDone());
    expect(world.pieceTargets.get('school-gutter')!.visible).toBe(false);
    world.apply(atSchool());
    expect(world.pieceTargets.get('school-gutter')!.visible).toBe(true);
    expect(world.socketTargets.get('school-tank-socket')!.visible).toBe(true);
  });

  it('fills the school tank at least twice as fast as the house tank', async () => {
    const { world } = await setup();
    world.apply(atRooftop());
    world.apply(rooftopDone());
    world.update(1);
    const houseRate = world.tankFill();
    world.apply(schoolDone());
    world.update(1);
    expect(houseRate).toBeGreaterThan(0);
    expect(world.schoolTankFill()).toBeGreaterThanOrEqual(houseRate * 2);
  });

  it('raises groundwater only when the pit order is right', async () => {
    const { world } = await setup();
    world.apply(
      apply(
        atRecharge(),
        ...put('pit-sand', 'pit-bottom'),
        ...put('small-stones', 'pit-middle'),
        ...put('large-stones', 'pit-top'),
      ),
    );
    world.update(10);
    const low = world.groundwaterLevel();
    world.apply(rechargeDone());
    world.update(10);
    expect(world.groundwaterLevel()).toBeGreaterThan(low);
  });

  it('frames each work stage with its own camera', async () => {
    const { world } = await setup();
    const school = world.focusFor('school');
    const recharge = world.focusFor('recharge');
    expect(school.target.x).toBeLessThan(0);
    expect(recharge.target.x).toBeGreaterThan(0);
    expect(world.focusFor('storm').position.y).toBeGreaterThan(school.position.y);
  });

  it('shows valves only while a storm is playing, and leaves only when blocked', async () => {
    const { world } = await setup();
    world.apply(atStorm());
    world.applyStorm(null);
    expect(world.stormTargets.get('valve-pond')!.visible).toBe(false);
    let storm = createStorm({ seed: 2 });
    world.applyStorm(storm);
    expect(world.stormTargets.get('valve-pond')!.visible).toBe(true);
    expect(world.stormTargets.get('leaf-block')!.visible).toBe(false);
    while (!storm.blocked) storm = stepStorm(storm, 0.05);
    world.applyStorm(storm);
    expect(world.stormTargets.get('leaf-block')!.visible).toBe(true);
  });

  it('runs water only down the routed channel', async () => {
    const { world } = await setup();
    world.apply(atStorm());
    const storm = routeStorm(createStorm({ seed: 2 }), 'pond');
    world.applyStorm(stepStorm(storm, 0.05));
    expect(world.flowingChannel()).toBe('pond');
  });

  it('floods the road as water is lost', async () => {
    const { world } = await setup();
    world.apply(atStorm());
    let storm = createStorm({ seed: 2 });
    for (let i = 0; i < 700; i += 1) storm = stepStorm(storm, 0.1);
    world.applyStorm(storm);
    expect(storm.flooded).toBeGreaterThan(0);
    expect(world.floodLevel()).toBeGreaterThan(0);
  });

  it('counts the lost rain up to 10,000 after the raindrop is followed', async () => {
    const { world } = await setup();
    world.apply(createRainwaterState());
    world.update(1);
    expect(world.lostLitres()).toBe(0);
    world.apply(reduceRainwater(createRainwaterState(), { type: 'observe' }));
    world.update(100);
    expect(world.lostLitres()).toBe(10_000);
  });

  it('dries the village in the drought and restores it in summer', async () => {
    const { world } = await setup();
    world.apply(atDrought());
    world.update(100);
    const droughtPond = world.pondLevel();
    const droughtCrops = world.cropHealth();
    expect(droughtPond).toBeLessThan(0.2);
    expect(droughtCrops).toBeLessThan(0.4);
    world.apply(
      apply(
        atSummer(),
        { type: 'allocate', target: 'garden' },
        { type: 'allocate', target: 'garden' },
        { type: 'allocate', target: 'garden' },
        { type: 'allocate', target: 'garden' },
        { type: 'allocate', target: 'garden' },
      ),
    );
    world.update(100);
    expect(world.pondLevel()).toBeGreaterThan(droughtPond);
    expect(world.cropHealth()).toBeGreaterThan(0.9);
  });

  it('fills the trough and bucket from summer allocations', async () => {
    const { world } = await setup();
    world.apply(atSummer());
    world.update(100);
    expect(world.troughFill()).toBe(0);
    world.apply(apply(atSummer(), { type: 'allocate', target: 'animals' }));
    world.update(100);
    expect(world.troughFill()).toBeCloseTo(0.25, 2);
    world.apply(apply(atSummer(), { type: 'allocate', target: 'cleaning' }));
    world.update(100);
    expect(world.bucketFill()).toBeCloseTo(1 / 3, 2);
  });

  it('makes Droppy worried at the drought and happy when water is earned', async () => {
    const { world } = await setup();
    world.apply(atDrought());
    expect(world.droppyMood()).toBe('worried');
    world.apply(atRooftop());
    world.apply(rooftopDone());
    expect(world.droppyMood()).toBe('cheering');
  });

  it('shows the badge only in the finale', async () => {
    const { world } = await setup();
    world.apply(atSummer());
    expect(world.badge.visible).toBe(false);
    const finale = apply(
      atSummer(),
      ...Array.from({ length: 30 }, (_, i): RainwaterAction => ({
        type: 'allocate',
        target: (['garden', 'animals', 'cleaning'] as const)[i % 3]!,
      })),
      go,
    );
    world.apply(finale);
    expect(finale.stage).toBe('finale');
    expect(world.badge.visible).toBe(true);
  });

  it('applies results at once with reduced motion', async () => {
    const { world } = await setup(true);
    world.apply(reduceRainwater(createRainwaterState(), { type: 'observe' }));
    world.update(0.016);
    expect(world.lostLitres()).toBe(10_000);
    world.apply(atDrought());
    world.update(0.016);
    expect(world.cropHealth()).toBeLessThan(0.4);
  });
});
