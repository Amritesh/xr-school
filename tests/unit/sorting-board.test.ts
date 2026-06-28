import { describe, expect, it } from 'vitest';
import { createSortingBoard } from '../../packages/simulation-runtime/src/index';

const board = createSortingBoard({
  categories: [
    { id: 'plant', label: 'Plant source' },
    { id: 'animal', label: 'Animal source' },
    { id: 'fungal', label: 'Fungal source' },
  ],
  items: [
    { id: 'rice', label: 'Rice', correctCategoryId: 'plant' },
    { id: 'milk', label: 'Milk', correctCategoryId: 'animal' },
    { id: 'mushroom', label: 'Mushroom', correctCategoryId: 'fungal' },
  ],
});

describe('sorting board runtime', () => {
  it('scores categorized items and reports misconceptions', () => {
    const result = board.score({
      rice: 'plant',
      milk: 'plant',
      mushroom: 'fungal',
    });

    expect(result.correct).toBe(2);
    expect(result.total).toBe(3);
    expect(result.percent).toBe(67);
    expect(result.misplaced).toEqual([
      {
        itemId: 'milk',
        label: 'Milk',
        expectedCategoryId: 'animal',
        actualCategoryId: 'plant',
      },
    ]);
  });

  it('returns remaining item ids for incomplete boards', () => {
    const result = board.score({ rice: 'plant' });

    expect(result.correct).toBe(1);
    expect(result.total).toBe(3);
    expect(result.unplacedItemIds).toEqual(['milk', 'mushroom']);
  });

  it('rejects invalid category assignments', () => {
    expect(() => board.score({ rice: 'mineral' })).toThrow(/Unknown category/);
  });
});
