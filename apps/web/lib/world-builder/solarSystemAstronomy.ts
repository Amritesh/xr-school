/**
 * Scientific model for the Classes 8–10 solar system mission.
 *
 * Pure data + math, no three.js. Everything the scene renders and every
 * answer the lesson accepts is derived from these published values, so the
 * simulation can never disagree with the science:
 * - orbital motion uses each planet's real sidereal period (Kepler III);
 * - the comet sweeps equal areas in equal times (Kepler II, dθ/dt ∝ 1/r²);
 * - temperatures are NASA mean surface/cloud-top values, which is what
 *   makes the Venus-vs-Mercury misconception confrontation honest.
 *
 * Scale is representational and disclosed: `compressedOrbitRadius` keeps
 * all eight orbits inside a walkable room, and the true-scale stage blends
 * toward genuinely proportional distances to confront the "textbook
 * spacing" misconception.
 */

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface PlanetSpec {
  id: PlanetId;
  name: string;
  orderFromSun: number;
  kind: 'rocky' | 'gas-giant' | 'ice-giant';
  orbitRadiusAu: number;
  orbitalPeriodDays: number;
  orbitalSpeedKmPerS: number;
  radiusEarths: number;
  rotationHours: number;
  axialTiltDegrees: number;
  /** Mean surface (rocky) or 1-bar level (giants) temperature. */
  meanTempC: number;
  signature: string;
  fact: string;
  palette: [string, string, string, string];
}

export const SOLAR_PLANETS: readonly PlanetSpec[] = [
  {
    id: 'mercury', name: 'Mercury', orderFromSun: 1, kind: 'rocky',
    orbitRadiusAu: 0.387, orbitalPeriodDays: 88, orbitalSpeedKmPerS: 47.4,
    radiusEarths: 0.383, rotationHours: 1407.6, axialTiltDegrees: 0.03,
    meanTempC: 167,
    signature: 'Cratered and airless, scorching days and freezing nights',
    fact: 'Mercury laps the Sun in just 88 days — the fastest planet of all.',
    palette: ['#9d9487', '#7a7268', '#5b544c', '#c2b9ab'],
  },
  {
    id: 'venus', name: 'Venus', orderFromSun: 2, kind: 'rocky',
    orbitRadiusAu: 0.723, orbitalPeriodDays: 225, orbitalSpeedKmPerS: 35.0,
    radiusEarths: 0.949, rotationHours: -5832.5, axialTiltDegrees: 177.4,
    meanTempC: 464,
    signature: 'A crushing carbon-dioxide blanket traps the Sun’s heat',
    fact: 'Venus is the hottest planet — its thick atmosphere traps heat like a greenhouse.',
    palette: ['#e8c88a', '#d4a95c', '#b8862f', '#f2e2b8'],
  },
  {
    id: 'earth', name: 'Earth', orderFromSun: 3, kind: 'rocky',
    orbitRadiusAu: 1, orbitalPeriodDays: 365.25, orbitalSpeedKmPerS: 29.8,
    radiusEarths: 1, rotationHours: 23.9, axialTiltDegrees: 23.4,
    meanTempC: 15,
    signature: 'Liquid oceans, clouds, and the only known life',
    fact: 'Earth sits at just the right distance for liquid water to survive.',
    palette: ['#2e6fba', '#1c4e8f', '#3e8f5a', '#e8eef2'],
  },
  {
    id: 'mars', name: 'Mars', orderFromSun: 4, kind: 'rocky',
    orbitRadiusAu: 1.524, orbitalPeriodDays: 687, orbitalSpeedKmPerS: 24.1,
    radiusEarths: 0.532, rotationHours: 24.6, axialTiltDegrees: 25.2,
    meanTempC: -65,
    signature: 'Rust-red deserts, the tallest volcano in the solar system',
    fact: 'Mars shows dry riverbeds — evidence that water once flowed there.',
    palette: ['#c1613d', '#9c4a2c', '#7a3620', '#e0a583'],
  },
  {
    id: 'jupiter', name: 'Jupiter', orderFromSun: 5, kind: 'gas-giant',
    orbitRadiusAu: 5.203, orbitalPeriodDays: 4333, orbitalSpeedKmPerS: 13.1,
    radiusEarths: 11.21, rotationHours: 9.9, axialTiltDegrees: 3.1,
    meanTempC: -110,
    signature: 'The Great Red Spot — a storm wider than Earth',
    fact: 'Jupiter is so large that all the other planets could fit inside it.',
    palette: ['#d8b48a', '#b58a5a', '#8f6238', '#ecd9bd'],
  },
  {
    id: 'saturn', name: 'Saturn', orderFromSun: 6, kind: 'gas-giant',
    orbitRadiusAu: 9.537, orbitalPeriodDays: 10759, orbitalSpeedKmPerS: 9.7,
    radiusEarths: 9.45, rotationHours: 10.7, axialTiltDegrees: 26.7,
    meanTempC: -140,
    signature: 'Bright rings of tumbling ice and rock',
    fact: 'Saturn’s rings are billions of ice pieces, each on its own orbit.',
    palette: ['#e3cf9e', '#cbb277', '#a68c50', '#f2e7c8'],
  },
  {
    id: 'uranus', name: 'Uranus', orderFromSun: 7, kind: 'ice-giant',
    orbitRadiusAu: 19.19, orbitalPeriodDays: 30687, orbitalSpeedKmPerS: 6.8,
    radiusEarths: 4.01, rotationHours: -17.2, axialTiltDegrees: 97.8,
    meanTempC: -195,
    signature: 'An ice giant rolling around the Sun on its side',
    fact: 'Uranus spins on its side, so each pole gets 42 years of daylight.',
    palette: ['#9fd8dd', '#76bec7', '#4d9aa6', '#cdeef0'],
  },
  {
    id: 'neptune', name: 'Neptune', orderFromSun: 8, kind: 'ice-giant',
    orbitRadiusAu: 30.07, orbitalPeriodDays: 60190, orbitalSpeedKmPerS: 5.4,
    radiusEarths: 3.88, rotationHours: 16.1, axialTiltDegrees: 28.3,
    meanTempC: -200,
    signature: 'Supersonic winds in a deep-blue atmosphere',
    fact: 'Neptune’s winds reach 2,000 km/h — the fastest in the solar system.',
    palette: ['#3f6ad8', '#2c4fae', '#1d3680', '#8fb0ec'],
  },
] as const;

