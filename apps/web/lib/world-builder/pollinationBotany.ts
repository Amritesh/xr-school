import * as THREE from 'three';

export interface PollinationBotanyMaterials {
  stem: THREE.Material;
  leaf: THREE.Material;
  petalPrimary: THREE.Material;
  petalControl: THREE.Material;
  pollen: THREE.Material;
  flowerCentre: THREE.Material;
  beeYellow: THREE.Material;
  beeDark: THREE.Material;
  beeWing: THREE.Material;
  fruitSkin: THREE.Material;
  fruitFlesh: THREE.Material;
  seed: THREE.Material;
  root: THREE.Material;
  soil: THREE.Material;
}

export interface FlowerSpecimen {
  root: THREE.Group;
  head: THREE.Group;
  antherTarget: THREE.Object3D;
  stigmaTarget: THREE.Object3D;
  ovaryCutaway: THREE.Group;
  petalGroup: THREE.Group;
  fruitAnchor: THREE.Group;
}

function createLeaf(material: THREE.Material, scale = 1) {
  const leaf = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 10),
    material,
  );
  blade.scale.set(1.8 * scale, 0.05, 0.72 * scale);
  blade.rotation.z = -0.28;
  blade.castShadow = true;
  blade.receiveShadow = true;
  leaf.add(blade);

  const midrib = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.006, 0.38 * scale, 6),
    material,
  );
  midrib.rotation.z = Math.PI / 2 - 0.28;
  leaf.add(midrib);
  return leaf;
}

function createPetal(
  material: THREE.Material,
  angle: number,
  inner: boolean,
) {
  const pivot = new THREE.Group();
  pivot.rotation.y = angle;
  const petal = new THREE.Mesh(
    new THREE.SphereGeometry(inner ? 0.105 : 0.145, 24, 14),
    material,
  );
  petal.position.set(0, inner ? 0.028 : 0.012, inner ? 0.13 : 0.2);
  petal.scale.set(inner ? 0.7 : 0.78, 0.16, inner ? 1.45 : 1.75);
  petal.rotation.x = inner ? -0.3 : -0.42;
  petal.castShadow = true;
  petal.receiveShadow = true;
  pivot.add(petal);
  return pivot;
}

