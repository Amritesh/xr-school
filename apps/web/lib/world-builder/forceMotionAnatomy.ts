import * as THREE from 'three';

export interface ForceMotionMaterials {
  track: THREE.Material;
  ball: THREE.Material;
  shapeBall: THREE.Material;
  paddle: THREE.Material;
  pushControl: THREE.Material;
  brakeControl: THREE.Material;
  accelerateControl: THREE.Material;
  deflectControl: THREE.Material;
  shapeControl: THREE.Material;
  board: THREE.Material;
}

export function createTrack(material: THREE.Material) {
  const track = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 2.8), material);
  track.name = 'track';
  track.position.set(0, -0.02, 0.35);
  track.receiveShadow = true;
  return track;
}

export function createMotionBall(material: THREE.Material) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 18), material);
  ball.name = 'motion-ball';
  ball.castShadow = true;
  ball.receiveShadow = true;
  return ball;
}

export function createPedestal(material: THREE.Material) {
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 20), material);
  pedestal.name = 'shape-pedestal';
  pedestal.receiveShadow = true;
  return pedestal;
}

export interface ShapeRig {
  root: THREE.Group;
  ball: THREE.Mesh;
  topPaddle: THREE.Mesh;
  bottomPaddle: THREE.Mesh;
}

/** A squeezable ball flanked by two plates that visibly close in on it. */
export function createShapeRig(ballMaterial: THREE.Material, paddleMaterial: THREE.Material): ShapeRig {
  const root = new THREE.Group();
  root.name = 'shape-rig';

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 18), ballMaterial);
  ball.name = 'shape-ball';
  ball.castShadow = true;
  root.add(ball);

  const topPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), paddleMaterial);
  topPaddle.name = 'shape-paddle-top';
  topPaddle.castShadow = true;
  root.add(topPaddle);

  const bottomPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), paddleMaterial);
  bottomPaddle.name = 'shape-paddle-bottom';
  bottomPaddle.castShadow = true;
  root.add(bottomPaddle);

  return { root, ball, topPaddle, bottomPaddle };
}

type ArrowDirection = 'forward' | 'backward' | 'up' | 'side';

function arrowGeometry() {
  return new THREE.ConeGeometry(0.055, 0.14, 16);
}

/** A directional arrow-and-shaft control the learner clicks to apply a
 * specific force. Direction only affects the cone's resting orientation —
 * the object itself does not move. */
export function createForceControl(name: string, direction: ArrowDirection, material: THREE.Material) {
  const group = new THREE.Group();
  group.name = name;

  const head = new THREE.Mesh(arrowGeometry(), material);
  head.castShadow = true;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), material);

  if (direction === 'forward') {
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.09;
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.02;
  } else if (direction === 'backward') {
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.09;
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.02;
  } else if (direction === 'side') {
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.09;
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.02;
  } else {
    head.position.y = 0.09;
    shaft.position.y = 0.02;
  }

  group.add(head, shaft);
  return group;
}

/** A double chevron used specifically for the "accelerate" control so it
 * reads as distinct from the single push arrow. */
export function createAccelerateControl(material: THREE.Material) {
  const group = new THREE.Group();
  group.name = 'accelerate-control';
  for (const offset of [0, 0.09]) {
    const head = new THREE.Mesh(arrowGeometry(), material);
    head.rotation.x = Math.PI / 2;
    head.position.z = offset;
    head.castShadow = true;
    group.add(head);
  }
  return group;
}

export function createComparisonBoard(
  boardMaterial: THREE.Material,
  chipMaterials: THREE.Material[],
) {
  const board = new THREE.Group();
  board.name = 'comparison-board';

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.02), boardMaterial);
  panel.castShadow = true;
  board.add(panel);

  const columns = chipMaterials.length;
  chipMaterials.forEach((material, index) => {
    const chip = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), material);
    chip.position.set((index - (columns - 1) / 2) * 0.14, 0.02, 0.012);
    board.add(chip);
  });

  return board;
}
