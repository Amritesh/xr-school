export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export type SolarMissionStageId =
  | 'opening-cinematic'
  | 'launch-and-earth-orbit'
  | 'inner-solar-system'
  | 'moon-mars-asteroids'
  | 'outer-planets'
  | 'kuiper-comet-scale'
  | 'interactive-mission'
  | 'final-celebration';

export type PlanetDefinition = {
  id: PlanetId;
  name: string;
  orderFromSun: number;
  type: 'rocky' | 'gas-giant' | 'ice-giant';
  color: string;
  relativeSize: number;
  fact: string;
  signatureFeature: string;
};

export type SolarMissionStage = {
  id: SolarMissionStageId;
  title: string;
  durationSeconds: number;
  narration: string;
  environment: string;
  interactionPrompt: string;
  visualFocus: readonly string[];
  requiredActionIds: readonly string[];
};

export type PlanetMatchingQuestion = {
  id: string;
  prompt: string;
  correctPlanetId: PlanetId;
  optionIds: readonly PlanetId[];
};

export type SolarMissionProgress = {
  completedActions: Partial<Record<SolarMissionStageId, string[]>>;
  identifiedPlanets: PlanetId[];
  arrangedPlanetIds: PlanetId[];
  matchingAnswers: Record<string, PlanetId>;
};

export const SOLAR_SYSTEM_PLANETS: readonly PlanetDefinition[] = [
  { id: 'mercury', name: 'Mercury', orderFromSun: 1, type: 'rocky', color: '#a8a29e', relativeSize: 0.38, fact: 'Closest planet to the Sun with almost no atmosphere.', signatureFeature: 'Craters and extreme temperatures' },
  { id: 'venus', name: 'Venus', orderFromSun: 2, type: 'rocky', color: '#fbbf24', relativeSize: 0.95, fact: 'The hottest planet because of its thick greenhouse atmosphere.', signatureFeature: 'Dense yellow clouds and lightning' },
  { id: 'earth', name: 'Earth', orderFromSun: 3, type: 'rocky', color: '#3b82f6', relativeSize: 1, fact: 'Liquid water, oxygen, and a protective atmosphere support life.', signatureFeature: 'Oceans, clouds, Moon, aurora, and night lights' },
  { id: 'mars', name: 'Mars', orderFromSun: 4, type: 'rocky', color: '#ef4444', relativeSize: 0.53, fact: 'A red world with evidence of ancient water and future mission targets.', signatureFeature: 'Olympus Mons, Valles Marineris, rovers, and dust storms' },
  { id: 'jupiter', name: 'Jupiter', orderFromSun: 5, type: 'gas-giant', color: '#d6a168', relativeSize: 11.2, fact: 'The largest planet, with powerful gravity and giant storms.', signatureFeature: 'Great Red Spot, cloud bands, auroras, and four major moons' },
  { id: 'saturn', name: 'Saturn', orderFromSun: 6, type: 'gas-giant', color: '#fde68a', relativeSize: 9.45, fact: 'A low-density gas giant famous for bright icy rings.', signatureFeature: 'Ring gaps, ring shadows, ice particles, and Titan' },
  { id: 'uranus', name: 'Uranus', orderFromSun: 7, type: 'ice-giant', color: '#67e8f9', relativeSize: 4, fact: 'An ice giant that rotates on its side.', signatureFeature: 'Blue-green color, tilted rotation, and faint rings' },
  { id: 'neptune', name: 'Neptune', orderFromSun: 8, type: 'ice-giant', color: '#2563eb', relativeSize: 3.88, fact: 'The farthest major planet, with the strongest winds.', signatureFeature: 'Deep blue storms, fast winds, and Triton' },
] as const;

