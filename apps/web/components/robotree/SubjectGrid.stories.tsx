import { SubjectGrid } from './SubjectGrid';

const noop = () => {};

const meta = {
  title: 'Robotree/SubjectGrid',
  component: SubjectGrid,
  parameters: {
    layout: 'padded',
    a11y: {
      notes:
        'Subject tiles are buttons with text labels; icons are decorative. Interaction test: clicking a tile fires onSelect with the subject id.',
    },
  },
};

export default meta;

export const Default = {
  args: { selectedSubject: 'science', onSelect: noop },
};

export const EmptyState = {
  args: { selectedSubject: undefined, onSelect: noop },
};

/** Static demo catalogue — no async load; unselected while awaiting the teacher's choice. */
export const LoadingState = {
  args: { selectedSubject: undefined, onSelect: noop },
};

/** Errors surface in the parent dashboard; grid stays interactive. */
export const ErrorState = {
  args: { selectedSubject: undefined, onSelect: noop },
};

export const Mobile = {
  args: { selectedSubject: 'robotics', onSelect: noop },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
