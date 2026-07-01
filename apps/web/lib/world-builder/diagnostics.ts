import {
  BROWSER_BALANCED_PROFILE,
  BROWSER_ENHANCED_PROFILE,
  QUEST_BASELINE_PROFILE,
  type QualityProfileId,
} from '../../../../packages/simulation-schema/src/world';

export interface PresentationMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
}

export interface PresentationBudget {
  minSteadyFps: number;
  maxDrawCalls: number;
  maxVisibleTriangles: number;
}

const PRESENTATION_BUDGETS: Record<QualityProfileId, PresentationBudget> = {
  questBaseline: QUEST_BASELINE_PROFILE,
  browserBalanced: BROWSER_BALANCED_PROFILE,
  browserEnhanced: BROWSER_ENHANCED_PROFILE,
};

export function presentationBudgetForProfile(
  profileId: QualityProfileId,
): PresentationBudget {
  return PRESENTATION_BUDGETS[profileId];
}

function validMetric(value: number, label: string, errors: string[]) {
  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be a non-negative finite number`);
    return false;
  }
  return true;
}

export function evaluatePresentationBudget(
  metrics: PresentationMetrics,
  budget: PresentationBudget,
) {
  const errors: string[] = [];
  const validFps = validMetric(metrics.fps, 'fps', errors);
  const validDrawCalls = validMetric(metrics.drawCalls, 'draw calls', errors);
  const validTriangles = validMetric(metrics.triangles, 'triangles', errors);

  if (validFps && metrics.fps < budget.minSteadyFps) {
    errors.push(`fps ${metrics.fps} is below ${budget.minSteadyFps}`);
  }
  if (validDrawCalls && metrics.drawCalls > budget.maxDrawCalls) {
    errors.push(`draw calls ${metrics.drawCalls} exceed ${budget.maxDrawCalls}`);
  }
  if (validTriangles && metrics.triangles > budget.maxVisibleTriangles) {
    errors.push(`triangles ${metrics.triangles} exceed ${budget.maxVisibleTriangles}`);
  }
  return errors;
}
