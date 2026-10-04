import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  minDistance?: number;
  maxDistance?: number;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * A guided browser camera backed by Three.js OrbitControls. Authored focus
 * frames still provide clear stage-to-stage shots, while learners can orbit,
 * pan, and dolly around the current target with mouse, touch, or trackpad.
 * WebXR movement remains owned by the shared Quest rig, so viewers disable
 * this controller while an immersive session is presenting.
 */
export function createGuidedCamera(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  options: GuidedCameraOptions = {},
) {
  const transitionSeconds = options.transitionSeconds ?? 0.65;
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableZoom = true;
  controls.minDistance = options.minDistance ?? 0.35;
  controls.maxDistance = options.maxDistance ?? 80;
  controls.minPolarAngle = 0.04;
  controls.maxPolarAngle = Math.PI - 0.04;

  const initialDirection = camera.getWorldDirection(new THREE.Vector3());
  controls.target.copy(camera.position).add(initialDirection);
  controls.update();

  const fromPosition = new THREE.Vector3().copy(camera.position);
  const toPosition = new THREE.Vector3().copy(camera.position);
  const fromTarget = new THREE.Vector3().copy(controls.target);
  const toTarget = new THREE.Vector3().copy(controls.target);
  let elapsed = transitionSeconds;

  const cancelTransition = () => {
    elapsed = transitionSeconds;
  };
  controls.addEventListener('start', cancelTransition);

  function focusOn(frame: CameraFrame, focusOptions: { animate?: boolean } = {}) {
    const animate = focusOptions.animate ?? true;

    if (!animate) {
      camera.position.copy(frame.position);
      controls.target.copy(frame.target);
      controls.update();
      elapsed = transitionSeconds;
      return;
    }

    fromPosition.copy(camera.position);
    toPosition.copy(frame.position);
    fromTarget.copy(controls.target);
    toTarget.copy(frame.target);
    elapsed = 0;
  }

  function update(deltaSeconds: number) {
    if (elapsed < transitionSeconds) {
      elapsed = Math.min(transitionSeconds, elapsed + deltaSeconds);
      const t = easeInOutCubic(elapsed / transitionSeconds);
      camera.position.lerpVectors(fromPosition, toPosition, t);
      controls.target.lerpVectors(fromTarget, toTarget, t);
      controls.update(deltaSeconds);
      if (elapsed >= transitionSeconds) {
        camera.position.copy(toPosition);
        controls.target.copy(toTarget);
      }
      return;
    }
    controls.update(deltaSeconds);
  }

  function isTransitioning() {
    return elapsed < transitionSeconds;
  }

  function dispose() {
    controls.removeEventListener('start', cancelTransition);
    controls.dispose();
  }

  return { controls, focusOn, update, isTransitioning, dispose };
}

export type GuidedCamera = ReturnType<typeof createGuidedCamera>;