const planetsById = new Map(SOLAR_PLANETS.map(planet => [planet.id, planet]));

export function getPlanet(planetId: PlanetId): PlanetSpec {
  const planet = planetsById.get(planetId);
  if (!planet) throw new Error(`Unknown planet: ${planetId}`);
  return planet;
}

// ── Orbital mechanics ────────────────────────────────────────────────────

export const TWO_PI = Math.PI * 2;

/** Kepler III for the Sun: T[days] = 365.25 · a[AU]^1.5. */
export function keplerPeriodDays(orbitRadiusAu: number): number {
  if (!Number.isFinite(orbitRadiusAu) || orbitRadiusAu <= 0) {
    throw new Error(`Orbit radius must be positive, got ${orbitRadiusAu}`);
  }
  return 365.25 * Math.pow(orbitRadiusAu, 1.5);
}

/** Radians the planet advances per simulated day. */
export function orbitAngularSpeed(planet: PlanetSpec): number {
  return TWO_PI / planet.orbitalPeriodDays;
}

/**
 * Deterministic starting phase per planet — spread by the golden angle so
 * the opening shot never shows all eight planets stacked in a line.
 */
export function orbitPhaseAtEpoch(planet: PlanetSpec): number {
  return (planet.orderFromSun * 2.399963) % TWO_PI;
}

