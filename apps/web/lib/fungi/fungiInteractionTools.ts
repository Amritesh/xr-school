import {
  FUNGAL_EXPERIMENT_BOUNDS,
  calculateYeastDoughResponse,
  evaluateFungalExperiment,
} from '@xr-school/simulation-runtime';
import type {
  FungalExperimentInput,
  FungalExperimentOutput,
  FungalSubstrate,
  FungalUsefulActorId,
  FungalUsefulRole,
} from '@xr-school/simulation-runtime';
import type { FungiNurseryWorldProjection } from '@/lib/world-builder/fungiNurseryWorld';
import type {
  FungiActionId,
  FungiExperienceDirector,
  FungiInputSource,
  FungiResetBoundary,
} from './fungiExperienceDirector';

/**
 * Every input mode — pointer, touch, keyboard, XR controller — is reduced to
 * one of these source-neutral manipulations before anything else happens, so
 * the same physical act produces the same evidence regardless of hardware.
 */
export type FungiManipulation =
  | { type: 'lens-move'; normalizedX: number; normalizedY: number }
  | { type: 'focus-set'; depth: number }
  | { type: 'fan-set'; directionRadians: number; strength: number }
  | { type: 'spore-release' }
  | {
      type: 'growth-input-set';
      field: 'temperatureC' | 'moisturePercent' | 'elapsedHours';
      value: number;
    }
  | { type: 'substrate-set'; substrate: FungalSubstrate }
  | { type: 'token-grab'; actorId: FungalUsefulActorId }
  | { type: 'role-drop'; actorId: FungalUsefulActorId; role: FungalUsefulRole }
  | { type: 'pipette-drop'; vesselId: 'yeast' | 'control' }
  | { type: 'scanner-set'; depth: number }
  | { type: 'manipulation-cancel' };

export interface FungiToolSnapshot {
  lens: {
    normalizedX: number;
    normalizedY: number;
    worldPosition: [number, number, number];
    insideSpecimenId?: string;
  };
  focusDepth: number;
  tracedBranchIds: string[];
  fan: { directionRadians: number; strength: number };
  spore: {
    released: boolean;
    position: [number, number, number];
    outcome: string;
  };
  growthInput: FungalExperimentInput;
  growthOutput: FungalExperimentOutput;
  yeast: { inoculated: boolean; controlInoculated: boolean };
  scannerDepth: number;
  grabbedActorId?: FungalUsefulActorId;
}

export interface FungiFanSettings {
  directionRadians: number;
  strength: number;
}

export interface FungiInteractionTools {
  apply(manipulation: FungiManipulation, source: FungiInputSource): FungiToolSnapshot;
  snapshot(): FungiToolSnapshot;
  worldProjection(): FungiNurseryWorldProjection;
  /** Fan settings that land a spore with the requested outcome, if any exist. */
  findLandingSettings(outcome: SporeLandingOutcome): FungiFanSettings | undefined;
  reset(boundary: FungiResetBoundary): void;
}

export type SporeLandingOutcome = 'missed' | 'dormant' | 'germinating';

// ── Lens plane over the triage table ──
const LENS_MIN_X = -3.2;
const LENS_SPAN_X = 6.4;
const LENS_TOP_Y = 1.7;
const LENS_SPAN_Y = 1.4;

/**
 * Mirrors the bounds the director validates against. The director remains the
 * authority: a crossing it does not accept is recorded as an unaccepted one.
 */
const SPECIMEN_BOUNDS = {
  mushroom: { minimum: [-2.6, 0.4, -0.6], maximum: [-1.4, 1.6, 0.6] },
  'bread-mould': { minimum: [-0.6, 0.4, -0.6], maximum: [0.6, 1.6, 0.6] },
  'green-plant': { minimum: [1.4, 0.4, -0.6], maximum: [2.6, 1.6, 0.6] },
} as const;

export type FungiSpecimenId = keyof typeof SPECIMEN_BOUNDS;

