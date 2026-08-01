import * as THREE from 'three';

export interface VrSpawnPose {
  /** Where the learner's feet are when the immersive session starts. */
  position: THREE.Vector3;
  /** World point the learner initially faces (yaw only). */
  lookAt: THREE.Vector3;
}

/** Yaw that points the rig's -Z axis toward the authored target. */
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
  const controllerRays: THREE.Line[] = [];
  const controllers = [0, 1].map(index => {
    const controller = config.renderer.xr.getController(index);
    controller.name = `quest-controller-${index}`;
    const ray = new THREE.Line(rayGeometry, rayMaterial);
    controllerRays.push(ray);
    controller.add(ray);
    rig.add(controller);
    return controller;
  });
  const desktopPosition = new THREE.Vector3();
  const desktopQuaternion = new THREE.Quaternion();

  const onSessionStart = () => {
    desktopPosition.copy(config.camera.position);
    desktopQuaternion.copy(config.camera.quaternion);
    rig.position.copy(config.spawn.position);
    rig.rotation.set(
      0,
      spawnYawRadians(config.spawn.position, config.spawn.lookAt),
      0,
    );
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

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    config.renderer.xr.removeEventListener('sessionstart', onSessionStart);
    config.renderer.xr.removeEventListener('sessionend', onSessionEnd);
    for (let index = 0; index < controllers.length; index += 1) {
      controllers[index].remove(controllerRays[index]);
      rig.remove(controllers[index]);
    }
    rayGeometry.dispose();
    rayMaterial.dispose();
    config.scene.remove(rig);
  }

  return { rig, controllers, dispose };
}

export type VrPlayerRig = ReturnType<typeof createVrPlayerRig>;
