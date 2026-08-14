'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { NormalizedInputSource } from '@xr-school/simulation-schema';
import {
  createActionRouter,
  createAssessmentSession,
  createLessonSession,
  evaluateFungalGrowth,
  initialFungiDevelopmentState,
  reduceFungiDevelopment,
  type FungalGrowthInput,
  type FungalLifeCycleLabel,
  type FungiDevelopmentAction,
  type FungiDevelopmentState,
  type LessonSnapshot,
} from '@xr-school/simulation-runtime';
import {
  FUNGI_DEVELOPMENT,
  FUNGI_DEVELOPMENT_NARRATION,
} from '@xr-school/simulation-content';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import SimulationCanvasHost from '@/components/simulation-experience/SimulationCanvasHost';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import { createFungiWorld, type FungiStageId, type FungiWorld } from '@/lib/world-builder/fungiWorld';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';
import { createVrHudPanel, type VrHudContent } from '@/lib/vr/vrHudPanel';
import { createVrLocomotion } from '@/lib/vr/vrLocomotion';
import { createVrPlayerRig } from '@/lib/vr/vrPlayerRig';

const EXPERIENCE = FUNGI_DEVELOPMENT.experience;
const ASSESSMENT = FUNGI_DEVELOPMENT.assessment;
const NORMALIZED_SOURCES: readonly NormalizedInputSource[] = [
  'mouse', 'touch', 'keyboard', 'xr-controller',
];
const STAGE_ACTIONS: Readonly<Record<FungiStageId, string>> = {
  'fungal-forensics': 'fungi.classify-mushroom-and-mould',
  'under-the-cap': 'fungi.inspect-hypha-network',
  'spore-flight': 'fungi.guide-spore-to-surface',
  'five-day-time-lens': 'fungi.run-five-day-timeline',
  'fungi-at-work': 'fungi.match-useful-roles',
  'food-safety-scan': 'fungi.choose-safe-mould-response',
  'forest-circle': 'fungi.explain-forest-transfer',
};
const STAGE_EVIDENCE = Object.fromEntries(EXPERIENCE.stages.map(stage => [stage.id, stage.completionEvidenceIds[0]]));

const ACCEPTED_OPTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  ASSESSMENT.prompts.map(prompt => [prompt.id, prompt.acceptedEvidenceIds[0]]),
);

const FINAL_REVIEW_PROMPTS = [
  'development-order-observation',
  'baking-fungus-observation',
  'mould-safety-misconception',
  'forest-transfer',
] as const;

const LIFE_CYCLE_LABELS: readonly FungalLifeCycleLabel[] = [
  'spore-lands',
  'hypha-grows',
  'mycelium-forms',
  'spore-structure-forms',
  'spores-release',
];

const LIFE_CYCLE_TEXT: Record<FungalLifeCycleLabel, string> = {
  'spore-lands': 'Spore lands',
  'hypha-grows': 'Hypha grows',
  'mycelium-forms': 'Mycelium spreads',
  'spore-structure-forms': 'Spore structures form',
  'spores-release': 'Spores release',
};

const WORLD_ACTION_BY_TARGET: Readonly<Record<string, string>> = {
  mushroom: 'select:mushroom',
  'bread-mould': 'select:bread-mould',
  'green-plant': 'select:green-plant',
  'hypha-tip-alpha': 'inspect:hypha-tip-alpha',
  'hypha-tip-beta': 'inspect:hypha-tip-beta',
  'hypha-tip-gamma': 'inspect:hypha-tip-gamma',
  'spore-guide': 'guide:spore-guide',
  'spore-landing': 'land:spore-landing',
  'day-1': 'visit-day:1',
  'day-2': 'visit-day:2',
  'day-3': 'visit-day:3',
  'day-4': 'visit-day:4',
  'day-5': 'visit-day:5',
  dough: 'trigger:dough-rise',
  'role-bakery': 'role:bakery',
  'role-medicine': 'role:medicine',
  'role-compost': 'role:compost',
  'fresh-item': 'classify:fresh-item:safe',
  'mouldy-item': 'classify:mouldy-item:unsafe',
  'hypha-network-label': 'vr-answer:mycelium-observation:mycelium',
  yeast: 'vr-answer:baking-fungus-observation:yeast',
  'safety-warning': 'vr-answer:mould-safety-misconception:reject-whole-soft-food',
  'quiz-mushroom-1': 'review-open:development-order-observation',
  'quiz-mushroom-2': 'review-open:baking-fungus-observation',
  'quiz-mushroom-3': 'review-open:mould-safety-misconception',
  'quiz-mushroom-4': 'review-open:forest-transfer',
  'completion-badge': 'collect:fungi-explorer-badge',
};

const ALL_ACTION_IDS = [
  ...Object.values(WORLD_ACTION_BY_TARGET),
  ...ASSESSMENT.prompts.flatMap(prompt => (prompt.options ?? []).map(option => `answer:${prompt.id}:${option.id}`)),
  ...LIFE_CYCLE_LABELS.map(label => `sequence:${label}`),
];

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

export interface FungiViewerState {
  model: FungiDevelopmentState;
  firstAnswers: Record<string, string>;
  latestAnswers: Record<string, string>;
  resolvedPromptIds: string[];
  finalReviewPromptIds: string[];
  openedVrPromptIds: string[];
  foodClassifications: string[];
  usefulRoleIds: string[];
  doughRisen: boolean;
  badgeCollected: boolean;
  evidenceDelayMs: number;
}