/** Normalized lens coordinates that sit on the centre of each specimen. */
export const SPECIMEN_LENS_TARGETS = {
  mushroom: [(-2 - LENS_MIN_X) / LENS_SPAN_X, (LENS_TOP_Y - 1) / LENS_SPAN_Y],
  'bread-mould': [(0 - LENS_MIN_X) / LENS_SPAN_X, (LENS_TOP_Y - 1) / LENS_SPAN_Y],
  'green-plant': [(2 - LENS_MIN_X) / LENS_SPAN_X, (LENS_TOP_Y - 1) / LENS_SPAN_Y],
} as const satisfies Record<FungiSpecimenId, readonly [number, number]>;

// ── Microscope layers on the fallen log ──
const BRANCH_LAYERS = [
  { id: 'log-branch-near', depth: 0.2 },
  { id: 'log-branch-middle', depth: 0.5 },
  { id: 'log-branch-far', depth: 0.8 },
] as const;
const FOCUS_TOLERANCE = 0.15;

// ── Spore flight ──
const SPORE_RELEASE = [-4.4, 1.9, -0.6] as const;
const LANDING_SURFACE_Y = 1;
/** Spores are small enough to fall at terminal velocity almost immediately. */
const SPORE_DESCENT_METRES_PER_SECOND = 0.35;
const MAX_AIRFLOW_METRES_PER_SECOND = 2;
const LANDING_SURFACES: ReadonlyArray<{
  outcome: SporeLandingOutcome;
  minimum: readonly [number, number];
  maximum: readonly [number, number];
}> = [
  // Warm moist bread tray — spores that reach it germinate.
  { outcome: 'germinating', minimum: [-1.8, -1], maximum: [-0.6, 0.2] },
  // Dry paper tray — a spore survives but cannot start growing.
  { outcome: 'dormant', minimum: [0.2, -1], maximum: [1.4, 0.2] },
];

const LITTER_MASS_GRAMS = 120;
const DOUGH_DIFFERENCE_ML = 0.5;

const SOURCES = new Set<string>(['mouse', 'touch', 'keyboard', 'xr-controller']);
const GROWTH_FIELDS = new Set<string>(['temperatureC', 'moisturePercent', 'elapsedHours']);
const SUBSTRATES = new Set<string>(['bread', 'fruit', 'dry-paper']);
const VESSELS = new Set<string>(['yeast', 'control']);
const USEFUL_ACTORS = new Set<string>([
  'yeast',
  'antibiotic-producing-fungus',
  'saprotrophic-fungus',
]);
const USEFUL_ROLES = new Set<string>(['food', 'medicine', 'decomposer']);
const MANIPULATION_TYPES = new Set<string>([
  'lens-move',
  'focus-set',
  'fan-set',
  'spore-release',
  'growth-input-set',
  'substrate-set',
  'token-grab',
  'role-drop',
  'pipette-drop',
  'scanner-set',
  'manipulation-cancel',
]);

const DEFAULT_GROWTH_INPUT: FungalExperimentInput = {
  temperatureC: 27,
  moisturePercent: 82,
  substrate: 'bread',
  elapsedHours: 0,
  inoculumViability: 1,
};

function requireFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`fungi manipulation ${label} must be a finite number`);
  }
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function specimenAt(x: number, y: number, z: number): FungiSpecimenId | undefined {
  for (const [id, bounds] of Object.entries(SPECIMEN_BOUNDS) as Array<
    [FungiSpecimenId, (typeof SPECIMEN_BOUNDS)[FungiSpecimenId]]
  >) {
    if (
      x >= bounds.minimum[0] &&
      x <= bounds.maximum[0] &&
      y >= bounds.minimum[1] &&
      y <= bounds.maximum[1] &&
      z >= bounds.minimum[2] &&
      z <= bounds.maximum[2]
    ) {
      return id;
    }
  }
  return undefined;
}

