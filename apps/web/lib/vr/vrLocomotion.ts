import * as THREE from 'three';
import { isQuestBackPressed, updateButtonLatch } from '../xrNavigation';

/**
 * One locomotion scheme for every simulation (QA required this to be
 * identical everywhere): right thumbstick smoothly rotates the player rig,
 * left thumbstick glides it in the direction the learner is looking, and
 * B (right) / X (left) fire a single "back" action per press.
 */

const STICK_DEAD_ZONE = 0.15;
const DEFAULT_TURN_SPEED_RADIANS = Math.PI / 2; // 90°/s at full deflection
const DEFAULT_MOVE_SPEED = 1.6; // m/s at full deflection

/** Dead-zoned, squared response curve: small deflections stay gentle. */
export function smoothAxis(value: number, deadZone = STICK_DEAD_ZONE) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadZone) return 0;
  const scaled = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
  return Math.sign(value) * scaled * scaled;
}

/** Radians of yaw for one frame. Stick right turns the view right. */
export function smoothTurnRadians(
  axisX: number,
  deltaSeconds: number,
  turnSpeedRadians = DEFAULT_TURN_SPEED_RADIANS,
) {
  return -smoothAxis(axisX) * turnSpeedRadians * deltaSeconds;
}

/**
 * Yaws the rig while keeping the learner's head fixed in world space.
 * Rotating the rig about its own origin instead would swing a learner who
 * has stepped away from the rig centre along an arc — instant nausea.
 */
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

export interface VrLocomotionConfig {
  renderer: THREE.WebGLRenderer;
  rig: THREE.Object3D;
  /** Left-stick gliding. Defaults to enabled. */
  moveEnabled?: boolean;
  moveSpeed?: number;
  turnSpeedRadians?: number;
  /** Fired once per B/X press — previous stage, or exit from stage zero. */
  onBack?(): void;
}

export function createVrLocomotion(config: VrLocomotionConfig) {
  const backLatches = new Map<XRInputSource, boolean>();
  const headWorld = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function update(deltaSeconds: number) {
    const session = config.renderer.xr.getSession();
    if (!session) return;
    const head = config.renderer.xr.getCamera();
    head.getWorldPosition(headWorld);

    for (const inputSource of session.inputSources) {
      const gamepad = inputSource.gamepad;
      if (!gamepad) continue;
      // Quest thumbsticks live at axes[2]/[3]; fall back for other profiles.
      const axisX = gamepad.axes[2] ?? gamepad.axes[0] ?? 0;
      const axisY = gamepad.axes[3] ?? gamepad.axes[1] ?? 0;

      if (inputSource.handedness !== 'left') {
        rotateRigAboutHead(
          config.rig,
          headWorld,
          smoothTurnRadians(axisX, deltaSeconds, config.turnSpeedRadians),
        );
      }

      if (inputSource.handedness !== 'right' && config.moveEnabled !== false) {
        const strafe = smoothAxis(axisX);
        const advance = -smoothAxis(axisY); // stick up (negative axis) moves forward
        if (strafe !== 0 || advance !== 0) {
          head.getWorldDirection(forward);
          forward.y = 0;
          if (forward.lengthSq() > 1e-6) {
            forward.normalize();
            // forward × up is the learner's right hand side (up × forward
            // points left and inverts strafe — see vr-framework.test.ts).
            right.crossVectors(forward, up);
            const speed = (config.moveSpeed ?? DEFAULT_MOVE_SPEED) * deltaSeconds;
            config.rig.position.addScaledVector(forward, advance * speed);
            config.rig.position.addScaledVector(right, strafe * speed);
          }
        }
      }

      const back = updateButtonLatch(
        isQuestBackPressed(gamepad.buttons, inputSource.handedness),
        backLatches.get(inputSource) ?? false,
      );
      backLatches.set(inputSource, back.latched);
      if (back.pressed) config.onBack?.();
    }
  }

  return { update };
}

export type VrLocomotion = ReturnType<typeof createVrLocomotion>;
