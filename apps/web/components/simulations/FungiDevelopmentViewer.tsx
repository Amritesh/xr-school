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
  FUNGAL_DEVELOPMENT_STAGES,
  FUNGI_MISSIONS,
  type FungalDevelopmentStage,
  type FungiInputSource,
  type FungiMissionId,
} from '@/lib/fungi/fungiExperienceDirector';
import type { FungalUsefulActorId, FungalUsefulRole } from '@xr-school/simulation-runtime';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import { resolveFocusGuide } from '@/lib/world-builder/focusGuidance';
import { createVrHudPanel, type VrHudContent } from '@/lib/vr/vrHudPanel';
import { createVrLocomotion } from '@/lib/vr/vrLocomotion';
import { createVrPlayerRig } from '@/lib/vr/vrPlayerRig';
import type { FocusGuideDirection } from '@/components/simulation-experience/ExperienceFocusGuide';
import './fungi-nursery-lab.css';

/** Where a headset learner stands when the forest opens, facing the table. */
const VR_SPAWN = {
  position: new THREE.Vector3(0, 0, 6.5),
  lookAt: new THREE.Vector3(0, 1.1, 0),
};

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

/** The story the class hears, scene by scene, straight from the script. */
const SCENE_NARRATION: Readonly<Record<FungiMissionId, string>> = {
  diagnose:
    'Welcome, young explorers! Today you will enter the hidden world of fungi. Look around carefully. Fungi are living organisms, but they are not plants — they do not make their own food.',
  mycelium:
    'Inside the mushroom are tiny thread-like structures called hyphae. Many hyphae together form a mycelium. Notice how the threads spread through the soil and wood — this helps fungi absorb nutrients.',
  'spore-flight':
    'These tiny particles are called spores. They are the reproductive units of fungi. When a spore lands on a warm, moist place, it begins to grow.',
  'growth-chamber':
    'Watch the complete development of a fungus: a spore lands on the bread, a hypha grows, mycelium spreads, spore-producing structures develop, and new spores are released.',
  'useful-fungi':
    'Fungi are very useful. Yeast helps make bread and cakes, some fungi help make medicines such as antibiotics, and fungi decompose dead matter to recycle nutrients in nature.',
  safety:
    'Not all fungi are beneficial. Some cause diseases in plants and humans, and some spoil our food.',
  recommendation:
    'You have completed your journey through the fungal kingdom! Fungi grow through hyphae, develop from spores, help nature by decomposition, and can be both useful and harmful.',
};

/** Day 1 to Day 5 across the model's 0-120 hour window. */
const TIMELAPSE_HOURS = 120;
const TIMELAPSE_SECONDS = 8;

function dayLabel(elapsedHours: number): string {
  const day = Math.min(5, Math.floor((elapsedHours / TIMELAPSE_HOURS) * 5) + 1);
  const caption = [
    'No visible growth',
    'Tiny white threads appear',
    'Cotton-like growth spreads',
    'Black spots form',
    'New spores are released',
  ][day - 1];
  return `Day ${day} — ${caption}`;
}

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

/** The three workplaces of the script, and the role each one stands for. */
const WORKPLACES: ReadonlyArray<{ id: string; label: string; role: FungalUsefulRole }> = [
  { id: 'bakery', label: '🥖 Bakery', role: 'food' },
  { id: 'laboratory', label: '🧪 Laboratory', role: 'medicine' },
  { id: 'compost-pit', label: '🍂 Compost pit', role: 'decomposer' },
];

