'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RobotreeShell } from '@/components/robotree/RobotreeShell';
import { PremiumTechCard } from '@/components/robotree/PremiumTechCard';
import { HeadsetDeviceCard } from '@/components/robotree/HeadsetDeviceCard';
import { TeacherControlPanel, type TeacherAction } from '@/components/robotree/TeacherControlPanel';
import { ProgressSummaryPanel } from '@/components/robotree/ProgressSummaryPanel';
import { SessionStatusPill } from '@/components/robotree/StatusPill';
import { clearDemoLogin, getSnapshot, selectDevice, sendCommand } from '@/lib/robotreeClient';
import type { ClassroomStateSnapshot } from '@/lib/robotreeTypes';
import { DEMO_CHAPTERS, DEMO_CLASSES, DEMO_SUBJECTS } from '@/lib/robotreeTypes';

const POLL_MS = 2000;

export default function RobotreeTeacherPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [snapshot, setSnapshot] = useState<ClassroomStateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<TeacherAction | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    getSnapshot(sessionId)
      .then((snap) => {
        setSnapshot(snap);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Connection lost'));
  }, [sessionId]);

  // Snapshot polling keeps the panel live even if realtime transport fails.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const session = snapshot?.session;
  const selectedCount = session?.devices.filter((d) => d.selected).length ?? 0;

  async function handleAction(action: TeacherAction) {
    setBusyAction(action);
    setNotice(null);
    try {
      switch (action) {
        case 'startSelected':
          await sendCommand(sessionId, { type: 'startSelected' });
          setNotice(`Activity started on ${selectedCount} selected headset(s).`);
          break;
        case 'startAll':
          await sendCommand(sessionId, { type: 'startAll' });
          setNotice('Activity started on all connected headsets.');
          break;
        case 'pauseAll':
          await sendCommand(sessionId, { type: 'pauseAll' });
          setNotice('Activity paused on all headsets. Press Resume All to continue.');
          break;
        case 'resumeAll':
          await sendCommand(sessionId, { type: 'resumeAll' });
          setNotice('Activity resumed on all headsets.');
          break;
        case 'stopAll':
          await sendCommand(sessionId, { type: 'stopAll' });
          setNotice('Activity stopped — headsets returned to the waiting screen.');
          break;
        case 'syncContent':
          await sendCommand(sessionId, { type: 'syncContent' });
          setNotice('Content synced — all reachable headsets are connected.');
          break;
        case 'copyJoinLink': {
          const link = `${window.location.origin}/robotree/headset/${sessionId}`;
          await navigator.clipboard.writeText(link);
          setNotice(`Join link copied: ${link}`);
          break;
        }
        case 'viewProgress':
          progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'endDemo':
          await sendCommand(sessionId, { type: 'endDemo' });
          clearDemoLogin();
          router.push('/robotree/login');
          return;
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setBusyAction(null);
    }
  }

  const classLabel = DEMO_CLASSES.find((c) => c.id === session?.selectedClass)?.label ?? '—';
  const subjectLabel = DEMO_SUBJECTS.find((s) => s.id === session?.selectedSubject)?.label ?? '—';
  const chapterLabel = DEMO_CHAPTERS.find((c) => c.id === session?.selectedChapter)?.label ?? '—';

  return (
    <RobotreeShell
      meta={
        session ? (
          <>
            <SessionStatusPill status={session.status} />
            <span className="rt-pill">
              Join code <span className="rt-code">{session.joinCode}</span>
            </span>
            <Link href="/robotree/dashboard" className="rt-btn rt-btn-ghost">
              ← Change content
            </Link>
          </>
        ) : null
      }
    >
      <span className="rt-eyebrow">Classroom Control</span>
      <h1 className="rt-title">
        {session ? `${session.teacherName} · ${session.schoolName}` : 'Connecting to classroom…'}
      </h1>
      <p className="rt-subtitle">
        {classLabel} · {subjectLabel} · {chapterLabel} ·{' '}
        {session?.selectedActivity?.title ?? 'No activity selected'}
      </p>
      {session?.selectedActivity?.simulationHref ? (
        <div className="rt-btn-row rt-section">
          <Link className="rt-btn" href={session.selectedActivity.simulationHref} target="_blank">
            🖥 Preview activity (projector)
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="rt-note rt-section" style={{ color: 'var(--rt-red)' }}>
          {error} — retrying every 2 seconds.
        </p>
      ) : null}
      {notice ? (
        <p className="rt-note rt-section" style={{ color: 'var(--rt-green)' }}>
          {notice}
        </p>
      ) : null}

      {snapshot && session ? (
        <>
          <div className="rt-section">
            <PremiumTechCard icon="🎛" title="Teacher Controls">
              <TeacherControlPanel
                session={session}
                selectedCount={selectedCount}
                busyAction={busyAction}
                onAction={handleAction}
              />
            </PremiumTechCard>
          </div>

          <div className="rt-section">
            <PremiumTechCard
              icon="🥽"
              title={`Headsets (${session.devices.length})`}
              actions={
                <span className="rt-note" style={{ fontSize: '0.75rem' }}>
                  Tap a card to select it for a targeted start
                </span>
              }
            >
              {session.devices.length === 0 ? (
                <p className="rt-note">
                  No headsets connected yet. On each headset (or any browser), open the student
                  join link — use <strong>Copy Student Join Link</strong> above — or go to{' '}
                  <span className="rt-code">/robotree/headset</span> and enter join code{' '}
                  <span className="rt-code">{session.joinCode}</span>.
                </p>
              ) : (
                <div className="rt-grid rt-grid-devices">
                  {session.devices.map((device) => (
                    <HeadsetDeviceCard
                      key={device.id}
                      device={device}
                      onToggleSelect={(deviceId, selected) =>
                        selectDevice(sessionId, deviceId, selected).then(refresh).catch(() => {})
                      }
                    />
                  ))}
                </div>
              )}
            </PremiumTechCard>
          </div>

          <div className="rt-section" ref={progressRef}>
            <PremiumTechCard icon="📊" title="Student Progress">
              <ProgressSummaryPanel session={session} summary={snapshot.summary} />
            </PremiumTechCard>
          </div>
        </>
      ) : null}
    </RobotreeShell>
  );
}
