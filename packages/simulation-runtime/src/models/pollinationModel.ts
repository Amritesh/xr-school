export type PollinationEvent =
  | 'producePollen'
  | 'arrivePollinator'
  | 'transferPollen'
  | 'fertilise'
  | 'formSeed'
  | 'germinate'
  | 'maturePlant';

export interface PollinationSnapshot extends Record<string, boolean> {
  pollenProduced: boolean;
  pollinatorArrived: boolean;
  pollenTransferred: boolean;
  fertilised: boolean;
  seedFormed: boolean;
  germinated: boolean;
  plantMatured: boolean;
}

const EVENT_ORDER: PollinationEvent[] = [
  'producePollen',
  'arrivePollinator',
  'transferPollen',
  'fertilise',
  'formSeed',
  'germinate',
  'maturePlant',
];

export function pollinationSnapshotForStage(
  completedStage: number,
): PollinationSnapshot {
  if (!Number.isInteger(completedStage)
    || completedStage < 0 || completedStage > EVENT_ORDER.length) {
    throw new Error('completedStage must be an integer from 0 to 7');
  }
  return {
    pollenProduced: completedStage >= 1,
    pollinatorArrived: completedStage >= 2,
    pollenTransferred: completedStage >= 3,
    fertilised: completedStage >= 4,
    seedFormed: completedStage >= 5,
    germinated: completedStage >= 6,
    plantMatured: completedStage >= 7,
  };
}

export function createPollinationModel() {
  let completed = 0;

  return {
    apply(event: PollinationEvent) {
      const expected = EVENT_ORDER[completed];
      if (event !== expected) {
        const reason = event === 'fertilise' && completed < 3
          ? 'Fertilisation requires pollen transfer first'
          : `Expected ${expected ?? 'no further event'}, received ${event}`;
        throw new Error(reason);
      }
      completed += 1;
      return pollinationSnapshotForStage(completed);
    },

    snapshot() {
      return pollinationSnapshotForStage(completed);
    },

    reset() {
      completed = 0;
    },
  };
}

export type PollinationModel = ReturnType<typeof createPollinationModel>;
