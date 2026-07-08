'use client';

import type { ClassroomSession } from '@/lib/robotreeTypes';

export type TeacherAction =
  | 'startSelected'
  | 'startAll'
  | 'pauseAll'
  | 'stopAll'
  | 'syncContent'
  | 'openSession'
  | 'copyJoinLink'
  | 'simulateHeadsets'
  | 'viewProgress'
  | 'endDemo';

export function TeacherControlPanel({
  session,
  selectedCount,
  busyAction,
  onAction,
}: {
  session: ClassroomSession;
  selectedCount: number;
  busyAction: TeacherAction | null;
  onAction: (action: TeacherAction) => void;
}) {
  const hasActivity = Boolean(session.selectedActivity);
  const btn = (
    action: TeacherAction,
    label: string,
    opts: { primary?: boolean; danger?: boolean; disabled?: boolean; title?: string } = {},
  ) => (
    <button
      type="button"
      className={`rt-btn${opts.primary ? ' rt-btn-primary' : ''}${opts.danger ? ' rt-btn-danger' : ''}`}
      disabled={opts.disabled || busyAction !== null}
      title={opts.title}
      onClick={() => onAction(action)}
    >
      {busyAction === action ? '…' : label}
    </button>
  );

  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      <div className="rt-btn-row">
        {btn('startSelected', `▶ Start on Selected Headset (${selectedCount})`, {
          primary: true,
          disabled: !hasActivity || selectedCount === 0,
          title: hasActivity ? undefined : 'Select chapter and activity first',
        })}
        {btn('startAll', '▶ Start on All Headsets', {
          primary: true,
          disabled: !hasActivity,
          title: hasActivity ? undefined : 'Select chapter and activity first',
        })}
        {btn('pauseAll', '⏸ Pause All')}
        {btn('stopAll', '⏹ Stop All')}
        {btn('syncContent', '🔄 Sync Content')}
        {btn('viewProgress', '📊 View Student Progress')}
      </div>
      <div className="rt-btn-row">
        {btn('openSession', '🔓 Open Session')}
        {btn('copyJoinLink', '🔗 Copy Student Join Link')}
        {btn('simulateHeadsets', '🥽 Simulate 10 Headsets')}
        {btn('endDemo', '⏻ End Demo', { danger: true })}
      </div>
    </div>
  );
}
