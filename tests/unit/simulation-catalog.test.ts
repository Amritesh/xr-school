import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_RELEASE_XR_FIT_TYPES,
  VALID_COMFORT_RISK_LEVELS,
  VALID_GRADE_BANDS,
  VALID_SIMULATION_FORMATS,
  validateCatalog,
} from '../../packages/simulation-schema/src/index';
import { loadScienceCatalog } from '../../packages/simulation-content/src/index';

describe('Class 5-10 science simulation catalog', () => {
  it('loads all 497 activity modules from the PDF catalog', () => {
    const catalog = loadScienceCatalog();

    expect(catalog).toHaveLength(497);
  });

  it('has stable unique slugs and ids', () => {
    const catalog = loadScienceCatalog();

    expect(new Set(catalog.map(row => row.slug)).size).toBe(catalog.length);
    expect(new Set(catalog.map(row => row.simulationId)).size).toBe(catalog.length);
    expect(catalog[0].slug).toBe('c5-ch01-a01-supersense-of-smell');
    expect(catalog[0].simulationId).toBe('sim-c05-ch01-a01-supersense-of-smell');
  });

  it('uses only TypeSpec-compatible enums and safe duration limits', () => {
    const catalog = loadScienceCatalog();

    for (const row of catalog) {
      expect(VALID_GRADE_BANDS).toContain(row.gradeBand);
      expect(VALID_SIMULATION_FORMATS).toContain(row.simulationFormat);
      expect(VALID_COMFORT_RISK_LEVELS).toContain(row.comfortRiskLevel);
      expect(row.expectedDurationMinutes).toBeGreaterThan(0);
      expect(row.expectedDurationMinutes).toBeLessThanOrEqual(12);
      expect(FORBIDDEN_RELEASE_XR_FIT_TYPES).not.toContain(row.xrFitType);
      expect(row.gradeBand).not.toBe('class8To10');
    }
  });

  it('returns no validation errors for the catalog', () => {
    const catalog = loadScienceCatalog();

    expect(validateCatalog(catalog)).toEqual([]);
  });
});
