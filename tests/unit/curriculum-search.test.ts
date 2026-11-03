import { describe, expect, it } from 'vitest';
import { CURRICULUM_SEARCH_DOCUMENTS } from '../../apps/web/lib/curriculumSearch.generated';
import { searchCurriculum } from '../../apps/web/lib/curriculumSearch';

describe('curriculum search', () => {
  it.each([
    ['fertilisation', 'pollination'],
    ['electric current', 'circuit'],
    ['particle motion', 'c9-ch01-a02-states-of-matter'],
    ['solubility', 'c5-ch07-a03-soluble-and-insoluble-substances'],
    ['food sources', 'c6-ch01-a01-sources-of-food'],
    ['mycelium', 'c8-ch02-a03-fungi-and-its-development'],
  ])('connects the concept “%s” to its working simulation', (query, slug) => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, query);

    expect(results.some(result => result.kind === 'simulation' && result.href === `/simulations/${slug}`)).toBe(true);
  });

  it('ranks an exact canonical concept above broad keyword matches', () => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, 'solubility');

    expect(results[0]).toMatchObject({
      kind: 'concept',
      title: 'Solubility',
    });
  });

  it('filters after text matching by class, subject, and maturity', () => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, '', {
      classLevel: 5,
      subject: 'environmentalScience',
      releaseMaturity: 'internalQA',
    });

    expect(results.map(result => result.href)).toEqual(expect.arrayContaining([
      '/simulations/c5-ch01-a01-supersense-of-smell',
      '/simulations/c5-ch01-a02-supersense-of-sights',
      '/simulations/c5-ch01-a03-super-sense-of-danger',
      '/simulations/c5-ch03-a02-introduction-of-digestive-system',
      '/simulations/c5-ch07-a03-soluble-and-insoluble-substances',
    ]));
    // The three Super Senses investigations join the integrated Class 5 guided
    // classes while preserving every previously released Class 5 activity.
    expect(results).toHaveLength(21);
    expect(results.every(result => result.releaseMaturity === 'internalQA')).toBe(true);
  });

  it('promotes the canonical smell investigation to its launch route', () => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, 'supersense of smell');
    const candidate = results.find(
      result => result.id === 'simulation:c5-ch01-a01-supersense-of-smell',
    );

    expect(candidate?.title).toBe('Super Senses: The Sense of Smell');
    expect(candidate?.releaseMaturity).toBe('internalQA');
    expect(candidate?.href).toBe('/simulations/c5-ch01-a01-supersense-of-smell');
  });

  it('promotes the canonical sight investigation to its launch route', () => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, 'super sense of sight');
    const candidate = results.find(
      result => result.id === 'simulation:c5-ch01-a02-supersense-of-sights',
    );

    expect(candidate?.title).toBe('Super Senses: The Super Sense of Sight');
    expect(candidate?.releaseMaturity).toBe('internalQA');
    expect(candidate?.href).toBe('/simulations/c5-ch01-a02-supersense-of-sights');
  });

  it('promotes the canonical danger-sense investigation to its launch route', () => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, 'sense of danger');
    const candidate = results.find(
      result => result.id === 'simulation:c5-ch01-a03-super-sense-of-danger',
    );

    expect(candidate?.title).toBe('Super Senses: The Sense of Danger');
    expect(candidate?.releaseMaturity).toBe('internalQA');
    expect(candidate?.href).toBe('/simulations/c5-ch01-a03-super-sense-of-danger');
  });
});
