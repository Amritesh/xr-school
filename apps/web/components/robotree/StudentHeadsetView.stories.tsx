import { StudentHeadsetView } from './StudentHeadsetView';

const meta = {
  title: 'Robotree/StudentHeadsetView',
  component: StudentHeadsetView,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      notes:
        'Connection, session and battery states are text pills; while running, a single Start Activity link opens the assigned VR activity, which reports phase progress automatically. In Storybook the snapshot poll and join call must be mocked (msw) — no real API calls in stories.',
    },
  },
};

export default meta;

/** Running: mock the snapshot with a running session and an assigned activity. */
export const Default = {
  args: { sessionId: 'rt-mockdemo' },
};

/** Waiting for teacher: mock an open session with no activity assigned to this device. */
export const EmptyState = {
  args: { sessionId: 'rt-mockdemo' },
};

/** Joining: before the join-headset call resolves the view shows "Connecting" pills. */
export const LoadingState = {
  args: { sessionId: 'rt-mockdemo' },
};

/** Connection lost: mock a failing snapshot; the error text renders under the demo controls. */
export const ErrorState = {
  args: { sessionId: 'rt-unknown' },
};

export const Mobile = {
  args: { sessionId: 'rt-mockdemo' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
