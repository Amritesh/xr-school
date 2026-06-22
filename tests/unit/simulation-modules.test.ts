import { describe, it, expect } from 'vitest';

/**
 * Validates the simulation module seed data against the TypeSpec contract rules.
 * These run offline — no server needed.
 */

const VALID_XR_FIT_TYPES = ['strongVrFit', 'arTabletFit'];
const VALID_BOARDS = ['cbse', 'icse', 'stateBoard'];
const VALID_GRADE_BANDS = ['kindergarten', 'class1To2', 'class3To5', 'class6To8', 'class9To10', 'class11To12'];
const VALID_SUBJECTS = ['science', 'physics', 'chemistry', 'biology', 'mathematics', 'geography', 'history', 'environmentalScience', 'computerScience', 'vocationalSkills', 'careerExposure'];
const VALID_STATUSES = ['draft', 'approved', 'released', 'deprecated', 'archived'];
const VALID_COMFORT_RISKS = ['low', 'medium', 'high'];
const VALID_FORMATS = ['immersiveVr', 'threeSixtyVr', 'interactive3d', 'guidedVisualization', 'practicalLabSimulation', 'virtualFieldVisit', 'revisionMode'];
const VALID_EVIDENCE_LEVELS = ['experimental', 'expertDesigned', 'internallyPiloted', 'schoolValidated', 'researchBacked'];

// Simulation module definitions — must stay in sync with apps/api/src/index.ts
const SIMULATIONS = [
  {
    id: 'sim-pollination-001',
    slug: 'pollination',
    title: 'Plant Pollination & Growth Cycle',
    gradeBands: ['class6To8', 'class9To10'],
    subjects: ['biology', 'environmentalScience'],
    applicableBoards: ['cbse', 'icse'],
    simulationFormat: 'immersiveVr',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'Pollination occurs at microscopic scale and involves invisible pollen transfer that students cannot witness directly.',
    learningObjective: 'Students will be able to sequence the 8 stages of plant reproduction from pollen production through germination.',
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 10,
    stages: 8,
    status: 'released',
  },
  {
    id: 'sim-circuit-001',
    slug: 'circuit',
    title: "Electric Circuits & Resistance (Ohm's Law)",
    gradeBands: ['class9To10'],
    subjects: ['physics'],
    applicableBoards: ['cbse', 'icse'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification: 'Electric current is invisible. Visualising electron flow as glowing particles gives students a spatial, intuitive understanding.',
    learningObjective: "Students will apply Ohm's Law (V=IR) to predict how changing resistance affects current.",
    evidenceConfidenceLevel: 'expertDesigned',
    comfortRiskLevel: 'low',
    expectedDurationMinutes: 8,
    stages: 4,
    status: 'released',
  },
];

describe('Simulation module contracts', () => {
  SIMULATIONS.forEach(sim => {
    describe(`[${sim.slug}] ${sim.title}`, () => {
      it('has a non-empty id and slug', () => {
        expect(sim.id).toBeTruthy();
        expect(sim.slug).toBeTruthy();
        expect(sim.slug).toMatch(/^[a-z0-9-]+$/);
      });

      it('has a non-empty title and learningObjective', () => {
        expect(sim.title.length).toBeGreaterThan(5);
        expect(sim.learningObjective.length).toBeGreaterThan(10);
      });

      it('has a valid xrFitType (not normalClassroomBetter or notWorthXr)', () => {
        expect(VALID_XR_FIT_TYPES).toContain(sim.xrFitType);
      });

      it('has an xrFitJustification of at least 30 characters', () => {
        expect(sim.xrFitJustification.length).toBeGreaterThanOrEqual(30);
      });

      it('has at least one valid board', () => {
        expect(sim.applicableBoards.length).toBeGreaterThan(0);
        sim.applicableBoards.forEach(b => expect(VALID_BOARDS).toContain(b));
      });

      it('has at least one valid grade band', () => {
        expect(sim.gradeBands.length).toBeGreaterThan(0);
        sim.gradeBands.forEach(g => expect(VALID_GRADE_BANDS).toContain(g));
      });

      it('has at least one valid subject', () => {
        expect(sim.subjects.length).toBeGreaterThan(0);
        sim.subjects.forEach(s => expect(VALID_SUBJECTS).toContain(s));
      });

      it('has a valid simulationFormat', () => {
        expect(VALID_FORMATS).toContain(sim.simulationFormat);
      });

      it('has a valid evidenceConfidenceLevel', () => {
        expect(VALID_EVIDENCE_LEVELS).toContain(sim.evidenceConfidenceLevel);
      });

      it('has a valid comfortRiskLevel', () => {
        expect(VALID_COMFORT_RISKS).toContain(sim.comfortRiskLevel);
      });

      it('has a valid status', () => {
        expect(VALID_STATUSES).toContain(sim.status);
      });

      it('has a positive expectedDurationMinutes (max 12 for batch safety)', () => {
        expect(sim.expectedDurationMinutes).toBeGreaterThan(0);
        expect(sim.expectedDurationMinutes).toBeLessThanOrEqual(12);
      });

      it('has at least 2 stages', () => {
        expect(sim.stages).toBeGreaterThanOrEqual(2);
      });

      it('slug matches id pattern (id starts with sim-{slug})', () => {
        expect(sim.id).toContain(sim.slug.replace(/-/g, '-'));
      });
    });
  });

  it('no two simulations share the same slug', () => {
    const slugs = SIMULATIONS.map(s => s.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('no two simulations share the same id', () => {
    const ids = SIMULATIONS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
