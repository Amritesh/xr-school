"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createRainwaterState,
  RAINWATER_STAGES,
  rainwaterCanContinue,
  rainwaterPrompt,
  reduceRainwater,
  savedLitres,
  spillingSockets,
  SUMMER_NEEDS,
  waterIsClear,
  type AssemblyStageId,
  type DroughtOption,
  type RainwaterAction,
  type RainwaterStageId,
  type RainwaterState,
  type SummerTarget,
} from "@/lib/rainwaterLesson";
import { createRainwaterScene, type RainwaterScene } from "@/lib/rainwaterScene";
import {
  createVrHudPanel,
  type VrHudButtonId,
  type VrHudContent,
} from "@/lib/vr/vrHudPanel";
import { createGlbAssetLoader } from "@/lib/world-builder/glbAssets";
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
  "Namaste, young explorers! Welcome to Sundargram. I am Droppy, your water-drop guide. This village receives plenty of rain every year, but most of the rainwater is disappearing. Accept our mission, find the lost raindrops, and help save the village.",
  "The monsoon has arrived! Look around as rain falls on roofs, roads, gardens, farms, trees and open spaces. Sundargram receives ten thousand litres, but none is collected. Follow the roof runoff into the drain. All ten thousand litres are being lost.",
  "Let us travel a few months into the future. It is now a hot summer. The pond is almost dry, plants are wilting and farmers are worried. The village had plenty of rain, but it allowed the water to flow away instead of storing it.",
  "What should the villagers do with rainwater? Let it escape into drains, waste it on flooded roads, or collect and store it for future use? Choose collect and store it. Correct! You are ready to become a Rainwater Guardian.",
  "We are back in the rainy season. Our mission map shows a house rooftop, the school building, a farm recharge area and the village pond. Complete every mission and guide Sundargram toward its ten-thousand-litre target.",
  "Mission one begins at the house rooftop. Place gutters along the lower edge of the sloping roof. The roof catches rain over a wide area, and the gutters guide the runoff into a downpipe instead of allowing it to spill onto the road.",
  "Connect the downpipe to a first-flush chamber, filter and covered tank. The first dirty flow can carry leaves and dust, so it is diverted. Later water passes through stones, sand and charcoal. Filtering removes dirt, but drinking water still needs proper treatment and testing.",
  "The school has a large roof, so it can collect a great deal of rain. Connect its gutters and pipe to the underground tank. This stored water can be used for the school garden, cleaning pathways and other careful non-drinking uses.",
  "Now build a groundwater recharge pit. Place large stones at the bottom, small stones above them and sand on top. Rainwater passes slowly through the layers and enters the soil. Watch the groundwater level rise and nearby plants recover.",
  "Heavy rain alert! Guide water toward the house tank, school tank, recharge pit and village pond. Excellent work. The roads are clearing and the saved-water meter has reached ten thousand litres. You saved every possible drop.",
  "Travel forward to summer once more. This time the village is green and water-secure. Stored rainwater supports crops, gardens, cleaning and animals. The villagers no longer need to travel far because they saved rain during the monsoon.",
  "Compare the two villages. In one, rain flows away, the pond dries and crops suffer. In the other, rooftops collect water, covered tanks store it and recharge pits return it to the ground. Choose the village that saves rainwater.",
  "You have saved Sundargram! Raise your Rainwater Guardian badge and repeat: I promise to save water and make every drop count. Rainwater is a precious natural resource. Save rainwater, save our future. Every drop counts!",
];