export function createFlowerSpecimen(
  materials: PollinationBotanyMaterials,
  options: {
    id: 'treatment' | 'control';
    position: [number, number, number];
    height?: number;
  },
): FlowerSpecimen {
  const root = new THREE.Group();
  root.name = `${options.id}-flower`;
  root.position.set(...options.position);
  const height = options.height ?? 1.04;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.036, height, 14),
    materials.stem,
  );
  stem.position.y = height / 2;
  stem.castShadow = true;
  stem.receiveShadow = true;
  root.add(stem);

  for (const [side, y, yaw] of [
    [-1, 0.38, -0.55],
    [1, 0.58, 0.7],
    [-1, 0.76, -0.9],
  ] as const) {
    const leaf = createLeaf(materials.leaf, y > 0.7 ? 0.78 : 1);
    leaf.position.set(side * 0.05, y, 0);
    leaf.rotation.y = yaw;
    root.add(leaf);
  }

  const head = new THREE.Group();
  head.name = `${options.id}-flower-head`;
  head.position.y = height + 0.03;
  head.rotation.x = -0.12;
  root.add(head);

  const sepal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.035, 0.17, 12),
    materials.stem,
  );
  sepal.position.y = -0.08;
  sepal.castShadow = true;
  head.add(sepal);

  const petalGroup = new THREE.Group();
  petalGroup.name = 'petal-corolla';
  const petalMaterial = options.id === 'treatment'
    ? materials.petalPrimary
    : materials.petalControl;
  for (let index = 0; index < 12; index += 1) {
    petalGroup.add(createPetal(petalMaterial, index / 12 * Math.PI * 2, false));
  }
  for (let index = 0; index < 8; index += 1) {
    petalGroup.add(
      createPetal(
        petalMaterial,
        index / 8 * Math.PI * 2 + Math.PI / 8,
        true,
      ),
    );
  }
  head.add(petalGroup);

  const receptacle = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 24, 16),
    materials.flowerCentre,
  );
  receptacle.name = 'receptacle';
  receptacle.scale.y = 0.45;
  receptacle.castShadow = true;
  head.add(receptacle);

  const antherTarget = new THREE.Group();
  antherTarget.name = 'anther-target';
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const filament = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.005, 0.14, 7),
      materials.flowerCentre,
    );
    filament.position.set(Math.cos(angle) * 0.095, 0.08, Math.sin(angle) * 0.095);
    filament.rotation.z = Math.cos(angle) * 0.14;
    const anther = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.015, 0.035, 5, 9),
      materials.pollen,
    );
    anther.position.set(Math.cos(angle) * 0.105, 0.17, Math.sin(angle) * 0.105);
    anther.rotation.z = angle;
    anther.castShadow = true;
    antherTarget.add(filament, anther);
  }
  head.add(antherTarget);

  const style = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.019, 0.24, 12),
    materials.flowerCentre,
  );
  style.name = 'style';
  style.position.y = 0.12;
  head.add(style);

  const stigmaTarget = new THREE.Group();
  stigmaTarget.name = 'stigma-target';
  stigmaTarget.position.y = 0.245;
  for (let index = 0; index < 3; index += 1) {
    const lobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 8),
      materials.flowerCentre,
    );
    const angle = index / 3 * Math.PI * 2;
    lobe.position.set(Math.cos(angle) * 0.026, 0, Math.sin(angle) * 0.026);
    lobe.scale.set(1, 0.55, 1.3);
    stigmaTarget.add(lobe);
  }
  head.add(stigmaTarget);

  const ovaryCutaway = new THREE.Group();
  ovaryCutaway.name = 'ovary-cutaway';
  ovaryCutaway.position.y = -0.115;
  const ovary = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 18, 12, 0, Math.PI),
    materials.stem,
  );
  ovary.rotation.y = Math.PI / 2;
  ovaryCutaway.add(ovary);
  for (let index = 0; index < 6; index += 1) {
    const ovule = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 8, 6),
      materials.seed,
    );
    ovule.position.set(
      (index % 2 ? 1 : -1) * 0.025,
      -0.035 + Math.floor(index / 2) * 0.026,
      0.008,
    );
    ovaryCutaway.add(ovule);
  }
  head.add(ovaryCutaway);

  const fruitAnchor = new THREE.Group();
  fruitAnchor.name = `${options.id}-fruit-anchor`;
  fruitAnchor.position.y = -0.04;
  head.add(fruitAnchor);

  return {
    root,
    head,
    antherTarget,
    stigmaTarget,
    ovaryCutaway,
    petalGroup,
    fruitAnchor,
  };
}

export function createBee(materials: PollinationBotanyMaterials) {
  const root = new THREE.Group();
  root.name = 'pollinator-bee';

  const abdomen = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 20, 14),
    materials.beeYellow,
  );
  abdomen.scale.set(0.9, 0.82, 1.55);
  abdomen.position.z = -0.055;
  abdomen.castShadow = true;
  root.add(abdomen);

  for (let index = 0; index < 3; index += 1) {
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.066, 0.008, 6, 24),
      materials.beeDark,
    );
    stripe.position.z = -0.12 + index * 0.06;
    stripe.rotation.x = Math.PI / 2;
    root.add(stripe);
  }

  const thorax = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 18, 12),
    materials.beeDark,
  );
  thorax.position.z = 0.075;
  thorax.scale.set(1.06, 1, 1.12);
  root.add(thorax);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 16, 12),
    materials.beeDark,
  );
  head.position.z = 0.17;
  root.add(head);

  const wings: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    for (const rear of [0, 1]) {
      const wing = new THREE.Mesh(
        new THREE.SphereGeometry(rear ? 0.052 : 0.07, 18, 10),
        materials.beeWing,
      );
      wing.name = 'bee-wing';
      wing.scale.set(rear ? 1.8 : 2.2, 0.035, rear ? 0.82 : 1);
      wing.position.set(side * (rear ? 0.07 : 0.095), 0.05, rear ? -0.005 : 0.055);
      wing.rotation.z = side * (rear ? 0.4 : 0.25);
      root.add(wing);
      wings.push(wing);
    }
  }

  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.004, 0.14, 5),
        materials.beeDark,
      );
      leg.position.set(side * 0.075, -0.065, 0.09 - index * 0.07);
      leg.rotation.z = side * 0.85;
      root.add(leg);
    }
  }

  return { root, wings };
}

