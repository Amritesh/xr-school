'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSnapshot, submitProgress } from '@/lib/robotreeClient';

/**
 * Connects a simulation to a live Robotree classroom session.
 *
 * When the simulation URL carries ?rtSession=&rtDevice=&rtActivity= (added by
 * the student headset page), this component:
 * - reports every completed phase to the classroom API automatically,
 * - marks the activity completed when the lesson finishes,
 * - polls the session so teacher Pause/Stop/End takes effect on the headset,
 * - shows a small "class live" chip and a paused overlay.
 *
 * Without those URL params (someone opened the simulation directly) it
 * renders nothing and reports nothing.
 */

export interface ClassroomSyncProps {
  /** Index of the phase the student is currently on (0-based). */
  stageIndex: number;
  /** Total number of phases in this simulation. */
  stageCount: number;
  /** True once the lesson is fully complete. */
  completed: boolean;
  /** False while the launch screen is showing; progress starts reporting once true. */
  started?: boolean;
}

interface ClassroomContext {
  sessionId: string;
  deviceId: string;
  activityId: string;
}

const POLL_MS = 3000;

function readContext(): ClassroomContext | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('rtSession');
  const deviceId = params.get('rtDevice');
  const activityId = params.get('rtActivity');
  if (!sessionId || !deviceId || !activityId) return null;
  return { sessionId, deviceId, activityId };
}

export function ClassroomSync({ stageIndex, stageCount, completed, started = true }: ClassroomSyncProps) {
  const context = useMemo(readContext, []);
  const [paused, setPaused] = useState(false);
  const lastReported = useRef<string | null>(null);

  // Report phase progress whenever it changes.
  useEffect(() => {
    if (!context || !started || stageCount <= 0) return;
    const steps = completed ? stageCount : Math.min(stageIndex, stageCount);
    const key = `${steps}/${stageCount}:${completed}`;
    if (lastReported.current === key) return;
    lastReported.current = key;
    submitProgress(context.sessionId, {
      deviceId: context.deviceId,
      activityId: context.activityId,
      currentStepIndex: steps,
      totalSteps: stageCount,
      status: completed ? 'completed' : 'running',
    }).catch(() => {
      // Allow a retry on the next stage change if the network hiccupped.
      lastReported.current = null;
    });
  }, [context, started, stageIndex, stageCount, completed]);

  // Follow teacher commands: pause shows an overlay, stop/end returns to the classroom page.
  useEffect(() => {
    if (!context) return;
    const timer = setInterval(() => {
      getSnapshot(context.sessionId)
        .then((snap) => {
          const status = snap.session.status;
          if (status === 'stopped' || status === 'ended') {
            window.location.href = `/robotree/headset/${context.sessionId}`;
            return;
          }
          setPaused(status === 'paused');
        })
        .catch(() => {
          // Keep the lesson running if the network drops; polling retries.
        });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [context]);

  if (!context) return null;

  return (
    <>
      <a
        href={`/robotree/headset/${context.sessionId}`}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 40,
          padding: '6px 14px',
          borderRadius: 999,
          background: 'rgba(2, 12, 27, 0.72)',
          border: '1px solid rgba(94, 234, 212, 0.4)',
          color: '#5eead4',
          fontSize: '0.8rem',
          textDecoration: 'none',
          backdropFilter: 'blur(4px)',
        }}
      >
        🟢 Class live · {completed ? 'Completed' : `Phase ${Math.min(stageIndex + 1, stageCount)}/${stageCount}`} · Back to
        class
      </a>
      {paused ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'rgba(2, 8, 18, 0.88)',
            color: '#e2e8f0',
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div style={{ fontSize: 44 }}>⏸</div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Paused by the teacher</h2>
          <p style={{ margin: 0, color: '#94a3b8', maxWidth: 420 }}>
            Look up and listen. The activity continues automatically when the teacher presses
            Resume.
          </p>
        </div>
      ) : null}
    </>
  );
}
