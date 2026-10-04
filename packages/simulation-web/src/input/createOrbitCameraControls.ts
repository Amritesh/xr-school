import * as THREE from 'three';

/**
 * Pointer-driven camera orbit for the browser.
 *
 * In an immersive session the player rig owns the camera and locomotion moves
 * it. On a flat screen nothing did: `createVrLocomotion` returns immediately
 * without an `XRSession`, so browser learners were left with whatever pose the
 * scene adapter authored and no way to look around.
 *
 * Dragging is already free to claim. The input router only commits an
 * interaction when the pointer travels less than its drag threshold between
 * down and up, so a drag has always been discarded rather than treated as a
 * tap. Orbit and panning fill that gap without competing with picking. A
 * primary-button drag orbits; right-button or modifier-key drag pans.
 *
 * Deliberately has no inertia or damping. Every camera change is the direct
 * result of a pointer or wheel event, so there is no animation to suppress for
 * learners who ask for reduced motion.
 */
export interface OrbitCameraControlsConfig {
  domElement: HTMLElement;
  camera: THREE.PerspectiveCamera;
  /** True while an immersive session owns the camera. Orbit stays out of the way. */
  isPresenting(): boolean;
  minDistance?: number;
  maxDistance?: number;
  /** Polar limits in radians, measured from +Y. Keeps the camera off the poles. */
  minPolarAngle?: number;
  maxPolarAngle?: number;
  /** Radians of rotation per pixel dragged. */
  rotateSpeed?: number;
  /** Multiplier applied to screen-space panning. */
  panSpeed?: number;
  /** Fraction of the current distance travelled per wheel notch. */
  zoomSpeed?: number;
}

