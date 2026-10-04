"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { createGuidedCamera } from "@/lib/world-builder/guidedCamera";
import { createColourPicnicScene } from "@/lib/colourPicnicScene";
import { createPicnicInput } from "@/lib/colourPicnicInput";
import {
  createMoneyTownAudio,
  type MoneyAudioStatus,
} from "@/lib/moneyTownAudio";
import {
  createColourPicnicState,
  reduceColourPicnic,
  picnicCanContinue,
  picnicPrompt,
  PICNIC_COLOURS,
  PICNIC_FRUITS,
  PICNIC_NARRATION,
  PICNIC_PAINT_REQUIRED,
  type PicnicAction,
  type PicnicPhase,
} from "@/lib/colourPicnicLesson";
import { createQuestVrControls } from "./questVrControls";
import styles from "./ColourPicnicViewer.module.css";

const PHASES: PicnicPhase[] = [
  "welcome",
  "fruit",
  "paint",
  "decorate",
  "celebrate",
];
const TITLES: Record<PicnicPhase, string> = {
  welcome: "A little picnic. Made by you.",
  fruit: "Something red for our basket.",
  paint: "A little brush. A splash of blue.",
  decorate: "Make this picnic yours.",
  celebrate: "Look what you made!",
};
const HINTS: Record<PicnicPhase, string> = {
  welcome:
    "Pack a fruit, paint a cup and plant your own flag in a sunny garden.",
  fruit:
    "Pick up a fruit. Drag it into the basket, or tap the basket to place it.",
  paint:
    "Tap a paint pot, then drag your brush across the cup. The paint follows you.",
  decorate:
    "Choose a flag on the table, then touch the little stand. Every colour is welcome.",
  celebrate:
    "Your apple, your painted cup, your flag. Take a look around your finished picnic.",
};
const LABELS: Record<string, string> = {
  "red-apple": "Red apple",
  "green-apple": "Green apple",
  banana: "Banana",
  basket: "Picnic basket",
  "paint-red": "Red paint",
  "paint-blue": "Blue paint",
  "paint-yellow": "Yellow paint",
  cup: "Brush the cup",
  brush: "Your paintbrush",
  "flag-red": "Red flag",
  "flag-blue": "Blue flag",
  "flag-yellow": "Yellow flag",
  "flag-stand": "Plant your flag here",
  bird: "Listen to your guide",
};
const cue = (id: string) => ({
  id,
  text: PICNIC_NARRATION[id] ?? "",
  audioUrl: `/narration/colour-picnic/${id}.mp3`,
});

function vrCard(text: string, width = 1.5) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff9e9";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "#809167";
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1012, 244);
  ctx.fillStyle = "#263d2d";
  ctx.textAlign = "center";
  ctx.font = "600 44px sans-serif";
  let line = "";
  let y = 85;
  for (const word of text.split(" ")) {
    if (ctx.measureText(`${line} ${word}`).width > 950) {
      ctx.fillText(line, 512, y);
      line = word;
      y += 62;
    } else line = line ? `${line} ${word}` : word;
  }
  ctx.fillText(line, 512, y);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
}

