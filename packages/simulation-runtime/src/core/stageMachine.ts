export interface StageMachine<TStage> {
  current(): TStage;
  currentIndex(): number;
  next(): TStage;
  previous(): TStage;
  goTo(index: number): TStage;
  reset(): TStage;
  size(): number;
}

function clamp(index: number, maxIndex: number) {
  return Math.min(Math.max(index, 0), maxIndex);
}

export function createStageMachine<TStage>(stages: readonly TStage[]): StageMachine<TStage> {
  if (stages.length === 0) {
    throw new Error('createStageMachine requires at least one stage');
  }

  let index = 0;
  const maxIndex = stages.length - 1;

  return {
    current() {
      return stages[index];
    },
    currentIndex() {
      return index;
    },
    next() {
      index = clamp(index + 1, maxIndex);
      return stages[index];
    },
    previous() {
      index = clamp(index - 1, maxIndex);
      return stages[index];
    },
    goTo(nextIndex: number) {
      index = clamp(nextIndex, maxIndex);
      return stages[index];
    },
    reset() {
      index = 0;
      return stages[index];
    },
    size() {
      return stages.length;
    },
  };
}
