import * as THREE from 'three';
import type { SimulationLaunchPreferences } from '../scene/types.js';

const STICK_DEAD_ZONE = 0.15;
const SNAP_TURN_DEAD_ZONE = 0.65;
const SNAP_TURN_RESET_ZONE = 0.25;
const SNAP_TURN_RADIANS = Math.PI / 6;
const SNAP_TELEPORT_DEAD_ZONE = 0.65;
const SNAP_TELEPORT_RESET_ZONE = 0.25;
const DEFAULT_TELEPORT_STEP_METERS = 0.75;
const DEFAULT_TURN_SPEED_RADIANS = Math.PI / 2;
const MAX_FRAME_DELTA_SECONDS = 0.1;

/** Dead-zoned, squared response curve for explicitly enabled smooth turning. */
export function smoothAxis(value: number, deadZone = STICK_DEAD_ZONE) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadZone) return 0;
  const scaled = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
  return Math.sign(value) * scaled * scaled;
}

/** @deprecated Prefer snap turning, especially for reduced-motion launches. */
export function smoothTurnRadians(
  axisX: number,
  deltaSeconds: number,
  turnSpeedRadians = DEFAULT_TURN_SPEED_RADIANS,
) {
  const boundedDelta = Math.min(
    MAX_FRAME_DELTA_SECONDS,
    Math.max(0, deltaSeconds),
  );
  return -smoothAxis(axisX) * turnSpeedRadians * boundedDelta;
}

export function updateSnapTurn(axisX: number, latched: boolean) {
  if (Math.abs(axisX) <= SNAP_TURN_RESET_ZONE) {
    return { radians: 0, latched: false };
  }
  if (latched || Math.abs(axisX) < SNAP_TURN_DEAD_ZONE) {
    return { radians: 0, latched };
  }
  return {
    radians: axisX > 0 ? -SNAP_TURN_RADIANS : SNAP_TURN_RADIANS,
    latched: true,
  };
}

export function rotateRigAboutHead(
  rig: THREE.Object3D,
  headWorldPosition: THREE.Vector3,
  radians: number,
) {
  if (radians === 0) return;
  const offsetX = headWorldPosition.x - rig.position.x;
  const offsetZ = headWorldPosition.z - rig.position.z;
  rig.rotation.y += radians;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotatedX = offsetX * cos + offsetZ * sin;
  const rotatedZ = -offsetX * sin + offsetZ * cos;
  rig.position.x += offsetX - rotatedX;
  rig.position.z += offsetZ - rotatedZ;
}

function updateButtonLatch(isDown: boolean, latched: boolean) {
  if (!isDown) return { pressed: false, latched: false };
  return { pressed: !latched, latched: true };
}

function isQuestBackPressed(
  buttons: ReadonlyArray<{ pressed: boolean }>,
  handedness: string,
) {
  const buttonIndex = handedness === 'left'
    ? 4
    : handedness === 'right'
      ? 5
      : -1;
  return buttonIndex >= 0 && buttons[buttonIndex]?.pressed === true;
}

export interface VrLocomotionConfig {
  renderer: THREE.WebGLRenderer;
  rig: THREE.Object3D;
  locomotion?: SimulationLaunchPreferences['locomotion'];
  movementBounds?: THREE.Box3;
  teleportStepMeters?: number;
  turnMode?: SimulationLaunchPreferences['turnMode'];
  reducedMotion?: boolean;
  turnSpeedRadians?: number;
  /** @deprecated Continuous translation is intentionally unsupported. */
  moveEnabled?: boolean;
  /** @deprecated Continuous translation is intentionally unsupported. */
  moveSpeed?: number;
  onBack?(): void;
}

/**
 * Shared comfort controller. Stationary is the default. Bounded teleport uses
 * one head-relative step per left-stick deflection and never permits free glide.
 */
