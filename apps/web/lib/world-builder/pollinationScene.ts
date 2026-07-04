import * as THREE from 'three';
import type { QualityProfileId } from '../../../../packages/simulation-schema/src/index';
import {
  createBee,
  createFlowerSpecimen,
  createFruitAndSeed,
  createGerminationSpecimen,
  type PollinationBotanyMaterials,
} from './pollinationBotany';
import {
  createSchoolGarden,
  type PollinationGardenMaterials,
} from './pollinationGarden';
import {
  createPollinationTools,
  type PollinationToolMaterials,
} from './pollinationTools';

export type PollinationSceneMaterials =
  & PollinationBotanyMaterials
  & PollinationGardenMaterials
  & PollinationToolMaterials;

export interface PollinationSceneConfig {
  scene: THREE.Scene;
  materials: PollinationSceneMaterials;
  profileId: QualityProfileId;
}

export function createPollinationScene(config: PollinationSceneConfig) {
  const root = new THREE.Group();
  root.name = 'pollination-production-world';
  config.scene.add(root);

  const garden = createSchoolGarden(config.materials);
  root.add(garden.root);

  const treatmentFlower = createFlowerSpecimen(config.materials, {
    id: 'treatment',
    position: [-0.55, 0.31, -1.05],
    height: 0.92,
  });
  const controlFlower = createFlowerSpecimen(config.materials, {
    id: 'control',
    position: [0.55, 0.31, -1.2],
    height: 0.88,
  });
  root.add(treatmentFlower.root, controlFlower.root);

  const bee = createBee(config.materials);
  bee.root.position.set(-1.7, 1.42, -1.2);
  root.add(bee.root);

  const fruit = createFruitAndSeed(config.materials);
  fruit.root.position.set(-0.55, 1.1, -1.05);
  fruit.root.visible = false;
  root.add(fruit.root);

  const germination = createGerminationSpecimen(config.materials);
  germination.root.position.set(-2.7, 0.38, 3.06);
  germination.root.visible = false;
  root.add(germination.root);

  const tools = createPollinationTools(config.materials);
  tools.root.position.set(2.9, 0, 1.7);
  root.add(tools.root);

  const pollenGeometry = new THREE.SphereGeometry(0.008, 8, 6);
  const pollen = new THREE.InstancedMesh(
    pollenGeometry,
    config.materials.pollen,
    config.profileId === 'questBaseline' ? 72 : 120,
  );
  pollen.name = 'visible-pollen-evidence';
  pollen.visible = false;
  root.add(pollen);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < pollen.count; index += 1) {
    const angle = index * 2.399963;
    const radius = 0.025 + (index % 11) * 0.004;
    dummy.position.set(
      -0.55 + Math.cos(angle) * radius,
      1.43 + (index % 9) * 0.006,
      -1.05 + Math.sin(angle) * radius,
    );
    dummy.scale.setScalar(0.7 + index % 4 * 0.12);
    dummy.updateMatrix();
    pollen.setMatrixAt(index, dummy.matrix);
  }
  pollen.instanceMatrix.needsUpdate = true;

  let stage = 0;
  function setStage(nextStage: number) {
    stage = Math.max(0, Math.min(7, nextStage));
    pollen.visible = stage >= 1 && stage <= 4;
    bee.root.visible = stage >= 2 && stage <= 4;
    fruit.root.visible = stage >= 5;
    germination.root.visible = stage >= 6;
    treatmentFlower.ovaryCutaway.visible = stage === 4;
    controlFlower.ovaryCutaway.visible = stage === 4;
  }
  setStage(0);

  return {
    root,
    garden,
    treatmentFlower,
    controlFlower,
    antherTarget: treatmentFlower.antherTarget,
    stigmaTarget: treatmentFlower.stigmaTarget,
    bee,
    brush: tools.brush,
    lens: tools.lens,
    timeLapseDial: tools.timeLapseDial,
    fruit,
    seed: fruit.plantableSeed,
    trowel: tools.trowel,
    wateringCan: tools.wateringCan,
    soilWindow: garden.soilWindow,
    germination,
    pollen,
    setStage,
    update(deltaSeconds: number, elapsedSeconds: number) {
      garden.updateWind(elapsedSeconds);
      if (bee.root.visible) {
        const orbit = elapsedSeconds * 0.62;
        bee.root.position.set(
          -0.45 + Math.cos(orbit) * 0.72,
          1.35 + Math.sin(orbit * 1.7) * 0.12,
          -1.06 + Math.sin(orbit) * 0.42,
        );
        bee.root.rotation.y = -orbit + Math.PI / 2;
        for (const [index, wing] of bee.wings.entries()) {
          wing.rotation.z = (index % 2 ? -1 : 1)
            * (0.25 + Math.sin(elapsedSeconds * 38) * 0.48);
        }
      }
      if (stage === 7) {
        germination.firstLeaves.rotation.y += deltaSeconds * 0.08;
      }
    },
    dispose() {
      config.scene.remove(root);
      root.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          object.geometry.dispose();
        }
      });
    },
  };
}

export type PollinationScene = ReturnType<typeof createPollinationScene>;
