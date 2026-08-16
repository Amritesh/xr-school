'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createAssessmentSession,
  createLessonSession,
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
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
} from '@/lib/world-builder/webSimulationRuntime';
import {
  createFungiViewerController,
  type FungiViewerController,
  type FungiViewerSnapshot,
} from '@/lib/fungi/fungiViewerController';
import {
  FUNGI_MISSIONS,
  type FungiInputSource,
  type FungiMissionId,
} from '@/lib/fungi/fungiExperienceDirector';
import type { FungalUsefulActorId, FungalUsefulRole } from '@xr-school/simulation-runtime';
import './fungi-nursery-lab.css';

const EXPERIENCE = FUNGI_DEVELOPMENT.experience;
const CLASS_CONTEXT = 'Class 8 · Microorganisms · Fungi and its development';
const ASSESSMENT = FUNGI_DEVELOPMENT.assessment;

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

/** Each mission closes exactly one authored stage and one assessment prompt. */
const MISSION_STAGE: Readonly<Record<FungiMissionId, string>> = {
  diagnose: 'fungal-forensics',
  mycelium: 'under-the-cap',
  'spore-flight': 'spore-flight',
  'growth-chamber': 'five-day-time-lens',
  'useful-fungi': 'fungi-at-work',
  safety: 'food-safety-scan',
  recommendation: 'forest-circle',
};

const MISSION_ACTION: Readonly<Record<FungiMissionId, string>> = {
  diagnose: 'fungi.classify-mushroom-and-mould',
  mycelium: 'fungi.inspect-hypha-network',
  'spore-flight': 'fungi.guide-spore-to-surface',
  'growth-chamber': 'fungi.run-five-day-timeline',
  'useful-fungi': 'fungi.match-useful-roles',
  safety: 'fungi.choose-safe-mould-response',
  recommendation: 'fungi.explain-forest-transfer',
};

const MISSION_PROMPT: Readonly<Record<FungiMissionId, string>> = {
  diagnose: 'fungi-precheck',
  mycelium: 'mycelium-observation',
  'spore-flight': 'growth-condition-prediction',
  'growth-chamber': 'development-order-observation',
  'useful-fungi': 'baking-fungus-observation',
  safety: 'mould-safety-misconception',
  recommendation: 'forest-transfer',
};

/**
 * Where an authored prompt asks exactly what a mission gate asks, answering it
 * IS the scientific act — the shell's prompt drives the director rather than
 * the drawer duplicating the same choice next to it.
 */
const PROMPT_ACTION: Readonly<
  Record<string, { actionId: string; value(optionId: string): string } | undefined>
> = {
  'fungi-precheck': {
    actionId: 'diagnose.classify',
    value: (optionId) => optionId,
  },
  'mycelium-observation': {
    actionId: 'mycelium.interpret',
    value: (optionId) =>
      optionId === 'mycelium'
        ? 'connected-feeding-network'
        : 'separate-unconnected-threads',
  },
  'mould-safety-misconception': {
    actionId: 'safety.explain',
    value: (optionId) =>
      optionId === 'reject-whole-soft-food'
        ? 'hidden-hyphae-extend-beyond-visible-patch'
        : 'cutting-the-patch-away-makes-it-safe',
  },
  'forest-transfer': {
    actionId: 'recommendation.change-storage',
    value: (optionId) =>
      optionId === 'cool-dry-surface' ? 'cool-and-dry' : 'warm-and-damp',
  },
};

const STAGE_EVIDENCE = Object.fromEntries(
  EXPERIENCE.stages.map((stage) => [stage.id, stage.completionEvidenceIds[0]]),
) as Readonly<Record<string, string>>;

const MISSION_TITLE: Readonly<Record<FungiMissionId, string>> = {
  diagnose: 'Triage',
  mycelium: 'Mycelium',
  'spore-flight': 'Spore flight',
  'growth-chamber': 'Growth chamber',
  'useful-fungi': 'Fungi at work',
  safety: 'Food safety',
  recommendation: 'Recommendation',
};

const USEFUL_ACTORS: ReadonlyArray<{ id: FungalUsefulActorId; label: string }> = [
  { id: 'yeast', label: 'Yeast' },
  { id: 'antibiotic-producing-fungus', label: 'Antibiotic culture' },
  { id: 'saprotrophic-fungus', label: 'Saprotroph' },
];
const USEFUL_ROLES: ReadonlyArray<{ id: FungalUsefulRole; label: string }> = [
  { id: 'food', label: 'Food' },
  { id: 'medicine', label: 'Medicine' },
  { id: 'decomposer', label: 'Decomposer' },
];

