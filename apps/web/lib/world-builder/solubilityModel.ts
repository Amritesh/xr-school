/**
 * Deterministic educational mixture model.
 *
 * Units: mass in grams, water mass in grams, temperature in °C, time in seconds.
 * Validated range: 50–500 g water, 5–70 °C, 0–500 g added material.
 * The model is mesoscopic: visible grains are presentation samples, not atoms.
 */

export type SubstanceId = 'salt' | 'sugar' | 'sand' | 'chalk' | 'oil';
export type MixtureClass = 'solution' | 'suspension' | 'sediment' | 'emulsion' | 'separated-layer' | 'clear-water';
export type SaturationState = 'not-applicable' | 'unsaturated' | 'near-saturation' | 'saturated';

export interface SubstanceDefinition {
  id: SubstanceId;
  label: string;
  formula: string;
  kind: 'soluble-solid' | 'insoluble-solid' | 'immiscible-liquid';
  color: string;
  densityGPerMl: number;
  particleRadiusMm: number;
  solubilityAt25GPer100GWater: number;
  solubilityTemperatureSlope: number;
  dissolutionRatePerSecond: number;
  suspensionFractionWhenStirred: number;
  settlingRatePerSecond: number;
  turbidityStrength: number;
  explanation: string;
}

export const SOLUBILITY_SUBSTANCES: Record<SubstanceId, SubstanceDefinition> = {
  salt: {
    id: 'salt', label: 'Table salt', formula: 'NaCl', kind: 'soluble-solid', color: '#dff5ff',
    densityGPerMl: 2.16, particleRadiusMm: 0.35, solubilityAt25GPer100GWater: 36,
    solubilityTemperatureSlope: 0.045, dissolutionRatePerSecond: 0.16,
    suspensionFractionWhenStirred: 0, settlingRatePerSecond: 0, turbidityStrength: 0.08,
    explanation: 'Salt forms a homogeneous solution. Its ions remain present even when no grains are visible.',
  },
  sugar: {
    id: 'sugar', label: 'Sugar', formula: 'C₁₂H₂₂O₁₁', kind: 'soluble-solid', color: '#fff1ba',
    densityGPerMl: 1.59, particleRadiusMm: 0.65, solubilityAt25GPer100GWater: 211,
    solubilityTemperatureSlope: 2.35, dissolutionRatePerSecond: 0.075,
    suspensionFractionWhenStirred: 0, settlingRatePerSecond: 0, turbidityStrength: 0.06,
    explanation: 'Sugar molecules separate and spread uniformly through water without becoming ions.',
  },
  sand: {
    id: 'sand', label: 'Sand', formula: 'mostly SiO₂', kind: 'insoluble-solid', color: '#d3a25e',
    densityGPerMl: 2.65, particleRadiusMm: 0.55, solubilityAt25GPer100GWater: 0,
    solubilityTemperatureSlope: 0, dissolutionRatePerSecond: 0,
    suspensionFractionWhenStirred: 0.58, settlingRatePerSecond: 0.13, turbidityStrength: 0.52,
    explanation: 'Sand grains may be carried while water moves, but they settle and remain a separate solid.',
  },
  chalk: {
    id: 'chalk', label: 'Chalk powder', formula: 'CaCO₃', kind: 'insoluble-solid', color: '#f4f5ed',
    densityGPerMl: 2.7, particleRadiusMm: 0.08, solubilityAt25GPer100GWater: 0,
    solubilityTemperatureSlope: 0, dissolutionRatePerSecond: 0,
    suspensionFractionWhenStirred: 0.92, settlingRatePerSecond: 0.035, turbidityStrength: 1,
    explanation: 'Fine chalk makes a cloudy suspension. It settles much more slowly than coarse sand.',
  },
  oil: {
    id: 'oil', label: 'Cooking oil', formula: 'mixture of lipids', kind: 'immiscible-liquid', color: '#f2c94c',
    densityGPerMl: 0.91, particleRadiusMm: 0.4, solubilityAt25GPer100GWater: 0,
    solubilityTemperatureSlope: 0, dissolutionRatePerSecond: 0,
    suspensionFractionWhenStirred: 0.82, settlingRatePerSecond: 0.18, turbidityStrength: 0.62,
    explanation: 'Oil and water are immiscible. Stirring breaks oil into droplets temporarily; droplets coalesce and rise again.',
  },
};

