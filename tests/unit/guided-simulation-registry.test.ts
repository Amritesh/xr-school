import { describe, expect, it } from 'vitest';

import {
  validateGuidedSimulationDefinition,
  validateImplementedSimulationDefinition,
} from '@xr-school/simulation-schema';
import {
  createAssessmentSession,
  createLessonSession,
} from '@xr-school/simulation-runtime';
import {
  GUIDED_IMPLEMENTED_SIMULATIONS,
  GUIDED_SIMULATION_DEFINITIONS,
} from '../../packages/simulation-content/src/implemented/guided';
import {
  IMPLEMENTED_SIMULATIONS,
  resolveSimulationPath,
} from '../../packages/simulation-content/src/implemented/registry';

const EXPECTED_GUIDED = [
  ['c5-ch04-a01-food-spoilage', 'sim-c05-ch04-a01-food-spoilage', 'guided-food-spoilage', '/simulations/mangoes-round-the-year-food-spoilage', 6],
  ['c5-ch04-a02-milk-spoilage', 'sim-c05-ch04-a02-milk-spoilage', 'guided-milk-spoilage', '/simulations/mangoes-round-the-year-milk-spoilage', 6],
  ['c5-ch04-a03-the-making-of-aam-papad', 'sim-c05-ch04-a03-the-making-of-aam-papad', 'guided-aam-papad', '/simulations/mangoes-round-the-year-aam-papad', 7],
  ['c5-ch05-a01-pitcher-plant-the-insect-hunter', 'sim-c05-ch05-a01-pitcher-plant-the-insect-hunter', 'guided-pitcher-plant', '/simulations/seeds-and-seeds-pitcher-plant', 7],
  ['c5-ch05-a02-seed-dispersal', 'sim-c05-ch05-a02-seed-dispersal', 'guided-seed-dispersal', '/simulations/seeds-and-seeds-seed-dispersal', 7],
  ['c5-ch06-a01-the-storage-of-rainwater', 'sim-c05-ch06-a01-the-storage-of-rainwater', 'guided-rainwater-storage', '/simulations/every-drop-counts-rainwater-storage', 7],
  ['c5-ch06-a02-a-step-well-structure', 'sim-c05-ch06-a02-a-step-well-structure', 'guided-stepwell-structure', '/simulations/every-drop-counts-stepwell-structure', 7],
  ['c5-ch07-a02-dead-sea-salt-water-and-its-effects', 'sim-c05-ch07-a02-dead-sea-salt-water-and-its-effects', 'guided-dead-sea-salt-water', '/simulations/experiments-with-water-dead-sea-salt-water', 8],
  ['c5-ch08-a01-diagnosis-of-malaria', 'sim-c05-ch08-a01-diagnosis-of-malaria', 'guided-malaria-diagnosis', '/simulations/treat-for-mosquitoes-malaria-diagnosis', 8],
  ['c5-ch08-a02-life-cycle-of-the-mosquito', 'sim-c05-ch08-a02-life-cycle-of-the-mosquito', 'guided-mosquito-life-cycle', '/simulations/treat-for-mosquitoes-mosquito-life-cycle', 8],
  ['c5-ch09-a01-river-crossing-adventure', 'sim-c05-ch09-a01-river-crossing-adventure', 'guided-river-crossing', '/simulations/up-you-go-river-crossing-adventure', 8],
  ['c5-ch09-a02-rock-climbing', 'sim-c05-ch09-a02-rock-climbing', 'guided-rock-climbing', '/simulations/up-you-go-rock-climbing', 8],
  ['c5-ch09-a03-camp-in-the-snow', 'sim-c05-ch09-a03-camp-in-the-snow', 'guided-camp-in-snow', '/simulations/up-you-go-camp-in-snow', 8],
  ['c5-ch09-a04-snow-mountain-climbing', 'sim-c05-ch09-a04-snow-mountain-climbing', 'guided-snow-mountain-climbing', '/simulations/up-you-go-snow-mountain-climbing', 8],
  ['c5-ch10-a01-a-visit-of-ancient-fort', 'sim-c05-ch10-a01-a-visit-of-ancient-fort', 'guided-ancient-fort', '/simulations/walls-tell-stories-ancient-fort-visit', 8],
  ['c6-ch03-a01-cotton-farming', 'sim-c06-ch03-a01-cotton-farming', 'guided-cotton-farming', '/simulations/fibre-to-fabric-cotton-farming', 7],
  ['c6-ch03-a02-the-process-of-cotton-ginning', 'sim-c06-ch03-a02-the-process-of-cotton-ginning', 'guided-cotton-ginning', '/simulations/fibre-to-fabric-cotton-ginning', 6],
] as const;

function unique(values: readonly string[]) {
  return new Set(values).size === values.length;
}

