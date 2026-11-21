import * as THREE from 'three';
import {
  FORCE_LAB,
  bounceOffWall,
  directionChangeDegrees,
  kickSpeed,
  racketHit,
  rampExitSpeed,
  sideTap,
  stepRoll,
  type Roller,
} from './forceLabPhysics';
import type { ForceLabAction, ForceLabSceneId, ForceLabState, Surface } from './forceLabLesson';
import { disposeObjectTree, type GlbAssetLoader } from './world-builder/glbAssets';
import { createStylizedLighting } from './world-builder/stylizedKit';

/**
 * The four Force and Motion scenes. Every scene is built around the origin
 * and only the current one is shown. The child stands near +Z looking at -Z.
 * Motion uses forceLabPhysics; the scene reports what happened as lesson actions.
 */

const MODELS = '/models/force-lab';
export type DragId = 'trolley' | 'wagon' | 'door';
type SceneGroupId = Exclude<ForceLabSceneId, 'quiz'>;

const TROLLEY = { start: new THREE.Vector3(-0.5, 0, 1.0), goal: new THREE.Vector3(-0.5, 0, -1.5) };
const WAGON = { start: new THREE.Vector3(0.8, 0, -1.6), goal: new THREE.Vector3(0.8, 0, 0.25) };
const DOOR_HINGE = new THREE.Vector3(-2.47, 0, 0.95);
const DOOR_HANDLE_RADIUS = 0.88;
const DOOR_OPEN = THREE.MathUtils.degToRad(80);
const DOOR_OPENED_AT = THREE.MathUtils.degToRad(70);
const DOOR_CLOSED_AT = THREE.MathUtils.degToRad(5);
const DRAG_DONE = 0.98;

const BALL_RADIUS = 0.11;
const BALL_HOME = new THREE.Vector3(0, BALL_RADIUS, 0.9);
const GOAL_LINE_Z = -3.2;

const TABLE_TOP = 0.7;
const RAMP_TOP = new THREE.Vector3(0, TABLE_TOP + 0.15, 1.02);
const LANE_START_Z = 0.55;
const LANE_X: Record<Surface, number> = { tile: -0.2, carpet: 0.2 };
const RAMP_SECONDS = 0.4;

const TENNIS_RADIUS = 0.034;
const WALL_Z = -2.5;
const THROW_FROM = new THREE.Vector3(0.1, TENNIS_RADIUS, 1.4);
const FEED_FROM = new THREE.Vector3(1.6, TENNIS_RADIUS, -1.0);
const RACKET_SPOT = new THREE.Vector3(0.3, TENNIS_RADIUS, 1.5);
const REACH = 0.45;
const SWING_SPEED = 4;

const ARROW_SECONDS = 0.8;

interface Focus {
  position: THREE.Vector3;
  target: THREE.Vector3;
}
const focus = (p: [number, number, number], t: [number, number, number]): Focus => ({
  position: new THREE.Vector3(...p),
  target: new THREE.Vector3(...t),
});
const FOCI: Record<ForceLabSceneId, Focus> = {
  store: focus([0.1, 1.6, 3.3], [0, 0.75, -0.6]),
  playground: focus([1.0, 1.55, 3.1], [0, 0.3, -1.0]),
  friction: focus([0.95, 1.45, 2.35], [0, 0.72, -0.35]),
  wall: focus([0.7, 1.6, 3.3], [0, 0.6, -0.9]),
  quiz: focus([0.7, 1.6, 3.3], [0, 0.6, -0.9]),
};
const VR_SPOTS: Record<ForceLabSceneId, THREE.Vector3> = {
  store: new THREE.Vector3(0, 0, 2.2),
  playground: new THREE.Vector3(0, 0, 2.2),
  friction: new THREE.Vector3(0, 0, 1.75),
  wall: new THREE.Vector3(0, 0, 2.3),
  quiz: new THREE.Vector3(0, 0, 2.3),
};

function flat(geometry: THREE.BufferGeometry, colour: number) {
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85 }));
}
function group(...children: THREE.Object3D[]) {
  const result = new THREE.Group();
  result.add(...children);
  return result;
}
const floorPlane = (size: number, colour: number) => {
  const mesh = flat(new THREE.PlaneGeometry(size, size), colour);
  mesh.rotation.x = -Math.PI / 2;
  return () => group(mesh);
};
const boxFallback = (x: number, y: number, z: number, colour: number, lift = true) => () => {
  const mesh = flat(new THREE.BoxGeometry(x, y, z), colour);
  if (lift) mesh.position.y = y / 2;
  return group(mesh);
};
const ballFallback = (radius: number, colour: number) => () => group(flat(new THREE.SphereGeometry(radius, 16, 12), colour));

