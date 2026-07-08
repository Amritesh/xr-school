import type { ActivityOption, ChapterOption, ClassOption, SubjectOption } from './types';

/**
 * Fixed demo content for the Robotree VR Smart Classroom demo.
 * Only the original implemented simulations are startable. Other class and
 * subject rows remain visible in the UI as disabled roadmap entries.
 */

export const DEMO_CLASSES: ClassOption[] = Array.from({ length: 12 }, (_, i) => {
  const classLevel = i + 1;
  return {
    id: `class-${classLevel}`,
    label: `Class ${classLevel}`,
    icon: '🎓',
    available: classLevel >= 5 && classLevel <= 10,
  };
});

export const DEMO_SUBJECTS: SubjectOption[] = [
  { id: 'science', label: 'Science', icon: '🔬', available: true },
  { id: 'mathematics', label: 'Mathematics', icon: '📐', available: false },
  { id: 'computer', label: 'Computer', icon: '💻', available: false },
  { id: 'ai', label: 'AI', icon: '🤖', available: false },
  { id: 'robotics', label: 'Robotics', icon: '⚙️', available: false },
  { id: 'evs', label: 'EVS', icon: '🌱', available: true },
  { id: 'physics', label: 'Physics', icon: '🧲', available: true },
  { id: 'chemistry', label: 'Chemistry', icon: '⚗️', available: true },
  { id: 'biology', label: 'Biology', icon: '🧬', available: true },
];

export const DEMO_ACTIVITIES: ActivityOption[] = [
  {
    id: 'pollination',
    title: 'Plant Pollination & Growth Cycle',
    type: 'vrActivity',
    estimatedMinutes: 10,
    totalSteps: 8,
    description: 'Guide pollen transfer, fertilisation, seed formation, and germination.',
    classIds: ['class-6', 'class-7', 'class-8', 'class-9', 'class-10'],
    subjectIds: ['biology', 'evs'],
    chapterId: 'pollination',
    subjectLabel: 'Biology, Environmental Science',
    gradeLabel: 'Class 6-10',
    simulationHref: '/simulations/pollination',
  },
  {
    id: 'circuit',
    title: "Electric Circuits & Resistance (Ohm's Law)",
    type: 'threeDModel',
    estimatedMinutes: 8,
    totalSteps: 6,
    description: 'Change resistance and observe current, electron flow, and bulb brightness.',
    classIds: ['class-6', 'class-7', 'class-8', 'class-9', 'class-10'],
    subjectIds: ['physics'],
    chapterId: 'circuit',
    subjectLabel: 'Physics',
    gradeLabel: 'Class 6-10',
    simulationHref: '/simulations/circuit',
  },
  {
    id: 'c9-ch01-a02-states-of-matter',
    title: 'States of Matter Particle Lab',
    type: 'threeDModel',
    estimatedMinutes: 10,
    totalSteps: 6,
    description: 'Heat and cool particles to compare solid, liquid, and gas behaviour.',
    classIds: ['class-9'],
    subjectIds: ['chemistry', 'physics'],
    chapterId: 'c9-ch01-a02-states-of-matter',
    subjectLabel: 'Chemistry, Physics',
    gradeLabel: 'Class 9',
    simulationHref: '/simulations/c9-ch01-a02-states-of-matter',
  },
  {
    id: 'c6-ch01-a01-sources-of-food',
    title: 'Sources of Food Sorting Lab',
    type: 'threeDModel',
    estimatedMinutes: 9,
    totalSteps: 5,
    description: 'Sort foods by plant, animal, and fungal sources with instant feedback.',
    classIds: ['class-6'],
    subjectIds: ['science', 'biology'],
    chapterId: 'c6-ch01-a01-sources-of-food',
    subjectLabel: 'Science, Biology',
    gradeLabel: 'Class 6',
    simulationHref: '/simulations/c6-ch01-a01-sources-of-food',
  },
  {
    id: 'c5-ch07-a03-soluble-and-insoluble-substances',
    title: 'Soluble and Insoluble Substances Lab',
    type: 'threeDModel',
    estimatedMinutes: 8,
    totalSteps: 6,
    description: 'Predict, stir, and observe which substances dissolve in water.',
    classIds: ['class-5'],
    subjectIds: ['evs', 'science'],
    chapterId: 'c5-ch07-a03-soluble-and-insoluble-substances',
    subjectLabel: 'Environmental Science, Science',
    gradeLabel: 'Class 5',
    simulationHref: '/simulations/c5-ch07-a03-soluble-and-insoluble-substances',
  },
  {
    id: 'c5-ch03-a02-introduction-of-digestive-system',
    title: 'Introduction to the Digestive System',
    type: 'vrActivity',
    estimatedMinutes: 10,
    totalSteps: 7,
    description: 'Move food through organs and see where nutrients and water are absorbed.',
    classIds: ['class-5'],
    subjectIds: ['evs', 'biology'],
    chapterId: 'c5-ch03-a02-introduction-of-digestive-system',
    subjectLabel: 'Environmental Science, Biology',
    gradeLabel: 'Class 5',
    simulationHref: '/simulations/c5-ch03-a02-introduction-of-digestive-system',
  },
  {
    id: 'c7-ch10-a02-the-breathing-process-in-human',
    title: 'The Breathing Process in Human',
    type: 'threeDModel',
    estimatedMinutes: 10,
    totalSteps: 6,
    description: 'Move the diaphragm and watch the lungs, ribs, and airflow respond.',
    classIds: ['class-7'],
    subjectIds: ['biology'],
    chapterId: 'c7-ch10-a02-the-breathing-process-in-human',
    subjectLabel: 'Biology',
    gradeLabel: 'Class 7',
    simulationHref: '/simulations/c7-ch10-a02-the-breathing-process-in-human',
  },
  {
    id: 'c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape',
    title: "The Effects of Force on an Object's Motion and Shape",
    type: 'threeDModel',
    estimatedMinutes: 10,
    totalSteps: 6,
    description: 'Apply pushes, braking, and side forces to change motion and shape.',
    classIds: ['class-8'],
    subjectIds: ['physics'],
    chapterId: 'c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape',
    subjectLabel: 'Physics',
    gradeLabel: 'Class 8',
    simulationHref: '/simulations/c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape',
  },
  {
    id: 'c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test',
    title: 'Acids, Bases & Neutralisation',
    type: 'threeDModel',
    estimatedMinutes: 10,
    totalSteps: 6,
    description: 'Test substances, read litmus changes, and observe neutralisation.',
    classIds: ['class-10'],
    subjectIds: ['chemistry'],
    chapterId: 'c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test',
    subjectLabel: 'Chemistry',
    gradeLabel: 'Class 10',
    simulationHref: '/simulations/c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test',
  },
];

export const DEMO_CHAPTERS: ChapterOption[] = DEMO_ACTIVITIES.map((activity) => ({
  id: activity.chapterId ?? activity.id,
  label: activity.title,
  summary: `${activity.gradeLabel} · ${activity.subjectLabel}`,
  classIds: activity.classIds,
  subjectIds: activity.subjectIds,
  activityId: activity.id,
  available: true,
}));

export function findActivity(activityId: string): ActivityOption | undefined {
  return DEMO_ACTIVITIES.find((a) => a.id === activityId);
}
