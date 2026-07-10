import * as THREE from 'three';

/**
 * Shared player rig for every simulation's VR mode.
 *
 * With the 'local-floor' reference space the headset pose *replaces* the
 * desktop camera transform, so the learner always stands at the rig origin.
 * Several simulations centre their apparatus on the world origin, which is
 * exactly why QA found users spawning inside the particle chamber, above
 * the lungs, or in the middle of the arena. The fix is one authored spawn
 * pose per simulation: a floor position plus a point to face, applied to
 * the rig when the immersive session starts and reverted when it ends.
 */

export interface VrSpawnPose {
  /** Where the learner's feet are when the headset session starts. */
  position: THREE.Vector3;
  /** World point the learner initially faces (yaw only). */
  lookAt: THREE.Vector3;
}

/** Yaw that points the rig's -Z (the learner's forward) at `lookAt`. */
export function spawnYawRadians(position: THREE.Vector3, lookAt: THREE.Vector3) {
  return Math.atan2(-(lookAt.x - position.x), -(lookAt.z - position.z));
}

export interface VrPlayerRigConfig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  spawn: VrSpawnPose;
  rayColor?: THREE.ColorRepresentation;
}

export function createVrPlayerRig(config: VrPlayerRigConfig) {
  const rig = new THREE.Group();
  rig.name = 'player-rig';
  rig.add(config.camera);
  config.scene.add(rig);

  const rayGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -2.5),
  ]);
  const rayMaterial = new THREE.LineBasicMaterial({
    color: config.rayColor ?? '#7dd3fc',
    transparent: true,
    opacity: 0.72,
  });
  const controllers = [0, 1].map(index => {
    const controller = config.renderer.xr.getController(index);
    controller.name = `quest-controller-${index}`;
    controller.add(new THREE.Line(rayGeometry, rayMaterial));
    rig.add(controller);
    return controller;
  });

  // The XR session overwrites the camera pose every frame; remember the
  // desktop framing so leaving VR returns to the exact same browser shot.
  const desktopPosition = new THREE.Vector3();
  const desktopQuaternion = new THREE.Quaternion();

  const onSessionStart = () => {
    desktopPosition.copy(config.camera.position);
    desktopQuaternion.copy(config.camera.quaternion);
    rig.position.copy(config.spawn.position);
    rig.rotation.set(0, spawnYawRadians(config.spawn.position, config.spawn.lookAt), 0);
    rig.updateMatrixWorld(true);
  };
  const onSessionEnd = () => {
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    config.camera.position.copy(desktopPosition);
    config.camera.quaternion.copy(desktopQuaternion);
    rig.updateMatrixWorld(true);
  };
  config.renderer.xr.addEventListener('sessionstart', onSessionStart);
  config.renderer.xr.addEventListener('sessionend', onSessionEnd);

  function dispose() {
    config.renderer.xr.removeEventListener('sessionstart', onSessionStart);
    config.renderer.xr.removeEventListener('sessionend', onSessionEnd);
    rayGeometry.dispose();
    rayMaterial.dispose();
    for (const controller of controllers) rig.remove(controller);
    config.scene.remove(rig);
  }

  return { rig, controllers, dispose };
}

export type VrPlayerRig = ReturnType<typeof createVrPlayerRig>;
