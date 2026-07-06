export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Centre of the particle chamber that a liquid clusters around. */
export const MATTER_CHAMBER_CENTER: Vec3 = { x: 0, y: 1.2, z: 0 };

/**
 * Per-particle force for the States of Matter chamber, combining heat-driven
 * agitation with a cohesive pull toward the chamber centre.
 *
 * The cohesion is derived from the model's `spacingFactor` (solid 0.12,
 * liquid 0.5, gas 1.0): a liquid (small spacing) is pulled inward so it stays
 * a clustered, jiggling blob — "close together but sliding past each other" —
 * while a gas (spacing 1.0) gets zero pull and spreads to fill the chamber.
 * This makes the solid/liquid/gas spacing distinction — the whole point of the
 * particle model — visible, instead of liquid and gas both just filling the box.
 */
export function matterAgitationForce(
  index: number,
  elapsedSeconds: number,
  heat: number,
  spacingFactor: number,
  position: Vec3,
): Vec3 {
  const forceScale = 0.45 + heat * 4.2;
  const cohesion = (1 - spacingFactor) * 16;
  return {
    x: Math.sin(elapsedSeconds * 1.7 + index * 12.9898) * forceScale + (MATTER_CHAMBER_CENTER.x - position.x) * cohesion,
    y: Math.cos(elapsedSeconds * 1.3 + index * 78.233) * forceScale * 0.72 + (MATTER_CHAMBER_CENTER.y - position.y) * cohesion * 0.6,
    z: Math.sin(elapsedSeconds * 1.1 + index * 37.719) * forceScale + (MATTER_CHAMBER_CENTER.z - position.z) * cohesion,
  };
}
