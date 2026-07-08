'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getSnapshot,
  joinHeadset,
  submitProgress,
  updateDeviceStatus,
} from '@/lib/robotreeClient';
import type { ClassroomStateSnapshot, HeadsetDevice } from '@/lib/robotreeTypes';
import { DEMO_CHAPTERS, DEMO_CLASSES, DEMO_SUBJECTS, findActivity } from '@/lib/robotreeTypes';
import { DeviceStatusPill, SessionStatusPill } from './StatusPill';
import { PremiumTechCard } from './PremiumTechCard';

const POLL_MS = 2000;

function label(list: { id: string; label: string }[], id?: string): string {
  return list.find((item) => item.id === id)?.label ?? '—';
}

/**
 * Simulated VR activity panel for the student/headset client.
 * TODO: connect selected activity to real XR simulation.
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
    joinHeadset(sessionId, { deviceType: 'vrHeadset' })
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

  const commandState = !session
    ? 'Connecting'
    : session.status === 'running' && device?.currentActivityId
      ? 'Running'
      : session.status === 'paused'
        ? 'Paused'
        : session.status === 'stopped'
          ? 'Stopped'
          : session.status === 'ended'
            ? 'Demo Ended'
            : 'Waiting for teacher';

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  }

  const stepIndex = device?.currentStepIndex ?? 0;
  const totalSteps = activity?.totalSteps ?? 0;

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
          {commandState === 'Running' && activity ? activity.title : commandState}
        </div>
        {activity && commandState === 'Running' ? (
          <>
            <p className="rt-note">{activity.description}</p>
            <div style={{ width: 'min(320px, 100%)' }}>
              <div className="rt-progress-track">
                <div
                  className="rt-progress-fill"
                  style={{ width: totalSteps ? `${Math.min(100, (stepIndex / totalSteps) * 100)}%` : '0%' }}
                />
              </div>
              <p className="rt-note">
                Step {stepIndex}/{totalSteps}
              </p>
            </div>
          </>
        ) : (
          <p className="rt-note">
            {device?.label ?? 'This headset'} is paired with the teacher tablet. The activity
            appears here the moment the teacher presses Start.
          </p>
        )}
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

      <PremiumTechCard icon="🎮" title="Headset Demo Controls">
        <div className="rt-btn-row">
          <button
            type="button"
            className="rt-btn rt-btn-primary"
            disabled={!device?.currentActivityId || commandState !== 'Running'}
            onClick={() =>
              act(() =>
                submitProgress(sessionId, {
                  deviceId: device!.id,
                  activityId: device!.currentActivityId!,
                  currentStepIndex: Math.min(stepIndex + 1, totalSteps),
                  totalSteps,
                }),
              )
            }
          >
            ⏫ Send Progress
          </button>
          {activity?.simulationHref ? (
            <Link
              className="rt-btn rt-btn-primary"
              href={activity.simulationHref}
              target="_blank"
              aria-disabled={commandState !== 'Running'}
              style={commandState !== 'Running' ? { pointerEvents: 'none', opacity: 0.45 } : undefined}
            >
              Open Assigned Demo
            </Link>
          ) : null}
          <button
            type="button"
            className="rt-btn"
            disabled={!device?.currentActivityId || commandState !== 'Running'}
            onClick={() => {
              const entry = snapshot?.summary.entries.find(
                (e) => e.deviceId === device!.id && e.activityId === device!.currentActivityId,
              );
              const answers = (entry?.answersSubmitted ?? 0) + 1;
              return act(() =>
                submitProgress(sessionId, {
                  deviceId: device!.id,
                  activityId: device!.currentActivityId!,
                  answersSubmitted: answers,
                  scorePercent: Math.min(100, 55 + answers * 9),
                }),
              );
            }}
          >
            ✅ Submit Demo Answer
          </button>
          <button
            type="button"
            className="rt-btn"
            disabled={!device}
            onClick={() => act(() => updateDeviceStatus(sessionId, device!.id, 'batteryLow'))}
          >
            🪫 Simulate Battery Low
          </button>
          <button
            type="button"
            className="rt-btn"
            disabled={!device}
            onClick={() =>
              act(() =>
                updateDeviceStatus(
                  sessionId,
                  device!.id,
                  device!.status === 'offline' ? 'connected' : 'offline',
                ),
              )
            }
          >
            {device?.status === 'offline' ? '📶 Reconnect' : '📴 Disconnect'}
          </button>
        </div>
        {error ? (
          <p className="rt-note" style={{ color: 'var(--rt-red)', marginTop: '0.7rem' }}>
            {error}
          </p>
        ) : null}
      </PremiumTechCard>
    </div>
  );
}
