import { TeacherControlPanel } from './TeacherControlPanel';
import { MOCK_EMPTY_SESSION, MOCK_SESSION } from './robotree.stories.mocks';

const noop = () => {};

const meta = {
  title: 'Robotree/TeacherControlPanel',
  component: TeacherControlPanel,
  parameters: {
    layout: 'padded',
    a11y: {
      notes:
        'All controls are labelled buttons; disabled Start buttons carry a title explaining why. Interaction test: each button fires onAction with its action id; Start buttons disable until an activity is selected.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    session: MOCK_SESSION,
    selectedCount: 1,
    busyAction: null,
    onAction: noop,
  },
};

/** No activity selected yet: both Start buttons are disabled with an explanatory tooltip. */
export const EmptyState = {
  args: {
    session: MOCK_EMPTY_SESSION,
    selectedCount: 0,
    busyAction: null,
    onAction: noop,
  },
};

/** A command in flight disables the row and shows an ellipsis on the busy button. */
export const LoadingState = {
  args: {
    session: MOCK_SESSION,
    selectedCount: 1,
    busyAction: 'startAll',
    onAction: noop,
  },
};

/** Paused session: the Pause All slot switches to Resume All. */
export const Paused = {
  args: {
    session: { ...MOCK_SESSION, status: 'paused' },
    selectedCount: 1,
    busyAction: null,
    onAction: noop,
  },
};

/** Command errors render in the parent page banner; End Demo stays available. */
export const ErrorState = {
  args: {
    session: { ...MOCK_SESSION, status: 'stopped' },
    selectedCount: 0,
    busyAction: null,
    onAction: noop,
  },
};

export const Mobile = {
  args: {
    session: MOCK_SESSION,
    selectedCount: 2,
    busyAction: null,
    onAction: noop,
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
