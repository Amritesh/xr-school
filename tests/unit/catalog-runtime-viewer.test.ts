import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCIENCE_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';
import {
  IMPLEMENTED_SIMULATION_SLUGS,
  getSimulationCatalogSections,
} from '../../apps/web/lib/simulationAvailability';

const routePath = resolve(process.cwd(), 'apps/web/app/simulations/[slug]/page.tsx');
const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/GenericCatalogSimulationViewer.tsx');
const availabilityPath = resolve(process.cwd(), 'apps/web/lib/simulationAvailability.ts');

describe('catalog runtime simulations', () => {
  it('serves every implemented simulation from its dedicated page, with no catch-all route to shadow it', () => {
    // A dynamic /simulations/[slug] route once prerendered over the dedicated
    // pages on Vercel (same output paths), 404ing pollination and circuit and
    // replacing the rest with the generic viewer. It must not come back.
    expect(existsSync(routePath)).toBe(false);
    for (const slug of IMPLEMENTED_SIMULATION_SLUGS) {
      expect(existsSync(resolve(process.cwd(), `apps/web/app/simulations/${slug}/page.tsx`))).toBe(true);
    }

    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);
    expect(SCIENCE_SIMULATION_CATALOG).toHaveLength(497);
    expect(sections.launchable).toHaveLength(IMPLEMENTED_SIMULATION_SLUGS.length);
    expect(sections.catalogued.find(item => item.slug === 'c5-ch01-a01-supersense-of-smell')?.href).toBeUndefined();
  });

  it('uses reusable archetype rendering instead of static queued cards', () => {
    expect(existsSync(viewerPath)).toBe(true);
    const viewerSource = readFileSync(viewerPath, 'utf8');
    expect(viewerSource).toContain('@/lib/runtimePhysics');
    expect(viewerSource).toContain('createPhysicsWorld');
    expect(viewerSource).toContain('createParticleCloud');
    expect(viewerSource).toContain('buildArchetypeStages');
    expect(viewerSource).toContain('playSimulationNarration');

    const availabilitySource = readFileSync(availabilityPath, 'utf8');
    expect(availabilitySource).toContain('toCataloguedCard');
    expect(availabilitySource).toContain("releaseMaturity: 'internalQA'");
  });
});
