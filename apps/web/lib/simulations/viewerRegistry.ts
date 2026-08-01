'use client';

import dynamic from 'next/dynamic';
import { createElement, type ComponentType } from 'react';

import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';
import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';

export interface SimulationViewerModule {
  default: ComponentType;
}

export type SimulationViewerLoader = () => Promise<SimulationViewerModule>;

interface SimulationViewerInput {
  sourcePath: string;
  load: SimulationViewerLoader;
}

export interface SimulationViewerRegistration extends SimulationViewerInput {
  viewerKey: string;
  Viewer: ComponentType;
}

const VIEWER_INPUTS = {
  pollination: {
    sourcePath: 'apps/web/components/simulations/PollinationViewer.tsx',
    load: () => import('../../components/simulations/PollinationViewer'),
  },
  circuit: {
    sourcePath: 'apps/web/components/simulations/CircuitViewer.tsx',
    load: () => import('../../components/simulations/CircuitViewer'),
  },
  'states-of-matter': {
    sourcePath: 'apps/web/components/simulations/StatesOfMatterViewer.tsx',
    load: () => import('../../components/simulations/StatesOfMatterViewer'),
  },
  'sources-of-food': {
    sourcePath: 'apps/web/components/simulations/FoodSourcesSortingViewer.tsx',
    load: () => import('../../components/simulations/FoodSourcesSortingViewer'),
  },
  solubility: {
    sourcePath: 'apps/web/components/simulations/SolubilityLabViewer.tsx',
    load: () => import('../../components/simulations/SolubilityLabViewer'),
  },
  'digestive-system': {
    sourcePath: 'apps/web/components/simulations/DigestiveSystemViewer.tsx',
    load: () => import('../../components/simulations/DigestiveSystemViewer'),
  },
  'breathing-process': {
    sourcePath: 'apps/web/components/simulations/BreathingProcessViewer.tsx',
    load: () => import('../../components/simulations/BreathingProcessViewer'),
  },
  'force-motion': {
    sourcePath: 'apps/web/components/simulations/ForceMotionViewer.tsx',
    load: () => import('../../components/simulations/ForceMotionViewer'),
  },
  'acid-base': {
    sourcePath: 'apps/web/components/simulations/AcidBaseViewer.tsx',
    load: () => import('../../components/simulations/AcidBaseViewer'),
  },
  'colour-adventure': {
    sourcePath: 'apps/web/components/simulations/ColourAdventureViewer.tsx',
    load: () => import('../../components/simulations/ColourAdventureViewer'),
  },
  'money-town': {
    sourcePath: 'apps/web/components/simulations/MoneyTownViewer.tsx',
    load: () => import('../../components/simulations/MoneyTownViewer'),
  },
  'preposition-adventure': {
    sourcePath: 'apps/web/components/simulations/PrepositionAdventureViewer.tsx',
    load: () => import('../../components/simulations/PrepositionAdventureViewer'),
  },
  'solar-system-mission': {
    sourcePath: 'apps/web/components/simulations/SolarSystemMissionViewer.tsx',
    load: () => import('../../components/simulations/SolarSystemMissionViewer'),
  },
} as const satisfies Record<string, SimulationViewerInput>;

export function assertSimulationViewerCoverage(
  definitions: readonly ImplementedSimulationDefinition[],
  viewerKeys: readonly string[],
): void {
  const registered = new Set<string>();
  for (const viewerKey of viewerKeys) {
    if (registered.has(viewerKey)) {
      throw new Error(`Duplicate viewer key "${viewerKey}"`);
    }
    registered.add(viewerKey);
  }

  const expected = new Set(definitions.map(({ module }) => module.viewerKey));
  const missing = [...expected].filter(viewerKey => !registered.has(viewerKey));
  if (missing.length > 0) {
    throw new Error(`Missing viewer key: ${missing.join(', ')}`);
  }

  const outsideContent = [...registered].filter(viewerKey => !expected.has(viewerKey));
  if (outsideContent.length > 0) {
    throw new Error(
      `Viewer key outside content registry: ${outsideContent.join(', ')}`,
    );
  }
}

const releasedDefinitions = IMPLEMENTED_SIMULATIONS.filter(
  ({ module }) => module.publicationStatus === 'released',
);
const viewerKeys = Object.keys(VIEWER_INPUTS);

assertSimulationViewerCoverage(releasedDefinitions, viewerKeys);

const registrations = new Map<string, SimulationViewerRegistration>(
  Object.entries(VIEWER_INPUTS).map(([viewerKey, input]) => [
    viewerKey,
    Object.freeze({
      viewerKey,
      sourcePath: input.sourcePath,
      load: input.load,
      Viewer: dynamic(input.load, { ssr: false }),
    }),
  ]),
);

export const SIMULATION_VIEWER_KEYS = Object.freeze([...viewerKeys]);

export function findSimulationViewer(
  viewerKey: string,
): SimulationViewerRegistration | undefined {
  return registrations.get(viewerKey);
}

export function getSimulationViewer(
  viewerKey: string,
): SimulationViewerRegistration {
  const registration = findSimulationViewer(viewerKey);
  if (!registration) {
    throw new Error(`Unknown simulation viewer key "${viewerKey}"`);
  }
  return registration;
}

export interface RegisteredSimulationViewerProps {
  viewerKey: string;
}

export function RegisteredSimulationViewer({
  viewerKey,
}: RegisteredSimulationViewerProps) {
  const { Viewer } = getSimulationViewer(viewerKey);
  return createElement(Viewer);
}
