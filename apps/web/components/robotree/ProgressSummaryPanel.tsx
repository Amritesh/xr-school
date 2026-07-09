'use client';

import type { ClassroomSession, ProgressSummary } from '@/lib/robotreeTypes';
import { findActivity } from '@/lib/robotreeTypes';

export function ProgressSummaryPanel({
  session,
  summary,
}: {
  session: ClassroomSession;
  summary: ProgressSummary;
}) {
  const deviceLabel = (deviceId: string) =>
    session.devices.find((d) => d.id === deviceId)?.label ?? deviceId;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="rt-stat-row">
        <div className="rt-stat">
          <strong>{summary.connectedDevices}/{summary.totalDevices}</strong>
          <span>Connected</span>
        </div>
        <div className="rt-stat">
          <strong>{summary.runningCount}</strong>
          <span>In Activity</span>
        </div>
        <div className="rt-stat">
          <strong>{summary.completedCount}</strong>
          <span>Completed</span>
        </div>
      </div>

      {summary.entries.length === 0 ? (
        <p className="rt-note">
          No student progress yet. Start an activity — each headset reports phases automatically
          as students complete them in VR.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="rt-table">
            <thead>
              <tr>
                <th>Headset</th>
                <th>Activity</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {summary.entries.map((entry) => {
                const percent =
                  entry.totalSteps > 0
                    ? Math.min(100, Math.round((entry.currentStepIndex / entry.totalSteps) * 100))
                    : 0;
                return (
                  <tr key={`${entry.deviceId}-${entry.activityId}`}>
                    <td>{deviceLabel(entry.deviceId)}</td>
                    <td>{findActivity(entry.activityId)?.title ?? entry.activityId}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {entry.status === 'completed' ? '✅ Completed' : entry.status}
                    </td>
                    <td style={{ minWidth: '9rem' }}>
                      <div className="rt-progress-track">
                        <div className="rt-progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="rt-note" style={{ fontSize: '0.72rem' }}>
                        Phase {entry.currentStepIndex}/{entry.totalSteps}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
