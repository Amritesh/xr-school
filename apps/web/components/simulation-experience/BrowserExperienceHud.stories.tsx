import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import BrowserExperienceHud from './BrowserExperienceHud';

const IN_PROGRESS_SNAPSHOT: LessonSnapshot = {
  experienceId: 'pollination-story',
  objective: 'Compare the treatment and control flowers.',
  stageIndex: 4,
  stageCount: 7,
  stageId: 'stage-compare',
  stageTitle: 'Compare treatment and control',
  cue: 'Look at both flowers and note what changed after pollination.',
  performedActionIds: [],
  recordedEvidenceIds: [],
  stageComplete: false,
  lessonComplete: false,
};

const COMPLETE_STAGE_SNAPSHOT: LessonSnapshot = {
  ...IN_PROGRESS_SNAPSHOT,
  performedActionIds: ['compare-flowers'],
  recordedEvidenceIds: ['treatment-fruited'],
  stageComplete: true,
};

const noAction = () => {};

const meta = {
  title: 'Simulation Experience/BrowserExperienceHud',
  component: BrowserExperienceHud,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      notes: 'Back/Continue only render when they would do something; the evidence drawer is a native disclosure button.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    title: 'Pollination Lab',
    snapshot: COMPLETE_STAGE_SNAPSHOT,
    evidence: ['The treatment flower set fruit; the untouched control did not.'],
    onPrevious: noAction,
    onNext: noAction,
  },
};

export const EmptyState = {
  args: {
    title: 'Pollination Lab',
    snapshot: IN_PROGRESS_SNAPSHOT,
    evidence: [],
    onPrevious: noAction,
    onNext: noAction,
  },
};

export const LoadingState = {
  args: {
    title: 'Pollination Lab',
    snapshot: { ...IN_PROGRESS_SNAPSHOT, stageIndex: 0 },
    evidence: [],
    scaleNote: 'Calibrating the garden scale before the first stage begins…',
    onPrevious: noAction,
    onNext: noAction,
  },
};

export const ErrorState = {
  args: {
    title: 'Pollination Lab',
    snapshot: IN_PROGRESS_SNAPSHOT,
    evidence: [],
    scaleNote: 'The enlarged flower model failed to load — showing life-size scale instead.',
    onPrevious: noAction,
    onNext: noAction,
  },
};
