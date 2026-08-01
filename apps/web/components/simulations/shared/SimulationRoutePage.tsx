import { notFound } from 'next/navigation';

import {
  findImplementedSimulation,
} from '@xr-school/simulation-content';
import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';
import { RegisteredSimulationViewer } from '../../../lib/simulations/viewerRegistry';

export interface CanonicalSimulationRoute {
  definition: ImplementedSimulationDefinition;
  viewerKey: string;
}

export interface SimulationRoutePageProps {
  slug: string;
}

export function resolveCanonicalSimulationRoute(
  slug: string,
): CanonicalSimulationRoute | undefined {
  const definition = findImplementedSimulation(slug);
  if (
    !definition
    || definition.module.slug !== slug
    || definition.module.publicationStatus !== 'released'
  ) {
    return undefined;
  }
  return { definition, viewerKey: definition.module.viewerKey };
}

export default function SimulationRoutePage({ slug }: SimulationRoutePageProps) {
  const route = resolveCanonicalSimulationRoute(slug);
  if (!route) notFound();
  return <RegisteredSimulationViewer viewerKey={route.viewerKey} />;
}
