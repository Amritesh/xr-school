import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface PollinationToolMaterials {
  wood: THREE.Material;
  bristle: THREE.Material;
  metal: THREE.Material;
  glass: THREE.Material;
  paintedMetal: THREE.Material;
  rubber: THREE.Material;
  paper: THREE.Material;
  water: THREE.Material;
  soil: THREE.Material;
}

function roundedHandle(
  length: number,
  radius: number,
  material: THREE.Material,
) {
  const handle = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 8, 12),
    material,
  );
  handle.castShadow = true;
  return handle;
}

export function createPollinationTools(materials: PollinationToolMaterials) {
  const root = new THREE.Group();
  root.name = 'field-tool-tray';

  const brush = new THREE.Group();
  brush.name = 'pollen-brush';
  const brushHandle = roundedHandle(0.22, 0.018, materials.wood);
  brushHandle.rotation.z = Math.PI / 2;
  const ferrule = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.019, 0.07, 12),
    materials.metal,
  );
  ferrule.rotation.z = Math.PI / 2;
  ferrule.position.x = 0.145;
  const bristles = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.08, 14),
    materials.bristle,
  );
  bristles.rotation.z = -Math.PI / 2;
  bristles.position.x = 0.215;
  bristles.name = 'brush-bristles';
  brush.add(brushHandle, ferrule, bristles);
  brush.position.set(-0.45, 0.94, 0.03);
  root.add(brush);

  const lens = new THREE.Group();
  lens.name = 'hand-lens';
  const lensHandle = roundedHandle(0.15, 0.025, materials.rubber);
  lensHandle.position.y = -0.14;
  const lensRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.105, 0.015, 10, 32),
    materials.metal,
  );
  const lensGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.095, 32),
    materials.glass,
  );
  lensGlass.position.z = -0.003;
  lens.add(lensHandle, lensRim, lensGlass);
  lens.position.set(-0.06, 1.04, 0.03);
  root.add(lens);

  const wateringCan = new THREE.Group();
  wateringCan.name = 'watering-can';
  const canBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.15, 0.24, 18),
    materials.paintedMetal,
  );
  canBody.position.y = 0.13;
  canBody.castShadow = true;
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.055, 0.34, 12),
    materials.paintedMetal,
  );
  spout.position.set(-0.2, 0.17, 0);
  spout.rotation.z = -Math.PI / 3;
  const rose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.035, 0.05, 16),
    materials.metal,
  );
  rose.position.set(-0.36, 0.27, 0);
  rose.rotation.z = -Math.PI / 3;
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.018, 10, 24, Math.PI),
    materials.rubber,
  );
  handle.position.y = 0.27;
  handle.rotation.z = Math.PI / 2;
  wateringCan.add(canBody, spout, rose, handle);
  wateringCan.position.set(0.48, 0.91, -0.02);
  root.add(wateringCan);

  const trowel = new THREE.Group();
  trowel.name = 'trowel';
  const trowelHandle = roundedHandle(0.14, 0.026, materials.wood);
  trowelHandle.rotation.z = Math.PI / 2;
  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.18, 3),
    materials.metal,
  );
  blade.rotation.z = -Math.PI / 2;
  blade.position.x = 0.18;
  trowel.add(trowelHandle, blade);
  trowel.position.set(0.04, 0.94, -0.18);
  root.add(trowel);

  const timeLapseDial = new THREE.Group();
  timeLapseDial.name = 'time-lapse-dial';
  const dialBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.15, 0.07, 24),
    materials.paintedMetal,
  );
  const dialKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.06, 18),
    materials.rubber,
  );
  dialKnob.position.y = 0.06;
  dialKnob.name = 'time-lapse-knob';
  timeLapseDial.add(dialBase, dialKnob);
  timeLapseDial.position.set(0.43, 0.94, 0.25);
  root.add(timeLapseDial);

  const tagBoard = new THREE.Group();
  tagBoard.name = 'field-tags';
  for (const [index, colour] of [[0, 0xffffff], [1, 0xfde68a]] as const) {
    const tag = new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 0.1, 0.012, 3, 0.012),
      materials.paper,
    );
    tag.name = index === 0 ? 'treatment-tag' : 'control-tag';
    tag.position.set(-0.42 + index * 0.24, 0, 0);
    tag.userData.colour = colour;
    tagBoard.add(tag);
  }
  tagBoard.position.set(-0.2, 0.96, 0.27);
  root.add(tagBoard);

  return {
    root,
    brush,
    bristles,
    lens,
    wateringCan,
    trowel,
    timeLapseDial,
    tagBoard,
  };
}
