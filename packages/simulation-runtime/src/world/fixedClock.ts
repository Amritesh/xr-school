export interface FixedClockConfig {
  fixedStepSeconds?: number;
  maxSubsteps?: number;
  maxFrameDeltaSeconds?: number;
}

export interface FixedClockAdvance {
  steps: number;
  fixedStepSeconds: number;
  alpha: number;
  droppedSeconds: number;
}

function positiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

export function createFixedClock(config: FixedClockConfig = {}) {
  const fixedStepSeconds = config.fixedStepSeconds ?? 1 / 60;
  const maxSubsteps = config.maxSubsteps ?? 4;
  const maxFrameDeltaSeconds = config.maxFrameDeltaSeconds ?? 0.1;

  positiveFinite(fixedStepSeconds, 'Fixed step');
  positiveFinite(maxFrameDeltaSeconds, 'Maximum frame delta');
  if (!Number.isInteger(maxSubsteps) || maxSubsteps <= 0) {
    throw new Error('Maximum substeps must be a positive integer');
  }

  let accumulatorSeconds = 0;

  return {
    advance(frameDeltaSeconds: number): FixedClockAdvance {
      if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds < 0) {
        throw new Error('Frame delta must be a non-negative finite number');
      }

      const acceptedDelta = Math.min(frameDeltaSeconds, maxFrameDeltaSeconds);
      accumulatorSeconds += acceptedDelta;
      const availableSteps = Math.floor(accumulatorSeconds / fixedStepSeconds);
      const steps = Math.min(availableSteps, maxSubsteps);
      accumulatorSeconds -= steps * fixedStepSeconds;

      let droppedSeconds = frameDeltaSeconds - acceptedDelta;
      if (availableSteps > maxSubsteps) {
        const retainedSeconds = accumulatorSeconds % fixedStepSeconds;
        droppedSeconds += accumulatorSeconds - retainedSeconds;
        accumulatorSeconds = retainedSeconds;
      }

      return {
        steps,
        fixedStepSeconds,
        alpha: accumulatorSeconds / fixedStepSeconds,
        droppedSeconds,
      };
    },
    reset() {
      accumulatorSeconds = 0;
    },
  };
}

export type FixedClock = ReturnType<typeof createFixedClock>;
