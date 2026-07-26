import * as THREE from "three";

interface QuestVrControlsOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controllers: THREE.XRTargetRaySpace[];
  onPrimary: () => void;
  onBack: () => void;
  onNarrate: () => void;
  startPosition?: THREE.Vector3;
}

const BUTTON_PRIMARY = 4;
const BUTTON_BACK_ALIASES = [5, 6];
const BUTTON_BACK_FALLBACK = 3;
const MOVE_SPEED_METRES_PER_SECOND = 2.15;
const MOVE_DEAD_ZONE = 0.08;
const SNAP_TURN_RADIANS = THREE.MathUtils.degToRad(30);

function thumbstickAxes(gamepad: Gamepad) {
  const axes = gamepad.axes;
  const primary = { x: axes[0] ?? 0, y: axes[1] ?? 0 };
  const alternate = { x: axes[2] ?? 0, y: axes[3] ?? 0 };
  const primaryMagnitude = Math.abs(primary.x) + Math.abs(primary.y);
  const alternateMagnitude = Math.abs(alternate.x) + Math.abs(alternate.y);
  return alternateMagnitude > primaryMagnitude ? alternate : primary;
}

export function createQuestVrControls({
  renderer,
  scene,
  camera,
  controllers,
  onPrimary,
  onBack,
  onNarrate: _onNarrate,
  startPosition = new THREE.Vector3(0, 0, 2.6),
}: QuestVrControlsOptions) {
  const rig = new THREE.Group();
  rig.name = "quest-player-rig";
  controllers.forEach((controller) => rig.add(controller));
  scene.add(rig);

  const desktopPosition = camera.position.clone();
  const desktopQuaternion = camera.quaternion.clone();
  const desktopParent = camera.parent;
  const buttonState = new Map<string, boolean>();
  let turnReady = true;
  let lastTime = performance.now();
  let activeSession: XRSession | null = null;

  const onControllerConnected = (event: Event) => {
    const controller = event.target as unknown as THREE.XRTargetRaySpace;
    const inputSource = (event as Event & { data?: XRInputSource }).data;
    if (inputSource) controller.userData.handedness = inputSource.handedness;
  };
  const onControllerSqueeze = (event: Event) => {
    const controller = event.target as unknown as THREE.XRTargetRaySpace;
    const controllerIndex = controllers.indexOf(controller);
    const handedness = controller.userData.handedness as XRHandedness | undefined;
    if (handedness === "right" || (!handedness && controllerIndex === 1)) {
      void renderer.xr.getSession()?.end();
    }
  };
  controllers.forEach((controller) => {
    controller.addEventListener("connected", onControllerConnected as any);
    controller.addEventListener("squeezestart", onControllerSqueeze as any);
  });

  const onSessionStart = () => {
    rig.position.copy(startPosition);
    rig.position.z = THREE.MathUtils.clamp(rig.position.z, 1.9, 2.7);
    rig.rotation.set(0, 0, 0);
    rig.add(camera);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    buttonState.clear();
    turnReady = true;
    lastTime = performance.now();
    activeSession = renderer.xr.getSession();
    activeSession?.addEventListener("squeezestart", onSessionSqueeze);
  };

  const onSessionSqueeze = (event: XRInputSourceEvent) => {
    if (event.inputSource.handedness !== "left") void activeSession?.end();
  };

  const onSessionEnd = () => {
    activeSession?.removeEventListener("squeezestart", onSessionSqueeze);
    activeSession = null;
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    if (desktopParent) desktopParent.add(camera);
    else scene.add(camera);
    camera.position.copy(desktopPosition);
    camera.quaternion.copy(desktopQuaternion);
    buttonState.clear();
  };

  renderer.xr.addEventListener("sessionstart", onSessionStart);
  renderer.xr.addEventListener("sessionend", onSessionEnd);

  const update = () => {
    if (!renderer.xr.isPresenting) return;
    const now = performance.now();
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const session = renderer.xr.getSession();
    if (!session) return;

    let moveX = 0;
    let moveY = 0;
    let turnX = 0;
    const inputSources = Array.from(session.inputSources).filter((source) => source.gamepad);
    for (const [sourceIndex, source] of inputSources.entries()) {
      const gamepad = source.gamepad;
      if (!gamepad) continue;
      const hand: XRHandedness = source.handedness === "none"
        ? (inputSources.length === 1 || sourceIndex === 1 ? "right" : "left")
        : source.handedness;
      const axes = thumbstickAxes(gamepad);
      if (hand === "left") {
        moveX = Math.abs(axes.x) > MOVE_DEAD_ZONE ? axes.x : 0;
        moveY = Math.abs(axes.y) > MOVE_DEAD_ZONE ? axes.y : 0;
      }
      if (hand === "right") {
        turnX = Math.abs(axes.x) > 0.65 ? axes.x : 0;
        // Keep forward/back movement available when only the right controller is
        // connected, which is common while a Quest controller is waking up.
        if (!moveY && Math.abs(axes.y) > MOVE_DEAD_ZONE) moveY = axes.y;
      }

      const pulse = () => {
        const actuator = gamepad.hapticActuators?.[0];
        actuator?.pulse?.(0.45, 45).catch?.(() => undefined);
      };
      const primaryPressed = Boolean(gamepad.buttons[BUTTON_PRIMARY]?.pressed || (gamepad.buttons[BUTTON_PRIMARY]?.value ?? 0) > 0.55);
      const backPressed = BUTTON_BACK_ALIASES.some((index) => Boolean(gamepad.buttons[index]?.pressed || (gamepad.buttons[index]?.value ?? 0) > 0.55));
      const fallbackPressed = hand === "right" && Boolean(gamepad.buttons[BUTTON_BACK_FALLBACK]?.pressed || (gamepad.buttons[BUTTON_BACK_FALLBACK]?.value ?? 0) > 0.55);
      const primaryKey = `${hand}-primary`;
      if (primaryPressed && !buttonState.get(primaryKey)) {
        onPrimary();
        pulse();
      }
      buttonState.set(primaryKey, primaryPressed);

      const backKey = `${hand}-back`;
      const backOrExitPressed = backPressed || fallbackPressed;
      if (backOrExitPressed && !buttonState.get(backKey)) {
        pulse();
        if (hand === "right") void session.end();
        else onBack();
      }
      buttonState.set(backKey, backOrExitPressed);
    }

    if (moveX || moveY) {
      const forward = new THREE.Vector3();
      renderer.xr.getCamera().getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      rig.position.addScaledVector(forward, -moveY * MOVE_SPEED_METRES_PER_SECOND * deltaSeconds);
      rig.position.addScaledVector(right, moveX * MOVE_SPEED_METRES_PER_SECOND * deltaSeconds);
    }

    if (turnX && turnReady) {
      rig.rotation.y -= Math.sign(turnX) * SNAP_TURN_RADIANS;
      turnReady = false;
    } else if (!turnX) turnReady = true;
  };

  const dispose = () => {
    renderer.xr.removeEventListener("sessionstart", onSessionStart);
    renderer.xr.removeEventListener("sessionend", onSessionEnd);
    activeSession?.removeEventListener("squeezestart", onSessionSqueeze);
    controllers.forEach((controller) => {
      controller.removeEventListener("connected", onControllerConnected as any);
      controller.removeEventListener("squeezestart", onControllerSqueeze as any);
    });
    scene.remove(rig);
  };

  return { rig, update, dispose };
}