export interface FungiViewerAction {
  actionId: string;
  source: NormalizedInputSource;
}

export interface FungiCoordinatorResult {
  state: FungiViewerState;
  feedback: string;
  assessment?: { promptId: string; optionId: string };
}

function unique<T>(items: readonly T[], value: T): T[] {
  return items.includes(value) ? [...items] : [...items, value];
}

function updateModel(state: FungiViewerState, action: FungiDevelopmentAction): FungiViewerState {
  return { ...state, model: reduceFungiDevelopment(state.model, action) };
}

export function createInitialFungiViewerState(
  options: { reducedMotion?: boolean } = {},
): FungiViewerState {
  return {
    model: initialFungiDevelopmentState,
    firstAnswers: {},
    latestAnswers: {},
    resolvedPromptIds: [],
    finalReviewPromptIds: [],
    openedVrPromptIds: [],
    foodClassifications: [],
    usefulRoleIds: [],
    doughRisen: false,
    badgeCollected: false,
    evidenceDelayMs: options.reducedMotion ? 0 : 34,
  };
}

function feedbackForAssessment(promptId: string, correct: boolean) {
  const prompt = ASSESSMENT.prompts.find(candidate => candidate.id === promptId);
  if (!prompt) return 'That question is not available here.';
  return correct ? prompt.explanation : prompt.hint;
}

