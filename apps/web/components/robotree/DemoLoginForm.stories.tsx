import { DemoLoginForm } from './DemoLoginForm';

const meta = {
  title: 'Robotree/DemoLoginForm',
  component: DemoLoginForm,
  parameters: {
    layout: 'centered',
    a11y: {
      notes:
        'All fields have programmatic labels; errors render as text below the fields. In Storybook the createSession call must be mocked (msw) — no real API calls in stories. Interaction test: submitting fires createSession and navigates to the dashboard.',
    },
  },
};

export default meta;

export const Default = {};

/** Fields empty; submit falls back to demo defaults (Demo Teacher / Robotree Demo School). */
export const EmptyState = {};

/** While createSession is in flight the button reads "Setting up…" and disables (mock a delayed response). */
export const LoadingState = {};

/** With the classroom API unreachable the form shows the "could not reach the classroom API" banner (mock a network failure). */
export const ErrorState = {};

export const Mobile = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
