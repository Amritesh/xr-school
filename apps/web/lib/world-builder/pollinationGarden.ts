import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface PollinationGardenMaterials {
  soil: THREE.Material;
  path: THREE.Material;
  paintedWood: THREE.Material;
  naturalWood: THREE.Material;
  leaf: THREE.Material;
  grass: THREE.Material;
  glass: THREE.Material;
  metal: THREE.Material;
}

export function createSchoolGarden(materials: PollinationGardenMaterials) {
  const root = new THREE.Group();
  root.name = 'school-garden';

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    materials.grass,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const skyGeometry = new THREE.SphereGeometry(32, 32, 18);
  const skyColours = new Float32Array(
    skyGeometry.attributes.position.count * 3,
  );
  const horizon = new THREE.Color('#dceef2');
  const zenith = new THREE.Color('#6fa9bd');
  for (let index = 0; index < skyGeometry.attributes.position.count; index += 1) {
    const y = skyGeometry.attributes.position.getY(index);
    const mix = THREE.MathUtils.clamp((y + 4) / 30, 0, 1);
    const colour = horizon.clone().lerp(zenith, mix);
    colour.toArray(skyColours, index * 3);
  }
  skyGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(skyColours, 3),
  );
  const sky = new THREE.Mesh(
    skyGeometry,
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
      fog: false,
    }),
  );
  sky.name = 'garden-sky';
  root.add(sky);

  const path = new THREE.Mesh(
    new RoundedBoxGeometry(2.1, 0.045, 10, 5, 0.18),
    materials.path,
  );
  path.position.set(0, 0.015, 0.8);
  path.receiveShadow = true;
  root.add(path);

  for (const x of [-2.35, 2.35]) {
    const bed = new THREE.Group();
    bed.name = x < 0 ? 'treatment-bed' : 'control-bed';
    const soil = new THREE.Mesh(
      new RoundedBoxGeometry(2.8, 0.34, 4.6, 5, 0.14),
      materials.soil,
    );
    soil.position.y = 0.14;
    soil.receiveShadow = true;
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(3.05, 0.24, 4.85),
      materials.naturalWood,
    );
    border.position.y = 0.08;
    border.receiveShadow = true;
    bed.add(border, soil);
    bed.position.x = x;
    root.add(bed);
  }

  const grassGeometry = new THREE.ConeGeometry(0.028, 0.34, 4);
  const grass = new THREE.InstancedMesh(grassGeometry, materials.grass, 420);
  grass.name = 'instanced-garden-grass';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let index = 0; index < grass.count; index += 1) {
    const angle = index * 2.399963;
    const radius = 2.8 + (index % 37) / 37 * 4.6;
    position.set(
      Math.cos(angle) * radius,
      0.15,
      Math.sin(angle) * radius,
    );
    quaternion.setFromEuler(new THREE.Euler(0, angle, (index % 7 - 3) * 0.025));
    const height = 0.65 + (index % 11) / 25;
    scale.set(0.7 + index % 3 * 0.16, height, 0.7);
    matrix.compose(position, quaternion, scale);
    grass.setMatrixAt(index, matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.castShadow = false;
  root.add(grass);

  const peripheralFlowerBed = new THREE.Group();
  peripheralFlowerBed.name = 'peripheral-flower-bed';
  const peripheralCount = 168;
  const stemGeometry = new THREE.CylinderGeometry(0.012, 0.018, 0.58, 6);
  const blossomGeometry = new THREE.SphereGeometry(0.065, 10, 7);
  const stems = new THREE.InstancedMesh(
    stemGeometry,
    materials.leaf,
    peripheralCount,
  );
  // Three colour batches instead of one flat wood-toned batch — a scattered
  // meadow of actual flower colours instead of pale spheres lost in the grass.
  const blossomColors = [0xf472b6, 0xc084fc, 0xfacc15];
  const blossomBatches = blossomColors.map(color => new THREE.InstancedMesh(
    blossomGeometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
    Math.ceil(peripheralCount / blossomColors.length),
  ));
  const blossomBatchCounts = new Array(blossomColors.length).fill(0);
  for (let index = 0; index < peripheralCount; index += 1) {
    const row = Math.floor(index / 24);
    const column = index % 24;
    const side = row < 2 ? -1 : 1;
    const x = side * (3.8 + (row % 2) * 0.75);
    const z = -5.6 + column / 23 * 11.2;
    const height = 0.7 + (index % 7) * 0.045;
    position.set(x, 0.22 + height * 0.25, z);
    quaternion.setFromEuler(new THREE.Euler(0, index * 0.7, 0));
    scale.set(1, height, 1);
    matrix.compose(position, quaternion, scale);
    stems.setMatrixAt(index, matrix);
    position.y = 0.45 + height * 0.5;
    scale.set(1 + index % 3 * 0.18, 0.45, 1 + index % 2 * 0.16);
    matrix.compose(position, quaternion, scale);
    const batchIndex = index % blossomColors.length;
    blossomBatches[batchIndex].setMatrixAt(blossomBatchCounts[batchIndex], matrix);
    blossomBatchCounts[batchIndex] += 1;
  }
  stems.instanceMatrix.needsUpdate = true;
  for (const batch of blossomBatches) batch.instanceMatrix.needsUpdate = true;
  peripheralFlowerBed.add(stems, ...blossomBatches);
  root.add(peripheralFlowerBed);

  const pollinatorHabitat = new THREE.Group();
  pollinatorHabitat.name = 'pollinator-habitat';
  const shrubGeometry = new THREE.IcosahedronGeometry(0.52, 2);
  const shrubs = new THREE.InstancedMesh(shrubGeometry, materials.leaf, 22);
  for (let index = 0; index < shrubs.count; index += 1) {
    const angle = index / shrubs.count * Math.PI * 2;
    const radius = 6.3 + (index % 4) * 0.22;
    position.set(
      Math.cos(angle) * radius,
      0.48 + index % 3 * 0.08,
      Math.sin(angle) * radius,
    );
    quaternion.setFromEuler(new THREE.Euler(0, angle, 0));
    scale.set(
      0.8 + index % 5 * 0.08,
      0.75 + index % 4 * 0.1,
      0.82 + index % 3 * 0.09,
    );
    matrix.compose(position, quaternion, scale);
    shrubs.setMatrixAt(index, matrix);
  }
  shrubs.instanceMatrix.needsUpdate = true;
  pollinatorHabitat.add(shrubs);
  root.add(pollinatorHabitat);

  const schoolBlock = new THREE.Group();
  schoolBlock.name = 'school-science-block';
  schoolBlock.position.set(0, 0, -9.4);
  const facade = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4.6, 1.4),
    materials.paintedWood,
  );
  facade.position.y = 2.55;
  facade.receiveShadow = true;
  schoolBlock.add(facade);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(14.8, 0.22, 2.1),
    materials.metal,
  );
  roof.position.y = 4.95;
  schoolBlock.add(roof);
  for (let floor = 0; floor < 2; floor += 1) {
    for (let column = 0; column < 7; column += 1) {
      const window = new THREE.Mesh(
        new RoundedBoxGeometry(1.15, 1.15, 0.045, 3, 0.05),
        materials.glass,
      );
      window.position.set(-5.7 + column * 1.9, 1.55 + floor * 1.85, 0.73);
      schoolBlock.add(window);
    }
  }
  const entrance = new THREE.Mesh(
    new RoundedBoxGeometry(1.45, 2.15, 0.08, 3, 0.05),
    materials.metal,
  );
  entrance.position.set(0, 1.08, 0.76);
  schoolBlock.add(entrance);
  root.add(schoolBlock);

  const boundary = new THREE.Group();
  boundary.name = 'garden-boundary';
  for (const [x, z, width, depth] of [
    [0, -7.5, 15, 0.28],
    [-7.5, 0, 0.28, 15],
    [7.5, 0, 0.28, 15],
  ]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.72, depth),
      materials.paintedWood,
    );
    wall.position.set(x, 0.36, z);
    wall.receiveShadow = true;
    boundary.add(wall);
  }
  root.add(boundary);

  const trellis = new THREE.Group();
  trellis.name = 'pollinator-trellis';
  trellis.position.set(-4.4, 0, -3.9);
  for (const x of [-0.85, 0.85]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.065, 2.6, 10),
      materials.naturalWood,
    );
    post.position.set(x, 1.3, 0);
    post.castShadow = true;
    trellis.add(post);
  }
  for (let index = 0; index < 5; index += 1) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1.7, 7),
      materials.naturalWood,
    );
    rail.rotation.z = Math.PI / 2;
    rail.position.y = 0.55 + index * 0.42;
    trellis.add(rail);
  }
  root.add(trellis);

  const fieldTable = new THREE.Group();
  fieldTable.name = 'field-table';
  fieldTable.position.set(2.9, 0, 1.7);
  const tableTop = new THREE.Mesh(
    new RoundedBoxGeometry(1.7, 0.09, 0.78, 4, 0.05),
    materials.naturalWood,
  );
  tableTop.position.y = 0.86;
  tableTop.castShadow = true;
  fieldTable.add(tableTop);
  for (const x of [-0.68, 0.68]) {
    for (const z of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, 0.84, 8),
        materials.metal,
      );
      leg.position.set(x, 0.42, z);
      fieldTable.add(leg);
    }
  }
  root.add(fieldTable);

  const soilWindow = new THREE.Group();
  soilWindow.name = 'soil-observation-window';
  soilWindow.position.set(-2.7, 0.38, 2.9);
  const windowSoil = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.78, 0.24),
    materials.soil,
  );
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.84, 0.025),
    materials.glass,
  );
  glass.position.z = 0.14;
  soilWindow.add(windowSoil, glass);
  root.add(soilWindow);

  const windObjects: THREE.Object3D[] = [
    trellis,
    grass,
    peripheralFlowerBed,
    pollinatorHabitat,
  ];
  return {
    root,
    fieldTable,
    soilWindow,
    windObjects,
    updateWind(elapsedSeconds: number) {
      trellis.rotation.z = Math.sin(elapsedSeconds * 0.7) * 0.006;
      grass.rotation.y = Math.sin(elapsedSeconds * 0.23) * 0.002;
      peripheralFlowerBed.rotation.z = Math.sin(elapsedSeconds * 0.54) * 0.002;
      pollinatorHabitat.rotation.y = Math.sin(elapsedSeconds * 0.17) * 0.0015;
    },
  };
}
