'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  NormalizedInputSource,
} from '../../../../packages/simulation-schema/src/index';
import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/experience/lessonSession';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { createVrHudPanel, type VrHudContent } from '@/lib/vr/vrHudPanel';
import { createVrLocomotion } from '@/lib/vr/vrLocomotion';
import { createVrPlayerRig } from '@/lib/vr/vrPlayerRig';
import {
  SOLAR_SYSTEM_EXPERIENCE_DEFINITION,
  createSolarSystemExperience,
  type SolarSystemExperience,
} from '@/lib/world-builder/solarSystemExperience';
import {
  createSolarSystemScene,
  ECLIPTIC_Y,
  type SolarSystemScene,
} from '@/lib/world-builder/solarSystemScene';
import {
  SCALE_DISCLOSURE,
  SOLAR_PLANETS,
  getPlanet,
  verifySolarAstronomy,
  type CometTailChoice,
  type PlanetId,
} from '@/lib/world-builder/solarSystemAstronomy';
import {
  createSolarSystemObservatory,
  type ObservatoryLayer,
  type ObservatorySnapshot,
  type ObservatoryTimePreset,
} from '@/lib/world-builder/solarSystemObservatory';
import {
  resolveFocusGuide,
  type FocusGuideVisibility,
} from '@/lib/world-builder/focusGuidance';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';
import {
  computeFocusFrame,
  createGuidedCamera,
  type CameraFrame,
} from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';

const NARRATIONS = [
  'You are drifting above the plane of the solar system, and nothing out here stands still. Eight worlds are circling one ordinary star. Find the body every path bends around, and select it.',
  'This is the engine of the whole system: gravity. You cannot see it, so we built a lens that can. Power it on and watch how the Sun’s pull is fierce up close and fades far away. That one fact explains almost everything you will see today.',
  'If gravity is stronger close in, what should that do to a planet’s speed? Mercury, Earth, and Mars are lined up for one full lap of the Sun. Lock in your prediction, then trust the lap board — not your instinct.',
  'Mercury hugs the Sun, so it must be the hottest world. Or is it? Choose your suspect, then aim the infrared probe at Mercury and at Venus. The numbers do not lie.',
  'Now we cross the asteroid belt into giant country. Jupiter could swallow every other planet, Saturn’s rings are a billion orbiting icebergs, Uranus rolls on its side, and Neptune howls with supersonic wind. Inspect each one up close.',
  'Every poster you have ever seen lies about one thing: distance. Pull the lever and let the solar system stretch to its honest proportions. Then try to find Earth.',
  'A visitor from the frozen edge is falling toward the Sun, and as it warms it grows a tail. Before you ride alongside — which way will that tail point? Choose an arrow.',
  'Final problem, explorer. A new probe orbits the Sun from twice Earth’s distance. You have seen what distance does to gravity and speed. Is that probe’s year longer or shorter than ours? Answer, then collect your badge.',
];

const ACTION_LABELS: Record<string, string> = {
  'inspect-sun': 'Select the Sun',
  'toggle-gravity-lens': 'Power the gravity lens',
  'predict-race-winner': 'Predict the race winner',
  'confirm-race-winner': 'Select the actual winner',
  'predict-hottest': 'Predict the hottest planet',
  'probe-mercury': 'Probe Mercury',
  'probe-venus': 'Probe Venus',
  'scan-jupiter': 'Inspect Jupiter',
  'scan-saturn': 'Inspect Saturn',
  'scan-uranus': 'Inspect Uranus',
  'scan-neptune': 'Inspect Neptune',
  'pull-scale-lever': 'Pull the true-scale lever',
  'find-earth': 'Find Earth',
  'predict-comet-tail': 'Predict the tail direction',
  'ride-comet': 'Ride the comet',
  'answer-orbit-transfer': 'Answer: longer or shorter year?',
  'collect-badge': 'Collect your mission badge',
};

const EVIDENCE_LABELS: Record<string, string> = {
  'system-observed': 'All eight planets orbit one central star — the Sun',
  'gravity-visualised': 'The Sun’s pull is strongest close in and fades with distance',
  'closer-is-faster': 'Mercury lapped first: closer planets feel stronger gravity and orbit faster',
  'greenhouse-resolved': 'Venus (464°C) beats Mercury (167°C) — its CO₂ blanket traps the heat',
  'giants-compared': 'The four giants dwarf the rocky worlds, each with a signature feature',
  'scale-confronted': 'At true spacing the planets are specks separated by vast emptiness',
  'comet-tail-observed': 'The comet’s tail pointed away from the Sun all the way round',
  'transfer-proved': 'A farther orbit means a slower, longer year — Kepler’s law, transferred',
};

/** Per-stage pause before auto-advancing, so the observation lands first. */
const ADVANCE_DELAY_MS = [2600, 5200, 2600, 3000, 1800, 4600, 2400, 0];

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

const OPENING_FRAME: CameraFrame = {
  position: new THREE.Vector3(6.6, 5.4, 9.4),
  target: new THREE.Vector3(0, ECLIPTIC_Y, 0),
};

const VR_SPAWN = {
  position: new THREE.Vector3(0, 0, 5.6),
  lookAt: new THREE.Vector3(0, ECLIPTIC_Y, 0),
};

/** Objects the passive "click me next" pulse may sit on. Prediction and
 * assessment actions deliberately have no suggested target — pulsing one
 * option would answer the question for the learner. */
