export type MatterPhase = 'solid' | 'liquid' | 'gas';

export interface MatterStateOutput extends Record<string, number | string> {
  phase: MatterPhase;
  motionFactor: number;
  spacingFactor: number;
}

export function evaluateMatterState(heat: number): MatterStateOutput {
  if (!Number.isFinite(heat) || heat < 0 || heat > 1) {
    throw new Error('heat must be a finite normalized value from 0 to 1');
  }
  const phase: MatterPhase = heat < 0.34
    ? 'solid'
    : heat < 0.68
      ? 'liquid'
      : 'gas';
  return {
    phase,
    motionFactor: Number(heat.toFixed(12)),
    spacingFactor: phase === 'solid' ? 0.12 : phase === 'liquid' ? 0.5 : 1,
  };
}
