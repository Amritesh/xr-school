import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createForceMotionScene } from '../../apps/web/lib/world-builder/forceMotionScene';
import { ARENA, type ForceMotionMaterials } from '../../apps/web/lib/world-builder/forceMotionAnatomy';

function materials(): ForceMotionMaterials {
  const make = () => new THREE.MeshBasicMaterial();
  return {
    track: make(), ball: make(), shapeBall: make(), paddle: make(),
    pushControl: make(), brakeControl: make(), accelerateControl: make(),
    deflectControl: make(), shapeControl: make(), velocity: make(), board: make(),
  };
}

function build() {
  return createForceMotionScene({ scene: new THREE.Scene(), materials: materials() });
}

function step(world: ReturnType<typeof build>, seconds: number, dt = 1 / 60) {
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) world.update(dt);
}

describe('force and motion scene physics', () => {
  it('a push imparts velocity the ball keeps after the push ends (inertia)', () => {
    const world = build();
    world.setStage(0);
    expect(world.getMotionState().velocity.length()).toBe(0);

    world.applyPush();
    expect(world.getMotionState().velocity.length()).toBeGreaterThan(0);

    const startZ = world.getMotionState().position.y;
    step(world, 0.5); // no further input — it must keep moving on its own
    const after = world.getMotionState();
    expect(after.position.y).toBeLessThan(startZ); // rolled forward (-Z)
    expect(after.velocity.length()).toBeGreaterThan(0.5); // undamped between walls
  });

  it('the brake is an opposing force that stops the ball over time, not instantly', () => {
    const world = build();
    world.setStage(1); // already rolling
    expect(world.getMotionState().velocity.length()).toBeGreaterThan(0);

    world.applyBrake();
    world.update(1 / 60);
    const midSpeed = world.getMotionState().velocity.length();
    expect(midSpeed).toBeGreaterThan(0); // not an instant teleport-to-stop

    step(world, 1.5);
    expect(world.getMotionState().velocity.length()).toBe(0); // eventually at rest
  });

  it('a stronger push increases speed; a sideways push changes direction', () => {
    const world = build();
    world.setStage(2);
    const before = world.getMotionState().velocity.length();
    world.applyAccelerate();
    expect(world.getMotionState().velocity.length()).toBeGreaterThan(before);

    world.setStage(3);
    expect(world.getMotionState().velocity.x).toBe(0); // rolling straight
    world.applyDeflect();
    expect(Math.abs(world.getMotionState().velocity.x)).toBeGreaterThan(0); // now curving
  });

  it('keeps the ball inside the arena by bouncing off the walls', () => {
    const world = build();
    world.setStage(0);
    world.applyPush();
    world.applyAccelerate();
    world.applyDeflect();
    step(world, 8); // let it ricochet for a long time
    const { position } = world.getMotionState();
    expect(Math.abs(position.x)).toBeLessThanOrEqual(ARENA.width / 2);
    expect(Math.abs(position.y)).toBeLessThanOrEqual(ARENA.depth / 2);
  });
});
