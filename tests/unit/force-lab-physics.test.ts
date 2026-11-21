import { describe, expect, it } from 'vitest';
import {
  FORCE_LAB,
  bounceOffWall,
  directionChangeDegrees,
  kickSpeed,
  racketHit,
  rampExitSpeed,
  rollingDistance,
  sideTap,
  stepRoll,
  type Roller,
} from '../../apps/web/lib/forceLabPhysics';

describe('force lab physics', () => {
  it('sends the same car 2 to 3 times farther on smooth tile than on rough carpet', () => {
    const speed = rampExitSpeed(FORCE_LAB.rampHeight);
    const smooth = rollingDistance(speed, FORCE_LAB.surfaces.tile);
    const rough = rollingDistance(speed, FORCE_LAB.surfaces.carpet);
    expect(smooth / rough).toBeGreaterThanOrEqual(2);
    expect(smooth / rough).toBeLessThanOrEqual(3);
    expect(smooth).toBeLessThan(FORCE_LAB.laneLength);
  });

  it('gives a higher ramp a faster car', () => {
    expect(rampExitSpeed(0.3)).toBeGreaterThan(rampExitSpeed(0.15));
  });

  it('rolls to a stop at exactly the predicted distance', () => {
    let roller: Roller = { x: 0, z: 0, vx: 0, vz: 1.4, deceleration: FORCE_LAB.surfaces.carpet };
    for (let i = 0; i < 2000; i += 1) roller = stepRoll(roller, 0.01);
    expect(Math.hypot(roller.vx, roller.vz)).toBe(0);
    expect(roller.z).toBeCloseTo(rollingDistance(1.4, FORCE_LAB.surfaces.carpet), 2);
  });

  it('makes a faster hand give a faster kick, within limits', () => {
    expect(kickSpeed(3)).toBeGreaterThan(kickSpeed(1));
    expect(kickSpeed(0)).toBe(FORCE_LAB.kick.minSpeed);
    expect(kickSpeed(100)).toBe(FORCE_LAB.kick.maxSpeed);
  });

  it('changes direction with a sideways tap but not with nothing', () => {
    const before = { vx: 0, vz: 2 };
    const after = sideTap(before, 1.2);
    expect(directionChangeDegrees(before, after)).toBeGreaterThan(20);
    expect(directionChangeDegrees(before, before)).toBe(0);
  });

  it('bounces off a wall back the way it came', () => {
    const incoming = { vx: 0.6, vz: 2 };
    const outgoing = bounceOffWall(incoming, { x: 0, z: -1 }, 0.7);
    expect(outgoing.vz).toBeLessThan(0);
    expect(outgoing.vx).toBeCloseTo(0.6);
    expect(directionChangeDegrees(incoming, outgoing)).toBeGreaterThan(90);
  });

  it('sends a hit ball towards where the racket aims', () => {
    const after = racketHit({ vx: 1, vz: 0 }, { x: 0, z: -1 }, 4);
    expect(after.vz).toBeLessThan(0);
    expect(Math.abs(after.vx)).toBeLessThan(1e-9);
    expect(Math.hypot(after.vx, after.vz)).toBeGreaterThanOrEqual(4);
  });

  it('ignores invalid time steps', () => {
    const roller: Roller = { x: 0, z: 0, vx: 0, vz: 1, deceleration: 1 };
    expect(stepRoll(roller, Number.NaN)).toEqual(roller);
    expect(stepRoll(roller, -1)).toEqual(roller);
  });
});
