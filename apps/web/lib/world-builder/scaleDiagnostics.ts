import type { Vector3Tuple } from '../../../../packages/simulation-schema/src/index';

export function evaluateReach(
  target: Vector3Tuple,
  origin: Vector3Tuple,
  reach: { min: number; max: number },
) {
  const values = [...target, ...origin, reach.min, reach.max];
  if (values.some(value => !Number.isFinite(value))) {
    throw new Error('Reach diagnostic requires finite values');
  }
  if (reach.min < 0 || reach.max <= reach.min) {
    throw new Error('Reach diagnostic requires an ordered non-negative range');
  }
  const distance = Math.hypot(
    target[0] - origin[0],
    target[1] - origin[1],
    target[2] - origin[2],
  );
  const errors: string[] = [];
  if (distance < reach.min) {
    errors.push(
      `target distance ${distance.toFixed(2)}m is below minimum reach ${reach.min.toFixed(2)}m`,
    );
  }
  if (distance > reach.max) {
    errors.push(
      `target distance ${distance.toFixed(2)}m exceeds maximum reach ${reach.max.toFixed(2)}m`,
    );
  }
  return errors;
}

export function evaluateLabelAngularSize(
  labelHeightMeters: number,
  distanceMeters: number,
  minimumDegrees: number,
) {
  if (![labelHeightMeters, distanceMeters, minimumDegrees].every(
    value => Number.isFinite(value) && value > 0,
  )) {
    throw new Error('Label diagnostic requires positive finite values');
  }
  const angularSizeDegrees = (
    2 * Math.atan(labelHeightMeters / (2 * distanceMeters))
  ) * 180 / Math.PI;
  return angularSizeDegrees >= minimumDegrees
    ? []
    : [
      `label angular size ${angularSizeDegrees.toFixed(2)}° is below minimum ${minimumDegrees.toFixed(2)}°`,
    ];
}
