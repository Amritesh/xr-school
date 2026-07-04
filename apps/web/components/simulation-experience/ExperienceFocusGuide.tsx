'use client';

export type FocusGuideDirection = 'left' | 'right' | 'forward';

export interface FocusGuideState {
  direction: FocusGuideDirection;
  label: string;
  visible?: boolean;
}

export default function ExperienceFocusGuide({
  direction,
  label,
  visible = true,
}: FocusGuideState) {
  if (!visible) return null;

  return (
    <aside
      className="simulation-experience__focus-guide"
      data-direction={direction}
      aria-label="Look guidance"
    >
      <i aria-hidden="true">➜</i>
      <span>{label}</span>
    </aside>
  );
}
