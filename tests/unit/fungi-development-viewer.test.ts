import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  coordinateFungiAction,
  createInitialFungiViewerState,
  projectFungiSandbox,
  stageEvidenceFor,
} from '../../apps/web/components/simulations/FungiDevelopmentViewer';

const viewerPath = resolve(
  process.cwd(),
  'apps/web/components/simulations/FungiDevelopmentViewer.tsx',
);

describe('Living Mycelium viewer coordinator', () => {
  it('retains the first growth prediction while allowing a corrected retry', () => {
    const initial = createInitialFungiViewerState();
    const wrong = coordinateFungiAction(initial, {
      actionId: 'answer:growth-condition-prediction:dry-cold',
      source: 'keyboard',
    });
    const corrected = coordinateFungiAction(wrong.state, {
      actionId: 'answer:growth-condition-prediction:warm-moist',
      source: 'touch',
    });

    expect(corrected.state.model).toMatchObject({
      firstGrowthPrediction: 'dry-cold',
      latestGrowthPrediction: 'warm-moist',
    });
    expect(corrected.state.firstAnswers['growth-condition-prediction']).toBe('dry-cold');
    expect(corrected.assessment).toEqual({
      promptId: 'growth-condition-prediction',
      optionId: 'warm-moist',
    });
  });

  it('records the selected fungi pair as the initial precheck before evidence', () => {
    let state = createInitialFungiViewerState();
    const first = coordinateFungiAction(state, { actionId: 'select:mushroom', source: 'xr-controller' });
    state = first.state;
    expect(first.assessment).toBeUndefined();
    expect(stageEvidenceFor('fungal-forensics', state)).toBeUndefined();

    const pair = coordinateFungiAction(state, { actionId: 'select:bread-mould', source: 'xr-controller' });
    expect(pair.assessment).toEqual({ promptId: 'fungi-precheck', optionId: 'mushroom-and-bread-mould' });
    expect(pair.state.firstAnswers['fungi-precheck']).toBe('mushroom-and-bread-mould');
    expect(stageEvidenceFor('fungal-forensics', pair.state)).toBe('fungi-pair-classified');
  });

  it('credits only three unique authored hypha targets', () => {
    let state = createInitialFungiViewerState();
    for (const target of [
      'hypha-tip-alpha',
      'hypha-tip-alpha',
      'hypha-tip-beta',
      'hypha-tip-gamma',
    ]) {
      state = coordinateFungiAction(state, {
        actionId: `inspect:${target}`,
        source: 'xr-controller',
      }).state;
    }

    expect(state.model.touchedHyphae).toEqual([
      'hypha-tip-alpha',
      'hypha-tip-beta',
      'hypha-tip-gamma',
    ]);
    expect(stageEvidenceFor('under-the-cap', state)).toBeUndefined();

    state = coordinateFungiAction(state, {
      actionId: 'answer:mycelium-observation:mycelium',
      source: 'keyboard',
    }).state;
    expect(stageEvidenceFor('under-the-cap', state)).toBe('mycelium-identified');
  });

  it('requires all unique days and the authored life-cycle order', () => {
    let state = createInitialFungiViewerState();
    for (const day of [1, 1, 2, 3, 4, 5]) {
      state = coordinateFungiAction(state, {
        actionId: `visit-day:${day}`,
        source: 'mouse',
      }).state;
    }
    expect(state.model.visitedDays).toEqual([1, 2, 3, 4, 5]);
    expect(stageEvidenceFor('five-day-time-lens', state)).toBeUndefined();

    const wrongOrder = coordinateFungiAction(state, {
      actionId: 'sequence:hypha-grows',
      source: 'keyboard',
    });
    expect(wrongOrder.state).toBe(state);
    expect(wrongOrder.feedback).toMatch(/spore lands first/i);

    for (const label of [
      'spore-lands',
      'hypha-grows',
      'mycelium-forms',
      'spore-structure-forms',
      'spores-release',
    ] as const) {
      state = coordinateFungiAction(state, {
        actionId: `sequence:${label}`,
        source: 'keyboard',
      }).state;
    }
    expect(stageEvidenceFor('five-day-time-lens', state)).toBe('five-day-sequence-observed');
  });

  it('lets ordered VR day targets build the same five-label sequence', () => {
    let state = createInitialFungiViewerState();
    for (const day of [1, 2, 3, 4, 5]) {
      state = coordinateFungiAction(state, {
        actionId: `visit-day:${day}`,
        source: 'xr-controller',
      }).state;
    }
    expect(state.model.lifeCycleLabels).toEqual([
      'spore-lands', 'hypha-grows', 'mycelium-forms', 'spore-structure-forms', 'spores-release',
    ]);
    expect(stageEvidenceFor('five-day-time-lens', state)).toBe('five-day-sequence-observed');
  });

  it('does not complete a stage from an unknown or generic next action', () => {
    const initial = createInitialFungiViewerState();
    for (const actionId of ['next', 'continue', 'unknown-action']) {
      const result = coordinateFungiAction(initial, {
        actionId,
        source: 'xr-controller',
      });
      expect(result.state).toBe(initial);
      expect(result.feedback).toMatch(/not available|choose a visible/i);
    }
    expect(stageEvidenceFor('fungal-forensics', initial)).toBeUndefined();
  });

  it('uses immediate evidence in reduced motion and one frame otherwise', () => {
    const reduced = createInitialFungiViewerState({ reducedMotion: true });
    const regular = createInitialFungiViewerState({ reducedMotion: false });
    expect(reduced.evidenceDelayMs).toBe(0);
    expect(regular.evidenceDelayMs).toBeGreaterThan(0);
  });

  it('projects bounded sandbox inputs through the shared fungal growth model', () => {
    expect(projectFungiSandbox({ day: 5, temperatureC: 16, moisturePercent: 55 })).toMatchObject({
      input: { day: 5, temperatureC: 16, moisturePercent: 55 },
      result: { stage: 'hyphae-visible', condition: 'slow' },
      coverage: 0.18,
      interpretation: expect.stringMatching(/slower/i),
    });
    expect(() => projectFungiSandbox({ day: 6, temperatureC: 16, moisturePercent: 55 })).toThrow(/1.*5/i);
    expect(() => projectFungiSandbox({ day: 1, temperatureC: 46, moisturePercent: 55 })).toThrow(/temperature/i);
    expect(() => projectFungiSandbox({ day: 1, temperatureC: 16, moisturePercent: 101 })).toThrow(/moisture/i);
  });

  it('gates spore evidence on guidance, landing, and the corrected condition', () => {
    let state = createInitialFungiViewerState();
    state = coordinateFungiAction(state, { actionId: 'guide:spore-guide', source: 'mouse' }).state;
    state = coordinateFungiAction(state, { actionId: 'land:spore-landing', source: 'touch' }).state;
    state = coordinateFungiAction(state, { actionId: 'answer:growth-condition-prediction:dry-cold', source: 'keyboard' }).state;
    expect(stageEvidenceFor('spore-flight', state)).toBeUndefined();
    state = coordinateFungiAction(state, { actionId: 'answer:growth-condition-prediction:warm-moist', source: 'keyboard' }).state;
    expect(stageEvidenceFor('spore-flight', state)).toBe('spore-condition-observed');
  });

  it('gates useful fungi and food safety on every observable action', () => {
    let state = createInitialFungiViewerState();
    for (const actionId of ['trigger:dough-rise', 'role:bakery', 'role:medicine', 'role:compost']) {
      state = coordinateFungiAction(state, { actionId, source: 'keyboard' }).state;
    }
    expect(stageEvidenceFor('fungi-at-work', state)).toBeUndefined();
    state = coordinateFungiAction(state, { actionId: 'answer:baking-fungus-observation:yeast', source: 'keyboard' }).state;
    expect(stageEvidenceFor('fungi-at-work', state)).toBe('useful-roles-matched');
    expect(state.usefulRoleIds).toEqual(['bakery:yeast', 'medicine:fungus', 'compost:decomposer']);
    expect(state.model.usefulRoleMatches).not.toContainEqual({ objectId: 'bread-mould', role: 'food' });

    state = coordinateFungiAction(state, { actionId: 'classify:fresh-item:safe', source: 'touch' }).state;
    state = coordinateFungiAction(state, { actionId: 'classify:mouldy-item:unsafe', source: 'touch' }).state;
    state = coordinateFungiAction(state, { actionId: 'answer:mould-safety-misconception:cutting-makes-safe', source: 'keyboard' }).state;
    expect(stageEvidenceFor('food-safety-scan', state)).toBeUndefined();
    state = coordinateFungiAction(state, { actionId: 'answer:mould-safety-misconception:reject-whole-soft-food', source: 'keyboard' }).state;
    expect(stageEvidenceFor('food-safety-scan', state)).toBe('mould-safety-resolved');
  });

  it('requires four correct final review actions before badge collection', () => {
    let state = createInitialFungiViewerState();
    const earlyBadge = coordinateFungiAction(state, {
      actionId: 'collect:fungi-explorer-badge',
      source: 'xr-controller',
    });
    expect(earlyBadge.state.badgeCollected).toBe(false);
    expect(earlyBadge.feedback).toMatch(/four review/i);

    for (const [promptId, optionId] of [
      ['development-order-observation', 'spore-hyphae-mycelium-structures-release'],
      ['baking-fungus-observation', 'yeast'],
      ['mould-safety-misconception', 'reject-whole-soft-food'],
      ['forest-transfer', 'warm-damp-surface'],
    ]) {
      state = coordinateFungiAction(state, {
        actionId: `review:${promptId}:${optionId}`,
        source: 'keyboard',
      }).state;
    }
    expect(stageEvidenceFor('forest-circle', state)).toBeUndefined();
    state = coordinateFungiAction(state, {
      actionId: 'collect:fungi-explorer-badge',
      source: 'xr-controller',
    }).state;
    expect(state.model.completed).toBe(true);
    expect(stageEvidenceFor('forest-circle', state)).toBe('forest-transfer-explained');
  });
});