export function createVrLocomotion(config: VrLocomotionConfig) {
  const backLatches = new Map<XRInputSource, boolean>();
  const turnLatches = new Map<XRInputSource, boolean>();
  const teleportLatches = new Map<XRInputSource, boolean>();
  const headWorld = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const locomotion = config.locomotion ?? 'stationary';
  const movementBounds = config.movementBounds?.clone();
  if (locomotion === 'boundedTeleport' && !movementBounds) {
    throw new Error('Bounded teleport requires authored bounds');
  }
  if (movementBounds && (
    movementBounds.isEmpty()
    || !movementBounds.min.toArray().every(value => Number.isFinite(value))
    || !movementBounds.max.toArray().every(value => Number.isFinite(value))
  )) {
    throw new Error('Bounded teleport requires finite, non-empty authored bounds');
  }
  const teleportStepMeters = config.teleportStepMeters
    ?? DEFAULT_TELEPORT_STEP_METERS;
  if (!Number.isFinite(teleportStepMeters) || teleportStepMeters <= 0) {
    throw new Error('Teleport step must be a positive finite distance');
  }
  const requestedTurnMode = config.turnMode ?? 'snap';
  const turnMode = config.reducedMotion && requestedTurnMode === 'smooth'
    ? 'snap'
    : requestedTurnMode;

  function update(deltaSeconds: number) {
    const session = config.renderer.xr.getSession();
    if (!session) return;
    const head = config.renderer.xr.getCamera();

    for (const inputSource of session.inputSources) {
      const gamepad = inputSource.gamepad;
      if (!gamepad) continue;
      const axisX = gamepad.axes[2] ?? gamepad.axes[0] ?? 0;
      const axisY = gamepad.axes[3] ?? gamepad.axes[1] ?? 0;
      config.rig.updateMatrixWorld(true);
      head.updateWorldMatrix(true, false);
      head.getWorldPosition(headWorld);

      if (inputSource.handedness !== 'left' && turnMode !== 'none') {
        if (turnMode === 'smooth') {
          rotateRigAboutHead(
            config.rig,
            headWorld,
            smoothTurnRadians(axisX, deltaSeconds, config.turnSpeedRadians),
          );
        } else {
          const turn = updateSnapTurn(
            axisX,
            turnLatches.get(inputSource) ?? false,
          );
          turnLatches.set(inputSource, turn.latched);
          rotateRigAboutHead(config.rig, headWorld, turn.radians);
        }
      }

      if (inputSource.handedness !== 'right' && locomotion === 'boundedTeleport') {
        const magnitude = Math.hypot(axisX, axisY);
        let latched = teleportLatches.get(inputSource) ?? false;
        if (magnitude <= SNAP_TELEPORT_RESET_ZONE) {
          latched = false;
        } else if (!latched && magnitude >= SNAP_TELEPORT_DEAD_ZONE) {
          head.getWorldDirection(forward);
          forward.y = 0;
          if (forward.lengthSq() > 1e-6) {
            forward.normalize();
            right.crossVectors(forward, up).normalize();
            direction
              .copy(forward)
              .multiplyScalar(-axisY / magnitude)
              .addScaledVector(right, axisX / magnitude)
              .normalize();
            const desiredX = headWorld.x + direction.x * teleportStepMeters;
            const desiredZ = headWorld.z + direction.z * teleportStepMeters;
            const boundedX = THREE.MathUtils.clamp(
              desiredX,
              movementBounds!.min.x,
              movementBounds!.max.x,
            );
            const boundedZ = THREE.MathUtils.clamp(
              desiredZ,
              movementBounds!.min.z,
              movementBounds!.max.z,
            );
            config.rig.position.x += boundedX - headWorld.x;
            config.rig.position.z += boundedZ - headWorld.z;
            config.rig.updateMatrixWorld(true);
          }
          latched = true;
        }
        teleportLatches.set(inputSource, latched);
      }

      const back = updateButtonLatch(
        isQuestBackPressed(gamepad.buttons, inputSource.handedness),
        backLatches.get(inputSource) ?? false,
      );
      backLatches.set(inputSource, back.latched);
      if (back.pressed) config.onBack?.();
    }
  }

  let disposed = false;
  return {
    update(deltaSeconds: number) {
      if (disposed) return;
      update(deltaSeconds);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      backLatches.clear();
      turnLatches.clear();
      teleportLatches.clear();
    },
  };
}

export type VrLocomotion = ReturnType<typeof createVrLocomotion>;
