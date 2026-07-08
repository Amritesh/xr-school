'use client';

import { DEMO_ACTIVITIES, DEMO_CHAPTERS } from '@/lib/robotreeTypes';

const ACTIVITY_ICONS: Record<string, string> = {
  vrActivity: '🥽',
  arActivity: '📱',
  threeDModel: '🧊',
  quiz: '❓',
  assessment: '📝',
};

export function ChapterActivityPicker({
  selectedChapter,
  selectedActivityId,
  onSelectChapter,
  onSelectActivity,
}: {
  selectedChapter?: string;
  selectedActivityId?: string;
  onSelectChapter: (chapterId: string) => void;
  onSelectActivity: (activityId: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="rt-field" style={{ marginBottom: 0 }}>
        <label htmlFor="rt-chapter">📖 Syllabus / Chapter</label>
        <select
          id="rt-chapter"
          value={selectedChapter ?? ''}
          onChange={(e) => onSelectChapter(e.target.value)}
        >
          <option value="" disabled>
            Choose a chapter
          </option>
          {DEMO_CHAPTERS.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rt-grid rt-grid-two">
        {DEMO_ACTIVITIES.map((activity) => (
          <button
            key={activity.id}
            type="button"
            className={`rt-tile${selectedActivityId === activity.id ? ' rt-tile-active' : ''}`}
            style={{ justifyItems: 'start', textAlign: 'left' }}
            onClick={() => onSelectActivity(activity.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="rt-tile-icon" aria-hidden>
                {ACTIVITY_ICONS[activity.type] ?? '🎯'}
              </span>
              <span className="rt-tile-label">{activity.title}</span>
            </span>
            <span className="rt-note">{activity.description}</span>
            <span className="rt-pill">
              {activity.estimatedMinutes} min · {activity.totalSteps} steps
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
