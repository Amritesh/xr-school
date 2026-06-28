import { createFixedClock, type FixedClockConfig } from './fixedClock';
import {
  createResourceRegistry,
  type ResourceRegistry,
} from './resourceRegistry';

export type WorldRuntimeState =
  | 'created'
  | 'running'
  | 'paused'
  | 'disposed'
  | 'failed';

export interface WorldContext {
  resources: ResourceRegistry;
  elapsedSeconds: number;
}

export interface FixedUpdateContext extends WorldContext {
  deltaSeconds: number;
  stepNumber: number;
}

export interface RenderUpdateContext extends WorldContext {
  frameDeltaSeconds: number;
  interpolationAlpha: number;
}

export interface WorldSystem {
  id: string;
  dependencies: string[];
  initialize(context: WorldContext): void | Promise<void>;
  fixedUpdate?(context: FixedUpdateContext): void;
  renderUpdate?(context: RenderUpdateContext): void;
  pause?(context: WorldContext): void;
  resume?(context: WorldContext): void;
  dispose(context: WorldContext): void | Promise<void>;
}

export interface WorldRuntimeConfig {
  systems: WorldSystem[];
  clock?: FixedClockConfig;
  resourceRegistry?: ResourceRegistry;
}

function orderSystems(systems: readonly WorldSystem[]) {
  const byId = new Map<string, WorldSystem>();
  for (const system of systems) {
    if (!system.id.trim()) throw new Error('World system ID is required');
    if (byId.has(system.id)) throw new Error(`Duplicate world system ${system.id}`);
    if (typeof system.initialize !== 'function') {
      throw new Error(`${system.id}: initialize handler is required`);
    }
    if (typeof system.dispose !== 'function') {
      throw new Error(`${system.id}: dispose handler is required`);
    }
    byId.set(system.id, system);
  }

  for (const system of systems) {
    for (const dependency of system.dependencies) {
      if (!byId.has(dependency)) {
        throw new Error(`${system.id}: missing dependency ${dependency}`);
      }
    }
  }

  const ordered: WorldSystem[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(system: WorldSystem, trail: string[]) {
    if (visiting.has(system.id)) {
      throw new Error(`World system dependency cycle: ${[...trail, system.id].join(' -> ')}`);
    }
    if (visited.has(system.id)) return;

    visiting.add(system.id);
    for (const dependencyId of system.dependencies) {
      visit(byId.get(dependencyId)!, [...trail, system.id]);
    }
    visiting.delete(system.id);
    visited.add(system.id);
    ordered.push(system);
  }

  for (const system of systems) visit(system, []);
  return ordered;
}

export function createWorldRuntime(config: WorldRuntimeConfig) {
  const orderedSystems = orderSystems(config.systems);
  const clock = createFixedClock(config.clock);
  const resources = config.resourceRegistry ?? createResourceRegistry();
  const initialized: WorldSystem[] = [];
  let runtimeState: WorldRuntimeState = 'created';
  let elapsedSeconds = 0;
  let stepNumber = 0;

  function context(): WorldContext {
    return { resources, elapsedSeconds };
  }

  function requireState(operation: string, expected: WorldRuntimeState) {
    if (runtimeState !== expected) {
      throw new Error(`Cannot ${operation} world runtime while ${runtimeState}; expected ${expected}`);
    }
  }

  async function disposeInitialized() {
    const failures: Error[] = [];
    for (let index = initialized.length - 1; index >= 0; index -= 1) {
      const system = initialized[index];
      try {
        await system.dispose(context());
        initialized.splice(index, 1);
      } catch (error) {
        const reason = error instanceof Error ? error : new Error(String(error));
        failures.push(new Error(`${system.id}: ${reason.message}`, { cause: reason }));
      }
    }
    try {
      await resources.disposeAll();
    } catch (error) {
      const aggregate = error instanceof AggregateError
        ? [...error.errors].map(item => item instanceof Error ? item : new Error(String(item)))
        : [error instanceof Error ? error : new Error(String(error))];
      failures.push(...aggregate);
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, `World disposal failed in ${failures.length} place(s)`);
    }
  }

  return {
    async initialize() {
      requireState('initialize', 'created');
      try {
        for (const system of orderedSystems) {
          await system.initialize(context());
          initialized.push(system);
        }
        runtimeState = 'running';
      } catch (error) {
        runtimeState = 'failed';
        try {
          await disposeInitialized();
        } catch (disposalError) {
          throw new AggregateError(
            [error, disposalError],
            'World initialization and rollback both failed',
          );
        }
        throw error;
      }
    },

    advance(frameDeltaSeconds: number) {
      requireState('advance', 'running');
      const result = clock.advance(frameDeltaSeconds);
      for (let index = 0; index < result.steps; index += 1) {
        elapsedSeconds += result.fixedStepSeconds;
        stepNumber += 1;
        const fixedContext: FixedUpdateContext = {
          ...context(),
          deltaSeconds: result.fixedStepSeconds,
          stepNumber,
        };
        for (const system of orderedSystems) system.fixedUpdate?.(fixedContext);
      }
      const renderContext: RenderUpdateContext = {
        ...context(),
        frameDeltaSeconds,
        interpolationAlpha: result.alpha,
      };
      for (const system of orderedSystems) system.renderUpdate?.(renderContext);
      return { fixedSteps: result.steps, alpha: result.alpha };
    },

    pause() {
      requireState('pause', 'running');
      for (const system of orderedSystems) system.pause?.(context());
      runtimeState = 'paused';
    },

    resume() {
      requireState('resume', 'paused');
      clock.reset();
      for (const system of orderedSystems) system.resume?.(context());
      runtimeState = 'running';
    },

    async dispose() {
      if (runtimeState === 'disposed') return;
      if (runtimeState === 'failed' && initialized.length === 0 && resources.size() === 0) {
        runtimeState = 'disposed';
        return;
      }
      if (runtimeState !== 'created' && runtimeState !== 'running'
        && runtimeState !== 'paused' && runtimeState !== 'failed') {
        throw new Error(`Cannot dispose world runtime while ${runtimeState}`);
      }
      try {
        await disposeInitialized();
        runtimeState = 'disposed';
      } catch (error) {
        runtimeState = 'failed';
        throw error;
      }
    },

    state() {
      return runtimeState;
    },

    resources,
  };
}

export type WorldRuntime = ReturnType<typeof createWorldRuntime>;
