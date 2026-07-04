'use client';

import { useState } from 'react';
import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';

interface BrowserExperienceHudProps {
  title: string;
  snapshot: LessonSnapshot;
  evidence: readonly string[];
  scaleNote?: string;
  completed?: boolean;
  onPrevious(): void;
  onNext(): void;
}

export default function BrowserExperienceHud({
  title,
  snapshot,
  evidence,
  scaleNote,
  completed = false,
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
        <button
          type="button"
          aria-expanded={evidenceOpen}
          aria-controls="experience-evidence"
          onClick={() => setEvidenceOpen(value => !value)}
        >
          Evidence {evidence.length}
        </button>
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

      {completed && (
        <section className="simulation-experience__complete-panel" aria-labelledby="experience-complete">
          <span>Experiment complete</span>
          <h2 id="experience-complete">Cycle observed and recorded</h2>
          <p>
            You inspected the flower, transferred pollen, traced fertilisation,
            compared treatment with control, planted a seed, and identified the
            radicle and plumule.
          </p>
          <button type="button" className="secondary" onClick={onPrevious}>
            Review final observation
          </button>
        </section>
      )}

      {!completed && (
        <section className="simulation-experience__mission-dock" aria-labelledby="experience-mission">
          <div className="simulation-experience__stage-number">
            {String(snapshot.stageIndex + 1).padStart(2, '0')}
          </div>
          <div>
            <span>{snapshot.stageComplete ? 'Evidence captured' : 'Discover'}</span>
            <h2 id="experience-mission">{snapshot.stageTitle}</h2>
            <p>{snapshot.cue}</p>
          </div>
          <div className="simulation-experience__mission-actions">
            <button
              type="button"
              className="secondary"
              disabled={snapshot.stageIndex === 0}
              onClick={onPrevious}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!snapshot.stageComplete}
              onClick={onNext}
            >
              {snapshot.lessonComplete ? 'Complete' : 'Continue'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
