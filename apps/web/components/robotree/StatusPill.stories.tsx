import { DeviceStatusPill, SessionStatusPill } from './StatusPill';

const meta = {
  title: 'Robotree/StatusPill',
  component: DeviceStatusPill,
  parameters: {
    layout: 'centered',
    a11y: {
      notes:
        'Status is communicated by a text label, never by colour alone. Pills are inert (no interaction).',
    },
  },
  subcomponents: { SessionStatusPill },
};

export default meta;

export const Default = {
  args: { status: 'connected' },
};

/** Pills always render a label; an "empty" pill is the neutral draft session state. */
export const EmptyState = {
  render: () => <SessionStatusPill status="draft" />,
};

/** Syncing is the loading-equivalent device state. */
export const LoadingState = {
  args: { status: 'syncing' },
};

/** Offline is the error-equivalent device state. */
export const ErrorState = {
  args: { status: 'offline' },
};

export const BatteryLow = {
  args: { status: 'batteryLow' },
};
