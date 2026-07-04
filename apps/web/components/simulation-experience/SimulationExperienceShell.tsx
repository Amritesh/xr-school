'use client';

import type { ReactNode } from 'react';
import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import BrowserExperienceHud from './BrowserExperienceHud';
import ExperienceFocusGuide, {
  type FocusGuideState,
} from './ExperienceFocusGuide';
import LaunchPortal, { type ExperiencePreferences } from './LaunchPortal';
import './simulation-experience.css';

interface SimulationExperienceShellProps {
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
  focusGuide?: FocusGuideState;
  error?: string;
  projector?: boolean;
  children: ReactNode;
}

export default function SimulationExperienceShell({
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
  focusGuide,
  error,
  projector = false,
  children,
}: SimulationExperienceShellProps) {
  return (
    <main
      className="simulation-experience"
      data-projector={projector}
      data-reduced-motion={preferences.reducedMotion}
    >
      <div className="simulation-experience__world">{children}</div>
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
