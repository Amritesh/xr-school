"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createRainwaterState,
  narrationKeyFor,
  RAINWATER_NARRATION_KEYS,
  RAINWATER_STAGES,
  rainwaterCanContinue,
  rainwaterPrompt,
  reduceRainwater,
  savedLitres,
  spillingSockets,
  storedLitres,
  SUMMER_NEEDS,
  summerShortage,
  waterIsClear,
  type AssemblyStageId,
  type DroughtOption,
  type RainwaterAction,
  type RainwaterStageId,
  type RainwaterState,
  type SummerTarget,
} from "@/lib/rainwaterLesson";
import { createRainwaterScene, type RainwaterScene } from "@/lib/rainwaterScene";
import { createRainwaterAudio, soundsFor } from "@/lib/rainwaterSounds";
import {
  STORM,
  clearBlock,
  createStorm,
  routeStorm,
  setStormPaused,
  stepStorm,
  stormResult,
  type StormState,
  type StormTarget,
} from "@/lib/rainwaterStorm";
import {
  createVrHudPanel,
  type VrHudButtonId,
  type VrHudContent,
} from "@/lib/vr/vrHudPanel";
import { createGlbAssetLoader } from "@/lib/world-builder/glbAssets";
import { watchInterruptions } from "@/lib/world-builder/sessionInterruptions";
import { createInteractionSystem } from "@/lib/world-builder/interactionSystem";
import {
  publishRenderStats,
  readRenderStats,
} from "@/lib/world-builder/renderBudget";
import {
  createSocketInput,
  type SocketInput,
} from "@/lib/world-builder/socketAssemblyInput";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";

const NARRATIONS = [
  "Namaste, young explorers! I am Droppy. Welcome to Sundargram. It is raining hard, but look at the road. Follow a raindrop and see where it goes.",
  "Off the roof, down the road and into the drain. All of this rain is being lost, and nobody is saving a single drop.",
  "Now it is summer. The pond is almost dry and the crops are wilting. All that rain fell, but nobody stored it. What should the village do next monsoon?",
  "Back to the monsoon. This roof catches a lot of rain. Pick up each gutter and snap it to the edge of the roof. If you leave a gap, the water spills onto the road.",
  "Look, the tank water is dirty! The first rain washes dust off the roof. Open the red valve to send that dirty water away. Then stack stones, sand and charcoal in the filter. Even then, this water needs proper treatment and testing before anyone can drink it.",
  "The school has a much bigger roof, so it can catch much more rain. Put the long gutter on the roof edge, the pipe down the wall and the cover on the big tank. Watch how fast it fills!",
  "Some rain should go back into the ground. Build this pit from the bottom up: large stones, small stones, then sand. Then watch the water soak down and the groundwater rise.",
  "Heavy rain alert! Turn the valves to send water wherever there is room. When a store is full, switch quickly, and clear any leaves that block the channel. Ready?",
  "It is summer again, and this time you have water saved. Share it between the garden, the animals and cleaning. Remember, this water is not for drinking.",
  "It is summer again. You saved a lot, but not quite enough for everything. Choose carefully where your water goes. Remember, this water is not for drinking.",
  "You did it! You saved all ten thousand litres. Sundargram is ready for summer. You are a true Rainwater Guardian!",
  "Well done, Guardian! Every litre you saved is real water for Sundargram. Want to save even more? Try the storm again.",
];

const narrationFor = (state: RainwaterState) =>
  NARRATIONS[RAINWATER_NARRATION_KEYS.indexOf(narrationKeyFor(state))]!;

const STAGE_TITLES: Record<RainwaterStageId, string> = {
  "rainy-day": "The Lost Raindrops",
  drought: "Journey into Summer",
  rooftop: "Rooftop Collector",
  filter: "Filter and First Flush",
  school: "Save the School's Rain",
  recharge: "Recharge the Ground",
  storm: "The Heavy Rain Challenge",
  summer: "The Return of Summer",
  finale: "Rainwater Guardian",
};

