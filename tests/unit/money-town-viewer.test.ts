import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/MoneyTownViewer.tsx');
const routePath = resolve(process.cwd(), 'apps/web/app/simulations/c1-math-ch01-introduction-to-money/page.tsx');

describe('Class 1 Money Town viewer', () => {
  it('exposes a dedicated simulation route', () => {
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, 'utf8')).toContain('MoneyTownViewer');
  });

  it('keeps Quest controls, narration, accessibility, and no-student affordances', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      "renderer.xr.setReferenceSpaceType('local-floor')",
      'renderer.xr.getController(0)',
      'renderer.xr.getController(1)',
      'optionalFeatures',
      'hand-tracking',
      'playSimulationNarration',
      'stopSimulationNarration',
      'aria-live="polite"',
      'Voice on',
      'Comfort',
      'Restart',
      'class-1-magic-money-town-no-students',
      'friendly-animated-teacher-guide-smiles-waves-no-students',
    ]) {
      expect(source).toContain(identifier);
    }
    expect(source).not.toContain('student-desk');
    expect(source).not.toContain('animated-student');
  });

  it('builds the requested Money Town scenes and interactions', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'Introduction to Money',
      'large-digital-smartboard-money-values-quizzes-rewards',
      'giant-smiling-piggy-bank',
      'coin-fountain-floating-golden-coins',
      'large-3d-indian-${definition.id}',
      'coin-side-round-metal-small',
      'note-side-paper-rectangular-foldable',
      'identification-correct-stars-wrong-gentle-pop',
      'cash-box-receipt-shopkeeper-smiles-fireworks',
      'mini-bank-counter-memory-check-board',
      'golden-coin-rain-confetti-rainbow-teacher-goodbye',
      'money-town-vr-controller-navigation',
    ]) {
      expect(source).toContain(identifier);
    }
  });
});