export interface MixtureSnapshot {
  substanceId: SubstanceId;
  elapsedSeconds: number;
  waterMassG: number;
  temperatureC: number;
  stirring: boolean;
  addedMassG: number;
  dissolvedMassG: number;
  suspendedMassG: number;
  settledMassG: number;
  separatedMassG: number;
  concentrationGPer100Ml: number;
  saturationCapacityG: number;
  saturationPercent: number;
  saturationState: SaturationState;
  turbidityPercent: number;
  phaseState: MixtureClass;
}

export interface SolubilityModelConfig {
  substanceId?: SubstanceId;
  waterMassG?: number;
  temperatureC?: number;
}

export interface SolubilityModel {
  addSolute(massG: number): MixtureSnapshot;
  setStirring(active: boolean): MixtureSnapshot;
  setTemperature(temperatureC: number): MixtureSnapshot;
  selectSubstance(id: SubstanceId): MixtureSnapshot;
  step(deltaSeconds: number): MixtureSnapshot;
  reset(id?: SubstanceId): MixtureSnapshot;
  snapshot(): MixtureSnapshot;
}

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function approach(current: number, target: number, ratePerSecond: number, deltaSeconds: number) {
  return current + (target - current) * (1 - Math.exp(-ratePerSecond * deltaSeconds));
}

