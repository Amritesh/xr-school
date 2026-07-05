import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(resolve(
  process.cwd(),
  `apps/web/components/simulation-experience/${name}`,
), 'utf8');

describe('shared simulation experience shell', () => {
  it('keeps the world central and exposes launch, mission, and evidence regions', () => {
    const source = read('SimulationExperienceShell.tsx');
    expect(source).toContain('simulation-experience__world');
    expect(source).toContain('LaunchPortal');
    expect(source).toContain('BrowserExperienceHud');
    expect(source).toContain('aria-live="polite"');
  });

  it('offers audio, subtitles, comfort, seated, and reduced-motion controls', () => {
    const source = read('LaunchPortal.tsx');
    for (const label of ['Audio', 'Subtitles', 'Comfort', 'Seated', 'Reduced motion']) {
      expect(source).toContain(label);
    }
  });

  it('uses collapsible edge UI instead of a permanent central card', () => {
    const source = read('BrowserExperienceHud.tsx');
    expect(source).toContain('simulation-experience__mission-dock');
    expect(source).toContain('simulation-experience__evidence-drawer');
    expect(source).toContain('aria-expanded');
  });

  it('only shows Back/Continue when they would actually do something, not as permanently-disabled buttons', () => {
    const source = read('BrowserExperienceHud.tsx');
    expect(source).toContain('snapshot.stageIndex > 0 && (');
    expect(source).toContain('snapshot.stageComplete && (');
    expect(source).not.toContain('disabled={snapshot.stageIndex === 0}');
    expect(source).not.toContain('disabled={!snapshot.stageComplete}');
  });

  it('reserves a clear center and honors reduced motion', () => {
    const source = read('simulation-experience.css');
    expect(source).toContain('--experience-clear-width: 60%');
    expect(source).toContain('--experience-clear-height: 64%');
    expect(source).toContain('prefers-reduced-motion');
  });
});
