import {
  validateNormalizedAction,
  type NormalizedAction,
} from '../../../simulation-schema/src/index';

export type ActionHandler = (action: NormalizedAction) => void;

export interface ActionRouter {
  register(
    actionId: string,
    onAction: ActionHandler,
    onCancel?: ActionHandler,
  ): void;
  route(action: NormalizedAction): void;
  unregister(actionId: string): void;
  clear(): void;
}

export function createActionRouter(): ActionRouter {
  const handlers = new Map<string, {
    onAction: ActionHandler;
    onCancel?: ActionHandler;
  }>();

  return {
    register(actionId, onAction, onCancel) {
      if (!actionId.trim()) throw new Error('Action id is required');
      if (handlers.has(actionId)) {
        throw new Error(`Action ${actionId} is already registered`);
      }
      handlers.set(actionId, { onAction, onCancel });
    },
    route(action) {
      const errors = validateNormalizedAction(action);
      if (errors.length > 0) throw new Error(errors.join('; '));
      const handler = handlers.get(action.actionId);
      if (!handler) throw new Error(`Unknown action ${action.actionId}`);
      if (action.phase === 'cancel') handler.onCancel?.(action);
      else handler.onAction(action);
    },
    unregister(actionId) {
      handlers.delete(actionId);
    },
    clear() {
      handlers.clear();
    },
  };
}
