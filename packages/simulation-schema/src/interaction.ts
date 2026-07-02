export const NORMALIZED_INPUT_SOURCES = [
  'mouse',
  'touch',
  'keyboard',
  'xr-controller',
] as const;

export const NORMALIZED_ACTION_PHASES = [
  'start',
  'update',
  'commit',
  'cancel',
] as const;

export const INTERACTION_ACTIONS = [
  'grab',
  'place',
  'turn',
  'press',
  'pour',
  'connect',
  'stir',
  'inspect',
] as const;

export type NormalizedInputSource = (typeof NORMALIZED_INPUT_SOURCES)[number];
export type NormalizedActionPhase = (typeof NORMALIZED_ACTION_PHASES)[number];
export type InteractionAction = (typeof INTERACTION_ACTIONS)[number];

export interface NormalizedAction {
  actionId: string;
  targetEntityId: string;
  source: NormalizedInputSource;
  phase: NormalizedActionPhase;
  stageId: string;
  timestampMs: number;
  value?: number | string | boolean;
  pose?: {
    position: [number, number, number];
    rotation: [number, number, number, number];
  };
}

export interface InteractionAffordanceDefinition {
  id: string;
  entityId: string;
  actionId: string;
  supportedActions: InteractionAction[];
  inputSources: NormalizedInputSource[];
  accessibilityLabel: string;
}

function duplicateValues(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateNormalizedAction(action: NormalizedAction) {
  const errors: string[] = [];
  if (!action.actionId.trim()) errors.push('normalized action id is required');
  if (!action.targetEntityId.trim()) errors.push('normalized action target is required');
  if (!NORMALIZED_INPUT_SOURCES.includes(action.source)) {
    errors.push(`normalized action source ${String(action.source)} is unsupported`);
  }
  if (!NORMALIZED_ACTION_PHASES.includes(action.phase)) {
    errors.push(`normalized action phase ${String(action.phase)} is unsupported`);
  }
  if (!Number.isFinite(action.timestampMs) || action.timestampMs < 0) {
    errors.push('normalized action timestamp must be a non-negative finite number');
  }
  const poseValues = action.pose
    ? [...action.pose.position, ...action.pose.rotation]
    : [];
  if (poseValues.some(value => !Number.isFinite(value))) {
    errors.push('normalized action pose must contain finite values');
  }
  return errors;
}

export function validateInteractionAffordance(
  definition: InteractionAffordanceDefinition,
) {
  const errors: string[] = [];
  if (!definition.id.trim()) errors.push('interaction affordance id is required');
  if (!definition.entityId.trim()) errors.push(`${definition.id}: entity id is required`);
  if (!definition.actionId.trim()) errors.push(`${definition.id}: action id is required`);
  if (!definition.accessibilityLabel.trim()) {
    errors.push(`${definition.id}: accessibility label is required`);
  }
  if (definition.supportedActions.length === 0) {
    errors.push(`${definition.id}: at least one supported action is required`);
  }
  if (definition.inputSources.length === 0) {
    errors.push(`${definition.id}: at least one input source is required`);
  }
  for (const value of duplicateValues(definition.supportedActions)) {
    errors.push(`${definition.id}: duplicate supported action ${value}`);
  }
  for (const value of duplicateValues(definition.inputSources)) {
    errors.push(`${definition.id}: duplicate input source ${value}`);
  }
  if (definition.supportedActions.some(value => !INTERACTION_ACTIONS.includes(value))) {
    errors.push(`${definition.id}: unsupported interaction action`);
  }
  if (definition.inputSources.some(value => !NORMALIZED_INPUT_SOURCES.includes(value))) {
    errors.push(`${definition.id}: unsupported input source`);
  }
  return errors;
}