describe('guided simulation inventory', () => {
  it('publishes the exact 17 PR #8 classes and 124 evidence-gated stages', () => {
    expect(GUIDED_SIMULATION_DEFINITIONS).toHaveLength(17);
    expect(GUIDED_IMPLEMENTED_SIMULATIONS).toHaveLength(17);
    expect(GUIDED_SIMULATION_DEFINITIONS.flatMap(item => item.stages)).toHaveLength(124);

    for (const [slug, moduleId, viewerKey, legacyPath, stageCount] of EXPECTED_GUIDED) {
      const record = GUIDED_IMPLEMENTED_SIMULATIONS.find(
        item => item.module.slug === slug,
      );
      expect(record).toMatchObject({
        kind: 'guided',
        legacyPaths: [legacyPath],
        contribution: { source: 'pr-8' },
      });
      expect(record?.module).toMatchObject({
        id: moduleId,
        viewerKey,
        status: 'released',
        publicationStatus: 'released',
        releaseMaturity: 'internalQA',
        evidenceMaturity: 'internalQA',
      });
      expect(record?.experience.stages).toHaveLength(stageCount);
      expect(IMPLEMENTED_SIMULATIONS.some(item => item.module.id === moduleId)).toBe(true);
      expect(resolveSimulationPath(`/simulations/${slug}`)).toMatchObject({
        definition: { module: { id: moduleId } },
        canonicalPath: `/simulations/${slug}`,
        redirect: false,
      });
      expect(resolveSimulationPath(legacyPath)).toMatchObject({
        definition: { module: { id: moduleId } },
        canonicalPath: `/simulations/${slug}`,
        redirect: true,
      });
    }
  });

  it('keeps every identifier, caption, path, and asset identity unique', () => {
    const records = GUIDED_IMPLEMENTED_SIMULATIONS;
    expect(unique(records.map(item => item.module.id))).toBe(true);
    expect(unique(records.map(item => item.module.slug))).toBe(true);
    expect(unique(records.map(item => item.module.viewerKey))).toBe(true);
    expect(unique(records.map(item => `/simulations/${item.module.slug}`))).toBe(true);
    expect(unique(records.flatMap(item => item.legacyPaths))).toBe(true);
    expect(unique(records.flatMap(item => item.assets.assets.map(asset => asset.id)))).toBe(true);

    for (const [index, definition] of GUIDED_SIMULATION_DEFINITIONS.entries()) {
      const record = records[index];
      expect(validateGuidedSimulationDefinition(definition)).toEqual([]);
      expect(validateImplementedSimulationDefinition(record)).toEqual([]);
      expect(unique(definition.stages.map(stage => stage.id))).toBe(true);
      expect(unique(definition.stages.map(stage => stage.narrationId))).toBe(true);
      expect(unique(definition.stages.map(stage => stage.sceneCueId))).toBe(true);
      expect(definition.stages.some(stage => stage.evidenceMode === 'scene')).toBe(true);
      expect(definition.stages.some(stage => Boolean(stage.misconceptionId))).toBe(true);
      expect(definition.stages.some(stage => Boolean(stage.transferPromptId))).toBe(true);

      for (const stage of definition.stages) {
        expect(stage.requiredActionIds).toHaveLength(1);
        expect(stage.completionEvidenceIds).toHaveLength(1);
        expect(stage.cue.trim()).not.toBe('');
        expect(stage.detail.trim()).not.toBe('');
        expect(stage.actionLabel.trim()).not.toBe('');
        const cue = record.narration.cues.find(item => item.id === stage.narrationId);
        expect(cue).toBeDefined();
        expect(cue?.caption).toBe(cue?.text);
      }
    }
  });

  it('enforces action plus observation or answer evidence and supports restart', () => {
    for (const [index, definition] of GUIDED_SIMULATION_DEFINITIONS.entries()) {
      const record = GUIDED_IMPLEMENTED_SIMULATIONS[index];
      const lesson = createLessonSession(record.experience);
      const assessment = createAssessmentSession(record.assessment);

      for (const stage of definition.stages) {
        expect(lesson.snapshot().stageId).toBe(stage.id);
        expect(() => lesson.next()).toThrow(/complete stage/i);
        lesson.performAction(stage.requiredActionIds[0]);
        expect(lesson.snapshot().stageComplete).toBe(false);

        if (stage.evidenceMode === 'scene') {
          lesson.recordEvidence(stage.completionEvidenceIds[0]);
        } else {
          const promptId = stage.misconceptionId ?? stage.transferPromptId;
          const prompt = record.assessment.prompts.find(item => item.id === promptId);
          expect(prompt).toBeDefined();
          const distractor = prompt?.options?.find(
            option => !prompt.acceptedEvidenceIds.includes(option.id),
          );
          expect(assessment.answer(prompt!.id, distractor!.id)).toMatchObject({
            correct: false,
            hint: expect.any(String),
          });
          expect(lesson.snapshot().stageComplete).toBe(false);
          const accepted = prompt!.acceptedEvidenceIds[0];
          expect(assessment.answer(prompt!.id, accepted).correct).toBe(true);
          lesson.recordEvidence(stage.completionEvidenceIds[0]);
        }

        expect(lesson.snapshot().stageComplete).toBe(true);
        if (!lesson.snapshot().lessonComplete) lesson.next();
      }

      expect(lesson.snapshot().lessonComplete).toBe(true);
      expect(assessment.mastery().mastered).toBe(true);
      expect(lesson.restart()).toMatchObject({
        stageIndex: 0,
        performedActionIds: [],
        recordedEvidenceIds: [],
      });
      assessment.reset();
      expect(assessment.evidence()).toEqual([]);
    }
  });
});