const STAGE_NARRATION: Record<RainwaterStageId, number> = {
  "rainy-day": 1,
  drought: 2,
  rooftop: 5,
  filter: 6,
  school: 7,
  recharge: 8,
  storm: 9,
  summer: 10,
  finale: 12,
};

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
  "school-tank": "underground tank",
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
  "school-tank-socket": "tank pit",
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
  const [state, setState] = useState<RainwaterState>(stateRef.current);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);

  const dispatch = useCallback((action: RainwaterAction) => {
    const before = stateRef.current;
    const next = reduceRainwater(before, action);
    if (next === before) return;
    stateRef.current = next;
    worldRef.current?.apply(next);
    hudNeedsDrawRef.current = true;
    setState(next);
    if (next.stage !== before.stage) {
      playNarration(NARRATIONS[STAGE_NARRATION[next.stage]]);
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
        playNarration(NARRATIONS[STAGE_NARRATION[stateRef.current.stage]]),
      exit: () => void renderer.xr.getSession()?.end(),
      "choice-a": () => hudChoice(stateRef.current, 0, dispatch),
      "choice-b": () => hudChoice(stateRef.current, 1, dispatch),
      "choice-c": () => hudChoice(stateRef.current, 2, dispatch),
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
        playNarration(NARRATIONS[STAGE_NARRATION[stateRef.current.stage]]),
      startPosition: new THREE.Vector3(0, 0, 5.6),
      movementBounds: new THREE.Box2(
        new THREE.Vector2(-6, 3),
        new THREE.Vector2(6, 8),
      ),
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
    type Focus = { position: THREE.Vector3; target: THREE.Vector3 };
    let focusedStage: RainwaterStageId = stateRef.current.stage;
    let focusFrom: Focus | null = null;
    let focusTo: Focus | null = null;
    let focusTime = 0;
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      questVr.update();
      worldRef.current?.update(delta);
      socketInput?.update(delta);
      const current = stateRef.current;
      interaction.setSuggested(
        current.stage === "filter" && !current.firstFlushOpen
          ? FLUSH_VALVE_ID
          : undefined,
      );
      interaction.update(elapsed);
      const presenting = renderer.xr.isPresenting;
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
          hud.setContent(hudContent(stateRef.current));
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

    return () => {
      disposed = true;
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
  }, [dispatch]);

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
          playNarration(NARRATIONS[STAGE_NARRATION[stateRef.current.stage]]),
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
                  playNarration(NARRATIONS[STAGE_NARRATION[state.stage]]);
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
            {state.stage === "storm" && (
              <button
                style={secondaryButtonStyle}
                onClick={() =>
                  dispatch({ type: "storm-finished", routedLitres: 2000 })
                }
              >
                Preview only: end the storm at 2,000 L
              </button>
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
              <button
                style={primaryButtonStyle}
                onClick={() => dispatch({ type: "retry-storm" })}
              >
                Replay the storm
              </button>
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
                playNarration(NARRATIONS[STAGE_NARRATION[state.stage]])
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
  if (state.stage === "storm") return ["Preview: end storm"];
  if (state.stage === "summer") return SUMMER_CHOICES.map((c) => c.label);
  if (state.stage === "finale") return ["Replay the storm"];
  return [];
}

function hudChoice(
  state: RainwaterState,
  index: number,
  dispatch: (action: RainwaterAction) => void,
) {
  if (state.stage === "rainy-day") dispatch({ type: "observe" });
  else if (state.stage === "drought")
    dispatch({ type: "choose", option: DROUGHT_CHOICES[index]!.option });
  else if (state.stage === "filter") dispatch({ type: "open-first-flush" });
  else if (state.stage === "storm")
    dispatch({ type: "storm-finished", routedLitres: 2000 });
  else if (state.stage === "summer")
    dispatch({ type: "allocate", target: SUMMER_CHOICES[index]!.target });
  else if (state.stage === "finale") dispatch({ type: "retry-storm" });
}

function hudContent(state: RainwaterState): VrHudContent {
  const index = RAINWATER_STAGES.indexOf(state.stage);
  return {
    eyebrow: `Step ${index + 1} of ${RAINWATER_STAGES.length} • ${savedLitres(state).toLocaleString("en-US")} L saved`,
    title: STAGE_TITLES[state.stage],
    body: state.feedback ?? rainwaterPrompt(state),
    hint: rainwaterCanContinue(state) ? "Ready: press A to continue" : undefined,
    choices: hudChoiceLabels(state).map((label) => ({ label })),
    buttons:
      state.stage === "finale"
        ? ["previous", "replay", "exit"]
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
