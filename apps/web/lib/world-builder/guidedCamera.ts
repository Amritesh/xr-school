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
 * Frames any object by fitting its world bounding sphere into the camera's
 * field of view, approaching from the given (or current) camera direction.
 * Avoids hand-authoring a camera position per selectable object.
 */
export function computeFocusFrame(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  options: FocusFrameOptions = {},
): CameraFrame {
  const box = new THREE.Box3().setFromObject(object);
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
  spherical.phi = THREE.MathUtils.clamp(
    spherical.phi - (options.elevation ?? 0.18),
    0.05,
    Math.PI - 0.05,
  );
  direction.setFromSpherical(spherical);

  return {
    position: sphere.center.clone().addScaledVector(direction, distance),
    target: sphere.center.clone(),
  };
}

export interface OrbitPadding {
  /** Fractional distance slack either side of the shot's framed distance. */
  distance?: number;
  polarRadians?: number;
  azimuthRadians?: number;
}

export interface GuidedCameraOptions {
  transitionSeconds?: number;
  dampingFactor?: number;
  orbitPadding?: OrbitPadding;
}

const DEFAULT_PADDING: Required<OrbitPadding> = {
  distance: 0.35,
  polarRadians: 0.26,
  azimuthRadians: 0.35,
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * A camera rig that moves between authored/derived "shots" with an eased
 * cinematic transition, then only permits looking around within a tight
 * orbit window around that shot — unlike a single free-roam OrbitControls
 * target, the reachable orbit is re-centered on whatever the user is
 * currently looking at (a simulation stage, or a focused object).
 */
export function createGuidedCamera(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  options: GuidedCameraOptions = {},
) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = options.dampingFactor ?? 0.08;

  const transitionSeconds = options.transitionSeconds ?? 0.65;
  const padding = { ...DEFAULT_PADDING, ...options.orbitPadding };

  const fromPosition = new THREE.Vector3();
  const fromTarget = new THREE.Vector3();
  const toPosition = new THREE.Vector3();
  const toTarget = new THREE.Vector3();
  let activeFrame: CameraFrame | null = null;
  let elapsed = transitionSeconds;

  function applyBounds(frame: CameraFrame) {
    const offset = frame.position.clone().sub(frame.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    controls.minDistance = Math.max(0.05, spherical.radius * (1 - padding.distance));
    controls.maxDistance = spherical.radius * (1 + padding.distance);
    controls.minPolarAngle = Math.max(0, spherical.phi - padding.polarRadians);
    controls.maxPolarAngle = Math.min(Math.PI, spherical.phi + padding.polarRadians);
    controls.minAzimuthAngle = spherical.theta - padding.azimuthRadians;
    controls.maxAzimuthAngle = spherical.theta + padding.azimuthRadians;
  }

  function releaseBounds() {
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
  }

  function focusOn(frame: CameraFrame, options: { animate?: boolean } = {}) {
    const animate = options.animate ?? true;
    activeFrame = frame;
    if (!animate) {
      camera.position.copy(frame.position);
      controls.target.copy(frame.target);
      applyBounds(frame);
      controls.enabled = true;
      elapsed = transitionSeconds;
      return;
    }
    fromPosition.copy(camera.position);
    fromTarget.copy(controls.target);
    toPosition.copy(frame.position);
    toTarget.copy(frame.target);
    releaseBounds();
    controls.enabled = false;
    elapsed = 0;
  }

  function update(deltaSeconds: number) {
    if (elapsed < transitionSeconds) {
      elapsed = Math.min(transitionSeconds, elapsed + deltaSeconds);
      const t = easeInOutCubic(elapsed / transitionSeconds);
      camera.position.lerpVectors(fromPosition, toPosition, t);
      controls.target.lerpVectors(fromTarget, toTarget, t);
      if (elapsed >= transitionSeconds && activeFrame) {
        camera.position.copy(toPosition);
        controls.target.copy(toTarget);
        applyBounds(activeFrame);
        controls.enabled = true;
      }
    }
    controls.update();
  }

  function isTransitioning() {
    return elapsed < transitionSeconds;
  }

  function dispose() {
    controls.dispose();
  }

  return { focusOn, update, isTransitioning, dispose, controls };
}

export type GuidedCamera = ReturnType<typeof createGuidedCamera>;
