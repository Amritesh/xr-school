export type Vec3Tuple = [number, number, number];

export interface AnchorFootprint {
  width: number;
  depth: number;
}

export interface PlacementAnchor {
  id: string;
  position: Vec3Tuple;
  footprint: AnchorFootprint;
}

export interface SurfacePlacementInput {
  contactHeight: number;
  localOffset?: Vec3Tuple;
}

export interface AnchoredPose {
  anchorId: string;
  position: Vec3Tuple;
}

export interface ClearanceBody {
  id: string;
  position: Vec3Tuple;
  radius: number;
}

export interface ClearanceFailure {
  a: string;
  b: string;
  distance: number;
  minimumDistance: number;
}

function roundMeters(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function createAnchor(anchor: PlacementAnchor): PlacementAnchor {
  if (anchor.footprint.width <= 0 || anchor.footprint.depth <= 0) {
    throw new Error(`Anchor ${anchor.id} must have a positive footprint`);
  }
  return {
    id: anchor.id,
    position: [...anchor.position],
    footprint: { ...anchor.footprint },
  };
}

export function placeOnSurface(
  anchor: PlacementAnchor,
  input: SurfacePlacementInput,
): AnchoredPose {
  const offset = input.localOffset ?? [0, 0, 0];
  return {
    anchorId: anchor.id,
    position: [
      roundMeters(anchor.position[0] + offset[0]),
      roundMeters(anchor.position[1] + input.contactHeight + offset[1]),
      roundMeters(anchor.position[2] + offset[2]),
    ],
  };
}

export function isWithinFootprint(
  anchor: PlacementAnchor,
  position: Vec3Tuple,
  radius = 0,
) {
  const halfWidth = anchor.footprint.width / 2;
  const halfDepth = anchor.footprint.depth / 2;
  return (
    Math.abs(position[0] - anchor.position[0]) + radius <= halfWidth
    && Math.abs(position[2] - anchor.position[2]) + radius <= halfDepth
  );
}

function distance(a: Vec3Tuple, b: Vec3Tuple) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function checkClearance(
  bodies: readonly ClearanceBody[],
  margin = 0,
): ClearanceFailure[] {
  const failures: ClearanceFailure[] = [];
  for (let aIndex = 0; aIndex < bodies.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < bodies.length; bIndex += 1) {
      const a = bodies[aIndex];
      const b = bodies[bIndex];
      const actualDistance = distance(a.position, b.position);
      const minimumDistance = a.radius + b.radius + margin;
      if (actualDistance < minimumDistance) {
        failures.push({
          a: a.id,
          b: b.id,
          distance: roundMeters(actualDistance),
          minimumDistance: roundMeters(minimumDistance),
        });
      }
    }
  }
  return failures;
}
