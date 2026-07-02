'use client';

export interface ExperiencePreferences {
  audio: boolean;
  subtitles: boolean;
  comfort: boolean;
  seated: boolean;
  reducedMotion: boolean;
}

interface LaunchPortalProps {
  title: string;
  classContext: string;
  objective: string;
  preferences: ExperiencePreferences;
  onPreferencesChange(preferences: ExperiencePreferences): void;
  onStartBrowser(): void;
  onEnterVr?: () => void;
}

const PREFERENCE_CONTROLS: {
  key: keyof ExperiencePreferences;
  label: string;
}[] = [
  { key: 'audio', label: 'Audio' },
  { key: 'subtitles', label: 'Subtitles' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'seated', label: 'Seated' },
  { key: 'reducedMotion', label: 'Reduced motion' },
];

export default function LaunchPortal({
  title,
  classContext,
  objective,
  preferences,
  onPreferencesChange,
  onStartBrowser,
  onEnterVr,
}: LaunchPortalProps) {
  return (
    <section className="simulation-experience__launch" aria-labelledby="experience-title">
      <div className="simulation-experience__launch-glow" aria-hidden="true" />
      <div className="simulation-experience__launch-copy">
        <span>{classContext}</span>
        <h1 id="experience-title">{title}</h1>
        <p>{objective}</p>
        <div className="simulation-experience__launch-actions">
          {onEnterVr && <button type="button" onClick={onEnterVr}>Enter VR</button>}
          <button type="button" className="secondary" onClick={onStartBrowser}>
            Explore in browser
          </button>
        </div>
        <fieldset className="simulation-experience__preferences">
          <legend>Experience settings</legend>
          {PREFERENCE_CONTROLS.map(control => (
            <label key={control.key}>
              <input
                type="checkbox"
                checked={preferences[control.key]}
                onChange={event => onPreferencesChange({
                  ...preferences,
                  [control.key]: event.target.checked,
                })}
              />
              <span>{control.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