/** The script's five stages, in the words a child sees on each chip. */
const STAGE_LABEL: Readonly<Record<FungalDevelopmentStage, string>> = {
  'spore-lands': 'A spore lands on the bread',
  'hypha-grows': 'A hypha grows',
  'mycelium-spreads': 'Mycelium spreads',
  'structures-form': 'Spore structures form',
  'spores-release': 'New spores are released',
};

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
  const [nextStep, setNextStep] = useState('');
  const [lesson, setLesson] = useState<LessonSnapshot>(lessonRef.current.snapshot());
  const [evidence, setEvidence] = useState<string[]>([]);
  // Narrow viewports have no free room, so the tools begin as a closed sheet.
  const [stageOrder, setStageOrder] = useState<FungalDevelopmentStage[]>([]);
  const [drawerCollapsed, setDrawerCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 820,
  );
  const [runtimeError, setRuntimeError] = useState('');
  const [vrSupported, setVrSupported] = useState(false);
  const [focusGuide, setFocusGuide] = useState<{
    direction: FocusGuideDirection;
    visible: boolean;
    label: string;
  }>({ direction: 'forward', visible: false, label: '' });

  const interactionRef = useRef<ReturnType<typeof createInteractionSystem> | null>(null);
  const hudRef = useRef<ReturnType<typeof createVrHudPanel> | null>(null);
  const playerRigRef = useRef<THREE.Object3D | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const replayRef = useRef<() => void>(() => {});
  const focusPointRef = useRef(new THREE.Vector3());

  /**
   * The shared edge guide, per the guided-VR language: silent while the target
   * is in the middle of the view, and only pointing from the edge once the
   * learner has looked away from it.
   */
  const publishFocusGuide = useCallback((pickId: string | undefined) => {
    const controller = controllerRef.current;
    const mount = mountRef.current;
    if (!controller || !mount || pickId === undefined) {
      setFocusGuide((current) => (current.visible ? { ...current, visible: false } : current));
      return;
    }
    const bounds = controller.pickBounds(pickId);
    const camera = controller.camera;
    if (!bounds || !camera) return;
    bounds.getCenter(focusPointRef.current).project(camera);
    const resolved = resolveFocusGuide({
      x: focusPointRef.current.x,
      y: focusPointRef.current.y,
      z: focusPointRef.current.z,
    });
    setFocusGuide((current) =>
      current.visible === resolved.visible && current.direction === resolved.direction
        ? current
        : { ...resolved, label: 'Look here' },
    );
  }, []);
  const [timelapsePlaying, setTimelapsePlaying] = useState(false);
  const timelapseRef = useRef<number | null>(null);

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
    const panel = drawerRef.current?.getBoundingClientRect();
    // The shell paints its own top bar and caption band, and a stage card in
    // the lower left. Measure both so the apparatus is composed in the clear
    // band between them rather than hidden behind either.
    const insets = { top: 150, right: 24, bottom: 24, left: 24 };
    const shellCaption = document
      .querySelector('.simulation-experience__caption')
      ?.getBoundingClientRect();
    if (shellCaption) {
      insets.top = Math.max(insets.top, shellCaption.bottom - bounds.top + 16);
    }
    const dock = document
      .querySelector('.simulation-experience__mission-dock')
      ?.getBoundingClientRect();
    if (dock) {
      insets.bottom = Math.max(insets.bottom, bounds.bottom - dock.top + 16);
    }
    if (panel) {
      if (panel.width < bounds.width * 0.6) {
        insets.right = Math.max(insets.right, bounds.right - panel.left + 12);
      } else {
        insets.bottom = Math.max(insets.bottom, bounds.bottom - panel.top + 12);
      }
    }
    controller.setViewport(bounds.width, bounds.height, insets);
  }, []);

  /**
   * Mirrors completed scenes into the authored lesson ledger. The ledger is
   * bookkeeping: it must never be able to stop the science. Previously a
   * desync here threw and paused the whole experience mid-lesson.
   */
  const syncLesson = useCallback((snapshot: FungiViewerSnapshot) => {
    for (const missionId of snapshot.director.completedMissionIds) {
      if (recordedMissionsRef.current.has(missionId)) continue;
      recordedMissionsRef.current.add(missionId);
      try {
        const stageId = MISSION_STAGE[missionId];
        let next = lessonRef.current.snapshot();

        // Walk the ledger to the stage this scene closes before recording
        // against it — actions are only valid on their own stage.
        let guard = 0;
        while (next.stageId !== stageId && guard < next.stageCount) {
          next = lessonRef.current.next();
          guard += 1;
        }

        const actionId = MISSION_ACTION[missionId];
        if (next.stageId === stageId && !next.performedActionIds.includes(actionId)) {
          next = lessonRef.current.performAction(actionId);
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
      } catch {
        // A ledger mismatch is not a reason to end the lesson. The scene the
        // learner completed still stands.
        setEvidence((items) =>
          items.includes(MISSION_TITLE[missionId])
            ? items
            : [...items, MISSION_TITLE[missionId]],
        );
      }
    }
  }, []);

  const publish = useCallback(
    (snapshot: FungiViewerSnapshot) => {
      setView(snapshot);
      setNextStep(controllerRef.current?.nextStep() ?? '');
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

  /**
   * The five-day time-lapse: a real loop that drives the biological model
   * forward hour by hour so the class watches the mould actually grow.
   */
  const playTimelapse = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller || timelapseRef.current !== null) return;
    setTimelapsePlaying(true);
    let startedAt: number | null = null;

    const step = (now: number) => {
      startedAt ??= now;
      let progress = Math.min(1, (now - startedAt) / (TIMELAPSE_SECONDS * 1000));
      try {
        publish(
          controller.manipulate(
            {
              type: 'growth-input-set',
              field: 'elapsedHours',
              value: progress * TIMELAPSE_HOURS,
            },
            BROWSER_SOURCE,
          ),
        );
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
        progress = 1;
      }
      if (progress < 1) {
        timelapseRef.current = window.requestAnimationFrame(step);
        return;
      }
      timelapseRef.current = null;
      setTimelapsePlaying(false);
    };

    timelapseRef.current = window.requestAnimationFrame(step);
  }, [publish]);

  useEffect(
    () => () => {
      if (timelapseRef.current !== null) {
        window.cancelAnimationFrame(timelapseRef.current);
        timelapseRef.current = null;
      }
    },
    [],
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
    scene.background = new THREE.Color(0x16241a);
    scene.fog = new THREE.Fog(0x16241a, 22, 60);
    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 200);

    // Dappled forest light: a warm key through the canopy, a cool sky fill,
    // and a soft rim so the apparatus separates from the background.
    const key = new THREE.DirectionalLight(0xfff0d2, 3.1);
    key.position.set(6, 12, 8);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe3ff, 1.1);
    rim.position.set(-7, 6, -5);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xd8ecd2, 0x2c3a26, 2.1));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

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
            const attention = controller?.attentionTarget();
            interaction?.setSuggested(attention);
            publishFocusGuide(attention);
          },
        },
      });
      runtimeRef.current = runtime;
      void runtime.initialize();

      // ── One set of targets, reachable by mouse and by controller ray ──
      const vrRig = createVrPlayerRig({
        renderer: runtime.renderer,
        scene,
        camera,
        spawn: VR_SPAWN,
        rayColor: '#ffd166',
      });
      playerRigRef.current = vrRig.rig;

      const hud = createVrHudPanel({ scene });
      hudRef.current = hud;

      const interaction = createInteractionSystem({
        camera,
        domElement: runtime.renderer.domElement,
        xrControllers: vrRig.controllers,
        onSelect: (id, _object, source) => {
          const hudButton = hud.buttonIdFor(id);
          if (hudButton) {
            if (hudButton === 'replay') replayRef.current();
            if (hudButton === 'exit') void runtime?.renderer.xr.getSession()?.end();
            return;
          }
          const live = controllerRef.current;
          if (!live) return;
          try {
            publish(live.interactWith(id, source === 'xr-controller' ? 'xr-controller' : 'mouse'));
            setRuntimeError('');
          } catch (error) {
            setRuntimeError(error instanceof Error ? error.message : String(error));
          }
        },
      });
      interactionRef.current = interaction;

      for (const mesh of Object.values(hud.buttons)) {
        interaction.register(mesh.name, mesh);
      }
      for (const [pickId, target] of Object.entries(controller.pickTargets)) {
        interaction.register(pickId, target, { highlightColor: '#ffd166' });
      }

      const locomotion = createVrLocomotion({
        renderer: runtime.renderer,
        rig: vrRig.rig,
        reducedMotion: preferences.reducedMotion,
        onBack: () => {
          void runtime?.renderer.xr.getSession()?.end();
        },
      });

      cleanupRef.current = () => {
        locomotion.dispose();
        interaction.dispose();
        hud.dispose();
        vrRig.dispose();
      };

      syncViewport();
      observer = new ResizeObserver(() => syncViewport());
      observer.observe(mount);
      setView(controller.snapshot());
      setNextStep(controller.nextStep());
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }

    return () => {
      observer?.disconnect();
      stopSimulationNarration();
      cleanupRef.current?.();
      cleanupRef.current = null;
      controller?.dispose();
      controllerRef.current = null;
      interactionRef.current = null;
      hudRef.current = null;
      void runtime?.dispose();
      runtimeRef.current = null;
    };
  }, [started, preferences.reducedMotion, syncViewport, publish, publishFocusGuide]);

  useEffect(() => {
    controllerRef.current?.setReducedMotion(preferences.reducedMotion);
  }, [preferences.reducedMotion]);

  useEffect(() => {
    if (!('xr' in navigator)) return;
    void (navigator as Navigator & {
      xr: { isSessionSupported(mode: string): Promise<boolean> };
    }).xr
      .isSessionSupported('immersive-vr')
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  /** The same lesson, entered from a headset instead of a browser tab. */
  const enterVr = useCallback(async () => {
    const renderer = runtimeRef.current?.renderer;
    if (!renderer) return;
    try {
      const session = await (
        navigator as Navigator & {
          xr: { requestSession(mode: string, options: XRSessionInit): Promise<XRSession> };
        }
      ).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await renderer.xr.setSession(session);
      setStarted(true);
    } catch (error) {
      setRuntimeError(
        error instanceof Error ? error.message : 'The headset could not start immersive mode.',
      );
    }
  }, []);

  const missionIndex = view?.director.missionIndex ?? 0;
  /**
   * The shell paints one caption band. It carries the scene's story; the
   * moment-to-moment feedback lives beside the tools, so no two texts ever
   * share a position.
   */
  const sceneCaption = view ? SCENE_NARRATION[view.director.missionId] : '';
  const caption =
    FUNGI_DEVELOPMENT_NARRATION.cues[missionIndex]?.caption ??
    EXPERIENCE.stages[missionIndex]?.cue ??
    '';

  /**
   * The script is a spoken story, so each scene narrates itself on arrival.
   * Honours the audio preference and never speaks over itself.
   */
  const spokenSceneRef = useRef<FungiMissionId | undefined>(undefined);
  useEffect(() => {
    if (!started || !view) return;
    const missionId = view.director.missionId;
    if (spokenSceneRef.current === missionId) return;
    spokenSceneRef.current = missionId;
    stopSimulationNarration();
    if (!preferences.audio) return;
    void playSimulationNarration(
      SCENE_NARRATION[missionId],
      view.director.missionIndex,
    );
  }, [started, view, preferences.audio]);

  useEffect(() => () => stopSimulationNarration(), []);

  const replayNarration = useCallback(() => {
    stopSimulationNarration();
    if (!preferences.audio || !view) return;
    void playSimulationNarration(
      SCENE_NARRATION[view.director.missionId],
      missionIndex,
    );
  }, [missionIndex, preferences.audio, view]);

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
    setNextStep(controller.nextStep());
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
              <legend>Five-day time lapse</legend>
              <p className="fungi-lab__day" data-testid="fungi-day-readout">
                {dayLabel(tools.growthInput.elapsedHours)}
              </p>
              <button
                type="button"
                data-testid="fungi-play-timelapse"
                disabled={timelapsePlaying}
                onClick={playTimelapse}
              >
                {timelapsePlaying ? 'Growing…' : '▶ Watch 5 days pass'}
              </button>
            </fieldset>
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
              <legend>Put the days in order</legend>
              <ol className="fungi-lab__order" data-testid="fungi-stage-order">
                {stageOrder.map((stage, index) => (
                  <li key={stage}>
                    <span className="fungi-lab__order-index">{index + 1}</span>
                    {STAGE_LABEL[stage]}
                  </li>
                ))}
                {stageOrder.length === 0 ? <li className="fungi-lab__order-empty">Tap the stages below in the order they happen</li> : null}
              </ol>
              <div className="fungi-lab__row">
                {FUNGAL_DEVELOPMENT_STAGES.filter((stage) => !stageOrder.includes(stage)).map(
                  (stage) => (
                    <button
                      key={stage}
                      type="button"
                      data-testid={`fungi-stage-${stage}`}
                      onClick={() => {
                        const next = [...stageOrder, stage];
                        setStageOrder(next);
                        if (next.length === FUNGAL_DEVELOPMENT_STAGES.length) {
                          act('growth.order-stages', { value: next });
                          setStageOrder([]);
                        }
                      }}
                    >
                      {STAGE_LABEL[stage]}
                    </button>
                  ),
                )}
              </div>
              {stageOrder.length > 0 ? (
                <div className="fungi-lab__row">
                  <button
                    type="button"
                    data-testid="fungi-stage-clear"
                    onClick={() => setStageOrder([])}
                  >
                    Start again
                  </button>
                </div>
              ) : null}
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
              <legend>Pick up a fungus, then click where it works</legend>
              <div className="fungi-lab__row">
                {USEFUL_ACTORS.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    data-testid={`fungi-carry-${actor.id}`}
                    aria-pressed={tools.grabbedActorId === actor.id}
                    onClick={() => manipulate({ type: 'token-grab', actorId: actor.id })}
                  >
                    {actor.label}
                  </button>
                ))}
              </div>
              <div className="fungi-lab__row">
                {WORKPLACES.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    data-testid={`fungi-place-${place.id}`}
                    disabled={tools.grabbedActorId === undefined}
                    onClick={() => {
                      const carried = tools.grabbedActorId;
                      if (carried === undefined) return;
                      manipulate({ type: 'role-drop', actorId: carried, role: place.role });
                    }}
                  >
                    {place.label}
                  </button>
                ))}
              </div>
              <p className="fungi-lab__carry" data-testid="fungi-carrying">
                {tools.grabbedActorId
                  ? `Carrying ${
                      USEFUL_ACTORS.find((actor) => actor.id === tools.grabbedActorId)?.label
                    } — now click the bakery, the laboratory or the compost pit.`
                  : 'Pick one up to carry it.'}
              </p>
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
      caption={preferences.subtitles ? sceneCaption : undefined}
      onEnterVr={vrSupported ? () => void enterVr() : undefined}
      focusGuide={focusGuide}
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

        {view?.director.journeyComplete ? (
          <div className="fungi-lab__complete" data-testid="fungi-mission-complete" role="status">
            <p className="fungi-lab__complete-badge">🍄</p>
            <h2>Mission Complete: Fungi Explorer</h2>
            <p>
              You found the fungi, traced a mycelium, flew a spore, watched five
              days of growth, put fungi to work, and kept your food safe.
            </p>
            <button type="button" data-testid="fungi-complete-restart" onClick={restart}>
              Explore again
            </button>
          </div>
        ) : null}

        {/* One panel. Everything the learner needs, nothing floating loose. */}
        <section
          className="fungi-lab__panel"
          ref={drawerRef}
          data-testid="fungi-tool-drawer"
          data-collapsed={drawerCollapsed}
          aria-label="Fungi lab controls"
        >
          <header className="fungi-lab__panel-head" ref={stripRef}>
            <p className="fungi-lab__scene">
              <span className="fungi-lab__scene-count">
                Scene {missionIndex + 1} of {FUNGI_MISSIONS.length}
              </span>
              <span className="fungi-lab__scene-name" data-testid="fungi-current-mission">
                {view ? MISSION_TITLE[view.director.missionId] : ''}
              </span>
            </p>
            <button
              type="button"
              className="fungi-lab__collapse"
              data-testid="fungi-toggle-drawer"
              aria-expanded={!drawerCollapsed}
              onClick={() => {
                setDrawerCollapsed((collapsed) => !collapsed);
                window.requestAnimationFrame(syncViewport);
              }}
            >
              {drawerCollapsed ? 'Show' : 'Hide'}
            </button>
          </header>

          <ol
            className="fungi-lab__dots"
            aria-label="Scene progress"
            data-testid="fungi-mission-strip"
          >
            {FUNGI_MISSIONS.map((mission) => {
              const completed = view?.director.completedMissionIds.includes(mission.id);
              const current = view?.director.missionId === mission.id;
              return (
                <li
                  key={mission.id}
                  className="fungi-lab__dot"
                  data-state={current ? 'current' : completed ? 'complete' : 'pending'}
                  data-complete={completed ? 'true' : 'false'}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="sr-only">{MISSION_TITLE[mission.id]}</span>
                </li>
              );
            })}
          </ol>

          <p className="fungi-lab__nextstep" data-testid="fungi-next-step" aria-live="polite">
            {nextStep}
          </p>

          <div className="fungi-lab__panel-body">
            {renderMissionTools()}

            <p className="fungi-lab__caption" data-testid="fungi-caption" aria-live="polite">
              {view?.director.feedback?.outcome ?? ''}
            </p>
          </div>

          <footer className="fungi-lab__panel-foot">
            <button type="button" data-testid="fungi-request-hint" onClick={() => act('director.request-hint')}>
              Hint
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
              Reset step
            </button>
            <button type="button" data-testid="fungi-restart-journey" onClick={restart}>
              Restart
            </button>
            <span className="sr-only" data-testid="fungi-evidence-notebook">
              {evidence.length === 0 ? 'No evidence recorded yet' : evidence.join(', ')}
            </span>
          </footer>
        </section>
      </div>
    </SimulationExperienceShell>
  );
}
