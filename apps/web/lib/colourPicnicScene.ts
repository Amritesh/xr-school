import * as THREE from "three";
import type { PicnicState } from "./colourPicnicLesson";

const COLOURS = { red: 0xc93730, blue: 0x317bd0, yellow: 0xf5ca43 };
type Colour = keyof typeof COLOURS;

/** A small, authored garden set. Every important prop is genuine, raycastable geometry. */
export function createColourPicnicScene(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "colour-picnic-garden";
  scene.add(root);
  const targets = new Map<string, THREE.Object3D>();
  const resources = new Set<THREE.Texture>();
  const material = (colour: THREE.ColorRepresentation, roughness = 0.75) =>
    new THREE.MeshStandardMaterial({ color: colour, roughness });
  const wood = material(0xb88954);
  const wicker = material(0xbf965e);
  const wickerLight = material(0xd4ae72);
  const cream = material(0xfffaf0, 0.24);
  const green = material(0x467a38);
  const brown = material(0x775137);
  const add = (
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const group = (name: string, x = 0, y = 0, z = 0) => {
    const value = new THREE.Group();
    value.name = name;
    value.position.set(x, y, z);
    root.add(value);
    return value;
  };
  const target = (id: string, object: THREE.Object3D) => {
    targets.set(id, object);
    object.traverse((child) => {
      child.userData.targetId = id;
      child.userData.actionId = id;
    });
    return object;
  };
  const canvasTexture = (
    kind: "wood" | "grass" | "cloth" | "apple",
    tint: string,
  ) => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 512, 512);
    if (kind === "cloth") {
      ctx.fillStyle = "rgba(184,81,61,.28)";
      for (let n = 0; n < 512; n += 64) {
        ctx.fillRect(n, 0, 32, 512);
        ctx.fillRect(0, n, 512, 32);
      }
      ctx.strokeStyle = "rgba(245,226,202,.28)";
      for (let n = 0; n < 512; n += 3) {
        ctx.beginPath();
        ctx.moveTo(n, 0);
        ctx.lineTo(n, 512);
        ctx.stroke();
      }
    } else {
      for (let n = 0; n < 1600; n++) {
        const x = (n * 127.7) % 512,
          y = (n * 73.31) % 512;
        ctx.fillStyle =
          n % 3 === 0 ? "rgba(255,240,190,.12)" : "rgba(51,44,20,.09)";
        ctx.fillRect(
          x,
          y,
          kind === "wood" ? 40 + (n % 90) : kind === "grass" ? 4 : 1,
          kind === "wood" ? 0.6 : kind === "grass" ? 8 : 1,
        );
      }
      if (kind === "wood") {
        ctx.strokeStyle = "rgba(66,36,11,.10)";
        for (let n = 0; n < 35; n++) {
          ctx.beginPath();
          ctx.ellipse(
            160 + (n % 3),
            140,
            8 + n * 9,
            2 + n * 1.4,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    resources.add(texture);
    return texture;
  };
  wood.map = canvasTexture("wood", "#bc9466");
  wood.color.set(0xffffff);
  const grass = material(0x768948);
  grass.map = canvasTexture("grass", "#798c4e");
  if (grass.map) {
    grass.color.set(0xffffff);
    grass.map.repeat.set(6, 6);
  }
  const ground = add(
    new THREE.CircleGeometry(4.2, 96),
    grass,
    root,
    0,
    -0.012,
    0,
  );
  ground.rotation.x = -Math.PI / 2;
  const clothMat = material(0xf4e2c8);
  clothMat.map = canvasTexture("cloth", "#f5e8d5");
  if (clothMat.map) {
    clothMat.color.set(0xffffff);
    clothMat.map.repeat.set(3, 2);
  }
  const cloth = add(
    new THREE.PlaneGeometry(3.1, 2.25, 12, 12),
    clothMat,
    root,
    0,
    0.014,
    0.28,
  );
  cloth.rotation.x = -Math.PI / 2;
  cloth.rotation.z = -0.06;
  const clothPos = cloth.geometry.attributes.position;
  for (let i = 0; i < clothPos.count; i++)
    clothPos.setZ(
      i,
      Math.sin(clothPos.getX(i) * 13) * Math.cos(clothPos.getY(i) * 9) * 0.008,
    );
  cloth.geometry.computeVertexNormals();

  const table = group("low-oak-picnic-table");
  for (let n = 0; n < 5; n++)
    add(
      new THREE.BoxGeometry(2.5, 0.085, 0.224),
      wood,
      table,
      0,
      0.855,
      (n - 2) * 0.232,
    );
  for (const x of [-0.9, 0.9])
    for (const z of [-0.35, 0.35]) {
      const leg = add(
        new THREE.BoxGeometry(0.09, 0.81, 0.09),
        wood,
        table,
        x,
        0.405,
        z,
      );
      leg.rotation.z = -x * 0.1;
    }
  for (const z of [-0.37, 0.37])
    add(new THREE.BoxGeometry(2.1, 0.1, 0.055), wood, table, 0, 0.65, z);
  add(new THREE.BoxGeometry(1.96, 0.065, 0.08), wood, table, 0, 0.24, 0);

  const key = new THREE.DirectionalLight(0xfff1d8, 3);
  key.position.set(-3, 6, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  root.add(key);
  root.add(new THREE.HemisphereLight(0xeaf3ff, 0x84916b, 1.65));

  // Open, woven basket: hoops and upright strands share two instanced draws.
  const basket = group("woven-picnic-basket", 0.78, 0.901, -0.09);
  const hoopGeom = new THREE.TorusGeometry(0.27, 0.009, 5, 72);
  const hoops = new THREE.InstancedMesh(hoopGeom, wicker, 16);
  basket.add(hoops);
  const transform = new THREE.Object3D();
  for (let n = 0; n < 16; n++) {
    const y = 0.018 + n * 0.018;
    const r = 0.8 + n * 0.015;
    transform.position.set(0, y, 0);
    transform.rotation.set(Math.PI / 2, 0, 0);
    transform.scale.set(r, r * 0.81, 1);
    transform.updateMatrix();
    hoops.setMatrixAt(n, transform.matrix);
  }
  hoops.castShadow = true;
  hoops.receiveShadow = true;
  const ribs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.29, 5),
    wickerLight,
    48,
  );
  basket.add(ribs);
  for (let n = 0; n < 48; n++) {
    const a = (n / 48) * Math.PI * 2;
    transform.position.set(Math.cos(a) * 0.247, 0.145, Math.sin(a) * 0.2);
    transform.rotation.set(-Math.sin(a) * 0.12, 0, Math.cos(a) * -0.12);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    ribs.setMatrixAt(n, transform.matrix);
  }
  ribs.castShadow = true;
  add(
    new THREE.CylinderGeometry(0.219, 0.219, 0.022, 48),
    wicker,
    basket,
    0,
    0.015,
  ).scale.z = 0.8;
  const rim = add(
    new THREE.TorusGeometry(0.283, 0.016, 8, 72),
    wickerLight,
    basket,
    0,
    0.292,
  );
  rim.rotation.x = Math.PI / 2;
  rim.scale.y = 0.81;
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.265, 0.23, 0),
    new THREE.Vector3(-0.25, 0.52, 0),
    new THREE.Vector3(0, 0.63, 0),
    new THREE.Vector3(0.25, 0.52, 0),
    new THREE.Vector3(0.265, 0.23, 0),
  ]);
  add(
    new THREE.TubeGeometry(handleCurve, 40, 0.017, 7, false),
    wickerLight,
    basket,
  );
  const basketHit = add(
    new THREE.CylinderGeometry(0.31, 0.25, 0.43, 24),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    basket,
    0,
    0.22,
  );
  basketHit.castShadow = false;
  basketHit.receiveShadow = false;
  target("basket", basket);

  function appleSkin(radius: number) {
    const points: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const w = 40,
      h = 24;
    for (let j = 0; j <= h; j++)
      for (let i = 0; i <= w; i++) {
        const theta = (i / w) * Math.PI * 2,
          phi = (j / h) * Math.PI;
        const r =
          radius *
          Math.sin(phi) *
          (1 + 0.045 * Math.cos(theta * 5) * Math.sin(phi)) *
          (1 + 0.12 * Math.cos(phi));
        points.push(
          r * Math.cos(theta),
          radius * 0.99 * Math.cos(phi) -
            radius * 0.14 * Math.exp(-Math.pow(phi / 0.3, 2)),
          r * Math.sin(theta),
        );
        uv.push(i / w, j / h);
        if (i < w && j < h) {
          const a = j * (w + 1) + i;
          indices.push(a, a + w + 1, a + 1, a + 1, a + w + 1, a + w + 2);
        }
      }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }
  const homes = new Map<string, THREE.Vector3>();
  for (const [id, x, z, colour] of [
    ["red-apple", -0.76, 0.26, 0xc72e24],
    ["green-apple", -0.4, 0.2, 0x84ac39],
  ] as const) {
    const fruit = group(id, x, 1.052, z);
    const skin = material(colour, 0.36);
    skin.map = canvasTexture(
      "apple",
      id === "red-apple" ? "#bd3025" : "#93b54b",
    );
    if (skin.map) skin.color.set(0xffffff);
    add(appleSkin(0.15), skin, fruit);
    const stem = add(
      new THREE.CylinderGeometry(0.008, 0.013, 0.075, 7),
      brown,
      fruit,
      0.007,
      0.153,
    );
    stem.rotation.z = -0.24;
    const leaf = add(
      new THREE.SphereGeometry(0.045, 12, 8),
      green,
      fruit,
      0.05,
      0.173,
    );
    leaf.scale.set(1.45, 0.14, 0.58);
    leaf.rotation.z = 0.4;
    target(id, fruit);
    homes.set(id, fruit.position.clone());
  }
  const banana = group("banana", -0.65, 0.982, -0.19);
  const bananaCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.2, 0.09, 0),
    new THREE.Vector3(0, -0.16, 0.025),
    new THREE.Vector3(0.2, 0.1, 0),
  );
  const bananaGeom = new THREE.TubeGeometry(bananaCurve, 32, 0.048, 10, false);
  const bp = bananaGeom.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const segment = Math.floor(i / 11),
      t = segment / 32,
      centre = bananaCurve.getPointAt(t);
    const taper = 0.43 + 0.57 * Math.sin(t * Math.PI) ** 0.45;
    bp.setXYZ(
      i,
      centre.x + (bp.getX(i) - centre.x) * taper,
      centre.y + (bp.getY(i) - centre.y) * taper,
      centre.z + (bp.getZ(i) - centre.z) * taper,
    );
  }
  bananaGeom.computeVertexNormals();
  add(bananaGeom, material(0xedc341, 0.6), banana);
  for (const t of [0, 1]) {
    const p = bananaCurve.getPoint(t);
    add(
      new THREE.SphereGeometry(0.024, 8, 6),
      brown,
      banana,
      p.x,
      p.y,
      p.z,
    ).scale.y = 0.6;
  }
  banana.rotation.y = -0.17;
  target("banana", banana);
  homes.set("banana", banana.position.clone());

  // Hollow ceramic wall, inner glaze, rolled rim and a true loop handle.
  const cup = group("ceramic-cup", 0.14, 0.902, 0.26);
  const profile = [
    new THREE.Vector2(0.118, 0),
    new THREE.Vector2(0.139, 0.022),
    new THREE.Vector2(0.159, 0.29),
    new THREE.Vector2(0.157, 0.312),
    new THREE.Vector2(0.14, 0.312),
    new THREE.Vector2(0.137, 0.29),
    new THREE.Vector2(0.119, 0.045),
    new THREE.Vector2(0, 0.045),
    new THREE.Vector2(0, 0),
  ];
  add(new THREE.LatheGeometry(profile, 64), cream, cup);
  const cupRim = add(
    new THREE.TorusGeometry(0.149, 0.009, 10, 64),
    cream,
    cup,
    0,
    0.309,
  );
  cupRim.rotation.x = Math.PI / 2;
  const handle = add(
    new THREE.TorusGeometry(0.092, 0.025, 12, 40, Math.PI * 1.65),
    cream,
    cup,
    0.176,
    0.172,
  );
  handle.rotation.z = -Math.PI * 0.825;
  handle.scale.x = 0.85;
  function cupPatch(u0: number, v0: number, u1: number, v1: number, inset = 0) {
    const positions: number[] = [],
      uvs: number[] = [],
      index: number[] = [],
      cols = 12,
      rows = 4;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const u = u0 + ((u1 - u0) * i) / cols,
          v = v0 + ((v1 - v0) * j) / rows;
        const a = (u - 0.5) * Math.PI * 0.96;
        const y = 0.041 + v * 0.249;
        const r = 0.139 + ((y - 0.022) / 0.268) * 0.02 + inset;
        positions.push(Math.sin(a) * r, y, Math.cos(a) * r);
        uvs.push(u, v);
        if (i < cols && j < rows) {
          const k = j * (cols + 1) + i;
          index.push(k, k + 1, k + cols + 1, k + 1, k + cols + 2, k + cols + 1);
        }
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    return geometry;
  }
  const cupPaintSurface = add(
    cupPatch(0, 0, 1, 1, 0.0004),
    new THREE.MeshStandardMaterial({
      color: 0xfffaf0,
      roughness: 0.25,
      side: THREE.DoubleSide,
    }),
    cup,
  );
  cupPaintSurface.name = "cup-paint-surface-6x4";
  const paintMaterials = Object.fromEntries(
    Object.entries(COLOURS).map(([id, colour]) => [
      id,
      new THREE.MeshStandardMaterial({
        color: colour,
        roughness: 0.4,
        side: THREE.DoubleSide,
      }),
    ]),
  ) as Record<Colour, THREE.MeshStandardMaterial>;
  const patches: THREE.Mesh[] = [];
  for (let n = 0; n < 24; n++) {
    const col = n % 6,
      row = Math.floor(n / 6);
    const patch = add(
      cupPatch(col / 6, row / 4, (col + 1) / 6, (row + 1) / 4, 0.0012),
      paintMaterials.blue,
      cup,
    );
    patch.visible = false;
    patch.name = `cup-paint-cell-${n}`;
    patches.push(patch);
  }
  target("cup", cup);
  const paintPots: THREE.Group[] = [];
  for (const [i, colour] of (["red", "blue", "yellow"] as Colour[]).entries()) {
    const pot = group(`paint-${colour}`, -0.86 + i * 0.28, 0.906, 0.2);
    add(
      new THREE.CylinderGeometry(0.089, 0.074, 0.095, 32, 1, true),
      cream,
      pot,
      0,
      0.047,
    );
    add(
      new THREE.CylinderGeometry(0.08, 0.08, 0.007, 32),
      paintMaterials[colour],
      pot,
      0,
      0.088,
    );
    const potRim = add(
      new THREE.TorusGeometry(0.086, 0.006, 6, 32),
      cream,
      pot,
      0,
      0.095,
    );
    potRim.rotation.x = Math.PI / 2;
    target(`paint-${colour}`, pot);
    paintPots.push(pot);
    pot.visible = false;
  }
  const brush = group("wooden-paintbrush", -0.13, 0.925, 0.48);
  add(new THREE.CylinderGeometry(0.011, 0.017, 0.25, 10), wood, brush, 0, 0.12);
  add(
    new THREE.CylinderGeometry(0.018, 0.018, 0.057, 10),
    material(0xabb7b7, 0.3),
    brush,
    0,
    -0.024,
  );
  const bristles = add(
    new THREE.BoxGeometry(0.035, 0.069, 0.025),
    material(0xd3b582),
    brush,
    0,
    -0.077,
  );
  brush.rotation.set(Math.PI / 2, 0, -0.65);
  target("brush", brush);
  brush.visible = false;
  const brushHome = brush.position.clone();

  const stand = group("flag-stand", -0.81, 0.902, -0.23);
  add(
    new THREE.CylinderGeometry(0.102, 0.13, 0.035, 32),
    wood,
    stand,
    0,
    0.017,
  );
  add(
    new THREE.CylinderGeometry(0.027, 0.034, 0.038, 16),
    brown,
    stand,
    0,
    0.052,
  );
  target("flag-stand", stand);
  const flags: THREE.Group[] = [];
  function flag(colour: Colour, x: number, z: number) {
    const value = group(`flag-${colour}`, x, 0.918, z);
    add(new THREE.CylinderGeometry(0.007, 0.01, 0.46, 8), wood, value, 0, 0.23);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.235, -0.052);
    shape.lineTo(0, -0.14);
    shape.closePath();
    const fabric = add(
      new THREE.ShapeGeometry(shape, 12),
      new THREE.MeshStandardMaterial({
        color: COLOURS[colour],
        roughness: 1,
        side: THREE.DoubleSide,
      }),
      value,
      0.004,
      0.455,
      0,
    );
    fabric.name = "cloth-pennant";
    target(`flag-${colour}`, value);
    value.visible = false;
    flags.push(value);
    return value;
  }
  (Object.keys(COLOURS) as Colour[]).forEach((colour, i) =>
    flag(colour, -0.75 + i * 0.28, 0.28),
  );

  // A recognisable small robin, perched at the table edge.
  const bird = group("robin-guide", -1.33, 1.04, -0.3);
  const plumage = material(0x8c6c48);
  const breastMat = material(0xd97340);
  const body = add(
    new THREE.SphereGeometry(0.09, 20, 14),
    plumage,
    bird,
    0,
    0.06,
  );
  body.scale.set(0.85, 1.06, 1);
  const breast = add(
    new THREE.SphereGeometry(0.067, 18, 12),
    breastMat,
    bird,
    0,
    0.065,
    0.053,
  );
  breast.scale.z = 0.55;
  add(new THREE.SphereGeometry(0.06, 20, 14), plumage, bird, 0, 0.154, 0.025);
  const beak = add(
    new THREE.ConeGeometry(0.015, 0.049, 8),
    material(0x665543),
    bird,
    0,
    0.151,
    0.091,
  );
  beak.rotation.x = Math.PI / 2;
  for (const x of [-0.035, 0.035])
    add(
      new THREE.SphereGeometry(0.008, 10, 8),
      material(0x19180f, 0.2),
      bird,
      x,
      0.17,
      0.068,
    );
  for (const x of [-0.054, 0.054]) {
    const wing = add(
      new THREE.SphereGeometry(0.062, 12, 8),
      material(0x705c44),
      bird,
      x,
      0.07,
      -0.015,
    );
    wing.scale.set(0.3, 0.75, 1.3);
    wing.rotation.x = 0.3;
  }
  const tail = add(
    new THREE.ConeGeometry(0.035, 0.13, 5),
    plumage,
    bird,
    0,
    0.028,
    -0.12,
  );
  tail.rotation.x = -1.1;
  for (const x of [-0.026, 0.026])
    add(
      new THREE.CylinderGeometry(0.004, 0.005, 0.055, 6),
      brown,
      bird,
      x,
      -0.02,
      0.018,
    );
  target("bird", bird);

  // Sparse foreground parallax plants leave the photographic garden unobstructed.
  const leafGeometry = new THREE.SphereGeometry(1, 6, 4);
  const leaves = new THREE.InstancedMesh(leafGeometry, green, 144);
  root.add(leaves);
  for (let i = 0; i < 144; i++) {
    const side = i % 2 ? -1 : 1;
    const n = Math.floor(i / 2);
    transform.position.set(
      side * (1.7 + 0.42 * Math.sin(n * 1.71)),
      0.12 + 0.12 * (1 + Math.sin(n * 2.13)),
      -0.5 + (n % 12) * 0.17,
    );
    transform.rotation.set(n, n * 0.71, n * 0.32);
    transform.scale.set(0.12, 0.014, 0.034);
    transform.updateMatrix();
    leaves.setMatrixAt(i, transform.matrix);
  }
  leaves.castShadow = true;
  const petals = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 6, 4),
    material(0xf7efdc),
    150,
  );
  root.add(petals);
  const centres = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.023, 8, 6),
    material(0xe9bc45),
    30,
  );
  root.add(centres);
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.003, 0.004, 0.28, 5),
    green,
    30,
  );
  root.add(stems);
  for (let i = 0; i < 30; i++) {
    const x = (i % 2 ? -1 : 1) * (1.75 + 0.3 * Math.sin(i * 4.5)),
      z = -0.7 + (i % 9) * 0.19,
      y = 0.24 + 0.1 * Math.sin(i * 1.7);
    transform.position.set(x, y, z);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(1, 0.45, 1);
    transform.updateMatrix();
    centres.setMatrixAt(i, transform.matrix);
    transform.position.y = y / 2;
    transform.scale.set(1, y / 0.28, 1);
    transform.updateMatrix();
    stems.setMatrixAt(i, transform.matrix);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      transform.position.set(x + Math.cos(a) * 0.03, y, z + Math.sin(a) * 0.03);
      transform.rotation.set(0, -a, 0);
      transform.scale.set(0.037, 0.006, 0.016);
      transform.updateMatrix();
      petals.setMatrixAt(i * 5 + p, transform.matrix);
    }
  }

  let current: PicnicState | null = null;
  let heldPoint: THREE.Vector3 | null = null;
  let lastHeld: string | null = null;
  function update(state: PicnicState, delta: number, elapsed: number) {
    current = state;
    if (lastHeld !== state.heldFruit) heldPoint = null;
    lastHeld = state.heldFruit;
    for (const [id, home] of homes) {
      const fruit = targets.get(id)!;
      fruit.visible =
        state.phase === "welcome" ||
        state.phase === "fruit" ||
        (id === "red-apple" && state.packedFruit);
      if (id === "red-apple" && state.packedFruit) {
        fruit.position.set(0.78, 1.066, -0.09);
        fruit.rotation.set(0.08, 0.25, -0.2);
      } else if (state.heldFruit === id) {
        fruit.visible = true;
        fruit.position.copy(heldPoint ?? new THREE.Vector3(-0.2, 1.33, 0.62));
        fruit.rotation.y += Math.min(delta, 0.05) * 0.35;
      } else {
        fruit.position.copy(home);
        fruit.rotation.set(0, id === "banana" ? -0.17 : 0, 0);
      }
    }
    paintPots.forEach((p) => {
      p.visible = state.phase === "paint";
    });
    brush.visible = state.phase === "paint";
    if (!brush.userData.manipulating) {
      brush.position.copy(brushHome);
      brush.rotation.set(Math.PI / 2, 0, -0.65);
    }
    (bristles.material as THREE.MeshStandardMaterial).color.set(
      state.brushColour ? COLOURS[state.brushColour] : 0xd3b582,
    );
    const paintColours = (
      state as PicnicState & { paintColours?: Record<number, Colour> }
    ).paintColours;
    patches.forEach((patch, i) => {
      const colour =
        paintColours?.[i] ?? (state.paintedCells.includes(i) ? "blue" : null);
      patch.visible = !!colour;
      if (colour) patch.material = paintMaterials[colour];
    });
    flags.forEach((value, i) => {
      const colour = (Object.keys(COLOURS) as Colour[])[i];
      const planted = state.plantedFlag && state.flagColour === colour;
      value.visible = state.phase === "decorate" || planted;
      if (planted) {
        value.position.set(stand.position.x, 0.952, stand.position.z);
        value.rotation.set(
          0,
          Math.sin(elapsed * 1.6) * 0.07,
          Math.sin(elapsed * 1.1) * 0.017,
        );
      } else {
        value.position.set(-0.75 + i * 0.28, 0.918, 0.28);
        value.rotation.set(0, -0.12, 0);
      }
    });
    bird.rotation.y = Math.sin(elapsed * 0.63) * 0.13;
    bird.position.y = 1.04 + Math.sin(elapsed * 2.2) * 0.003;
    root.updateMatrixWorld(true);
  }
  function setHeldPosition(worldPoint: THREE.Vector3) {
    heldPoint = root.worldToLocal(worldPoint.clone());
    if (current?.heldFruit)
      targets.get(current.heldFruit)!.position.copy(heldPoint);
  }
  function resetHeldPosition() {
    heldPoint = null;
  }
  function getFrame(phase: PicnicState["phase"]) {
    if (phase === "paint")
      return {
        position: new THREE.Vector3(0.1, 1.98, 2.63),
        target: new THREE.Vector3(-0.17, 0.96, 0.04),
      };
    if (phase === "decorate")
      return {
        position: new THREE.Vector3(-0.13, 2.1, 2.94),
        target: new THREE.Vector3(-0.14, 1.0, 0.01),
      };
    return {
      position: new THREE.Vector3(0, 2.22, 3.55),
      target: new THREE.Vector3(0, 0.91, -0.04),
    };
  }
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((mat) => materials.add(mat));
      }
      if (object instanceof THREE.Light && "shadow" in object)
        (object as THREE.DirectionalLight).shadow?.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
    resources.forEach((texture) => texture.dispose());
    scene.remove(root);
  }
  return {
    root,
    targets,
    cupPaintSurface,
    update,
    setHeldPosition,
    resetHeldPosition,
    getFrame,
    dispose,
  };
}
