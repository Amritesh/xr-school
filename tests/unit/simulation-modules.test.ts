import { describe, it, expect } from 'vitest';
import { SIMULATION_MODULES } from '../../packages/simulation-content/src/modules';

/**
 * Validates the simulation module seed data against the TypeSpec contract rules.
 * These run offline — no server needed.
 */

const VALID_XR_FIT_TYPES = ['strongVrFit', 'arTabletFit'];
const VALID_BOARDS = ['cbse', 'icse', 'stateBoard'];
const VALID_GRADE_BANDS = ['kindergarten', 'class1To2', 'class3To5', 'class6To8', 'class9To10', 'class11To12'];
const VALID_SUBJECTS = ['science', 'physics', 'chemistry', 'biology', 'mathematics', 'english', 'geography', 'history', 'environmentalScience', 'computerScience', 'vocationalSkills', 'careerExposure'];
const VALID_STATUSES = ['draft', 'approved', 'released', 'deprecated', 'archived'];
const VALID_COMFORT_RISKS = ['low', 'medium', 'high'];
const VALID_FORMATS = ['immersiveVr', 'threeSixtyVr', 'interactive3d', 'guidedVisualization', 'practicalLabSimulation', 'virtualFieldVisit', 'revisionMode'];
const VALID_EVIDENCE_LEVELS = ['experimental', 'expertDesigned', 'internallyPiloted', 'schoolValidated', 'researchBacked'];
const VALID_RELEASE_MATURITIES = ['catalogued', 'inDevelopment', 'internalQA', 'pilotReady', 'schoolValidated'];

const SIMULATIONS = SIMULATION_MODULES;

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

      it('has a valid releaseMaturity', () => {
        expect(VALID_RELEASE_MATURITIES).toContain(sim.releaseMaturity);
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

      it('has the required ontology links and learning design fields', () => {
        expect(sim.curriculumMapIds.length).toBeGreaterThan(0);
        expect(sim.conceptIds.length).toBeGreaterThan(0);
        expect(sim.cueCardIds.length).toBeGreaterThanOrEqual(3);
        expect(sim.revisionCardIds.length).toBeGreaterThanOrEqual(1);
        expect(sim.assessmentHookIds.length).toBeGreaterThanOrEqual(2);
        expect(sim.maxSessionDurationMinutes).toBeGreaterThanOrEqual(sim.expectedDurationMinutes);
        expect(sim.maxSessionDurationMinutes).toBeLessThanOrEqual(12);
        expect(sim.scientificConceptExplanation.length).toBeGreaterThan(40);
        expect(sim.visualizationStrategy.length).toBeGreaterThan(30);
        expect(sim.interactionStrategy.length).toBeGreaterThan(30);
        expect(sim.instructorScript).toContain('SETUP');
        expect(sim.instructorScript).toContain('DURING HEADSET BATCH');
        expect(sim.instructorScript).toContain('DEBRIEF');
        expect(sim.instructorScript).toContain('REVISION TRIGGER');
      });

      it('has at least 2 stages', () => {
        expect(sim.stages).toBeGreaterThanOrEqual(2);
      });

      it('id uses a stable simulation prefix and title-derived suffix', () => {
        const titleSuffix = sim.slug.replace(/^c\d+-ch\d+-a\d+-/, '');
        expect(sim.id).toMatch(/^sim-/);
        expect(sim.id).toContain(titleSuffix);
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

  it('does not use invalid legacy grade bands', () => {
    const allGradeBands = SIMULATIONS.flatMap(s => s.gradeBands);
    expect(allGradeBands).not.toContain('class8To10');
  });

  it('includes the Class 9 states of matter activity as the first new catalog-backed demo', () => {
    const module = SIMULATIONS.find(s => s.slug === 'c9-ch01-a02-states-of-matter');

    expect(module?.title).toBe('States of Matter Particle Lab');
    expect(module?.curriculumMapIds).toContain('cm-cbse-c9-ch01-states-of-matter');
    expect(module?.conceptIds).toContain('concept-states-of-matter');
    expect(module?.simulationFormat).toBe('interactive3d');
    expect(module?.stages).toBe(4);
  });

  it('includes the Class 6 sources of food sorting-board activity', () => {
    const module = SIMULATIONS.find(s => s.slug === 'c6-ch01-a01-sources-of-food');

    expect(module?.title).toBe('Sources of Food Sorting Lab');
    expect(module?.curriculumMapIds).toContain('cm-cbse-c6-ch01-food-sources');
    expect(module?.conceptIds).toContain('concept-food-sources');
    expect(module?.simulationFormat).toBe('interactive3d');
    expect(module?.stages).toBe(4);
  });

  it('includes the Class 5 soluble and insoluble substances experiment bench activity', () => {
    const module = SIMULATIONS.find(s => s.slug === 'c5-ch07-a03-soluble-and-insoluble-substances');

    expect(module?.title).toBe('Soluble and Insoluble Substances Lab');
    expect(module?.curriculumMapIds).toContain('cm-cbse-c5-ch07-water-experiments');
    expect(module?.conceptIds).toContain('concept-solubility');
    expect(module?.simulationFormat).toBe('practicalLabSimulation');
    expect(module?.stages).toBe(4);
  });

  it('includes the Class 5 digestive system journey as a ten-stage WebXR lesson', () => {
    const module = SIMULATIONS.find(
      s => s.slug === 'c5-ch03-a02-introduction-of-digestive-system',
    );

    expect(module?.title).toBe('Introduction to the Digestive System');
    expect(module?.curriculumMapIds).toContain('cm-cbse-c5-ch03-digestive-system');
    expect(module?.conceptIds).toContain('concept-digestive-system');
    expect(module?.simulationFormat).toBe('immersiveVr');
    expect(module?.expectedDurationMinutes).toBe(10);
    expect(module?.stages).toBe(10);
  });
});
