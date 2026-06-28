import RAPIER from '@dimforge/rapier3d-compat';

export type RapierVector3 = [number, number, number];

export interface RapierWorldConfig {
  gravity?: RapierVector3;
  fixedStepSeconds?: number;
}

export interface RapierSphereDefinition {
  id: string;
  radiusMeters: number;
  massKg: number;
  positionMeters: RapierVector3;
  velocityMetersPerSecond?: RapierVector3;
  restitution?: number;
  friction?: number;
  linearDamping?: number;
  fixed?: boolean;
}

export interface RapierCuboidDefinition {
  id: string;
  halfExtentsMeters: RapierVector3;
  positionMeters: RapierVector3;
  massKg?: number;
  velocityMetersPerSecond?: RapierVector3;
  restitution?: number;
  friction?: number;
  linearDamping?: number;
  fixed?: boolean;
}

export interface RapierBodySnapshot {
  id: string;
  positionMeters: RapierVector3;
  rotation: [number, number, number, number];
  velocityMetersPerSecond: RapierVector3;
  angularVelocityRadiansPerSecond: RapierVector3;
  sleeping: boolean;
}

let rapierInitialization: Promise<void> | undefined;

async function initializeRapier() {
  rapierInitialization ??= (async () => {
    const originalWarn = console.warn;
    const deprecatedInitializerWarning =
      'using deprecated parameters for the initialization function; pass a single object instead';
    const filteredWarn: typeof console.warn = (...args) => {
      if (args.length === 1 && args[0] === deprecatedInitializerWarning) return;
      originalWarn(...args);
    };

    // Rapier 0.19.3's compatibility wrapper still invokes wasm-bindgen's
    // deprecated positional initializer. Scope the filter to that one
    // upstream message and restore logging immediately after initialization.
    console.warn = filteredWarn;
    try {
      await RAPIER.init();
    } finally {
      if (console.warn === filteredWarn) console.warn = originalWarn;
    }
  })();
  await rapierInitialization;
}

function finiteVector(value: RapierVector3, label: string) {
  if (!value.every(Number.isFinite)) {
    throw new Error(`${label} must contain finite values`);
  }
}

function nonNegativeUnit(value: number | undefined, label: string) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error(`${label} must be between 0 and 1`);
  }
}

function vector(value: { x: number; y: number; z: number }): RapierVector3 {
  return [value.x, value.y, value.z];
}