export const PLANET_MATCHING_QUESTIONS: readonly PlanetMatchingQuestion[] = [
  { id: 'planet-with-rings', prompt: 'Which planet has the most famous rings?', correctPlanetId: 'saturn', optionIds: ['saturn', 'mars', 'venus', 'earth'] },
  { id: 'supports-life', prompt: 'Which planet supports life?', correctPlanetId: 'earth', optionIds: ['venus', 'earth', 'uranus', 'mercury'] },
  { id: 'hottest-planet', prompt: 'Which planet is the hottest?', correctPlanetId: 'venus', optionIds: ['mercury', 'venus', 'mars', 'neptune'] },
  { id: 'largest-planet', prompt: 'Which planet is the largest?', correctPlanetId: 'jupiter', optionIds: ['earth', 'saturn', 'jupiter', 'uranus'] },
  { id: 'great-red-spot', prompt: 'Which planet has the Great Red Spot?', correctPlanetId: 'jupiter', optionIds: ['jupiter', 'saturn', 'venus', 'mars'] },
  { id: 'rotates-sideways', prompt: 'Which planet rotates on its side?', correctPlanetId: 'uranus', optionIds: ['uranus', 'earth', 'mars', 'mercury'] },
  { id: 'olympus-mons', prompt: 'Which planet has Olympus Mons?', correctPlanetId: 'mars', optionIds: ['mars', 'venus', 'earth', 'neptune'] },
  { id: 'fastest-winds', prompt: 'Which planet has the fastest winds?', correctPlanetId: 'neptune', optionIds: ['saturn', 'neptune', 'mercury', 'jupiter'] },
] as const;