export function orbitAngleAtDay(planet: PlanetSpec, simDay: number): number {
  const angle = (orbitPhaseAtEpoch(planet) + orbitAngularSpeed(planet) * simDay) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

/** Completed laps since a reference day — drives the orbit-race lap board. */
export function completedLapsSince(planet: PlanetSpec, startDay: number, currentDay: number): number {
  if (currentDay < startDay) return 0;
  return Math.floor((currentDay - startDay) / planet.orbitalPeriodDays);
}

/** The planet among `racers` that completes one full lap first. */
export function firstLapWinner(racers: readonly PlanetId[]): PlanetId {
  if (racers.length === 0) throw new Error('At least one racer is required');
  return [...racers].sort(
    (a, b) => getPlanet(a).orbitalPeriodDays - getPlanet(b).orbitalPeriodDays,
  )[0];
}

/** The genuinely hottest planet — Venus, not Mercury. The whole point. */
export function hottestPlanet(): PlanetSpec {
  return [...SOLAR_PLANETS].sort((a, b) => b.meanTempC - a.meanTempC)[0];
}

// ── Comet on a real Kepler-II ellipse ────────────────────────────────────

export interface CometSpec {
  /** Semi-major axis in AU (representational short-period comet). */
  semiMajorAxisAu: number;
  eccentricity: number;
  /** Sweep constant L in AU²/day — tuned so perihelion passes read well. */
  arealSpeed: number;
}

export const MISSION_COMET: CometSpec = {
  semiMajorAxisAu: 3.2,
  eccentricity: 0.82,
  arealSpeed: 0.055,
};

export interface CometState {
  trueAnomaly: number;
  radiusAu: number;
}

export function cometRadiusAu(comet: CometSpec, trueAnomaly: number): number {
  const p = comet.semiMajorAxisAu * (1 - comet.eccentricity * comet.eccentricity);
  return p / (1 + comet.eccentricity * Math.cos(trueAnomaly));
}

/**
 * Advances the comet by sweeping equal areas in equal times:
 * dθ/dt = L / r² — visibly faster near perihelion, crawling at aphelion.
 */
export function advanceComet(comet: CometSpec, state: CometState, simDays: number): CometState {
  let { trueAnomaly } = state;
  // Sub-step so the fast perihelion swing stays accurate.
  const steps = Math.max(1, Math.ceil(Math.abs(simDays) / 2));
  const dt = simDays / steps;
  for (let index = 0; index < steps; index += 1) {
    const radius = cometRadiusAu(comet, trueAnomaly);
    trueAnomaly = (trueAnomaly + (comet.arealSpeed / (radius * radius)) * dt) % TWO_PI;
  }
  if (!Number.isFinite(trueAnomaly)) {
    throw new Error('Comet propagation produced a non-finite angle');
  }
  return { trueAnomaly, radiusAu: cometRadiusAu(comet, trueAnomaly) };
}

export type CometTailChoice = 'toward-sun' | 'behind-motion' | 'away-from-sun';

/** The tail streams away from the Sun (radiation pressure + solar wind). */
export const CORRECT_COMET_TAIL: CometTailChoice = 'away-from-sun';

// ── Scene scale mappings (representational, disclosed) ───────────────────

export const SCALE_DISCLOSURE =
  'Classroom scale: distances are compressed and planet sizes are enlarged so every world stays visible. '
  + 'The true-scale stage shows honest distances — even then, planet sizes must stay enlarged or they would vanish.';

const COMPRESSED_INNER = 1.55;
const COMPRESSED_SPREAD = 2.16;
/** Metres per AU when the scale lever is pulled to true distances. */
const TRUE_METRES_PER_AU = 0.78;

/** Room-sized orbit radius: √AU keeps inner orbits distinct and Neptune reachable. */
export function compressedOrbitRadius(orbitRadiusAu: number): number {
  return COMPRESSED_INNER + COMPRESSED_SPREAD * Math.sqrt(orbitRadiusAu);
}

/** Distance-proportional orbit radius for the true-scale stage. */
export function trueOrbitRadius(orbitRadiusAu: number): number {
  return orbitRadiusAu * TRUE_METRES_PER_AU;
}

/** Blend between classroom and true spacing; `trueness` in [0, 1]. */
export function blendedOrbitRadius(orbitRadiusAu: number, trueness: number): number {
  const t = Math.min(1, Math.max(0, trueness));
  return compressedOrbitRadius(orbitRadiusAu) * (1 - t) + trueOrbitRadius(orbitRadiusAu) * t;
}

/** Classroom display radius — log-ish so Jupiter is big but not blinding. */
export function compressedPlanetRadius(planet: PlanetSpec): number {
  return 0.055 + 0.052 * Math.log2(1 + planet.radiusEarths);
}

/**
 * True-scale display radius: proportional to the real planet, exaggerated
 * by a declared factor so the dots stay findable at all. The Sun uses a
 * smaller factor so it never swallows Mercury's true orbit (0.30 m here).
 */
export const TRUE_SCALE_SIZE_EXAGGERATION = 150;
export const TRUE_SCALE_SUN_EXAGGERATION = 60;

export function truePlanetRadius(planet: PlanetSpec): number {
  const earthRadiusAu = 4.26e-5;
  return planet.radiusEarths * earthRadiusAu * TRUE_METRES_PER_AU * TRUE_SCALE_SIZE_EXAGGERATION;
}

export function blendedPlanetRadius(planet: PlanetSpec, trueness: number): number {
  const t = Math.min(1, Math.max(0, trueness));
  return compressedPlanetRadius(planet) * (1 - t) + truePlanetRadius(planet) * t;
}

export const COMPRESSED_SUN_RADIUS = 0.62;

export function blendedSunRadius(trueness: number): number {
  const trueSunRadius = 0.00465 * TRUE_METRES_PER_AU * TRUE_SCALE_SUN_EXAGGERATION;
  const t = Math.min(1, Math.max(0, trueness));
  return COMPRESSED_SUN_RADIUS * (1 - t) + trueSunRadius * t;
}

// ── Reference vectors (checked by unit tests and at viewer start-up) ─────

export interface AstronomyReferenceCheck {
  id: string;
  passed: boolean;
  detail: string;
}

/**
 * Verifies the model against independent reference values. The viewer runs
 * this at start-up and refuses to present a world that fails its science.
 */
export function verifySolarAstronomy(): AstronomyReferenceCheck[] {
  const checks: AstronomyReferenceCheck[] = [];

  for (const planet of SOLAR_PLANETS) {
    const predicted = keplerPeriodDays(planet.orbitRadiusAu);
    const deviation = Math.abs(predicted - planet.orbitalPeriodDays) / planet.orbitalPeriodDays;
    checks.push({
      id: `kepler-third-law-${planet.id}`,
      passed: deviation < 0.02,
      detail: `T(${planet.orbitRadiusAu} AU) = ${predicted.toFixed(0)}d vs published ${planet.orbitalPeriodDays}d`,
    });
  }

  checks.push({
    id: 'hottest-planet-is-venus',
    passed: hottestPlanet().id === 'venus',
    detail: `hottest by mean temperature: ${hottestPlanet().name}`,
  });

  const speeds = SOLAR_PLANETS.map(planet => planet.orbitalSpeedKmPerS);
  checks.push({
    id: 'orbital-speed-falls-with-distance',
    passed: speeds.every((speed, index) => index === 0 || speed < speeds[index - 1]),
    detail: 'published orbital speeds decrease monotonically from Mercury to Neptune',
  });

  const nearSun = advanceComet(MISSION_COMET, { trueAnomaly: 0, radiusAu: cometRadiusAu(MISSION_COMET, 0) }, 1);
  const farFromSun = advanceComet(MISSION_COMET, { trueAnomaly: Math.PI, radiusAu: cometRadiusAu(MISSION_COMET, Math.PI) }, 1);
  const nearSweep = Math.abs(nearSun.trueAnomaly - 0);
  const farSweep = Math.abs(farFromSun.trueAnomaly - Math.PI);
  checks.push({
    id: 'comet-equal-areas',
    passed: nearSweep > farSweep * 10,
    detail: `perihelion sweep ${nearSweep.toFixed(4)} rad/day vs aphelion ${farSweep.toFixed(4)} rad/day`,
  });

  return checks;
}
