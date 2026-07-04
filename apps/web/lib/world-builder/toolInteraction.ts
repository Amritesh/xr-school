import type {
  NormalizedAction,
  NormalizedInputSource,
} from '../../../../packages/simulation-schema/src/index';

export type ToolInteractionState =
  | 'idle'
  | 'held'
  | 'valid'
  | 'invalid'
  | 'returning';

export interface ToolInteractionConfig {
  actionId: string;
  toolId: string;
  home: [number, number, number];
  validTargets: readonly string[];
}

export interface ToolInteractionSnapshot {
  toolId: string;
  state: ToolInteractionState;
  pose: [number, number, number];
  source?: NormalizedInputSource;
  hoverTarget?: string;
  action?: NormalizedAction;
}

export function createToolInteraction(config: ToolInteractionConfig) {
  const home: [number, number, number] = [...config.home];
  const validTargets = new Set(config.validTargets);
  let state: ToolInteractionState = 'idle';
  let source: NormalizedInputSource | undefined;
  let hoverTarget: string | undefined;

  const snapshot = (
    action?: NormalizedAction,
  ): ToolInteractionSnapshot => ({
    toolId: config.toolId,
    state,
    pose: [...home],
    ...(source ? { source } : {}),
    ...(hoverTarget ? { hoverTarget } : {}),
    ...(action ? { action } : {}),
  });

  return {
    snapshot,

    pickUp(inputSource: NormalizedInputSource) {
      source = inputSource;
      hoverTarget = undefined;
      state = 'held';
      return snapshot();
    },

    hover(targetEntityId?: string): 'valid' | 'invalid' | 'none' {
      hoverTarget = targetEntityId;
      if (!targetEntityId) return 'none';
      return validTargets.has(targetEntityId) ? 'valid' : 'invalid';
    },

    release(
      targetEntityId: string | undefined,
      stageId: string,
      timestampMs: number,
    ) {
      if (!source) throw new Error(`Pick up ${config.toolId} before releasing it`);
      const valid = targetEntityId !== undefined && validTargets.has(targetEntityId);
      state = valid ? 'valid' : 'returning';
      hoverTarget = targetEntityId;
      const action: NormalizedAction | undefined = valid
        ? {
            actionId: config.actionId,
            targetEntityId,
            source,
            phase: 'commit',
            stageId,
            timestampMs,
          }
        : undefined;
      const result = snapshot(action);
      source = undefined;
      return result;
    },

    reset() {
      source = undefined;
      hoverTarget = undefined;
      state = 'idle';
      return snapshot();
    },
  };
}

export type ToolInteraction = ReturnType<typeof createToolInteraction>;
