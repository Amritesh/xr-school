import { ClassroomSync } from './ClassroomSync';

const meta = {
  title: 'Robotree/ClassroomSync',
  component: ClassroomSync,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      notes:
        'Overlay component rendered inside every simulation. It only activates when the URL carries rtSession/rtDevice/rtActivity (added by the student headset page); in Storybook those params are absent, so it renders nothing. When active it shows a fixed "Class live · Phase x/y" chip linking back to the classroom, and a full-screen "Paused by the teacher" overlay while the session is paused. Progress posts and session polling must be mocked (msw) — no real API calls in stories.',
    },
  },
};

export default meta;

/** Outside a classroom session (no rt* URL params) the component renders nothing. */
export const Default = {
  args: { stageIndex: 1, stageCount: 5, completed: false, started: true },
};

/** Launch screen still showing: nothing is reported until the student starts. */
export const EmptyState = {
  args: { stageIndex: 0, stageCount: 5, completed: false, started: false },
};

/** Mid-lesson: mock rt* params to show the live chip with phase progress. */
export const LoadingState = {
  args: { stageIndex: 2, stageCount: 5, completed: false, started: true },
};

/** Lesson finished: the chip reads Completed and the final phase is reported. */
export const ErrorState = {
  args: { stageIndex: 4, stageCount: 5, completed: true, started: true },
};
