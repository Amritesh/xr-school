'use client';

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import * as THREE from 'three';
import { createLessonSession } from '@xr-school/simulation-runtime';
import {
  findImplementedSimulation,
} from '@xr-school/simulation-content';
import type {
  GuidedSimulationDefinition,
} from '@xr-school/simulation-schema';
import {
  createSimulationHost,
  type SimulationHost,
  type SimulationSceneAdapter,
} from '@xr-school/simulation-web';
import SimulationCanvasHost from '@/components/simulation-experience/SimulationCanvasHost';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import {
  createGuidedSimulationController,
  type GuidedSimulationController,
  type GuidedSimulationControllerView,
} from '@/lib/simulations/guided/createGuidedSimulationController';
import {
  createManagedVrHud,
  type ManagedVrHud,
} from './createManagedVrHud';

export interface GuidedSimulationViewerProps {
  definition: GuidedSimulationDefinition;
  sceneAdapter: SimulationSceneAdapter;
  experienceComponent?: ComponentType;
}

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

export default function GuidedSimulationViewer({
  definition,
  sceneAdapter,
  experienceComponent,
}: GuidedSimulationViewerProps) {
  if (experienceComponent) return createElement(experienceComponent);
  return createElement(ManagedGuidedSimulationViewer, {
    definition,
    sceneAdapter,
  });
}

