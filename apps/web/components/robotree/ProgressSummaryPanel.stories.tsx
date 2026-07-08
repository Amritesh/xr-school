import { ProgressSummaryPanel } from './ProgressSummaryPanel';
import {
  MOCK_EMPTY_SESSION,
  MOCK_EMPTY_SUMMARY,
  MOCK_SESSION,
  MOCK_SUMMARY,
} from './robotree.stories.mocks';

const meta = {
  title: 'Robotree/ProgressSummaryPanel',
  component: ProgressSummaryPanel,
  parameters: {
    layout: 'padded',
    a11y: {
      notes:
        'Stats and the per-headset table are plain text; progress bars are paired with a "Step x/y" text label so progress is never colour/width alone.',
    },
  },
};

export default meta;

export const Default = {
  args: { session: MOCK_SESSION, summary: MOCK_SUMMARY },
};

export const EmptyState = {
  args: { session: MOCK_EMPTY_SESSION, summary: MOCK_EMPTY_SUMMARY },
};

/** Counts render immediately from the 2s snapshot poll; zeroed while first snapshot loads. */
export const LoadingState = {
  args: { session: MOCK_EMPTY_SESSION, summary: MOCK_EMPTY_SUMMARY },
};

/** Stopped entries remain listed so the teacher can see where each student halted. */
export const ErrorState = {
  args: {
    session: MOCK_SESSION,
    summary: {
      ...MOCK_SUMMARY,
      runningCount: 0,
      stoppedCount: 2,
      entries: MOCK_SUMMARY.entries.map((e) => ({ ...e, status: 'stopped' as const })),
    },
  },
};

export const Mobile = {
  args: { session: MOCK_SESSION, summary: MOCK_SUMMARY },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
