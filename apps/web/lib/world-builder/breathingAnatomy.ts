import * as THREE from 'three';

export interface BreathingAnatomyMaterials {
  bone: THREE.Material;
  muscle: THREE.Material;
  lung: THREE.Material;
  airway: THREE.Material;
  capillary: THREE.Material;
  control: THREE.Material;
  controlAccent: THREE.Material;
  board: THREE.Material;
}

export interface RibCage {
  root: THREE.Group;
  ribs: THREE.Mesh[];
}

function createRibPair(radius: number, material: THREE.Material) {
  const pair = new THREE.Group();
  for (const side of [-1, 1] as const) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.015, 8, 24, Math.PI * 0.62),
      material,
    );
    rib.rotation.x = Math.PI / 2;
    rib.rotation.z = side === 1 ? Math.PI * 0.19 : Math.PI * 0.81 + Math.PI;
    rib.scale.z = 0.62;
    rib.castShadow = true;
    pair.add(rib);
  }
  return pair;
}

/** Stylised, labelled rib cage: paired arcs stacked on a spine and sternum. */
export function createRibCage(material: THREE.Material): RibCage {
  const root = new THREE.Group();
  root.name = 'rib-cage';
  const ribs: THREE.Mesh[] = [];
  const ribCount = 6;
  for (let index = 0; index < ribCount; index += 1) {
    const t = index / (ribCount - 1);
    const y = 0.92 - t * 0.82;
    const radius = 0.24 + Math.sin(t * Math.PI) * 0.1;
    const pair = createRibPair(radius, material);
    pair.position.y = y;
    root.add(pair);
    pair.traverse(child => {
      if (child instanceof THREE.Mesh) ribs.push(child);
    });
  }

  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.9, 10),
    material,
  );
  spine.position.set(0, 0.5, -0.28);
  spine.castShadow = true;
  root.add(spine);

  const sternum = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.68, 0.03),
    material,
  );
  sternum.position.set(0, 0.56, 0.3);
  sternum.castShadow = true;
  root.add(sternum);

  return { root, ribs };
}

export interface Lungs {
  root: THREE.Group;
  left: THREE.Mesh;
  right: THREE.Mesh;
}

/** Two lobed lungs, sized to sit inside the rib cage and scale with breath. */
export function createLungs(material: THREE.Material): Lungs {
  const root = new THREE.Group();
  root.name = 'lungs';

  function lobe(side: -1 | 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 18), material);
    mesh.scale.set(0.62, 1.05, 0.58);
    mesh.position.set(side * 0.17, 0.48, -0.02);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  const left = lobe(-1);
  left.name = 'left-lung';
  const right = lobe(1);
  right.name = 'right-lung';
  root.add(left, right);
  return { root, left, right };
}

/** A dome that flattens and drops on inhale, domes back up on exhale. */
export function createDiaphragm(material: THREE.Material) {
  const diaphragm = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    material,
  );
  diaphragm.name = 'diaphragm';
  diaphragm.rotation.x = Math.PI;
  diaphragm.position.set(0, 0.14, -0.02);
  diaphragm.castShadow = true;
  diaphragm.receiveShadow = true;
  return diaphragm;
}

export interface Airway {
  root: THREE.Group;
  trachea: THREE.Mesh;
}

/** Windpipe plus the two bronchi feeding each lung. */
export function createAirway(material: THREE.Material): Airway {
  const root = new THREE.Group();
  root.name = 'airway';

  const trachea = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.06, 0.55, 16),
    material,
  );
  trachea.name = 'trachea';
  trachea.position.set(0, 1.08, 0);
  trachea.castShadow = true;
  root.add(trachea);

  for (let ring = 0; ring < 5; ring += 1) {
    const cartilage = new THREE.Mesh(
      new THREE.TorusGeometry(0.058, 0.006, 6, 16),
      material,
    );
    cartilage.rotation.x = Math.PI / 2;
    cartilage.position.set(0, 0.9 + ring * 0.09, 0);
    root.add(cartilage);
  }

  for (const side of [-1, 1] as const) {
    const bronchus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.045, 0.32, 12),
      material,
    );
    bronchus.position.set(side * 0.1, 0.68, -0.02);
    bronchus.rotation.z = side * 0.55;
    bronchus.castShadow = true;
    root.add(bronchus);
  }

  const noseCap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), material);
  noseCap.position.set(0, 1.36, 0);
  root.add(noseCap);

  return { root, trachea };
}

export interface AlveoliCluster {
  root: THREE.Group;
}

/** A grape-like alveoli cluster with capillary wrapping, used as the
 * "zoom into the alveoli" cutaway target. Not to literal microscopic
 * scale — see the scale disclosure shown when this stage is entered. */
export function createAlveoliCluster(
  sacMaterial: THREE.Material,
  capillaryMaterial: THREE.Material,
): AlveoliCluster {
  const root = new THREE.Group();
  root.name = 'alveoli-cutaway';

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.1, 8),
    sacMaterial,
  );
  stem.position.y = -0.06;
  root.add(stem);

  const sacCount = 14;
  for (let index = 0; index < sacCount; index += 1) {
    const angle = (index / sacCount) * Math.PI * 2 * 2.4;
    const radius = 0.03 + (index / sacCount) * 0.05;
    const sac = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), sacMaterial);
    sac.position.set(
      Math.cos(angle) * radius,
      (index / sacCount) * 0.14 - 0.02,
      Math.sin(angle) * radius,
    );
    sac.castShadow = true;
    root.add(sac);
  }

  for (let wrap = 0; wrap < 3; wrap += 1) {
    const capillary = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.004, 6, 20),
      capillaryMaterial,
    );
    capillary.rotation.x = Math.PI / 2;
    capillary.rotation.z = wrap * 0.6;
    capillary.position.y = wrap * 0.045;
    root.add(capillary);
  }

  return { root };
}

/** A small handle the learner "pulls" or "releases" to drive one phase of
 * the breathing cycle — distinct from the anatomy itself so it reads as a
 * control, not a body part. */
export function createBreathingControl(
  id: 'inhale-control' | 'exhale-control',
  material: THREE.Material,
) {
  const group = new THREE.Group();
  group.name = id;
  const direction = id === 'inhale-control' ? -1 : 1;
  const handle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 16), material);
  handle.rotation.x = direction === -1 ? Math.PI : 0;
  handle.castShadow = true;
  group.add(handle);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8),
    material,
  );
  shaft.position.y = direction * -0.09;
  group.add(shaft);
  return group;
}

/** A small placard used as the final "compare the two phases" target. */
export function createComparisonBoard(
  boardMaterial: THREE.Material,
  inhaleMaterial: THREE.Material,
  exhaleMaterial: THREE.Material,
) {
  const board = new THREE.Group();
  board.name = 'comparison-board';

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.32, 0.02),
    boardMaterial,
  );
  panel.castShadow = true;
  board.add(panel);

  const inhaleChip = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), inhaleMaterial);
  inhaleChip.position.set(-0.12, 0.02, 0.012);
  board.add(inhaleChip);

  const exhaleChip = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), exhaleMaterial);
  exhaleChip.position.set(0.12, 0.02, 0.012);
  board.add(exhaleChip);

  return board;
}
