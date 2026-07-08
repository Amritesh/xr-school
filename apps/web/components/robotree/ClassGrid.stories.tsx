import { ClassGrid } from './ClassGrid';

const noop = () => {};

const meta = {
  title: 'Robotree/ClassGrid',
  component: ClassGrid,
  parameters: {
    layout: 'padded',
    a11y: {
      notes:
        'Each class is a real button with a text label; unavailable classes stay visible as disabled greyed-out buttons. Interaction test: clicking an available tile fires onSelect with the class id.',
    },
  },
};

export default meta;

export const Default = {
  args: { selectedClass: 'class-8', onSelect: noop },
};

/** Grid renders the fixed Class 1–12 demo catalogue; empty means nothing selected yet. */
export const EmptyState = {
  args: { selectedClass: undefined, onSelect: noop },
};

/** Content is static — the grid has no async load; shown unselected while a session is created. */
export const LoadingState = {
  args: { selectedClass: undefined, onSelect: noop },
};

/** Selection errors are surfaced by the parent dashboard; the grid itself stays interactive. */
export const ErrorState = {
  args: { selectedClass: undefined, onSelect: noop },
};

export const Mobile = {
  args: { selectedClass: 'class-6', onSelect: noop },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
