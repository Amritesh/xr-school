import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const component = readFileSync(
  resolve(process.cwd(), 'apps/web/components/simulation-experience/ExperienceFocusGuide.tsx'),
  'utf8',
);
const css = readFileSync(
  resolve(process.cwd(), 'apps/web/components/simulation-experience/simulation-experience.css'),
  'utf8',
);
const shell = readFileSync(
  resolve(process.cwd(), 'apps/web/components/simulation-experience/SimulationExperienceShell.tsx'),
  'utf8',
);

describe('shared focus guidance', () => {
  it('renders HTML edge arrows rather than in-scene text when focus is off target', () => {
    expect(component).toContain('simulation-experience__focus-guide');
    expect(component).toContain("data-direction={direction}");
    expect(component).toContain('aria-label="Look guidance"');
    expect(css).toContain('.simulation-experience__focus-guide[data-direction');
  });

  it('is wired through the shared simulation shell for all guided worlds', () => {
    expect(shell).toContain('ExperienceFocusGuide');
    expect(shell).toContain('focusGuide');
  });
});