export interface OrbitCameraControls {
  /** Moves the point the camera orbits around. Expects world space. */
  setTarget(target: THREE.Vector3): void;
  /** The current pivot, in world space. */
  target(): THREE.Vector3;
  /**
   * Re-reads distance and angles from the camera's current pose. Call after
   * something else repositions the camera, so the next drag continues from
   * where the camera actually is rather than snapping back.
   */
  sync(): void;
  /**
   * True once the learner has moved the camera themselves. Callers use this to
   * stop re-aiming the pivot at whatever the lesson is highlighting, so an
   * automatic reframe never yanks the view out of someone's hands.
   */
  interacted(): boolean;
  enabled(): boolean;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

const DEFAULT_DISTANCE = 3;
const DEGENERATE_RADIUS = 1e-3;

export function createOrbitCameraControls(
  config: OrbitCameraControlsConfig,
): OrbitCameraControls {
  const minDistance = config.minDistance ?? 0.35;
  const maxDistance = config.maxDistance ?? 40;
  const minPolarAngle = config.minPolarAngle ?? 0.12;
  const maxPolarAngle = config.maxPolarAngle ?? Math.PI - 0.12;
  const rotateSpeed = config.rotateSpeed ?? 0.005;
  const panSpeed = config.panSpeed ?? 1;
  const zoomSpeed = config.zoomSpeed ?? 0.12;

  const targetWorld = new THREE.Vector3();
  const spherical = new THREE.Spherical(DEFAULT_DISTANCE, Math.PI / 2, 0);
  const offset = new THREE.Vector3();
  const targetLocal = new THREE.Vector3();
  const cameraWorldPosition = new THREE.Vector3();
  const cameraWorldQuaternion = new THREE.Quaternion();
  const panRight = new THREE.Vector3();
  const panUp = new THREE.Vector3();
  const panOffset = new THREE.Vector3();

  /** Active drags, so a second finger becomes a pinch rather than a second orbit. */
  const drags = new Map<number, { x: number; y: number; mode: 'orbit' | 'pan' }>();
  let pinchDistance = 0;
  let enabled = true;
  let disposed = false;
  let interacted = false;

  // Offscreen canvases and test doubles do not necessarily carry a style
  // object, and camera control does not depend on being able to set one.
  const style: CSSStyleDeclaration | undefined = config.domElement.style;
  const previousTouchAction = style?.touchAction;
  // Without this a touch drag scrolls the page instead of turning the camera.
  if (style) style.touchAction = 'none';

  function clampSpherical() {
    spherical.radius = Math.min(maxDistance, Math.max(minDistance, spherical.radius));
    spherical.phi = Math.min(maxPolarAngle, Math.max(minPolarAngle, spherical.phi));
    spherical.makeSafe();
  }

  /** The pivot expressed in the camera's parent space, which is the rig in XR. */
  function resolveTargetLocal() {
    const parent = config.camera.parent;
    targetLocal.copy(targetWorld);
    if (parent) {
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(targetLocal);
    }
    return targetLocal;
  }

  function apply() {
    clampSpherical();
    offset.setFromSpherical(spherical);
    config.camera.position.copy(resolveTargetLocal()).add(offset);
    // lookAt takes world space and compensates for the parent transform.
    config.camera.lookAt(targetWorld);
  }

  function sync() {
    offset.copy(config.camera.position).sub(resolveTargetLocal());
    if (offset.length() < DEGENERATE_RADIUS) {
      // The camera is sitting on the pivot, so there is no orbit to infer.
      // Back it off along its own forward axis to give the learner something
      // to rotate around.
      spherical.set(DEFAULT_DISTANCE, Math.PI / 2, spherical.theta);
    } else {
      spherical.setFromVector3(offset);
    }
    clampSpherical();
  }

  function rotate(deltaX: number, deltaY: number) {
    interacted = true;
    spherical.theta -= deltaX * rotateSpeed;
    spherical.phi -= deltaY * rotateSpeed;
    apply();
  }

  function pan(deltaX: number, deltaY: number) {
    interacted = true;
    config.camera.updateWorldMatrix(true, false);
    config.camera.getWorldPosition(cameraWorldPosition);
    config.camera.getWorldQuaternion(cameraWorldQuaternion);

    // Scale movement to the visible height at the pivot. This keeps panning
    // useful at both tabletop and landscape distances and mirrors the feel of
    // Three's OrbitControls without coupling this small controller to it.
    const distance = Math.max(
      DEGENERATE_RADIUS,
      cameraWorldPosition.distanceTo(targetWorld),
    );
    const viewportHeight = Math.max(1, config.domElement.clientHeight || 720);
    const visibleHeight =
      2 * distance * Math.tan(THREE.MathUtils.degToRad(config.camera.fov * 0.5));
    const worldPerPixel = (visibleHeight / viewportHeight) * panSpeed;

    panRight.set(1, 0, 0).applyQuaternion(cameraWorldQuaternion);
    panUp.set(0, 1, 0).applyQuaternion(cameraWorldQuaternion);
    panOffset
      .copy(panRight)
      .multiplyScalar(-deltaX * worldPerPixel)
      .addScaledVector(panUp, deltaY * worldPerPixel);
    targetWorld.add(panOffset);
    apply();
  }

  function dolly(scale: number) {
    interacted = true;
    spherical.radius *= scale;
    apply();
  }

  const active = () => enabled && !disposed && !config.isPresenting();

  const touchDistance = () => {
    const points = [...drags.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!active()) return;
    const mode =
      event.button === 2 || event.shiftKey || event.ctrlKey || event.metaKey
        ? 'pan'
        : 'orbit';
    drags.set(event.pointerId, { x: event.clientX, y: event.clientY, mode });
    if (drags.size === 2) pinchDistance = touchDistance();
    // Keeps the drag alive when the pointer leaves the canvas mid-turn.
    if (config.domElement.setPointerCapture) {
      try {
        config.domElement.setPointerCapture(event.pointerId);
      } catch {
        // Capture is best-effort; orbit still works from the element's events.
      }
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!active()) return;
    const previous = drags.get(event.pointerId);
    if (!previous) return;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;

    if (drags.size >= 2) {
      const next = touchDistance();
      if (pinchDistance > 0 && next > 0) dolly(pinchDistance / next);
      pinchDistance = next;
      return;
    }
    if (deltaX === 0 && deltaY === 0) return;
    if (previous.mode === 'pan') {
      pan(deltaX, deltaY);
    } else {
      rotate(deltaX, deltaY);
    }
  };

  const release = (event: PointerEvent) => {
    drags.delete(event.pointerId);
    if (drags.size < 2) pinchDistance = 0;
    if (config.domElement.releasePointerCapture) {
      try {
        config.domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Already released, or never captured.
      }
    }
  };

  const onWheel = (event: WheelEvent) => {
    if (!active()) return;
    // Stops the page scrolling while the learner zooms the scene.
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    dolly(1 + direction * zoomSpeed);
  };

  const onContextMenu = (event: MouseEvent) => {
    if (!active()) return;
    // A right-button pan should not finish by opening the browser menu over
    // the simulation canvas.
    event.preventDefault();
  };

  config.domElement.addEventListener('pointerdown', onPointerDown);
  config.domElement.addEventListener('pointermove', onPointerMove);
  config.domElement.addEventListener('pointerup', release);
  config.domElement.addEventListener('pointercancel', release);
  config.domElement.addEventListener('wheel', onWheel, { passive: false });
  config.domElement.addEventListener('contextmenu', onContextMenu);

  sync();

  return {
    setTarget(next) {
      targetWorld.copy(next);
      sync();
      apply();
    },
    target() {
      return targetWorld.clone();
    },
    sync,
    interacted: () => interacted,
    enabled: () => enabled,
    setEnabled(next) {
      enabled = next;
      if (!next) {
        drags.clear();
        pinchDistance = 0;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      config.domElement.removeEventListener('pointerdown', onPointerDown);
      config.domElement.removeEventListener('pointermove', onPointerMove);
      config.domElement.removeEventListener('pointerup', release);
      config.domElement.removeEventListener('pointercancel', release);
      config.domElement.removeEventListener('wheel', onWheel);
      config.domElement.removeEventListener('contextmenu', onContextMenu);
      if (style && previousTouchAction !== undefined) {
        style.touchAction = previousTouchAction;
      }
      drags.clear();
    },
  };
}
