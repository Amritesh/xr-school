import type { ReactNode } from 'react';
import ExperienceFocusGuide from './ExperienceFocusGuide';
import './simulation-experience.css';

const meta = {
  title: 'Simulation Experience/ExperienceFocusGuide',
  component: ExperienceFocusGuide,
  decorators: [
    (Story: () => ReactNode) => (
      <div
        className="simulation-experience"
        style={{
          minHeight: 420,
          background: 'radial-gradient(circle at center, #24415d, #070a18)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Default = {
  args: {
    direction: 'right',
    label: 'Look toward the resistor',
    visible: true,
  },
};

export const EmptyState = {
  args: {
    direction: 'forward',
    label: '',
    visible: false,
  },
};

export const LoadingState = {
  args: {
    direction: 'forward',
    label: 'Locating the next experiment target…',
    visible: true,
  },
};

export const ErrorState = {
  args: {
    direction: 'left',
    label: 'Return to the experiment bench',
    visible: true,
  },
};
