export type RuntimeVector3 = {
  x: number;
  y: number;
  z: number;
};

export type RuntimePhysicsBounds = {
  min: RuntimeVector3;
  max: RuntimeVector3;
};

export type RuntimePhysicsBody = {
  id: string;
  position: RuntimeVector3;
  velocity: RuntimeVector3;
  mass: number;
  radius: number;
  damping?: number;
  fixed?: boolean;
  tags?: string[];
};

export type RuntimePhysicsWorld = {
  addBody(body: RuntimePhysicsBody): RuntimePhysicsBody;
  bodies(): RuntimePhysicsBody[];
  applyForce(id: string, force: RuntimeVector3): void;
  step(dtSeconds: number): void;
};

function vector(value: RuntimeVector3): RuntimeVector3 {
  return { x: value.x, y: value.y, z: value.z };
}

function add(a: RuntimeVector3, b: RuntimeVector3): RuntimeVector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(value: RuntimeVector3, amount: number): RuntimeVector3 {
  return { x: value.x * amount, y: value.y * amount, z: value.z * amount };
}

function cloneBody(body: RuntimePhysicsBody): RuntimePhysicsBody {
  return {
    ...body,
    position: vector(body.position),
    velocity: vector(body.velocity),
    tags: body.tags ? [...body.tags] : undefined,
  };
}

function resolveAxis(body: RuntimePhysicsBody, bounds: RuntimePhysicsBounds, axis: keyof RuntimeVector3, restitution: number) {
  const min = bounds.min[axis] + body.radius;
  const max = bounds.max[axis] - body.radius;
  if (body.position[axis] < min) {
    body.position[axis] = min;
    if (body.velocity[axis] < 0) body.velocity[axis] = -body.velocity[axis] * restitution;
  }
  if (body.position[axis] > max) {
    body.position[axis] = max;
    if (body.velocity[axis] > 0) body.velocity[axis] = -body.velocity[axis] * restitution;
  }
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createPhysicsWorld(config: { bounds?: RuntimePhysicsBounds; restitution?: number; drag?: number } = {}): RuntimePhysicsWorld {
  const bodies = new Map<string, RuntimePhysicsBody>();
  const forces = new Map<string, RuntimeVector3>();
  const restitution = config.restitution ?? 0.65;
  const drag = config.drag ?? 0;

  return {
    addBody(body) {
      if (bodies.has(body.id)) throw new Error(`Physics body "${body.id}" already exists`);
      if (!Number.isFinite(body.mass) || body.mass <= 0) throw new Error(`Body "${body.id}" mass must be greater than 0`);
      const stored = cloneBody(body);
      bodies.set(stored.id, stored);
      forces.set(stored.id, { x: 0, y: 0, z: 0 });
      return cloneBody(stored);
    },
    bodies() {
      return [...bodies.values()].map(cloneBody);
    },
    applyForce(id, force) {
      if (!bodies.has(id)) throw new Error(`Unknown physics body "${id}"`);
      forces.set(id, add(forces.get(id) ?? { x: 0, y: 0, z: 0 }, force));
    },
    step(dtSeconds) {
      for (const body of bodies.values()) {
        if (body.fixed) continue;
        const force = forces.get(body.id) ?? { x: 0, y: 0, z: 0 };
        body.velocity = add(body.velocity, scale(force, dtSeconds / body.mass));
        const damping = body.damping ?? drag;
        if (damping > 0) body.velocity = scale(body.velocity, Math.max(0, 1 - damping * dtSeconds));
        body.position = add(body.position, scale(body.velocity, dtSeconds));
        if (config.bounds) {
          resolveAxis(body, config.bounds, 'x', restitution);
          resolveAxis(body, config.bounds, 'y', restitution);
          resolveAxis(body, config.bounds, 'z', restitution);
        }
        forces.set(body.id, { x: 0, y: 0, z: 0 });
      }
    },
  };
}

export function createParticleCloud(config: {
  prefix: string;
  count: number;
  seed: number;
  bounds: RuntimePhysicsBounds;
  speed: number;
  mass: number;
  radius: number;
  tags?: string[];
}): RuntimePhysicsBody[] {
  const random = seededRandom(config.seed);
  const span = {
    x: config.bounds.max.x - config.bounds.min.x,
    y: config.bounds.max.y - config.bounds.min.y,
    z: config.bounds.max.z - config.bounds.min.z,
  };

  return Array.from({ length: config.count }, (_, index) => ({
    id: `${config.prefix}-${index}`,
    position: {
      x: config.bounds.min.x + config.radius + random() * Math.max(0, span.x - config.radius * 2),
      y: config.bounds.min.y + config.radius + random() * Math.max(0, span.y - config.radius * 2),
      z: config.bounds.min.z + config.radius + random() * Math.max(0, span.z - config.radius * 2),
    },
    velocity: {
      x: (random() - 0.5) * config.speed,
      y: (random() - 0.5) * config.speed,
      z: (random() - 0.5) * config.speed,
    },
    mass: config.mass,
    radius: config.radius,
    tags: config.tags ? [...config.tags] : undefined,
  }));
}
