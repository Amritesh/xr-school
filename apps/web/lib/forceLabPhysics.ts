/**
 * Simple, deterministic motion for the Force and Motion lab. Everything is on
 * the floor plane (x, z) in metres and seconds. Rolling objects slow down at a
 * constant rate set by the surface, which is how friction appears to a child.
 */

const GRAVITY = 9.8;

export const FORCE_LAB = Object.freeze({
  rampHeight: 0.15,
  /** Share of the ideal ramp speed kept after wheel and ramp losses. */
  rampEfficiency: 0.8,
  laneLength: 2.6,
  /** Deceleration in m/s² from rolling friction on each surface. */
  surfaces: Object.freeze({ tile: 0.39, carpet: 0.975, grass: 0.8, courtyard: 0.6 }),
  kick: Object.freeze({ handToBall: 1.4, minSpeed: 0.6, maxSpeed: 4.2, strongBallSpeed: 2.5 }),
  wallRestitution: 0.7,
  racketBoost: 1.1,
});

export interface Velocity {
  vx: number;
  vz: number;
}

export interface Roller extends Velocity {
  x: number;
  z: number;
  deceleration: number;
}

const speedOf = ({ vx, vz }: Velocity) => Math.hypot(vx, vz);

export function rampExitSpeed(heightMetres: number): number {
  return Math.sqrt(2 * GRAVITY * Math.max(0, heightMetres)) * FORCE_LAB.rampEfficiency;
}

export function rollingDistance(speed: number, deceleration: number): number {
  return (speed * speed) / (2 * deceleration);
}

/** Moves a roller for dt seconds, slowing it by its surface's friction. */
export function stepRoll(roller: Roller, dt: number): Roller {
  if (!Number.isFinite(dt) || dt <= 0) return roller;
  const speed = speedOf(roller);
  if (speed === 0) return roller;
  const nextSpeed = Math.max(0, speed - roller.deceleration * dt);
  const travelled =
    nextSpeed > 0 ? ((speed + nextSpeed) / 2) * dt : rollingDistance(speed, roller.deceleration);
  const ux = roller.vx / speed;
  const uz = roller.vz / speed;
  return {
    ...roller,
    x: roller.x + ux * travelled,
    z: roller.z + uz * travelled,
    vx: ux * nextSpeed,
    vz: uz * nextSpeed,
  };
}

/** Ball speed from the speed of the hand that kicked it. */
export function kickSpeed(handSpeed: number): number {
  const raw = Math.max(0, handSpeed) * FORCE_LAB.kick.handToBall;
  return Math.min(FORCE_LAB.kick.maxSpeed, Math.max(FORCE_LAB.kick.minSpeed, raw));
}

/** A push at right angles to the motion. */
export function sideTap(velocity: Velocity, impulse: number): Velocity {
  const speed = speedOf(velocity);
  if (speed === 0) return velocity;
  return {
    vx: velocity.vx + (velocity.vz / speed) * impulse,
    vz: velocity.vz + (-velocity.vx / speed) * impulse,
  };
}

/** The wall pushes back along its normal; restitution sets how lively the bounce is. */
export function bounceOffWall(
  velocity: Velocity,
  normal: { x: number; z: number },
  restitution: number = FORCE_LAB.wallRestitution,
): Velocity {
  const length = Math.hypot(normal.x, normal.z);
  const nx = normal.x / length;
  const nz = normal.z / length;
  const into = velocity.vx * nx + velocity.vz * nz;
  if (into >= 0) return velocity;
  return {
    vx: velocity.vx - (1 + restitution) * into * nx,
    vz: velocity.vz - (1 + restitution) * into * nz,
  };
}

/** A racket sends the ball where it aims, at least as fast as the swing. */
export function racketHit(
  velocity: Velocity,
  aim: { x: number; z: number },
  swingSpeed: number,
): Velocity {
  const length = Math.hypot(aim.x, aim.z);
  const speed = Math.max(speedOf(velocity), swingSpeed * FORCE_LAB.racketBoost);
  return { vx: (aim.x / length) * speed, vz: (aim.z / length) * speed };
}

export function directionChangeDegrees(before: Velocity, after: Velocity): number {
  const a = speedOf(before);
  const b = speedOf(after);
  if (a === 0 || b === 0) return 0;
  const cosine = (before.vx * after.vx + before.vz * after.vz) / (a * b);
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}
