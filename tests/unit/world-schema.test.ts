import { describe, expect, it } from 'vitest';
import {
  QUEST_BASELINE_PROFILE,
  validateWorldBundle,
  type WorldBundle,
} from '../../packages/simulation-schema/src/index';

function validBundle(): WorldBundle {
  return {
    world: {
      id: 'world-diagnostic',
      version: '1.0.0',
      title: 'Diagnostic World',
      metersPerWorldUnit: 1,
      environmentId: 'environment-diagnostic',
      qualityProfileIds: ['questBaseline'],
      entityIds: ['entity-sphere'],
      systemIds: ['system-diagnostic'],
      scientificModelIds: ['model-diagnostic'],
      lessonSequenceId: 'lesson-diagnostic',
      assessmentSequenceId: 'assessment-diagnostic',
      assetManifestId: 'assets-diagnostic',
      acceptanceProfileId: 'acceptance-diagnostic',
    },
    entities: [{
      id: 'entity-sphere',
      visualId: 'visual-sphere',
      transform: {
        position: [0, 1, -2],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'material-diagnostic',
      interactionTags: ['selectable'],
    }],
    environments: [{
      id: 'environment-diagnostic',
      background: { kind: 'color', value: '#071014' },
      keyLight: {
        kind: 'directional',
        color: '#ffffff',
        intensity: 2,
        position: [2, 4, 1],
        castsShadow: true,
      },
      accentLights: [],
      shadowCasters: ['entity-sphere'],
      exposure: 1,
      toneMapping: 'AgX',
    }],
    materials: [{
      id: 'material-diagnostic',
      model: 'standard',
      baseColor: '#77d8d4',
      roughness: 0.45,
      metalness: 0,
    }],
    qualityProfiles: [QUEST_BASELINE_PROFILE],
    scientificModels: [{
      id: 'model-diagnostic',
      version: '1.0.0',
      domain: 'classification',
      internalUnits: {},
      validInputRanges: {},
      assumptions: ['Diagnostic identity model'],
      limitations: ['Not a curriculum model'],
      referenceSources: ['XR School W0 specification'],
      referenceVectors: [{
        id: 'identity',
        inputs: { value: 1 },
        expectedOutputs: { value: 1 },
      }],
      numericalTolerance: 0,
    }],
    assessments: [{
      id: 'assessment-diagnostic',
      objectiveId: 'objective-diagnostic',
      prompts: [
        {
          id: 'observe',
          kind: 'observation',
          stageId: 'stage-1',
          question: 'Which object changed?',
          acceptedEvidenceIds: ['sphere'],
          hint: 'Watch the sphere.',
          explanation: 'The sphere changed.',
          retryPolicy: 'immediateWithHint',
        },
        {
          id: 'misconception',
          kind: 'misconception',
          stageId: 'stage-1',
          question: 'Did color change mass?',
          acceptedEvidenceIds: ['no'],
          hint: 'Only appearance changed.',
          explanation: 'Color does not change mass.',
          retryPolicy: 'afterObservation',
        },
        {
          id: 'transfer',
          kind: 'transfer',
          stageId: 'stage-1',
          question: 'Would another color change mass?',
          acceptedEvidenceIds: ['no'],
          hint: 'Apply the same rule.',
          explanation: 'Material color does not set mass.',
          retryPolicy: 'immediateWithHint',
        },
      ],
      masteryRule: {
        requiredEvidenceCount: 2,
        requiredKinds: ['misconception', 'transfer'],
        allowHintedMastery: true,
      },
    }],
    assetManifests: [{ id: 'assets-diagnostic', assets: [] }],
    acceptanceProfiles: [{
      id: 'acceptance-diagnostic',
      requiredQualityProfileId: 'questBaseline',
      minSteadyFps: 72,
      maxDrawCalls: 120,
      maxVisibleTriangles: 250_000,
      requiresQuestAcceptance: true,
    }],
    lessonSequenceIds: ['lesson-diagnostic'],
    systemIds: ['system-diagnostic'],
  };
}

describe('world schema', () => {
  it('accepts a complete reference graph', () => {
    expect(validateWorldBundle(validBundle())).toEqual([]);
  });

  it('rejects unresolved references and invalid PBR ranges', () => {
    const bundle = validBundle();
    bundle.world.environmentId = 'missing-environment';
    bundle.materials[0].roughness = 1.2;

    expect(validateWorldBundle(bundle)).toEqual(expect.arrayContaining([
      'world-diagnostic: missing environment missing-environment',
      'material-diagnostic: roughness must be between 0 and 1',
    ]));
  });

  it('rejects assessment sequences without misconception and transfer evidence', () => {
    const bundle = validBundle();
    bundle.assessments[0].prompts = bundle.assessments[0].prompts.filter(
      prompt => prompt.kind === 'observation',
    );

    expect(validateWorldBundle(bundle).join('\n')).toMatch(/misconception.*transfer/);
  });
});
