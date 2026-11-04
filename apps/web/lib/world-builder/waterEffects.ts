import * as THREE from 'three';

const MUDDY_WATER = 0x8f5e2a;
const GRAVITY = 9.8;

function createStreakTexture() {
  // A small repeating alpha pattern: reads as moving water when scrolled.
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const streak = (x + y * 3) % 8 < 3 ? 255 : 170;
      data[offset] = streak;
      data[offset + 1] = streak;
      data[offset + 2] = 255;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Water running along a path, using a scrolling texture rather than a fluid solver. */
export function createFlowRibbon(
  curve: THREE.Curve<THREE.Vector3>,
  {
    width,
    color,
    reducedMotion = false,
  }: { width: number; color: THREE.ColorRepresentation; reducedMotion?: boolean },
) {
  const texture = createStreakTexture();
  texture.repeat.set(curve.getLength() * 2, 1);
  const base = new THREE.Color(color);
  const material = new THREE.MeshBasicMaterial({
    color: base.clone(),
    map: texture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const geometry = new THREE.TubeGeometry(curve, 16, width / 2, 5, false);
  const object = new THREE.Mesh(geometry, material);
  object.visible = false;
  let flow = 0;

  return {
    object,
    setFlow(value: number) {
      flow = THREE.MathUtils.clamp(value, 0, 1);
      object.visible = flow > 0;
      material.opacity = 0.4 + flow * 0.45;
    },
    setClarity(value: number) {
      const clarity = THREE.MathUtils.clamp(value, 0, 1);
      material.color.copy(base).lerp(new THREE.Color(MUDDY_WATER), 1 - clarity);
    },
    update(dt: number) {
      if (!reducedMotion && flow > 0) texture.offset.x -= dt * (0.6 + flow);
    },
    scrollOffset: () => texture.offset.x,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

/** Falling drops in one instanced draw call. */
export function createDropletPool({
  max,
  reducedMotion = false,
}: {
  max: number;
  reducedMotion?: boolean;
}) {
  const geometry = new THREE.IcosahedronGeometry(0.02, 0).scale(0.6, 3, 0.6);
  const material = new THREE.MeshBasicMaterial({ color: 0xa8dcff });
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const positions = Array.from({ length: max }, () => new THREE.Vector3());
  const velocities = Array.from({ length: max }, () => new THREE.Vector3());
  const matrix = new THREE.Matrix4();
  let live = 0;
  let oldest = 0;

  function write(index: number) {
    matrix.setPosition(positions[index]!);
    mesh.setMatrixAt(index, matrix);
  }

  return {
    mesh,
    liveCount: () => live,
    emit(position: THREE.Vector3, velocity: THREE.Vector3) {
      if (reducedMotion) return;
      let index: number;
      if (live < max) {
        index = live;
        live += 1;
      } else {
        index = oldest;
        oldest = (oldest + 1) % max;
      }
      positions[index]!.copy(position);
      velocities[index]!.copy(velocity);
      write(index);
      mesh.count = live;
      mesh.instanceMatrix.needsUpdate = true;
    },
    update(dt: number) {
      for (let index = 0; index < live; ) {
        velocities[index]!.y -= GRAVITY * dt;
        positions[index]!.addScaledVector(velocities[index]!, dt);
        if (positions[index]!.y < 0) {
          live -= 1;
          positions[index]!.copy(positions[live]!);
          velocities[index]!.copy(velocities[live]!);
        } else {
          write(index);
          index += 1;
        }
      }
      mesh.count = live;
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

/** A tank or pond whose level and cleanliness can change. Origin is at the base. */
export function createFillVolume({
  radius,
  height,
  color,
}: {
  radius: number;
  height: number;
  color: THREE.ColorRepresentation;
}) {
  const base = new THREE.Color(color);
  const muddy = new THREE.Color(MUDDY_WATER);
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
  geometry.translate(0, height / 2, 0);
  const material = new THREE.MeshStandardMaterial({
    color: base.clone(),
    roughness: 0.25,
    transparent: true,
    opacity: 0.7,
  });
  const object = new THREE.Mesh(geometry, material);
  let level = 0;
  object.visible = false;
  object.scale.y = 0.0001;

  return {
    object,
    material,
    fill: () => level,
    setFill(value: number) {
      level = THREE.MathUtils.clamp(value, 0, 1);
      object.visible = level > 0;
      object.scale.y = Math.max(level, 0.0001);
    },
    setClarity(value: number) {
      const clarity = THREE.MathUtils.clamp(value, 0, 1);
      material.color.copy(base).lerp(muddy, 1 - clarity);
      material.opacity = 0.95 - clarity * 0.25;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