describe('Living Mycelium viewer integration contract', () => {
  const source = readFileSync(viewerPath, 'utf8');

  it('uses the shared experience, rendering, narration, input, and VR owners', () => {
    for (const token of [
      'SimulationExperienceShell',
      'SimulationCanvasHost',
      'createWebSimulationRuntime',
      'createInteractionSystem',
      'createActionRouter',
      'playSimulationNarration',
      'stopSimulationNarration',
      'createVrPlayerRig',
      'createVrHudPanel',
      'createVrLocomotion',
      'createLessonSession',
      'createAssessmentSession',
      'createFungiWorld',
      'FUNGI_DEVELOPMENT',
    ]) expect(source).toContain(token);
  });

  it('routes every normalized source and canonical lesson action through one handler', () => {
    for (const sourceId of ['mouse', 'touch', 'keyboard', 'xr-controller']) {
      expect(source).toContain(`'${sourceId}'`);
    }
    for (const actionId of [
      'fungi.classify-mushroom-and-mould',
      'fungi.inspect-hypha-network',
      'fungi.guide-spore-to-surface',
      'fungi.run-five-day-timeline',
      'fungi.match-useful-roles',
      'fungi.choose-safe-mould-response',
      'fungi.explain-forest-transfer',
    ]) expect(source).toContain(actionId);
    expect(source).not.toMatch(/performAction\(['"]next['"]\)/);
  });

  it('provides semantic controls, permanent captions, safety, honest completion, and sandbox unlocks', () => {
    expect(source).toContain('<button');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('minHeight: 44');
    expect(source).toMatch(/Never taste.*never open.*mould culture/is);
    expect(source).toContain('Mission Complete: Fungi Explorer');
    expect(source).toContain('Completion records participation; mastery requires');
    expect(source).toContain('Field Guide');
    expect(source).toContain('Growth Sandbox');
    expect(source).toContain('type="range"');
    expect(source).toContain('replayStage(index)');
    expect(source).toContain('Warm, moist reference');
    expect(source).toContain('Your sandbox conditions');
  });

  it('provides explicit VR assessment commits after visible question targets', () => {
    for (const token of [
      'hypha-network-label',
      'vr-answer:mycelium-observation:mycelium',
      'vr-answer:growth-condition-prediction:warm-moist',
      'vr-answer:baking-fungus-observation:yeast',
      'vr-answer:mould-safety-misconception:reject-whole-soft-food',
    ]) expect(source).toContain(token);
    expect(source).toContain('openedVrPromptIds');
  });

  it('does not own audio, raw renderer loops, or force movement', () => {
    expect(source).not.toMatch(/new Audio\s*\(/);
    expect(source).not.toMatch(/speechSynthesis/);
    expect(source).not.toMatch(/new THREE\.WebGLRenderer/);
    expect(source).not.toMatch(/setAnimationLoop/);
    expect(source).toContain("locomotion: 'stationary'");
    expect(source).toContain("turnMode: 'none'");
    expect(source).toContain('world.dispose()');
  });
});
