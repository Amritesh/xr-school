'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedAction } from '@xr-school/simulation-schema';
import type {
  InteractiveInvestigationSession,
  InteractiveInvestigationSnapshot,
} from '@xr-school/simulation-runtime';
import {
  createSimulationHost,
  type SimulationHost,
} from '@xr-school/simulation-web';

import SimulationCanvasHost from '@/components/simulation-experience/SimulationCanvasHost';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import type {
  AnyInteractiveViewerRegistration,
  InteractiveChoice,
  ProjectableSceneAdapter,
} from '@/lib/simulations/interactive/types';

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

function actionForChoice(
  choice: InteractiveChoice,
  stageId: string,
): NormalizedAction {
  return {
    ...choice.action,
    source: 'mouse',
    stageId,
    timestampMs: globalThis.performance?.now() ?? Date.now(),
  };
}

function firstChoiceGroup(
  choices: readonly InteractiveChoice[],
): readonly InteractiveChoice[] {
  const first = choices[0];
  if (!first) return [];
  const target = first.action.targetEntityId.split('::')[0];
  return choices.filter(
    choice => choice.action.targetEntityId.split('::')[0] === target,
  );
}

export interface InteractiveInvestigationViewerProps {
  registration: AnyInteractiveViewerRegistration;
}

export default function InteractiveInvestigationViewer({
  registration,
}: InteractiveInvestigationViewerProps) {
  const definition = registration.definition;
  const mountRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<SimulationHost | undefined>(undefined);
  const sessionRef = useRef<InteractiveInvestigationSession<unknown>>(
    registration.createSession(),
  );
  const adapterRef = useRef<ProjectableSceneAdapter<unknown> | undefined>(
    undefined,
  );
  const launchingRef = useRef(false);
  const preferencesRef = useRef(DEFAULT_PREFERENCES);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [view, setView] = useState<InteractiveInvestigationSnapshot<unknown>>(
    sessionRef.current.snapshot(),
  );

  useEffect(() => {
    preferencesRef.current = preferences;
    if (!preferences.audio) hostRef.current?.narration.stop();
  }, [preferences]);

  useEffect(() => () => {
    const host = hostRef.current;
    hostRef.current = undefined;
    adapterRef.current = undefined;
    if (host) void host.dispose();
  }, []);

  const cueForStage = useCallback((stageId: string) =>
    definition.narration.cues.find(cue => cue.stageId === stageId),
  [definition.narration.cues]);

  const playStageNarration = useCallback((stageId: string) => {
    const host = hostRef.current;
    const cue = cueForStage(stageId);
    if (!host || !cue || !preferencesRef.current.audio) {
      host?.narration.stop();
      return Promise.resolve('silent');
    }
    return host.narration.play(cue.id).catch(() => 'silent');
  }, [cueForStage]);

  const applyView = useCallback((next: InteractiveInvestigationSnapshot<unknown>) => {
    adapterRef.current?.projectDomain(next.domain as Readonly<unknown>);
    hostRef.current?.applySnapshot(next.lesson);
    setView(next);
  }, []);

  const dispatch = useCallback((action: NormalizedAction) => {
    try {
      applyView(sessionRef.current.dispatch(action));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [applyView]);

  const launch = useCallback(async (enterVr: boolean) => {
    const mount = mountRef.current;
    if (!mount || launchingRef.current || hostRef.current) return;
    launchingRef.current = true;
    setStarted(true);
    setError(undefined);
    const launchPreferences = preferencesRef.current;
    const adapter = registration.createAdapter();
    adapterRef.current = adapter;
    let host: SimulationHost | undefined;
    try {
      host = createSimulationHost({
        mount,
        adapter,
        narration: definition.narration,
        preferences: {
          reducedMotion: launchPreferences.reducedMotion,
          seatedMode: launchPreferences.seated,
          locomotion: 'stationary',
          turnMode: launchPreferences.comfort ? 'snap' : 'none',
        },
        onAction: dispatch,
      });
      hostRef.current = host;
      await host.initialize();
      const initial = sessionRef.current.snapshot();
      applyView(initial);
      setReady(true);
      void playStageNarration(initial.lesson.stageId);
      if (enterVr) await host.enterVr();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      hostRef.current = undefined;
      adapterRef.current = undefined;
      if (host) await host.dispose();
    } finally {
      launchingRef.current = false;
    }
  }, [applyView, definition.narration, dispatch, playStageNarration, registration]);

  const choices = registration.choices(view);
  const visibleChoices = firstChoiceGroup(choices);
  const currentStage = definition.experience.stages[view.lesson.stageIndex];
  const assessment = definition.assessment.prompts.find(
    prompt => prompt.stageId === view.lesson.stageId,
  );
  const currentCue = cueForStage(view.lesson.stageId);

  const choose = useCallback((choice: InteractiveChoice) => {
    dispatch(actionForChoice(choice, view.lesson.stageId));
  }, [dispatch, view.lesson.stageId]);

  const answer = useCallback((promptId: string, optionId: string) => {
    dispatch({
      actionId: 'assessment.answer',
      targetEntityId: promptId,
      value: optionId,
      source: 'mouse',
      phase: 'commit',
      stageId: view.lesson.stageId,
      timestampMs: globalThis.performance?.now() ?? Date.now(),
    });
  }, [dispatch, view.lesson.stageId]);

  const goNext = useCallback(() => {
    const next = sessionRef.current.next();
    applyView(next);
    void playStageNarration(next.lesson.stageId);
  }, [applyView, playStageNarration]);

  const goPrevious = useCallback(() => {
    const next = sessionRef.current.previous();
    applyView(next);
    void playStageNarration(next.lesson.stageId);
  }, [applyView, playStageNarration]);

  const restart = useCallback(() => {
    hostRef.current?.narration.stop();
    const next = sessionRef.current.restart();
    applyView(next);
    void playStageNarration(next.lesson.stageId);
  }, [applyView, playStageNarration]);

  const primaryChoice = registration.primaryAction?.(view) ?? visibleChoices[0];
  const classContext = useMemo(() => {
    const grade = definition.module.slug.match(/^c(\d+)-/)?.[1];
    return `${grade ? `Class ${grade}` : 'School'} ${definition.module.subjects
      .map(subject => subject === 'environmentalScience'
        ? 'Environmental Science'
        : `${subject[0].toUpperCase()}${subject.slice(1)}`)
      .join(' / ')}`;
  }, [definition.module.slug, definition.module.subjects]);

  return (
    <SimulationExperienceShell
      simulationId={definition.module.id}
      title={definition.module.title}
      classContext={classContext}
      objective={definition.experience.objective}
      snapshot={view.lesson}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => { void launch(false); }}
      onEnterVr={() => { void launch(true); }}
      onPrevious={goPrevious}
      onNext={goNext}
      evidence={view.lesson.recordedEvidenceIds}
      completed={view.lesson.lessonComplete}
      completionEyebrow="Class journey complete"
      completionHeadline="Evidence recorded and ready for review"
      completionBody="Completion records the declared actions and observations. Mastery remains a separate evidence decision."
      completionActionLabel="Review final evidence"
      primaryAction={ready && primaryChoice && !assessment && !view.lesson.lessonComplete
        ? {
          label: primaryChoice.label,
          onActivate: () => choose(primaryChoice),
        }
        : undefined}
      assessment={assessment ? {
        promptId: assessment.id,
        question: assessment.question,
        options: assessment.options ?? [],
        feedback: view.feedback?.message,
        onAnswer: optionId => answer(assessment.id, optionId),
      } : undefined}
      feedback={!assessment ? view.feedback?.message : undefined}
      caption={preferences.subtitles ? currentCue?.caption : undefined}
      onReplayNarration={() => { void playStageNarration(view.lesson.stageId); }}
      onRestart={restart}
      helpText={`${definition.module.scientificConceptExplanation} ${definition.module.safetyNotes[0]}`}
      error={error}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <SimulationCanvasHost
          ref={mountRef}
          ariaLabel={`${definition.module.title} interactive scene`}
          style={{ width: '100%', height: '100%' }}
          busy={started && !ready && !error}
        />
        {ready && !assessment && visibleChoices.length > 1 && (
          <div
            aria-label="Investigation choices"
            style={{
              position: 'absolute',
              left: 18,
              top: 18,
              zIndex: 4,
              display: 'grid',
              gap: 8,
              width: 'min(340px, calc(100vw - 36px))',
              padding: 12,
              border: '1px solid rgba(125,211,252,.3)',
              borderRadius: 14,
              background: 'rgba(2,10,22,.9)',
            }}
          >
            {visibleChoices.map(choice => (
              <button
                key={choice.id}
                type="button"
                data-testid="interactive-choice"
                onClick={() => choose(choice)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid rgba(255,255,255,.16)',
                  borderRadius: 9,
                  background: 'rgba(14,116,144,.32)',
                  color: '#f8fafc',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </SimulationExperienceShell>
  );
}
