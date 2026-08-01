import {
  validateImplementedSimulationDefinition,
  type ImplementedSimulationDefinition,
} from '@xr-school/simulation-schema';
import { EXISTING_IMPLEMENTED_SIMULATIONS } from './existing.js';

export interface ImplementedSimulationPathResolution {
  definition: ImplementedSimulationDefinition;
  canonicalPath: string;
  redirect: boolean;
}

export interface ImplementedSimulationRegistry {
  definitions: readonly ImplementedSimulationDefinition[];
  find(value: string): ImplementedSimulationDefinition | undefined;
  resolvePath(path: string): ImplementedSimulationPathResolution | undefined;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => cloneValue(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const clone: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      clone[key] = cloneValue(child);
    }
    return clone as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function normalizeLookup(value: string): string {
  const trimmed = value.trim();
  const queryIndex = trimmed.indexOf('?');
  const hashIndex = trimmed.indexOf('#');
  const cutAt = [queryIndex, hashIndex]
    .filter(index => index >= 0)
    .reduce((smallest, index) => Math.min(smallest, index), trimmed.length);
  const withoutQueryOrHash = trimmed.slice(0, cutAt);
  return withoutQueryOrHash.length > 1
    ? withoutQueryOrHash.replace(/\/+$/, '')
    : withoutQueryOrHash;
}

export function routeForSimulation(
  definition: ImplementedSimulationDefinition,
): string {
  return `/simulations/${definition.module.slug}`;
}

function duplicate(kind: string, value: string): never {
  throw new Error(`Duplicate implemented simulation ${kind}: "${value}"`);
}

export function createImplementedSimulationRegistry(
  sourceDefinitions: readonly ImplementedSimulationDefinition[],
): ImplementedSimulationRegistry {
  for (const definition of sourceDefinitions) {
    const errors = validateImplementedSimulationDefinition(definition);
    if (errors.length > 0) {
      throw new Error(
        `Invalid implemented simulation "${definition?.module?.slug ?? 'unknown'}":\n${errors.join('\n')}`,
      );
    }
  }

  const definitions = deepFreeze(
    sourceDefinitions.map(definition => cloneValue(definition)),
  ) as readonly ImplementedSimulationDefinition[];
  const ids = new Map<string, ImplementedSimulationDefinition>();
  const slugs = new Map<string, ImplementedSimulationDefinition>();
  const viewerKeys = new Map<string, ImplementedSimulationDefinition>();
  const canonicalPaths = new Map<string, ImplementedSimulationDefinition>();
  const identifiers = new Map<string, ImplementedSimulationDefinition>();

  for (const definition of definitions) {
    const id = normalizeLookup(definition.module.id);
    const slug = normalizeLookup(definition.module.slug);
    const viewerKey = normalizeLookup(definition.module.viewerKey);
    const canonicalPath = normalizeLookup(routeForSimulation(definition));

    if (ids.has(id)) duplicate('module ID', id);
    if (slugs.has(slug)) duplicate('slug', slug);
    if (viewerKeys.has(viewerKey)) duplicate('viewer key', viewerKey);
    if (canonicalPaths.has(canonicalPath)) duplicate('canonical path', canonicalPath);

    const idOwner = identifiers.get(id);
    if (idOwner && idOwner !== definition) duplicate('canonical identifier', id);
    identifiers.set(id, definition);
    const slugOwner = identifiers.get(slug);
    if (slugOwner && slugOwner !== definition) duplicate('canonical identifier', slug);
    identifiers.set(slug, definition);

    ids.set(id, definition);
    slugs.set(slug, definition);
    viewerKeys.set(viewerKey, definition);
    canonicalPaths.set(canonicalPath, definition);
  }

  const aliases = new Map<string, ImplementedSimulationDefinition>();
  const legacyPaths = new Map<string, ImplementedSimulationDefinition>();
  const legacyPathSources = new Map<string, 'alias' | 'explicit'>();

  const registerLegacyPath = (
    rawPath: string,
    definition: ImplementedSimulationDefinition,
    source: 'alias' | 'explicit',
  ) => {
    const legacyPath = normalizeLookup(rawPath);
    const canonicalOwner = canonicalPaths.get(legacyPath);
    if (canonicalOwner) {
      throw new Error(
        `Legacy path "${rawPath}" collides with canonical path "${legacyPath}"`,
      );
    }
    const owner = legacyPaths.get(legacyPath);
    if (
      owner
      && (owner !== definition || legacyPathSources.get(legacyPath) === source)
    ) {
      throw new Error(`Legacy path collision for "${legacyPath}"`);
    }
    legacyPaths.set(legacyPath, definition);
    legacyPathSources.set(legacyPath, source);
  };

  for (const definition of definitions) {
    for (const rawAlias of definition.module.legacyAliases ?? []) {
      const alias = normalizeLookup(rawAlias);
      if (slugs.has(alias)) {
        throw new Error(
          `Legacy alias "${rawAlias}" collides with canonical slug "${alias}"`,
        );
      }
      if (ids.has(alias)) {
        throw new Error(
          `Legacy alias "${rawAlias}" collides with canonical identifier "${alias}"`,
        );
      }
      const owner = aliases.get(alias);
      if (owner) duplicate('legacy alias', alias);
      aliases.set(alias, definition);
      registerLegacyPath(`/simulations/${alias}`, definition, 'alias');
    }
    for (const legacyPath of definition.legacyPaths) {
      registerLegacyPath(legacyPath, definition, 'explicit');
    }
  }

  const find = (value: string): ImplementedSimulationDefinition | undefined => {
    const normalized = normalizeLookup(value);
    if (normalized.startsWith('/')) {
      return canonicalPaths.get(normalized) ?? legacyPaths.get(normalized);
    }
    return ids.get(normalized) ?? slugs.get(normalized) ?? aliases.get(normalized);
  };

  const resolvePath = (
    path: string,
  ): ImplementedSimulationPathResolution | undefined => {
    const normalized = normalizeLookup(path);
    const canonical = canonicalPaths.get(normalized);
    if (canonical) {
      return {
        definition: canonical,
        canonicalPath: routeForSimulation(canonical),
        redirect: false,
      };
    }
    const legacy = legacyPaths.get(normalized);
    if (!legacy) return undefined;
    return {
      definition: legacy,
      canonicalPath: routeForSimulation(legacy),
      redirect: true,
    };
  };

  return deepFreeze({ definitions, find, resolvePath });
}

const registry = createImplementedSimulationRegistry(
  EXISTING_IMPLEMENTED_SIMULATIONS,
);

export const IMPLEMENTED_SIMULATIONS = registry.definitions;

export function findImplementedSimulation(
  value: string,
): ImplementedSimulationDefinition | undefined {
  return registry.find(value);
}

export function resolveSimulationPath(
  path: string,
): ImplementedSimulationPathResolution | undefined {
  return registry.resolvePath(path);
}
