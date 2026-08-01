import { describe, expect, it } from 'vitest';

import {
  createGuidedAssessment,
  createGuidedLesson,
  createGuidedModuleRecord,
} from '../../packages/simulation-content/src/implemented/guided/builders';

describe('guided definition builders', () => {
  it('derives stable lesson, narration, assessment, and release invariants', () => {
    const { guidance, narration } = createGuidedLesson({
      id: 'guided-example',
      moduleId: 'sim-c05-ch01-a01-example',
      viewerKey: 'guided-example',
      classContext: 'CBSE Class 5 Science',
      gradeTone: 'class3To5',
      objective: 'Observe an example and transfer the evidence.',
      stages: [
        {
          id: 'observe',
          title: 'Observe',
          cue: 'Inspect the example.',
          detail: 'Compare only the declared variable.',
          actionId: 'inspect-example',
          actionLabel: 'Inspect example',
          evidenceId: 'example-observed',
          evidenceMode: 'scene',
          narrationText: 'Observe the example.',
        },
        {
          id: 'explain',
          title: 'Explain',
          cue: 'Use the observation.',
          detail: 'Apply the evidence to a new case.',
          actionId: 'apply-example',
          actionLabel: 'Apply evidence',
          evidenceId: 'example-transfer-evidence',
          evidenceMode: 'answer',
          narrationText: 'Apply the evidence.',
          transferPromptId: 'guided-example:transfer',
        },
      ],
      completion: {
        eyebrow: 'Investigation complete',
        headline: 'Example investigator',
        body: 'You observed a controlled comparison and applied its evidence.',
        actionLabel: 'Review the evidence',
      },
    });

    const assessment = createGuidedAssessment({
      id: 'guided-example-assessment',
      objectiveId: guidance.id,
      misconception: {
        id: 'guided-example:misconception',
        stageId: 'observe',
        question: 'Which conclusion uses the observation?',
        acceptedEvidenceId: 'example-observed',
        acceptedLabel: 'The measured observation.',
        distractorLabel: 'An unsupported guess.',
        hint: 'Compare the measured result with the unchanged control.',
        explanation: 'The measured result, not appearance alone, supports the conclusion.',
      },
      transfer: {
        id: 'guided-example:transfer',
        stageId: 'explain',
        question: 'How does the evidence transfer?',
        acceptedEvidenceId: 'example-transfer-evidence',
        acceptedLabel: 'Apply the same observed relationship.',
        distractorLabel: 'Ignore the observation.',
        hint: 'Use the relationship observed in the first comparison.',
        explanation: 'Transfer keeps the evidence relationship while changing the example.',
      },
    });

    const module = createGuidedModuleRecord({
      id: guidance.moduleId,
      title: 'Example',
      slug: 'c5-ch01-a01-example',
      viewerKey: guidance.viewerKey,
      legacyAliases: ['example-legacy'],
      summary: 'A controlled example investigation.',
      gradeBands: ['class3To5'],
      subjects: ['science'],
      curriculumMapIds: ['cm-example'],
      conceptIds: ['concept-example'],
      simulationFormat: 'interactive3d',
      xrFitType: 'strongVrFit',
      xrFitJustification: 'Spatial comparison makes the evidence visible.',
      learningObjective: guidance.objective,
      scientificConceptExplanation: 'Controlled comparisons isolate one variable.',
      misconceptionsAddressed: ['Appearance alone proves a cause.'],
      visualizationStrategy: 'Place control and treatment side by side.',
      interactionStrategy: 'Inspect, compare, and answer an evidence prompt.',
      practicalUseCase: 'Plan a fair classroom comparison.',
      cueCardIds: ['cue-example'],
      revisionCardIds: ['revision-example'],
      assessmentHookIds: ['guided-example:misconception', 'guided-example:transfer'],
      instructorScript: 'Ask learners to name the changed variable.',
      batchActivityPrompt: 'Compare observations and justify the conclusion.',
      expectedDurationMinutes: 8,
      maxSessionDurationMinutes: 10,
      comfortRiskLevel: 'low',
      safetyNotes: ['This is a visual model.'],
      estimatedPackageSizeMb: 10,
    }, guidance);

    expect(guidance.stages[0]).toMatchObject({
      requiredActionIds: ['inspect-example'],
      completionEvidenceIds: ['example-observed'],
      narrationId: 'guided-example:observe',
      sceneCueId: 'scene:observe',
      evidenceMode: 'scene',
    });
    expect(narration.cues[0]).toMatchObject({
      id: 'guided-example:observe',
      stageId: 'observe',
      text: 'Observe the example.',
      caption: 'Observe the example.',
    });
    expect(assessment.masteryRule).toEqual({
      requiredEvidenceCount: 2,
      requiredKinds: ['misconception', 'transfer'],
      allowHintedMastery: true,
    });
    expect(assessment.prompts[1].options).toEqual([
      {
        id: 'example-transfer-evidence',
        label: 'Apply the same observed relationship.',
      },
      {
        id: 'example-transfer-evidence:distractor',
        label: 'Ignore the observation.',
      },
    ]);
    expect(module).toMatchObject({
      applicableBoards: ['cbse'],
      status: 'released',
      publicationStatus: 'released',
      releaseMaturity: 'internalQA',
      evidenceMaturity: 'internalQA',
      evidenceConfidenceLevel: 'experimental',
      targetFrameRateFps: 72,
      minQuestStorageGb: 1,
      stages: 2,
    });
  });

  it('rejects answer stages without exactly one linked assessment intent', () => {
    expect(() => createGuidedLesson({
      id: 'guided-invalid',
      moduleId: 'sim-invalid',
      viewerKey: 'guided-invalid',
      classContext: 'Class 5',
      gradeTone: 'class3To5',
      objective: 'Reject ambiguous evidence.',
      stages: [{
        id: 'answer',
        title: 'Answer',
        cue: 'Answer with evidence.',
        detail: 'One prompt kind is required.',
        actionId: 'answer-action',
        actionLabel: 'Answer',
        evidenceId: 'answer-evidence',
        evidenceMode: 'answer',
        narrationText: 'Answer with evidence.',
      }],
      completion: {
        eyebrow: 'Done',
        headline: 'Done',
        body: 'Done with evidence.',
        actionLabel: 'Review',
      },
    })).toThrow(/exactly one/i);
  });
});
