export type ExperimentTrial = {
  id: string;
  label: string;
  expectedOutcomeId: string;
  explanation: string;
};

export type ExperimentBenchConfig = {
  trials: ExperimentTrial[];
};

export type ExperimentObservation = {
  trialId: string;
  predictedOutcomeId: string;
  expectedOutcomeId: string;
  correct: boolean;
  explanation: string;
};

export type ExperimentBench = {
  observe(trialId: string, predictedOutcomeId: string): ExperimentObservation;
};

export function createExperimentBench(config: ExperimentBenchConfig): ExperimentBench {
  const trialsById = new Map(config.trials.map(trial => [trial.id, trial]));

  return {
    observe(trialId, predictedOutcomeId) {
      const trial = trialsById.get(trialId);
      if (!trial) throw new Error(`Unknown trial "${trialId}"`);

      return {
        trialId,
        predictedOutcomeId,
        expectedOutcomeId: trial.expectedOutcomeId,
        correct: predictedOutcomeId === trial.expectedOutcomeId,
        explanation: trial.explanation,
      };
    },
  };
}
