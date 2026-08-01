import LaunchPortal from './LaunchPortal';

const noAction = () => {};
const preferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

const meta = {
  title: 'Simulation Experience/LaunchPortal',
  component: LaunchPortal,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {
  args: {
    title: 'Water Investigation',
    classContext: 'CBSE Class 5 Science',
    objective: 'Predict, test, observe, and explain what floats or sinks.',
    preferences,
    onPreferencesChange: noAction,
    onStartBrowser: noAction,
    onEnterVr: noAction,
  },
};

export const EmptyState = {
  args: { ...Default.args, objective: 'No lesson objective has been published.' },
};

export const LoadingState = {
  args: { ...Default.args, title: 'Preparing investigation' },
};

export const ErrorState = {
  args: { ...Default.args, objective: 'The class could not be prepared. Return to the simulation catalog.' },
};