export function createFruitAndSeed(materials: PollinationBotanyMaterials) {
  const root = new THREE.Group();
  root.name = 'fruit-and-seed';
  const halves = new THREE.Group();
  halves.name = 'fruit-halves';
  for (const side of [-1, 1]) {
    const skin = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI),
      materials.fruitSkin,
    );
    skin.scale.set(0.8, 1, 0.72);
    skin.position.x = side * 0.085;
    skin.rotation.y = side * Math.PI / 2;
    skin.castShadow = true;
    const flesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 24),
      materials.fruitFlesh,
    );
    flesh.position.set(side * 0.082, 0, 0);
    flesh.rotation.y = side * Math.PI / 2;
    halves.add(skin, flesh);
  }
  root.add(halves);

  const seeds = new THREE.Group();
  seeds.name = 'selectable-seeds';
  for (let index = 0; index < 8; index += 1) {
    const seed = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 8),
      materials.seed,
    );
    seed.scale.set(0.65, 1, 0.48);
    seed.position.set(
      (index % 2 ? 1 : -1) * 0.035,
      -0.07 + Math.floor(index / 2) * 0.04,
      0.01,
    );
    seed.name = index === 0 ? 'plantable-seed' : `fruit-seed-${index + 1}`;
    seeds.add(seed);
  }
  root.add(seeds);
  return { root, halves, seeds, plantableSeed: seeds.children[0] };
}

export function createGerminationSpecimen(
  materials: PollinationBotanyMaterials,
) {
  const root = new THREE.Group();
  root.name = 'germination-specimen';
  const seed = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 18, 12),
    materials.seed,
  );
  seed.name = 'planted-seed';
  seed.scale.set(0.7, 1, 0.55);
  root.add(seed);

  const rootCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.03, 0),
    new THREE.Vector3(0.01, -0.13, 0),
    new THREE.Vector3(-0.03, -0.28, 0.015),
    new THREE.Vector3(0.02, -0.46, 0),
  ]);
  const radicle = new THREE.Mesh(
    new THREE.TubeGeometry(rootCurve, 24, 0.012, 8, false),
    materials.root,
  );
  radicle.name = 'radicle';
  root.add(radicle);

  const shootCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(-0.025, 0.12, 0),
    new THREE.Vector3(0.02, 0.24, 0),
    new THREE.Vector3(0, 0.38, 0),
  ]);
  const plumule = new THREE.Mesh(
    new THREE.TubeGeometry(shootCurve, 20, 0.014, 8, false),
    materials.stem,
  );
  plumule.name = 'plumule';
  root.add(plumule);

  const firstLeaves = new THREE.Group();
  firstLeaves.name = 'first-leaves';
  firstLeaves.position.y = 0.36;
  for (const side of [-1, 1]) {
    const leaf = createLeaf(materials.leaf, 0.32);
    leaf.position.x = side * 0.02;
    leaf.rotation.y = side * 0.65;
    firstLeaves.add(leaf);
  }
  root.add(firstLeaves);
  return { root, seed, radicle, plumule, firstLeaves };
}
