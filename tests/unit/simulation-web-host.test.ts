import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserSimulationHostDependencies,
  createSimulationHost,
  type SimulationHostDependencies,
  type SimulationLaunchPreferences,
  type SimulationSceneAdapter,
  type SimulationSceneContext,
} from '../../packages/simulation-web/src/index';
import type {
  LessonSnapshot,
  ResourceRegistry,
} from '@xr-school/simulation-runtime';
import type {
  NormalizedAction,
  SimulationNarrationManifest,
} from '@xr-school/simulation-schema';

const PREFERENCES: SimulationLaunchPreferences = {
  reducedMotion: false,
  seatedMode: false,
  locomotion: 'stationary',
  turnMode: 'snap',
};

const NARRATION: SimulationNarrationManifest = {
  id: 'test-narration',
  cues: [{
    id: 'cue-observe',
    stageId: 'observe',
    text: 'Observe the model.',
    caption: 'Observe the model.',
  }],
  fallback: 'browserTts',
};

const SNAPSHOT: LessonSnapshot = {
  experienceId: 'test-experience',
  objective: 'Test the host lifecycle.',
  stageIndex: 0,
  stageCount: 1,
  stageId: 'observe',
  stageTitle: 'Observe',
  cue: 'Observe the model.',
  performedActionIds: [],
  recordedEvidenceIds: [],
  stageComplete: false,
  lessonComplete: false,
};

function createMount() {
  let child: unknown;
  return {
    clientWidth: 960,
    clientHeight: 540,
    replaceChildren(next?: unknown) {
      child = next;
    },
    get child() {
      return child;
    },
  } as unknown as HTMLElement & { readonly child: unknown };
}

function createHostHarness() {
  let animationLoop: ((timeMs: number) => void) | null = null;
  let currentInputSnapshot: (() => Pick<LessonSnapshot, 'stageId'>) | undefined;
  let visibilityListener: ((hidden: boolean) => void) | undefined;
  let xrSession: XRSession | null = null;
  const xrCamera = new THREE.PerspectiveCamera();
  const xrControllers = [new THREE.Group(), new THREE.Group()];
  const xrListeners = new Map<string, Set<() => void>>();
  const rendererElement = { remove: vi.fn() } as unknown as HTMLCanvasElement;
  const renderer = {
    domElement: rendererElement,
    xr: {
      enabled: false,
      isPresenting: false,
      setReferenceSpaceType: vi.fn(),
      addEventListener(type: string, listener: () => void) {
        const listeners = xrListeners.get(type) ?? new Set<() => void>();
        listeners.add(listener);
        xrListeners.set(type, listeners);
      },
      removeEventListener(type: string, listener: () => void) {
        xrListeners.get(type)?.delete(listener);
      },
      getController: vi.fn((index: number) => xrControllers[index]),
      getCamera: vi.fn(() => xrCamera),
      getSession: vi.fn(() => xrSession),
      setSession: vi.fn(async () => undefined),
    },
    shadowMap: { enabled: false, type: 0 },
    capabilities: { maxTextureSize: 4096, getMaxAnisotropy: () => 8 },
    setAnimationLoop(loop: ((timeMs: number) => void) | null) {
      animationLoop = loop;
    },
    dispose: vi.fn(),
  } as unknown as THREE.WebGLRenderer;

  const presentation = {
    render: vi.fn(),
    resize: vi.fn(),
    setQualityProfile: vi.fn(),
    dispose: vi.fn(),
  };
  const narration = {
    currentCueId: undefined,
    play: vi.fn(async () => 'silent' as const),
    replay: vi.fn(async () => 'silent' as const),
    stop: vi.fn(),
    dispose: vi.fn(),
  };
  const input = {
    interactions: {
      register: vi.fn(() => vi.fn()),
      activate: vi.fn(),
      clear: vi.fn(),
    },
    dispose: vi.fn(),
  };
  const resizeObserver = {
    observe: vi.fn(),
    disconnect: vi.fn(),
  };
  const stopVisibilityObserver = vi.fn();
  const dependencies: SimulationHostDependencies = {
    createRenderer: () => renderer,
    createPresentation: () => presentation,
    createNarration: () => narration,
    createInput: config => {
      currentInputSnapshot = config.currentSnapshot;
      return input;
    },
    createResizeObserver: () => resizeObserver,
    observeVisibility(listener) {
      visibilityListener = listener;
      return stopVisibilityObserver;
    },
    detectProfile: () => 'browserBalanced',
    requestXrSession: vi.fn(async () => ({ end: vi.fn() } as unknown as XRSession)),
    devicePixelRatio: () => 2,
    now: () => 100,
  };

  return {
    dependencies,
    input,
    narration,
    presentation,
    renderer,
    xrControllers,
    resizeObserver,
    stopVisibilityObserver,
    runFrame(timeMs: number) {
      animationLoop?.(timeMs);
    },
    currentInputSnapshot() {
      if (!currentInputSnapshot) throw new Error('Input router was not created');
      return currentInputSnapshot();
    },
    emitXr(type: 'sessionstart' | 'sessionend') {
      for (const listener of xrListeners.get(type) ?? []) listener();
    },
    emitVisibility(hidden: boolean) {
      visibilityListener?.(hidden);
    },
    setXrInputSources(inputSources: unknown[]) {
      xrSession = { inputSources } as unknown as XRSession;
    },
  };
}

