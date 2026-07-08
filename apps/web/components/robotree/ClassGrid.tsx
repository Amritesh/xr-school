'use client';

import { DEMO_CLASSES } from '@/lib/robotreeTypes';

export function ClassGrid({
  selectedClass,
  onSelect,
}: {
  selectedClass?: string;
  onSelect: (classId: string) => void;
}) {
  return (
    <div className="rt-grid rt-grid-classes">
      {DEMO_CLASSES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`rt-tile${selectedClass === c.id ? ' rt-tile-active' : ''}${!c.available ? ' rt-tile-disabled' : ''}`}
          disabled={!c.available}
          onClick={() => onSelect(c.id)}
          title={c.available ? undefined : 'No working demo available for this class yet'}
        >
          <span className="rt-tile-icon" aria-hidden>
            {c.icon}
          </span>
          <span className="rt-tile-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
