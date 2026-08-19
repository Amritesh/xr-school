import * as THREE from 'three';
import type { FungiCameraPose } from './fungiExperienceDirector';

/**
 * Pixels of the canvas covered by interface surfaces on each edge. The
 * controller frames the apparatus inside what is left, so a bottom sheet or a
 * mission strip pushes the camera back instead of hiding the thing the
 * learner is being asked to observe.
 */
export interface CameraSafeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface FungiCameraSnapshot {
  readonly position: [number, number, number];
  readonly target: [number, number, number];
  readonly distance: number;
  readonly azimuth: number;
  readonly polar: number;
  readonly transitioning: boolean;
  readonly manipulating: boolean;
}

export interface FungiCameraOptions {
  /** Seconds an authored move takes. */
  transitionSeconds?: number;
  /** Radians the learner may swing either side of the authored azimuth. */
  azimuthRange?: number;
  minPolar?: number;
  maxPolar?: number;
  /** Radians of orbit per pixel of drag. */
  orbitSpeed?: number;
  /** World units of dolly per unit of wheel delta. */
  zoomSpeed?: number;
  /** How much further than the framed distance the learner may pull back. */
  maxDistanceFactor?: number;
  /** Skip tweening entirely — poses are applied instantly. */
  reducedMotion?: boolean;
}

export interface FungiCameraController {
  focusBounds(
    bounds: THREE.Box3,
    pose: FungiCameraPose,
    options?: { animate?: boolean },
  ): void;
  setViewport(width: number, height: number, safeInsets: CameraSafeInsets): void;
  beginManipulation(): void;
  endManipulation(): void;
  orbitBy(deltaX: number, deltaY: number): void;
  panBy(deltaX: number, deltaY: number): void;
  zoomBy(delta: number): void;
  focusSpecimen(): void;
  resetView(): void;
  update(deltaSeconds: number): void;
  snapshot(): FungiCameraSnapshot;
  dispose(): void;
}

const DEFAULTS = {
  transitionSeconds: 0.65,
  azimuthRange: 0.6,
  minPolar: 0.2,
  maxPolar: 1.45,
  orbitSpeed: 0.005,
  zoomSpeed: 0.0025,
  maxDistanceFactor: 1.8,
  reducedMotion: false,
} as const;

/** Fraction of the framed distance the learner may dolly in to. */
const MIN_FRAMED_FRACTION = 0.45;
/** Breathing room left around the bounding sphere when fitting. */
const FIT_PADDING = 1.08;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function assertFiniteTriple(
  value: readonly number[] | undefined,
  label: string,
): void {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry))
  ) {
    throw new Error(`fungi camera ${label} must contain three finite numbers`);
  }
}