/** Pure learning coordinator shared by DOM, pointer, touch, keyboard, and XR routes. */
export function coordinateFungiAction(
  state: FungiViewerState,
  action: FungiViewerAction,
): FungiCoordinatorResult {
  const { actionId } = action;
  if (!NORMALIZED_SOURCES.includes(action.source)) {
    return { state, feedback: 'That input source is not available. Choose a visible labelled control and try again.' };
  }
  try {
    if (actionId.startsWith('select:')) {
      const objectId = actionId.slice('select:'.length);
      if (objectId === 'green-plant') {
        return {
          state,
          feedback: 'A green plant contains chlorophyll and makes food by photosynthesis. Fungi absorb food instead—try another specimen.',
        };
      }
      if (objectId !== 'mushroom' && objectId !== 'bread-mould') throw new Error('unknown specimen');
      let next = updateModel(state, { type: 'select-fungus', objectId });
      const pairComplete = next.model.selectedFungi.includes('mushroom') && next.model.selectedFungi.includes('bread-mould');
      if (pairComplete) {
        next = {
          ...next,
          firstAnswers: Object.hasOwn(next.firstAnswers, 'fungi-precheck')
            ? next.firstAnswers
            : { ...next.firstAnswers, 'fungi-precheck': 'mushroom-and-bread-mould' },
          latestAnswers: { ...next.latestAnswers, 'fungi-precheck': 'mushroom-and-bread-mould' },
          resolvedPromptIds: unique(next.resolvedPromptIds, 'fungi-precheck'),
        };
      }
      return {
        state: next,
        feedback: `${objectId === 'mushroom' ? 'Mushroom' : 'Bread mould'} recorded as a fungus.`,
        assessment: pairComplete
          ? { promptId: 'fungi-precheck', optionId: 'mushroom-and-bread-mould' }
          : undefined,
      };
    }
    if (actionId.startsWith('inspect:')) {
      const hyphaId = actionId.slice('inspect:'.length);
      if (!['hypha-tip-alpha', 'hypha-tip-beta', 'hypha-tip-gamma'].includes(hyphaId)) throw new Error('unknown hypha');
      const duplicate = state.model.touchedHyphae.includes(hyphaId);
      return {
        state: updateModel(state, { type: 'touch-hypha', hyphaId }),
        feedback: duplicate ? 'That hypha was already observed; find another highlighted branch.' : 'Unique hypha observed. Many connected hyphae form mycelium.',
      };
    }
    if (actionId === 'guide:spore-guide') {
      return { state: updateModel(state, { type: 'guide-spore', guidanceId: 'air-current-1' }), feedback: 'The spore follows the air current toward the surface.' };
    }
    if (actionId === 'land:spore-landing') {
      return { state: updateModel(state, { type: 'land-spore', landingId: 'moist-bread' }), feedback: 'The guided spore has landed. Compare the growth conditions.' };
    }
    if (actionId.startsWith('visit-day:')) {
      const day = Number(actionId.slice('visit-day:'.length));
      const duplicate = state.model.visitedDays.includes(day);
      let next = updateModel(state, { type: 'visit-day', day });
      if (action.source === 'xr-controller' && day === next.model.lifeCycleLabels.length + 1) {
        next = updateModel(next, { type: 'record-life-cycle', label: LIFE_CYCLE_LABELS[day - 1] });
      }
      return {
        state: next,
        feedback: duplicate ? `Day ${day} is already in your observation record.` : `Day ${day} observed: ${evaluateFungalGrowth({ day, temperatureC: 27, moisturePercent: 82 }).stage}${action.source === 'xr-controller' ? '; its ordered label was recorded.' : '.'}`,
      };
    }
    if (actionId.startsWith('sequence:')) {
      const label = actionId.slice('sequence:'.length) as FungalLifeCycleLabel;
      const expected = LIFE_CYCLE_LABELS[state.model.lifeCycleLabels.length];
      if (label !== expected) {
        return { state, feedback: `${expected ? LIFE_CYCLE_TEXT[expected] : 'The sequence is complete'} comes next${state.model.lifeCycleLabels.length === 0 ? '; the spore lands first' : ''}.` };
      }
      return {
        state: updateModel(state, { type: 'record-life-cycle', label }),
        feedback: `${LIFE_CYCLE_TEXT[label]} placed in position ${state.model.lifeCycleLabels.length + 1}.`,
      };
    }
    if (actionId === 'trigger:dough-rise') {
      return { state: { ...state, doughRisen: true }, feedback: 'Yeast activity produced gas bubbles; the risen dough is visibly larger.' };
    }
    if (actionId.startsWith('role:')) {
      const roleId = actionId.slice('role:'.length);
      const roleEvidence = roleId === 'bakery'
        ? 'bakery:yeast'
        : roleId === 'medicine'
          ? 'medicine:fungus'
          : roleId === 'compost' ? 'compost:decomposer' : undefined;
      if (!roleEvidence) throw new Error('unknown role');
      return {
        state: { ...state, usefulRoleIds: unique(state.usefulRoleIds, roleEvidence) },
        feedback: roleId === 'bakery' ? 'Yeast matched to bakery: its gas bubbles help dough rise.' : `${roleId} role matched from the visible evidence.`,
      };
    }
    if (actionId.startsWith('classify:')) {
      const classification = actionId.slice('classify:'.length);
      if (!['fresh-item:safe', 'mouldy-item:unsafe'].includes(classification)) {
        return { state, feedback: 'Recheck the safe and unsafe symbols before classifying.' };
      }
      return {
        state: { ...state, foodClassifications: unique(state.foodClassifications, classification) },
        feedback: classification.startsWith('fresh') ? 'Fresh item classified: check it before use.' : 'Mouldy soft food classified unsafe: do not touch or eat it.',
      };
    }
    if (actionId.startsWith('review-open:')) {
      const promptId = actionId.slice('review-open:'.length);
      const prompt = ASSESSMENT.prompts.find(candidate => candidate.id === promptId);
      if (action.source === 'xr-controller' && state.openedVrPromptIds.includes(promptId)) {
        return coordinateFungiAction(state, { actionId: `review:${promptId}:${ACCEPTED_OPTIONS[promptId]}`, source: action.source });
      }
      return {
        state: { ...state, openedVrPromptIds: unique(state.openedVrPromptIds, promptId) },
        feedback: `${prompt?.question ?? 'That review mushroom is not available.'} Select the mushroom again to commit the evidence-based choice.`,
      };
    }
    if (actionId.startsWith('vr-answer:')) {
      const [, promptId, ...optionParts] = actionId.split(':');
      const optionId = optionParts.join(':');
      const prompt = ASSESSMENT.prompts.find(candidate => candidate.id === promptId);
      if (!prompt) throw new Error('unknown VR assessment');
      if (!state.openedVrPromptIds.includes(promptId)) {
        return {
          state: { ...state, openedVrPromptIds: unique(state.openedVrPromptIds, promptId) },
          feedback: `${prompt.question} Select the labelled evidence target again to commit your answer.`,
        };
      }
      return coordinateFungiAction(state, { actionId: `answer:${promptId}:${optionId}`, source: action.source });
    }
    if (actionId.startsWith('answer:') || actionId.startsWith('review:')) {
      const isFinalReview = actionId.startsWith('review:');
      const [, promptId, ...optionParts] = actionId.split(':');
      const optionId = optionParts.join(':');
      if (!Object.hasOwn(ACCEPTED_OPTIONS, promptId)) throw new Error('unknown question');
      const prompt = ASSESSMENT.prompts.find(candidate => candidate.id === promptId)!;
      if (!(prompt.options ?? []).some(option => option.id === optionId)) throw new Error('unknown option');
      const correct = ACCEPTED_OPTIONS[promptId] === optionId;
      let next: FungiViewerState = {
        ...state,
        firstAnswers: Object.hasOwn(state.firstAnswers, promptId)
          ? state.firstAnswers
          : { ...state.firstAnswers, [promptId]: optionId },
        latestAnswers: { ...state.latestAnswers, [promptId]: optionId },
        resolvedPromptIds: correct ? unique(state.resolvedPromptIds, promptId) : state.resolvedPromptIds,
        finalReviewPromptIds: isFinalReview && correct
          ? unique(state.finalReviewPromptIds, promptId)
          : state.finalReviewPromptIds,
      };
      if (promptId === 'growth-condition-prediction') {
        next = updateModel(next, { type: 'choose-growth-condition', condition: optionId as 'warm-moist' | 'dry-cold' | 'hot-dry' });
      }
      if (promptId === 'mould-safety-misconception') {
        next = updateModel(next, {
          type: 'decide-safety',
          outcome: correct ? 'observe-without-touching-or-eating' : 'touch-or-eat-unknown-fungus',
        });
      }
      if ((FINAL_REVIEW_PROMPTS as readonly string[]).includes(promptId)) {
        next = updateModel(next, {
          type: 'answer-quiz',
          questionId: promptId,
          answer: optionId,
          correct,
          independentTransfer: promptId === 'forest-transfer' && correct && !Object.hasOwn(state.firstAnswers, promptId),
        });
      }
      return {
        state: next,
        feedback: feedbackForAssessment(promptId, correct),
        assessment: { promptId, optionId },
      };
    }
    if (actionId === 'collect:fungi-explorer-badge') {
      const correctReviewCount = FINAL_REVIEW_PROMPTS.filter(promptId => state.finalReviewPromptIds.includes(promptId)).length;
      if (correctReviewCount < FINAL_REVIEW_PROMPTS.length) {
        return { state, feedback: 'Complete all four review mushrooms before collecting the badge.' };
      }
      return { state: { ...updateModel(state, { type: 'complete' }), badgeCollected: true }, feedback: 'Badge collected: Fungi Explorer.' };
    }
  } catch {
    return { state, feedback: 'That action is not available. Choose a visible labelled control and try again.' };
  }
  return { state, feedback: 'That action is not available. Choose a visible labelled control and try again.' };
}