function makeLabel(text: string, colour: string): THREE.Object3D {
  if (typeof document === 'undefined') return new THREE.Object3D();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Object3D();
  context.font = 'bold 72px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 10;
  context.strokeStyle = 'rgba(255,255,255,0.95)';
  context.strokeText(text, 128, 50);
  context.fillStyle = colour;
  context.fillText(text, 128, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(0.6, 0.225, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export async function createForceLabScene(
  scene: THREE.Scene,
  assets: GlbAssetLoader,
  {
    reducedMotion,
    onEvent,
    onDiagnostic,
  }: {
    reducedMotion: boolean;
    onEvent: (event: ForceLabAction) => void;
    onDiagnostic?: (message: string) => void;
  },
) {
  const root = new THREE.Group();
  root.name = 'force-lab';
  scene.add(root);
  const lighting = createStylizedLighting(scene, root);
  lighting.setMood('restored');

  const load = (name: string, fallback: () => THREE.Group) =>
    assets.loadOrFallback(`${MODELS}/${name}.glb`, fallback, onDiagnostic);
  const [
    storeRoom, trolley, wagon, door, playground, football, riya, classroom, toyCar, stopFlag,
    courtyard, tennisBall, racket,
  ] = await Promise.all([
    load('store-room', floorPlane(6, 0xe2dccd)),
    load('trolley', boxFallback(0.56, 1.0, 0.8, 0x2f6fd0)),
    load('wagon', boxFallback(0.5, 0.36, 0.75, 0xd93a2f)),
    load('door', () => {
      const leaf = flat(new THREE.BoxGeometry(0.05, 2, 1), 0xc89a63);
      leaf.position.set(0, 1, -0.5);
      return group(leaf);
    }),
    load('playground', floorPlane(28, 0x93be5a)),
    load('football', ballFallback(BALL_RADIUS, 0xf6f3ee)),
    load('riya', boxFallback(0.36, 1.6, 0.25, 0xfafafa)),
    load('classroom', () => {
      const table = flat(new THREE.BoxGeometry(1.3, 0.06, 3.6), 0xb98a57);
      table.position.set(0, TABLE_TOP - 0.03, -0.5);
      return group(floorPlane(9, 0xd8c9ae)(), table);
    }),
    load('toy-car', boxFallback(0.09, 0.1, 0.18, 0xd93a2f)),
    load('stop-flag', boxFallback(0.01, 0.3, 0.01, 0x333333)),
    load('courtyard', () => {
      const wall = flat(new THREE.BoxGeometry(6, 3, 0.3), 0xf2c8a0);
      wall.position.set(0, 1.5, WALL_Z - 0.15);
      return group(floorPlane(12, 0xd6cdbd)(), wall);
    }),
    load('tennis-ball', ballFallback(TENNIS_RADIUS, 0xd7e64a)),
    load('racket', boxFallback(0.24, 0.66, 0.03, 0x2e7dd1)),
  ]);

  const groups: Record<SceneGroupId, THREE.Group> = {
    store: group(storeRoom, trolley, wagon, door),
    playground: group(playground, football, riya),
    friction: group(classroom),
    wall: group(courtyard, tennisBall),
  };
  for (const [name, sceneGroup] of Object.entries(groups)) {
    sceneGroup.name = `scene-${name}`;
    root.add(sceneGroup);
  }
  for (const model of [storeRoom, classroom, courtyard]) {
    model.traverse(child => {
      child.receiveShadow = true;
    });
  }
  for (const model of [trolley, wagon, football, riya, toyCar, racket]) {
    model.traverse(child => {
      child.castShadow = true;
    });
  }

  // ---------------------------------------------------------------- store
  trolley.position.copy(TROLLEY.start);
  wagon.position.copy(WAGON.start);
  door.position.copy(DOOR_HINGE);
  const doorHandle = (angle: number) =>
    new THREE.Vector3(
      DOOR_HINGE.x + Math.sin(angle) * DOOR_HANDLE_RADIUS,
      1.0,
      DOOR_HINGE.z - Math.cos(angle) * DOOR_HANDLE_RADIUS,
    );
  const drag: Record<DragId, { t: number; done: boolean }> = {
    trolley: { t: 0, done: false },
    wagon: { t: 0, done: false },
    door: { t: 0, done: false },
  };
  let doorOpened = false;

  // ---------------------------------------------------------------- playground
  football.position.copy(BALL_HOME);
  riya.position.set(-0.55, 0, 1.15);
  riya.rotation.y = Math.PI;
  const riyaLeg = riya.getObjectByName('riya-leg');
  let ball: Roller | null = null;

  // ---------------------------------------------------------------- friction
  const cars: Record<Surface, THREE.Object3D> = { tile: toyCar, carpet: toyCar.clone() };
  const flags: Record<Surface, THREE.Object3D> = { tile: stopFlag, carpet: stopFlag.clone() };
  for (const surface of ['tile', 'carpet'] as const) {
    cars[surface].rotation.y = Math.PI;
    cars[surface].position.set(LANE_X[surface], TABLE_TOP + 0.15, RAMP_TOP.z);
    flags[surface].visible = false;
    groups.friction.add(cars[surface], flags[surface]);
  }
  const carRuns: Record<Surface, { roller: Roller | null; rampTime: number; reported: boolean }> = {
    tile: { roller: null, rampTime: 0, reported: true },
    carpet: { roller: null, rampTime: 0, reported: true },
  };

  // ---------------------------------------------------------------- wall
  tennisBall.position.copy(THROW_FROM);
  racket.position.set(0.55, 0.85, 1.75);
  racket.rotation.z = -0.4;
  groups.wall.add(racket);
  const courtRiya = riya.clone();
  courtRiya.position.set(-1.5, 0, 0.6);
  courtRiya.rotation.y = Math.PI * 0.9;
  groups.wall.add(courtRiya);
  let tennis: Roller | null = null;
  let tennisMode: 'thrown' | 'fed' | 'hit' | null = null;
  let bounceReported = false;

  // ---------------------------------------------------------------- evidence
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x2fd06b });
  const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 10).translate(0, 0.5, 0), arrowMaterial);
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 14).translate(0, 0.07, 0), arrowMaterial);
  const arrow = group(arrowShaft, arrowHead);
  arrow.visible = false;
  root.add(arrow);
  const pushLabel = makeLabel('PUSH', '#1d8f46');
  const pullLabel = makeLabel('PULL', '#b96d00');
  pushLabel.visible = false;
  pullLabel.visible = false;
  root.add(pushLabel, pullLabel);
  let arrowTimer = 0;
  const up = new THREE.Vector3(0, 1, 0);

  function showArrow(from: THREE.Vector3, direction: THREE.Vector3, length: number, colour: number, label?: 'push' | 'pull') {
    arrow.position.copy(from);
    arrow.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    arrowShaft.scale.set(1, Math.max(0.05, length - 0.14), 1);
    arrowHead.position.copy(up).multiplyScalar(Math.max(0.05, length - 0.14));
    arrowMaterial.color.setHex(colour);
    arrow.visible = true;
    pushLabel.visible = label === 'push';
    pullLabel.visible = label === 'pull';
    const labelAt = from.clone().addScaledVector(direction.clone().normalize(), length / 2).add(new THREE.Vector3(0, 0.18, 0));
    pushLabel.position.copy(labelAt);
    pullLabel.position.copy(labelAt);
    arrowTimer = ARROW_SECONDS;
  }

  const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const ghostGeometry = new THREE.SphereGeometry(1, 12, 8);
  const ghosts = Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(ghostGeometry, ghostMaterial);
    mesh.visible = false;
    root.add(mesh);
    return mesh;
  });
  let ghostIndex = 0;
  let ghostClock = 0;
  function dropGhost(position: THREE.Vector3, radius: number) {
    if (reducedMotion) return;
    const ghost = ghosts[ghostIndex % ghosts.length]!;
    ghostIndex += 1;
    ghost.position.copy(position);
    ghost.scale.setScalar(radius);
    ghost.visible = true;
  }
  const clearGhosts = () => ghosts.forEach(ghost => (ghost.visible = false));

  let state: ForceLabState | null = null;
  let current: ForceLabSceneId = 'store';
  let time = 0;
  let riyaKick = -1;

  function apply(next: ForceLabState) {
    state = next;
    if (next.scene !== current) {
      clearGhosts();
      arrow.visible = false;
      pushLabel.visible = false;
      pullLabel.visible = false;
    }
    current = next.scene;
    const visible: SceneGroupId = next.scene === 'quiz' ? 'wall' : next.scene;
    for (const [id, sceneGroup] of Object.entries(groups)) sceneGroup.visible = id === visible;
  }

  // ---------------------------------------------------------------- drags
  function dragStart(id: DragId): THREE.Vector3 {
    if (id === 'trolley') return TROLLEY.start.clone();
    if (id === 'wagon') return WAGON.start.clone();
    return doorHandle(0);
  }
  function dragGoal(id: DragId): THREE.Vector3 {
    if (id === 'trolley') return TROLLEY.goal.clone();
    if (id === 'wagon') return WAGON.goal.clone();
    return doorHandle(DOOR_OPEN);
  }
  /** Where to grab: the handle the child holds. */
  function handleOf(id: DragId): THREE.Object3D {
    if (id === 'trolley') return trolley;
    if (id === 'wagon') return wagon;
    return door;
  }

  /** Moves a dragged object as far as the pointer allows along its track. */
  function dragTo(id: DragId, point: THREE.Vector3) {
    if (current !== 'store') return;
    if (id === 'door') {
      const angle = THREE.MathUtils.clamp(
        Math.atan2(point.x - DOOR_HINGE.x, -(point.z - DOOR_HINGE.z)),
        0,
        DOOR_OPEN,
      );
      const opening = angle > -door.rotation.y;
      door.rotation.y = -angle;
      const handle = doorHandle(angle);
      const swing = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(opening ? 1 : -1);
      showArrow(handle, swing, 0.5, opening ? 0xf5a524 : 0x2fd06b, opening ? 'pull' : 'push');
      if (!doorOpened && angle >= DOOR_OPENED_AT) {
        doorOpened = true;
        onEvent({ type: 'open-door' });
      } else if (doorOpened && !drag.door.done && angle <= DOOR_CLOSED_AT) {
        drag.door.done = true;
        onEvent({ type: 'close-door' });
      }
      return;
    }
    const track = id === 'trolley' ? TROLLEY : WAGON;
    const axis = track.goal.clone().sub(track.start);
    const length = axis.length();
    axis.normalize();
    const t = THREE.MathUtils.clamp(point.clone().sub(track.start).dot(axis) / length, 0, 1);
    const object = handleOf(id);
    const before = drag[id].t;
    drag[id].t = t;
    object.position.copy(track.start).addScaledVector(axis, t * length);
    if (t !== before) {
      const handleHeight = id === 'trolley' ? 1.0 : 0.62;
      const handleAt = object.position.clone().setY(handleHeight).add(new THREE.Vector3(0, 0, id === 'trolley' ? 0.45 : 0.95));
      showArrow(handleAt, axis.clone().multiplyScalar(Math.sign(t - before)), 0.55,
        id === 'trolley' ? 0x2fd06b : 0xf5a524, id === 'trolley' ? 'push' : 'pull');
    }
    if (!drag[id].done && t >= DRAG_DONE) {
      drag[id].done = true;
      onEvent({ type: id === 'trolley' ? 'push-trolley' : 'pull-wagon' });
    }
  }

  // ---------------------------------------------------------------- playground actions
  function resetBall() {
    ball = null;
    football.position.copy(BALL_HOME);
    football.rotation.set(0, 0, 0);
  }

  function kick(handSpeed: number, direction = new THREE.Vector3(0, 0, -1)) {
    if (current !== 'playground') return;
    const speed = kickSpeed(handSpeed);
    const dir = direction.clone().setY(0).normalize();
    ball = { x: football.position.x, z: football.position.z, vx: dir.x * speed, vz: dir.z * speed, deceleration: FORCE_LAB.surfaces.grass };
    showArrow(football.position.clone().addScaledVector(dir, -0.45).setY(BALL_RADIUS), dir, 0.35, 0xf5a524);
    dropGhost(football.position, BALL_RADIUS);
    onEvent({ type: 'kick', ballSpeed: speed });
  }

  function tap(side: number) {
    if (current !== 'playground' || !ball || Math.hypot(ball.vx, ball.vz) === 0) return;
    const before = { vx: ball.vx, vz: ball.vz };
    const after = sideTap(before, 1.2 * Math.sign(side || 1));
    ball = { ...ball, ...after };
    const perpendicular = new THREE.Vector3(after.vx - before.vx, 0, after.vz - before.vz).normalize();
    showArrow(football.position.clone().addScaledVector(perpendicular, -0.4), perpendicular, 0.3, 0xa78bfa);
    onEvent({ type: 'side-tap', directionChange: directionChangeDegrees(before, after) });
  }

  // ---------------------------------------------------------------- friction actions
  function releaseCar(surface: Surface) {
    if (current !== 'friction') return;
    if (!state?.friction.prediction) {
      onEvent({ type: 'release-car', surface, distance: 0 });
      return;
    }
    const car = cars[surface];
    car.position.set(LANE_X[surface], RAMP_TOP.y, RAMP_TOP.z);
    flags[surface].visible = false;
    const speed = rampExitSpeed(FORCE_LAB.rampHeight);
    carRuns[surface] = {
      roller: { x: LANE_X[surface], z: LANE_START_Z, vx: 0, vz: -speed, deceleration: FORCE_LAB.surfaces[surface] },
      rampTime: reducedMotion ? RAMP_SECONDS : 0,
      reported: false,
    };
    if (reducedMotion) {
      // Jump straight to the result.
      let roller = carRuns[surface].roller!;
      while (Math.hypot(roller.vx, roller.vz) > 0) roller = stepRoll(roller, 0.05);
      carRuns[surface].roller = roller;
    }
  }

  // ---------------------------------------------------------------- wall actions
  function throwBall(velocity: THREE.Vector3) {
    if (current !== 'wall') return;
    tennisBall.position.copy(THROW_FROM);
    tennis = { x: THROW_FROM.x, z: THROW_FROM.z, vx: velocity.x, vz: velocity.z, deceleration: FORCE_LAB.surfaces.courtyard };
    tennisMode = 'thrown';
    bounceReported = false;
    clearGhosts();
    dropGhost(tennisBall.position, TENNIS_RADIUS * 1.6);
  }

  function feedBall() {
    if (current !== 'wall') return;
    tennisBall.position.copy(FEED_FROM);
    const dir = RACKET_SPOT.clone().sub(FEED_FROM).setY(0).normalize();
    tennis = { x: FEED_FROM.x, z: FEED_FROM.z, vx: dir.x * 2.3, vz: dir.z * 2.3, deceleration: FORCE_LAB.surfaces.courtyard };
    tennisMode = 'fed';
    clearGhosts();
  }

  function ballInReach() {
    return (
      tennisMode === 'fed' &&
      tennis !== null &&
      new THREE.Vector2(tennis.x - RACKET_SPOT.x, tennis.z - RACKET_SPOT.z).length() <= REACH
    );
  }

  function swing(aimSide: number) {
    if (current !== 'wall' || !ballInReach() || !tennis) return;
    const before = { vx: tennis.vx, vz: tennis.vz };
    const after = racketHit(before, { x: THREE.MathUtils.clamp(aimSide, -1, 1) * 0.4, z: -1 }, SWING_SPEED);
    tennis = { ...tennis, ...after };
    tennisMode = 'hit';
    const dir = new THREE.Vector3(after.vx, 0, after.vz).normalize();
    showArrow(tennisBall.position.clone().addScaledVector(dir, -0.35), dir, 0.3, 0xf5a524);
    dropGhost(tennisBall.position, TENNIS_RADIUS * 1.6);
    onEvent({ type: 'racket-hit', directionChange: directionChangeDegrees(before, after) });
  }

  // ---------------------------------------------------------------- frame update
  const rollAxis = new THREE.Vector3();
  function rollVisual(object: THREE.Object3D, roller: Roller, radius: number, dt: number) {
    const speed = Math.hypot(roller.vx, roller.vz);
    if (speed === 0) return;
    // Rolling without slipping: spin about the axis across the motion, at v / r.
    rollAxis.set(roller.vz, 0, -roller.vx).normalize();
    object.rotateOnWorldAxis(rollAxis, (speed / radius) * dt);
  }

  function update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    time += dt;
    arrowTimer = Math.max(0, arrowTimer - dt);
    if (arrowTimer === 0) {
      arrow.visible = false;
      pushLabel.visible = false;
      pullLabel.visible = false;
    }
    ghostClock += dt;
    const dropTrail = ghostClock >= 0.25;
    if (dropTrail) ghostClock = 0;

    if (ball) {
      ball = stepRoll(ball, dt);
      if (ball.z < GOAL_LINE_Z - 0.5 || Math.abs(ball.x) > 6 || ball.z < -5.5) {
        ball = { ...ball, vx: 0, vz: 0 };
      }
      rollVisual(football, ball, BALL_RADIUS, dt);
      football.position.set(ball.x, BALL_RADIUS, ball.z);
      if (dropTrail && Math.hypot(ball.vx, ball.vz) > 0.2) dropGhost(football.position, BALL_RADIUS);
    }

    for (const surface of ['tile', 'carpet'] as const) {
      const run = carRuns[surface];
      if (!run.roller) continue;
      const car = cars[surface];
      if (run.rampTime < RAMP_SECONDS) {
        run.rampTime += dt;
        const k = Math.min(1, run.rampTime / RAMP_SECONDS);
        car.position.set(LANE_X[surface], THREE.MathUtils.lerp(RAMP_TOP.y, TABLE_TOP, k), THREE.MathUtils.lerp(RAMP_TOP.z, LANE_START_Z, k));
        continue;
      }
      run.roller = stepRoll(run.roller, dt);
      car.position.set(run.roller.x, TABLE_TOP, run.roller.z);
      if (!run.reported && Math.hypot(run.roller.vx, run.roller.vz) === 0) {
        run.reported = true;
        flags[surface].position.set(run.roller.x + 0.08, TABLE_TOP, run.roller.z);
        flags[surface].visible = true;
        onEvent({ type: 'release-car', surface, distance: LANE_START_Z - run.roller.z });
      }
    }

    if (tennis) {
      const before = { vx: tennis.vx, vz: tennis.vz };
      tennis = stepRoll(tennis, dt);
      if (tennis.z - TENNIS_RADIUS <= WALL_Z && tennis.vz < 0) {
        const after = bounceOffWall(tennis, { x: 0, z: 1 });
        tennis = { ...tennis, ...after, z: WALL_Z + TENNIS_RADIUS };
        showArrow(new THREE.Vector3(tennis.x, 0.25, WALL_Z + 0.02), new THREE.Vector3(0, 0, 1), 0.35, 0xf5a524);
        if (tennisMode === 'thrown' && !bounceReported) {
          bounceReported = true;
          onEvent({ type: 'wall-bounce', directionChange: directionChangeDegrees(before, after) });
        }
      }
      rollVisual(tennisBall, tennis, TENNIS_RADIUS, dt);
      tennisBall.position.set(tennis.x, TENNIS_RADIUS, tennis.z);
      if (dropTrail && Math.hypot(tennis.vx, tennis.vz) > 0.2) dropGhost(tennisBall.position, TENNIS_RADIUS * 1.6);
    }

    // Riya kicks once to show the idea when the playground opens.
    if (current === 'playground' && riyaKick < 0 && riyaLeg && !reducedMotion) riyaKick = 0;
    if (riyaLeg && riyaKick >= 0 && riyaKick < 1) {
      riyaKick = Math.min(1, riyaKick + dt / 0.6);
      riyaLeg.rotation.x = -Math.sin(riyaKick * Math.PI) * 0.9;
    }
  }

  return {
    groups,
    apply,
    update,
    dragStart,
    dragGoal,
    dragTo,
    handleOf,
    kick,
    tap,
    resetBall,
    ballPosition: () => football.position,
    ballMoving: () => ball !== null && Math.hypot(ball.vx, ball.vz) > 0,
    releaseCar,
    carRunning: (surface: Surface) => carRuns[surface].roller !== null && !carRuns[surface].reported,
    flagVisible: (surface: Surface) => flags[surface].visible,
    throwBall,
    feedBall,
    ballInReach,
    swing,
    arrowVisible: () => arrow.visible,
    targets: { trolley, wagon, door, football, cars, tennisBall, racket },
    racketSpot: RACKET_SPOT,
    wallZ: WALL_Z,
    focusFor: (scene: ForceLabSceneId) => FOCI[scene],
    vrSpotFor: (scene: ForceLabSceneId) => VR_SPOTS[scene].clone(),
    time: () => time,
    dispose() {
      lighting.dispose();
      disposeObjectTree(root);
      ghostGeometry.dispose();
      ghostMaterial.dispose();
      arrowMaterial.dispose();
      for (const label of [pushLabel, pullLabel]) {
        const sprite = label as THREE.Sprite;
        sprite.material?.map?.dispose();
        sprite.material?.dispose();
      }
      scene.remove(root);
    },
  };
}

export type ForceLabScene = Awaited<ReturnType<typeof createForceLabScene>>;