const SUGGESTED_TARGET_BY_ACTION: Record<string, string | undefined> = {
  'inspect-sun': 'inspect-sun',
  'toggle-gravity-lens': 'toggle-gravity-lens',
  'probe-mercury': 'planet-mercury',
  'probe-venus': 'planet-venus',
  'scan-jupiter': 'planet-jupiter',
  'scan-saturn': 'planet-saturn',
  'scan-uranus': 'planet-uranus',
  'scan-neptune': 'planet-neptune',
  'pull-scale-lever': 'pull-scale-lever',
  'find-earth': 'planet-earth',
  'ride-comet': 'ride-comet',
  'collect-badge': 'collect-badge',
};

/** Options offered in the HTML tray (accessibility-equivalent controls). */
const TRAY_CHOICES: Record<string, Array<{ label: string; arg?: string }>> = {
  'predict-race-winner': [
    { label: 'Mercury will finish first', arg: 'mercury' },
    { label: 'Earth will finish first', arg: 'earth' },
    { label: 'Mars will finish first', arg: 'mars' },
  ],
  'confirm-race-winner': [
    { label: 'Mercury won', arg: 'mercury' },
    { label: 'Earth won', arg: 'earth' },
    { label: 'Mars won', arg: 'mars' },
  ],
  'predict-hottest': [
    { label: 'Mercury is hottest', arg: 'mercury' },
    { label: 'Venus is hottest', arg: 'venus' },
  ],
  'predict-comet-tail': [
    { label: 'Tail points toward the Sun', arg: 'toward-sun' },
    { label: 'Tail trails behind its motion', arg: 'behind-motion' },
    { label: 'Tail points away from the Sun', arg: 'away-from-sun' },
  ],
  'answer-orbit-transfer': [
    { label: 'Its year is longer', arg: 'longer' },
    { label: 'Its year is shorter', arg: 'shorter' },
  ],
};

function isObjectActionSource(source: NormalizedInputSource) {
  return source === 'xr-controller' || source === 'mouse';
}

function playNarration(stageIndex: number, enabled: boolean) {
  if (!enabled) return;
  void playSimulationNarration(NARRATIONS[stageIndex], stageIndex);
}