export const SOLAR_MISSION_STAGES: readonly SolarMissionStage[] = [
  {
    id: 'opening-cinematic',
    title: 'Prepare for Launch',
    durationSeconds: 60,
    narration: 'For thousands of years, humans have looked toward the night sky and wondered what lies beyond. Today, you will leave Earth and explore our Solar System like never before. Prepare for launch.',
    environment: 'Black screen, stars appear, Milky Way reveal, spacecraft systems power on, cockpit windows show Earth, mission control begins communication.',
    interactionPrompt: 'Press Launch Systems on the holographic dashboard.',
    visualFocus: ['Milky Way', 'panoramic glass cockpit', 'AI assistant', 'mission control dashboard', 'oxygen indicators', 'distance tracker'],
    requiredActionIds: ['power-launch-systems'],
  },
  {
    id: 'launch-and-earth-orbit',
    title: 'Launch and Earth Orbit',
    durationSeconds: 90,
    narration: 'Engines ignite. The rocket rises through clouds into orbit. Earth turns below with oceans, continents, clouds, night lights, aurora, satellites, and the International Space Station nearby.',
    environment: 'Rocket launch vibration, exhaust, blue atmosphere fading to black, low Earth orbit, ISS flyby, satellite paths, and Earth rotation.',
    interactionPrompt: 'Stabilize orbit and scan Earth.',
    visualFocus: ['rocket exhaust', 'Earth atmosphere', 'ISS', 'satellites', 'aurora borealis', 'cloud systems'],
    requiredActionIds: ['stabilize-orbit', 'scan-earth'],
  },
  {
    id: 'inner-solar-system',
    title: 'Sun and Inner Planets',
    durationSeconds: 120,
    narration: 'The spacecraft accelerates toward the Sun. You observe fusion, solar flares, Mercury craters, Venus clouds, and Earth from deep space.',
    environment: 'Warp transition, glowing orbit paths, Sun corona, heat distortion, Mercury sunrise, Venus lightning, Earth day-night cycle.',
    interactionPrompt: 'Scan the Sun, Mercury, Venus, and Earth.',
    visualFocus: ['Sun fusion', 'solar flares', 'Mercury craters', 'Venus greenhouse clouds', 'Earth life systems'],
    requiredActionIds: ['scan-sun', 'scan-mercury', 'scan-venus', 'scan-earth-deep-space'],
  },
  {
    id: 'moon-mars-asteroids',
    title: 'Moon, Mars, and Asteroid Belt',
    durationSeconds: 100,
    narration: 'Descend near the Moon, then continue to Mars and the asteroid belt. Observe low gravity, Apollo traces, red dust, rovers, Olympus Mons, Valles Marineris, Ceres, and rotating asteroids.',
    environment: 'Lunar dust, Apollo landing site, rover, footprints, Mars dust storm, Curiosity, Perseverance, Ingenuity, safe asteroid navigation.',
    interactionPrompt: 'Complete lunar, Mars, and asteroid scans.',
    visualFocus: ['Moon low gravity', 'Apollo landing site', 'Mars rovers', 'Olympus Mons', 'Valles Marineris', 'Ceres', 'asteroid belt'],
    requiredActionIds: ['scan-moon', 'scan-mars', 'navigate-asteroids'],
  },
  {
    id: 'outer-planets',
    title: 'Outer Giants',
    durationSeconds: 110,
    narration: 'The outer Solar System reveals enormous worlds. Jupiter storms, Saturn rings, Uranus sideways rotation, and Neptune winds show how different each planet can be.',
    environment: 'Jupiter scale flyby, Great Red Spot, Galilean moons, Saturn ring gap, Titan, Uranus tilt, Neptune storms, Triton.',
    interactionPrompt: 'Scan each outer planet.',
    visualFocus: ['Jupiter Great Red Spot', 'Io', 'Europa', 'Ganymede', 'Callisto', 'Saturn ring particles', 'Titan', 'Uranus tilt', 'Neptune winds'],
    requiredActionIds: ['scan-jupiter', 'scan-saturn', 'scan-uranus', 'scan-neptune'],
  },
  {
    id: 'kuiper-comet-scale',
    title: 'Kuiper Belt, Comets, and Scale',
    durationSeconds: 75,
    narration: 'Beyond Neptune lie frozen objects, dwarf planets, Pluto, and comets. Zooming out reveals the true scale of the Solar System and how empty space really is.',
    environment: 'Kuiper Belt objects, Pluto, comet ice and dust tails, ion tail pointing away from the Sun, full Solar System scale zoom.',
    interactionPrompt: 'Scan Pluto, comet tails, and the scale map.',
    visualFocus: ['Kuiper Belt', 'Pluto', 'dwarf planets', 'comet dust tail', 'comet ion tail', 'relative distances', 'relative sizes'],
    requiredActionIds: ['scan-kuiper-belt', 'scan-comet', 'open-scale-map'],
  },
  {
    id: 'interactive-mission',
    title: 'Interactive Mission Challenges',
    durationSeconds: 105,
    narration: 'Now complete your astronaut training. Identify planets, arrange them from the Sun, match planet facts, compare sizes, and observe gravity differences.',
    environment: 'Holographic Solar System challenge deck with planet selection, arrange planets, matching questions, size comparison, gravity jump demonstration, and random memory challenge.',
    interactionPrompt: 'Complete all mission challenge stations.',
    visualFocus: ['planet identification', 'planet order', 'planet matching', 'size comparison', 'gravity demonstration', 'memory challenge'],
    requiredActionIds: ['complete-identification', 'complete-arrangement', 'complete-matching', 'complete-size-compare', 'complete-gravity-demo', 'complete-memory-challenge'],
  },
  {
    id: 'final-celebration',
    title: 'Solar System Explorer',
    durationSeconds: 60,
    narration: 'From the smallest rocky planet to the largest gas giant, every world has its own story. Our Solar System is only a tiny part of the Milky Way. Keep looking up.',
    environment: 'Entire Solar System visible, holographic orbits light up, Gold Mission Badge, Certificate of Completion, Space Explorer Medal, spacecraft turns toward the Milky Way, fade to black.',
    interactionPrompt: 'Collect your Solar System Explorer badge.',
    visualFocus: ['full Solar System', 'holographic orbits', 'Gold Mission Badge', 'Space Explorer Medal', 'Keep Looking Up'],
    requiredActionIds: [],
  },
] as const;

export const SOLAR_MISSION_REQUIREMENTS = [
  'Classes 8-10 Science',
  '10-12 minute interactive space mission',
  'NASA-style spacecraft cockpit',
  'All eight planets in order',
  'Sun, Moon, asteroid belt, Kuiper Belt, Pluto, Ceres, and comet',
  'Interactive planet identification, arrangement, matching, size, gravity, and memory activities',
  'Scientifically accurate simple narration',
  'No classroom slideshow',
] as const;

