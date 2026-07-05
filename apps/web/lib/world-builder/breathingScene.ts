import * as THREE from 'three';
import {
  createAirway,
  createAlveoliCluster,
  createBreathingControl,
  createComparisonBoard,
  createDiaphragm,
  createLungs,
  createRibCage,
  type BreathingAnatomyMaterials,
} from './breathingAnatomy';

export interface BreathingSceneConfig {
  scene: THREE.Scene;
  materials: BreathingAnatomyMaterials;
}

/** 0 = fully exhaled (relaxed diaphragm, smaller lungs), 1 = fully inhaled
 * (contracted, flattened diaphragm, expanded rib cage and lungs). */
const EASE_RATE = 3.2;

export function createBreathingScene(config: BreathingSceneConfig) {
  const root = new THREE.Group();
  root.name = 'breathing-production-world';
  config.scene.add(root);

  const ribCage = createRibCage(config.materials.bone);
  const lungs = createLungs(config.materials.lung);
  const diaphragm = createDiaphragm(config.materials.muscle);
  const airway = createAirway(config.materials.airway);
  const alveoli = createAlveoliCluster(config.materials.lung, config.materials.capillary);
  alveoli.root.position.set(0.1, 0.46, 0.18);
  alveoli.root.scale.setScalar(1.6);

  const inhaleControl = createBreathingControl('inhale-control', config.materials.control);
  inhaleControl.position.set(-0.48, 0.22, 0.3);
  const exhaleControl = createBreathingControl('exhale-control', config.materials.controlAccent);
  exhaleControl.position.set(0.48, 0.22, 0.3);

  const comparisonBoard = createComparisonBoard(
    config.materials.board,
    config.materials.control,
    config.materials.controlAccent,
  );
  comparisonBoard.position.set(0.78, 0.85, -0.08);
  comparisonBoard.rotation.y = -0.4;

  root.add(
    ribCage.root,
    lungs.root,
    diaphragm,
    airway.root,
    alveoli.root,
    inhaleControl,
    exhaleControl,
    comparisonBoard,
  );

  const diaphragmBaseY = diaphragm.position.y;
  let phase = 0;
  let targetPhase = 0;
  let autoCycle = false;

  function applyPhase() {
    diaphragm.position.y = diaphragmBaseY - phase * 0.1;
    diaphragm.scale.y = 1 - phase * 0.55;
    lungs.left.scale.set(0.62 * (1 + phase * 0.16), 1.05 * (1 + phase * 0.1), 0.58 * (1 + phase * 0.16));
    lungs.right.scale.set(0.62 * (1 + phase * 0.16), 1.05 * (1 + phase * 0.1), 0.58 * (1 + phase * 0.16));
    ribCage.root.scale.set(1 + phase * 0.06, 1 + phase * 0.02, 1 + phase * 0.06);
  }
  applyPhase();

  /** Sets the phase the animation eases toward. Ignored while the
   * stage-5 comparison auto-cycle is running. */
  function setBreathingPhase(next: number) {
    targetPhase = THREE.MathUtils.clamp(next, 0, 1);
  }

  function update(deltaSeconds: number, elapsedSeconds: number) {
    if (autoCycle) {
      targetPhase = (Math.sin(elapsedSeconds * 1.4) + 1) / 2;
    }
    const t = Math.min(1, deltaSeconds * EASE_RATE);
    phase += (targetPhase - phase) * t;
    applyPhase();
  }

  let stage = 0;
  function setStage(nextStage: number) {
    stage = Math.max(0, Math.min(5, nextStage));
    autoCycle = stage === 5;
    if (stage === 3 && targetPhase === 0) {
      // Entering "breathe out" — start from a fully inhaled chest so there
      // is something to visibly release.
      phase = 1;
      targetPhase = 1;
      applyPhase();
    }
  }
  setStage(0);

  function dispose() {
    config.scene.remove(root);
    root.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
  }

  return {
    root,
    ribCage: ribCage.root,
    lungs: lungs.root,
    diaphragm,
    airway: airway.root,
    alveoli: alveoli.root,
    inhaleControl,
    exhaleControl,
    comparisonBoard,
    setStage,
    update,
    setBreathingPhase,
    dispose,
  };
}

export type BreathingScene = ReturnType<typeof createBreathingScene>;
