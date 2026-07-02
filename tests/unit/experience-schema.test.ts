import { describe, expect, it } from 'vitest';
import {
  validateExperienceDefinition,
  validateInteractionAffordance,
  validateNormalizedAction,
  validateSpatialLayoutDefinition,
  type ExperienceDefinition,
  type InteractionAffordanceDefinition,
  type SpatialLayoutDefinition,
} from '../../packages/simulation-schema/src/index';

const experience: ExperienceDefinition = {
  id: 'experience-diagnostic',
  gradeTone: 'class6To8',
  objective: 'Compare appearance with physical evidence.',
  stages: [{
    id: 'stage-observe',
    title: 'Observe the sphere',
    cue: 'Watch where the sphere settles.',
    requiredActionIds: ['release-sphere'],
    completionEvidenceIds: ['sphere-settled'],
  }],
};

const affordance: InteractionAffordanceDefinition = {
  id: 'affordance-release-sphere',
  entityId: 'entity-painted-sphere',
  actionId: 'release-sphere',
  supportedActions: ['press'],
  inputSources: ['mouse', 'touch', 'keyboard', 'xr-controller'],
  accessibilityLabel: 'Release the sphere',
};

const spatial: SpatialLayoutDefinition = {
  id: 'spatial-diagnostic',
  metersPerWorldUnit: 1,
  scaleRepresentation: 'literal',
  intendedEyeHeightMeters: 1.6,
  seatedEyeHeightMeters: 1.2,
  movementBoundsMeters: { width: 2, depth: 2 },
  reachMeters: { min: 0.25, max: 0.8 },
  cueBay: {
    position: [1.1, 1.45, -1.8],
    fallbackPositions: [[-1.1, 1.45, -1.8]],
  },
  browserClearView: { x: 0.2, y: 0.12, width: 0.6, height: 0.68 },
  minLabelAngularSizeDegrees: 1.4,
};

describe('immersive experience schema', () => {
  it('accepts complete experience, interaction, and spatial contracts', () => {
    expect(validateExperienceDefinition(experience)).toEqual([]);
    expect(validateInteractionAffordance(affordance)).toEqual([]);
    expect(validateSpatialLayoutDefinition(spatial)).toEqual([]);
  });

  it('rejects stages that can complete without action or evidence', () => {
    const errors = validateExperienceDefinition({
      ...experience,
      stages: [{
        ...experience.stages[0],
        requiredActionIds: [],
        completionEvidenceIds: [],
      }],
    });
    expect(errors.join('\n')).toMatch(/required action/i);
    expect(errors.join('\n')).toMatch(/completion evidence/i);
  });

  it('rejects unreachable or view-blocking spatial definitions', () => {
    const errors = validateSpatialLayoutDefinition({
      ...spatial,
      reachMeters: { min: 0.9, max: 0.4 },
      browserClearView: { x: 0, y: 0, width: 1.2, height: 1 },
    });
    expect(errors.join('\n')).toMatch(/reach/i);
    expect(errors.join('\n')).toMatch(/clear view/i);
  });

  it('rejects duplicate actions and unsupported normalized action values', () => {
    expect(validateInteractionAffordance({
      ...affordance,
      supportedActions: ['press', 'press'],
    }).join('\n')).toMatch(/duplicate/i);
    expect(validateNormalizedAction({
      actionId: 'release-sphere',
      targetEntityId: 'entity-painted-sphere',
      source: 'voice' as 'mouse',
      phase: 'commit',
      stageId: 'stage-observe',
      timestampMs: Number.NaN,
    }).join(' ')).toMatch(/source.*timestamp/i);
  });
});
