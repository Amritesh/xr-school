import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SIMULATION_MODULES } from '../../../packages/simulation-content/src/modules';
import { registerRobotreeRoutes } from './robotree';

const app = Fastify({ logger: { level: 'info' } });

await app.register(cors, {
  origin: ['http://localhost:3000', /http:\/\/192\.168\.\d+\.\d+:3000/],
});

const SIMULATIONS = SIMULATION_MODULES;

app.get('/v1/simulation-modules', async () => ({
  items: SIMULATIONS,
  page: { page: 1, pageSize: 20, totalItems: SIMULATIONS.length, totalPages: 1 },
}));

app.get<{ Params: { moduleId: string } }>('/v1/simulation-modules/:moduleId', async (req, reply) => {
  const sim = SIMULATIONS.find(s => s.id === req.params.moduleId || s.slug === req.params.moduleId);
  if (!sim) { reply.code(404); return { code: 'NOT_FOUND', message: 'Simulation not found' }; }
  return sim;
});

registerRobotreeRoutes(app);

app.get('/health', async () => ({ status: 'ok', service: 'xr-school-api', version: '0.1.0' }));

const host = '0.0.0.0';
const port = 3001;
await app.listen({ port, host });
console.log(`\n  ✓ API running at http://localhost:${port}`);
console.log(`  ✓ Simulations: http://localhost:${port}/v1/simulation-modules\n`);