const SUBSTRATES = ['bread', 'fruit', 'dry-paper'] as const;

const BROWSER_SOURCE: FungiInputSource = 'mouse';

function optionLabel(optionId: string): string {
  return optionId.replaceAll('-', ' ').replace(/^./, (character) => character.toUpperCase());
}

export default function FungiDevelopmentViewer() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<WebSimulationRuntime | null>(null);
  const controllerRef = useRef<FungiViewerController | null>(null);
  const lessonRef = useRef(createLessonSession(EXPERIENCE));
  const assessmentRef = useRef(createAssessmentSession(ASSESSMENT));
  const recordedMissionsRef = useRef(new Set<FungiMissionId>());
  const answeredPromptsRef = useRef(new Set<string>());

  const [started, setStarted] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [view, setView] = useState<FungiViewerSnapshot | null>(null);
  const [lesson, setLesson] = useState<LessonSnapshot>(lessonRef.current.snapshot());
  const [evidence, setEvidence] = useState<string[]>([]);
  // Narrow viewports have no free room, so the tools begin as a closed sheet.
  const [growthInterpretation, setGrowthInterpretation] = useState(
    'temperature-changed-growth',
  );
  const [drawerCollapsed, setDrawerCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 820,
  );
  const [runtimeError, setRuntimeError] = useState('');

  /**
   * Hands the camera the region no interface surface covers, measured from the
   * live layout rather than assumed, so framing stays honest on any viewport.
   */
  const syncViewport = useCallback(() => {
    const mount = mountRef.current;
    const controller = controllerRef.current;
    if (!mount || !controller) return;
    const bounds = mount.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const strip = stripRef.current?.getBoundingClientRect();
    const drawer = drawerRef.current?.getBoundingClientRect();
    const insets = { top: 0, right: 12, bottom: 0, left: 12 };
    if (strip) insets.top = Math.max(insets.top, strip.bottom - bounds.top);
    if (drawer) {
      // A narrow drawer sits beside the apparatus; a wide one sits beneath it.
      if (drawer.width < bounds.width * 0.6) {
        insets.right = Math.max(insets.right, bounds.right - drawer.left);
      } else {
        insets.bottom = Math.max(insets.bottom, bounds.bottom - drawer.top);
      }
    }
    controller.setViewport(bounds.width, bounds.height, insets);
  }, []);

  /** Advances the authored lesson whenever a mission is genuinely completed. */
  const syncLesson = useCallback((snapshot: FungiViewerSnapshot) => {
    for (const missionId of snapshot.director.completedMissionIds) {
      if (recordedMissionsRef.current.has(missionId)) continue;
      recordedMissionsRef.current.add(missionId);
      try {
        const stageId = MISSION_STAGE[missionId];
        let next = lessonRef.current.snapshot();
        if (!next.performedActionIds.includes(MISSION_ACTION[missionId])) {
          next = lessonRef.current.performAction(MISSION_ACTION[missionId]);
        }
        const evidenceId = STAGE_EVIDENCE[stageId];
        if (evidenceId && !next.recordedEvidenceIds.includes(evidenceId)) {
          next = lessonRef.current.recordEvidence(evidenceId);
        }
        setLesson(next);
        setEvidence((items) =>
          items.includes(MISSION_TITLE[missionId])
            ? items
            : [...items, MISSION_TITLE[missionId]],
        );
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
    }
  }, []);

  const publish = useCallback(
    (snapshot: FungiViewerSnapshot) => {
      setView(snapshot);
      syncLesson(snapshot);
    },
    [syncLesson],
  );

  const act = useCallback(
    (actionId: string, payload: Record<string, unknown> = {}) => {
      const controller = controllerRef.current;
      if (!controller) return;
      try {
        publish(
          controller.act({
            actionId: actionId as never,
            source: BROWSER_SOURCE,
            ...payload,
          }),
        );
        setRuntimeError('');
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
    },
    [publish],
  );

  const manipulate = useCallback(
    (manipulation: Parameters<FungiViewerController['manipulate']>[0]) => {
      const controller = controllerRef.current;
      if (!controller) return;
      try {
        publish(controller.manipulate(manipulation, BROWSER_SOURCE));
        setRuntimeError('');
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
    },
    [publish],
  );

  /** Records the authored assessment answer alongside the scientific action. */
  const answerPrompt = useCallback(
    (promptId: string, optionId: string) => {
      if (!answeredPromptsRef.current.has(`${promptId}:${optionId}`)) {
        answeredPromptsRef.current.add(`${promptId}:${optionId}`);
        try {
          assessmentRef.current.answer(promptId, optionId);
        } catch {
          // The authored assessment refuses repeats; the scientific record stands.
        }
      }
      const mapped = PROMPT_ACTION[promptId];
      if (mapped) act(mapped.actionId, { value: mapped.value(optionId) });
    },
    [act],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !started) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c140e);
    scene.fog = new THREE.Fog(0x0c140e, 18, 46);
    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 200);

    const key = new THREE.DirectionalLight(0xffe8c4, 2.1);
    key.position.set(6, 12, 8);
    key.castShadow = true;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xbcd6c0, 0x1d2618, 1.35));

    let controller: FungiViewerController | undefined;
    let runtime: WebSimulationRuntime | undefined;
    let observer: ResizeObserver | undefined;

    try {
      controller = createFungiViewerController({
        camera,
        domElement: mount,
        reducedMotion: preferences.reducedMotion,
      });
      controllerRef.current = controller;
      scene.add(controller.root);

      runtime = createWebSimulationRuntime({
        mount,
        scene,
        camera,
        updates: {
          renderUpdate({ frameDeltaSeconds, elapsedSeconds }) {
            controller?.update(frameDeltaSeconds, elapsedSeconds);
          },
        },
      });
      runtimeRef.current = runtime;
      void runtime.initialize();

      syncViewport();
      observer = new ResizeObserver(() => syncViewport());
      observer.observe(mount);
      setView(controller.snapshot());
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }

    return () => {
      observer?.disconnect();
      stopSimulationNarration();
      controller?.dispose();
      controllerRef.current = null;
      void runtime?.dispose();
      runtimeRef.current = null;
    };
  }, [started, preferences.reducedMotion, syncViewport]);

  useEffect(() => {
    controllerRef.current?.setReducedMotion(preferences.reducedMotion);
  }, [preferences.reducedMotion]);

  const missionIndex = view?.director.missionIndex ?? 0;
  const caption =
    FUNGI_DEVELOPMENT_NARRATION.cues[missionIndex]?.caption ??
    EXPERIENCE.stages[missionIndex]?.cue ??
    '';

  const replayNarration = useCallback(() => {
    stopSimulationNarration();
    if (!preferences.audio) return;
    const cue = FUNGI_DEVELOPMENT_NARRATION.cues[missionIndex];
    if (cue) void playSimulationNarration(cue.text, missionIndex);
  }, [missionIndex, preferences.audio]);

  const restart = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    recordedMissionsRef.current.clear();
    answeredPromptsRef.current.clear();
    lessonRef.current = createLessonSession(EXPERIENCE);
    assessmentRef.current = createAssessmentSession(ASSESSMENT);
    setLesson(lessonRef.current.snapshot());
    setEvidence([]);
    setRuntimeError('');
    setView(controller.restartJourney());
  }, []);

  const promptId = view ? MISSION_PROMPT[view.director.missionId] : undefined;
  const prompt = useMemo(
    () => ASSESSMENT.prompts.find((entry) => entry.id === promptId),
    [promptId],
  );

  const tools = view?.tools;
  const savedTrials = view?.director.experiment.savedTrials ?? [];

  const renderMissionTools = () => {
    if (!view || !tools) return null;
    switch (view.director.missionId) {
      case 'diagnose':
        return (
          <fieldset className="fungi-lab__group">
            <legend>Classification board</legend>
            <label className="fungi-lab__slider">
              Lens across the table
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="fungi-lens-x"
                value={tools.lens.normalizedX}
                onChange={(event) =>
                  manipulate({
                    type: 'lens-move',
                    normalizedX: Number(event.target.value),
                    normalizedY: tools.lens.normalizedY,
                  })
                }
              />
            </label>
            <label className="fungi-lab__slider">
              Lens height
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="fungi-lens-y"
                value={tools.lens.normalizedY}
                onChange={(event) =>
                  manipulate({
                    type: 'lens-move',
                    normalizedX: tools.lens.normalizedX,
                    normalizedY: Number(event.target.value),
                  })
                }
              />
            </label>
          </fieldset>
        );

      case 'mycelium':
        return (
          <fieldset className="fungi-lab__group">
            <legend>Microscope</legend>
            <label className="fungi-lab__slider">
              Focus depth
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="fungi-focus-depth"
                value={tools.focusDepth}
                onChange={(event) =>
                  manipulate({ type: 'focus-set', depth: Number(event.target.value) })
                }
              />
            </label>
            <label className="fungi-lab__slider">
              Trace across the log
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="fungi-trace-x"
                value={tools.lens.normalizedX}
                onChange={(event) =>
                  manipulate({
                    type: 'lens-move',
                    normalizedX: Number(event.target.value),
                    normalizedY: 0.5,
                  })
                }
              />
            </label>
          </fieldset>
        );

      case 'spore-flight':
        return (
          <fieldset className="fungi-lab__group">
            <legend>Airflow</legend>
            <label className="fungi-lab__slider">
              Direction
              <input
                type="range"
                min={-3.14}
                max={3.14}
                step={0.01}
                data-testid="fungi-fan-direction"
                value={tools.fan.directionRadians}
                onChange={(event) =>
                  manipulate({
                    type: 'fan-set',
                    directionRadians: Number(event.target.value),
                    strength: tools.fan.strength,
                  })
                }
              />
            </label>
            <label className="fungi-lab__slider">
              Strength
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="fungi-fan-strength"
                value={tools.fan.strength}
                onChange={(event) =>
                  manipulate({
                    type: 'fan-set',
                    directionRadians: tools.fan.directionRadians,
                    strength: Number(event.target.value),
                  })
                }
              />
            </label>
            <button
              type="button"
              data-testid="fungi-spore-release"
              onClick={() => manipulate({ type: 'spore-release' })}
            >
              Release a spore
            </button>
          </fieldset>
        );

      case 'growth-chamber':
        return (
          <>
            <fieldset className="fungi-lab__group">
              <legend>Chamber controls</legend>
              <label className="fungi-lab__slider">
                Temperature{' '}<span className="fungi-lab__value">{Math.round(tools.growthInput.temperatureC)}°C</span>
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={1}
                  data-testid="fungi-temperature"
                  value={tools.growthInput.temperatureC}
                  onChange={(event) =>
                    manipulate({
                      type: 'growth-input-set',
                      field: 'temperatureC',
                      value: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="fungi-lab__slider">
                Moisture{' '}<span className="fungi-lab__value">{Math.round(tools.growthInput.moisturePercent)}%</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  data-testid="fungi-moisture"
                  value={tools.growthInput.moisturePercent}
                  onChange={(event) =>
                    manipulate({
                      type: 'growth-input-set',
                      field: 'moisturePercent',
                      value: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="fungi-lab__slider">
                Hours{' '}<span className="fungi-lab__value">{Math.round(tools.growthInput.elapsedHours)}</span>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={1}
                  data-testid="fungi-hours"
                  value={tools.growthInput.elapsedHours}
                  onChange={(event) =>
                    manipulate({
                      type: 'growth-input-set',
                      field: 'elapsedHours',
                      value: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="fungi-lab__slider">
                Substrate
                <select
                  data-testid="fungi-substrate"
                  value={tools.growthInput.substrate}
                  onChange={(event) =>
                    manipulate({
                      type: 'substrate-set',
                      substrate: event.target.value as (typeof SUBSTRATES)[number],
                    })
                  }
                >
                  {SUBSTRATES.map((substrate) => (
                    <option key={substrate} value={substrate}>
                      {optionLabel(substrate)}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <fieldset className="fungi-lab__group">
              <legend>Trial notebook</legend>
              <div className="fungi-lab__row">
                <button
                  type="button"
                  data-testid="fungi-save-trial"
                  onClick={() => act('growth.save-trial')}
                >
                  Save trial
                </button>
                <button
                  type="button"
                  data-testid="fungi-compare-trials"
                  disabled={savedTrials.length < 2}
                  onClick={() =>
                    act('growth.compare-trials', {
                      trialIds: [
                        savedTrials.at(-2)?.id ?? '',
                        savedTrials.at(-1)?.id ?? '',
                      ],
                    })
                  }
                >
                  Compare last two
                </button>
              </div>
              <div className="fungi-lab__row">
                <select
                  data-testid="fungi-growth-interpretation"
                  value={growthInterpretation}
                  onChange={(event) => setGrowthInterpretation(event.target.value)}
                >
                  {[
                    'temperature-changed-growth',
                    'moisture-changed-growth',
                    'substrate-changed-growth',
                    'time-changed-growth',
                  ].map((value) => (
                    <option key={value} value={value}>
                      {optionLabel(value)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-testid="fungi-record-interpretation"
                  onClick={() => act('growth.interpret', { value: growthInterpretation })}
                >
                  Record
                </button>
              </div>
            </fieldset>
          </>
        );

      case 'useful-fungi':
        return (
          <>
            <fieldset className="fungi-lab__group">
              <legend>Dough bench</legend>
              <div className="fungi-lab__row">
                <button
                  type="button"
                  data-testid="fungi-pipette-yeast"
                  onClick={() => manipulate({ type: 'pipette-drop', vesselId: 'yeast' })}
                >
                  Add yeast
                </button>
                <button
                  type="button"
                  data-testid="fungi-pipette-control"
                  onClick={() => manipulate({ type: 'pipette-drop', vesselId: 'control' })}
                >
                  Add to control
                </button>
              </div>
              <label className="fungi-lab__slider">
                Proving hours{' '}<span className="fungi-lab__value">{Math.round(tools.growthInput.elapsedHours)}</span>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={1}
                  data-testid="fungi-proving-hours"
                  value={tools.growthInput.elapsedHours}
                  onChange={(event) =>
                    manipulate({
                      type: 'growth-input-set',
                      field: 'elapsedHours',
                      value: Number(event.target.value),
                    })
                  }
                />
              </label>
            </fieldset>
            <fieldset className="fungi-lab__group">
              <legend>Role router</legend>
              {USEFUL_ACTORS.map((actor) => (
                <div className="fungi-lab__row" key={actor.id}>
                  <span>{actor.label}</span>
                  {USEFUL_ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      data-testid={`fungi-role-${actor.id}-${role.id}`}
                      onClick={() => {
                        manipulate({ type: 'token-grab', actorId: actor.id });
                        manipulate({ type: 'role-drop', actorId: actor.id, role: role.id });
                      }}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              ))}
            </fieldset>
          </>
        );

      case 'safety':
        return (
          <fieldset className="fungi-lab__group">
            <legend>Safety station</legend>
            <label className="fungi-lab__slider">
              Scan depth
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                data-testid="fungi-scanner-depth"
                value={tools.scannerDepth}
                onChange={(event) =>
                  manipulate({ type: 'scanner-set', depth: Number(event.target.value) })
                }
              />
            </label>
            <div className="fungi-lab__row">
              <button
                type="button"
                data-testid="fungi-safety-fresh"
                onClick={() =>
                  act('safety.classify', { targetId: 'fresh-item', value: 'check-use' })
                }
              >
                Fresh: check and use
              </button>
              <button
                type="button"
                data-testid="fungi-safety-mouldy"
                onClick={() =>
                  act('safety.classify', { targetId: 'mouldy-item', value: 'do-not-eat' })
                }
              >
                Mouldy: do not eat
              </button>
            </div>
          </fieldset>
        );

      case 'recommendation':
        return (
          <fieldset className="fungi-lab__group">
            <legend>Storage recommendation</legend>
            <div className="fungi-lab__row">
              {savedTrials.map((trial) => (
                <button
                  key={trial.id}
                  type="button"
                  data-testid={`fungi-cite-${trial.id}`}
                  onClick={() => act('recommendation.cite-evidence', { value: trial.id })}
                >
                  Cite {trial.id}
                </button>
              ))}
            </div>
            <div className="fungi-lab__row">
              {['spoilage-harmful-decomposition-useful', 'all-fungi-are-harmful'].map((value) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`fungi-distinguish-${value}`}
                  onClick={() => act('recommendation.distinguish', { value })}
                >
                  {optionLabel(value)}
                </button>
              ))}
            </div>
          </fieldset>
        );

      default:
        return null;
    }
  };

  return (
    <SimulationExperienceShell
      simulationId={FUNGI_DEVELOPMENT.module.id}
      title={FUNGI_DEVELOPMENT.module.title}
      classContext={CLASS_CONTEXT}
      objective={view?.mission.objective ?? EXPERIENCE.objective}
      snapshot={lesson}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => setStarted(true)}
      onPrevious={() => undefined}
      onNext={() => undefined}
      evidence={evidence}
      completed={lesson.lessonComplete}
      caption={preferences.subtitles ? caption : undefined}
      feedback={view?.director.feedback?.outcome}
      onReplayNarration={replayNarration}
      onRestart={restart}
      error={runtimeError || undefined}
      assessment={
        prompt
          ? {
              promptId: prompt.id,
              question: prompt.question,
              options: (prompt.options ?? []).map((option) => ({
                id: option.id,
                label: option.label,
              })),
              onAnswer: (optionId: string) => answerPrompt(prompt.id, optionId),
            }
          : undefined
      }
    >
      <div className="fungi-lab">
        <SimulationCanvasHost
          ariaLabel="Forest nursery outbreak investigation"
          className="fungi-lab__canvas"
          ref={mountRef}
        />

        <div className="fungi-lab__strip" ref={stripRef} data-testid="fungi-mission-strip">
          <ol className="fungi-lab__missions">
            {FUNGI_MISSIONS.map((mission) => {
              const completed = view?.director.completedMissionIds.includes(mission.id);
              const current = view?.director.missionId === mission.id;
              return (
                <li
                  key={mission.id}
                  className="fungi-lab__mission"
                  data-state={current ? 'current' : completed ? 'complete' : 'pending'}
                  data-complete={completed ? 'true' : 'false'}
                  aria-current={current ? 'step' : undefined}
                >
                  {MISSION_TITLE[mission.id]}
                </li>
              );
            })}
          </ol>
          <p className="fungi-lab__objective">
            <span data-testid="fungi-current-mission">
              {view ? MISSION_TITLE[view.director.missionId] : ''}
            </span>
            {view ? ` — ${view.mission.objective}` : ''}
          </p>
        </div>

        <div
          className="fungi-lab__drawer"
          ref={drawerRef}
          data-testid="fungi-tool-drawer"
          data-collapsed={drawerCollapsed}
        >
          <div className="fungi-lab__drawer-head">
            <button
              type="button"
              data-testid="fungi-toggle-drawer"
              aria-expanded={!drawerCollapsed}
              onClick={() => {
                setDrawerCollapsed((collapsed) => !collapsed);
                window.requestAnimationFrame(syncViewport);
              }}
            >
              {drawerCollapsed ? 'Show tools' : 'Hide tools'}
            </button>
            <div className="fungi-lab__row">
              <button
                type="button"
                data-testid="fungi-request-hint"
                onClick={() => act('director.request-hint')}
              >
                Hint
              </button>
              <button
                type="button"
                data-testid="fungi-focus-specimen"
                onClick={() => controllerRef.current?.focusSpecimen()}
              >
                Focus apparatus
              </button>
              <button
                type="button"
                data-testid="fungi-reset-camera"
                onClick={() => {
                  const next = controllerRef.current?.resetCamera();
                  if (next) setView(next);
                }}
              >
                Reset view
              </button>
              <button
                type="button"
                data-testid="fungi-reset-experiment"
                onClick={() => {
                  const next = controllerRef.current?.resetExperiment();
                  if (next) setView(next);
                }}
              >
                Reset experiment
              </button>
              <button type="button" data-testid="fungi-restart-journey" onClick={restart}>
                Restart investigation
              </button>
            </div>
          </div>

          <div className="fungi-lab__drawer-body">{renderMissionTools()}</div>

          <p className="fungi-lab__caption" data-testid="fungi-caption" aria-live="polite">
            {view?.director.feedback?.outcome ?? caption}
            {view?.director.currentHint ? (
              <span className="fungi-lab__hint">{view.director.currentHint}</span>
            ) : null}
          </p>

          <ul className="fungi-lab__notebook" data-testid="fungi-evidence-notebook">
            {evidence.length === 0 ? (
              <li>No evidence recorded yet</li>
            ) : (
              evidence.map((entry) => <li key={entry}>{entry}</li>)
            )}
          </ul>
        </div>
      </div>
    </SimulationExperienceShell>
  );
}
