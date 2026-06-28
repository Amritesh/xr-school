export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type PhysicsBounds = {
  min: Vector3;
  max: Vector3;
};

export type PhysicsBody = {
  id: string;
  position: Vector3;
  velocity: Vector3;
  mass: number;
  radius: number;
  damping?: number;
  fixed?: boolean;
  tags?: string[];
};

export type PhysicsWorldConfig = {
  gravity?: Vector3;
  bounds?: PhysicsBounds;
  restitution?: number;
  drag?: number;
};

export type ParticleCloudConfig = {
  prefix: string;
  count: number;
  seed: number;
  bounds: PhysicsBounds;
  speed: number;
  mass: number;
  radius: number;
  tags?: string[];
};

export type PhysicsWorld = {
  addBody(body: PhysicsBody): PhysicsBody;
  getBody(id: string): PhysicsBody;
  bodies(): PhysicsBody[];
  applyForce(id: string, force: Vector3): void;
  applyImpulse(id: string, impulse: Vector3): void;
  step(dtSeconds: number): void;
  time(): number;
  clear(): void;
};

function cloneVector(vector: Vector3): Vector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(vector: Vector3, scalar: number): Vector3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function zero(): Vector3 {
  return { x: 0, y: 0, z: 0 };
}

function assertFiniteVector(name: string, vector: Vector3) {
  if (![vector.x, vector.y, vector.z].every(Number.isFinite)) {
    throw new Error(`${name} must contain finite x, y, z values`);
  }
}

function cloneBody(body: PhysicsBody): PhysicsBody {
  return {
    ...body,
    position: cloneVector(body.position),
    velocity: cloneVector(body.velocity),
    tags: body.tags ? [...body.tags] : undefined,
  };
}

function validateBody(body: PhysicsBody) {
  if (!body.id) throw new Error('Physics body requires an id');
  assertFiniteVector(`Body "${body.id}" position`, body.position);
  assertFiniteVector(`Body "${body.id}" velocity`, body.velocity);
  if (!Number.isFinite(body.mass) || body.mass <= 0) throw new Error(`Body "${body.id}" mass must be greater than 0`);
  if (!Number.isFinite(body.radius) || body.radius < 0) throw new Error(`Body "${body.id}" radius must be zero or greater`);
}

function resolveAxis(body: PhysicsBody, bounds: PhysicsBounds, axis: keyof Vector3, restitution: number) {
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

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createPhysicsWorld(config: PhysicsWorldConfig = {}): PhysicsWorld {
  const bodies = new Map<string, PhysicsBody>();
  const forces = new Map<string, Vector3>();
  const gravity = config.gravity ? cloneVector(config.gravity) : zero();
  const restitution = config.restitution ?? 0.65;
  const drag = config.drag ?? 0;
  let elapsed = 0;

  return {
    addBody(body) {
      validateBody(body);
      if (bodies.has(body.id)) throw new Error(`Physics body "${body.id}" already exists`);
      const stored = cloneBody(body);
      bodies.set(stored.id, stored);
      forces.set(stored.id, zero());
      return cloneBody(stored);
    },
    getBody(id) {
      const body = bodies.get(id);
      if (!body) throw new Error(`Unknown physics body "${id}"`);
      return cloneBody(body);
    },
    bodies() {
      return [...bodies.values()].map(cloneBody);
    },
    applyForce(id, force) {
      assertFiniteVector('Force', force);
      const body = bodies.get(id);
      if (!body) throw new Error(`Unknown physics body "${id}"`);
      forces.set(id, add(forces.get(id) ?? zero(), force));
    },
    applyImpulse(id, impulse) {
      assertFiniteVector('Impulse', impulse);
      const body = bodies.get(id);
      if (!body) throw new Error(`Unknown physics body "${id}"`);
      if (body.fixed) return;
      body.velocity = add(body.velocity, scale(impulse, 1 / body.mass));
    },
    step(dtSeconds) {
      if (!Number.isFinite(dtSeconds) || dtSeconds < 0) throw new Error('Physics step duration must be a non-negative finite number');
      for (const body of bodies.values()) {
        if (body.fixed) {
          forces.set(body.id, zero());
          continue;
        }

        const accumulated = forces.get(body.id) ?? zero();
        const acceleration = add(gravity, scale(accumulated, 1 / body.mass));
        body.velocity = add(body.velocity, scale(acceleration, dtSeconds));

        const bodyDamping = body.damping ?? drag;
        if (bodyDamping > 0) {
          body.velocity = scale(body.velocity, Math.max(0, 1 - bodyDamping * dtSeconds));
        }

        body.position = add(body.position, scale(body.velocity, dtSeconds));
        if (config.bounds) {
          resolveAxis(body, config.bounds, 'x', restitution);
          resolveAxis(body, config.bounds, 'y', restitution);
          resolveAxis(body, config.bounds, 'z', restitution);
        }
        forces.set(body.id, zero());
      }
      elapsed += dtSeconds;
    },
    time() {
      return elapsed;
    },
    clear() {
      bodies.clear();
      forces.clear();
      elapsed = 0;
    },
  };
}

export function createParticleCloud(config: ParticleCloudConfig): PhysicsBody[] {
  const random = createSeededRandom(config.seed);
  const span = {
    x: config.bounds.max.x - config.bounds.min.x,
    y: config.bounds.max.y - config.bounds.min.y,
    z: config.bounds.max.z - config.bounds.min.z,
  };

  return Array.from({ length: config.count }, (_, index) => {
    const velocity = {
      x: (random() - 0.5) * config.speed,
      y: (random() - 0.5) * config.speed,
      z: (random() - 0.5) * config.speed,
    };

    return {
      id: `${config.prefix}-${index}`,
      position: {
        x: config.bounds.min.x + config.radius + random() * Math.max(0, span.x - config.radius * 2),
        y: config.bounds.min.y + config.radius + random() * Math.max(0, span.y - config.radius * 2),
        z: config.bounds.min.z + config.radius + random() * Math.max(0, span.z - config.radius * 2),
      },
      velocity,
      mass: config.mass,
      radius: config.radius,
      tags: config.tags ? [...config.tags] : undefined,
    };
  });
}
