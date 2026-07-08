import { RobotreeShell } from './RobotreeShell';
import { SessionStatusPill } from './StatusPill';

const meta = {
  title: 'Robotree/RobotreeShell',
  component: RobotreeShell,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      notes:
        'Header is a landmark with the brand as the home link; page content renders in a main landmark.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    meta: <SessionStatusPill status="running" />,
    children: 'Page content',
  },
};

export const EmptyState = {
  args: {
    children: 'Page content without top-bar meta',
  },
};

export const LoadingState = {
  args: {
    meta: <span className="rt-pill">Connecting…</span>,
    children: 'Connecting to classroom…',
  },
};

export const ErrorState = {
  args: {
    meta: <span className="rt-pill rt-pill-red">Disconnected</span>,
    children: 'Connection lost.',
  },
};
