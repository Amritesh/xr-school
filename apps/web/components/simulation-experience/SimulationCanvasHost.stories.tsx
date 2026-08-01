import SimulationCanvasHost from './SimulationCanvasHost';

const meta = {
  title: 'Simulation Experience/SimulationCanvasHost',
  component: SimulationCanvasHost,
  parameters: { layout: 'fullscreen' },
};

export default meta;

const frame = { width: '100vw', height: '70vh', background: '#071723' };

export const Default = {
  args: { ariaLabel: 'Interactive science world', style: frame },
};

export const EmptyState = {
  args: { ariaLabel: 'Empty simulation world', style: frame },
};

export const LoadingState = {
  args: { ariaLabel: 'Loading simulation world', style: frame, busy: true },
};

export const ErrorState = {
  args: { ariaLabel: 'Simulation world unavailable', style: frame, busy: false },
};