const stagesById = new Map(SOLAR_MISSION_STAGES.map(stage => [stage.id, stage]));
const planetsById = new Map(SOLAR_SYSTEM_PLANETS.map(planet => [planet.id, planet]));
const matchingQuestionsById = new Map(PLANET_MATCHING_QUESTIONS.map(question => [question.id, question]));

export function getPlanetDefinition(planetId: PlanetId): PlanetDefinition {
  const planet = planetsById.get(planetId);
  if (!planet) throw new Error(`Unknown planet: ${planetId}`);
  return planet;
}

export function createSolarMissionProgress(): SolarMissionProgress {
  return {
    completedActions: {},
    identifiedPlanets: [],
    arrangedPlanetIds: [],
    matchingAnswers: {},
  };
}

export function recordSolarMissionAction(
  progress: SolarMissionProgress,
  stageId: SolarMissionStageId,
  actionId: string,
): SolarMissionProgress {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown solar mission stage: ${stageId}`);
  if (!stage.requiredActionIds.includes(actionId)) {
    throw new Error(`Action "${actionId}" is not valid for stage "${stageId}"`);
  }

  const completed = progress.completedActions[stageId] ?? [];
  if (completed.includes(actionId)) return progress;
  return {
    ...progress,
    completedActions: {
      ...progress.completedActions,
      [stageId]: [...completed, actionId],
    },
  };
}

export function isSolarMissionStageComplete(
  progress: SolarMissionProgress,
  stageId: SolarMissionStageId,
): boolean {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown solar mission stage: ${stageId}`);
  const completed = progress.completedActions[stageId] ?? [];
  return stage.requiredActionIds.every(actionId => completed.includes(actionId));
}

export function identifyPlanet(progress: SolarMissionProgress, planetId: PlanetId): SolarMissionProgress {
  if (progress.identifiedPlanets.includes(planetId)) return progress;
  const identifiedPlanets = [...progress.identifiedPlanets, planetId];
  const nextProgress = { ...progress, identifiedPlanets };
  if (identifiedPlanets.length === SOLAR_SYSTEM_PLANETS.length) {
    return recordSolarMissionAction(nextProgress, 'interactive-mission', 'complete-identification');
  }
  return nextProgress;
}

export function arrangePlanets(progress: SolarMissionProgress, planetIds: readonly PlanetId[]): SolarMissionProgress {
  const expected = SOLAR_SYSTEM_PLANETS.map(planet => planet.id);
  const arrangedPlanetIds = [...planetIds];
  const nextProgress = { ...progress, arrangedPlanetIds };
  if (expected.every((planetId, index) => planetId === arrangedPlanetIds[index])) {
    return recordSolarMissionAction(nextProgress, 'interactive-mission', 'complete-arrangement');
  }
  return nextProgress;
}

export function answerPlanetMatchingQuestion(
  progress: SolarMissionProgress,
  questionId: string,
  planetId: PlanetId,
): SolarMissionProgress {
  const question = matchingQuestionsById.get(questionId);
  if (!question) throw new Error(`Unknown planet matching question: ${questionId}`);
  if (!question.optionIds.includes(planetId)) {
    throw new Error(`Planet "${planetId}" is not valid for question "${questionId}"`);
  }
  const nextProgress = {
    ...progress,
    matchingAnswers: {
      ...progress.matchingAnswers,
      [questionId]: planetId,
    },
  };
  if (PLANET_MATCHING_QUESTIONS.every(item => nextProgress.matchingAnswers[item.id] === item.correctPlanetId)) {
    return recordSolarMissionAction(nextProgress, 'interactive-mission', 'complete-matching');
  }
  return nextProgress;
}

export function getPlanetMatchingScore(progress: SolarMissionProgress) {
  return {
    correct: PLANET_MATCHING_QUESTIONS.filter(
      question => progress.matchingAnswers[question.id] === question.correctPlanetId,
    ).length,
    total: PLANET_MATCHING_QUESTIONS.length,
  };
}
