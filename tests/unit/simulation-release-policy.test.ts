import { describe, expect, it } from 'vitest';
import {
  VALID_RELEASE_MATURITIES,
  isLaunchableReleaseMaturity,
  isSchoolStableRelease,
} from '../../packages/simulation-schema/src/index';
import { SIMULATION_MODULES } from '../../packages/simulation-content/src/modules';
import { SCIENCE_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';

describe('simulation release policy', () => {
  it('uses one ordered maturity ladder for every simulation', () => {
    expect(VALID_RELEASE_MATURITIES).toEqual([
      'catalogued',
      'inDevelopment',
      'internalQA',
      'pilotReady',
      'schoolValidated',
    ]);
  });

  it('allows launches only after a simulation reaches internal QA', () => {
    expect(isLaunchableReleaseMaturity('catalogued')).toBe(false);
    expect(isLaunchableReleaseMaturity('inDevelopment')).toBe(false);
    expect(isLaunchableReleaseMaturity('internalQA')).toBe(true);
    expect(isLaunchableReleaseMaturity('pilotReady')).toBe(true);
    expect(isLaunchableReleaseMaturity('schoolValidated')).toBe(true);
  });

  it('reserves school-stable claims for validated maturity and evidence', () => {
    expect(isSchoolStableRelease('schoolValidated', 'schoolValidated')).toBe(true);
    expect(isSchoolStableRelease('schoolValidated', 'researchBacked')).toBe(true);
    expect(isSchoolStableRelease('pilotReady', 'researchBacked')).toBe(false);
    expect(isSchoolStableRelease('schoolValidated', 'expertDesigned')).toBe(false);
  });

  it('classifies bespoke working simulations as internal QA', () => {
    expect(SIMULATION_MODULES).toHaveLength(9);
    expect(SIMULATION_MODULES.every(module => module.releaseMaturity === 'internalQA')).toBe(true);
  });

  it('classifies generated curriculum candidates as catalogued', () => {
    expect(SCIENCE_SIMULATION_CATALOG).toHaveLength(497);
    expect(SCIENCE_SIMULATION_CATALOG.every(item => item.releaseMaturity === 'catalogued')).toBe(true);
  });
});
