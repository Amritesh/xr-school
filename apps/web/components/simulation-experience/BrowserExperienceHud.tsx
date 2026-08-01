'use client';

import { useState } from 'react';
import type {
  LessonSnapshot,
} from '@xr-school/simulation-runtime';

interface BrowserExperienceHudProps {
  title: string;
  snapshot: LessonSnapshot;
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
  onPrevious(): void;
  onNext(): void;
}

export default function BrowserExperienceHud({
  title,
  snapshot,
  evidence,
  scaleNote,
  completed = false,
  completionEyebrow = 'Experiment complete',
  completionHeadline = 'Cycle observed and recorded',
  completionBody = 'You inspected the flower, transferred pollen, traced fertilisation, '
    + 'compared treatment with control, planted a seed, and identified the radicle and plumule.',
  completionActionLabel = 'Review final observation',
  primaryAction,
  assessment,
  caption,
  onReplayNarration,
  onRestart,
  helpText,
  onPrevious,
  onNext,
}: BrowserExperienceHudProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const progress = ((snapshot.stageIndex + 1) / snapshot.stageCount) * 100;

  return (
    <div className="simulation-experience__hud">
      <header className="simulation-experience__topbar">
        <strong>{title}</strong>
        <div className="simulation-experience__progress" aria-label={`Stage ${snapshot.stageIndex + 1} of ${snapshot.stageCount}`}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="simulation-experience__topbar-actions">
          <button
            type="button"
            aria-expanded={evidenceOpen}
            aria-controls="experience-evidence"
            onClick={() => setEvidenceOpen(value => !value)}
          >
            Evidence {evidence.length}
          </button>
          {onReplayNarration && (
            <button
              type="button"
              className="secondary"
              data-testid="narration-replay"
              onClick={onReplayNarration}
            >
              Replay narration
            </button>
          )}
          {onRestart && (
            <button
              type="button"
              className="secondary"
              data-testid="restart"
              onClick={onRestart}
            >
              Restart
            </button>
          )}
        </div>
      </header>

      {scaleNote && (
        <aside className="simulation-experience__scale-note" aria-label="Scale note">
          {scaleNote}
        </aside>
      )}

      <aside
        id="experience-evidence"
        className="simulation-experience__evidence-drawer"
        data-open={evidenceOpen}
        aria-hidden={!evidenceOpen}
      >
        <span>Evidence observed</span>
        {evidence.length > 0 ? (
          <ul>{evidence.map(item => <li key={item}>{item}</li>)}</ul>
        ) : <p>Perform the experiment and observe what changes.</p>}
      </aside>

      {caption && (
        <p className="simulation-experience__caption" aria-live="polite">
          {caption}
        </p>
      )}

      {completed && (
        <section
          className="simulation-experience__complete-panel"
          data-testid="completion"
          aria-labelledby="experience-complete"
        >
          <span>{completionEyebrow}</span>
          <h2 id="experience-complete">{completionHeadline}</h2>
          <p>{completionBody}</p>
          <button type="button" className="secondary" onClick={onPrevious}>
            {completionActionLabel}
          </button>
        </section>
      )}

      {!completed && (
        <section className="simulation-experience__mission-dock" aria-labelledby="experience-mission">
          <div className="simulation-experience__stage-number">
            {String(snapshot.stageIndex + 1).padStart(2, '0')}
          </div>
          <div className="simulation-experience__stage-copy">
            <span>{snapshot.stageComplete ? 'Evidence captured' : 'Discover'}</span>
            <h2 id="experience-mission" data-testid="stage-title">
              {snapshot.stageTitle}
            </h2>
            <p data-testid="stage-cue">{snapshot.cue}</p>
            {helpText && <small>{helpText}</small>}
          </div>
          {(primaryAction || snapshot.stageIndex > 0 || snapshot.stageComplete) && (
            <div className="simulation-experience__mission-actions">
              {primaryAction && (
                <button
                  type="button"
                  data-testid="primary-action"
                  disabled={primaryAction.disabled}
                  onClick={primaryAction.onActivate}
                >
                  {primaryAction.label}
                </button>
              )}
              {snapshot.stageIndex > 0 && (
                <button type="button" className="secondary" onClick={onPrevious}>
                  Back
                </button>
              )}
              {snapshot.stageComplete && (
                <button type="button" onClick={onNext}>
                  {snapshot.lessonComplete ? 'Complete' : 'Continue'}
                </button>
              )}
            </div>
          )}
          {assessment && (
            <fieldset
              className="simulation-experience__assessment"
              aria-describedby={assessment.feedback
                ? `${assessment.promptId}-feedback`
                : undefined}
            >
              <legend>{assessment.question}</legend>
              {assessment.options.map(option => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={assessment.selectedId === option.id}
                  onClick={() => assessment.onAnswer(option.id)}
                >
                  {option.label}
                </button>
              ))}
              {assessment.feedback && (
                <p
                  id={`${assessment.promptId}-feedback`}
                  data-testid="feedback"
                  role="status"
                >
                  {assessment.feedback}
                </p>
              )}
            </fieldset>
          )}
        </section>
      )}
    </div>
  );
}