export async function createRapierWorld(config: RapierWorldConfig = {}) {
  await initializeRapier();
  const gravity = config.gravity ?? [0, -9.81, 0];
  const fixedStepSeconds = config.fixedStepSeconds ?? 1 / 60;
  finiteVector(gravity, 'Gravity');
  if (!Number.isFinite(fixedStepSeconds) || fixedStepSeconds <= 0) {
    throw new Error('Fixed step must be a positive finite number');
  }

  const world = new RAPIER.World({
    x: gravity[0],
    y: gravity[1],
    z: gravity[2],
  });
  world.timestep = fixedStepSeconds;
  const bodies = new Map<string, RAPIER.RigidBody>();
  let disposed = false;

  function requireActive() {
    if (disposed) throw new Error('Rapier world has been disposed');
  }

  function validateCommon(definition: {
    id: string;
    positionMeters: RapierVector3;
    velocityMetersPerSecond?: RapierVector3;
    restitution?: number;
    friction?: number;
    linearDamping?: number;
  }) {
    if (!definition.id.trim()) throw new Error('Physics body ID is required');
    if (bodies.has(definition.id)) throw new Error(`Duplicate physics body ${definition.id}`);
    finiteVector(definition.positionMeters, `${definition.id}: position`);
    if (definition.velocityMetersPerSecond) {
      finiteVector(definition.velocityMetersPerSecond, `${definition.id}: velocity`);
    }
    nonNegativeUnit(definition.restitution, `${definition.id}: restitution`);
    nonNegativeUnit(definition.friction, `${definition.id}: friction`);
    if (definition.linearDamping !== undefined
      && (!Number.isFinite(definition.linearDamping) || definition.linearDamping < 0)) {
      throw new Error(`${definition.id}: linearDamping must be non-negative`);
    }
  }

  function createBody(definition: {
    id: string;
    positionMeters: RapierVector3;
    velocityMetersPerSecond?: RapierVector3;
    linearDamping?: number;
    fixed?: boolean;
  }) {
    const descriptor = definition.fixed
      ? RAPIER.RigidBodyDesc.fixed()
      : RAPIER.RigidBodyDesc.dynamic();
    descriptor.setTranslation(...definition.positionMeters);
    if (definition.velocityMetersPerSecond) {
      descriptor.setLinvel(...definition.velocityMetersPerSecond);
    }
    if (definition.linearDamping !== undefined) {
      descriptor.setLinearDamping(definition.linearDamping);
    }
    const body = world.createRigidBody(descriptor);
    bodies.set(definition.id, body);
    return body;
  }

  function applyColliderProperties(
    collider: RAPIER.ColliderDesc,
    definition: {
      massKg?: number;
      restitution?: number;
      friction?: number;
      fixed?: boolean;
    },
  ) {
    collider.setRestitution(definition.restitution ?? 0);
    collider.setFriction(definition.friction ?? 0.7);
    if (!definition.fixed && definition.massKg !== undefined) {
      collider.setMass(definition.massKg);
    }
    return collider;
  }

  function snapshotBody(id: string): RapierBodySnapshot {
    requireActive();
    const body = bodies.get(id);
    if (!body) throw new Error(`Unknown physics body ${id}`);
    const rotation = body.rotation();
    return {
      id,
      positionMeters: vector(body.translation()),
      rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      velocityMetersPerSecond: vector(body.linvel()),
      angularVelocityRadiansPerSecond: vector(body.angvel()),
      sleeping: body.isSleeping(),
    };
  }

  return {
    addSphere(definition: RapierSphereDefinition) {
      requireActive();
      validateCommon(definition);
      if (!Number.isFinite(definition.radiusMeters) || definition.radiusMeters <= 0) {
        throw new Error(`${definition.id}: radiusMeters must be positive`);
      }
      if (!definition.fixed && (!Number.isFinite(definition.massKg) || definition.massKg <= 0)) {
        throw new Error(`${definition.id}: massKg must be positive`);
      }
      const body = createBody(definition);
      const collider = applyColliderProperties(
        RAPIER.ColliderDesc.ball(definition.radiusMeters),
        definition,
      );
      world.createCollider(collider, body);
      return snapshotBody(definition.id);
    },

    addCuboid(definition: RapierCuboidDefinition) {
      requireActive();
      validateCommon(definition);
      finiteVector(definition.halfExtentsMeters, `${definition.id}: half extents`);
      if (definition.halfExtentsMeters.some(value => value <= 0)) {
        throw new Error(`${definition.id}: half extents must be positive`);
      }
      if (!definition.fixed
        && (!Number.isFinite(definition.massKg) || definition.massKg! <= 0)) {
        throw new Error(`${definition.id}: massKg must be positive`);
      }
      const body = createBody(definition);
      const collider = applyColliderProperties(
        RAPIER.ColliderDesc.cuboid(...definition.halfExtentsMeters),
        definition,
      );
      world.createCollider(collider, body);
      return snapshotBody(definition.id);
    },

    step() {
      requireActive();
      world.step();
    },

    body(id: string) {
      return snapshotBody(id);
    },

    snapshot() {
      requireActive();
      return [...bodies.keys()].map(snapshotBody);
    },

    async dispose() {
      if (disposed) return;
      world.free();
      bodies.clear();
      disposed = true;
    },
  };
}

export type RapierWorld = Awaited<ReturnType<typeof createRapierWorld>>;
