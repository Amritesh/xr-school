import { describe, expect, it } from 'vitest';
import { createParticleCloud, createPhysicsWorld } from '../../packages/simulation-runtime/src/core/physics';
import { MATTER_CHAMBER_CENTER, matterAgitationForce } from '../../apps/web/lib/world-builder/matterParticleForces';

function meanDistanceFromCenter(spacingFactor: number, heat: number) {
  const world = createPhysicsWorld({
    bounds: { min: { x: -1.45, y: 0.35, z: -1.45 }, max: { x: 1.45, y: 2.1, z: 1.45 } },
    restitution: 0.86,
    drag: 0.18,
  });
  createParticleCloud({
    prefix: 'p', count: 72, seed: 90210,
    bounds: { min: { x: -0.9, y: 0.55, z: -0.9 }, max: { x: 0.9, y: 1.85, z: 0.9 } },
    speed: 0.018, mass: 1, radius: 0.075,
  }).forEach(body => world.addBody(body));

  const dt = 1 / 60;
  for (let s = 0; s < 400; s += 1) {
    for (const [i, body] of world.bodies().entries()) {
      world.applyForce(body.id, matterAgitationForce(i, s * dt, heat, spacingFactor, body.position));
    }
    world.step(dt);
  }
  const bodies = world.bodies();
  const total = bodies.reduce((sum, b) => sum + Math.hypot(
    b.position.x - MATTER_CHAMBER_CENTER.x,
    b.position.y - MATTER_CHAMBER_CENTER.y,
    b.position.z - MATTER_CHAMBER_CENTER.z,
  ), 0);
  return total / bodies.length;
}

describe('states of matter particle spacing', () => {
  it('clusters a liquid noticeably tighter than a gas', () => {
    const liquid = meanDistanceFromCenter(0.5, 0.48);
    const gas = meanDistanceFromCenter(1.0, 0.82);
    expect(liquid).toBeLessThan(gas * 0.8); // liquid is a clustered blob, gas fills the chamber
  });

  it('applies zero cohesion for a gas, so its force is position-independent', () => {
    const atEdge = matterAgitationForce(3, 1.2, 0.82, 1.0, { x: 1.3, y: 2, z: -1.3 });
    const atCenter = matterAgitationForce(3, 1.2, 0.82, 1.0, MATTER_CHAMBER_CENTER);
    expect(atEdge).toEqual(atCenter);
  });

  it('pulls a displaced liquid particle back toward the chamber centre', () => {
    const force = matterAgitationForce(0, 0, 0.48, 0.5, { x: 1.2, y: 1.2, z: 0 });
    // agitation on x at t=0,i=0 is sin(0)=0, so the x force is pure cohesion, pulling -x (toward centre)
    expect(force.x).toBeLessThan(0);
  });
});
