import {
  classLevelsForSimulation,
  COURSES,
  IMPLEMENTED_SIMULATIONS,
  routeForSimulation,
} from '@xr-school/simulation-content';
import type {
  ImplementedSimulationDefinition,
  SimulationFormat,
  Subject,
} from '@xr-school/simulation-schema';

import type { ActivityOption, ChapterOption, ClassOption, SubjectOption } from './types.js';

/**
 * Robotree launch content is a projection of the canonical released registry.
 * Roadmap-only class and subject rows remain visible as disabled UI options,
 * but no independently maintained simulation list exists here.
 */

const SUBJECT_PRESENTATION: Readonly<Record<Subject, { id: string; label: string }>> = {
  science: { id: 'science', label: 'Science' },
  environmentalScience: { id: 'evs', label: 'Environmental Science' },
  mathematics: { id: 'mathematics', label: 'Mathematics' },
  physics: { id: 'physics', label: 'Physics' },
  chemistry: { id: 'chemistry', label: 'Chemistry' },
  biology: { id: 'biology', label: 'Biology' },
  geography: { id: 'geography', label: 'Geography' },
  history: { id: 'history', label: 'History' },
  english: { id: 'english', label: 'English' },
  art: { id: 'art', label: 'Art' },
  computerScience: { id: 'computer', label: 'Computer Science' },
  vocationalSkills: { id: 'vocational', label: 'Vocational Skills' },
  careerExposure: { id: 'career', label: 'Career Exposure' },
};

function activityType(format: SimulationFormat): ActivityOption['type'] {
  switch (format) {
    case 'immersiveVr':
    case 'threeSixtyVr':
    case 'virtualFieldVisit':
      return 'vrActivity';
    case 'revisionMode':
      return 'assessment';
    default:
      return 'threeDModel';
  }
}

function gradeLabel(classLevels: readonly number[]): string {
  if (classLevels.length === 0) return 'Kindergarten';
  if (classLevels.length === 1) return `Class ${classLevels[0]}`;
  return `Class ${classLevels[0]}-${classLevels[classLevels.length - 1]}`;
}

export function toDemoActivity(definition: ImplementedSimulationDefinition): ActivityOption {
  const { module } = definition;
  const classLevels = classLevelsForSimulation(module, COURSES);
  const subjects = module.subjects.map(subject => SUBJECT_PRESENTATION[subject]);
  return {
    id: module.slug,
    moduleId: module.id,
    title: module.title,
    type: activityType(module.simulationFormat),
    estimatedMinutes: module.expectedDurationMinutes,
    totalSteps: module.stages,
    description: module.summary,
    classIds: classLevels.map(classLevel => `class-${classLevel}`),
    subjectIds: subjects.map(subject => subject.id),
    chapterId: module.slug,
    subjectLabel: subjects.map(subject => subject.label).join(', '),
    gradeLabel: gradeLabel(classLevels),
    simulationHref: routeForSimulation(definition),
    publicationStatus: module.publicationStatus,
    evidenceMaturity: module.evidenceMaturity,
  };
}

export const DEMO_ACTIVITIES: ActivityOption[] = IMPLEMENTED_SIMULATIONS
  .filter(definition => definition.module.publicationStatus === 'released')
  .map(toDemoActivity);

const availableClassIds = new Set(
  DEMO_ACTIVITIES.flatMap(activity => activity.classIds ?? []),
);

export const DEMO_CLASSES: ClassOption[] = Array.from({ length: 12 }, (_, index) => {
  const classLevel = index + 1;
  return {
    id: `class-${classLevel}`,
    label: `Class ${classLevel}`,
    icon: '🎓',
    available: availableClassIds.has(`class-${classLevel}`),
  };
});

export const DEMO_SUBJECTS: SubjectOption[] = [
  { id: 'science', label: 'Science', icon: '🔬', available: true },
  { id: 'mathematics', label: 'Mathematics', icon: '📐', available: true },
  { id: 'english', label: 'English', icon: '📖', available: true },
  { id: 'art', label: 'Art', icon: '🎨', available: true },
  { id: 'computer', label: 'Computer', icon: '💻', available: false },
  { id: 'ai', label: 'AI', icon: '🤖', available: false },
  { id: 'robotics', label: 'Robotics', icon: '⚙️', available: false },
  { id: 'evs', label: 'EVS', icon: '🌱', available: true },
  { id: 'physics', label: 'Physics', icon: '🧲', available: true },
  { id: 'chemistry', label: 'Chemistry', icon: '⚗️', available: true },
  { id: 'biology', label: 'Biology', icon: '🧬', available: true },
  { id: 'geography', label: 'Geography', icon: '🌍', available: true },
];

export const DEMO_CHAPTERS: ChapterOption[] = DEMO_ACTIVITIES.map(activity => ({
  id: activity.chapterId ?? activity.id,
  label: activity.title,
  summary: `${activity.gradeLabel} · ${activity.subjectLabel}`,
  classIds: activity.classIds,
  subjectIds: activity.subjectIds,
  activityId: activity.id,
  available: true,
}));

export function findActivity(activityId: string): ActivityOption | undefined {
  return DEMO_ACTIVITIES.find(activity => activity.id === activityId);
}
