import * as THREE from 'three';

export interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface FocusFrameOptions {
  /** World point the shot is approached from. Defaults to the camera's current position. */
  approachFrom?: THREE.Vector3;
  /** Multiplier applied to the object's bounding radius before fitting it in frame. */
  fitPadding?: number;
  /** Radians to tilt the approach angle upward (positive) or downward (negative). */
  elevation?: number;
  /** Closest the camera is allowed to dolly in, in world units. */
  minDistance?: number;
}

/**
 * Frames one or more objects by fitting their combined world bounding
 * sphere into the camera's field of view, approaching from the given (or
 * current) camera direction. Avoids hand-authoring a camera position per
 * selectable object — pass an array to frame several objects together
 * (e.g. two flowers being compared side by side).
 */
export function computeFocusFrame(
  objectOrObjects: THREE.Object3D | THREE.Object3D[],
  camera: THREE.PerspectiveCamera,
  options: FocusFrameOptions = {},
): CameraFrame {
  const objects = Array.isArray(objectOrObjects) ? objectOrObjects : [objectOrObjects];
  const box = new THREE.Box3();
  for (const object of objects) box.expandByObject(object);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = Math.max(sphere.radius, 0.05);

  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = (radius * (options.fitPadding ?? 2.6)) / Math.sin(fovRadians / 2);
  const distance = Math.max(options.minDistance ?? 0.35, fitDistance);

  const approachFrom = options.approachFrom ?? camera.position;
  const direction = approachFrom.clone().sub(sphere.center);
  if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
  direction.normalize();

  const spherical = new THREE.Spherical().setFromVector3(direction);
  // Fixed absolute angle above horizontal — not a delta off whatever the
  // camera's current elevation happens to be. Re-focusing the same object
  // from a camera that already sat above it must not tilt it up further:
  // repeated selection should be idempotent, not compounding.
  spherical.phi = THREE.MathUtils.clamp(
    Math.PI / 2 - (options.elevation ?? 0.18),
    0.05,
    Math.PI - 0.05,
  );
  direction.setFromSpherical(spherical);

  return {
    position: sphere.center.clone().addScaledVector(direction, distance),
    target: sphere.center.clone(),
  };
}

export interface GuidedCameraOptions {
  transitionSeconds?: number;
  /** Radians of rotation per pixel of drag. */
  lookSpeed?: number;
  /** How far up/down the learner can look, in radians from level. */
  maxPitch?: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function yawPitchFromDirection(direction: THREE.Vector3) {
  return {
    yaw: Math.atan2(-direction.x, -direction.z),
    pitch: Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)),
  };
}

function shortestDelta(from: number, to: number) {
  const twoPi = Math.PI * 2;
  let delta = (to - from) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  return delta;
}

/**
 * A first-person look-around camera: rotation always pivots on the camera's
 * own eye position (like turning your head), never on a distant orbit
 * target, and is never locked out — the learner can look anywhere at any
 * time, including mid-transition. Only the eye *position* is driven by
 * guided "shots" (a simulation stage, or a focused object), eased in with
 * computeFocusFrame() rather than hand-authored per-object cameras.
 */
export function createGuidedCamera(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  options: GuidedCameraOptions = {},
) {
  const transitionSeconds = options.transitionSeconds ?? 0.65;
  const lookSpeed = options.lookSpeed ?? 0.006;
  const maxPitch = options.maxPitch ?? 1.4;

  const initialDirection = new THREE.Vector3();
  camera.getWorldDirection(initialDirection);
  let { yaw, pitch } = yawPitchFromDirection(initialDirection);

  const fromPosition = new THREE.Vector3().copy(camera.position);
  const toPosition = new THREE.Vector3().copy(camera.position);
  let fromYaw = yaw;
  let fromPitch = pitch;
  let toYaw = yaw;
  let toPitch = pitch;
  let elapsed = transitionSeconds;
  let orientationLocked = false;

  function applyLook() {
    pitch = THREE.MathUtils.clamp(pitch, -maxPitch, maxPitch);
    const quatYaw = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    const quatPitch = new THREE.Quaternion().setFromAxisAngle(RIGHT, pitch);
    camera.quaternion.copy(quatYaw).multiply(quatPitch);
  }
  applyLook();

  function focusOn(frame: CameraFrame, focusOptions: { animate?: boolean } = {}) {
    const animate = focusOptions.animate ?? true;
    const direction = frame.target.clone().sub(frame.position).normalize();
    const { yaw: targetYaw, pitch: targetPitch } = yawPitchFromDirection(direction);
    orientationLocked = false;

    if (!animate) {
      camera.position.copy(frame.position);
      yaw = targetYaw;
      pitch = targetPitch;
      applyLook();
      elapsed = transitionSeconds;
      return;
    }

    fromPosition.copy(camera.position);
    toPosition.copy(frame.position);
    fromYaw = yaw;
    fromPitch = pitch;
    toYaw = yaw + shortestDelta(yaw, targetYaw);
    toPitch = targetPitch;
    elapsed = 0;
  }

  function update(deltaSeconds: number) {
    if (elapsed < transitionSeconds) {
      elapsed = Math.min(transitionSeconds, elapsed + deltaSeconds);
      const t = easeInOutCubic(elapsed / transitionSeconds);
      camera.position.lerpVectors(fromPosition, toPosition, t);
      if (!orientationLocked) {
        yaw = THREE.MathUtils.lerp(fromYaw, toYaw, t);
        pitch = THREE.MathUtils.lerp(fromPitch, toPitch, t);
        applyLook();
      }
      if (elapsed >= transitionSeconds) {
        camera.position.copy(toPosition);
      }
    }
  }

  function isTransitioning() {
    return elapsed < transitionSeconds;
  }

  // ── Drag-to-look input: always live, never locked, pivots on the eye ──
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    orientationLocked = true;
    lastX = event.clientX;
    lastY = event.clientY;
    domElement.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    yaw -= dx * lookSpeed;
    pitch -= dy * lookSpeed;
    applyLook();
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    if (domElement.hasPointerCapture(event.pointerId)) {
      domElement.releasePointerCapture(event.pointerId);
    }
  };
  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup', onPointerUp);

  function dispose() {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
  }

  return { focusOn, update, isTransitioning, dispose };
}

export type GuidedCamera = ReturnType<typeof createGuidedCamera>;
