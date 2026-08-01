import { describe, expect, it } from 'vitest';
import { INTERACTIVE_SIMULATIONS } from '../../packages/simulation-content/src/implemented/interactive/index';
import {
  INTERACTIVE_VIEWER_REGISTRATIONS,
  findInteractiveViewerRegistration,
} from '../../apps/web/lib/simulations/interactive/registrations';

const expected = {
  'interactive-float-or-sink': 'sim-c05-ch07-a01-a-concept-about-what-floats-what-sinks',
  'interactive-solubility': 'sim-c05-ch07-a03-soluble-and-insoluble-substances',
  'interactive-lipid-test': 'sim-c06-ch02-a03-test-the-presence-of-lipids',
  'interactive-mineral-sources': 'sim-c06-ch02-a05-the-sources-of-minerals-in-food',
  'interactive-vitamin-deficiencies':
    'sim-c06-ch02-a04-the-sources-of-vitamins-and-their-deficiencies',
  'interactive-shape-sorting':
    'sim-c06-ch04-a01-sorting-materials-according-to-their-shape',
} as const;

describe('interactive viewer registry', () => {
  it('maps every interactive viewer key to its canonical definition', () => {
    expect(Object.keys(INTERACTIVE_VIEWER_REGISTRATIONS).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [viewerKey, moduleId] of Object.entries(expected)) {
      expect(findInteractiveViewerRegistration(viewerKey)?.definition.module.id).toBe(
        moduleId,
      );
    }
    expect(findInteractiveViewerRegistration('unknown-viewer')).toBeUndefined();
  });

  it('creates fresh sessions and scene adapters for every launch', () => {
    for (const registration of Object.values(INTERACTIVE_VIEWER_REGISTRATIONS)) {
      const firstSession = registration.createSession();
      const secondSession = registration.createSession();
      const firstAdapter = registration.createAdapter();
      const secondAdapter = registration.createAdapter();
      expect(firstSession).not.toBe(secondSession);
      expect(firstAdapter).not.toBe(secondAdapter);
      expect(firstSession.snapshot().lesson.stageId).toBe(
        registration.definition.experience.stages[0].id,
      );
    }
  });

  it('binds every assessment prompt to one stage-specific lesson action', () => {
    for (const registration of Object.values(INTERACTIVE_VIEWER_REGISTRATIONS)) {
      const promptIds = registration.definition.assessment.prompts.map(
        prompt => prompt.id,
      );
      expect(Object.keys(registration.assessmentBindings).sort()).toEqual(
        promptIds.sort(),
      );
      for (const prompt of registration.definition.assessment.prompts) {
        const binding = registration.assessmentBindings[prompt.id];
        const stage = registration.definition.experience.stages.find(
          candidate => candidate.id === prompt.stageId,
        );
        expect(stage?.requiredActionIds).toContain(binding.lessonActionId);
        expect(stage?.completionEvidenceIds).toContain(
          binding.lessonEvidenceId,
        );
      }
    }
  });

  it('covers all six canonical interactive definitions exactly once', () => {
    expect(
      Object.values(INTERACTIVE_VIEWER_REGISTRATIONS).map(
        registration => registration.definition.module.id,
      ).sort(),
    ).toEqual(INTERACTIVE_SIMULATIONS.map(item => item.module.id).sort());
  });
});
