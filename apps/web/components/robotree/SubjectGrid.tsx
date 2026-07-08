'use client';

import { DEMO_SUBJECTS } from '@/lib/robotreeTypes';

export function SubjectGrid({
  selectedSubject,
  onSelect,
}: {
  selectedSubject?: string;
  onSelect: (subjectId: string) => void;
}) {
  return (
    <div className="rt-grid rt-grid-subjects">
      {DEMO_SUBJECTS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`rt-tile${selectedSubject === s.id ? ' rt-tile-active' : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="rt-tile-icon" aria-hidden>
            {s.icon}
          </span>
          <span className="rt-tile-label">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