export default function ColourPicnicViewer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vrRequestRef = useRef(false);
  const audioRef = useRef<ReturnType<typeof createMoneyTownAudio> | null>(null);
  const focusRef = useRef<() => void>(() => {});
  const cancelInputRef = useRef<() => void>(() => {});
  const dispatchRef = useRef<(action: PicnicAction) => void>(() => {});
  const stateRef = useRef(createColourPicnicState());
  const [state, setState] = useState(createColourPicnicState);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const [muted, setMuted] = useState(false);
  const [audioStatus, setAudioStatus] = useState<MoneyAudioStatus>("idle");
  const [caption, setCaption] = useState("");
  const [hover, setHover] = useState<string>();
  const [vrSupported, setVrSupported] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const listen = useCallback(() => {
    const id = stateRef.current.cue;
    void audioRef.current?.unlock();
    audioRef.current?.enqueue([cue(id)], true);
  }, []);
  const dispatch = useCallback((action: PicnicAction) => {
    const before = stateRef.current;
    const next = reduceColourPicnic(before, action);
    if (before === next) return;
    stateRef.current = next;
    setState(next);
    if (next.phase !== before.phase || action.type === "restart") {
      cancelInputRef.current();
      setControlsOpen(false);
      focusRef.current();
    }
    if (action.type === "restart") audioRef.current?.stop();
    else if (next.cue !== before.cue) {
      void audioRef.current?.unlock();
      audioRef.current?.enqueue([cue(next.cue)], next.phase !== before.phase);
    }
  }, []);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    let active = true;
    void xr
      ?.isSessionSupported("immersive-vr")
      .then((value) => {
        if (active) setVrSupported(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    const audio = createMoneyTownAudio((status, text) => {
      if (disposed) return;
      setAudioStatus(status);
      if (text) setCaption(text);
    });
    audioRef.current = audio;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setSceneError(
        "This browser could not open the 3D garden. Please try a browser with WebGL enabled.",
      );
      return () => audio.dispose();
    }
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.domElement.setAttribute("aria-label", "Interactive picnic garden");
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#c4d9c5");
    const world = createColourPicnicScene(scene);
    let panorama: THREE.Texture | undefined;
    new THREE.TextureLoader().load(
      "/images/colour-picnic/garden-panorama.png",
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        panorama = texture;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
        scene.environmentIntensity = 0.3;
      },
      undefined,
      () => {
        /* The modelled garden remains playable without the panorama. */
      },
    );
    const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 80);
    const guided = createGuidedCamera(camera, renderer.domElement, {
      minDistance: 1.1,
      maxDistance: 9,
    });
    guided.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    const focus = () => {
      if (renderer.xr.isPresenting) return;
      const frame = world.getFrame(stateRef.current.phase);
      const offset = frame.position.clone().sub(frame.target);
      // Preserve horizontal room for objects when the garden is phone-width.
      const padding = Math.max(1, Math.min(1.6, 1.2 / camera.aspect));
      frame.position.copy(frame.target).addScaledVector(offset, padding);
      guided.focusOn(frame, { animate: false });
    };
    focusRef.current = focus;
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    const rays: THREE.Line[] = [];
    for (const controller of controllers) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -3),
        ]),
        new THREE.LineBasicMaterial({ color: "#f5cf6e" }),
      );
      controller.add(line);
      rays.push(line);
    }
    const continueActivity = () => {
      if (picnicCanContinue(stateRef.current))
        dispatchRef.current({ type: "next" });
      else listen();
    };
    const quest = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: continueActivity,
      onBack: () => dispatchRef.current({ type: "put-down" }),
      onNarrate: listen,
      startPosition: new THREE.Vector3(0, 0, 2.3),
      movementBounds: new THREE.Box2(
        new THREE.Vector2(-2.5, 1.1),
        new THREE.Vector2(2.5, 3.5),
      ),
    });
    const hud = new THREE.Group();
    scene.add(hud);
    let message = vrCard(picnicPrompt(stateRef.current), 1.7);
    message.position.set(0, 2, -0.8);
    hud.add(message);
    const next = vrCard("Next activity", 0.58);
    next.position.set(0.69, 1.48, 0.55);
    const exit = vrCard("Exit VR", 0.5);
    exit.position.set(-0.69, 1.48, 0.55);
    next.userData.targetId = "continue";
    exit.userData.targetId = "exit";
    hud.add(next, exit);
    world.targets.set("continue", next);
    world.targets.set("exit", exit);
    let lastPrompt = "";
    const input = createPicnicInput({
      camera,
      canvas: renderer.domElement,
      controllers,
      world,
      getState: () => stateRef.current,
      dispatch: (action) => dispatchRef.current(action),
      setOrbitEnabled: (value) => {
        guided.controls.enabled = value && !renderer.xr.isPresenting;
      },
      onHover: setHover,
      listen,
      onCommand: (command) => {
        if (command === "continue") continueActivity();
        else void renderer.xr.getSession()?.end();
      },
    });
    cancelInputRef.current = input.cancel;
    let previousWidth = 0;
    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (width !== previousWidth) focus();
      previousWidth = width;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    const sessionStart = () => {
      input.cancel();
      setImmersive(true);
    };
    const sessionEnd = () => {
      input.cancel();
      setImmersive(false);
      focus();
    };
    renderer.xr.addEventListener("sessionstart", sessionStart);
    renderer.xr.addEventListener("sessionend", sessionEnd);
    const lost = (event: Event) => {
      event.preventDefault();
      setSceneError("The 3D garden paused. Reload this page to reopen it.");
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let elapsed = 0;
    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;
      const current = stateRef.current;
      if (!renderer.xr.isPresenting) guided.update(delta);
      else {
        quest.update();
        input.updateXR();
      }
      world.update(current, delta, reducedMotion.matches ? 0 : elapsed);
      hud.visible = renderer.xr.isPresenting;
      next.material.opacity = picnicCanContinue(current) ? 1 : 0.45;
      next.material.transparent = true;
      const prompt = picnicPrompt(current);
      if (prompt !== lastPrompt) {
        const updated = vrCard(prompt, 1.7);
        message.material.map?.dispose();
        message.material.map = updated.material.map;
        message.material.needsUpdate = true;
        updated.geometry.dispose();
        updated.material.dispose();
        lastPrompt = prompt;
      }
      renderer.render(scene, camera);
    });
    setReady(true);
    return () => {
      disposed = true;
      rendererRef.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      input.dispose();
      quest.dispose();
      guided.dispose();
      audio.dispose();
      renderer.xr.removeEventListener("sessionstart", sessionStart);
      renderer.xr.removeEventListener("sessionend", sessionEnd);
      void renderer.xr
        .getSession()
        ?.end()
        .catch(() => {});
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      for (const card of [message, next, exit]) {
        card.geometry.dispose();
        card.material.map?.dispose();
        card.material.dispose();
      }
      for (const ray of rays) {
        ray.geometry.dispose();
        (ray.material as THREE.Material).dispose();
      }
      world.dispose();
      panorama?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      audioRef.current = null;
      focusRef.current = () => {};
      cancelInputRef.current = () => {};
    };
  }, [listen]);

  const enterVR = async () => {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    const renderer = rendererRef.current;
    if (!xr || !renderer || vrRequestRef.current) return;
    vrRequestRef.current = true;
    let session: XRSession | undefined;
    void audioRef.current?.unlock();
    try {
      session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor"],
      });
      if (rendererRef.current !== renderer) {
        await session.end();
        return;
      }
      await renderer.xr.setSession(session);
      if (rendererRef.current !== renderer) {
        await session.end();
        return;
      }
      if (stateRef.current.phase === "welcome") dispatch({ type: "start" });
    } catch {
      void session?.end().catch(() => {});
      if (rendererRef.current === renderer)
        setSceneError(
          "VR could not start. You can still play the complete picnic on this screen.",
        );
    } finally {
      vrRequestRef.current = false;
    }
  };
  const toggleAudio = () => {
    const value = !muted;
    setMuted(value);
    audioRef.current?.setMuted(value);
    if (!value) listen();
  };
  const phaseIndex = PHASES.indexOf(state.phase);
  const canContinue = picnicCanContinue(state);
  const paintPercent = Math.min(
    100,
    Math.round((state.paintedCells.length / PICNIC_PAINT_REQUIRED) * 100),
  );
  const assistPaint = () => {
    const cell =
      state.brushColour === "blue"
        ? (Array.from({ length: 24 }, (_, i) => i).find(
            (i) => !state.paintedCells.includes(i),
          ) ?? 0)
        : (state.paintedCells[0] ?? 0);
    dispatch({ type: "paint", cell });
  };

  return (
    <div ref={rootRef} className={styles.root} data-phase={state.phase}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/simulations">
          <span aria-hidden="true" className={styles.brandMark}>
            ✿
          </span>
          <span>
            THE COLOUR PICNIC<small>CLASS 1 · PLAYABLE SAMPLE</small>
          </span>
        </Link>
        <ol className={styles.trail} aria-label="Picnic progress">
          {["Pack", "Paint", "Decorate"].map((name, index) => (
            <li
              key={name}
              data-active={phaseIndex === index + 1}
              data-done={phaseIndex > index + 1}
            >
              <span>{phaseIndex > index + 1 ? "✓" : `0${index + 1}`}</span>
              {name}
            </li>
          ))}
        </ol>
        <div className={styles.tools}>
          <button type="button" onClick={toggleAudio} aria-pressed={!muted}>
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "restart" })}
            aria-label="Restart picnic"
          >
            ↻ <span className={styles.hidePhone}>Restart</span>
          </button>
          {vrSupported && (
            <button
              type="button"
              onClick={() =>
                immersive
                  ? void rendererRef.current?.xr.getSession()?.end()
                  : void enterVR()
              }
            >
              {immersive ? "Exit VR" : "Teacher VR"}
            </button>
          )}
        </div>
      </header>

      <section className={styles.garden} aria-label="Picnic scene">
        <div
          ref={mountRef}
          className={styles.canvas}
          role="img"
          aria-label="Colour picnic 3D world"
          data-ready={ready}
          data-packed={state.packedFruit}
          data-painted-patches={state.paintedCells.length}
          data-flag-colour={state.flagColour ?? ""}
          data-flag-planted={state.plantedFlag}
        />
        <div className={styles.sceneBadge}>
          <span aria-hidden="true">●</span> THE GARDEN{" "}
          <span>Explore at your own pace</span>
        </div>
        {hover && LABELS[hover] && state.phase !== "welcome" && (
          <div className={styles.objectHint}>{LABELS[hover]}</div>
        )}
        {!ready && !sceneError && (
          <div className={styles.loading}>Opening the garden…</div>
        )}
        {sceneError && (
          <div className={styles.error} role="alert">
            {sceneError}
          </div>
        )}
        <div className={styles.cameraBar}>
          <span>Drag the garden to look around · Scroll to zoom</span>
          <button type="button" onClick={() => focusRef.current()}>
            Reset view
          </button>
          <button
            type="button"
            className={styles.hidePhone}
            onClick={() => {
              void (
                document.fullscreenElement
                  ? document.exitFullscreen()
                  : rootRef.current?.requestFullscreen()
              )?.catch(() => {});
            }}
          >
            Full screen ↗
          </button>
        </div>
        {state.phase === "celebrate" && (
          <div className={styles.celebration}>
            <span>✿</span>
            <p>PICNIC MAKER</p>
            <h2>
              A little colour.
              <br />A lot of you.
            </h2>
            <div>Red found · Blue painted · Your flag chosen</div>
          </div>
        )}
      </section>

      <section className={styles.activity} aria-label="Picnic activity">
        <div className={styles.mission}>
          <div className={styles.eyebrow}>
            {state.phase === "welcome"
              ? "A TWO-MINUTE COLOUR ADVENTURE"
              : state.phase === "celebrate"
                ? "ALL THREE LITTLE MISSIONS COMPLETE"
                : `LITTLE MISSION 0${phaseIndex} / 03`}
          </div>
          <h1>{TITLES[state.phase]}</h1>
          <p>
            {state.phase === "welcome" || state.phase === "celebrate"
              ? HINTS[state.phase]
              : picnicPrompt(state)}
          </p>
          {state.phase === "paint" && (
            <div className={styles.paintProgress}>
              <progress
                aria-label="Blue brush strokes"
                value={Math.min(
                  state.paintedCells.length,
                  PICNIC_PAINT_REQUIRED,
                )}
                max={PICNIC_PAINT_REQUIRED}
              />
              <span>{paintPercent}% ready</span>
            </div>
          )}
        </div>
        <div className={styles.guide}>
          <button
            type="button"
            className={styles.listen}
            onClick={listen}
            aria-label="Listen to the guide"
          >
            ♪
          </button>
          <div>
            <strong>
              {audioStatus === "playing"
                ? "Your guide is speaking…"
                : "A little help from your guide"}
            </strong>
            <p aria-live="polite">
              {state.phase === "welcome"
                ? "You do the making. I will help along the way."
                : state.feedback}
            </p>
            <small>
              {audioStatus === "unavailable"
                ? "Voice unavailable — tap ♪ to retry. Instructions are shown here."
                : audioStatus === "loading"
                  ? "Loading voice…"
                  : audioStatus === "playing"
                    ? caption
                    : HINTS[state.phase]}
            </small>
          </div>
        </div>
        <div className={styles.actions}>
          {state.phase === "welcome" ? (
            <button
              type="button"
              className={styles.primary}
              disabled={!ready}
              onClick={() => dispatch({ type: "start" })}
            >
              Let’s make a picnic <span>→</span>
            </button>
          ) : state.phase === "celebrate" ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => dispatch({ type: "restart" })}
            >
              Make another picnic <span>↻</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.primary}
              disabled={!canContinue}
              onClick={() => dispatch({ type: "next" })}
            >
              {state.phase === "decorate"
                ? "Enjoy our picnic"
                : "Next little mission"}{" "}
              <span>→</span>
            </button>
          )}
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setControlsOpen((value) => !value)}
            aria-expanded={controlsOpen}
          >
            {controlsOpen ? "Hide" : "Show"} button controls
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setNotesOpen((value) => !value)}
            aria-expanded={notesOpen}
          >
            For the teacher
          </button>
        </div>
      </section>

      {controlsOpen && (
        <section className={styles.assist} aria-label="Button controls">
          <strong>Another way to play</strong>
          <span>
            These buttons use the same activity rules as the 3D objects.
          </span>
          <div>
            {state.phase === "fruit" ? (
              <>
                {PICNIC_FRUITS.map((fruit) => (
                  <button
                    type="button"
                    key={fruit.id}
                    disabled={state.packedFruit}
                    aria-pressed={state.heldFruit === fruit.id}
                    onClick={() =>
                      dispatch({ type: "pick-fruit", fruit: fruit.id })
                    }
                  >
                    {fruit.name}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!state.heldFruit}
                  onClick={() => dispatch({ type: "place-fruit" })}
                >
                  Place in basket
                </button>
                <button
                  type="button"
                  disabled={!state.heldFruit}
                  onClick={() => dispatch({ type: "put-down" })}
                >
                  Put down
                </button>
              </>
            ) : state.phase === "paint" ? (
              <>
                {PICNIC_COLOURS.map((colour) => (
                  <button
                    type="button"
                    key={colour.id}
                    aria-pressed={state.brushColour === colour.id}
                    onClick={() =>
                      dispatch({ type: "select-paint", colour: colour.id })
                    }
                  >
                    <i style={{ background: colour.hex }} />
                    {colour.name} paint
                  </button>
                ))}
                <button type="button" onClick={assistPaint}>
                  Brush one patch
                </button>
              </>
            ) : state.phase === "decorate" ? (
              <>
                {PICNIC_COLOURS.map((colour) => (
                  <button
                    type="button"
                    key={colour.id}
                    aria-pressed={state.flagColour === colour.id}
                    onClick={() =>
                      dispatch({ type: "choose-flag", colour: colour.id })
                    }
                  >
                    <i style={{ background: colour.hex }} />
                    {colour.name} flag
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "plant-flag" })}
                >
                  Plant my flag
                </button>
              </>
            ) : (
              <span>Start your picnic to try the activities.</span>
            )}
          </div>
        </section>
      )}
      {notesOpen && (
        <section className={styles.notes} aria-label="Teacher notes">
          <strong>Observe, don’t rush.</strong>
          <p>
            Can the learner compare two apples, find blue on a new object, and
            explain their flag choice? This short sample covers three colours;
            it is not the full ten-colour lesson. Use the complete screen
            version with young children. Headset use requires age-appropriate
            school guidance and supervision.
          </p>
          <Link href="/simulations/c1-art-a01-learning-of-colours">
            Open the original colour lesson →
          </Link>
          <button type="button" onClick={() => setNotesOpen(false)}>
            Close notes
          </button>
        </section>
      )}
      <footer className={styles.footer}>
        <Link href="/simulations/c1-art-a01-learning-of-colours">
          ← Original colour lesson
        </Link>
        <span>LOOK CLOSELY. TRY THINGS. MAKE IT YOURS.</span>
        <span>Prototype · 3 little missions</span>
      </footer>
    </div>
  );
}
