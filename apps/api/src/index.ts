import { buildApp } from './app.js';

const app = await buildApp({ logger: { level: 'info' } });

const host = '0.0.0.0';
const port = 3001;
await app.listen({ port, host });
console.log(`\n  ✓ API running at http://localhost:${port}`);
console.log(`  ✓ Simulations: http://localhost:${port}/v1/simulation-modules\n`);
