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

    expect(results).toHaveLength(1);
    expect(results[0].href).toBe('/simulations/c5-ch07-a03-soluble-and-insoluble-substances');
  });

  it('keeps catalogued candidates searchable without launch URLs', () => {
    const results = searchCurriculum(CURRICULUM_SEARCH_DOCUMENTS, 'supersense of smell');
    const candidate = results.find(result => result.title === 'Supersense of smell');

    expect(candidate?.releaseMaturity).toBe('catalogued');
    expect(candidate?.href).toBe('/simulations#c5-ch01-a01-supersense-of-smell');
  });
});
