import { PremiumTechCard } from './PremiumTechCard';

const meta = {
  title: 'Robotree/PremiumTechCard',
  component: PremiumTechCard,
  parameters: {
    layout: 'padded',
    a11y: {
      notes: 'Card renders as a section landmark; the icon is decorative (aria-hidden).',
    },
  },
};

export default meta;

export const Default = {
  args: {
    icon: '🥽',
    title: 'Headsets (4)',
    children: 'Card body content.',
  },
};

export const EmptyState = {
  args: {
    title: 'Headsets (0)',
    children: 'No headsets connected yet.',
  },
};

export const LoadingState = {
  args: {
    icon: '🔄',
    title: 'Headsets',
    children: 'Connecting to classroom…',
  },
};

export const ErrorState = {
  args: {
    icon: '⚠️',
    title: 'Headsets',
    children: 'Connection lost — retrying every 2 seconds.',
  },
};
