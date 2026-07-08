import { ChapterActivityPicker } from './ChapterActivityPicker';

const noop = () => {};

const meta = {
  title: 'Robotree/ChapterActivityPicker',
  component: ChapterActivityPicker,
  parameters: {
    layout: 'padded',
    a11y: {
      notes:
        'Chapter uses a native labelled select; activities are buttons with title, description and duration text. Interaction test: choosing a chapter fires onSelectChapter; clicking an activity card fires onSelectActivity.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    selectedChapter: 'chapter-2',
    selectedActivityId: 'vr-activity-1',
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

export const EmptyState = {
  args: {
    selectedChapter: undefined,
    selectedActivityId: undefined,
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

/** Demo content is static — no async load; unselected pending teacher input. */
export const LoadingState = {
  args: {
    selectedChapter: undefined,
    selectedActivityId: undefined,
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

/** Save errors surface in the parent dashboard; the picker stays interactive. */
export const ErrorState = {
  args: {
    selectedChapter: 'chapter-1',
    selectedActivityId: undefined,
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
};

export const Mobile = {
  args: {
    selectedChapter: 'chapter-3',
    selectedActivityId: 'quiz',
    onSelectChapter: noop,
    onSelectActivity: noop,
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
