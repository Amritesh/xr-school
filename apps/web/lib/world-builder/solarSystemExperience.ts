import {
  createLessonSession,
  type LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import type {
  ExperienceDefinition,
} from '../../../../packages/simulation-schema/src/index';
import {
  CORRECT_COMET_TAIL,
  firstLapWinner,
  hottestPlanet,
  type CometTailChoice,
  type PlanetId,
} from './solarSystemAstronomy';

/**
 * Lesson flow for the solar system mission. Stages advance by direct
 * manipulation of named objects in the living solar system — the planets
 * never stop orbiting, and every prediction is confronted with a real
 * measurement or observation before the lesson moves on.
 */

export const RACE_PLANETS: readonly PlanetId[] = ['mercury', 'earth', 'mars'];

export const SOLAR_SYSTEM_EXPERIENCE_DEFINITION: ExperienceDefinition = {
  id: 'experience-solar-system-mission',
  gradeTone: 'class9To10',
  objective:
    'Explain how the Sun’s gravity organises the solar system: why closer planets orbit faster, '
    + 'why Venus (not Mercury) is hottest, how empty space really is, and why a comet’s tail points away from the Sun.',
  stages: [
    {
      id: 'stage-arrival',
      title: 'A system in motion',
      cue: 'Watch the eight planets move — none of them travels in a straight line. Select the Sun, the body every path bends around.',
      requiredActionIds: ['inspect-sun'],
      completionEvidenceIds: ['system-observed'],
    },
    {
      id: 'stage-gravity',
      title: 'Switch on the gravity lens',
      cue: 'Gravity is invisible. Power the gravity lens beside the Sun to see its pull — strongest close in, fading with distance.',
      requiredActionIds: ['toggle-gravity-lens'],
      completionEvidenceIds: ['gravity-visualised'],
    },
    {
      id: 'stage-orbit-race',
      title: 'The orbit race',
      cue: 'Mercury, Earth, and Mars are racing one full lap. First select the planet you predict will finish first — then watch, and select the actual winner.',
      requiredActionIds: ['predict-race-winner', 'confirm-race-winner'],
      completionEvidenceIds: ['closer-is-faster'],
    },
    {
      id: 'stage-heat-probe',
      title: 'Hunt the hottest world',
      cue: 'Mercury sits closest to the Sun. Select the planet you predict is hottest, then aim the infrared probe at Mercury and at Venus and compare the readings.',
      requiredActionIds: ['predict-hottest', 'probe-mercury', 'probe-venus'],
      completionEvidenceIds: ['greenhouse-resolved'],
    },
    {
      id: 'stage-giants',
      title: 'Tour of the giants',
      cue: 'Cross the asteroid belt and inspect each giant up close: Jupiter’s great storm, Saturn’s rings, Uranus rolling on its side, Neptune’s winds.',
      requiredActionIds: ['scan-jupiter', 'scan-saturn', 'scan-uranus', 'scan-neptune'],
      completionEvidenceIds: ['giants-compared'],
    },
    {
      id: 'stage-true-scale',
      title: 'The emptiness of space',
      cue: 'Textbook pictures squeeze the planets together. Pull the scale lever to stretch the orbits to true proportions — then find Earth.',
      requiredActionIds: ['pull-scale-lever', 'find-earth'],
      completionEvidenceIds: ['scale-confronted'],
    },
    {
      id: 'stage-comet',
      title: 'Ride the comet',
      cue: 'A comet is falling toward the Sun. Select the arrow showing where you predict its tail will point, then select the comet to ride alongside it.',
      requiredActionIds: ['predict-comet-tail', 'ride-comet'],
      completionEvidenceIds: ['comet-tail-observed'],
    },
    {
      id: 'stage-debrief',
      title: 'Mission debrief',
      cue: 'One last problem: a new probe orbits the Sun from twice Earth’s distance. Select whether its year is longer or shorter than Earth’s, then collect your mission badge.',
      requiredActionIds: ['answer-orbit-transfer', 'collect-badge'],
      completionEvidenceIds: ['transfer-proved'],
    },
  ],
};

/** Named misconceptions this mission confronts, per the design system. */
export const SOLAR_MISCONCEPTIONS = {
  'closer-is-faster': 'All planets take about the same time to orbit the Sun.',
  'greenhouse-resolved': 'Mercury must be the hottest planet because it is closest to the Sun.',
  'scale-confronted': 'The planets are spaced as closely as textbook diagrams show.',
  'comet-tail-observed': 'A comet’s tail trails behind it like smoke from a train.',
} as const;

export type SolarPredictionId = 'race-winner' | 'hottest-planet' | 'comet-tail' | 'orbit-transfer';

export interface SolarPredictionRecord {
  choice: string;
  correct: boolean;
}

export interface SolarMissionSummary {
  evidenceCount: number;
  misconceptionsResolved: string[];
  predictions: Partial<Record<SolarPredictionId, SolarPredictionRecord>>;
  transferProved: boolean;
  masteryMet: boolean;
}

export interface SolarSystemExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
  recordPrediction(id: SolarPredictionId, choice: string): SolarPredictionRecord;
  prediction(id: SolarPredictionId): SolarPredictionRecord | undefined;
  summary(): SolarMissionSummary;
}

export const CORRECT_PREDICTIONS: Record<SolarPredictionId, string> = {
  'race-winner': firstLapWinner(RACE_PLANETS),
  'hottest-planet': hottestPlanet().id,
  'comet-tail': CORRECT_COMET_TAIL satisfies CometTailChoice,
  'orbit-transfer': 'longer',
};

export function createSolarSystemExperience(): SolarSystemExperience {
  const lesson = createLessonSession(SOLAR_SYSTEM_EXPERIENCE_DEFINITION);
  let predictions: Partial<Record<SolarPredictionId, SolarPredictionRecord>> = {};

  return {
    perform(actionId) {
      const stage = SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages[lesson.snapshot().stageIndex];
      if (!stage.requiredActionIds.includes(actionId)) {
        throw new Error(`Action ${actionId} is not permitted in the current stage ${stage.id}`);
      }
      return lesson.performAction(actionId);
    },
    observe: evidenceId => lesson.recordEvidence(evidenceId),
    next: () => lesson.next(),
    previous: () => lesson.previous(),
    restart: () => {
      predictions = {};
      return lesson.restart();
    },
    snapshot: () => lesson.snapshot(),
    recordPrediction(id, choice) {
      const record: SolarPredictionRecord = {
        choice,
        correct: choice === CORRECT_PREDICTIONS[id],
      };
      // First prediction stands — confronting a wrong guess is the lesson.
      predictions[id] ??= record;
      return predictions[id]!;
    },
    prediction: id => predictions[id],
    summary() {
      const { recordedEvidenceIds } = lesson.snapshot();
      const misconceptionsResolved = Object.keys(SOLAR_MISCONCEPTIONS)
        .filter(id => recordedEvidenceIds.includes(id));
      const transferProved = recordedEvidenceIds.includes('transfer-proved');
      return {
        evidenceCount: recordedEvidenceIds.length,
        misconceptionsResolved,
        predictions,
        transferProved,
        // Design-system mastery rule: ≥2 evidence points, ≥1 named
        // misconception resolved, ≥1 transfer beyond the rehearsed case.
        masteryMet: recordedEvidenceIds.length >= 2
          && misconceptionsResolved.length >= 1
          && transferProved,
      };
    },
  };
}
