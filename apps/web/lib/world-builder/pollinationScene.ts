import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
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
import { POLLINATION_LAYOUT } from './pollinationLayout';

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
    position: [...POLLINATION_LAYOUT.treatmentFlower.position],
    height: POLLINATION_LAYOUT.treatmentFlower.height,
  });
  const controlFlower = createFlowerSpecimen(config.materials, {
    id: 'control',
    position: [...POLLINATION_LAYOUT.controlFlower.position],
    height: POLLINATION_LAYOUT.controlFlower.height,
  });
  root.add(treatmentFlower.root, controlFlower.root);

  const bee = createBee(config.materials);
  bee.root.position.set(...POLLINATION_LAYOUT.beeFlightCenter);
  root.add(bee.root);

  const fruit = createFruitAndSeed(config.materials);
  fruit.root.position.set(...POLLINATION_LAYOUT.fruit.position);
  fruit.root.visible = false;
  root.add(fruit.root);

  const germination = createGerminationSpecimen(config.materials);
  const germinationCutaway = new THREE.Group();
  germinationCutaway.name = 'enlarged-germination-cutaway';
  germinationCutaway.position.set(...POLLINATION_LAYOUT.germinationCutaway.position);
  germinationCutaway.scale.setScalar(POLLINATION_LAYOUT.germinationCutaway.scale);
  germinationCutaway.visible = false;
  const soilBackdrop = new THREE.Mesh(
    new RoundedBoxGeometry(1.45, 1.2, 0.18, 4, 0.08),
    config.materials.soil,
  );
  soilBackdrop.position.set(0, -0.12, -0.16);
  soilBackdrop.receiveShadow = true;
  germination.root.position.set(0, 0.12, 0.02);
  germinationCutaway.add(soilBackdrop, germination.root);
  root.add(germinationCutaway);

  const tools = createPollinationTools(config.materials);
  tools.root.position.set(...POLLINATION_LAYOUT.toolRoot.position);
  root.add(tools.root);

  const pistilCutaway = new THREE.Group();
  pistilCutaway.name = 'enlarged-pistil-cutaway';
  pistilCutaway.position.set(...POLLINATION_LAYOUT.pistilCutaway.position);
  pistilCutaway.scale.setScalar(POLLINATION_LAYOUT.pistilCutaway.scale);
  pistilCutaway.visible = false;
  const cutawayStyle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 1.05, 24),
    config.materials.flowerCentre,
  );
  cutawayStyle.position.y = 0.42;
  pistilCutaway.add(cutawayStyle);
  const cutawayStigma = new THREE.Group();
  cutawayStigma.position.y = 1;
  for (let index = 0; index < 3; index += 1) {
    const lobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 20, 12),
      config.materials.flowerCentre,
    );
    const angle = index / 3 * Math.PI * 2;
    lobe.position.set(Math.cos(angle) * 0.14, 0, Math.sin(angle) * 0.14);
    lobe.scale.set(1, 0.5, 1.35);
    cutawayStigma.add(lobe);
  }
  pistilCutaway.add(cutawayStigma);
  const cutawayOvary = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 32, 20, 0, Math.PI),
    config.materials.stem,
  );
  cutawayOvary.rotation.y = Math.PI / 2;
  cutawayOvary.position.y = -0.22;
  pistilCutaway.add(cutawayOvary);
  for (let index = 0; index < 8; index += 1) {
    const ovule = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 10),
      config.materials.seed,
    );
    ovule.position.set(
      (index % 2 ? 1 : -1) * 0.18,
      -0.42 + Math.floor(index / 2) * 0.14,
      0.06,
    );
    ovule.name = index === 6 ? 'target-ovule' : `ovule-${index + 1}`;
    pistilCutaway.add(ovule);
  }
  const pollenTubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, 1.08, 0.06),
    new THREE.Vector3(-0.03, 0.72, 0.04),
    new THREE.Vector3(0.05, 0.28, 0.04),
    new THREE.Vector3(-0.04, -0.12, 0.05),
    new THREE.Vector3(0.18, -0.28, 0.06),
  ]);
  const pollenTube = new THREE.Mesh(
    new THREE.TubeGeometry(pollenTubeCurve, 48, 0.035, 10, false),
    config.materials.pollen,
  );
  pollenTube.name = 'pollen-tube-path';
  pistilCutaway.add(pollenTube);
  root.add(pistilCutaway);

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
      POLLINATION_LAYOUT.pollenCloudOrigin[0] + Math.cos(angle) * radius,
      POLLINATION_LAYOUT.pollenCloudOrigin[1] + (index % 9) * 0.006,
      POLLINATION_LAYOUT.pollenCloudOrigin[2] + Math.sin(angle) * radius,
    );
    dummy.scale.setScalar(0.7 + index % 4 * 0.12);
    dummy.updateMatrix();
    pollen.setMatrixAt(index, dummy.matrix);
  }
  pollen.instanceMatrix.needsUpdate = true;

  let stage = 0;
  function setStage(nextStage: number) {
    stage = Math.max(0, Math.min(7, nextStage));
    const inPistilCutaway = stage === 4;
    const inGerminationCutaway = stage === 7;
    const inCutaway = inPistilCutaway || inGerminationCutaway;
    garden.root.visible = !inCutaway;
    treatmentFlower.root.visible = !inCutaway;
    controlFlower.root.visible = !inCutaway;
    tools.root.visible = !inCutaway;
    pollen.visible = !inCutaway && stage >= 1 && stage <= 3;
    bee.root.visible = !inCutaway && stage >= 2 && stage <= 3;
    pistilCutaway.visible = inPistilCutaway;
    germinationCutaway.visible = inGerminationCutaway;
    fruit.root.visible = !inCutaway && stage >= 5;
    germination.root.visible = inGerminationCutaway;
    treatmentFlower.ovaryCutaway.visible = false;
    controlFlower.ovaryCutaway.visible = false;
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
    pistilCutaway,
    germinationCutaway,
    setStage,
    update(deltaSeconds: number, elapsedSeconds: number) {
      garden.updateWind(elapsedSeconds);
      if (bee.root.visible) {
        const orbit = elapsedSeconds * 0.62;
        bee.root.position.set(
          POLLINATION_LAYOUT.beeFlightCenter[0] + Math.cos(orbit) * 0.72,
          POLLINATION_LAYOUT.beeFlightCenter[1] + Math.sin(orbit * 1.7) * 0.12,
          POLLINATION_LAYOUT.beeFlightCenter[2] + Math.sin(orbit) * 0.42,
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
      if (stage === 4) {
        pollenTube.scale.setScalar(
          1 + Math.sin(elapsedSeconds * 2.4) * 0.035,
        );
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
