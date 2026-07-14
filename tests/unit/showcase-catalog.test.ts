import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(process.cwd(), 'apps/web/components/catalog/SimulationCatalog.tsx');
const storyPath = resolve(process.cwd(), 'apps/web/components/catalog/SimulationCatalog.stories.tsx');
const homePath = resolve(process.cwd(), 'apps/web/app/page.tsx');
const stylesPath = resolve(process.cwd(), 'apps/web/app/globals.css');
const homeStylesPath = resolve(process.cwd(), 'apps/web/app/home.css');

describe('showcase catalog', () => {
  it('provides an interactive concept search with class, subject, and maturity filters', () => {
    expect(existsSync(componentPath)).toBe(true);
    const source = readFileSync(componentPath, 'utf8');

    expect(source).toContain("'use client'");
    expect(source).toContain('Search courses, chapters, concepts, and simulations');
    expect(source).toContain('Class level');
    expect(source).toContain('Subject');
    expect(source).toContain('Release maturity');
    expect(source).toContain('searchCurriculum');
    expect(source).toContain('{launchableCards.length} Internal QA builds');
    expect(source).toContain('canonicalConceptCount');
  });

  it('filters the featured and roadmap simulation cards in place instead of hiding them behind text search', () => {
    const source = readFileSync(componentPath, 'utf8');

    // A class/subject/maturity filter alone must keep showing the
    // simulation-card sections (with an honest empty state when nothing
    // matches) rather than falling back to the generic search-result list,
    // which used to hide every real "Featured simulations" build the
    // moment any filter was set.
    expect(source).toContain('matchesCatalogFilters');
    expect(source).toContain('filteredLaunchableCards');
    expect(source).toContain('filteredCataloguedCards');
    expect(source).toContain('No Internal QA build yet for this filter.');
    expect(source).toContain('hasTextQuery');
  });

  it('uses a professional product entry page and responsive visual system', () => {
    const home = readFileSync(homePath, 'utf8');
    const styles = readFileSync(stylesPath, 'utf8');
    const homeStyles = readFileSync(homeStylesPath, 'utf8');

    expect(home).toContain('Step inside the lesson');
    expect(home).toContain('Explore the curriculum');
    expect(home).toContain('Clear about what is ready');
    expect(homeStyles).toContain('.home-editorial');
    expect(homeStyles).toContain('.home-class-grid');
    expect(homeStyles).toContain('@media (max-width: 640px)');
    expect(styles).toContain('.showcase-shell');
    expect(styles).toContain('.catalog-grid');
    expect(styles).toContain('@media (max-width: 720px)');
  });

  it('documents default, empty, loading, error, mobile, and interaction states', () => {
    const story = readFileSync(storyPath, 'utf8');

    expect(story).toContain('export const Default');
    expect(story).toContain('export const EmptyState');
    expect(story).toContain('export const LoadingState');
    expect(story).toContain('export const ErrorState');
    expect(story).toContain('export const Mobile');
    expect(story).toContain('export const SearchInteraction');
    expect(story).toContain('a11y');
    expect(story).toContain('mock-digestive-system');
  });
});
