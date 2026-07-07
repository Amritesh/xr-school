import { describe, expect, it } from 'vitest';
import {
  PLANET_MATCHING_QUESTIONS,
  SOLAR_MISSION_REQUIREMENTS,
  SOLAR_MISSION_STAGES,
  SOLAR_SYSTEM_PLANETS,
  answerPlanetMatchingQuestion,
  arrangePlanets,
  createSolarMissionProgress,
  getPlanetMatchingScore,
  identifyPlanet,
  isSolarMissionStageComplete,
  recordSolarMissionAction,
} from '../../apps/web/lib/solarSystemMissionLesson';

describe('Classes 8-10 Solar System mission lesson model', () => {
  it('teaches all eight planets in correct order from the Sun', () => {
    expect(SOLAR_SYSTEM_PLANETS.map(planet => planet.name)).toEqual([
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ]);
    expect(SOLAR_SYSTEM_PLANETS.map(planet => planet.orderFromSun)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('structures a 10-12 minute NASA-style space mission', () => {
    const totalSeconds = SOLAR_MISSION_STAGES.reduce(
      (sum, stage) => sum + stage.durationSeconds,
      0,
    );

    expect(totalSeconds).toBeGreaterThanOrEqual(600);
    expect(totalSeconds).toBeLessThanOrEqual(720);
    expect(SOLAR_MISSION_STAGES.map(stage => stage.id)).toEqual([
      'opening-cinematic',
      'launch-and-earth-orbit',
      'inner-solar-system',
      'moon-mars-asteroids',
      'outer-planets',
      'kuiper-comet-scale',
      'interactive-mission',
      'final-celebration',
    ]);
  });

  it('covers the required mission content and activities', () => {
    expect(SOLAR_MISSION_REQUIREMENTS).toContain('Classes 8-10 Science');
    expect(SOLAR_MISSION_REQUIREMENTS).toContain('NASA-style spacecraft cockpit');
    expect(SOLAR_MISSION_REQUIREMENTS).toContain('All eight planets in order');
    expect(SOLAR_MISSION_REQUIREMENTS).toContain('Sun, Moon, asteroid belt, Kuiper Belt, Pluto, Ceres, and comet');
    expect(SOLAR_MISSION_REQUIREMENTS).toContain('No classroom slideshow');
  });

  it('requires scans before flight stages complete', () => {
    let progress = createSolarMissionProgress();
    for (const actionId of SOLAR_MISSION_STAGES.find(stage => stage.id === 'outer-planets')!.requiredActionIds) {
      progress = recordSolarMissionAction(progress, 'outer-planets', actionId);
    }

    expect(isSolarMissionStageComplete(progress, 'outer-planets')).toBe(true);
    expect(() => recordSolarMissionAction(progress, 'outer-planets', 'scan-pluto')).toThrow(/not valid/);
  });

  it('scores identification, arrangement, and planet matching challenges', () => {
    let progress = createSolarMissionProgress();

    for (const planet of SOLAR_SYSTEM_PLANETS) {
      progress = identifyPlanet(progress, planet.id);
    }
    expect(progress.completedActions['interactive-mission']).toContain('complete-identification');

    progress = arrangePlanets(progress, SOLAR_SYSTEM_PLANETS.map(planet => planet.id));
    expect(progress.completedActions['interactive-mission']).toContain('complete-arrangement');

    for (const question of PLANET_MATCHING_QUESTIONS) {
      progress = answerPlanetMatchingQuestion(progress, question.id, question.correctPlanetId);
    }
    expect(getPlanetMatchingScore(progress)).toEqual({ correct: 8, total: 8 });
    expect(progress.completedActions['interactive-mission']).toContain('complete-matching');
  });
});
