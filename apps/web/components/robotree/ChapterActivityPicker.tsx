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
  selectedClass,
  selectedSubject,
  onSelectChapter,
  onSelectActivity,
}: {
  selectedChapter?: string;
  selectedActivityId?: string;
  selectedClass?: string;
  selectedSubject?: string;
  onSelectChapter: (chapterId: string) => void;
  onSelectActivity: (activityId: string) => void;
}) {
  const isAvailableForSelection = (item: { classIds?: string[]; subjectIds?: string[] }) =>
    (!selectedClass || item.classIds?.includes(selectedClass))
    && (!selectedSubject || item.subjectIds?.includes(selectedSubject));

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
          {DEMO_CHAPTERS.map((chapter) => {
            const available = isAvailableForSelection(chapter);
            return (
            <option key={chapter.id} value={chapter.id} disabled={!available}>
              {available ? chapter.label : `${chapter.label} (not available for this selection)`}
            </option>
            );
          })}
        </select>
      </div>

      <div className="rt-grid rt-grid-two">
        {DEMO_ACTIVITIES.map((activity) => {
          const available = isAvailableForSelection(activity);
          return (
          <button
            key={activity.id}
            type="button"
            className={`rt-tile${selectedActivityId === activity.id ? ' rt-tile-active' : ''}${!available ? ' rt-tile-disabled' : ''}`}
            style={{ justifyItems: 'start', textAlign: 'left' }}
            disabled={!available}
            onClick={() => onSelectActivity(activity.id)}
            title={available ? undefined : 'This original demo does not match the selected class and subject'}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="rt-tile-icon" aria-hidden>
                {ACTIVITY_ICONS[activity.type] ?? '🎯'}
              </span>
              <span className="rt-tile-label">{activity.title}</span>
            </span>
            <span className="rt-note">{activity.description}</span>
            <span className="rt-pill">
              {activity.gradeLabel} · {activity.subjectLabel} · {activity.estimatedMinutes} min
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
