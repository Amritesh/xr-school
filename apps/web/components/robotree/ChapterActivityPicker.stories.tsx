import { ChapterActivityPicker } from './ChapterActivityPicker';

const noop = () => {};

const meta = {
  title: 'Robotree/ChapterActivityPicker',
  component: ChapterActivityPicker,
  parameters: {
    layout: 'padded',
    a11y: {
      notes:
        'Chapter uses a native labelled select; original demo activities are buttons with title, description and duration text. Non-matching demos stay visible as disabled greyed-out buttons.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    selectedChapter: 'circuit',
    selectedActivityId: 'circuit',
    selectedClass: 'class-8',
    selectedSubject: 'physics',
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

export const EmptyState = {
  args: {
    selectedChapter: undefined,
    selectedActivityId: undefined,
    selectedClass: undefined,
    selectedSubject: undefined,
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

/** Demo content is static — no async load; unselected pending teacher input. */
export const LoadingState = {
  args: {
    selectedChapter: undefined,
    selectedActivityId: undefined,
    selectedClass: 'class-5',
    selectedSubject: 'evs',
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

/** Save errors surface in the parent dashboard; the picker stays interactive. */
export const ErrorState = {
  args: {
    selectedChapter: 'pollination',
    selectedActivityId: undefined,
    selectedClass: 'class-7',
    selectedSubject: 'biology',
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

export const Mobile = {
  args: {
    selectedChapter: 'c6-ch01-a01-sources-of-food',
    selectedActivityId: 'c6-ch01-a01-sources-of-food',
    selectedClass: 'class-6',
    selectedSubject: 'science',
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
