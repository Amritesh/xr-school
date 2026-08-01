import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('simulation authoring standard', () => {
  const path = resolve(
    process.cwd(),
    'docs/simulation-design/simulation-authoring-standard.md',
  );

  it('defines the complete contribution and release contract', () => {
    const text = readFileSync(path, 'utf8');
    for (const heading of [
      '## Canonical module template',
      '## Definition, domain, and scene boundaries',
      '## Predict-test-observe-explain and misconceptions',
      '## Evidence, assessment, and mastery',
      '## Browser, touch, keyboard, and Quest equivalence',
      '## Narration, captions, and audio ownership',
      '## Asset provenance and fallbacks',
      '## Comfort and Quest performance budgets',
      '## Accessibility and reduced motion',
      '## Error handling and resource disposal',
      '## Required automated tests',
      '## Review and release checklist',
    ]) {
      expect(text).toContain(heading);
    }
    expect(text).toContain("publicationStatus: 'released'");
    expect(text).toContain("evidenceMaturity: 'internalQA'");
    expect(text).toContain('Unknown or disallowed actions never advance the lesson.');
    expect(text).toContain('Completion is not mastery.');
    expect(text).toContain('npm run narration:validate');
    expect(text).not.toMatch(/school[- ]validated by default/i);
  });
});
