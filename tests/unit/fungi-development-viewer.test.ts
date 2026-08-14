import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  coordinateFungiAction,
  createInitialFungiViewerState,
  fieldGuideCardsFor,
  FUNGI_LEARNING_CONTROLS_STYLE,
  projectFungiSandbox,
  stageEvidenceFor,
  vrChoiceActionFor,
  vrPromptForStage,
} from '../../apps/web/components/simulations/FungiDevelopmentViewer';

const viewerPath = resolve(
  process.cwd(),
  'apps/web/components/simulations/FungiDevelopmentViewer.tsx',
);

describe('Living Mycelium viewer coordinator', () => {
  it('keeps every learning control in a bounded, scrollable right-side rail', () => {
    expect(FUNGI_LEARNING_CONTROLS_STYLE).toMatchObject({
      position: 'absolute',
      right: 16,
      top: 'clamp(104px, 21vh, 150px)',
      bottom: 16,
      width: 'min(520px, calc(100% - 32px))',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box',
    });
    expect(FUNGI_LEARNING_CONTROLS_STYLE).not.toHaveProperty('left');
    expect(FUNGI_LEARNING_CONTROLS_STYLE).not.toHaveProperty('maxHeight');
  });

  it('retains the first growth prediction while allowing a corrected retry', () => {
    let initial = createInitialFungiViewerState();
    initial = coordinateFungiAction(initial, { actionId: 'guide:spore-guide', source: 'mouse' }).state;
    initial = coordinateFungiAction(initial, { actionId: 'land:spore-landing', source: 'mouse' }).state;
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

  it('records an authentic precheck wrong-to-correct before classification without selection auto-answering', () => {
    let state = createInitialFungiViewerState();
    const wrong = coordinateFungiAction(state, {
      actionId: 'answer:fungi-precheck:mushroom-and-green-plant', source: 'xr-controller',
    });
    const corrected = coordinateFungiAction(wrong.state, {
      actionId: 'answer:fungi-precheck:mushroom-and-bread-mould', source: 'xr-controller',
    });
    state = corrected.state;
    expect(state.firstAnswers['fungi-precheck']).toBe('mushroom-and-green-plant');
    expect(state.latestAnswers['fungi-precheck']).toBe('mushroom-and-bread-mould');

    const first = coordinateFungiAction(state, { actionId: 'select:mushroom', source: 'xr-controller' });
    state = first.state;
    expect(first.assessment).toBeUndefined();
    expect(stageEvidenceFor('fungal-forensics', state)).toBeUndefined();

    const pair = coordinateFungiAction(state, { actionId: 'select:bread-mould', source: 'xr-controller' });
    expect(pair.assessment).toBeUndefined();
    expect(pair.state.firstAnswers['fungi-precheck']).toBe('mushroom-and-green-plant');
    expect(stageEvidenceFor('fungal-forensics', pair.state)).toBe('fungi-pair-classified');
  });

  it('requires a fungi prediction before either specimen can be classified', () => {
    const initial = createInitialFungiViewerState();
    const premature = coordinateFungiAction(initial, {
      actionId: 'select:mushroom', source: 'mouse',
    });
    expect(premature.state).toBe(initial);
    expect(premature.feedback).toMatch(/prediction first/i);
  });

  it('rejects observation answers until their authored evidence is visible', () => {
    const cases = [
      ['mycelium-observation', 'mycelium'],
      ['growth-condition-prediction', 'warm-moist'],
      ['baking-fungus-observation', 'yeast'],
      ['mould-safety-misconception', 'reject-whole-soft-food'],
    ] as const;
    for (const [promptId, optionId] of cases) {
      const initial = createInitialFungiViewerState();
      const result = coordinateFungiAction(initial, {
        actionId: `answer:${promptId}:${optionId}`, source: 'xr-controller',
      });
      expect(result.state, promptId).toBe(initial);
      expect(result.assessment, promptId).toBeUndefined();
      expect(result.feedback, promptId).toMatch(/observe|first|before/i);
    }
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

  it('requires explicit VR lifecycle choices after observing all five days', () => {
    let state = createInitialFungiViewerState();
    for (const day of [1, 2, 3, 4, 5]) {
      state = coordinateFungiAction(state, {
        actionId: `visit-day:${day}`,
        source: 'xr-controller',
      }).state;
    }
    expect(state.model.lifeCycleLabels).toEqual([]);
    const firstPrompt = vrPromptForStage('five-day-time-lens', state)!;
    expect(firstPrompt.choices.map(choice => choice.actionId)).toContain('sequence:spore-lands');
    const wrongIndex = firstPrompt.choices.findIndex(choice => choice.actionId !== 'sequence:spore-lands');
    const wrong = coordinateFungiAction(state, {
      actionId: vrChoiceActionFor(firstPrompt, wrongIndex), source: 'xr-controller',
    });
    expect(wrong.state).toBe(state);
    const correctIndex = firstPrompt.choices.findIndex(choice => choice.actionId === 'sequence:spore-lands');
    state = coordinateFungiAction(state, {
      actionId: vrChoiceActionFor(firstPrompt, correctIndex), source: 'xr-controller',
    }).state;
    expect(state.model.lifeCycleLabels).toEqual(['spore-lands']);
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
    expect(state.model.usefulRoleMatches).toEqual([
      { objectId: 'yeast', role: 'food' },
      { objectId: 'antibiotic-producing-fungus', role: 'medicine' },
      { objectId: 'saprotrophic-fungus', role: 'decomposer' },
    ]);
    expect(state).not.toHaveProperty('usefulRoleIds');

    state = coordinateFungiAction(state, { actionId: 'classify:fresh-item:safe', source: 'touch' }).state;
    state = coordinateFungiAction(state, { actionId: 'classify:mouldy-item:unsafe', source: 'touch' }).state;
    state = coordinateFungiAction(state, { actionId: 'answer:mould-safety-misconception:cutting-makes-safe', source: 'keyboard' }).state;
    expect(stageEvidenceFor('food-safety-scan', state)).toBeUndefined();
    state = coordinateFungiAction(state, { actionId: 'answer:mould-safety-misconception:reject-whole-soft-food', source: 'keyboard' }).state;
    expect(stageEvidenceFor('food-safety-scan', state)).toBe('mould-safety-resolved');
  });

  it('requires each final mushroom to open before its review answer and retains wrong XR choices', () => {
    let state = createInitialFungiViewerState();
    const earlyBadge = coordinateFungiAction(state, {
      actionId: 'collect:fungi-explorer-badge',
      source: 'xr-controller',
    });
    expect(earlyBadge.state.badgeCollected).toBe(false);
    expect(earlyBadge.feedback).toMatch(/four review/i);

    const premature = coordinateFungiAction(state, {
      actionId: 'review:forest-transfer:warm-damp-surface', source: 'xr-controller',
    });
    expect(premature.state).toBe(state);
    expect(premature.assessment).toBeUndefined();

    for (const [promptId, optionId, wrongOptionId] of [
      ['development-order-observation', 'spore-hyphae-mycelium-structures-release'],
      ['baking-fungus-observation', 'yeast'],
      ['mould-safety-misconception', 'reject-whole-soft-food'],
      ['forest-transfer', 'warm-damp-surface'],
    ].map(([promptId, optionId]) => [
      promptId,
      optionId,
      promptId === 'development-order-observation' ? 'release-mycelium-spore'
        : promptId === 'baking-fungus-observation' ? 'green-plant'
          : promptId === 'mould-safety-misconception' ? 'cutting-makes-safe' : 'cool-dry-surface',
    ] as const)) {
      state = coordinateFungiAction(state, {
        actionId: `review-open:${promptId}`,
        source: 'xr-controller',
      }).state;
      state = coordinateFungiAction(state, {
        actionId: `review:${promptId}:${wrongOptionId}`,
        source: 'xr-controller',
      }).state;
      expect(state.latestAnswers[promptId]).toBe(wrongOptionId);
      state = coordinateFungiAction(state, {
        actionId: `review:${promptId}:${optionId}`,
        source: 'xr-controller',
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

  it('maps visible HUD choice indices to canonical option IDs and can choose a wrong answer', () => {
    let state = createInitialFungiViewerState();
    const precheck = vrPromptForStage('fungal-forensics', state);
    expect(precheck?.choices.map(choice => choice.optionId)).toEqual([
      'mushroom-and-bread-mould', 'mushroom-and-green-plant', 'bread-mould-and-green-plant',
    ]);
    const wrongAction = vrChoiceActionFor(precheck!, 1);
    expect(wrongAction).toBe('answer:fungi-precheck:mushroom-and-green-plant');
    state = coordinateFungiAction(state, { actionId: wrongAction, source: 'xr-controller' }).state;
    expect(state.latestAnswers['fungi-precheck']).toBe('mushroom-and-green-plant');
  });

  it('makes the most recently opened review mushroom the active HUD prompt without answering it', () => {
    let state = createInitialFungiViewerState();
    for (const promptId of ['development-order-observation', 'forest-transfer', 'development-order-observation']) {
      state = coordinateFungiAction(state, {
        actionId: `review-open:${promptId}`, source: 'xr-controller',
      }).state;
    }
    expect(vrPromptForStage('forest-circle', state)?.promptId).toBe('development-order-observation');
    expect(state.latestAnswers).toEqual({});
    expect(state.model.quizAnswers).toEqual([]);
  });

  it('builds per-stage Field Guide evidence cards with replay targets', () => {
    let state = createInitialFungiViewerState();
    state = coordinateFungiAction(state, {
      actionId: 'answer:fungi-precheck:mushroom-and-bread-mould', source: 'keyboard',
    }).state;
    state = coordinateFungiAction(state, { actionId: 'select:mushroom', source: 'mouse' }).state;
    state = coordinateFungiAction(state, { actionId: 'select:bread-mould', source: 'mouse' }).state;
    const cards = fieldGuideCardsFor(state);
    expect(cards).toHaveLength(7);
    expect(cards[0]).toMatchObject({
      stageIndex: 0,
      title: 'Fungal Forensics',
      evidenceId: 'fungi-pair-classified',
      collected: true,
      learningPoint: expect.stringMatching(/fungi|plant/i),
    });
    expect(cards[1]).toMatchObject({ stageIndex: 1, collected: false });
  });

  it('completes a headset-style world-action and HUD-choice path before resetting cleanly', () => {
    let state = createInitialFungiViewerState({ reducedMotion: true });
    const act = (actionId: string) => {
      state = coordinateFungiAction(state, { actionId, source: 'xr-controller' }).state;
    };
    const chooseAccepted = (stageId: Parameters<typeof vrPromptForStage>[0]) => {
      const prompt = vrPromptForStage(stageId, state)!;
      const acceptedIndex = prompt.choices.findIndex(choice => [
        'mushroom-and-bread-mould', 'mycelium', 'warm-moist', 'yeast',
        'reject-whole-soft-food', 'spore-hyphae-mycelium-structures-release', 'warm-damp-surface',
      ].includes(choice.optionId));
      act(vrChoiceActionFor(prompt, acceptedIndex));
    };

    chooseAccepted('fungal-forensics');
    act('select:mushroom'); act('select:bread-mould');
    act('inspect:hypha-tip-alpha'); act('inspect:hypha-tip-beta'); act('inspect:hypha-tip-gamma');
    chooseAccepted('under-the-cap');
    act('guide:spore-guide'); act('land:spore-landing'); chooseAccepted('spore-flight');
    for (const day of [1, 2, 3, 4, 5]) act(`visit-day:${day}`);
    for (const expected of [
      'spore-lands', 'hypha-grows', 'mycelium-forms', 'spore-structure-forms', 'spores-release',
    ]) {
      const prompt = vrPromptForStage('five-day-time-lens', state)!;
      const choiceIndex = prompt.choices.findIndex(choice => choice.actionId === `sequence:${expected}`);
      act(vrChoiceActionFor(prompt, choiceIndex));
    }
    act('trigger:dough-rise'); act('role:bakery'); act('role:medicine'); act('role:compost');
    chooseAccepted('fungi-at-work');
    act('classify:fresh-item:safe'); act('classify:mouldy-item:unsafe'); chooseAccepted('food-safety-scan');
    for (const promptId of [
      'development-order-observation', 'baking-fungus-observation',
      'mould-safety-misconception', 'forest-transfer',
    ]) {
      act(`review-open:${promptId}`);
      chooseAccepted('forest-circle');
    }
    act('collect:fungi-explorer-badge');
    expect(state).toMatchObject({ badgeCollected: true, model: { completed: true } });

    const reset = createInitialFungiViewerState({ reducedMotion: true });
    expect(reset).toMatchObject({
      firstAnswers: {}, latestAnswers: {}, resolvedPromptIds: [],
      finalReviewPromptIds: [], openedVrPromptIds: [], badgeCollected: false,
      evidenceDelayMs: 0, model: { completed: false, usefulRoleMatches: [] },
    });
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
    expect(source).toContain('replayStage(card.stageIndex)');
    expect(source).toContain('Warm, moist reference');
    expect(source).toContain('Your sandbox conditions');
  });

  it('provides authored VR choices that dispatch the same normalized assessment routes as DOM', () => {
    for (const token of [
      'vrPromptForStage',
      'vrChoiceActionFor',
      "hudButton === 'choice-a'",
      "hudButton === 'choice-b'",
      "hudButton === 'choice-c'",
    ]) expect(source).toContain(token);
    expect(source).toContain('openedVrPromptIds');
    expect(source).not.toContain('ACCEPTED_OPTIONS');
    expect(source).not.toContain('vr-answer:');
    expect(source).not.toContain('usefulRoleIds');
  });

  it('keeps replay narration, help, restart, previous/back, and exit as distinct VR controls', () => {
    expect(source).toContain('const nextRef = useRef');
    expect(source).toContain('nextRef.current = next');
    expect(source).toContain("hudButton === 'next') nextRef.current()");
    expect(source).toContain('restartRef.current = restart');
    expect(source).toMatch(/replayRef\.current\s*=\s*\(\)\s*=>\s*narrate/);
    expect(source).toContain("hudButton === 'help'");
    expect(source).toContain("hudButton === 'restart'");
    expect(source).toContain("hudButton === 'previous'");
    expect(source).toContain("hudButton === 'exit'");
    expect(source).toContain('const publishFeedback = useCallback');
    expect(source).toContain('feedbackRef.current = message');
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
