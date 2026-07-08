'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RobotreeShell } from '@/components/robotree/RobotreeShell';
import { PremiumTechCard } from '@/components/robotree/PremiumTechCard';
import { ClassGrid } from '@/components/robotree/ClassGrid';
import { SubjectGrid } from '@/components/robotree/SubjectGrid';
import { ChapterActivityPicker } from '@/components/robotree/ChapterActivityPicker';
import { loadDemoLogin, selectContent } from '@/lib/robotreeClient';
import { DEMO_ACTIVITIES, DEMO_CHAPTERS, DEMO_CLASSES, DEMO_SUBJECTS } from '@/lib/robotreeTypes';
import type { DemoLogin } from '@/lib/robotreeTypes';

export default function RobotreeDashboardPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [login, setLogin] = useState<DemoLogin | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedChapter, setSelectedChapter] = useState<string | undefined>();
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadDemoLogin();
    if (!stored) {
      router.replace('/robotree/login');
      return;
    }
    setLogin(stored.login);
    setSessionId(stored.sessionId);
    setSelectedClass(stored.login.selectedClass || undefined);
  }, [router]);

  function pushSelection(selection: {
    selectedClass?: string;
    subject?: string;
    chapter?: string;
    activityId?: string;
  }) {
    if (!sessionId) return;
    selectContent(sessionId, selection).catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not save selection'),
    );
  }

  const classLabel = DEMO_CLASSES.find((c) => c.id === selectedClass)?.label;
  const subjectLabel = DEMO_SUBJECTS.find((s) => s.id === selectedSubject)?.label;
  const chapterLabel = DEMO_CHAPTERS.find((c) => c.id === selectedChapter)?.label;
  const activity = DEMO_ACTIVITIES.find((a) => a.id === selectedActivityId);
  const ready = Boolean(selectedClass && selectedSubject && selectedChapter && activity);

  if (!login || !sessionId) return null;

  return (
    <RobotreeShell
      meta={
        <>
          <span className="rt-pill">{login.teacherName}</span>
          <span className="rt-pill">{login.schoolName}</span>
        </>
      }
    >
      <span className="rt-eyebrow">Teacher Dashboard</span>
      <h1 className="rt-title">Plan today&apos;s VR lesson</h1>
      <div className="rt-step-flow">
        <span className={selectedClass ? 'rt-step-done' : 'rt-step-now'}>1 · Class{classLabel ? ` — ${classLabel}` : ''}</span>
        <span aria-hidden>→</span>
        <span className={selectedSubject ? 'rt-step-done' : selectedClass ? 'rt-step-now' : ''}>
          2 · Subject{subjectLabel ? ` — ${subjectLabel}` : ''}
        </span>
        <span aria-hidden>→</span>
        <span className={selectedChapter && activity ? 'rt-step-done' : selectedSubject ? 'rt-step-now' : ''}>
          3 · Chapter &amp; Activity
        </span>
        <span aria-hidden>→</span>
        <span className={ready ? 'rt-step-now' : ''}>4 · Classroom Control</span>
      </div>

      <PremiumTechCard icon="🎓" title="Select Class">
        <ClassGrid
          selectedClass={selectedClass}
          onSelect={(classId) => {
            setSelectedClass(classId);
            pushSelection({ selectedClass: classId });
          }}
        />
      </PremiumTechCard>

      {selectedClass ? (
        <div className="rt-section">
          <PremiumTechCard icon="📘" title="Select Subject">
            <SubjectGrid
              selectedSubject={selectedSubject}
              onSelect={(subjectId) => {
                setSelectedSubject(subjectId);
                pushSelection({ subject: subjectId });
              }}
            />
          </PremiumTechCard>
        </div>
      ) : null}

      {selectedSubject ? (
        <div className="rt-section">
          <PremiumTechCard icon="🎯" title="Select Chapter & Activity">
            <ChapterActivityPicker
              selectedChapter={selectedChapter}
              selectedActivityId={selectedActivityId}
              onSelectChapter={(chapterId) => {
                setSelectedChapter(chapterId);
                pushSelection({ chapter: chapterId });
              }}
              onSelectActivity={(activityId) => {
                setSelectedActivityId(activityId);
                pushSelection({ activityId });
              }}
            />
          </PremiumTechCard>
        </div>
      ) : null}

      {error ? (
        <p className="rt-note rt-section" style={{ color: 'var(--rt-red)' }}>
          {error}
        </p>
      ) : null}

      <div className="rt-section rt-btn-row">
        <button
          type="button"
          className="rt-btn rt-btn-primary"
          disabled={!ready}
          onClick={() => router.push(`/robotree/classroom/${sessionId}/teacher`)}
        >
          ▶ Open Classroom Control Panel
        </button>
        <button
          type="button"
          className="rt-btn rt-btn-ghost"
          onClick={() => router.push(`/robotree/classroom/${sessionId}/teacher`)}
        >
          Skip — go straight to headsets
        </button>
      </div>
    </RobotreeShell>
  );
}
