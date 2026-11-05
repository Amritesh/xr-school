/** Quest Baseline limits from docs/simulation-design/simulation-authoring-standard.md. */
export const QUEST_BASELINE = Object.freeze({
  maxDrawCalls: 120,
  maxTriangles: 250_000,
  minFps: 72,
});

export interface RenderStats {
  drawCalls: number;
  triangles: number;
}

export function readRenderStats(info: {
  render: { calls: number; triangles: number };
}): RenderStats {
  return { drawCalls: info.render.calls, triangles: info.render.triangles };
}

export function budgetViolations(stats: RenderStats): string[] {
  const violations: string[] = [];
  if (stats.drawCalls > QUEST_BASELINE.maxDrawCalls) {
    violations.push(
      `${stats.drawCalls} draw calls exceeds ${QUEST_BASELINE.maxDrawCalls}`,
    );
  }
  if (stats.triangles > QUEST_BASELINE.maxTriangles) {
    violations.push(
      `${stats.triangles} triangles exceeds ${QUEST_BASELINE.maxTriangles}`,
    );
  }
  return violations;
}

/** Exposes frame stats on an element so browser acceptance tests can read them. */
export function publishRenderStats(
  element: Pick<HTMLElement, 'setAttribute'>,
  stats: RenderStats,
): void {
  element.setAttribute('data-render-draw-calls', String(stats.drawCalls));
  element.setAttribute('data-render-triangles', String(stats.triangles));
}
