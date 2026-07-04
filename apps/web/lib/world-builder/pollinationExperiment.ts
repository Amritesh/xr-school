export type PollinationExperimentAction =
  | 'collect-pollen'
  | 'transfer-pollen'
  | 'trace-pollen-tube'
  | 'advance-time-lapse'
  | 'open-fruit'
  | 'plant-seed'
  | 'cover-seed'
  | 'water-seed';

export interface PollinationExperimentSnapshot {
  brushPollen: number;
  treatmentPollen: number;
  pollenTubeComplete: boolean;
  treatmentFruitFormed: boolean;
  controlFruitFormed: boolean;
  fruitOpened: boolean;
  seedPlanted: boolean;
  seedCovered: boolean;
  waterMl: number;
  germinated: boolean;
}

const initialState = (): PollinationExperimentSnapshot => ({
  brushPollen: 0,
  treatmentPollen: 0,
  pollenTubeComplete: false,
  treatmentFruitFormed: false,
  controlFruitFormed: false,
  fruitOpened: false,
  seedPlanted: false,
  seedCovered: false,
  waterMl: 0,
  germinated: false,
});

function requireState(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function createPollinationExperiment() {
  let state = initialState();

  return {
    snapshot: (): PollinationExperimentSnapshot => ({ ...state }),

    reset(): PollinationExperimentSnapshot {
      state = initialState();
      return { ...state };
    },

    apply(action: PollinationExperimentAction): PollinationExperimentSnapshot {
      switch (action) {
        case 'collect-pollen':
          state.brushPollen = 24;
          break;
        case 'transfer-pollen':
          requireState(state.brushPollen > 0, 'Collect pollen before transfer');
          state.treatmentPollen = 12;
          state.brushPollen -= 12;
          break;
        case 'trace-pollen-tube':
          requireState(
            state.treatmentPollen > 0,
            'Transfer pollen before tracing the pollen tube',
          );
          state.pollenTubeComplete = true;
          break;
        case 'advance-time-lapse':
          requireState(
            state.pollenTubeComplete,
            'Complete the pollen tube before advancing time',
          );
          state.treatmentFruitFormed = true;
          break;
        case 'open-fruit':
          requireState(
            state.treatmentFruitFormed,
            'The treatment flower must form fruit before it can be opened',
          );
          state.fruitOpened = true;
          break;
        case 'plant-seed':
          requireState(state.fruitOpened, 'Open fruit before planting a seed');
          state.seedPlanted = true;
          break;
        case 'cover-seed':
          requireState(state.seedPlanted, 'Plant the seed before covering it');
          state.seedCovered = true;
          break;
        case 'water-seed':
          requireState(state.seedCovered, 'Cover the seed before watering it');
          state.waterMl = 35;
          state.germinated = true;
          break;
      }
      return { ...state };
    },
  };
}

export type PollinationExperiment = ReturnType<typeof createPollinationExperiment>;