/** Deterministic constant-descent flight under a steady horizontal airflow. */
function integrateSporeFlight(
  directionRadians: number,
  strength: number,
): { position: [number, number, number]; outcome: SporeLandingOutcome } {
  const flightSeconds =
    (SPORE_RELEASE[1] - LANDING_SURFACE_Y) / SPORE_DESCENT_METRES_PER_SECOND;
  const speed = clamp(strength, 0, 1) * MAX_AIRFLOW_METRES_PER_SECOND;
  const x = SPORE_RELEASE[0] + Math.cos(directionRadians) * speed * flightSeconds;
  const z = SPORE_RELEASE[2] + Math.sin(directionRadians) * speed * flightSeconds;

  for (const surface of LANDING_SURFACES) {
    if (
      x >= surface.minimum[0] &&
      x <= surface.maximum[0] &&
      z >= surface.minimum[1] &&
      z <= surface.maximum[1]
    ) {
      return { position: [x, LANDING_SURFACE_Y, z], outcome: surface.outcome };
    }
  }
  return { position: [x, LANDING_SURFACE_Y, z], outcome: 'missed' };
}

function validate(manipulation: unknown, source: FungiInputSource): FungiManipulation {
  if (!SOURCES.has(source)) {
    throw new Error(`unsupported fungi manipulation source: ${String(source)}`);
  }
  if (typeof manipulation !== 'object' || manipulation === null) {
    throw new Error('fungi manipulation must be an object');
  }
  const record = manipulation as Record<string, unknown>;
  const type = record.type;
  if (typeof type !== 'string' || !MANIPULATION_TYPES.has(type)) {
    throw new Error(`unknown fungi manipulation type: ${String(type)}`);
  }

  switch (type) {
    case 'lens-move':
      requireFinite(record.normalizedX, 'normalizedX');
      requireFinite(record.normalizedY, 'normalizedY');
      break;
    case 'focus-set':
    case 'scanner-set':
      requireFinite(record.depth, 'depth');
      break;
    case 'fan-set':
      requireFinite(record.directionRadians, 'directionRadians');
      requireFinite(record.strength, 'strength');
      break;
    case 'growth-input-set':
      if (typeof record.field !== 'string' || !GROWTH_FIELDS.has(record.field)) {
        throw new Error(`unknown fungi growth input field: ${String(record.field)}`);
      }
      requireFinite(record.value, 'value');
      break;
    case 'substrate-set':
      if (typeof record.substrate !== 'string' || !SUBSTRATES.has(record.substrate)) {
        throw new Error(`unknown fungal substrate: ${String(record.substrate)}`);
      }
      break;
    case 'pipette-drop':
      if (typeof record.vesselId !== 'string' || !VESSELS.has(record.vesselId)) {
        throw new Error(`unknown dough vessel: ${String(record.vesselId)}`);
      }
      break;
    case 'token-grab':
      if (typeof record.actorId !== 'string' || !USEFUL_ACTORS.has(record.actorId)) {
        throw new Error(`unknown useful fungi actor: ${String(record.actorId)}`);
      }
      break;
    case 'role-drop':
      if (typeof record.actorId !== 'string' || !USEFUL_ACTORS.has(record.actorId)) {
        throw new Error(`unknown useful fungi actor: ${String(record.actorId)}`);
      }
      if (typeof record.role !== 'string' || !USEFUL_ROLES.has(record.role)) {
        throw new Error(`unknown useful fungi role: ${String(record.role)}`);
      }
      break;
    default:
      break;
  }
  return manipulation as FungiManipulation;
}

