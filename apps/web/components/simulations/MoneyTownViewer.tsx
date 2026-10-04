'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { ClassroomSync } from '@/components/robotree/ClassroomSync';
import SimulationCanvasHost from '@/components/simulation-experience/SimulationCanvasHost';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import { createQuestVrControls } from './questVrControls';
import {
  MONEY_TOWN_STAGES,
  getMoneyDefinition,
  getMoneyMemoryScore,
} from '@/lib/moneyTownLesson';
import {
  actInMoneyTown,
  initialMoneyTownState,
  moneyActivity,
  moveMoneyTown,
  type MoneyTownState,
} from '@/lib/moneyTownActivity';
import {
  createMoneyTownAudio,
  type MoneyAudioStatus,
} from '@/lib/moneyTownAudio';
import { MONEY_NARRATION } from '@/lib/moneyTownNarration';
import { MONEY_PHOTOS } from '@/lib/moneyTownPhotos';
import {
  addMoneyTownEnvironment,
  buildMoneyActivityScene,
  buildMoneyNavigation,
  disposeMoneyScene,
} from '@/lib/moneyTownScene';
import styles from './MoneyTownViewer.module.css';

export default function MoneyTownViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const audioRef = useRef<ReturnType<typeof createMoneyTownAudio> | null>(null);
  const runtimeRef = useRef<{
    sync(state: MoneyTownState): void;
    focus(): void;
  } | null>(null);
  const actionRef = useRef<(id: string) => void>(() => {});
  const navigateRef = useRef<(direction: number) => void>(() => {});
  const replayRef = useRef<() => void>(() => {});
  const comfortRef = useRef(true);
  const [state, setState] = useState(initialMoneyTownState);
  const stateRef = useRef(state);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [comfort, setComfort] = useState(true);
  const [vrSupported, setVrSupported] = useState(false);
  const [inVr, setInVr] = useState(false);
  const [audioStatus, setAudioStatus] = useState<MoneyAudioStatus>('idle');
  const [caption, setCaption] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const stage = MONEY_TOWN_STAGES[state.stage];
  const activity = moneyActivity(state);
  const score = getMoneyMemoryScore(state.progress);

  useEffect(() => {
    panelRef.current?.scrollTo(0, 0);
  }, [state.stage]);

  const narrate = useCallback((ids: string[], replace = false) => {
    audioRef.current?.enqueue(
      ids.map((id) => MONEY_NARRATION[id]).filter(Boolean),
      replace,
    );
  }, []);
  const commit = useCallback((next: MoneyTownState) => {
    stateRef.current = next;
    runtimeRef.current?.sync(next);
    setState(next);
  }, []);
  const stageNarration = useCallback(
    (next: MoneyTownState) => {
      const nextStage = MONEY_TOWN_STAGES[next.stage];
      const nextActivity = moneyActivity(next);
      const ids = [`stage-${nextStage.id}`];
      if (!nextActivity.ready && nextActivity.cue !== ids[0])
        ids.push(nextActivity.cue);
      narrate(ids, true);
    },
    [narrate],
  );

  const choose = useCallback(
    (id: string) => {
      const result = actInMoneyTown(stateRef.current, id);
      if (result.state === stateRef.current) return;
      commit(result.state);
      narrate(result.cues);
    },
    [commit, narrate],
  );
  actionRef.current = choose;
  const navigate = useCallback(
    (direction: number) => {
      const before = stateRef.current;
      const next = moveMoneyTown(before, direction);
      commit(next);
      if (next.stage !== before.stage) stageNarration(next);
      else if (!moneyActivity(before).ready && direction > 0)
        narrate(['not-ready']);
    },
    [commit, narrate, stageNarration],
  );
  navigateRef.current = navigate;
  const replay = useCallback(() => {
    const current = stateRef.current;
    narrate([moneyActivity(current).cue], true);
  }, [narrate]);
  replayRef.current = replay;
  const restart = () => {
    audioRef.current?.stop();
    setCaption('');
    commit(initialMoneyTownState());
    runtimeRef.current?.focus();
  };

  useEffect(() => {
    const audio = createMoneyTownAudio((status, text) => {
      setAudioStatus(status);
      if (text) setCaption(text);
    });
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void navigator.xr
      ?.isSessionSupported('immersive-vr')
      .then((supported) => {
        if (active) setVrSupported(supported);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x233f4d);
    scene.fog = new THREE.Fog(0x233f4d, 9, 24);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x497c6c, 2.3));
    const sun = new THREE.DirectionalLight(0xfff1cd, 2.4);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 50);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement, {
      maxDistance: 12,
    });
    const focus = () => {
      if (renderer.xr.isPresenting) return;
      // Fit to the dedicated scene viewport, not the entire screen behind a HUD.
      const distance = Math.max(
        4.35,
        2.25 / (Math.tan(THREE.MathUtils.degToRad(29)) * camera.aspect),
      );
      guidedCamera.focusOn(
        {
          position: new THREE.Vector3(0, 1.5, distance),
          target: new THREE.Vector3(0, 1.5, -0.2),
        },
        { animate: false },
      );
    };
    const environment = addMoneyTownEnvironment(scene);
    const nav = buildMoneyNavigation();
    scene.add(nav.group);
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    for (const controller of controllers) {
      const ray = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -5),
        ]),
        new THREE.LineBasicMaterial({ color: 0x8de7ee }),
      );
      ray.visible = false;
      controller.add(ray);
      scene.add(controller);
    }
    const quest = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: () => navigateRef.current(1),
      onBack: () => navigateRef.current(-1),
      onNarrate: () => replayRef.current(),
    });
    let activeScene: ReturnType<typeof buildMoneyActivityScene> | undefined;
    let interaction: ReturnType<typeof createInteractionSystem> | undefined;
    let displayedStage = -1;
    const sync = (next: MoneyTownState) => {
      interaction?.dispose();
      if (activeScene) {
        scene.remove(activeScene.group);
        disposeMoneyScene(activeScene.group);
      }
      activeScene = buildMoneyActivityScene(next);
      scene.add(activeScene.group);
      interaction = createInteractionSystem({
        camera,
        domElement: renderer.domElement,
        xrControllers: controllers,
        onSelect: (id) => {
          if (id === 'nav:next') navigateRef.current(1);
          else if (id === 'nav:back') navigateRef.current(-1);
          else if (id === 'nav:replay') replayRef.current();
          else if (id === 'nav:exit') void renderer.xr.getSession()?.end();
          else actionRef.current(id);
        },
      });
      for (const target of activeScene.targets)
        interaction.register(target.id, target.object);
      const ready = moneyActivity(next).ready;
      for (const target of nav.targets) {
        target.object.visible =
          target.id === 'exit'
            ? renderer.xr.isPresenting
            : target.id === 'next'
              ? ready && next.stage < 7
              : target.id === 'back'
                ? next.stage > 0
                : true;
        interaction.register('nav:' + target.id, target.object);
      }
      nav.group.visible = renderer.xr.isPresenting;
      mount.dataset.sceneChoiceCount = String(activeScene.optionCount);
      if (displayedStage !== next.stage) {
        displayedStage = next.stage;
        focus();
      }
    };
    runtimeRef.current = { sync, focus };
    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight || renderer.xr.isPresenting)
        return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      focus();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    sync(stateRef.current);
    const setControllerRays = (visible: boolean) =>
      controllers.forEach((controller) =>
        controller.children.forEach((child) => {
          child.visible = visible;
        }),
      );
    const sessionStart = () => {
      guidedCamera.controls.enabled = false;
      setControllerRays(true);
      setInVr(true);
      sync(stateRef.current);
    };
    const sessionEnd = () => {
      guidedCamera.controls.enabled = true;
      setControllerRays(false);
      setInVr(false);
      sync(stateRef.current);
      resize();
    };
    renderer.xr.addEventListener('sessionstart', sessionStart);
    renderer.xr.addEventListener('sessionend', sessionEnd);
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      quest.update();
      // Keep denominations stationary/readable; only the background guide moves.
      environment.teacher.rotation.y = comfortRef.current
        ? 0
        : Math.sin(clock.elapsedTime) * 0.08;
      renderer.render(scene, camera);
    });
    return () => {
      runtimeRef.current = null;
      rendererRef.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.xr.removeEventListener('sessionstart', sessionStart);
      renderer.xr.removeEventListener('sessionend', sessionEnd);
      interaction?.dispose();
      quest.dispose();
      guidedCamera.dispose();
      disposeMoneyScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const start = async (vr = false) => {
    setLaunchError('');
    // Create/resume audio inside the same user gesture that requests WebXR.
    void audioRef.current?.unlock();
    setStarted(true);
    if (vr && rendererRef.current) {
      try {
        const session = await navigator.xr!.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['bounded-floor', 'hand-tracking'],
        });
        await rendererRef.current.xr.setSession(session);
      } catch {
        setLaunchError('VR could not start. You can continue in the browser.');
      }
    }
    stageNarration(stateRef.current);
  };
  const specimen = activity.specimen
    ? getMoneyDefinition(activity.specimen)
    : undefined;

  return (
    <main className={styles.root}>
      <ClassroomSync
        stageIndex={state.stage}
        stageCount={8}
        completed={state.stage === 7 && activity.ready}
        started={started}
      />
      {started && (
        <header className={styles.header}>
          <div>
            <strong>Introduction to Money</strong>
            <span>
              Stage {state.stage + 1} / 8 · {stage.title}
            </span>
          </div>
          <div className={styles.tools}>
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                audioRef.current?.setMuted(next);
                if (!next) replay();
              }}
              aria-pressed={!muted}
            >
              {muted ? 'Voice off' : 'Voice on'}
            </button>
            <button onClick={replay} disabled={muted}>
              Replay voice
            </button>
            <button
              onClick={() => {
                comfortRef.current = !comfort;
                setComfort(!comfort);
              }}
              aria-pressed={comfort}
            >
              Comfort {comfort ? 'on' : 'off'}
            </button>
            <button aria-label="Restart Money Town" onClick={restart}>
              Restart
            </button>
            {inVr ? (
              <button
                onClick={() => void rendererRef.current?.xr.getSession()?.end()}
              >
                Exit VR
              </button>
            ) : (
              vrSupported && (
                <button onClick={() => void start(true)}>Enter VR</button>
              )
            )}
          </div>
        </header>
      )}
      <div className={styles.body}>
        <section className={styles.scene} aria-label="Money Town scene">
          <SimulationCanvasHost
            ref={mountRef}
            className={styles.canvas}
            ariaLabel="Money Town world"
          />
          {started && (
            <div className={styles.sceneHelp}>
              Drag to orbit · Right-drag to pan · Scroll to zoom{' '}
              <button onClick={() => runtimeRef.current?.focus()}>
                Reset view
              </button>
            </div>
          )}
        </section>
        {started && (
          <aside className={styles.panel} aria-label="Money activity">
            <div ref={panelRef} className={styles.panelContent}>
              <div className={styles.eyebrow}>
                {activity.ready
                  ? 'ACTIVITY COMPLETE'
                  : `ACTIVITY ${state.stage + 1} OF 8`}
              </div>
              <h1>{stage.title}</h1>
              {specimen && (
                <figure
                  className={styles.specimen}
                  aria-label="Money to identify"
                >
                  <Image
                    src={MONEY_PHOTOS[specimen.id].front}
                    width={MONEY_PHOTOS[specimen.id].width}
                    height={MONEY_PHOTOS[specimen.id].height}
                    alt={specimen.label}
                    className={
                      specimen.kind === 'coin'
                        ? styles.coinPhoto
                        : styles.notePhoto
                    }
                    unoptimized
                  />
                  <figcaption>
                    RBI reference picture · enlarged for learning
                  </figcaption>
                </figure>
              )}
              <p className={styles.prompt}>{activity.prompt}</p>
              <div
                className={styles.choices}
                role="group"
                aria-label="Money choices"
              >
                {activity.options.map((option) => (
                  <button
                    key={option.id}
                    data-testid="money-choice"
                    onClick={() => choose(option.id)}
                  >
                    {option.moneyId && (
                      <Image
                        src={MONEY_PHOTOS[option.moneyId].front}
                        width={MONEY_PHOTOS[option.moneyId].width}
                        height={MONEY_PHOTOS[option.moneyId].height}
                        alt=""
                        className={styles.choicePhoto}
                        unoptimized
                      />
                    )}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              {stage.id === 'shopping-challenge' && (
                <p>
                  {Object.keys(state.progress.payments).length} / 3 items paid
                  for
                </p>
              )}
              {stage.id === 'memory-check' && (
                <p>
                  Score: {score.correct} / {score.total}
                </p>
              )}
              <p role="status" className={styles.feedback}>
                {state.feedback ||
                  (activity.ready
                    ? 'You can continue.'
                    : 'Choose in the scene or use the buttons.')}
              </p>
              <p className={styles.audioStatus} role="status">
                {audioStatus === 'unavailable'
                  ? 'Audio unavailable. Check your connection, then select Replay voice.'
                  : audioStatus === 'playing'
                    ? 'Teacher speaking…'
                    : audioStatus === 'loading'
                      ? 'Loading teacher voice…'
                      : muted
                        ? 'Voice muted'
                        : 'Teacher voice ready'}
              </p>
              <button
                className={styles.transcriptToggle}
                aria-expanded={showTranscript}
                onClick={() => setShowTranscript(!showTranscript)}
              >
                Teacher transcript
              </button>
              {showTranscript && (
                <p className={styles.transcript}>
                  {muted
                    ? MONEY_NARRATION[activity.cue]?.text
                    : caption || MONEY_NARRATION[activity.cue]?.text}
                </p>
              )}
              {launchError && <p role="alert">{launchError}</p>}
              <p className={styles.photoCredit}>
                Currency pictures:{' '}
                <a
                  href="https://www.rbi.org.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Reserve Bank of India
                </a>
                . Educational reference only. Other valid designs also exist.
              </p>
            </div>
            <nav className={styles.navigation} aria-label="Lesson navigation">
              <button
                aria-label="Previous stage"
                disabled={state.stage === 0}
                onClick={() => navigate(-1)}
              >
                Back
              </button>
              <button
                aria-label="Next stage"
                disabled={!activity.ready || state.stage === 7}
                onClick={() => navigate(1)}
              >
                Next
              </button>
            </nav>
          </aside>
        )}
      </div>
      {!started && (
        <section className={styles.intro} aria-label="Start Money Town">
          <div>
            <p className={styles.eyebrow}>CLASS 1 · MATHEMATICS</p>
            <h1>Introduction to Money</h1>
            <p>
              Explore Indian coins and notes, pay the right amount at a shop,
              and become a Money Explorer.
            </p>
            <p>
              Real currency pictures · Indian teacher narration · Browser and VR
            </p>
            <button onClick={() => void start()}>Open Money Town</button>
            {vrSupported && (
              <button onClick={() => void start(true)}>Enter VR</button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
