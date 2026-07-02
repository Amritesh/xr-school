import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from './SimulationExperienceShell';

const COMPLETE_SNAPSHOT: LessonSnapshot = {
  experienceId: 'experience-story',
  objective: 'Compare the current reading and bulb response.',
  stageIndex: 2,
  stageCount: 4,
  stageId: 'stage-resistance',
  stageTitle: 'Change the resistance',
  cue: 'Try the 200 Ω resistor and compare both pieces of evidence.',
  performedActionIds: ['place-resistor'],
  recordedEvidenceIds: ['current-dropped'],
  stageComplete: true,
  lessonComplete: false,
};

const INCOMPLETE_SNAPSHOT: LessonSnapshot = {
  ...COMPLETE_SNAPSHOT,
  performedActionIds: [],
  recordedEvidenceIds: [],
  stageComplete: false,
};

const PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

const noAction = () => {};

const WORLD = (
  <div style={{
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 50% 45%, #313684, #080b1c 68%)',
  }} />
);

const meta = {
  title: 'Simulation Experience/SimulationExperienceShell',
  component: SimulationExperienceShell,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      notes: 'The central world stays unobstructed; live guidance is announced politely and all controls are native buttons or inputs.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    title: 'Circuit Lab',
    classContext: 'Class 8 Physics',
    objective: COMPLETE_SNAPSHOT.objective,
    snapshot: COMPLETE_SNAPSHOT,
    started: true,
    preferences: PREFERENCES,
    onPreferencesChange: noAction,
    onStartBrowser: noAction,
    onEnterVr: noAction,
    onPrevious: noAction,
    onNext: noAction,
    evidence: ['More resistance produced less current.'],
    children: WORLD,
  },
};

export const EmptyState = {
  args: {
    ...Default.args,
    snapshot: INCOMPLETE_SNAPSHOT,
    evidence: [],
  },
};

export const LoadingState = {
  args: {
    ...Default.args,
    title: 'Preparing Circuit Lab',
    objective: 'Calibrating the workbench, materials, and interaction scale.',
    snapshot: INCOMPLETE_SNAPSHOT,
    started: false,
  },
};

export const ErrorState = {
  args: {
    ...Default.args,
    error: 'The verified circuit model could not be loaded. Retry the experience.',
  },
};