function ManagedGuidedSimulationViewer({
  definition,
  sceneAdapter,
}: Omit<GuidedSimulationViewerProps, 'experienceComponent'>) {
  const record = findImplementedSimulation(definition.moduleId);
  if (!record || record.kind !== 'guided') {
    throw new Error(`Missing guided simulation record ${definition.moduleId}`);
  }

  const mountRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<SimulationHost | undefined>(undefined);
  const controllerRef = useRef<GuidedSimulationController | undefined>(undefined);
  const hudRef = useRef<ManagedVrHud | undefined>(undefined);
  const currentStageRef = useRef(definition.stages[0]);
  const launchingRef = useRef(false);
  const preferencesRef = useRef(DEFAULT_PREFERENCES);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [controllerView, setControllerView] = useState<
    GuidedSimulationControllerView
  >();
  const fallbackSnapshot = useRef(
    createLessonSession(record.experience).snapshot(),
  ).current;

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => () => {
    hudRef.current?.dispose();
    hudRef.current = undefined;
    const controller = controllerRef.current;
    const host = hostRef.current;
    controllerRef.current = undefined;
    hostRef.current = undefined;
    if (controller) void controller.dispose();
    else if (host) void host.dispose();
  }, []);

  const launch = useCallback(async (enterVr: boolean) => {
    const mount = mountRef.current;
    if (!mount || launchingRef.current || hostRef.current) return;
    launchingRef.current = true;
    setStarted(true);
    setError(undefined);

    const launchPreferences = preferencesRef.current;
    let host: SimulationHost | undefined;
    try {
      host = createSimulationHost({
        mount,
        adapter: sceneAdapter,
        narration: record.narration,
        preferences: {
          reducedMotion: launchPreferences.reducedMotion,
          seatedMode: launchPreferences.seated,
          locomotion: 'boundedTeleport',
          turnMode: launchPreferences.comfort ? 'snap' : 'none',
        },
        navigation: {
          movementBounds: new THREE.Box3(
            new THREE.Vector3(-4, -1, -4),
            new THREE.Vector3(4, 3, 4),
          ),
          teleportStepMeters: 0.7,
        },
        controllerActions: {
          onPrimary() {
            const stage = currentStageRef.current;
            hostRef.current?.dispatch({
              actionId: stage.requiredActionIds[0],
              targetEntityId: `${definition.moduleId}:primary:${stage.id}`,
              source: 'xr-controller',
              phase: 'commit',
              stageId: stage.id,
              timestampMs: globalThis.performance?.now() ?? Date.now(),
            });
          },
          onBack: () => controllerRef.current?.previous(),
          onNarrate: () => { void controllerRef.current?.replayNarration(); },
        },
        onAction(action) {
          controllerRef.current?.dispatch(action);
        },
        onEvidence(evidenceId) {
          controllerRef.current?.recordEvidence(evidenceId);
        },
      });
      hostRef.current = host;
      await host.initialize();
      const controller = createGuidedSimulationController({
        record,
        guidance: definition,
        host,
        onChange: setControllerView,
        narrationEnabled: () => preferencesRef.current.audio,
      });
      controllerRef.current = controller;
      hudRef.current = createManagedVrHud(host);
      setReady(true);
      if (enterVr) await host.enterVr();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      hudRef.current?.dispose();
      hudRef.current = undefined;
      if (controllerRef.current) await controllerRef.current.dispose();
      else if (host) await host.dispose();
      controllerRef.current = undefined;
      hostRef.current = undefined;
    } finally {
      launchingRef.current = false;
    }
  }, [definition, record, sceneAdapter]);

  const currentStage = controllerView?.stage ?? definition.stages[0];
  currentStageRef.current = currentStage;
  const snapshot = controllerView?.snapshot ?? fallbackSnapshot;
  const actionPerformed = snapshot.performedActionIds.includes(
    currentStage.requiredActionIds[0],
  );

  const activatePrimaryAction = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    host.dispatch({
      actionId: currentStage.requiredActionIds[0],
      targetEntityId: `${definition.moduleId}:primary:${currentStage.id}`,
      source: 'mouse',
      phase: 'commit',
      stageId: currentStage.id,
      timestampMs: globalThis.performance?.now() ?? Date.now(),
    });
  }, [currentStage, definition.moduleId]);

  useEffect(() => {
    const hud = hudRef.current;
    if (!hud) return;
    const assessment = controllerView?.assessment;
    const options = assessment?.options ?? [];
    hud.setContent({
      eyebrow: `Stage ${snapshot.stageIndex + 1} of ${definition.stages.length}`,
      title: currentStage.title,
      body: controllerView?.caption || currentStage.detail,
      hint: controllerView?.feedback ?? `Next: ${currentStage.actionLabel}`,
      choices: options.slice(0, 3).map(option => ({ label: option.label })),
      buttons: [
        ...(snapshot.stageIndex > 0 ? ['previous' as const] : []),
        'replay',
        'restart',
        'exit',
        ...(!assessment && !snapshot.lessonComplete ? ['next' as const] : []),
      ],
    }, {
      previous: () => controllerRef.current?.previous(),
      next: () => controllerRef.current?.next(),
      replay: () => { void controllerRef.current?.replayNarration(); },
      restart: () => controllerRef.current?.restart(),
      exit: () => { void hostRef.current?.exitVr(); },
      'choice-a': () => options[0] && controllerRef.current?.answer(options[0].id),
      'choice-b': () => options[1] && controllerRef.current?.answer(options[1].id),
      'choice-c': () => options[2] && controllerRef.current?.answer(options[2].id),
    });
  }, [controllerView, currentStage, definition.stages.length, snapshot]);

  return (
    <SimulationExperienceShell
      simulationId={record.module.id}
      title={record.module.title}
      classContext={definition.classContext}
      objective={definition.objective}
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => { void launch(false); }}
      onEnterVr={() => { void launch(true); }}
      onPrevious={() => controllerRef.current?.previous()}
      onNext={() => controllerRef.current?.next()}
      evidence={controllerView?.evidence ?? []}
      scaleNote={currentStage.scaleNote}
      completed={controllerView?.completed ?? false}
      completionEyebrow={definition.completion.eyebrow}
      completionHeadline={definition.completion.headline}
      completionBody={definition.completion.body}
      completionActionLabel={definition.completion.actionLabel}
      primaryAction={ready && !(controllerView?.completed ?? false) ? {
        label: currentStage.actionLabel,
        disabled: actionPerformed,
        onActivate: activatePrimaryAction,
      } : undefined}
      assessment={controllerView?.assessment ? {
        promptId: controllerView.assessment.id,
        question: controllerView.assessment.question,
        options: controllerView.assessment.options ?? [],
        selectedId: controllerView.selectedId,
        feedback: controllerView.feedback,
        onAnswer: optionId => controllerRef.current?.answer(optionId),
      } : undefined}
      caption={preferences.subtitles ? controllerView?.caption : undefined}
      feedback={controllerView?.feedback}
      onReplayNarration={() => { void controllerRef.current?.replayNarration(); }}
      onRestart={() => controllerRef.current?.restart()}
      helpText={`${currentStage.detail} ${record.module.safetyNotes[0]}`}
      error={error}
    >
      <SimulationCanvasHost
        ref={mountRef}
        ariaLabel={`${record.module.title} interactive scene`}
        busy={started && !ready && !error}
      />
    </SimulationExperienceShell>
  );
}
