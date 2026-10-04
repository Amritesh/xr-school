import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/MoneyTownViewer.tsx');
const routePath = resolve(process.cwd(), 'apps/web/app/simulations/c1-math-ch01-introduction-to-money/page.tsx');
const scenePath = resolve(process.cwd(), 'apps/web/lib/moneyTownScene.ts');

describe('Class 1 Money Town viewer', () => {
  it('exposes its canonical route through the shared viewer registry', () => {
    expect(existsSync(routePath)).toBe(true);
    const source = readFileSync(routePath, 'utf8');
    expect(source).toContain('SimulationRoutePage');
    expect(source).toContain('slug="c1-math-ch01-introduction-to-money"');
  });

  it('keeps Quest controls, narration, accessibility, and no-student affordances', () => {
    const source = `${readFileSync(viewerPath, 'utf8')}\n${readFileSync(scenePath, 'utf8')}`;

    for (const identifier of [
      "renderer.xr.setReferenceSpaceType('local-floor')",
      'renderer.xr.getController(0)',
      'renderer.xr.getController(1)',
      'optionalFeatures',
      'hand-tracking',
      'createMoneyTownAudio',
      'MONEY_NARRATION',
      'role="status"',
      'Replay voice',
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
    const source = `${readFileSync(viewerPath, 'utf8')}\n${readFileSync(scenePath, 'utf8')}`;

    for (const identifier of [
      'Introduction to Money',
      'large-digital-smartboard-money-values-quizzes-rewards',
      'giant-smiling-piggy-bank',
      'coin-fountain-floating-golden-coins',
      'money-model-',
      'createMoneyModel',
      'buildMoneyActivityScene',
      'RBI reference pictures',
      'money-town-vr-controller-navigation',
    ]) {
      expect(source).toContain(identifier);
    }
  });
});
