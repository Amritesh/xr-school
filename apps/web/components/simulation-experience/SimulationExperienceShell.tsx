'use client';

import type { ReactNode } from 'react';
import type {
  LessonSnapshot,
} from '@xr-school/simulation-runtime';
import { ClassroomSync } from '../robotree/ClassroomSync';
import BrowserExperienceHud from './BrowserExperienceHud';
import ExperienceFocusGuide, {
  type FocusGuideState,
} from './ExperienceFocusGuide';
import LaunchPortal, { type ExperiencePreferences } from './LaunchPortal';
import './simulation-experience.css';

interface SimulationExperienceShellProps {
  simulationId?: string;
  title: string;
  classContext: string;
  objective: string;
  snapshot: LessonSnapshot;
  started: boolean;
  preferences: ExperiencePreferences;
  onPreferencesChange(preferences: ExperiencePreferences): void;
  onStartBrowser(): void;
  onEnterVr?: () => void;
  onPrevious(): void;
  onNext(): void;
  evidence: readonly string[];
  scaleNote?: string;
  completed?: boolean;
  completionEyebrow?: string;
  completionHeadline?: string;
  completionBody?: string;
  completionActionLabel?: string;
  primaryAction?: {
    label: string;
    disabled?: boolean;
    onActivate(): void;
  };
  assessment?: {
    promptId: string;
    question: string;
    options: readonly { id: string; label: string }[];
    selectedId?: string;
    feedback?: string;
    onAnswer(optionId: string): void;
  };
  caption?: string;
  onReplayNarration?: () => void;
  onRestart?: () => void;
  helpText?: string;
  focusGuide?: FocusGuideState;
  error?: string;
  projector?: boolean;
  children: ReactNode;
}

export default function SimulationExperienceShell({
  simulationId,
  title,
  classContext,
  objective,
  snapshot,
  started,
  preferences,
  onPreferencesChange,
  onStartBrowser,
  onEnterVr,
  onPrevious,
  onNext,
  evidence,
  scaleNote,
  completed = false,
  completionEyebrow,
  completionHeadline,
  completionBody,
  completionActionLabel,
  primaryAction,
  assessment,
  caption,
  onReplayNarration,
  onRestart,
  helpText,
  focusGuide,
  error,
  projector = false,
  children,
}: SimulationExperienceShellProps) {
  return (
    <main
      className="simulation-experience"
      data-simulation-id={simulationId ?? snapshot.experienceId}
      data-stage-id={snapshot.stageId}
      data-projector={projector}
      data-reduced-motion={preferences.reducedMotion}
    >
      <div className="simulation-experience__world">{children}</div>
      <ClassroomSync
        stageIndex={snapshot.stageIndex}
        stageCount={snapshot.stageCount}
        completed={completed || snapshot.lessonComplete}
        started={started}
      />
      {started && !error && focusGuide && (
        <ExperienceFocusGuide {...focusGuide} />
      )}
      {!started && !error && (
        <LaunchPortal
          title={title}
          classContext={classContext}
          objective={objective}
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          onStartBrowser={onStartBrowser}
          onEnterVr={onEnterVr}
        />
      )}
      {started && !error && (
        <BrowserExperienceHud
          title={title}
          snapshot={snapshot}
          evidence={evidence}
          scaleNote={scaleNote}
          completed={completed}
          completionEyebrow={completionEyebrow}
          completionHeadline={completionHeadline}
          completionBody={completionBody}
          completionActionLabel={completionActionLabel}
          primaryAction={primaryAction}
          assessment={assessment}
          caption={caption}
          onReplayNarration={onReplayNarration}
          onRestart={onRestart}
          helpText={helpText}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
      {error && (
        <section className="simulation-experience__error" role="alert">
          <span>Experience paused</span>
          <h1>The simulation could not continue.</h1>
          <p>{error}</p>
        </section>
      )}
      <p className="sr-only" aria-live="polite">{snapshot.cue}</p>
    </main>
  );
}

export type { ExperiencePreferences };