export function createFungiInteractionTools(
  director: FungiExperienceDirector,
): FungiInteractionTools {
  let lensNormalizedX = 0.5;
  let lensNormalizedY = 0.98;
  let lensWorld: [number, number, number] = [0, LENS_TOP_Y - 0.98 * LENS_SPAN_Y, 0];
  let insideSpecimenId: FungiSpecimenId | undefined;
  let focusDepth = 0;
  const tracedBranchIds: string[] = [];
  let fan: FungiFanSettings = { directionRadians: 0, strength: 0 };
  let spore = {
    released: false,
    position: [...SPORE_RELEASE] as [number, number, number],
    outcome: 'pending' as string,
  };
  let growthInput: FungalExperimentInput = { ...DEFAULT_GROWTH_INPUT };
  let growthOutput = evaluateFungalExperiment(growthInput);
  let yeastInoculated = false;
  let controlInoculated = false;
  let scannerDepth = 0;
  let grabbedActorId: FungalUsefulActorId | undefined;

  const canDispatch = (actionId: FungiActionId) =>
    director.availableActions().includes(actionId);

  /** Records evidence only where the director actually asks for it. */
  const dispatchIfAvailable = (
    actionId: FungiActionId,
    payload: Record<string, unknown>,
    source: FungiInputSource,
  ) => {
    if (!canDispatch(actionId)) return;
    director.dispatch({ actionId, source, ...payload });
  };

  const observeDough = (source: FungiInputSource) => {
    const doughResponse = calculateYeastDoughResponse({
      temperatureC: growthInput.temperatureC,
      elapsedHours: growthInput.elapsedHours,
      yeastPresent: yeastInoculated,
    });
    const controlResponse = calculateYeastDoughResponse({
      temperatureC: growthInput.temperatureC,
      elapsedHours: growthInput.elapsedHours,
      yeastPresent: controlInoculated,
    });
    const observation =
      doughResponse.doughVolumeMl > controlResponse.doughVolumeMl + DOUGH_DIFFERENCE_ML
        ? 'yeast-expanded-more-than-control'
        : 'no-difference-from-control';
    dispatchIfAvailable('useful.observe-dough', { value: observation }, source);
  };

  const runTrial = (source: FungiInputSource) => {
    growthOutput = evaluateFungalExperiment(growthInput);
    dispatchIfAvailable('growth.run-trial', { input: { ...growthInput } }, source);
    if (yeastInoculated || controlInoculated) observeDough(source);
  };

  function apply(
    manipulation: FungiManipulation,
    source: FungiInputSource,
  ): FungiToolSnapshot {
    const validated = validate(manipulation, source);

    switch (validated.type) {
      case 'lens-move': {
        lensNormalizedX = clamp(validated.normalizedX, 0, 1);
        lensNormalizedY = clamp(validated.normalizedY, 0, 1);
        lensWorld = [
          LENS_MIN_X + lensNormalizedX * LENS_SPAN_X,
          LENS_TOP_Y - lensNormalizedY * LENS_SPAN_Y,
          0,
        ];

        const missionId = director.snapshot().missionId;
        if (missionId === 'mycelium') {
          // The lens now reads the log: a branch is traceable only when its
          // layer is genuinely in focus under the microscope.
          const band = Math.min(
            BRANCH_LAYERS.length - 1,
            Math.floor(lensNormalizedX * BRANCH_LAYERS.length),
          );
          const layer = BRANCH_LAYERS[band]!;
          const inFocus = Math.abs(focusDepth - layer.depth) <= FOCUS_TOLERANCE;
          if (inFocus && !tracedBranchIds.includes(layer.id)) {
            tracedBranchIds.push(layer.id);
            dispatchIfAvailable('mycelium.trace', { targetId: layer.id }, source);
          }
          break;
        }

        const entered = specimenAt(lensWorld[0], lensWorld[1], lensWorld[2]);
        const crossed = entered !== undefined && entered !== insideSpecimenId;
        insideSpecimenId = entered;
        if (crossed) {
          dispatchIfAvailable(
            'diagnose.inspect',
            { targetId: entered, pose: { position: [...lensWorld] } },
            source,
          );
        }
        break;
      }

      case 'focus-set':
        focusDepth = clamp(validated.depth, 0, 1);
        break;

      case 'fan-set':
        fan = {
          directionRadians: validated.directionRadians,
          strength: clamp(validated.strength, 0, 1),
        };
        break;

      case 'spore-release': {
        const flight = integrateSporeFlight(fan.directionRadians, fan.strength);
        spore = { released: true, position: flight.position, outcome: flight.outcome };
        dispatchIfAvailable('spore.record-landing', { value: flight.outcome }, source);
        break;
      }

      case 'growth-input-set': {
        const bounds = FUNGAL_EXPERIMENT_BOUNDS[validated.field];
        growthInput = {
          ...growthInput,
          [validated.field]: clamp(validated.value, bounds.minimum, bounds.maximum),
        };
        runTrial(source);
        break;
      }

      case 'substrate-set':
        growthInput = { ...growthInput, substrate: validated.substrate };
        runTrial(source);
        break;

      case 'token-grab':
        grabbedActorId = validated.actorId;
        break;

      case 'role-drop': {
        // A drop only counts if the learner is still holding that token: a
        // cancelled drag routes nothing.
        if (grabbedActorId !== validated.actorId) break;
        grabbedActorId = undefined;
        dispatchIfAvailable(
          'useful.match-role',
          { targetId: validated.actorId, value: validated.role },
          source,
        );
        break;
      }

      case 'pipette-drop':
        if (validated.vesselId === 'yeast') yeastInoculated = true;
        else controlInoculated = true;
        observeDough(source);
        break;

      case 'scanner-set':
        scannerDepth = clamp(validated.depth, 0, 1);
        dispatchIfAvailable('safety.scan', { value: scannerDepth }, source);
        break;

      case 'manipulation-cancel':
        grabbedActorId = undefined;
        break;
    }

    return snapshot();
  }

  function snapshot(): FungiToolSnapshot {
    return {
      lens: {
        normalizedX: lensNormalizedX,
        normalizedY: lensNormalizedY,
        worldPosition: [...lensWorld],
        ...(insideSpecimenId === undefined ? {} : { insideSpecimenId }),
      },
      focusDepth,
      tracedBranchIds: [...tracedBranchIds],
      fan: { ...fan },
      spore: { ...spore, position: [...spore.position] },
      growthInput: { ...growthInput },
      growthOutput: { ...growthOutput },
      yeast: { inoculated: yeastInoculated, controlInoculated },
      scannerDepth,
      ...(grabbedActorId === undefined ? {} : { grabbedActorId }),
    };
  }

  function worldProjection(): FungiNurseryWorldProjection {
    const state = director.snapshot();
    return {
      missionId: state.missionId,
      growth: { ...growthOutput },
      airflow: { ...fan },
      spore: {
        released: spore.released,
        position: [...spore.position],
        outcome: spore.outcome,
      },
      yeast: {
        temperatureC: growthInput.temperatureC,
        elapsedHours: growthInput.elapsedHours,
        inoculated: yeastInoculated,
      },
      litter: {
        temperatureC: growthInput.temperatureC,
        elapsedHours: growthInput.elapsedHours,
        initialLitterMassGrams: LITTER_MASS_GRAMS,
      },
      safetyScanDepth: scannerDepth,
      highlightedEvidenceIds: state.observationHistory
        .filter((record) => record.missionId === state.missionId)
        .map((record) => record.id),
    };
  }

  function findLandingSettings(
    outcome: SporeLandingOutcome,
  ): FungiFanSettings | undefined {
    for (let directionStep = 0; directionStep < 48; directionStep += 1) {
      const directionRadians = (directionStep / 48) * Math.PI * 2;
      for (let strengthStep = 0; strengthStep <= 100; strengthStep += 1) {
        const strength = strengthStep / 100;
        if (integrateSporeFlight(directionRadians, strength).outcome === outcome) {
          return { directionRadians, strength };
        }
      }
    }
    return undefined;
  }

  function reset(boundary: FungiResetBoundary): void {
    spore = {
      released: false,
      position: [...SPORE_RELEASE] as [number, number, number],
      outcome: 'pending',
    };
    insideSpecimenId = undefined;
    grabbedActorId = undefined;
    if (boundary === 'observation') return;

    fan = { directionRadians: 0, strength: 0 };
    scannerDepth = 0;
    growthInput = { ...DEFAULT_GROWTH_INPUT };
    growthOutput = evaluateFungalExperiment(growthInput);
    if (boundary === 'experiment') return;

    focusDepth = 0;
    tracedBranchIds.length = 0;
    yeastInoculated = false;
    controlInoculated = false;
  }

  return { apply, snapshot, worldProjection, findLandingSettings, reset };
}