export function createSolubilityModel(config: SolubilityModelConfig = {}): SolubilityModel {
  const waterMassG = clamp(finite(config.waterMassG ?? 200, 'water mass'), 50, 500);
  let substanceId = config.substanceId ?? 'salt';
  let temperatureC = clamp(finite(config.temperatureC ?? 25, 'temperature'), 5, 70);
  let stirring = false;
  let elapsedSeconds = 0;
  let addedMassG = 0;
  let dissolvedMassG = 0;
  let suspendedMassG = 0;
  let settledMassG = 0;
  let separatedMassG = 0;

  function definition() { return SOLUBILITY_SUBSTANCES[substanceId]; }

  function capacity() {
    const item = definition();
    if (item.kind !== 'soluble-solid') return 0;
    const per100G = Math.max(0, item.solubilityAt25GPer100GWater
      + item.solubilityTemperatureSlope * (temperatureC - 25));
    return per100G * waterMassG / 100;
  }

  function phaseState(): MixtureClass {
    const item = definition();
    if (addedMassG < 0.0001) return 'clear-water';
    if (item.kind === 'soluble-solid') return settledMassG > 0.05 ? 'sediment' : 'solution';
    if (item.kind === 'immiscible-liquid') return suspendedMassG > addedMassG * 0.12 ? 'emulsion' : 'separated-layer';
    return suspendedMassG > addedMassG * 0.08 ? 'suspension' : 'sediment';
  }

  function snapshot(): MixtureSnapshot {
    const cap = capacity();
    const applicable = definition().kind === 'soluble-solid';
    const saturationPercent = applicable && cap > 0 ? clamp(dissolvedMassG / cap * 100, 0, 100) : 0;
    const saturationState: SaturationState = !applicable ? 'not-applicable'
      : saturationPercent >= 99.5 ? 'saturated'
      : saturationPercent >= 85 ? 'near-saturation'
      : 'unsaturated';
    const turbidityBase = addedMassG > 0 ? suspendedMassG / addedMassG : 0;
    return {
      substanceId, elapsedSeconds, waterMassG, temperatureC, stirring, addedMassG,
      dissolvedMassG, suspendedMassG, settledMassG, separatedMassG,
      concentrationGPer100Ml: dissolvedMassG / waterMassG * 100,
      saturationCapacityG: cap,
      saturationPercent,
      saturationState,
      turbidityPercent: clamp(turbidityBase * definition().turbidityStrength * 125, 0, 100),
      phaseState: phaseState(),
    };
  }

  function reset(nextId: SubstanceId = substanceId) {
    substanceId = nextId;
    stirring = false;
    elapsedSeconds = 0;
    addedMassG = 0;
    dissolvedMassG = 0;
    suspendedMassG = 0;
    settledMassG = 0;
    separatedMassG = 0;
    return snapshot();
  }

  return {
    addSolute(massG) {
      finite(massG, 'solute mass');
      if (massG <= 0 || addedMassG + massG > 500) throw new Error('solute mass must keep the mixture within 0–500 g');
      addedMassG += massG;
      if (definition().kind === 'immiscible-liquid') separatedMassG += massG;
      else settledMassG += massG;
      return snapshot();
    },
    setStirring(active) {
      stirring = Boolean(active);
      return snapshot();
    },
    setTemperature(nextTemperatureC) {
      temperatureC = clamp(finite(nextTemperatureC, 'temperature'), 5, 70);
      return snapshot();
    },
    selectSubstance(id) { return reset(id); },
    step(deltaSeconds) {
      finite(deltaSeconds, 'delta seconds');
      if (deltaSeconds < 0 || deltaSeconds > 0.25) throw new Error('delta seconds must be between 0 and 0.25');
      elapsedSeconds += deltaSeconds;
      const item = definition();
      if (item.kind === 'soluble-solid') {
        const availableCapacity = Math.max(0, capacity() - dissolvedMassG);
        const transferable = Math.min(settledMassG, availableCapacity);
        const temperatureFactor = clamp(1 + (temperatureC - 25) * 0.018, 0.55, 1.9);
        const agitationFactor = stirring ? 4.2 : 1;
        const rate = item.dissolutionRatePerSecond * temperatureFactor * agitationFactor;
        const transfer = transferable * (1 - Math.exp(-rate * deltaSeconds));
        dissolvedMassG += transfer;
        settledMassG -= transfer;
        // Snap an asymptotic trace to equilibrium so measurements do not display floating-point dust.
        if (transferable > 0 && transferable < 0.0005) {
          dissolvedMassG += transferable;
          settledMassG -= transferable;
        }
      } else if (item.kind === 'insoluble-solid') {
        const targetSuspended = stirring ? addedMassG * item.suspensionFractionWhenStirred : 0;
        const rate = stirring ? 0.9 : item.settlingRatePerSecond;
        suspendedMassG = approach(suspendedMassG, targetSuspended, rate, deltaSeconds);
        settledMassG = addedMassG - suspendedMassG;
      } else {
        const targetSuspended = stirring ? addedMassG * item.suspensionFractionWhenStirred : 0;
        const rate = stirring ? 1.1 : item.settlingRatePerSecond;
        suspendedMassG = approach(suspendedMassG, targetSuspended, rate, deltaSeconds);
        separatedMassG = addedMassG - suspendedMassG;
      }

      // Fail closed if future model changes create an invalid state.
      const pools = [dissolvedMassG, suspendedMassG, settledMassG, separatedMassG];
      if (pools.some(value => !Number.isFinite(value) || value < -0.001)) {
        reset(substanceId);
        throw new Error('Mixture solver produced an invalid mass state and was reset');
      }
      const massError = addedMassG - pools.reduce((sum, value) => sum + value, 0);
      if (Math.abs(massError) > 0.001) {
        reset(substanceId);
        throw new Error('Mixture solver violated mass conservation and was reset');
      }
      return snapshot();
    },
    reset,
    snapshot,
  };
}