const PIECE_LABELS: Record<string, string> = {
  "gutter-1": "gutter 1",
  "gutter-2": "gutter 2",
  "gutter-3": "gutter 3",
  "gutter-4": "gutter 4",
  stones: "stones",
  sand: "sand",
  charcoal: "charcoal",
  "school-gutter": "school gutter",
  "school-pipe": "school pipe",
  "school-tank": "tank cover",
  "large-stones": "large stones",
  "small-stones": "small stones",
  "pit-sand": "sand",
};

const SOCKET_LABELS: Record<string, string> = {
  "gutter-socket-1": "roof edge 1",
  "gutter-socket-2": "roof edge 2",
  "gutter-socket-3": "roof edge 3",
  "gutter-socket-4": "roof edge 4",
  "filter-top": "top of filter",
  "filter-middle": "middle of filter",
  "filter-bottom": "bottom of filter",
  "school-gutter-socket": "school roof edge",
  "school-pipe-socket": "pipe run",
  "school-tank-socket": "big tank",
  "pit-bottom": "bottom of pit",
  "pit-middle": "middle of pit",
  "pit-top": "top of pit",
};

const DROUGHT_CHOICES: { option: DroughtOption; label: string }[] = [
  { option: "drain", label: "Let it enter the drains" },
  { option: "road", label: "Leave it on the roads" },
  { option: "collect", label: "Collect and store it" },
];

const SUMMER_CHOICES: { target: SummerTarget; label: string }[] = [
  { target: "garden", label: "Water the garden" },
  { target: "animals", label: "Water the animals" },
  { target: "cleaning", label: "Use for cleaning" },
];

const STORM_ROUTES: { target: StormTarget; label: string; key: string }[] = [
  { target: "houseTank", label: "House tank", key: "1" },
  { target: "schoolTank", label: "School tank", key: "2" },
  { target: "rechargePit", label: "Recharge pit", key: "3" },
  { target: "pond", label: "Village pond", key: "4" },
];

const FLUSH_VALVE_ID = "first-flush-valve";
const FOCUS_SECONDS = 0.9;

function assemblyStageOf(stage: RainwaterStageId): AssemblyStageId | null {
  return stage === "rooftop" ||
    stage === "filter" ||
    stage === "school" ||
    stage === "recharge"
    ? stage
    : null;
}