export default function SolarSystemMissionViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const guidedCameraRef = useRef<ReturnType<typeof createGuidedCamera> | null>(null);
  const sceneApiRef = useRef<SolarSystemScene | null>(null);
  const experienceRef = useRef<SolarSystemExperience>(createSolarSystemExperience());
  const observatoryRef = useRef(createSolarSystemObservatory());
  const snapshotRef = useRef<LessonSnapshot>(experienceRef.current.snapshot());
  const previousRef = useRef<() => void>(() => {});
  const nextRef = useRef<() => void>(() => {});
  const replayRef = useRef<() => void>(() => {});
  const selectRef = useRef<(objectId: string, source: NormalizedInputSource) => void>(() => {});
  const completedRef = useRef(false);
  const evidenceRef = useRef<string[]>([]);
  const focusActionRef = useRef<string | undefined>(undefined);
  const noteRef = useRef('');
  const pendingCometEvidenceRef = useRef(false);
  const wideScaleShotFiredRef = useRef(false);
  const observatoryOpenRef = useRef(false);

  const [snapshot, setSnapshot] = useState(snapshotRef.current);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [observatoryOpen, setObservatoryOpen] = useState(false);
  const [observatorySnapshot, setObservatorySnapshot] = useState<ObservatorySnapshot>(
    observatoryRef.current.snapshot(),
  );
  const [observatoryAnnouncement, setObservatoryAnnouncement] = useState('');
  const [vrSupported, setVrSupported] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [missionNote, setMissionNote] = useState('');
  const [focusVisibility, setFocusVisibility] = useState<FocusGuideVisibility>({
    direction: 'forward',
    visible: false,
  });
  const focusVisibilityRef = useRef(focusVisibility);

  useEffect(() => { completedRef.current = completed; }, [completed]);
  useEffect(() => { evidenceRef.current = evidence; }, [evidence]);
  useEffect(() => { noteRef.current = missionNote; }, [missionNote]);
  useEffect(() => { observatoryOpenRef.current = observatoryOpen; }, [observatoryOpen]);

  const currentStage = SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages[snapshot.stageIndex];
  const remainingActions = useMemo(
    () => currentStage.requiredActionIds.filter(
      actionId => !snapshot.performedActionIds.includes(actionId),
    ),
    [currentStage, snapshot.performedActionIds],
  );
  focusActionRef.current = remainingActions[0];

  const note = useCallback((text: string) => setMissionNote(text), []);

  const applySnapshot = useCallback((value: LessonSnapshot) => {
    snapshotRef.current = value;
    setSnapshot(value);
  }, []);

  const recordStageEvidence = useCallback(() => {
    const active = experienceRef.current.snapshot();
    const stage = SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages[active.stageIndex];
    let next = active;
    for (const evidenceId of stage.completionEvidenceIds) {
      if (!next.recordedEvidenceIds.includes(evidenceId)) {
        next = experienceRef.current.observe(evidenceId);
        const label = EVIDENCE_LABELS[evidenceId];
        setEvidence(values => (values.includes(label) ? values : [...values, label]));
      }
    }
    applySnapshot(next);
    return next;
  }, [applySnapshot]);

  // ── Cinematic camera shots, computed from the live orbiting world ──────
  const focusStage = useCallback((stageIndex: number, animate = true) => {
    const guidedCamera = guidedCameraRef.current;
    const camera = cameraRef.current;
    const world = sceneApiRef.current;
    if (!guidedCamera || !camera || !world) return;
    const sunTarget = new THREE.Vector3(0, ECLIPTIC_Y, 0);
    const frames: Array<() => CameraFrame> = [
      () => OPENING_FRAME,
      // Authored shot: the corona sprite inflates the Sun's bounding sphere,
      // so a fitted frame would land far too wide for the gravity-lens beat.
      () => ({
        position: new THREE.Vector3(2.7, 2.9, 4.3),
        target: new THREE.Vector3(0.6, ECLIPTIC_Y - 0.15, 0.8),
      }),
      () => ({ position: new THREE.Vector3(2.4, 7.6, 6.2), target: sunTarget }),
      () => computeFocusFrame([world.planets.mercury.group, world.planets.venus.group], camera, {
        approachFrom: new THREE.Vector3(0, 2.6, 7), fitPadding: 1.6, elevation: 0.24,
      }),
      () => computeFocusFrame(
        [world.planets.jupiter.group, world.planets.saturn.group, world.planets.uranus.group, world.planets.neptune.group],
        camera,
        { approachFrom: new THREE.Vector3(2, 5, 15), fitPadding: 0.72, elevation: 0.26 },
      ),
      () => ({ position: new THREE.Vector3(-2.6, 5.4, 9.6), target: sunTarget }),
      () => computeFocusFrame(world.comet, camera, {
        approachFrom: new THREE.Vector3(-4, 3.4, 8), fitPadding: 3.6, elevation: 0.16,
      }),
      () => ({
        position: new THREE.Vector3(0, ECLIPTIC_Y + 0.9, 5.9),
        target: new THREE.Vector3(0, ECLIPTIC_Y + 0.7, 1.6),
      }),
    ];
    guidedCamera.focusOn(frames[stageIndex]?.() ?? OPENING_FRAME, { animate });
  }, []);

  const advanceStage = useCallback((delayMs: number) => {
    const scheduledFromStage = experienceRef.current.snapshot().stageIndex;
    window.setTimeout(() => {
      try {
        const current = experienceRef.current.snapshot();
        // The learner may have already advanced (Continue button, VR Next)
        // while this pause ran — never advance a stage we didn't schedule.
        if (current.stageIndex !== scheduledFromStage) return;
        if (!current.stageComplete || current.lessonComplete) return;
        const advanced = experienceRef.current.next();
        applySnapshot(advanced);
        sceneApiRef.current?.setStage(advanced.stageIndex);
        focusStage(advanced.stageIndex);
        setMissionNote('');
        playNarration(advanced.stageIndex, preferences.audio);
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
    }, delayMs);
  }, [applySnapshot, focusStage, preferences.audio]);

  const performLessonAction = useCallback((
    actionId: string,
    source: NormalizedInputSource,
    options: { deferEvidence?: boolean } = {},
  ) => {
    const before = experienceRef.current.snapshot();
    const stage = SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages[before.stageIndex];
    if (!stage.requiredActionIds.includes(actionId) || before.performedActionIds.includes(actionId)) return;
    try {
      let next = experienceRef.current.perform(actionId);
      applySnapshot(next);
      const allPerformed = stage.requiredActionIds.every(
        id => next.performedActionIds.includes(id),
      );
      if (allPerformed && !options.deferEvidence) {
        next = recordStageEvidence();
        if (next.lessonComplete) {
          setCompleted(true);
        } else if (isObjectActionSource(source)) {
          advanceStage(ADVANCE_DELAY_MS[next.stageIndex]);
        }
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [advanceStage, applySnapshot, recordStageEvidence]);

  /**
   * The mission brain: maps a selected world object (or tray choice) to the
   * lesson, enforcing predict-before-observe and honest retries.
   */
  const missionSelect = useCallback((objectId: string, source: NormalizedInputSource, arg?: string) => {
    const world = sceneApiRef.current;
    if (!world) return;
    if (observatoryOpenRef.current && objectId.startsWith('planet-')) {
      const planetId = objectId.replace('planet-', '') as PlanetId;
      const nextObservatory = observatoryRef.current.selectPlanet(planetId);
      setObservatorySnapshot(nextObservatory);
      setObservatoryAnnouncement(`${getPlanet(planetId).name} selected for observation.`);
      if (!rendererRef.current?.xr.isPresenting) {
        const target = world.focusPlanet(planetId);
        const camera = cameraRef.current;
        if (camera) {
          guidedCameraRef.current?.focusOn(computeFocusFrame(target, camera, {
            approachFrom: new THREE.Vector3(0, 1.8, 4.8),
            fitPadding: 2.2,
            elevation: 0.18,
          }));
        }
      }
      return;
    }
    const active = snapshotRef.current;
    const stageId = SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages[active.stageIndex].id;
    const experience = experienceRef.current;
    const planetId = objectId.startsWith('planet-')
      ? objectId.replace('planet-', '') as PlanetId
      : arg as PlanetId | undefined;

    switch (stageId) {
      case 'stage-arrival': {
        if (objectId === 'inspect-sun') {
          note('That is the Sun — 99.8% of the whole system’s mass. Everything else falls around it.');
          performLessonAction('inspect-sun', source);
        } else if (objectId.startsWith('planet-') && planetId) {
          note(`${getPlanet(planetId).name}: ${getPlanet(planetId).fact} Now select the body it orbits.`);
        }
        return;
      }
      case 'stage-gravity': {
        if (objectId === 'toggle-gravity-lens') {
          world.setGravityLens(true);
          note('Gravity lens on. Every arrow points at the Sun — bigger arrows mean a stronger pull. The yellow arrows show each planet’s speed.');
          performLessonAction('toggle-gravity-lens', source);
        }
        return;
      }
      case 'stage-orbit-race': {
        const racer = planetId && ['mercury', 'earth', 'mars'].includes(planetId) ? planetId : undefined;
        if (!racer) {
          if (objectId.startsWith('planet-')) note('Only Mercury, Earth, and Mars are racing. Select one of them.');
          return;
        }
        if (!experience.prediction('race-winner')) {
          experience.recordPrediction('race-winner', racer);
          note(`Prediction locked: ${getPlanet(racer).name} finishes first. Watch the lap board — the bars fill as each planet completes its lap.`);
          performLessonAction('predict-race-winner', source);
          return;
        }
        if (active.performedActionIds.includes('confirm-race-winner')) return;
        const status = world.raceStatus();
        if (!status.anyFinished) {
          note('No planet has completed a full lap yet. Watch the board — who is filling fastest?');
          return;
        }
        if (status.finished.includes(racer) && racer === 'mercury') {
          const prediction = experience.prediction('race-winner');
          note(prediction?.correct
            ? 'Confirmed — and your prediction was right. Closest to the Sun, strongest pull, fastest orbit: Mercury in 88 days.'
            : `Confirmed: Mercury, not ${getPlanet(prediction!.choice as PlanetId).name}. The closer the planet, the stronger the Sun’s pull and the faster the orbit.`);
          performLessonAction('confirm-race-winner', source);
        } else {
          note('Check the lap board again — which row says FINISHED first?');
        }
        return;
      }
      case 'stage-heat-probe': {
        if (!planetId) return;
        if (!experience.prediction('hottest-planet')) {
          if (planetId === 'mercury' || planetId === 'venus') {
            experience.recordPrediction('hottest-planet', planetId);
            note(`Prediction locked: ${getPlanet(planetId).name}. Now aim the probe — select Mercury, then Venus.`);
            performLessonAction('predict-hottest', source);
          } else {
            note('The suspects are Mercury (closest to the Sun) and Venus (thick atmosphere). Pick one first.');
          }
          return;
        }
        const reading = world.probePlanet(planetId);
        if (planetId === 'mercury') {
          note(`Mercury: ${reading}°C on average — scorching days, but its heat escapes at night. No atmosphere to hold it.`);
          performLessonAction('probe-mercury', source);
        } else if (planetId === 'venus') {
          const prediction = experience.prediction('hottest-planet');
          note(prediction?.choice === 'venus'
            ? `Venus: ${reading}°C — hot enough to melt lead, and your prediction was right. Its CO₂ blanket traps the Sun’s heat.`
            : `Venus: ${reading}°C — hotter than Mercury! Distance is not the whole story: Venus’s thick CO₂ atmosphere traps heat like a greenhouse.`);
          performLessonAction('probe-venus', source);
        } else {
          note(`${getPlanet(planetId).name}: ${reading}°C mean. Interesting — but your suspects are Mercury and Venus.`);
        }
        return;
      }
      case 'stage-giants': {
        if (!planetId) return;
        const scanAction = `scan-${planetId}`;
        if (SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages[4].requiredActionIds.includes(scanAction)) {
          note(`${getPlanet(planetId).name}: ${getPlanet(planetId).signature}. ${getPlanet(planetId).fact}`);
          performLessonAction(scanAction, source);
          const guidedCamera = guidedCameraRef.current;
          const camera = cameraRef.current;
          if (guidedCamera && camera && source !== 'keyboard') {
            guidedCamera.focusOn(computeFocusFrame(world.planets[planetId].group, camera, { fitPadding: 3.0, elevation: 0.14 }));
          }
        } else {
          note(`${getPlanet(planetId).name} is not one of the giants — head past the asteroid belt.`);
        }
        return;
      }
      case 'stage-true-scale': {
        if (objectId === 'pull-scale-lever') {
          world.pullScaleLever();
          note('Stretching to true proportions… watch the worlds shrink and the gaps grow. Sizes stay enlarged — at fully honest scale you could not see the planets at all.');
          performLessonAction('pull-scale-lever', source);
          return;
        }
        if (planetId === 'earth') {
          if (world.scaleTrueness() < 0.85) {
            note('Pull the true-scale lever first — then hunt for Earth in the emptiness.');
            return;
          }
          note('Found it. That faint blue speck is everything you have ever known. Space is almost entirely empty.');
          performLessonAction('find-earth', source);
        }
        return;
      }
      case 'stage-comet': {
        if (objectId.startsWith('tail-')) {
          const choice = objectId.replace('tail-', '') as CometTailChoice;
          if (!experience.prediction('comet-tail')) {
            experience.recordPrediction('comet-tail', choice);
            note('Prediction locked. Now select the comet to ride alongside it through its closest pass of the Sun.');
            performLessonAction('predict-comet-tail', source);
          }
          return;
        }
        if (objectId === 'ride-comet') {
          if (!experience.prediction('comet-tail')) {
            note('Predict first: select one of the three arrows around the comet.');
            return;
          }
          world.rideComet();
          pendingCometEvidenceRef.current = true;
          note('Riding with the comet. Keep your eye on the tail as it swings around the Sun…');
          performLessonAction('ride-comet', source, { deferEvidence: true });
        }
        return;
      }
      case 'stage-debrief': {
        if (objectId === 'transfer-longer' || objectId === 'transfer-shorter' || arg) {
          const answer = arg ?? objectId.replace('transfer-', '');
          if (snapshotRef.current.performedActionIds.includes('answer-orbit-transfer')) return;
          experience.recordPrediction('orbit-transfer', answer);
          if (answer === 'longer') {
            note('Correct. Twice the distance means a weaker pull, a slower orbit, and a longer path — that probe’s year lasts almost three Earth years.');
            performLessonAction('answer-orbit-transfer', source);
          } else {
            note('Look back at the orbit race: farther planets moved slower around longer paths. So would this probe — try again.');
          }
          return;
        }
        if (objectId === 'collect-badge') {
          if (!snapshotRef.current.performedActionIds.includes('answer-orbit-transfer')) {
            note('Answer the probe question first — then the badge is yours.');
            return;
          }
          note('Mission complete, Solar System Explorer.');
          performLessonAction('collect-badge', source);
        }
        return;
      }
      default:
        return;
    }
  }, [note, performLessonAction]);
  selectRef.current = missionSelect;

  const previous = useCallback(() => {
    setCompleted(false);
    pendingCometEvidenceRef.current = false;
    const next = experienceRef.current.previous();
    applySnapshot(next);
    sceneApiRef.current?.setStage(next.stageIndex);
    focusStage(next.stageIndex);
    setMissionNote('');
    playNarration(next.stageIndex, preferences.audio);
  }, [applySnapshot, focusStage, preferences.audio]);
  previousRef.current = previous;

  const next = useCallback(() => {
    if (!snapshotRef.current.stageComplete) return;
    if (snapshotRef.current.lessonComplete) {
      setCompleted(true);
      return;
    }
    try {
      const nextSnapshot = experienceRef.current.next();
      applySnapshot(nextSnapshot);
      sceneApiRef.current?.setStage(nextSnapshot.stageIndex);
      focusStage(nextSnapshot.stageIndex);
      setMissionNote('');
      playNarration(nextSnapshot.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [applySnapshot, focusStage, preferences.audio]);
  nextRef.current = next;

  const replay = useCallback(() => {
    setCompleted(false);
    setEvidence([]);
    setMissionNote('');
    pendingCometEvidenceRef.current = false;
    wideScaleShotFiredRef.current = false;
    setObservatoryOpen(false);
    setObservatorySnapshot(observatoryRef.current.restart());
    setObservatoryAnnouncement('');
    const fresh = experienceRef.current.restart();
    applySnapshot(fresh);
    sceneApiRef.current?.restart();
    focusStage(fresh.stageIndex);
    playNarration(fresh.stageIndex, preferences.audio);
  }, [applySnapshot, focusStage, preferences.audio]);
  replayRef.current = replay;

  const syncObservatoryScene = useCallback((nextObservatory: ObservatorySnapshot) => {
    const world = sceneApiRef.current;
    if (!world) return;
    world.setPaused(nextObservatory.paused);
    world.setTimeCompression(nextObservatory.daysPerSecond);
    world.setLayerVisibility('orbits', nextObservatory.layers.orbits);
    world.setLayerVisibility('labels', nextObservatory.layers.labels);
    world.setLayerVisibility('gravity', nextObservatory.layers.gravity);
    world.setTrueScale(nextObservatory.layers.trueScale);
  }, []);

  const focusObservatoryPlanet = useCallback((planetId: PlanetId) => {
    const world = sceneApiRef.current;
    const camera = cameraRef.current;
    if (!world || !camera || rendererRef.current?.xr.isPresenting) return;
    guidedCameraRef.current?.focusOn(computeFocusFrame(world.focusPlanet(planetId), camera, {
      approachFrom: new THREE.Vector3(0, 1.8, 4.8),
      fitPadding: 2.2,
      elevation: 0.18,
    }));
  }, []);

  const openObservatory = useCallback(() => {
    const nextObservatory = observatoryRef.current.restart();
    setObservatorySnapshot(nextObservatory);
    setObservatoryOpen(true);
    sceneApiRef.current?.setObservatoryMode(true);
    syncObservatoryScene(nextObservatory);
    focusObservatoryPlanet(nextObservatory.selectedPlanetId);
    setObservatoryAnnouncement('Observatory open. The system is paused on Earth.');
  }, [focusObservatoryPlanet, syncObservatoryScene]);

  const exitObservatory = useCallback(() => {
    setObservatoryOpen(false);
    sceneApiRef.current?.setPaused(false);
    sceneApiRef.current?.setStage(snapshotRef.current.stageIndex);
    focusStage(snapshotRef.current.stageIndex, false);
    setObservatoryAnnouncement('');
  }, [focusStage]);

  const setObservatoryTime = useCallback((timePreset: ObservatoryTimePreset) => {
    const nextObservatory = observatoryRef.current.setTimePreset(timePreset);
    setObservatorySnapshot(nextObservatory);
    syncObservatoryScene(nextObservatory);
    setObservatoryAnnouncement(`Simulation speed set to ${timePreset}.`);
  }, [syncObservatoryScene]);

  const toggleObservatoryPause = useCallback(() => {
    const nextObservatory = observatoryRef.current.setPaused(!observatoryRef.current.snapshot().paused);
    setObservatorySnapshot(nextObservatory);
    syncObservatoryScene(nextObservatory);
    setObservatoryAnnouncement(nextObservatory.paused ? 'Simulation paused.' : 'Simulation playing.');
  }, [syncObservatoryScene]);

  const toggleObservatoryLayer = useCallback((layer: ObservatoryLayer) => {
    const nextObservatory = observatoryRef.current.toggleLayer(layer);
    setObservatorySnapshot(nextObservatory);
    syncObservatoryScene(nextObservatory);
    setObservatoryAnnouncement(`${layer} ${nextObservatory.layers[layer] ? 'shown' : 'hidden'}.`);
  }, [syncObservatoryScene]);

  const observatoryComparison = observatoryRef.current.comparison();

  const enterVr = useCallback(async () => {
    if (!rendererRef.current || !('xr' in navigator)) return;
    try {
      const session = await (navigator as Navigator & {
        xr: { requestSession(mode: string, options: XRSessionInit): Promise<XRSession> };
      }).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      playNarration(snapshotRef.current.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'The headset could not start immersive mode.');
    }
  }, [preferences.audio]);

  useEffect(() => {
    if ('xr' in navigator) {
      void (navigator as Navigator & {
        xr: { isSessionSupported(mode: string): Promise<boolean> };
      }).xr.isSessionSupported('immersive-vr').then(setVrSupported);
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;
    let cancelled = false;
    let host: WebSimulationRuntime | undefined;
    let fixedUpdate: WebSimulationUpdates['fixedUpdate'];
    let renderUpdate: WebSimulationUpdates['renderUpdate'];

    async function initialize() {
      // The scene may not present science the model cannot defend.
      const failedChecks = verifySolarAstronomy().filter(check => !check.passed);
      if (failedChecks.length > 0) {
        throw new Error(`Astronomy model failed verification: ${failedChecks.map(check => check.id).join(', ')}`);
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#030712');
      const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 220);
      camera.position.copy(OPENING_FRAME.position);
      camera.lookAt(OPENING_FRAME.target);

      host = createWebSimulationRuntime({
        mount: mountElement,
        scene,
        camera,
        updates: {
          fixedUpdate(context) { fixedUpdate?.(context); },
          renderUpdate(context) { renderUpdate?.(context); },
        },
      });
      rendererRef.current = host.renderer;
      cameraRef.current = camera;

      const vrRig = createVrPlayerRig({
        renderer: host.renderer,
        scene,
        camera,
        spawn: VR_SPAWN,
      });
      host.resources.register('solar-player-rig', () => vrRig.dispose());

      // Space is lit by the Sun (a point light inside the scene); this gentle
      // fill keeps night sides readable in a classroom projector setting.
      const fill = new THREE.HemisphereLight('#39496b', '#05070d', 0.85);
      scene.add(fill);

      const world = createSolarSystemScene({ scene, renderer: host.renderer });
      sceneApiRef.current = world;
      host.resources.register('solar-scene', () => world.dispose());

      const guidedCamera = createGuidedCamera(camera, host.renderer.domElement, {
        transitionSeconds: 1.5,
      });
      guidedCamera.focusOn(OPENING_FRAME, { animate: false });
      guidedCameraRef.current = guidedCamera;
      host.resources.register('solar-camera', () => {
        if (guidedCameraRef.current === guidedCamera) guidedCameraRef.current = null;
        guidedCamera.dispose();
      });

      const hud = createVrHudPanel({ scene });
      host.resources.register('solar-vr-hud', () => hud.dispose());

      const interactionSystem = createInteractionSystem({
        camera,
        domElement: host.renderer.domElement,
        xrControllers: vrRig.controllers,
        onSelect: (id, _object, source) => {
          const hudButton = hud.buttonIdFor(id);
          if (hudButton) {
            if (hudButton === 'previous') previousRef.current();
            if (hudButton === 'next') nextRef.current();
            if (hudButton === 'replay') replayRef.current();
            if (hudButton === 'exit') void host!.renderer.xr.getSession()?.end();
            return;
          }
          selectRef.current(id, source);
        },
      });
      for (const mesh of Object.values(hud.buttons)) {
        interactionSystem.register(mesh.name, mesh);
      }
      interactionSystem.register('inspect-sun', world.sun, { highlightColor: '#fbbf24' });
      interactionSystem.register('toggle-gravity-lens', world.gravityLens, { highlightColor: '#7dd3fc' });
      interactionSystem.register('pull-scale-lever', world.scaleLever, { highlightColor: '#fbbf24' });
      interactionSystem.register('ride-comet', world.comet, { highlightColor: '#a5f3fc' });
      interactionSystem.register('collect-badge', world.badge, { highlightColor: '#fde047' });
      interactionSystem.register('transfer-longer', world.transferLonger, { highlightColor: '#4ade80' });
      interactionSystem.register('transfer-shorter', world.transferShorter, { highlightColor: '#f87171' });
      for (const [tailId, group] of Object.entries(world.tailArrows)) {
        interactionSystem.register(`tail-${tailId}`, group, { highlightColor: '#e0f2fe' });
      }
      for (const [planetId, handle] of Object.entries(world.planets)) {
        interactionSystem.register(`planet-${planetId}`, handle.group, {
          highlightColor: handle.spec.palette[0],
        });
      }
      host.resources.register('solar-interaction', () => interactionSystem.dispose());

      const locomotion = createVrLocomotion({
        renderer: host.renderer,
        rig: vrRig.rig,
        onBack: () => {
          if (snapshotRef.current.stageIndex > 0) previousRef.current();
          else void host!.renderer.xr.getSession()?.end();
        },
      });

      const vrHudContent = (): VrHudContent => {
        if (completedRef.current) {
          return {
            eyebrow: 'Mission complete',
            title: 'Today you learned',
            body: 'You flew the whole solar system and tested every idea against the sky itself.',
            bullets: evidenceRef.current,
            buttons: ['replay', 'exit'],
          };
        }
        const active = snapshotRef.current;
        const focusAction = focusActionRef.current;
        return {
          eyebrow: `Stage ${active.stageIndex + 1} / ${active.stageCount}`,
          title: active.stageTitle,
          body: noteRef.current || active.cue,
          hint: focusAction
            ? `Do: ${ACTION_LABELS[focusAction]}`
            : 'Stage complete — press Next',
          buttons: active.stageIndex > 0 ? ['previous', 'next'] : ['next'],
        };
      };

      const projectedFocus = new THREE.Vector3();
      const cometFollowOffset = new THREE.Vector3();
      const cometWorld = new THREE.Vector3();

      fixedUpdate = context => {
        world.advance(context.deltaSeconds);
      };

      renderUpdate = context => {
        world.update(context.frameDeltaSeconds, context.elapsedSeconds, camera);

        const suggestedTargetId = focusActionRef.current
          ? SUGGESTED_TARGET_BY_ACTION[focusActionRef.current]
          : undefined;
        interactionSystem.setSuggested(suggestedTargetId);
        interactionSystem.update(context.elapsedSeconds);

        // Comet ride: hold the pass, then let the evidence land.
        if (pendingCometEvidenceRef.current) {
          const status = world.cometStatus();
          if (status.periapsisPassed && Math.sin(status.trueAnomaly) > 0.35) {
            pendingCometEvidenceRef.current = false;
            const prediction = experienceRef.current.prediction('comet-tail');
            setMissionNote(prediction?.correct
              ? 'The tail pointed away from the Sun the whole way — exactly as you predicted. Sunlight and solar wind push it outward.'
              : 'Watch again: even receding, the tail leads the comet, always pointing away from the Sun. Sunlight and solar wind push it outward — it is not exhaust.');
            const landed = recordStageEvidence();
            if (!landed.lessonComplete) advanceStage(ADVANCE_DELAY_MS[landed.stageIndex]);
          }
        }

        if (host!.renderer.xr.isPresenting) {
          locomotion.update(context.frameDeltaSeconds);
          interactionSystem.updateXrHover();
          hud.setVisible(true);
          hud.setContent(vrHudContent());
          hud.update(host!.renderer.xr.getCamera(), context.frameDeltaSeconds);
        } else {
          hud.setVisible(false);
          guidedCamera.update(context.frameDeltaSeconds);

          // Chase-cam alongside the riding comet (browser only — in VR the
          // learner's own head stays in charge, per comfort rules).
          if (world.isRidingComet() && !guidedCamera.isTransitioning()) {
            world.comet.getWorldPosition(cometWorld);
            cometFollowOffset.copy(cometWorld).sub(new THREE.Vector3(0, ECLIPTIC_Y, 0)).normalize();
            const desired = cometWorld.clone()
              .addScaledVector(cometFollowOffset, 1.15)
              .add(new THREE.Vector3(0, 0.55, 0));
            camera.position.lerp(desired, 1 - Math.exp(-2.2 * context.frameDeltaSeconds));
          }

          // One wide pull-back as the true-scale stretch passes halfway.
          if (world.scaleTrueness() > 0.5 && !wideScaleShotFiredRef.current) {
            wideScaleShotFiredRef.current = true;
            guidedCamera.focusOn({
              position: new THREE.Vector3(-4, 22, 30),
              target: new THREE.Vector3(0, ECLIPTIC_Y, 0),
            });
          }
          if (world.scaleTrueness() < 0.1) wideScaleShotFiredRef.current = false;

          const focusObject = suggestedTargetId
            ? scene.getObjectByName(suggestedTargetId)
            : undefined;
          if (focusObject) {
            focusObject.getWorldPosition(projectedFocus).project(camera);
            const nextFocusVisibility = resolveFocusGuide(projectedFocus);
            const currentFocusVisibility = focusVisibilityRef.current;
            if (
              nextFocusVisibility.visible !== currentFocusVisibility.visible
              || nextFocusVisibility.direction !== currentFocusVisibility.direction
            ) {
              focusVisibilityRef.current = nextFocusVisibility;
              setFocusVisibility(nextFocusVisibility);
            }
          }
        }
      };

      world.setStage(0);
      await host.initialize();
    }

    void initialize().catch(error => {
      if (!cancelled) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
      void host?.dispose();
    });
    return () => {
      cancelled = true;
      stopSimulationNarration();
      sceneApiRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      void host?.dispose();
    };
  }, [advanceStage, recordStageEvidence]);

  const trayChoicesForAction = (actionId: string) => TRAY_CHOICES[actionId];

  return (
    <SimulationExperienceShell
      title="Solar System: Gravity’s Orchestra"
      classContext="Classes 8–10 Science · Stars and the Solar System"
      objective={SOLAR_SYSTEM_EXPERIENCE_DEFINITION.objective}
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => {
        setStarted(true);
        playNarration(snapshot.stageIndex, preferences.audio);
      }}
      onEnterVr={vrSupported ? enterVr : undefined}
      onPrevious={completed && !observatoryOpen ? openObservatory : previous}
      onNext={next}
      evidence={evidence}
      scaleNote={SCALE_DISCLOSURE}
      completed={completed && !observatoryOpen}
      completionEyebrow="Mission complete"
      completionHeadline="Solar System Explorer"
      completionBody="You watched gravity organise eight worlds, raced Mercury around the Sun, caught Venus out-heating it, stretched space to its honest emptiness, rode a comet through perihelion, and used Kepler’s law on a world you had never seen."
      completionActionLabel="Open observatory"
      focusGuide={{
        direction: focusVisibility.direction,
        label: remainingActions.length > 0
          ? `Look toward: ${ACTION_LABELS[remainingActions[0]]}`
          : 'Look toward the Sun',
        visible: started && !completed && !observatoryOpen && focusVisibility.visible,
      }}
      error={runtimeError || undefined}
    >
      <div ref={mountRef} className="solar-world-mount" />
      {started && !completed && (
        <section className="solar-action-tray" aria-label="Solar system mission actions">
          <span>Mission action</span>
          <strong>
            {remainingActions.length > 0
              ? ACTION_LABELS[remainingActions[0]]
              : 'Stage complete — continue when ready'}
          </strong>
          {missionNote && <small aria-live="polite">{missionNote}</small>}
          <div>
            {remainingActions.slice(0, 1).flatMap(actionId => {
              const choices = trayChoicesForAction(actionId);
              if (choices) {
                return choices.map(choice => (
                  <button
                    key={`${actionId}-${choice.arg}`}
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (actionId === 'confirm-race-winner' || actionId === 'predict-race-winner') {
                        missionSelect(`planet-${choice.arg}`, 'keyboard');
                      } else if (actionId === 'predict-hottest') {
                        missionSelect(`planet-${choice.arg}`, 'keyboard');
                      } else if (actionId === 'predict-comet-tail') {
                        missionSelect(`tail-${choice.arg}`, 'keyboard');
                      } else if (actionId === 'answer-orbit-transfer') {
                        missionSelect(`transfer-${choice.arg}`, 'keyboard');
                      }
                    }}
                  >
                    {choice.label}
                  </button>
                ));
              }
              const directTargets: Record<string, string> = {
                'probe-mercury': 'planet-mercury',
                'probe-venus': 'planet-venus',
                'scan-jupiter': 'planet-jupiter',
                'scan-saturn': 'planet-saturn',
                'scan-uranus': 'planet-uranus',
                'scan-neptune': 'planet-neptune',
                'find-earth': 'planet-earth',
              };
              return [(
                <button
                  key={actionId}
                  type="button"
                  className="secondary"
                  onClick={() => missionSelect(directTargets[actionId] ?? actionId, 'keyboard')}
                >
                  {ACTION_LABELS[actionId]}
                </button>
              )];
            })}
          </div>
        </section>
      )}
      {observatoryOpen && (
        <section className="solar-observatory" aria-label="Solar system observatory">
          <header>
            <div>
              <span>FREE EXPLORATION</span>
              <h2>Solar observatory</h2>
            </div>
            <button type="button" className="secondary" onClick={exitObservatory}>Exit observatory</button>
          </header>

          <div className="solar-observatory__controls">
            <fieldset>
              <legend>Simulation speed</legend>
              <button type="button" aria-pressed={observatorySnapshot.paused} onClick={toggleObservatoryPause}>
                {observatorySnapshot.paused ? 'Play' : 'Pause'}
              </button>
              {(['day', 'month', 'year'] as const).map(timePreset => (
                <button
                  key={timePreset}
                  type="button"
                  className="secondary"
                  aria-pressed={observatorySnapshot.timePreset === timePreset}
                  onClick={() => setObservatoryTime(timePreset)}
                >
                  {timePreset === 'day' ? '8 days/s' : timePreset === 'month' ? '30 days/s' : '120 days/s'}
                </button>
              ))}
            </fieldset>

            <label>
              Explore planet
              <select
                value={observatorySnapshot.selectedPlanetId}
                onChange={event => {
                  const planetId = event.target.value as PlanetId;
                  const nextObservatory = observatoryRef.current.selectPlanet(planetId);
                  setObservatorySnapshot(nextObservatory);
                  focusObservatoryPlanet(planetId);
                  setObservatoryAnnouncement(`${getPlanet(planetId).name} selected for observation.`);
                }}
              >
                {SOLAR_PLANETS.map(planet => <option key={planet.id} value={planet.id}>{planet.name}</option>)}
              </select>
            </label>

            <label>
              Compare worlds
              <select
                value={observatorySnapshot.comparisonPlanetId}
                onChange={event => {
                  const nextObservatory = observatoryRef.current.compareWith(event.target.value as PlanetId);
                  setObservatorySnapshot(nextObservatory);
                  setObservatoryAnnouncement(`${getPlanet(nextObservatory.comparisonPlanetId).name} added to comparison.`);
                }}
              >
                {SOLAR_PLANETS.filter(planet => planet.id !== observatorySnapshot.selectedPlanetId)
                  .map(planet => <option key={planet.id} value={planet.id}>{planet.name}</option>)}
              </select>
            </label>

            <fieldset className="solar-observatory__layers">
              <legend>Observation layers</legend>
              {([
                ['orbits', 'Orbit paths'],
                ['labels', 'Planet labels'],
                ['gravity', 'Gravity vectors'],
                ['trueScale', 'True distance'],
              ] as Array<[ObservatoryLayer, string]>).map(([layer, label]) => (
                <button
                  key={layer}
                  type="button"
                  className="secondary"
                  aria-pressed={observatorySnapshot.layers[layer]}
                  onClick={() => toggleObservatoryLayer(layer)}
                >
                  {label}
                </button>
              ))}
            </fieldset>
          </div>

          <table>
            <caption>Compare worlds</caption>
            <thead><tr><th>Measurement</th><th>{observatoryComparison.primary.name}</th><th>{observatoryComparison.secondary.name}</th></tr></thead>
            <tbody>
              {observatoryComparison.rows.map(row => (
                <tr key={row.label}><th>{row.label}</th><td>{row.primary}</td><td>{row.secondary}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="sr-only" aria-live="polite">{observatoryAnnouncement}</p>
          <small>Distances and planet sizes remain representational. See the scale disclosure and texture attribution.</small>
        </section>
      )}
    </SimulationExperienceShell>
  );
}
