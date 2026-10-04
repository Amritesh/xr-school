'use client';

import dynamic from 'next/dynamic';
import { createElement, type ComponentType } from 'react';

import {
  GUIDED_SIMULATION_DEFINITIONS,
  IMPLEMENTED_SIMULATIONS,
} from '@xr-school/simulation-content';
import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';
import type { SimulationSceneAdapter } from '@xr-school/simulation-web';
import GuidedSimulationViewer from '../../components/simulations/shared/GuidedSimulationViewer';
import InteractiveInvestigationViewer from '../../components/simulations/shared/InteractiveInvestigationViewer';
import { findInteractiveViewerRegistration } from './interactive/registrations';

export interface SimulationViewerModule {
  default: ComponentType;
}

export type SimulationViewerLoader = () => Promise<SimulationViewerModule>;

interface SimulationViewerInput {
  sourcePath: string;
  load: SimulationViewerLoader;
}

function guidedViewerInput(
  moduleId: string,
  sourcePath: string,
  loadAdapter: () => Promise<{ default: SimulationSceneAdapter }>,
): SimulationViewerInput {
  const definition = GUIDED_SIMULATION_DEFINITIONS.find(
    item => item.moduleId === moduleId,
  );
  if (!definition) throw new Error(`Missing guided definition ${moduleId}`);
  return {
    sourcePath,
    async load() {
      const { default: sceneAdapter } = await loadAdapter();
      return {
        default: function RegisteredGuidedViewer() {
          return createElement(GuidedSimulationViewer, {
            definition,
            sceneAdapter,
          });
        },
      };
    },
  };
}

function bespokeGuidedViewerInput(
  moduleId: string,
  sourcePath: string,
  loadAdapter: () => Promise<{ default: SimulationSceneAdapter }>,
  loadViewer: () => Promise<SimulationViewerModule>,
): SimulationViewerInput {
  const definition = GUIDED_SIMULATION_DEFINITIONS.find(
    item => item.moduleId === moduleId,
  );
  if (!definition) throw new Error(`Missing guided definition ${moduleId}`);
  return {
    sourcePath,
    async load() {
      const [{ default: sceneAdapter }, { default: Viewer }] = await Promise.all([
        loadAdapter(),
        loadViewer(),
      ]);
      return {
        default: function RegisteredBespokeGuidedViewer() {
          return createElement(GuidedSimulationViewer, {
            definition,
            sceneAdapter,
            experienceComponent: Viewer,
          });
        },
      };
    },
  };
}

