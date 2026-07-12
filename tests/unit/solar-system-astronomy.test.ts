import { describe, expect, it } from 'vitest';
import {
  MISSION_COMET,
  SOLAR_PLANETS,
  advanceComet,
  blendedOrbitRadius,
  blendedPlanetRadius,
  blendedSunRadius,
  cometRadiusAu,
  compressedOrbitRadius,
  completedLapsSince,
  firstLapWinner,
  getPlanet,
  hottestPlanet,
  keplerPeriodDays,
  orbitAngleAtDay,
  verifySolarAstronomy,
} from '../../apps/web/lib/world-builder/solarSystemAstronomy';

describe('solar system astronomy model', () => {
  it('lists the eight planets in order from the Sun', () => {
    expect(SOLAR_PLANETS).toHaveLength(8);
    expect(SOLAR_PLANETS.map(planet => planet.orderFromSun)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(SOLAR_PLANETS.map(planet => planet.id)).toEqual([
      'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
    ]);
  });

  it('agrees with Kepler’s third law for every planet within 2%', () => {
    for (const planet of SOLAR_PLANETS) {
      const predicted = keplerPeriodDays(planet.orbitRadiusAu);
      expect(Math.abs(predicted - planet.orbitalPeriodDays) / planet.orbitalPeriodDays)
        .toBeLessThan(0.02);
    }
  });

  it('confronts the hottest-planet misconception with real data', () => {
    expect(hottestPlanet().id).toBe('venus');
    expect(getPlanet('venus').meanTempC).toBeGreaterThan(getPlanet('mercury').meanTempC);
  });

  it('makes Mercury win any race that includes it', () => {
    expect(firstLapWinner(['mercury', 'earth', 'mars'])).toBe('mercury');
    expect(firstLapWinner(['neptune', 'earth'])).toBe('earth');
  });

  it('counts completed laps from real periods', () => {
    const mercury = getPlanet('mercury');
    expect(completedLapsSince(mercury, 0, 87)).toBe(0);
    expect(completedLapsSince(mercury, 0, 88.5)).toBe(1);
    expect(completedLapsSince(mercury, 0, 265)).toBe(3);
    expect(completedLapsSince(getPlanet('earth'), 0, 265)).toBe(0);
  });

  it('advances orbit angles deterministically', () => {
    const earth = getPlanet('earth');
    const start = orbitAngleAtDay(earth, 0);
    const halfYear = orbitAngleAtDay(earth, 365.25 / 2);
    const fullYear = orbitAngleAtDay(earth, 365.25);
    expect(Math.abs(halfYear - start)).toBeCloseTo(Math.PI, 5);
    expect(fullYear).toBeCloseTo(start, 5);
  });

  it('sweeps the comet faster near perihelion (Kepler II)', () => {
    const perihelion = advanceComet(MISSION_COMET, {
      trueAnomaly: 0,
      radiusAu: cometRadiusAu(MISSION_COMET, 0),
    }, 1);
    const aphelion = advanceComet(MISSION_COMET, {
      trueAnomaly: Math.PI,
      radiusAu: cometRadiusAu(MISSION_COMET, Math.PI),
    }, 1);
    expect(perihelion.trueAnomaly).toBeGreaterThan((aphelion.trueAnomaly - Math.PI) * 10);
  });

  it('keeps every orbit inside the classroom at compressed scale and ordered at all blends', () => {
    let previous = 0;
    for (const planet of SOLAR_PLANETS) {
      const compressed = compressedOrbitRadius(planet.orbitRadiusAu);
      expect(compressed).toBeGreaterThan(previous);
      expect(compressed).toBeLessThan(16);
      previous = compressed;
      expect(blendedOrbitRadius(planet.orbitRadiusAu, 0)).toBeCloseTo(compressed, 6);
      expect(blendedOrbitRadius(planet.orbitRadiusAu, 1)).toBeCloseTo(planet.orbitRadiusAu * 0.78, 6);
    }
  });

  it('never lets the true-scale Sun swallow Mercury’s orbit', () => {
    const sunRadius = blendedSunRadius(1);
    const mercuryOrbit = blendedOrbitRadius(getPlanet('mercury').orbitRadiusAu, 1);
    expect(sunRadius).toBeLessThan(mercuryOrbit);
    // And planets shrink dramatically when the lever is pulled.
    const earth = getPlanet('earth');
    expect(blendedPlanetRadius(earth, 1)).toBeLessThan(blendedPlanetRadius(earth, 0) / 10);
  });

  it('passes its own reference-vector verification', () => {
    const failures = verifySolarAstronomy().filter(check => !check.passed);
    expect(failures).toEqual([]);
  });
});