export function stageEvidenceFor(stageId: FungiStageId, state: FungiViewerState): string | undefined {
  const resolved = (promptId: string) => state.resolvedPromptIds.includes(promptId);
  const ready = {
    'fungal-forensics': state.model.selectedFungi.includes('mushroom') && state.model.selectedFungi.includes('bread-mould') && resolved('fungi-precheck'),
    'under-the-cap': state.model.touchedHyphae.length === 3 && resolved('mycelium-observation'),
    'spore-flight': state.model.sporeGuidance.length > 0 && state.model.sporeLandings.length > 0 && resolved('growth-condition-prediction'),
    'five-day-time-lens': state.model.visitedDays.length === 5 && state.model.lifeCycleLabels.length === 5,
    'fungi-at-work': state.doughRisen && state.usefulRoleIds.length === 3 && resolved('baking-fungus-observation'),
    'food-safety-scan': state.foodClassifications.length === 2 && resolved('mould-safety-misconception'),
    'forest-circle': state.badgeCollected && FINAL_REVIEW_PROMPTS.every(promptId => state.finalReviewPromptIds.includes(promptId)),
  } satisfies Record<FungiStageId, boolean>;
  return ready[stageId] ? STAGE_EVIDENCE[stageId] : undefined;
}

export function projectFungiSandbox(input: FungalGrowthInput) {
  const result = evaluateFungalGrowth(input);
  const coverageByStage = {
    'landed-spore': 0.04,
    'hyphae-visible': 0.18,
    'mycelium-spreading': 0.46,
    'spore-structures': 0.7,
    'spores-released': 0.92,
  } as const;
  const interpretation = result.condition === 'favourable'
    ? 'Warm, moist conditions support the full modelled development for this day.'
    : result.condition === 'slow'
      ? 'Growth is slower, so the visible stage lags behind the warm, moist comparison.'
      : 'These conditions suppress modelled development; the spore remains at the landed stage.';
  return { input: { ...input }, result, coverage: coverageByStage[result.stage], interpretation };
}

const controlStyle = {
  minHeight: 44,
  minWidth: 44,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.38)',
  background: 'rgba(20,45,35,.94)',
  color: '#fff',
  padding: '10px 14px',
  cursor: 'pointer',
} as const;