function interactiveViewerInput(
  viewerKey: string,
  sourcePath: string,
): SimulationViewerInput {
  const registration = findInteractiveViewerRegistration(viewerKey);
  if (!registration) {
    throw new Error(`Missing interactive viewer registration ${viewerKey}`);
  }
  return {
    sourcePath,
    async load() {
      return {
        default: function RegisteredInteractiveViewer() {
          return createElement(InteractiveInvestigationViewer, { registration });
        },
      };
    },
  };
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
  'fungi-development': {
    sourcePath: 'apps/web/components/simulations/FungiDevelopmentViewer.tsx',
    load: () => import('../../components/simulations/FungiDevelopmentViewer'),
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
  'interactive-float-or-sink': interactiveViewerInput(
    'interactive-float-or-sink',
    'apps/web/lib/simulations/interactive/float-or-sink.scene.ts',
  ),
  'interactive-solubility': interactiveViewerInput(
    'interactive-solubility',
    'apps/web/lib/simulations/interactive/solubility.scene.ts',
  ),
  'interactive-lipid-test': interactiveViewerInput(
    'interactive-lipid-test',
    'apps/web/lib/simulations/interactive/lipid-test.scene.ts',
  ),
  'interactive-mineral-sources': interactiveViewerInput(
    'interactive-mineral-sources',
    'apps/web/lib/simulations/interactive/mineral-sources.scene.ts',
  ),
  'interactive-vitamin-deficiencies': interactiveViewerInput(
    'interactive-vitamin-deficiencies',
    'apps/web/lib/simulations/interactive/vitamin-deficiencies.scene.ts',
  ),
  'interactive-shape-sorting': interactiveViewerInput(
    'interactive-shape-sorting',
    'apps/web/lib/simulations/interactive/shape-sorting.scene.ts',
  ),
  'guided-food-spoilage': bespokeGuidedViewerInput('sim-c05-ch04-a01-food-spoilage', 'apps/web/lib/simulations/guided/c5-ch04-a01-food-spoilage.scene.ts', () => import('./guided/c5-ch04-a01-food-spoilage.scene'), () => import('../../components/simulations/FoodSpoilageViewer')),
  'guided-milk-spoilage': bespokeGuidedViewerInput('sim-c05-ch04-a02-milk-spoilage', 'apps/web/lib/simulations/guided/c5-ch04-a02-milk-spoilage.scene.ts', () => import('./guided/c5-ch04-a02-milk-spoilage.scene'), () => import('../../components/simulations/MilkSpoilageViewer')),
  'guided-aam-papad': bespokeGuidedViewerInput('sim-c05-ch04-a03-the-making-of-aam-papad', 'apps/web/lib/simulations/guided/c5-ch04-a03-the-making-of-aam-papad.scene.ts', () => import('./guided/c5-ch04-a03-the-making-of-aam-papad.scene'), () => import('../../components/simulations/AamPapadViewer')),
  'guided-pitcher-plant': bespokeGuidedViewerInput('sim-c05-ch05-a01-pitcher-plant-the-insect-hunter', 'apps/web/lib/simulations/guided/c5-ch05-a01-pitcher-plant-the-insect-hunter.scene.ts', () => import('./guided/c5-ch05-a01-pitcher-plant-the-insect-hunter.scene'), () => import('../../components/simulations/PitcherPlantViewer')),
  'guided-seed-dispersal': bespokeGuidedViewerInput('sim-c05-ch05-a02-seed-dispersal', 'apps/web/lib/simulations/guided/c5-ch05-a02-seed-dispersal.scene.ts', () => import('./guided/c5-ch05-a02-seed-dispersal.scene'), () => import('../../components/simulations/SeedDispersalViewer')),
  'guided-rainwater-storage': bespokeGuidedViewerInput('sim-c05-ch06-a01-the-storage-of-rainwater', 'apps/web/lib/simulations/guided/c5-ch06-a01-the-storage-of-rainwater.scene.ts', () => import('./guided/c5-ch06-a01-the-storage-of-rainwater.scene'), () => import('../../components/simulations/RainwaterStorageViewer')),
  'guided-stepwell-structure': bespokeGuidedViewerInput('sim-c05-ch06-a02-a-step-well-structure', 'apps/web/lib/simulations/guided/c5-ch06-a02-a-step-well-structure.scene.ts', () => import('./guided/c5-ch06-a02-a-step-well-structure.scene'), () => import('../../components/simulations/StepwellStructureViewer')),
  'guided-dead-sea-salt-water': bespokeGuidedViewerInput('sim-c05-ch07-a02-dead-sea-salt-water-and-its-effects', 'apps/web/lib/simulations/guided/c5-ch07-a02-dead-sea-salt-water-and-its-effects.scene.ts', () => import('./guided/c5-ch07-a02-dead-sea-salt-water-and-its-effects.scene'), () => import('../../components/simulations/DeadSeaSaltWaterViewer')),
  'guided-malaria-diagnosis': bespokeGuidedViewerInput('sim-c05-ch08-a01-diagnosis-of-malaria', 'apps/web/lib/simulations/guided/c5-ch08-a01-diagnosis-of-malaria.scene.ts', () => import('./guided/c5-ch08-a01-diagnosis-of-malaria.scene'), () => import('../../components/simulations/MalariaDiagnosisViewer')),
  'guided-mosquito-life-cycle': bespokeGuidedViewerInput('sim-c05-ch08-a02-life-cycle-of-the-mosquito', 'apps/web/lib/simulations/guided/c5-ch08-a02-life-cycle-of-the-mosquito.scene.ts', () => import('./guided/c5-ch08-a02-life-cycle-of-the-mosquito.scene'), () => import('../../components/simulations/MosquitoLifeCycleViewer')),
  'guided-river-crossing': bespokeGuidedViewerInput('sim-c05-ch09-a01-river-crossing-adventure', 'apps/web/lib/simulations/guided/c5-ch09-a01-river-crossing-adventure.scene.ts', () => import('./guided/c5-ch09-a01-river-crossing-adventure.scene'), () => import('../../components/simulations/RiverCrossingAdventureViewer')),
  'guided-rock-climbing': bespokeGuidedViewerInput('sim-c05-ch09-a02-rock-climbing', 'apps/web/lib/simulations/guided/c5-ch09-a02-rock-climbing.scene.ts', () => import('./guided/c5-ch09-a02-rock-climbing.scene'), () => import('../../components/simulations/RockClimbingViewer')),
  'guided-camp-in-snow': bespokeGuidedViewerInput('sim-c05-ch09-a03-camp-in-the-snow', 'apps/web/lib/simulations/guided/c5-ch09-a03-camp-in-the-snow.scene.ts', () => import('./guided/c5-ch09-a03-camp-in-the-snow.scene'), () => import('../../components/simulations/CampInSnowViewer')),
  'guided-snow-mountain-climbing': bespokeGuidedViewerInput('sim-c05-ch09-a04-snow-mountain-climbing', 'apps/web/lib/simulations/guided/c5-ch09-a04-snow-mountain-climbing.scene.ts', () => import('./guided/c5-ch09-a04-snow-mountain-climbing.scene'), () => import('../../components/simulations/SnowMountainClimbingViewer')),
  'guided-ancient-fort': bespokeGuidedViewerInput('sim-c05-ch10-a01-a-visit-of-ancient-fort', 'apps/web/lib/simulations/guided/c5-ch10-a01-a-visit-of-ancient-fort.scene.ts', () => import('./guided/c5-ch10-a01-a-visit-of-ancient-fort.scene'), () => import('../../components/simulations/AncientFortVisitViewer')),
  'guided-cotton-farming': bespokeGuidedViewerInput('sim-c06-ch03-a01-cotton-farming', 'apps/web/lib/simulations/guided/c6-ch03-a01-cotton-farming.scene.ts', () => import('./guided/c6-ch03-a01-cotton-farming.scene'), () => import('../../components/simulations/CottonFarmingViewer')),
  'guided-cotton-ginning': bespokeGuidedViewerInput('sim-c06-ch03-a02-the-process-of-cotton-ginning', 'apps/web/lib/simulations/guided/c6-ch03-a02-the-process-of-cotton-ginning.scene.ts', () => import('./guided/c6-ch03-a02-the-process-of-cotton-ginning.scene'), () => import('../../components/simulations/CottonGinningViewer')),
  'guided-shearing-scouring-wool': bespokeGuidedViewerInput('sim-c07-ch03-a01-shearing-and-scouring-of-wool', 'apps/web/lib/simulations/guided/c7-ch03-a01-shearing-and-scouring-of-wool.scene.ts', () => import('./guided/c7-ch03-a01-shearing-and-scouring-of-wool.scene'), () => import('../../components/simulations/WoolProcessingViewer')),
  'guided-yarn-maker-mission': bespokeGuidedViewerInput('sim-c07-ch03-a03-spinning-and-rolling-of-wool', 'apps/web/lib/simulations/guided/c7-ch03-a03-spinning-and-rolling-of-wool.scene.ts', () => import('./guided/c7-ch03-a03-spinning-and-rolling-of-wool.scene'), () => import('../../components/simulations/YarnMakerViewer')),
  'guided-virus-invasion': bespokeGuidedViewerInput('sim-c08-ch02-a02-virus-introduction-spreading-and-its-effects', 'apps/web/lib/simulations/guided/c8-ch02-a02-virus-introduction-spreading-and-its-effects.scene.ts', () => import('./guided/c8-ch02-a02-virus-introduction-spreading-and-its-effects.scene'), () => import('../../components/simulations/VirusInvasionViewer')),
  'guided-irrigation-methods': bespokeGuidedViewerInput('sim-c08-ch01-a03-irrigation-methods', 'apps/web/lib/simulations/guided/c8-ch01-a03-irrigation-methods.scene.ts', () => import('./guided/c8-ch01-a03-irrigation-methods.scene'), () => import('../../components/simulations/IrrigationMethodsViewer')),
  'guided-harvesting-threshing-storage': bespokeGuidedViewerInput('sim-c08-ch01-a05-harvesting-threshing-and-storage-of-crops', 'apps/web/lib/simulations/guided/c8-ch01-a05-harvesting-threshing-and-storage-of-crops.scene.ts', () => import('./guided/c8-ch01-a05-harvesting-threshing-and-storage-of-crops.scene'), () => import('../../components/simulations/HarvestingStorageViewer')),
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
  const definition = IMPLEMENTED_SIMULATIONS.find(
    item => item.module.viewerKey === viewerKey,
  );
  if (!definition) {
    throw new Error(`Viewer key "${viewerKey}" has no canonical simulation definition`);
  }
  return createElement(
    'div',
    {
      'data-simulation-id': definition.module.id,
      'data-simulation-slug': definition.module.slug,
      'data-publication-status': definition.module.publicationStatus,
      'data-evidence-maturity': definition.module.evidenceMaturity,
      style: { display: 'contents' },
    },
    createElement(Viewer),
  );
}
