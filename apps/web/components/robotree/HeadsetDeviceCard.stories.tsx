import { HeadsetDeviceCard } from './HeadsetDeviceCard';
import { MOCK_DEVICES } from './robotree.stories.mocks';

const noop = () => {};

const meta = {
  title: 'Robotree/HeadsetDeviceCard',
  component: HeadsetDeviceCard,
  parameters: {
    layout: 'centered',
    a11y: {
      notes:
        'The whole card is a toggle button with aria-pressed for selection. Status and battery are text labels, not colour alone. Interaction test: clicking fires onToggleSelect with the inverted selection.',
    },
  },
};

export default meta;

export const Default = {
  args: { device: MOCK_DEVICES[0], onToggleSelect: noop },
};

/** An idle headset with no assigned activity. */
export const EmptyState = {
  args: {
    device: { ...MOCK_DEVICES[1], currentActivityId: undefined, currentStepIndex: 0 },
    onToggleSelect: noop,
  },
};

/** Syncing content from the teacher tablet. */
export const LoadingState = {
  args: { device: { ...MOCK_DEVICES[1], status: 'syncing' }, onToggleSelect: noop },
};

/** Offline devices dim and are skipped by start commands. */
export const ErrorState = {
  args: { device: MOCK_DEVICES[3], onToggleSelect: noop },
};

export const BatteryLow = {
  args: { device: MOCK_DEVICES[2], onToggleSelect: noop },
};
