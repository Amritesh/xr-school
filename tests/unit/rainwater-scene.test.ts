import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createRainwaterState,
  reduceRainwater,
  type RainwaterAction,
  type RainwaterState,
} from '../../apps/web/lib/rainwaterLesson';
import { createRainwaterScene } from '../../apps/web/lib/rainwaterScene';
import type { GlbAssetLoader } from '../../apps/web/lib/world-builder/glbAssets';

const fallbackOnly: GlbAssetLoader = {
  load: () => Promise.reject(new Error('offline')),
  loadOrFallback: (_url, fallback) => Promise.resolve(fallback()),
  dispose: () => undefined,
};

const go: RainwaterAction = { type: 'continue' };
const apply = (state: RainwaterState, ...actions: RainwaterAction[]) =>
  actions.reduce(reduceRainwater, state);
const atRooftop = () =>
  apply(
    createRainwaterState(),
    { type: 'observe' },
    go,
    { type: 'choose', option: 'collect' },
    go,
  );
const place = (index: number): RainwaterAction[] => [
  { type: 'assembly', action: { kind: 'pick', pieceId: `gutter-${index}` } },
  { type: 'assembly', action: { kind: 'place', socketId: `gutter-socket-${index}` } },
];

async function setup() {
  const scene = new THREE.Scene();
  const world = await createRainwaterScene(scene, fallbackOnly, { reducedMotion: false });
  return { scene, world };
}

describe('rainwater scene', () => {
  it('builds a playable rooftop from fallbacks when models cannot load', async () => {
    const { world } = await setup();
    for (let index = 1; index <= 4; index += 1) {
      expect(world.targets.has(`gutter-${index}`)).toBe(true);
      expect(world.targets.has(`gutter-socket-${index}`)).toBe(true);
    }
  });

  it('shows rooftop pieces and sockets only on the rooftop stage', async () => {
    const { world } = await setup();
    world.apply(createRainwaterState());
    expect(world.targets.get('gutter-1')!.visible).toBe(false);
    expect(world.targets.get('gutter-socket-1')!.visible).toBe(false);
    world.apply(atRooftop());
    expect(world.targets.get('gutter-1')!.visible).toBe(true);
    expect(world.targets.get('gutter-socket-1')!.visible).toBe(true);
  });

  it('moves a placed gutter onto its socket and hides that socket', async () => {
    const { world } = await setup();
    world.apply(apply(atRooftop(), ...place(2)));
    const piece = world.targets.get('gutter-2')!;
    const socket = world.targets.get('gutter-socket-2')!;
    expect(piece.position.distanceTo(socket.position)).toBeLessThan(0.001);
    expect(socket.visible).toBe(false);
  });

  it('lets clicks pass through a carried piece to the socket behind it', async () => {
    const { world } = await setup();
    const hitsOn = (object: THREE.Object3D) => {
      object.position.set(0, 0, 0);
      object.updateMatrixWorld(true);
      const caster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
      return caster.intersectObject(object, true).length;
    };
    const picked = apply(atRooftop(), {
      type: 'assembly',
      action: { kind: 'pick', pieceId: 'gutter-1' },
    });
    world.apply(picked);
    expect(hitsOn(world.targets.get('gutter-1')!)).toBe(0);
    expect(hitsOn(world.targets.get('gutter-2')!)).toBeGreaterThan(0);
    world.apply(apply(atRooftop(), ...place(1)));
    expect(hitsOn(world.targets.get('gutter-1')!)).toBeGreaterThan(0);
  });

  it('runs water to the tank only when every gutter is placed', async () => {
    const { world } = await setup();
    world.apply(apply(atRooftop(), ...place(1), ...place(2), ...place(3)));
    world.update(1);
    expect(world.tankFill()).toBe(0);
    expect(world.spillCount()).toBe(1);
    world.apply(apply(atRooftop(), ...place(1), ...place(2), ...place(3), ...place(4)));
    world.update(1);
    expect(world.tankFill()).toBeGreaterThan(0);
    expect(world.spillCount()).toBe(0);
  });

  it('removes everything from the scene on dispose', async () => {
    const { scene, world } = await setup();
    expect(scene.children.length).toBeGreaterThan(0);
    world.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
