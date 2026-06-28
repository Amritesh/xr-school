export type SortingCategory = {
  id: string;
  label: string;
};

export type SortingItem = {
  id: string;
  label: string;
  correctCategoryId: string;
};

export type SortingBoardConfig = {
  categories: SortingCategory[];
  items: SortingItem[];
};

export type SortingAssignments = Record<string, string>;

export type SortingMisplacement = {
  itemId: string;
  label: string;
  expectedCategoryId: string;
  actualCategoryId: string;
};

export type SortingScore = {
  correct: number;
  total: number;
  percent: number;
  misplaced: SortingMisplacement[];
  unplacedItemIds: string[];
};

export type SortingBoard = {
  score(assignments: SortingAssignments): SortingScore;
};

export function createSortingBoard(config: SortingBoardConfig): SortingBoard {
  const categories = new Set(config.categories.map(category => category.id));
  const itemsById = new Map(config.items.map(item => [item.id, item]));

  for (const item of config.items) {
    if (!categories.has(item.correctCategoryId)) {
      throw new Error(`Item "${item.id}" references unknown category "${item.correctCategoryId}"`);
    }
  }

  return {
    score(assignments) {
      const misplaced: SortingMisplacement[] = [];
      const unplacedItemIds: string[] = [];
      let correct = 0;

      for (const [itemId, categoryId] of Object.entries(assignments)) {
        if (!itemsById.has(itemId)) throw new Error(`Unknown item "${itemId}"`);
        if (!categories.has(categoryId)) throw new Error(`Unknown category "${categoryId}"`);
      }

      for (const item of config.items) {
        const assignedCategoryId = assignments[item.id];
        if (!assignedCategoryId) {
          unplacedItemIds.push(item.id);
          continue;
        }

        if (assignedCategoryId === item.correctCategoryId) {
          correct += 1;
          continue;
        }

        misplaced.push({
          itemId: item.id,
          label: item.label,
          expectedCategoryId: item.correctCategoryId,
          actualCategoryId: assignedCategoryId,
        });
      }

      return {
        correct,
        total: config.items.length,
        percent: Math.round((correct / config.items.length) * 100),
        misplaced,
        unplacedItemIds,
      };
    },
  };
}