export default function FungiDevelopmentViewer() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<FungiWorld | null>(null);
  const lessonRef = useRef(createLessonSession(EXPERIENCE));
  const assessmentRef = useRef(createAssessmentSession(ASSESSMENT));
  const evidenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEvidenceRef = useRef<string | null>(null);
  const stateRef = useRef(createInitialFungiViewerState());
  const snapshotRef = useRef<LessonSnapshot>(lessonRef.current.snapshot());
  const handlerRef = useRef<(actionId: string, source: NormalizedInputSource) => void>(() => {});
  const previousRef = useRef<() => void>(() => {});
  const replayRef = useRef<() => void>(() => {});

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [viewerState, setViewerState] = useState(stateRef.current);
  const [snapshot, setSnapshot] = useState(snapshotRef.current);
  const [feedback, setFeedback] = useState('Choose a labelled specimen to begin.');
  const feedbackRef = useRef('Choose a labelled specimen to begin.');
  const [runtimeError, setRuntimeError] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const evidenceRef = useRef<string[]>([]);
  const [fieldGuideOpen, setFieldGuideOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxInput, setSandboxInput] = useState<FungalGrowthInput>({ day: 5, temperatureC: 27, moisturePercent: 82 });

  const stage = EXPERIENCE.stages[snapshot.stageIndex];
  const caption = FUNGI_DEVELOPMENT_NARRATION.cues[snapshot.stageIndex]?.caption ?? stage.cue;
  const completed = snapshot.lessonComplete;
  const mastery = assessmentRef.current.mastery();
  const sandbox = useMemo(() => projectFungiSandbox(sandboxInput), [sandboxInput]);
  const referenceSandbox = useMemo(
    () => projectFungiSandbox({ day: sandboxInput.day, temperatureC: 27, moisturePercent: 82 }),
    [sandboxInput.day],
  );

  const applySnapshot = useCallback((next: LessonSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    worldRef.current?.setStage(next.stageId as FungiStageId);
  }, []);

  const narrate = useCallback((index: number) => {
    stopSimulationNarration();
    if (!preferences.audio) return;
    const cue = FUNGI_DEVELOPMENT_NARRATION.cues[index];
    if (cue) void playSimulationNarration(cue.text, index);
  }, [preferences.audio]);

  const projectWorld = useCallback((next: FungiViewerState, sandboxEnabled = sandboxOpen) => {
    worldRef.current?.setState({
      ...next.model,
      usefulRoleMatches: [
        ...(next.usefulRoleIds.includes('bakery:yeast') ? [{ objectId: 'mushroom' as const, role: 'food' as const }] : []),
        ...(next.usefulRoleIds.includes('medicine:fungus') ? [{ objectId: 'mushroom' as const, role: 'medicine' as const }] : []),
        ...(next.usefulRoleIds.includes('compost:decomposer') ? [{ objectId: 'bread-mould' as const, role: 'decomposer' as const }] : []),
      ],
      doughRisen: next.doughRisen,
      completed: next.model.completed,
      sandboxEnabled,
      sandboxTemperatureC: sandboxInput.temperatureC,
      sandboxMoisturePercent: sandboxInput.moisturePercent,
      currentDay: sandboxEnabled ? sandboxInput.day : Math.max(1, next.model.visitedDays.at(-1) ?? 1),
    });
  }, [sandboxInput, sandboxOpen]);

  const recordEvidenceAfterProjection = useCallback((evidenceId: string, delayMs: number) => {
    if (pendingEvidenceRef.current === evidenceId || snapshotRef.current.recordedEvidenceIds.includes(evidenceId)) return;
    pendingEvidenceRef.current = evidenceId;
    const commit = () => {
      pendingEvidenceRef.current = null;
      try {
        const currentStage = EXPERIENCE.stages[snapshotRef.current.stageIndex];
        let next = lessonRef.current.snapshot();
        const authoredActionId = STAGE_ACTIONS[currentStage.id as FungiStageId];
        if (!next.performedActionIds.includes(authoredActionId)) {
          next = lessonRef.current.performAction(authoredActionId);
        }
        next = lessonRef.current.recordEvidence(evidenceId);
        applySnapshot(next);
        setEvidence(items => {
          const nextEvidence = unique(items, currentStage.title);
          evidenceRef.current = nextEvidence;
          return nextEvidence;
        });
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
      }
    };
    if (delayMs === 0) commit();
    else evidenceTimerRef.current = setTimeout(commit, delayMs);
  }, [applySnapshot]);

  const handleNormalizedAction = useCallback((actionId: string, source: NormalizedInputSource) => {
    const result = coordinateFungiAction(stateRef.current, { actionId, source });
    if (result.state !== stateRef.current) {
      stateRef.current = result.state;
      setViewerState(result.state);
      projectWorld(result.state);
    }
    if (result.assessment) {
      try {
        assessmentRef.current.answer(result.assessment.promptId, result.assessment.optionId);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error));
        return;
      }
    }
    feedbackRef.current = result.feedback;
    setFeedback(result.feedback);
    const evidenceId = stageEvidenceFor(snapshotRef.current.stageId as FungiStageId, result.state);
    if (evidenceId) recordEvidenceAfterProjection(evidenceId, result.state.evidenceDelayMs);
  }, [projectWorld, recordEvidenceAfterProjection]);
  handlerRef.current = handleNormalizedAction;

  const routeAction = useCallback((actionId: string, source: NormalizedInputSource) => {
    const router = createActionRouter();
    router.register(actionId, action => handlerRef.current(action.actionId, action.source));
    router.route({
      actionId,
      targetEntityId: actionId,
      source,
      phase: 'commit',
      stageId: snapshotRef.current.stageId,
      timestampMs: typeof performance === 'undefined' ? Date.now() : performance.now(),
    });
    router.clear();
  }, []);

  const next = useCallback(() => {
    if (!snapshotRef.current.stageComplete || snapshotRef.current.lessonComplete) {
      setFeedback(snapshotRef.current.lessonComplete ? 'The mission is complete. Open the Field Guide or Growth Sandbox.' : 'Complete the authored action and observe its evidence before continuing.');
      return;
    }
    try {
      const nextSnapshot = lessonRef.current.next();
      applySnapshot(nextSnapshot);
      setFeedback(nextSnapshot.cue);
      narrate(nextSnapshot.stageIndex);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error));
    }
  }, [applySnapshot, narrate]);

  const previous = useCallback(() => {
    const previousSnapshot = lessonRef.current.previous();
    applySnapshot(previousSnapshot);
    setFeedback(previousSnapshot.cue);
    narrate(previousSnapshot.stageIndex);
  }, [applySnapshot, narrate]);
  previousRef.current = previous;

  const replayStage = useCallback((targetIndex: number) => {
    let nextSnapshot = lessonRef.current.snapshot();
    while (nextSnapshot.stageIndex > targetIndex) nextSnapshot = lessonRef.current.previous();
    while (nextSnapshot.stageIndex < targetIndex) nextSnapshot = lessonRef.current.next();
    applySnapshot(nextSnapshot);
    setFieldGuideOpen(false);
    setFeedback(`Replaying ${nextSnapshot.stageTitle}. Existing evidence is retained.`);
    narrate(nextSnapshot.stageIndex);
  }, [applySnapshot, narrate]);

  const restart = useCallback(() => {
    if (evidenceTimerRef.current) clearTimeout(evidenceTimerRef.current);
    pendingEvidenceRef.current = null;
    stopSimulationNarration();
    assessmentRef.current.reset();
    const freshState = createInitialFungiViewerState({ reducedMotion: preferences.reducedMotion });
    stateRef.current = freshState;
    setViewerState(freshState);
    const freshSnapshot = lessonRef.current.restart();
    applySnapshot(freshSnapshot);
    setEvidence([]);
    evidenceRef.current = [];
    setFieldGuideOpen(false);
    setSandboxOpen(false);
    setSandboxInput({ day: 5, temperatureC: 27, moisturePercent: 82 });
    setFeedback('Mission restarted. Choose the mushroom and bread mould.');
    projectWorld(freshState, false);
    narrate(0);
  }, [applySnapshot, narrate, preferences.reducedMotion, projectWorld]);
  replayRef.current = restart;

  const enterVr = useCallback(async () => {
    if (!rendererRef.current || !('xr' in navigator)) {
      setFeedback('Immersive VR is unavailable. Browser controls remain fully usable.');
      return;
    }
    try {
      const session = await (navigator as Navigator & {
        xr: { requestSession(mode: string, options: XRSessionInit): Promise<XRSession> };
      }).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      narrate(snapshotRef.current.stageIndex);
    } catch (error) {
      setFeedback(`WebXR could not start; your browser progress is preserved. ${error instanceof Error ? error.message : ''}`.trim());
    }
  }, [narrate]);

  useEffect(() => {
    if (!('xr' in navigator)) return;
    void (navigator as Navigator & { xr: { isSessionSupported(mode: string): Promise<boolean> } }).xr
      .isSessionSupported('immersive-vr')
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  useEffect(() => {
    if (!preferences.audio) stopSimulationNarration();
    const next = { ...stateRef.current, evidenceDelayMs: preferences.reducedMotion ? 0 : 34 };
    stateRef.current = next;
    setViewerState(next);
    worldRef.current?.setReducedMotion(preferences.reducedMotion);
  }, [preferences.audio, preferences.reducedMotion]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world || !sandboxOpen) return;
    world.setState({
      sandboxEnabled: true,
      currentDay: sandboxInput.day,
      sandboxTemperatureC: sandboxInput.temperatureC,
      sandboxMoisturePercent: sandboxInput.moisturePercent,
    });
  }, [sandboxInput, sandboxOpen]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;
    let cancelled = false;
    let host: WebSimulationRuntime | undefined;
    let renderUpdate: WebSimulationUpdates['renderUpdate'];
    let world: FungiWorld | undefined;

    async function initialize() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#14251d');
      scene.fog = new THREE.Fog('#14251d', 8, 30);
      scene.add(new THREE.HemisphereLight('#d9f99d', '#3f2d22', 2.2));
      const sun = new THREE.DirectionalLight('#fff4d6', 2.4);
      sun.position.set(4, 8, 3);
      scene.add(sun);
      const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 60);
      camera.position.set(0, 1.55, 4.4);
      camera.lookAt(0, 1.1, 0);

      host = createWebSimulationRuntime({
        mount: mountElement,
        scene,
        camera,
        updates: { renderUpdate: context => renderUpdate?.(context) },
      });
      rendererRef.current = host.renderer;
      world = createFungiWorld({ profile: 'browserBalanced', reducedMotion: preferences.reducedMotion });
      worldRef.current = world;
      scene.add(world.root);
      world.setStage(snapshotRef.current.stageId as FungiStageId);
      projectWorld(stateRef.current);
      host.resources.register('fungi-world', () => {
        world?.dispose();
        worldRef.current = null;
      });

      const rig = createVrPlayerRig({
        renderer: host.renderer,
        scene,
        camera,
        spawn: { position: new THREE.Vector3(0, 0, 3.2), lookAt: new THREE.Vector3(0, 1.1, 0) },
        rayColor: '#d9f99d',
      });
      host.resources.register('fungi-vr-rig', () => rig.dispose());
      const hud = createVrHudPanel({ scene });
      host.resources.register('fungi-vr-hud', () => hud.dispose());

      const interaction = createInteractionSystem({
        camera,
        domElement: host.renderer.domElement,
        xrControllers: rig.controllers,
        onSelect: (targetId, _object, source) => {
          const hudButton = hud.buttonIdFor(targetId);
          if (hudButton === 'previous') previousRef.current();
          else if (hudButton === 'replay') replayRef.current();
          else if (hudButton === 'exit') void host?.renderer.xr.getSession()?.end();
          else if (hudButton === 'next') next();
          else {
            const actionId = source === 'xr-controller'
              && targetId === 'spore-landing'
              && stateRef.current.model.sporeLandings.length > 0
              ? 'vr-answer:growth-condition-prediction:warm-moist'
              : WORLD_ACTION_BY_TARGET[targetId];
            if (actionId) routeAction(actionId, source);
          }
        },
      });
      for (const [targetId, actionId] of Object.entries(WORLD_ACTION_BY_TARGET)) {
        const target = world.targets[targetId as keyof typeof world.targets];
        if (target && ALL_ACTION_IDS.includes(actionId)) interaction.register(targetId, target, { highlightColor: '#facc15' });
      }
      for (const button of Object.values(hud.buttons)) interaction.register(button.name, button);
      host.resources.register('fungi-interactions', () => interaction.dispose());

      const locomotion = createVrLocomotion({
        renderer: host.renderer,
        rig: rig.rig,
        locomotion: 'stationary',
        turnMode: 'none',
        reducedMotion: preferences.reducedMotion,
        onBack: () => previousRef.current(),
      });
      host.resources.register('fungi-locomotion', () => locomotion.dispose());

      renderUpdate = context => {
        world?.update(context.frameDeltaSeconds, context.elapsedSeconds);
        interaction.update(context.elapsedSeconds);
        if (host?.renderer.xr.isPresenting) {
          locomotion.update(context.frameDeltaSeconds);
          interaction.updateXrHover();
          const current = snapshotRef.current;
          const content: VrHudContent = current.lessonComplete ? {
            eyebrow: 'Mission complete',
            title: 'Fungi Explorer',
            body: 'Review the evidence, then replay or exit.',
            bullets: evidenceRef.current,
            buttons: ['replay', 'exit'],
          } : {
            eyebrow: `Stage ${current.stageIndex + 1} / ${current.stageCount}`,
            title: current.stageTitle,
            body: current.cue,
            hint: current.stageComplete ? 'Evidence recorded. Next is now available.' : feedbackRef.current,
            buttons: current.stageIndex > 0 ? ['previous', 'next', 'replay'] : ['next', 'replay'],
          };
          hud.setVisible(true);
          hud.setContent(content);
          hud.update(host.renderer.xr.getCamera(), context.frameDeltaSeconds);
        } else hud.setVisible(false);
      };

      const onVisibility = () => {
        if (document.hidden) {
          world?.pause();
          stopSimulationNarration();
        } else world?.resume();
      };
      document.addEventListener('visibilitychange', onVisibility);
      host.resources.register('fungi-visibility', () => document.removeEventListener('visibilitychange', onVisibility));
      await host.initialize();
      if (cancelled) await host.dispose();
    }

    void initialize().catch(error => {
      if (!cancelled) setRuntimeError(error instanceof Error ? error.message : String(error));
      void host?.dispose();
    });
    return () => {
      cancelled = true;
      if (evidenceTimerRef.current) clearTimeout(evidenceTimerRef.current);
      stopSimulationNarration();
      rendererRef.current = null;
      if (world && !world.snapshot().disposed) world.dispose();
      void host?.dispose();
    };
  }, []);

  const assessmentFor = (promptId: string, finalReview = false) => {
    const prompt = ASSESSMENT.prompts.find(candidate => candidate.id === promptId);
    if (!prompt?.options) return null;
    return (
      <fieldset style={{ border: 0, padding: 0, margin: '12px 0' }}>
        <legend style={{ fontWeight: 700 }}>{prompt.question}</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {prompt.options.map(option => (
            <button
              key={option.id}
              type="button"
              style={controlStyle}
              aria-label={`${prompt.question} — ${option.label}`}
              onPointerUp={event => {
                if (event.button !== 0) return;
                routeAction(
                  `${finalReview ? 'review' : 'answer'}:${prompt.id}:${option.id}`,
                  event.pointerType === 'touch' ? 'touch' : 'mouse',
                );
              }}
              onClick={event => {
                if (event.detail === 0) routeAction(`${finalReview ? 'review' : 'answer'}:${prompt.id}:${option.id}`, 'keyboard');
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  };

  const stageControls = () => {
    const button = (actionId: string, label: string) => (
      <button key={actionId} type="button" style={controlStyle} onPointerUp={event => {
        if (event.button !== 0) return;
        const source: NormalizedInputSource = event.pointerType === 'touch' ? 'touch' : 'mouse';
        routeAction(actionId, source);
      }} onClick={event => {
        if (event.detail === 0) routeAction(actionId, 'keyboard');
      }}>{label}</button>
    );
    switch (snapshot.stageId) {
      case 'fungal-forensics':
        return <>{button('select:mushroom', 'Select mushroom')}{button('select:bread-mould', 'Select bread mould')}{button('select:green-plant', 'Select green plant')}{assessmentFor('fungi-precheck')}</>;
      case 'under-the-cap':
        return <>{button('inspect:hypha-tip-alpha', 'Touch hypha alpha')}{button('inspect:hypha-tip-beta', 'Touch hypha beta')}{button('inspect:hypha-tip-gamma', 'Touch hypha gamma')}{assessmentFor('mycelium-observation')}</>;
      case 'spore-flight':
        return <>{button('guide:spore-guide', 'Guide the spore')}{button('land:spore-landing', 'Land on moist bread')}{assessmentFor('growth-condition-prediction')}</>;
      case 'five-day-time-lens':
        return <><div aria-label="Five day timeline">{[1, 2, 3, 4, 5].map(day => button(`visit-day:${day}`, `Observe day ${day}`))}</div><p>Build the order:</p>{LIFE_CYCLE_LABELS.map(label => button(`sequence:${label}`, LIFE_CYCLE_TEXT[label]))}</>;
      case 'fungi-at-work':
        return <>{button('trigger:dough-rise', 'Activate yeast and compare dough')}{button('role:bakery', 'Match fungus to bakery')}{button('role:medicine', 'Match fungus to medicine')}{button('role:compost', 'Match fungus to compost')}{assessmentFor('baking-fungus-observation')}</>;
      case 'food-safety-scan':
        return <>{button('classify:fresh-item:safe', 'Classify fresh item as check before use')}{button('classify:mouldy-item:unsafe', 'Classify mouldy soft food as unsafe')}{assessmentFor('mould-safety-misconception')}</>;
      case 'forest-circle':
        return <>{FINAL_REVIEW_PROMPTS.map(promptId => <div key={promptId}>{assessmentFor(promptId, true)}</div>)}{button('collect:fungi-explorer-badge', 'Collect Fungi Explorer badge')}</>;
      default:
        return null;
    }
  };

  return (
    <SimulationExperienceShell
      simulationId={FUNGI_DEVELOPMENT.module.id}
      title="Living Mycelium Lab"
      classContext="Class 8 Science · Microorganisms"
      objective={EXPERIENCE.objective}
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => { setStarted(true); narrate(snapshot.stageIndex); }}
      onEnterVr={vrSupported ? enterVr : undefined}
      onPrevious={previous}
      onNext={next}
      evidence={evidence}
      completed={completed}
      completionEyebrow="Mission Complete: Fungi Explorer"
      completionHeadline="You traced a living mycelium story"
      completionBody={`Completion records participation; mastery requires independent observation, misconception, and transfer evidence. Current mastery: ${mastery.mastered ? 'demonstrated' : `not yet demonstrated (${mastery.missingKinds.join(', ') || 'more independent evidence needed'})`}.`}
      caption={preferences.subtitles ? caption : undefined}
      feedback={feedback}
      onReplayNarration={() => narrate(snapshot.stageIndex)}
      onRestart={restart}
      helpText="Use the labelled controls or select the same objects in the world. No generic Next action records evidence."
      scaleNote="Microscopic structures and five accelerated days are explanatory models, not literal size or real-time speed."
    >
      <SimulationCanvasHost
        ref={mountRef}
        ariaLabel="Persistent forest laboratory showing fungi, hyphae, spores, useful roles, food safety, and a nutrient circle"
        busy={!worldRef.current && !runtimeError}
      />
      {started && (
        <section aria-label="Living Mycelium learning controls" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 5, maxHeight: '48vh', overflow: 'auto', borderRadius: 16, background: 'rgba(7,24,18,.94)', color: '#f7fee7', padding: 16, boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}>
          <h2 style={{ margin: '0 0 6px' }}>{stage.title}</h2>
          <p style={{ margin: '0 0 10px' }}>{stage.cue}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{!completed && stageControls()}</div>
          <p aria-live="polite" role="status" style={{ minHeight: 44, margin: '10px 0 0' }}>{feedback}</p>
          {runtimeError && <p role="alert">3D view unavailable: {runtimeError}. The complete text activity and saved progress remain available.</p>}
          <p><strong>Safety:</strong> Never taste mouldy food and never open a mould culture. Observe sealed or simulated samples without touching and tell an adult.</p>
          {completed && (
            <div>
              <h3>Mission Complete: Fungi Explorer</h3>
              <p>Evidence: {evidence.join('; ')}.</p>
              <p>First growth prediction: {viewerState.model.firstGrowthPrediction ?? 'not recorded'}. Corrected answer: {viewerState.model.latestGrowthPrediction ?? 'not recorded'}.</p>
              <p>Misconception resolution: {viewerState.model.safetyMisconceptionResolved ? 'Resolved—hidden hyphae can extend beyond visible mould, so reject the whole mouldy soft food.' : 'Not yet resolved.'}</p>
              <p>Transfer/mastery: {mastery.mastered ? 'Independent transfer and required evidence demonstrate mastery.' : 'Lesson completion does not equal mastery; revisit any hinted observation or transfer.'}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" style={controlStyle} onClick={() => setFieldGuideOpen(value => !value)}>Field Guide</button>
                <button type="button" style={controlStyle} onClick={() => { setSandboxOpen(value => !value); worldRef.current?.setState({ sandboxEnabled: !sandboxOpen }); }}>Growth Sandbox</button>
                <button type="button" style={controlStyle} onClick={restart}>Restart full mission</button>
              </div>
              {fieldGuideOpen && <aside aria-label="Fungi Field Guide"><h4>Field Guide</h4><ul><li>Hypha: one fungal thread.</li><li>Mycelium: a connected feeding network of hyphae.</li><li>Spores: reproductive cells that can spread and land.</li><li>Fungi can support baking, medicine, decomposition, and food webs; some also spoil food.</li></ul><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{EXPERIENCE.stages.map((guideStage, index) => <button key={guideStage.id} type="button" style={controlStyle} onClick={() => replayStage(index)}>Replay {guideStage.title}</button>)}</div></aside>}
              {sandboxOpen && (
                <section aria-label="Growth Sandbox">
                  <h4>Growth Sandbox</h4>
                  <label>Day {sandboxInput.day}<input aria-label="Sandbox day" type="range" min="1" max="5" step="1" value={sandboxInput.day} onChange={event => setSandboxInput(input => ({ ...input, day: Number(event.target.value) }))} /></label>
                  <label>Temperature {sandboxInput.temperatureC}°C<input aria-label="Sandbox temperature" type="range" min="0" max="45" step="1" value={sandboxInput.temperatureC} onChange={event => setSandboxInput(input => ({ ...input, temperatureC: Number(event.target.value) }))} /></label>
                  <label>Moisture {sandboxInput.moisturePercent}%<input aria-label="Sandbox moisture" type="range" min="0" max="100" step="1" value={sandboxInput.moisturePercent} onChange={event => setSandboxInput(input => ({ ...input, moisturePercent: Number(event.target.value) }))} /></label>
                  <div aria-live="polite" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <article><h5>Warm, moist reference</h5><strong>{referenceSandbox.result.stage}</strong> · coverage {Math.round(referenceSandbox.coverage * 100)}%<p>{referenceSandbox.interpretation}</p></article>
                    <article><h5>Your sandbox conditions</h5><strong>{sandbox.result.stage}</strong> · coverage {Math.round(sandbox.coverage * 100)}%<p>{sandbox.interpretation}</p></article>
                  </div>
                  <p>This sandbox comparison does not change assessment evidence or mastery.</p>
                </section>
              )}
            </div>
          )}
        </section>
      )}
    </SimulationExperienceShell>
  );
}
