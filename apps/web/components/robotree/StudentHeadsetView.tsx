'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSnapshot, joinHeadset } from '@/lib/robotreeClient';
import type { ClassroomStateSnapshot, HeadsetDevice, StudentProgress } from '@/lib/robotreeTypes';
import { DEMO_CHAPTERS, DEMO_CLASSES, DEMO_SUBJECTS, findActivity } from '@/lib/robotreeTypes';
import { DeviceStatusPill, SessionStatusPill } from './StatusPill';
import { PremiumTechCard } from './PremiumTechCard';

const POLL_MS = 2000;

function label(list: { id: string; label: string }[], id?: string): string {
  return list.find((item) => item.id === id)?.label ?? '—';
}

/** Reads the headset battery where the browser supports it (Quest Browser does). */
async function readBatteryPercent(): Promise<number | undefined> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number }>;
    };
    if (!nav.getBattery) return undefined;
    const battery = await nav.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return undefined;
  }
}

/**
 * Student/headset client. Pairs with the classroom, waits for the teacher to
 * start, then hands the student into the assigned VR activity. Progress is
 * reported automatically by the activity itself as phases are completed.
 */
export function StudentHeadsetView({ sessionId }: { sessionId: string }) {
  const [snapshot, setSnapshot] = useState<ClassroomStateSnapshot | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joining = useRef(false);

  // Auto-join once per browser per session; remember the device id.
  useEffect(() => {
    const storageKey = `robotree.device.${sessionId}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      setDeviceId(existing);
      return;
    }
    if (joining.current) return;
    joining.current = true;
    readBatteryPercent()
      .then((batteryPercent) => joinHeadset(sessionId, { deviceType: 'vrHeadset', batteryPercent }))
      .then((device) => {
        localStorage.setItem(storageKey, device.id);
        setDeviceId(device.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not join session'));
  }, [sessionId]);

  const refresh = useCallback(() => {
    getSnapshot(sessionId)
      .then((snap) => {
        setSnapshot(snap);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Connection lost'));
  }, [sessionId]);

  // Poll every 2s so the headset works even without WebSocket.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const session = snapshot?.session;
  const device: HeadsetDevice | undefined = session?.devices.find((d) => d.id === deviceId);
  const activity = device?.currentActivityId
    ? findActivity(device.currentActivityId)
    : session?.selectedActivity;
  const progress: StudentProgress | undefined = snapshot?.summary.entries.find(
    (e) => e.deviceId === device?.id && e.activityId === device?.currentActivityId,
  );
  const completedActivity = progress?.status === 'completed';

  const commandState = !session
    ? 'Connecting'
    : session.status === 'running' && device?.currentActivityId
      ? completedActivity
        ? 'Completed'
        : 'Running'
      : session.status === 'paused'
        ? 'Paused'
        : session.status === 'stopped'
          ? 'Stopped'
          : session.status === 'ended'
            ? 'Demo Ended'
            : 'Waiting for teacher';

  const stepIndex = progress?.currentStepIndex ?? device?.currentStepIndex ?? 0;
  const totalSteps = progress?.totalSteps ?? activity?.totalSteps ?? 0;

  const activityLink =
    device && activity?.simulationHref && device.currentActivityId
      ? `${activity.simulationHref}?rtSession=${encodeURIComponent(session?.id ?? sessionId)}&rtDevice=${encodeURIComponent(device.id)}&rtActivity=${encodeURIComponent(activity.id)}`
      : null;

  return (
    <div style={{ display: 'grid', gap: '1.2rem' }}>
      <div className="rt-headset-stage">
        <span className="rt-eyebrow">Robotree VR Smart Classroom</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {device ? <DeviceStatusPill status={device.status} /> : <span className="rt-pill">Joining…</span>}
          {session ? <SessionStatusPill status={session.status} /> : null}
          {device ? (
            <span className="rt-pill">
              {device.batteryPercent <= 20 ? '🪫' : '🔋'} {device.batteryPercent}%
            </span>
          ) : null}
        </div>
        <div className="rt-headset-activity">
          {commandState === 'Running' && activity
            ? activity.title
            : commandState === 'Completed'
              ? '✅ Activity Complete'
              : commandState}
        </div>

        {commandState === 'Running' && activity && activityLink ? (
          <>
            <p className="rt-note">{activity.description}</p>
            <a
              className="rt-btn rt-btn-primary"
              href={activityLink}
              style={{ fontSize: '1.05rem', padding: '0.9rem 2.2rem' }}
            >
              🥽 Start Activity — Enter VR
            </a>
            <div style={{ width: 'min(320px, 100%)' }}>
              <div className="rt-progress-track">
                <div
                  className="rt-progress-fill"
                  style={{ width: totalSteps ? `${Math.min(100, (stepIndex / totalSteps) * 100)}%` : '0%' }}
                />
              </div>
              <p className="rt-note">
                Phase {stepIndex}/{totalSteps} — progress updates automatically as you complete
                each phase inside the activity.
              </p>
            </div>
          </>
        ) : commandState === 'Completed' && activity ? (
          <p className="rt-note">
            Great work! You finished “{activity.title}” ({totalSteps}/{totalSteps} phases). Your
            teacher can see your result. Wait for the next instruction.
          </p>
        ) : (
          <p className="rt-note">
            {device?.label ?? 'This headset'} is paired with the teacher tablet. The activity
            appears here the moment the teacher presses Start.
          </p>
        )}
        {error ? (
          <p className="rt-note" style={{ color: 'var(--rt-red)' }}>
            {error}
          </p>
        ) : null}
      </div>

      <PremiumTechCard icon="📚" title="Assigned Content">
        <div className="rt-stat-row">
          <div className="rt-stat">
            <strong>{label(DEMO_CLASSES, session?.selectedClass)}</strong>
            <span>Class</span>
          </div>
          <div className="rt-stat">
            <strong>{label(DEMO_SUBJECTS, session?.selectedSubject)}</strong>
            <span>Subject</span>
          </div>
          <div className="rt-stat">
            <strong>{label(DEMO_CHAPTERS, session?.selectedChapter)?.split(':')[0] ?? '—'}</strong>
            <span>Chapter</span>
          </div>
          <div className="rt-stat">
            <strong>{session?.selectedActivity?.title ?? '—'}</strong>
            <span>Activity</span>
          </div>
        </div>
      </PremiumTechCard>
    </div>
  );
}
