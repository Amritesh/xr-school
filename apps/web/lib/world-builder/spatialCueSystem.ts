import type { Vector3Tuple } from '../../../../packages/simulation-schema/src/index';

export interface CuePlacementRequest {
  primary: Vector3Tuple;
  fallbacks: Vector3Tuple[];
  focusDirection: Vector3Tuple;
  minimumSeparationDegrees: number;
}

function horizontalAngleDegrees(a: Vector3Tuple, b: Vector3Tuple) {
  const aLength = Math.hypot(a[0], a[2]);
  const bLength = Math.hypot(b[0], b[2]);
  if (aLength === 0 || bLength === 0) {
    throw new Error('Cue and focus directions require horizontal length');
  }
  const cosine = Math.min(1, Math.max(
    -1,
    (a[0] * b[0] + a[2] * b[2]) / (aLength * bLength),
  ));
  return Math.acos(cosine) * 180 / Math.PI;
}

export function resolveCuePlacement(request: CuePlacementRequest): Vector3Tuple {
  if (!Number.isFinite(request.minimumSeparationDegrees)
    || request.minimumSeparationDegrees < 0
    || request.minimumSeparationDegrees > 180) {
    throw new Error('Cue separation must be between 0 and 180 degrees');
  }
  const candidates = [request.primary, ...request.fallbacks];
  const placement = candidates.find(candidate => (
    candidate.every(Number.isFinite)
    && horizontalAngleDegrees(candidate, request.focusDirection)
      >= request.minimumSeparationDegrees
  ));
  if (!placement) throw new Error('No cue placement clears the focus direction');
  return [...placement] as Vector3Tuple;
}