describe('createSimulationHost', () => {
  it('provides browser defaults that request WebXR sessions through navigator', async () => {
    const requestSession = vi.fn(async () => ({ end: vi.fn() } as unknown as XRSession));
    vi.stubGlobal('navigator', { xr: { requestSession } });
    const dependencies = createBrowserSimulationHostDependencies();

    await dependencies.requestXrSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
    });

    expect(requestSession).toHaveBeenCalledWith('immersive-vr', {
      requiredFeatures: ['local-floor'],
    });
    vi.unstubAllGlobals();
  });

  it('initializes its adapter exactly once and projects lesson snapshots', async () => {
    const harness = createHostHarness();
    const applySnapshot = vi.fn();
    const adapter: SimulationSceneAdapter = {
      id: 'test-adapter',
      create: vi.fn(() => ({
        applySnapshot,
        dispose: vi.fn(),
      })),
    };
    const host = createSimulationHost({
      mount: createMount(),
      adapter,
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();
    host.applySnapshot(SNAPSHOT);

    expect(adapter.create).toHaveBeenCalledOnce();
    expect(applySnapshot).toHaveBeenCalledWith(SNAPSHOT);
    await expect(host.initialize()).rejects.toThrow(/already initialized/i);
    await host.dispose();
  });

  it('normalizes smooth turning to snap turning for reduced-motion launches', async () => {
    const harness = createHostHarness();
    let context: SimulationSceneContext | undefined;
    const preferences: SimulationLaunchPreferences = {
      ...PREFERENCES,
      reducedMotion: true,
      turnMode: 'smooth',
    };
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'reduced-motion-adapter',
        create: value => {
          context = value;
          return { applySnapshot: vi.fn(), dispose: vi.fn() };
        },
      },
      preferences,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();

    expect(context!.preferences).toEqual({
      ...preferences,
      turnMode: 'snap',
    });
    expect(preferences.turnMode).toBe('smooth');
    await host.dispose();
  });

  it('preserves an explicit no-turn accessibility preference', async () => {
    const harness = createHostHarness();
    let context: SimulationSceneContext | undefined;
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'no-turn-adapter',
        create: value => {
          context = value;
          return { applySnapshot: vi.fn(), dispose: vi.fn() };
        },
      },
      preferences: {
        ...PREFERENCES,
        reducedMotion: true,
        turnMode: 'none',
      },
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();

    expect(context!.preferences.turnMode).toBe('none');
    await host.dispose();
  });

  it('fails clearly when input is attempted before a lesson snapshot exists', async () => {
    const harness = createHostHarness();
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'input-contract-adapter',
        create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();

    expect(() => harness.currentInputSnapshot()).toThrow(
      /apply a lesson snapshot before accepting input/i,
    );
    await host.dispose();
  });

  it('does not synthesize continuous camera movement between frames', async () => {
    const harness = createHostHarness();
    let context: SimulationSceneContext | undefined;
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'stationary-adapter',
        create: value => {
          context = value;
          return { applySnapshot: vi.fn(), dispose: vi.fn() };
        },
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();
    context!.camera.position.set(1, 2, 3);
    harness.runFrame(0);
    harness.runFrame(1_000);

    expect(context!.camera.position.toArray()).toEqual([1, 2, 3]);
    await host.dispose();
  });

  it('forwards fixed and render updates through the owned animation loop', async () => {
    const harness = createHostHarness();
    const fixedUpdate = vi.fn();
    const renderUpdate = vi.fn();
    const adapter: SimulationSceneAdapter = {
      id: 'updates-adapter',
      create: () => ({
        applySnapshot: vi.fn(),
        fixedUpdate,
        renderUpdate,
        dispose: vi.fn(),
      }),
    };
    const host = createSimulationHost({
      mount: createMount(),
      adapter,
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();
    harness.runFrame(0);
    harness.runFrame(17);

    expect(fixedUpdate).toHaveBeenCalledOnce();
    expect(renderUpdate).toHaveBeenCalledTimes(2);
    expect(harness.presentation.render).toHaveBeenCalledTimes(2);
    await host.dispose();
  });

  it('pauses hidden simulations and resumes without advancing hidden time', async () => {
    const harness = createHostHarness();
    const renderUpdate = vi.fn();
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'visibility-adapter',
        create: () => ({
          applySnapshot: vi.fn(),
          renderUpdate,
          dispose: vi.fn(),
        }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);
    await host.initialize();

    harness.runFrame(0);
    harness.emitVisibility(true);
    harness.runFrame(10_000);
    expect(renderUpdate).toHaveBeenCalledTimes(1);

    harness.emitVisibility(false);
    harness.runFrame(20_000);
    expect(renderUpdate).toHaveBeenCalledTimes(2);
    expect(renderUpdate.mock.calls[1][0].frameDeltaSeconds).toBe(0);

    await host.dispose();
    expect(harness.stopVisibilityObserver).toHaveBeenCalledOnce();
  });

  it('rejects malformed normalized actions before forwarding them', async () => {
    const harness = createHostHarness();
    const onAction = vi.fn();
    const adapter: SimulationSceneAdapter = {
      id: 'dispatch-adapter',
      create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
    };
    const host = createSimulationHost({
      mount: createMount(),
      adapter,
      preferences: PREFERENCES,
      narration: NARRATION,
      onAction,
    }, harness.dependencies);
    await host.initialize();

    expect(() => host.dispatch({
      actionId: '',
      targetEntityId: 'target',
      source: 'mouse',
      phase: 'commit',
      stageId: 'observe',
      timestampMs: 100,
    } as NormalizedAction)).toThrow(/action id is required/i);
    expect(onAction).not.toHaveBeenCalled();
    await host.dispose();
  });

  it('rejects blank evidence identifiers before forwarding them', async () => {
    const harness = createHostHarness();
    const onEvidence = vi.fn();
    let context: SimulationSceneContext | undefined;
    const adapter: SimulationSceneAdapter = {
      id: 'evidence-adapter',
      create: value => {
        context = value;
        return { applySnapshot: vi.fn(), dispose: vi.fn() };
      },
    };
    const host = createSimulationHost({
      mount: createMount(),
      adapter,
      preferences: PREFERENCES,
      narration: NARRATION,
      onEvidence,
    }, harness.dependencies);
    await host.initialize();

    expect(() => context!.recordEvidence('  ')).toThrow(/evidence id is required/i);
    expect(onEvidence).not.toHaveBeenCalled();
    await host.dispose();
  });

  it('switches presentation profiles for immersive sessions and restores the browser profile', async () => {
    const harness = createHostHarness();
    const onProfileChange = vi.fn();
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'profile-adapter',
        create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
      onProfileChange,
    }, harness.dependencies);
    await host.initialize();

    harness.emitXr('sessionstart');
    expect(host.profile()).toBe('questBaseline');
    harness.emitXr('sessionend');
    expect(host.profile()).toBe('browserBalanced');
    expect(harness.presentation.setQualityProfile.mock.calls).toEqual([
      ['questBaseline'],
      ['browserBalanced'],
    ]);
    expect(onProfileChange.mock.calls).toEqual([
      ['questBaseline'],
      ['browserBalanced'],
    ]);
    await host.dispose();
  });

  it('sizes the camera and presentation from the shared mount', async () => {
    const harness = createHostHarness();
    let context: SimulationSceneContext | undefined;
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'resize-adapter',
        create: value => {
          context = value;
          return { applySnapshot: vi.fn(), dispose: vi.fn() };
        },
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();

    expect(context!.camera.aspect).toBeCloseTo(16 / 9);
    expect(harness.presentation.resize).toHaveBeenCalledWith(960, 540, 2);
    expect(harness.resizeObserver.observe).toHaveBeenCalledOnce();
    await host.dispose();
  });

  it('requests and attaches one bounded-floor immersive session', async () => {
    const harness = createHostHarness();
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'vr-adapter',
        create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
      },
      preferences: {
        ...PREFERENCES,
        locomotion: 'boundedTeleport',
      },
      navigation: {
        movementBounds: new THREE.Box3(
          new THREE.Vector3(-2, -10, -2),
          new THREE.Vector3(2, 10, 2),
        ),
      },
      narration: NARRATION,
    }, harness.dependencies);
    await host.initialize();

    await host.enterVr();

    expect(harness.dependencies.requestXrSession).toHaveBeenCalledWith(
      'immersive-vr',
      {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      },
    );
    expect(harness.renderer.xr.setSession).toHaveBeenCalledOnce();
    await host.dispose();
  });

  it('rejects bounded teleport launches without authored movement bounds', () => {
    const harness = createHostHarness();

    expect(() => createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'unbounded-navigation-adapter',
        create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
      },
      preferences: {
        ...PREFERENCES,
        locomotion: 'boundedTeleport',
      },
      narration: NARRATION,
    }, harness.dependencies)).toThrow(
      /bounded teleport requires authored bounds/i,
    );
  });

  it('owns a bounded, head-relative snap-teleport rig for immersive navigation', async () => {
    const harness = createHostHarness();
    let context: SimulationSceneContext | undefined;
    const leftSource = {
      handedness: 'left',
      gamepad: {
        axes: [0, 0, 0, -1],
        buttons: Array.from({ length: 6 }, () => ({ pressed: false })),
      },
    };
    harness.setXrInputSources([leftSource]);
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'bounded-navigation-adapter',
        create: value => {
          context = value;
          return { applySnapshot: vi.fn(), dispose: vi.fn() };
        },
      },
      preferences: {
        ...PREFERENCES,
        locomotion: 'boundedTeleport',
      },
      navigation: {
        movementBounds: new THREE.Box3(
          new THREE.Vector3(-1, -10, -1),
          new THREE.Vector3(1, 10, 1),
        ),
        teleportStepMeters: 0.75,
      },
      narration: NARRATION,
    }, harness.dependencies);
    await host.initialize();
    const rig = context!.camera.parent!;

    harness.runFrame(0);
    expect(rig.position.z).toBeCloseTo(-0.75);
    harness.runFrame(16);
    expect(rig.position.z).toBeCloseTo(-0.75);

    await host.dispose();
    expect(rig.parent).toBeNull();
  });

  it('forwards the adapter focus target for framing and accessibility tools', async () => {
    const harness = createHostHarness();
    const target = new THREE.Object3D();
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'focus-target-adapter',
        create: () => ({
          applySnapshot: vi.fn(),
          focusTarget: () => target,
          dispose: vi.fn(),
        }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await host.initialize();

    expect(host.focusTarget()).toBe(target);
    await host.dispose();
  });

  it('disposes adapter and host resources once in reverse ownership order', async () => {
    const harness = createHostHarness();
    const order: string[] = [];
    harness.renderer.dispose = () => { order.push('renderer'); };
    harness.presentation.dispose = () => { order.push('presentation'); };
    harness.narration.dispose = () => { order.push('narration'); };
    harness.input.dispose = () => { order.push('input'); };
    harness.resizeObserver.disconnect = () => { order.push('resize'); };
    harness.stopVisibilityObserver.mockImplementation(() => {
      order.push('visibility');
    });
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'disposal-adapter',
        create: () => ({
          applySnapshot: vi.fn(),
          dispose: () => { order.push('adapter'); },
        }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);
    await host.initialize();

    await host.dispose();
    await host.dispose();

    expect(order).toEqual([
      'adapter',
      'visibility',
      'resize',
      'input',
      'narration',
      'presentation',
      'renderer',
    ]);
  });

  it('rolls back every registered resource when adapter initialization fails', async () => {
    const harness = createHostHarness();
    const released = vi.fn();
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'failing-adapter',
        create(context) {
          context.resources.register('partial-adapter-resource', released);
          throw new Error('adapter failed');
        },
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await expect(host.initialize()).rejects.toThrow('adapter failed');

    expect(released).toHaveBeenCalledOnce();
    expect(host.resources.leaks()).toEqual([]);
    await host.dispose();
    expect(released).toHaveBeenCalledOnce();
  });

  it('rolls back a running adapter when browser-loop setup fails', async () => {
    const harness = createHostHarness();
    const adapterDispose = vi.fn();
    harness.resizeObserver.observe = vi.fn(() => {
      throw new Error('resize setup failed');
    });
    const host = createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'browser-setup-adapter',
        create: () => ({
          applySnapshot: vi.fn(),
          dispose: adapterDispose,
        }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies);

    await expect(host.initialize()).rejects.toThrow('resize setup failed');

    expect(adapterDispose).toHaveBeenCalledOnce();
    expect(host.resources.leaks()).toEqual([]);
    await host.dispose();
    expect(adapterDispose).toHaveBeenCalledOnce();
  });

  it('rolls back synchronous browser resources when construction fails', () => {
    const harness = createHostHarness();
    const order: string[] = [];
    harness.renderer.dispose = () => { order.push('renderer'); };
    harness.presentation.dispose = () => { order.push('presentation'); };
    harness.narration.dispose = () => { order.push('narration'); };
    harness.input.dispose = () => { order.push('input'); };
    harness.dependencies.createResizeObserver = () => {
      throw new Error('ResizeObserver construction failed');
    };

    expect(() => createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'construction-adapter',
        create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
      },
      preferences: PREFERENCES,
      narration: NARRATION,
    }, harness.dependencies)).toThrow('ResizeObserver construction failed');

    expect(order).toEqual(['input', 'narration', 'presentation', 'renderer']);
  });

  it('detaches the provisional navigation rig when authored bounds are invalid', () => {
    const harness = createHostHarness();

    expect(() => createSimulationHost({
      mount: createMount(),
      adapter: {
        id: 'invalid-bounds-adapter',
        create: () => ({ applySnapshot: vi.fn(), dispose: vi.fn() }),
      },
      preferences: {
        ...PREFERENCES,
        locomotion: 'boundedTeleport',
      },
      navigation: {
        movementBounds: new THREE.Box3(
          new THREE.Vector3(1, 0, 1),
          new THREE.Vector3(-1, 1, -1),
        ),
      },
      narration: NARRATION,
    }, harness.dependencies)).toThrow(/finite, non-empty authored bounds/i);

    expect(harness.xrControllers.map(controller => controller.parent)).toEqual([
      null,
      null,
    ]);
    expect(harness.renderer.dispose).toHaveBeenCalledOnce();
  });
});
