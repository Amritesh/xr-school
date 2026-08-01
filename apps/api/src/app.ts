import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';

import { registerRobotreeRoutes } from './robotree.js';

export const RELEASED_SIMULATION_MODULES = Object.freeze(
  IMPLEMENTED_SIMULATIONS
    .filter(definition => definition.module.publicationStatus === 'released')
    .map(definition => definition.module),
);

export interface CreateApiAppOptions {
  logger?: boolean | { level: string };
}

export async function buildApp(
  options: CreateApiAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? { level: 'info' },
  });

  await app.register(cors, {
    origin: ['http://localhost:3000', /http:\/\/192\.168\.\d+\.\d+:3000/],
  });

  app.get('/v1/simulation-modules', async () => ({
    items: RELEASED_SIMULATION_MODULES,
    page: {
      page: 1,
      pageSize: RELEASED_SIMULATION_MODULES.length,
      totalItems: RELEASED_SIMULATION_MODULES.length,
      totalPages: 1,
    },
  }));

  app.get<{ Params: { moduleId: string } }>(
    '/v1/simulation-modules/:moduleId',
    async (request, reply) => {
      const simulation = RELEASED_SIMULATION_MODULES.find(
        module => module.id === request.params.moduleId || module.slug === request.params.moduleId,
      );
      if (!simulation) {
        reply.code(404);
        return { code: 'NOT_FOUND', message: 'Simulation not found' };
      }
      return simulation;
    },
  );

  registerRobotreeRoutes(app);

  app.get('/health', async () => ({
    status: 'ok',
    service: 'xr-school-api',
    version: '0.1.0',
  }));

  return app;
}

/** @deprecated Use buildApp for the testable Fastify application factory. */
export const createApiApp = buildApp;
