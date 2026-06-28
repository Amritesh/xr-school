import { describe, expect, it } from 'vitest';
import { createParticleCloud, createPhysicsWorld } from '../../packages/simulation-runtime/src/index';

describe('base physics engine', () => {
  it('integrates body motion from accumulated forces with deterministic semi-implicit Euler steps', () => {
    const world = createPhysicsWorld({ gravity: { x: 0, y: -9.8, z: 0 } });
    world.addBody({ id: 'drop', position: { x: 0, y: 10, z: 0 }, velocity: { x: 1, y: 0, z: 0 }, mass: 2, radius: 0.25 });
    world.applyForce('drop', { x: 2, y: 0, z: 0 });

    world.step(0.5);

    const body = world.getBody('drop');
    expect(body.velocity.x).toBeCloseTo(1.5, 5);
    expect(body.velocity.y).toBeCloseTo(-4.9, 5);
    expect(body.position.x).toBeCloseTo(0.75, 5);
    expect(body.position.y).toBeCloseTo(7.55, 5);
    expect(world.time()).toBeCloseTo(0.5, 5);
  });

  it('keeps moving bodies inside bounds and reflects velocity with restitution', () => {
    const world = createPhysicsWorld({
      bounds: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 2, z: 1 } },
      restitution: 0.5,
    });
    world.addBody({ id: 'ball', position: { x: 0, y: 0.6, z: 0 }, velocity: { x: 0, y: -2, z: 0 }, mass: 1, radius: 0.25 });

    world.step(0.25);

    const body = world.getBody('ball');
    expect(body.position.y).toBe(0.25);
    expect(body.velocity.y).toBeCloseTo(1, 5);
  });

  it('creates deterministic seeded particle clouds that can be stepped by the same world', () => {
    const first = createParticleCloud({
      prefix: 'p',
      count: 4,
      seed: 42,
      bounds: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } },
      speed: 0.2,
      mass: 0.5,
      radius: 0.04,
    });
    const second = createParticleCloud({
      prefix: 'p',
      count: 4,
      seed: 42,
      bounds: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } },
      speed: 0.2,
      mass: 0.5,
      radius: 0.04,
    });

    expect(first).toEqual(second);

    const world = createPhysicsWorld({ bounds: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } } });
    first.forEach(body => world.addBody(body));
    world.step(0.5);

    expect(world.bodies()).toHaveLength(4);
    expect(world.bodies().every(body => body.position.y >= body.radius && body.position.y <= 1 - body.radius)).toBe(true);
  });

  it('rejects duplicate or invalid bodies before simulations can render bad state', () => {
    const world = createPhysicsWorld();
    world.addBody({ id: 'body', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, radius: 0.1 });

    expect(() => world.addBody({ id: 'body', position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, radius: 0.1 })).toThrow(/already exists/);
    expect(() => createPhysicsWorld().addBody({ id: 'bad', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 0, radius: 0.1 })).toThrow(/mass/);
  });
});