export function createFungiCameraController(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  options: FungiCameraOptions = {},
): FungiCameraController {
  const transitionSeconds = options.transitionSeconds ?? DEFAULTS.transitionSeconds;
  const azimuthRange = options.azimuthRange ?? DEFAULTS.azimuthRange;
  const minPolar = options.minPolar ?? DEFAULTS.minPolar;
  const maxPolar = options.maxPolar ?? DEFAULTS.maxPolar;
  const orbitSpeed = options.orbitSpeed ?? DEFAULTS.orbitSpeed;
  const zoomSpeed = options.zoomSpeed ?? DEFAULTS.zoomSpeed;
  const maxDistanceFactor = options.maxDistanceFactor ?? DEFAULTS.maxDistanceFactor;
  const reducedMotion = options.reducedMotion ?? DEFAULTS.reducedMotion;

  // Viewport / safe frame state.
  let viewportWidth = 1;
  let viewportHeight = 1;
  let insets: CameraSafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

  // Authored mission framing — what resetView() returns to.
  const authoredTarget = new THREE.Vector3();
  let authoredAzimuth = 0;
  let authoredPolar = Math.PI / 2;
  let authoredDistance = 1;
  let framedDistance = 1;
  let collisionRadius = 0.1;
  let boundsRadius = 1;
  let posedOnce = false;

  // Live orbit state.
  const target = new THREE.Vector3();
  let azimuth = 0;
  let polar = Math.PI / 2;
  let distance = 1;

  // Transition state.
  let fromAzimuth = 0;
  let fromPolar = 0;
  let fromDistance = 1;
  const fromTarget = new THREE.Vector3();
  let toAzimuth = 0;
  let toPolar = 0;
  let toDistance = 1;
  const toTarget = new THREE.Vector3();
  let elapsed = transitionSeconds;
  let manipulating = false;

  // Scratch — reused so update() never allocates.
  const scratchOffset = new THREE.Vector3();
  const scratchSphere = new THREE.Sphere();
  const scratchRight = new THREE.Vector3();
  const scratchUp = new THREE.Vector3();
  const scratchPanOffset = new THREE.Vector3();

  function clampAzimuth(value: number): number {
    return THREE.MathUtils.clamp(
      value,
      authoredAzimuth - azimuthRange,
      authoredAzimuth + azimuthRange,
    );
  }

  function clampPolar(value: number): number {
    return THREE.MathUtils.clamp(value, minPolar, maxPolar);
  }

  function clampDistance(value: number): number {
    const minimum = Math.max(collisionRadius, framedDistance * MIN_FRAMED_FRACTION);
    return THREE.MathUtils.clamp(value, minimum, framedDistance * maxDistanceFactor);
  }

  function applyPose(): void {
    scratchOffset.setFromSphericalCoords(distance, polar, azimuth);
    camera.position.copy(target).add(scratchOffset);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  /**
   * Half-extent of the region that is both symmetric about the canvas centre
   * and free of interface surfaces, as a fraction of the half-viewport. The
   * apparatus is centred in frame, so it is the *smaller* of the two gaps that
   * limits how much of the frustum is genuinely usable.
   */
  function safeFractions(): { horizontal: number; vertical: number } {
    const safeMinX = (insets.left / viewportWidth) * 2 - 1;
    const safeMaxX = ((viewportWidth - insets.right) / viewportWidth) * 2 - 1;
    const safeMaxY = 1 - (insets.top / viewportHeight) * 2;
    const safeMinY = -1 + (insets.bottom / viewportHeight) * 2;
    return {
      horizontal: Math.max(0.05, Math.min(safeMaxX, -safeMinX)),
      vertical: Math.max(0.05, Math.min(safeMaxY, -safeMinY)),
    };
  }

  function computeFramedDistance(): number {
    const { horizontal, vertical } = safeFractions();
    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const verticalAngle = Math.atan(Math.tan(halfFov) * vertical);
    const horizontalAngle = Math.atan(Math.tan(halfFov) * camera.aspect * horizontal);
    const limiting = Math.max(1e-4, Math.min(verticalAngle, horizontalAngle));
    return (boundsRadius * FIT_PADDING) / Math.sin(limiting);
  }

  function reframe(): void {
    if (!posedOnce) return;
    framedDistance = Math.max(computeFramedDistance(), authoredDistance);
    distance = clampDistance(framedDistance);
    applyPose();
  }

  function beginTransition(
    nextAzimuth: number,
    nextPolar: number,
    nextDistance: number,
    nextTarget: THREE.Vector3,
    animate: boolean,
  ): void {
    if (!animate || reducedMotion) {
      azimuth = nextAzimuth;
      polar = nextPolar;
      distance = nextDistance;
      target.copy(nextTarget);
      elapsed = transitionSeconds;
      applyPose();
      return;
    }
    fromAzimuth = azimuth;
    fromPolar = polar;
    fromDistance = distance;
    fromTarget.copy(target);
    toAzimuth = nextAzimuth;
    toPolar = nextPolar;
    toDistance = nextDistance;
    toTarget.copy(nextTarget);
    elapsed = 0;
  }

  function focusBounds(
    bounds: THREE.Box3,
    pose: FungiCameraPose,
    focusOptions: { animate?: boolean } = {},
  ): void {
    if (!(bounds instanceof THREE.Box3) || bounds.isEmpty()) {
      throw new Error('fungi camera bounds must be a non-empty Box3');
    }
    assertFiniteTriple(pose?.position as readonly number[], 'pose position');
    assertFiniteTriple(pose?.target as readonly number[], 'pose target');

    bounds.getBoundingSphere(scratchSphere);
    scratchOffset.set(
      pose.position[0] - pose.target[0],
      pose.position[1] - pose.target[1],
      pose.position[2] - pose.target[2],
    );
    if (scratchOffset.lengthSq() < 1e-8) {
      throw new Error('fungi camera pose position must differ from its target');
    }

    const spherical = new THREE.Spherical().setFromVector3(scratchOffset);
    boundsRadius = Math.max(scratchSphere.radius, 0.05);
    collisionRadius = boundsRadius;
    authoredTarget.set(pose.target[0], pose.target[1], pose.target[2]);
    authoredAzimuth = spherical.theta;
    authoredPolar = clampPolar(spherical.phi);
    authoredDistance = spherical.radius;
    posedOnce = true;

    framedDistance = Math.max(computeFramedDistance(), authoredDistance);

    beginTransition(
      authoredAzimuth,
      authoredPolar,
      framedDistance,
      authoredTarget,
      focusOptions.animate ?? true,
    );
  }

  function setViewport(
    width: number,
    height: number,
    safeInsets: CameraSafeInsets,
  ): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error('fungi camera viewport must have positive finite extents');
    }
    viewportWidth = width;
    viewportHeight = height;
    insets = safeInsets;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    reframe();
  }

  function beginManipulation(): void {
    manipulating = true;
    // Stop honouring the authored move: the learner now owns the camera.
    elapsed = transitionSeconds;
  }

  function endManipulation(): void {
    manipulating = false;
  }

  function orbitBy(deltaX: number, deltaY: number): void {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
    azimuth = clampAzimuth(azimuth - deltaX * orbitSpeed);
    polar = clampPolar(polar - deltaY * orbitSpeed);
    applyPose();
  }

  function panBy(deltaX: number, deltaY: number): void {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !posedOnce) return;
    const worldUnitsPerPixel = (
      2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    ) / Math.max(1, viewportHeight);
    scratchRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    scratchUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    target
      .addScaledVector(scratchRight, -deltaX * worldUnitsPerPixel)
      .addScaledVector(scratchUp, deltaY * worldUnitsPerPixel);
    scratchPanOffset.copy(target).sub(authoredTarget);
    const maxPanDistance = Math.max(boundsRadius * 0.9, 0.25);
    if (scratchPanOffset.length() > maxPanDistance) {
      scratchPanOffset.setLength(maxPanDistance);
      target.copy(authoredTarget).add(scratchPanOffset);
    }
    applyPose();
  }

  function zoomBy(delta: number): void {
    if (!Number.isFinite(delta)) return;
    distance = clampDistance(distance + delta * zoomSpeed * framedDistance);
    applyPose();
  }

  function focusSpecimen(): void {
    if (!posedOnce) return;
    beginTransition(
      azimuth,
      polar,
      clampDistance(framedDistance * MIN_FRAMED_FRACTION),
      target,
      true,
    );
  }

  function resetView(): void {
    if (!posedOnce) return;
    manipulating = false;
    framedDistance = Math.max(computeFramedDistance(), authoredDistance);
    beginTransition(authoredAzimuth, authoredPolar, framedDistance, authoredTarget, true);
  }

  function update(deltaSeconds: number): void {
    if (manipulating || elapsed >= transitionSeconds) return;
    elapsed = Math.min(transitionSeconds, elapsed + deltaSeconds);
    const t = easeInOutCubic(elapsed / transitionSeconds);
    azimuth = THREE.MathUtils.lerp(fromAzimuth, toAzimuth, t);
    polar = THREE.MathUtils.lerp(fromPolar, toPolar, t);
    distance = THREE.MathUtils.lerp(fromDistance, toDistance, t);
    target.lerpVectors(fromTarget, toTarget, t);
    applyPose();
  }

  function snapshot(): FungiCameraSnapshot {
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      distance,
      azimuth,
      polar,
      transitioning: !manipulating && elapsed < transitionSeconds,
      manipulating,
    };
  }

  // ── Pointer input: drag orbits, wheel dollies, both bounded ──
  let dragging = false;
  let panning = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    panning = event.button === 2 || event.shiftKey || event.ctrlKey || event.metaKey;
    lastX = event.clientX;
    lastY = event.clientY;
    beginManipulation();
    domElement.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    if (panning) panBy(deltaX, deltaY);
    else orbitBy(deltaX, deltaY);
    lastX = event.clientX;
    lastY = event.clientY;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    panning = false;
    endManipulation();
    if (domElement.hasPointerCapture?.(event.pointerId)) {
      domElement.releasePointerCapture?.(event.pointerId);
    }
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault?.();
    beginManipulation();
    zoomBy(event.deltaY);
    endManipulation();
  };
  const onContextMenu = (event: Event) => event.preventDefault();

  domElement.addEventListener('pointerdown', onPointerDown as EventListener);
  domElement.addEventListener('pointermove', onPointerMove as EventListener);
  domElement.addEventListener('pointerup', onPointerUp as EventListener);
  domElement.addEventListener('pointercancel', onPointerUp as EventListener);
  domElement.addEventListener('wheel', onWheel as EventListener);
  domElement.addEventListener('contextmenu', onContextMenu);

  let disposed = false;
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    domElement.removeEventListener('pointerdown', onPointerDown as EventListener);
    domElement.removeEventListener('pointermove', onPointerMove as EventListener);
    domElement.removeEventListener('pointerup', onPointerUp as EventListener);
    domElement.removeEventListener('pointercancel', onPointerUp as EventListener);
    domElement.removeEventListener('wheel', onWheel as EventListener);
    domElement.removeEventListener('contextmenu', onContextMenu);
  }

  return {
    focusBounds,
    setViewport,
    beginManipulation,
    endManipulation,
    orbitBy,
    panBy,
    zoomBy,
    focusSpecimen,
    resetView,
    update,
    snapshot,
    dispose,
  };
}
