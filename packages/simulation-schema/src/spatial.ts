import type { Vector3Tuple } from './world';

export type ScaleRepresentation = 'literal' | 'compressed' | 'enlarged' | 'illustrative';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialLayoutDefinition {
  id: string;
  metersPerWorldUnit: number;
  scaleRepresentation: ScaleRepresentation;
  scaleExplanation?: string;
  intendedEyeHeightMeters: number;
  seatedEyeHeightMeters: number;
  movementBoundsMeters: { width: number; depth: number };
  reachMeters: { min: number; max: number };
  cueBay: {
    position: Vector3Tuple;
    fallbackPositions: Vector3Tuple[];
  };
  browserClearView: NormalizedRect;
  minLabelAngularSizeDegrees: number;
}

function positiveFinite(value: number) {
  return Number.isFinite(value) && value > 0;
}

function finiteVector(vector: Vector3Tuple) {
  return vector.every(Number.isFinite);
}

export function validateSpatialLayoutDefinition(layout: SpatialLayoutDefinition) {
  const errors: string[] = [];
  if (!layout.id.trim()) errors.push('spatial layout id is required');
  for (const [label, value] of [
    ['metersPerWorldUnit', layout.metersPerWorldUnit],
    ['intended eye height', layout.intendedEyeHeightMeters],
    ['seated eye height', layout.seatedEyeHeightMeters],
    ['movement width', layout.movementBoundsMeters.width],
    ['movement depth', layout.movementBoundsMeters.depth],
    ['minimum label angular size', layout.minLabelAngularSizeDegrees],
  ] as const) {
    if (!positiveFinite(value)) errors.push(`${layout.id}: ${label} must be positive and finite`);
  }
  if (!Number.isFinite(layout.reachMeters.min)
    || !Number.isFinite(layout.reachMeters.max)
    || layout.reachMeters.min < 0
    || layout.reachMeters.max <= layout.reachMeters.min) {
    errors.push(`${layout.id}: reach minimum must be non-negative and below maximum reach`);
  }
  const clear = layout.browserClearView;
  if (![clear.x, clear.y, clear.width, clear.height].every(Number.isFinite)
    || clear.x < 0
    || clear.y < 0
    || clear.width <= 0
    || clear.height <= 0
    || clear.x + clear.width > 1
    || clear.y + clear.height > 1) {
    errors.push(`${layout.id}: clear view must fit normalized viewport coordinates`);
  }
  if (!finiteVector(layout.cueBay.position)
    || layout.cueBay.fallbackPositions.some(position => !finiteVector(position))) {
    errors.push(`${layout.id}: cue bay positions must contain finite numbers`);
  }
  if (layout.scaleRepresentation !== 'literal' && !layout.scaleExplanation?.trim()) {
    errors.push(`${layout.id}: non-literal scale requires an explanation`);
  }
  return errors;
}
