import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = new URL(
  '../../apps/web/app/simulations/c8-ch02-a03-fungi-and-its-development/page.tsx',
  import.meta.url,
);

describe('fungi development canonical route', () => {
  it('delegates the exact canonical slug to the shared route host', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('SimulationRoutePage');
    expect(source).toContain(
      'slug="c8-ch02-a03-fungi-and-its-development"',
    );
  });
});