export default function RainwaterStorageViewer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const stateRef = useRef<RainwaterState>(createRainwaterState());
  const worldRef = useRef<RainwaterScene | null>(null);
  const hudNeedsDrawRef = useRef(true);
  const stormRef = useRef<StormState | null>(null);
  const audioRef = useRef<ReturnType<typeof createRainwaterAudio> | null>(null);
  const [state, setState] = useState<RainwaterState>(stateRef.current);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [storm, setStorm] = useState<StormState | null>(null);
  const [lostLitres, setLostLitres] = useState(0);

  const publishStorm = useCallback((next: StormState | null) => {
    stormRef.current = next;
    worldRef.current?.applyStorm(next);
    setStorm(next);
    hudNeedsDrawRef.current = true;
  }, []);

  const startStorm = useCallback(
    (pace: 1 | 0.5) => {
      publishStorm(createStorm({ seed: Date.now() % 100_000, pace }));
    },
    [publishStorm],
  );

  const routeTo = useCallback(
    (target: StormTarget) => {
      if (stormRef.current) publishStorm(routeStorm(stormRef.current, target));
    },
    [publishStorm],
  );

  const clearLeaves = useCallback(() => {
    if (stormRef.current) publishStorm(clearBlock(stormRef.current));
  }, [publishStorm]);

  const dispatch = useCallback((action: RainwaterAction) => {
    const before = stateRef.current;
    const next = reduceRainwater(before, action);
    if (next === before) return;
    stateRef.current = next;
    worldRef.current?.apply(next);
    hudNeedsDrawRef.current = true;
    setState(next);
    for (const sound of soundsFor(before, next)) audioRef.current?.play(sound);
    if (next.stage !== "storm" && stormRef.current) {
      stormRef.current = null;
      worldRef.current?.applyStorm(null);
      setStorm(null);
      audioRef.current?.setRain(0);
    }
    if (narrationKeyFor(next) !== narrationKeyFor(before)) {
      playNarration(narrationFor(next));
    }
  }, []);

  useEffect(() => {
    (navigator as Navigator & {
      xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
    }).xr
      ?.isSessionSupported?.("immersive-vr")
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const audio = createRainwaterAudio();
    audioRef.current = audio;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      62,
      mount.clientWidth / mount.clientHeight,
      0.05,
      200,
    );
    camera.position.set(0.1, 2.1, 8.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(1.15, 1.5, 1.2);
    controls.enableDamping = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 13;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;

    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    let activeController = controllers[0]!;
    const onControllerSelect = (event: { target: unknown }) => {
      activeController = event.target as THREE.XRTargetRaySpace;
    };
    controllers.forEach((controller) => {
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 2.2, 4),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
      );
      ray.rotation.x = Math.PI / 2;
      ray.position.z = -1.1;
      controller.add(ray);
      controller.addEventListener("selectstart", onControllerSelect);
    });

    const hud = createVrHudPanel({ scene });

    const carryPoint = new THREE.Vector3();
    const carryDirection = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const pointerCaster = new THREE.Raycaster();
    const onPointerMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    const getCarryPoint = () => {
      if (renderer.xr.isPresenting) {
        activeController.updateMatrixWorld(true);
        carryPoint.setFromMatrixPosition(activeController.matrixWorld);
        carryDirection
          .set(0, 0, -1)
          .transformDirection(activeController.matrixWorld);
        return carryPoint.addScaledVector(carryDirection, 2);
      }
      pointerCaster.setFromCamera(pointer, camera);
      return carryPoint
        .copy(pointerCaster.ray.origin)
        .addScaledVector(pointerCaster.ray.direction, 4);
    };

    let socketInput: SocketInput | null = null;
    const continueOrComplain = () => dispatch({ type: "continue" });

    const hudActions: Partial<Record<VrHudButtonId, () => void>> = {
      previous: () => dispatch({ type: "back" }),
      next: continueOrComplain,
      replay: () =>
        playNarration(narrationFor(stateRef.current)),
      exit: () => void renderer.xr.getSession()?.end(),
      help: () => dispatch({ type: "try-drinking" }),
      "choice-a": () => hudChoice(stateRef.current, 0, dispatch, startStorm),
      "choice-b": () => hudChoice(stateRef.current, 1, dispatch, startStorm),
      "choice-c": () => hudChoice(stateRef.current, 2, dispatch, startStorm),
    };

    const interaction = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: controllers,
      cursor: { hover: "pointer", idle: "grab" },
      onSelect: (id) => {
        if (id.startsWith("hud:")) {
          hudActions[id.slice(4) as VrHudButtonId]?.();
          return;
        }
        if (id === FLUSH_VALVE_ID) {
          dispatch({ type: "open-first-flush" });
          return;
        }
        if (id === "leaf-block") {
          clearLeaves();
          return;
        }
        if (id.startsWith("valve-")) {
          routeTo(id.slice(6) as StormTarget);
          return;
        }
        socketInput?.handleSelect(id);
      },
    });
    (Object.keys(hud.buttons) as VrHudButtonId[]).forEach((id) =>
      interaction.register(`hud:${id}`, hud.buttons[id]),
    );

    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: continueOrComplain,
      onBack: () => dispatch({ type: "back" }),
      onNarrate: () =>
        playNarration(narrationFor(stateRef.current)),
      startPosition: new THREE.Vector3(0, 0, 2.6),
      movementBounds: new THREE.Box2(
        new THREE.Vector2(-18, -1),
        new THREE.Vector2(18, 13),
      ),
      gripExits: false,
    });

    const assets = createGlbAssetLoader(renderer);
    let disposed = false;
    void createRainwaterScene(scene, assets, {
      reducedMotion,
      onDiagnostic: (message) => console.warn(message),
    }).then((world) => {
      if (disposed) {
        world.dispose();
        return;
      }
      worldRef.current = world;
      world.apply(stateRef.current);
      for (const [id, object] of world.socketTargets) {
        interaction.register(id, object);
      }
      for (const [id, object] of world.pieceTargets) {
        interaction.register(id, object, { highlightColor: 0xffc23d });
      }
      interaction.register(FLUSH_VALVE_ID, world.valve, {
        highlightColor: 0xffc23d,
      });
      for (const [id, object] of world.stormTargets) {
        interaction.register(id, object, { highlightColor: 0xffffff });
      }
      socketInput = createSocketInput({
        pieces: world.pieceTargets,
        sockets: world.socketTargets,
        getSocketOf: (pieceId) => {
          const stage = assemblyStageOf(stateRef.current.stage);
          if (!stage) return null;
          const { placed } = stateRef.current.assemblies[stage];
          return (
            Object.keys(placed).find((socket) => placed[socket] === pieceId) ??
            null
          );
        },
        getPicked: () => {
          const stage = assemblyStageOf(stateRef.current.stage);
          return stage ? stateRef.current.assemblies[stage].picked : null;
        },
        dispatch: (action) => dispatch({ type: "assembly", action }),
        getCarryPoint,
      });
      setReady(true);
    });

    const clock = new THREE.Clock();
    let lastStatsAt = 0;
    let lastStormUiAt = 0;
    let lastLost = 0;
    type Focus = { position: THREE.Vector3; target: THREE.Vector3 };
    let focusedStage: RainwaterStageId = stateRef.current.stage;
    let focusFrom: Focus | null = null;
    let focusTo: Focus | null = null;
    let focusTime = 0;
    let vrSpotStage: RainwaterStageId | null = null;
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      questVr.update();
      worldRef.current?.update(delta);
      socketInput?.update(delta);
      const playing = stormRef.current;
      if (playing && !stormResult(playing).finished) {
        const stepped = stepStorm(playing, delta);
        stormRef.current = stepped;
        worldRef.current?.applyStorm(stepped);
        const result = stormResult(stepped);
        audio.setRain(stepped.paused ? 0 : 0.35 + (stepped.elapsed / STORM.durationSeconds) * 0.65);
        if (result.finished) {
          audio.setRain(0);
          setStorm(stepped);
          dispatch({ type: "storm-finished", routedLitres: result.routed });
          hudNeedsDrawRef.current = true;
        } else if (elapsed - lastStormUiAt >= 0.25) {
          lastStormUiAt = elapsed;
          setStorm(stepped);
          hudNeedsDrawRef.current = true;
        }
      }
      if (stateRef.current.stage === "rainy-day" && worldRef.current) {
        const lost = worldRef.current.lostLitres();
        if (lost !== lastLost) {
          lastLost = lost;
          setLostLitres(lost);
        }
      }
      const current = stateRef.current;
      interaction.setSuggested(
        current.stage === "filter" && !current.firstFlushOpen
          ? FLUSH_VALVE_ID
          : undefined,
      );
      interaction.update(elapsed);
      const presenting = renderer.xr.isPresenting;
      if (presenting && worldRef.current && vrSpotStage !== current.stage) {
        vrSpotStage = current.stage;
        questVr.rig.position.copy(worldRef.current.vrSpotFor(current.stage));
        questVr.rig.rotation.set(0, 0, 0);
      } else if (!presenting) {
        vrSpotStage = null;
      }
      if (focusedStage !== current.stage && worldRef.current && !presenting) {
        const next = worldRef.current.focusFor(current.stage);
        const previous = worldRef.current.focusFor(focusedStage);
        focusedStage = current.stage;
        if (!next.position.equals(previous.position)) {
          focusFrom = {
            position: camera.position.clone(),
            target: controls.target.clone(),
          };
          focusTo = next;
          focusTime = reducedMotion ? FOCUS_SECONDS : 0;
        }
      }
      if (focusFrom && focusTo) {
        focusTime = Math.min(FOCUS_SECONDS, focusTime + delta);
        const t = THREE.MathUtils.smoothstep(focusTime / FOCUS_SECONDS, 0, 1);
        camera.position.lerpVectors(focusFrom.position, focusTo.position, t);
        controls.target.lerpVectors(focusFrom.target, focusTo.target, t);
        if (focusTime >= FOCUS_SECONDS) focusFrom = focusTo = null;
      }
      if (presenting) {
        interaction.updateXrHover();
        if (hudNeedsDrawRef.current) {
          hudNeedsDrawRef.current = false;
          hud.setContent(hudContent(stateRef.current, stormRef.current));
        }
        hud.update(renderer.xr.getCamera(), delta);
      } else {
        controls.update();
      }
      hud.setVisible(presenting);
      renderer.render(scene, camera);
      if (rootRef.current && elapsed - lastStatsAt >= 1) {
        lastStatsAt = elapsed;
        publishRenderStats(rootRef.current, readRenderStats(renderer.info));
      }
    });

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    // An interrupted storm waits: no water lost and no time jump on return.
    const pauseStorm = (paused: boolean) => {
      if (!stormRef.current) return;
      publishStorm(setStormPaused(stormRef.current, paused));
      if (paused) audio.setRain(0);
    };
    const stopWatchingInterruptions = watchInterruptions({
      document,
      xr: renderer.xr as never,
      onPausedChange: pauseStorm,
    });

    const onKey = (event: KeyboardEvent) => {
      if (!stormRef.current) return;
      const route = STORM_ROUTES.find(({ key }) => key === event.key);
      if (route) routeTo(route.target);
      else if (event.key.toLowerCase() === "b") clearLeaves();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      disposed = true;
      stopWatchingInterruptions();
      window.removeEventListener("keydown", onKey);
      audio.dispose();
      audioRef.current = null;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      controllers.forEach((controller) =>
        controller.removeEventListener("selectstart", onControllerSelect),
      );
      socketInput?.dispose();
      interaction.dispose();
      hud.dispose();
      controls.dispose();
      questVr.dispose();
      worldRef.current?.dispose();
      worldRef.current = null;
      assets.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      stopNarration();
    };
  }, [dispatch, clearLeaves, publishStorm, routeTo, startStorm]);

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: {
          requestSession?: (
            mode: string,
            options: object,
          ) => Promise<XRSession>;
        };
      }
    ).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      hudNeedsDrawRef.current = true;
      window.setTimeout(
        () =>
          playNarration(narrationFor(stateRef.current)),
        900,
      );
    } catch {
      setVrSupported(false);
    }
  }, []);

  const saved = savedLitres(state);
  const stageIndex = RAINWATER_STAGES.indexOf(state.stage);
  const assemblyStage = assemblyStageOf(state.stage);
  const assembly = assemblyStage ? state.assemblies[assemblyStage] : null;
  const placedPieces = new Set(Object.values(assembly?.placed ?? {}));
  const canContinue = rainwaterCanContinue(state);

  return (
    <div
      ref={rootRef}
      data-testid="rainwater-mission"
      data-ready={ready}
      data-stage={state.stage}
      data-saved-litres={saved}
      data-spilling={state.stage === "rooftop" ? spillingSockets(state).length : 0}
      data-first-flush={state.firstFlushOpen}
      data-water-clear={waterIsClear(state)}
      data-lost-litres={lostLitres}
      data-storm-active={storm?.active ?? ""}
      data-storm-elapsed={storm ? storm.elapsed.toFixed(2) : ""}
      data-storm-paused={storm?.paused ?? false}
      data-storm-blocked={storm?.blocked ?? false}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#082f49",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(circle at 50% 25%, #0e7490 0%, #082f49 72%)",
          }}
        >
          <div style={{ maxWidth: 720, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 82 }}>💧🧢🌧️🏘️</div>
            <div
              style={{
                margin: "14px 0 10px",
                color: "#7dd3fc",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Class 5 • Chapter 6 • Every Drop Counts
            </div>
            <h1
              style={{
                color: "#f0f9ff",
                fontSize: "clamp(2.15rem, 5vw, 3.4rem)",
                lineHeight: 1.05,
                margin: "0 0 12px",
              }}
            >
              The Secret of the Lost Raindrops
            </h1>
            <p
              style={{
                color: "#e0f2fe",
                lineHeight: 1.7,
                maxWidth: 620,
                margin: "0 auto",
              }}
            >
              Join Droppy in Sundargram. Build real rainwater-harvesting systems
              with your own hands and see how much water you can save before
              summer returns.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 25,
              }}
            >
              {vrSupported && (
                <button onClick={enterVR} style={primaryButtonStyle}>
                  🥽 Start Mission in VR
                </button>
              )}
              <button
                onClick={() => {
                  unlockNarration();
                  setStarted(true);
                  playNarration(narrationFor(state));
                }}
                style={secondaryButtonStyle}
              >
                💻 Start Mission in Browser
              </button>
            </div>
          </div>
        </div>
      )}

      {started && (
        <>
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: "min(420px, calc(100vw - 24px))",
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(8,47,73,0.88)",
              color: "#f0f9ff",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: "0.78rem",
                fontWeight: 800,
              }}
            >
              <span>💧 WATER SAVED</span>
              <span>{saved.toLocaleString("en-US")} / 10,000 L</span>
            </div>
            <div
              style={{
                height: 8,
                marginTop: 7,
                borderRadius: 4,
                background: "rgba(255,255,255,0.16)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, saved / 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #38bdf8, #4ade80)",
                  transition: "width 0.9s ease",
                }}
              />
            </div>
            {state.stage === "rainy-day" && state.observedRunoff && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  color: "#fda4af",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                }}
              >
                <span>🚰 LOST TO THE DRAIN</span>
                <span>{lostLitres.toLocaleString("en-US")} L</span>
              </div>
            )}
          </div>

          <aside
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              width: "min(330px, calc(100vw - 24px))",
              maxHeight: "calc(100vh - 92px)",
              overflowY: "auto",
              padding: 14,
              borderRadius: 12,
              background: "rgba(8,47,73,0.9)",
              color: "#f0f9ff",
              zIndex: 5,
            }}
          >
            <div
              style={{
                color: "#7dd3fc",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              STEP {stageIndex + 1} OF {RAINWATER_STAGES.length}
            </div>
            <h2 style={{ margin: "4px 0 8px", fontSize: "1.1rem" }}>
              {STAGE_TITLES[state.stage]}
            </h2>
            <p style={bodyCopyStyle}>{rainwaterPrompt(state)}</p>
            <div
              role="status"
              style={{ minHeight: 18, color: "#fde68a", fontSize: "0.8rem" }}
            >
              {state.feedback}
            </div>

            {state.stage === "rainy-day" && (
              <button
                style={primaryButtonStyle}
                onClick={() => dispatch({ type: "observe" })}
              >
                Follow the raindrop
              </button>
            )}
            {state.stage === "drought" &&
              DROUGHT_CHOICES.map(({ option, label }) => (
                <button
                  key={option}
                  style={secondaryButtonStyle}
                  onClick={() => dispatch({ type: "choose", option })}
                >
                  {label}
                </button>
              ))}
            {state.stage === "filter" && (
              <button
                style={secondaryButtonStyle}
                disabled={state.firstFlushOpen}
                onClick={() => dispatch({ type: "open-first-flush" })}
              >
                {state.firstFlushOpen
                  ? "First-flush valve is open"
                  : "Open the first-flush valve"}
              </button>
            )}
            {assembly && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.keys(assembly.pieces)
                  .filter((id) => !placedPieces.has(id))
                  .map((id) => (
                    <button
                      key={id}
                      aria-pressed={assembly.picked === id}
                      style={
                        assembly.picked === id
                          ? primaryButtonStyle
                          : secondaryButtonStyle
                      }
                      onClick={() =>
                        dispatch({
                          type: "assembly",
                          action: { kind: "pick", pieceId: id },
                        })
                      }
                    >
                      Pick up {PIECE_LABELS[id]}
                    </button>
                  ))}
                {assembly.sockets.map(({ id }) => {
                  const piece = assembly.placed[id];
                  return piece ? (
                    <button
                      key={id}
                      style={secondaryButtonStyle}
                      onClick={() =>
                        dispatch({
                          type: "assembly",
                          action: { kind: "remove", socketId: id },
                        })
                      }
                    >
                      Remove from {SOCKET_LABELS[id]}
                    </button>
                  ) : (
                    <button
                      key={id}
                      disabled={assembly.picked === null}
                      style={{
                        ...secondaryButtonStyle,
                        opacity: assembly.picked === null ? 0.5 : 1,
                      }}
                      onClick={() =>
                        dispatch({
                          type: "assembly",
                          action: { kind: "place", socketId: id },
                        })
                      }
                    >
                      Place on {SOCKET_LABELS[id]}
                    </button>
                  );
                })}
              </div>
            )}
            {state.stage === "storm" && !storm && (
              <>
                <button style={primaryButtonStyle} onClick={() => startStorm(1)}>
                  ⛈️ Start the storm
                </button>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => startStorm(0.5)}
                >
                  Start at a slower pace
                </button>
              </>
            )}
            {state.stage === "storm" && storm && (
              <>
                <div style={{ display: "grid", gap: 5, marginBottom: 6 }}>
                  {STORM_ROUTES.map(({ target, label, key }) => {
                    const level = storm.levels[target];
                    const capacity = STORM.capacities[target];
                    const full = level >= capacity - 1;
                    return (
                      <button
                        key={target}
                        aria-pressed={storm.active === target}
                        disabled={stormResult(storm).finished}
                        onClick={() => routeTo(target)}
                        style={{
                          ...(storm.active === target
                            ? primaryButtonStyle
                            : secondaryButtonStyle),
                          marginTop: 0,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${Math.min(100, (level / capacity) * 100)}%`,
                            background: full
                              ? "rgba(248,113,113,0.5)"
                              : "rgba(56,189,248,0.4)",
                          }}
                        />
                        <span style={{ position: "relative" }}>
                          {key}: {label} {full ? "(full)" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {storm.blocked && (
                  <button style={primaryButtonStyle} onClick={clearLeaves}>
                    🍂 Clear the leaves (B)
                  </button>
                )}
                {storm.paused && !stormResult(storm).finished && (
                  <button
                    style={primaryButtonStyle}
                    onClick={() => publishStorm(setStormPaused(storm, false))}
                  >
                    Resume the storm
                  </button>
                )}
                <div style={{ fontSize: "0.8rem", color: "#e0f2fe", marginTop: 4 }}>
                  Routed {Math.round(storm.routed).toLocaleString("en-US")} L •
                  Flooded {Math.round(storm.flooded).toLocaleString("en-US")} L
                  {!stormResult(storm).finished &&
                    ` • ${Math.ceil(STORM.durationSeconds - storm.elapsed)} s left`}
                </div>
                {stormResult(storm).finished && (
                  <button
                    style={secondaryButtonStyle}
                    onClick={() => startStorm(storm.pace)}
                  >
                    Play the storm again
                  </button>
                )}
              </>
            )}
            {state.stage === "summer" && (
              <>
                {SUMMER_CHOICES.map(({ target, label }) => (
                  <button
                    key={target}
                    style={secondaryButtonStyle}
                    onClick={() => dispatch({ type: "allocate", target })}
                  >
                    {label} ({state.allocated[target].toLocaleString("en-US")} /{" "}
                    {SUMMER_NEEDS[target].toLocaleString("en-US")} L)
                  </button>
                ))}
                <button
                  style={secondaryButtonStyle}
                  onClick={() => dispatch({ type: "try-drinking" })}
                >
                  Drink it
                </button>
              </>
            )}
            {state.stage === "finale" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    marginBottom: 6,
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={compareCardStyle}>
                    <strong>A village that lets its rain run away</strong>
                    <div>0 L saved</div>
                    <div>Pond dry, crops wilting</div>
                  </div>
                  <div style={compareCardStyle}>
                    <strong>Your Sundargram</strong>
                    <div>{saved.toLocaleString("en-US")} L saved</div>
                    <div>
                      {summerShortage(state) > 0
                        ? `${summerShortage(state).toLocaleString("en-US")} L short this summer`
                        : `${storedLitres(state).toLocaleString("en-US")} L stored for summer`}
                    </div>
                  </div>
                </div>
                <button
                  style={primaryButtonStyle}
                  onClick={() => dispatch({ type: "retry-storm" })}
                >
                  Replay the storm
                </button>
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                style={{ ...navButtonStyle, opacity: stageIndex === 0 ? 0.45 : 1 }}
                disabled={stageIndex === 0}
                onClick={() => dispatch({ type: "back" })}
              >
                Back
              </button>
              {state.stage !== "finale" && (
                <button
                  style={{
                    ...navButtonStyle,
                    opacity: canContinue ? 1 : 0.45,
                    fontWeight: 800,
                  }}
                  disabled={!canContinue}
                  onClick={() => dispatch({ type: "continue" })}
                >
                  Continue
                </button>
              )}
            </div>
            <button
              style={secondaryButtonStyle}
              onClick={() =>
                playNarration(narrationFor(state))
              }
            >
              🔊 Replay Droppy’s narration
            </button>
            {vrSupported && (
              <button onClick={enterVR} style={secondaryButtonStyle}>
                🥽 Enter VR
              </button>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

function hudChoiceLabels(state: RainwaterState): string[] {
  if (state.stage === "rainy-day") return ["Follow the raindrop"];
  if (state.stage === "drought") return DROUGHT_CHOICES.map((c) => c.label);
  if (state.stage === "filter" && !state.firstFlushOpen) return ["Open valve"];
  if (state.stage === "storm") return ["Start storm", "Slower pace"];
  if (state.stage === "summer") return SUMMER_CHOICES.map((c) => c.label);
  if (state.stage === "finale") return ["Replay the storm"];
  return [];
}

function hudChoice(
  state: RainwaterState,
  index: number,
  dispatch: (action: RainwaterAction) => void,
  startStorm: (pace: 1 | 0.5) => void,
) {
  if (state.stage === "rainy-day") dispatch({ type: "observe" });
  else if (state.stage === "drought")
    dispatch({ type: "choose", option: DROUGHT_CHOICES[index]!.option });
  else if (state.stage === "filter") dispatch({ type: "open-first-flush" });
  else if (state.stage === "storm") startStorm(index === 0 ? 1 : 0.5);
  else if (state.stage === "summer")
    dispatch({ type: "allocate", target: SUMMER_CHOICES[index]!.target });
  else if (state.stage === "finale") dispatch({ type: "retry-storm" });
}

function hudContent(
  state: RainwaterState,
  storm: StormState | null,
): VrHudContent {
  const index = RAINWATER_STAGES.indexOf(state.stage);
  if (state.stage === "storm" && storm && !stormResult(storm).finished) {
    return {
      eyebrow: `${Math.ceil(STORM.durationSeconds - storm.elapsed)} s left`,
      title: storm.blocked ? "Leaves! Clear the channel" : "Turn the valves",
      body: STORM_ROUTES.map(
        ({ target, label }) =>
          `${label}: ${Math.round(storm.levels[target])} / ${STORM.capacities[target]} L`,
      ).join("  •  "),
      hint: `Routed ${Math.round(storm.routed)} L, flooded ${Math.round(storm.flooded)} L`,
      buttons: ["exit"],
    };
  }
  return {
    eyebrow: `Step ${index + 1} of ${RAINWATER_STAGES.length} • ${savedLitres(state).toLocaleString("en-US")} L saved`,
    title: STAGE_TITLES[state.stage],
    body: state.feedback ?? rainwaterPrompt(state),
    hint: rainwaterCanContinue(state) ? "Ready: press A to continue" : undefined,
    choices: (storm && state.stage === "storm"
      ? ["Play again", "Slower pace"]
      : hudChoiceLabels(state)
    ).map((label) => ({ label })),
    buttons:
      state.stage === "finale"
        ? ["previous", "replay", "exit"]
        : state.stage === "summer"
          ? ["previous", "next", "help", "exit"]
          : ["previous", "next", "replay", "exit"],
  };
}

const primaryButtonStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg, #0284c7, #0e7490)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 7,
} as const;

const compareCardStyle = {
  padding: 8,
  borderRadius: 8,
  background: "rgba(125,211,252,0.1)",
  display: "grid",
  gap: 4,
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: "1px solid rgba(125,211,252,0.42)",
  background: "rgba(125,211,252,0.1)",
  color: "#e0f2fe",
} as const;

const bodyCopyStyle = {
  margin: "0 0 11px",
  color: "#e0f2fe",
  fontSize: "0.83rem",
  lineHeight: 1.52,
} as const;

const navButtonStyle = {
  flex: 1,
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.07)",
  color: "#e0f2fe",
  cursor: "pointer",
} as const;
