import type { ActivityOption, ChapterOption, ClassOption, SubjectOption } from './types';

/**
 * Fixed demo content for the Robotree VR Smart Classroom demo.
 * TODO: add real content package download/offline sync.
 */

export const DEMO_CLASSES: ClassOption[] = Array.from({ length: 12 }, (_, i) => ({
  id: `class-${i + 1}`,
  label: `Class ${i + 1}`,
  icon: '🎓',
}));

export const DEMO_SUBJECTS: SubjectOption[] = [
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'mathematics', label: 'Mathematics', icon: '📐' },
  { id: 'computer', label: 'Computer', icon: '💻' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'robotics', label: 'Robotics', icon: '⚙️' },
  { id: 'evs', label: 'EVS', icon: '🌱' },
  { id: 'physics', label: 'Physics', icon: '🧲' },
  { id: 'chemistry', label: 'Chemistry', icon: '⚗️' },
  { id: 'biology', label: 'Biology', icon: '🧬' },
];

export const DEMO_CHAPTERS: ChapterOption[] = [
  { id: 'chapter-1', label: 'Chapter 1: Introduction', summary: 'Foundations and key vocabulary' },
  { id: 'chapter-2', label: 'Chapter 2: Core Concepts', summary: 'The main ideas, visualised in VR' },
  {
    id: 'chapter-3',
    label: 'Chapter 3: Practice and Assessment',
    summary: 'Guided practice with quiz checkpoints',
  },
];

export const DEMO_ACTIVITIES: ActivityOption[] = [
  {
    id: 'vr-activity-1',
    title: 'VR Activity 1',
    type: 'vrActivity',
    estimatedMinutes: 8,
    totalSteps: 6,
    description: 'Immersive guided VR walkthrough of the chapter concept.',
  },
  {
    id: 'ar-activity-2',
    title: 'AR Activity 2',
    type: 'arActivity',
    estimatedMinutes: 6,
    totalSteps: 5,
    description: 'Augmented overlay activity for tablet and passthrough headsets.',
  },
  {
    id: '3d-model',
    title: '3D Model',
    type: 'threeDModel',
    estimatedMinutes: 5,
    totalSteps: 4,
    description: 'Explorable 3D model with labelled parts and zoom.',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    type: 'quiz',
    estimatedMinutes: 4,
    totalSteps: 5,
    description: 'Five-question interactive quiz with instant feedback.',
  },
  {
    id: 'assessment',
    title: 'Assessment',
    type: 'assessment',
    estimatedMinutes: 10,
    totalSteps: 8,
    description: 'Scored end-of-chapter assessment with per-student results.',
  },
];

export function findActivity(activityId: string): ActivityOption | undefined {
  return DEMO_ACTIVITIES.find((a) => a.id === activityId);
}
