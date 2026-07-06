import * as THREE from 'three';
import {
  ARENA,
  createAccelerateControl,
  createArena,
  createComparisonBoard,
  createForceControl,
  createMotionBall,
  createPedestal,
  createShapeRig,
  createVelocityArrow,
  type ForceMotionMaterials,
} from './forceMotionAnatomy';

export interface ForceMotionSceneConfig {
  scene: THREE.Scene;
  materials: ForceMotionMaterials;
}

const BALL_RADIUS = 0.14;
// Forward is -Z (into the scene, away from the viewer).
const PUSH_SPEED = 0.72; // m/s imparted by one push
const ACCEL_ADD = 0.75; // extra speed a stronger push adds
const DEFLECT_ADD = 0.9; // sideways speed a side-push adds
const BRAKE_DECEL = 1.4; // m/s^2 the brake removes, opposing motion
const BOUNCE = 0.82; // velocity retained after a wall bounce
const START_Z = 1.0; // ball starts near the front so it has room to roll away

// The ball's centre is bounded so it bounces off the inner wall faces
// rather than passing through them.
const BOUND_X = ARENA.width / 2 - ARENA.wall - BALL_RADIUS;
const BOUND_Z = ARENA.depth / 2 - ARENA.wall - BALL_RADIUS;

const PADDLE_GAP_OPEN = 0.24;
const PADDLE_GAP_CLOSED = 0.1;

export function createForceMotionScene(config: ForceMotionSceneConfig) {
  const root = new THREE.Group();
  root.name = 'force-motion-production-world';
  config.scene.add(root);

  const arena = createArena(config.materials.track);
  const ball = createMotionBall(config.materials.ball);
  const velocityArrow = createVelocityArrow(config.materials.velocity);

  // Motion-force controls sit in a tidy panel just outside the arena's
  // left wall, so the rolling ball never collides with them.
  const pushControl = createForceControl('push-control', 'forward', config.materials.pushControl);
  pushControl.position.set(-1.15, 0.2, 0.7);
  const brakeControl = createForceControl('brake-control', 'backward', config.materials.brakeControl);
  brakeControl.position.set(-1.15, 0.2, 0.23);
  const accelerateControl = createAccelerateControl(config.materials.accelerateControl);
  accelerateControl.position.set(-1.15, 0.2, -0.24);
  const deflectControl = createForceControl('deflect-control', 'side', config.materials.deflectControl);
  deflectControl.position.set(-1.15, 0.2, -0.7);

  const pedestal = createPedestal(config.materials.track);
  pedestal.position.set(1.55, -0.02, 0.2);
  const shapeRig = createShapeRig(config.materials.shapeBall, config.materials.paddle);
  shapeRig.root.position.set(1.55, 0.18, 0.2);

  const squeezeControl = createForceControl('squeeze-control', 'up', config.materials.shapeControl);
  squeezeControl.position.set(1.2, 0.5, 0.2);
  squeezeControl.rotation.z = Math.PI;
  const releaseControl = createForceControl('release-control', 'up', config.materials.shapeControl);
  releaseControl.position.set(1.92, 0.32, 0.2);

  const comparisonBoard = createComparisonBoard(config.materials.board, [
    config.materials.pushControl,
    config.materials.brakeControl,
    config.materials.accelerateControl,
    config.materials.deflectControl,
    config.materials.shapeControl,
  ]);
  comparisonBoard.position.set(0, 0.7, -1.75);

  root.add(
    arena,
    ball,
    velocityArrow,
    pushControl,
    brakeControl,
    accelerateControl,
    deflectControl,
    pedestal,
    shapeRig.root,
    squeezeControl,
    releaseControl,
    comparisonBoard,
  );

  // ── Motion state: real velocity that persists until a force acts on it,
  // so the ball keeps rolling after a push ends (inertia) instead of
  // easing to a halt on its own. ──────────────────────────────────────
  const position = new THREE.Vector2(0, START_Z);
  const velocity = new THREE.Vector2(0, 0);
  let braking = false;
  let squeezePhase = 0;
  let squeezeTarget = 0;

  function applyBallTransform() {
    ball.position.set(position.x, BALL_RADIUS, position.y);
  }

  function updateVelocityArrow() {
    const speed = velocity.length();
    if (speed < 0.05) {
      velocityArrow.visible = false;
      return;
    }
    velocityArrow.visible = true;
    // Sit the arrow on top of the ball so its body never occludes it, even
    // when the arrow points directly away from the camera.
    velocityArrow.position.set(position.x, BALL_RADIUS + 0.13, position.y);
    velocityArrow.rotation.y = Math.atan2(velocity.x, velocity.y);
    velocityArrow.scale.z = THREE.MathUtils.clamp(speed * 0.7, 0.25, 1.9);
  }

  function applyShapeTransform() {
    shapeRig.ball.scale.set(1 + squeezePhase * 0.3, 1 - squeezePhase * 0.55, 1 + squeezePhase * 0.3);
    shapeRig.topPaddle.position.y = THREE.MathUtils.lerp(PADDLE_GAP_OPEN, PADDLE_GAP_CLOSED, squeezePhase);
    shapeRig.bottomPaddle.position.y = -shapeRig.topPaddle.position.y;
  }

  applyBallTransform();
  updateVelocityArrow();
  applyShapeTransform();

  function applyPush() {
    braking = false;
    velocity.y -= PUSH_SPEED;
  }
  function applyBrake() {
    // A real opposing force: it decelerates the ball over time in update(),
    // it does not teleport it to a stop.
    braking = true;
  }
  function applyAccelerate() {
    braking = false;
    const speed = velocity.length();
    if (speed < 0.02) {
      velocity.set(0, -(PUSH_SPEED + ACCEL_ADD));
    } else {
      velocity.multiplyScalar((speed + ACCEL_ADD) / speed);
    }
  }
  function applyDeflect() {
    braking = false;
    velocity.x += DEFLECT_ADD;
  }
  function squeezeBall() {
    squeezeTarget = 1;
  }
  function releaseBall() {
    squeezeTarget = 0;
  }

  function update(deltaSeconds: number) {
    const dt = Math.min(deltaSeconds, 0.05); // guard against long frame steps
    const previous = position.clone();

    if (braking) {
      const speed = velocity.length();
      const next = speed - BRAKE_DECEL * dt;
      if (next <= 0.001) {
        velocity.set(0, 0);
        braking = false;
      } else {
        velocity.multiplyScalar(next / speed);
      }
    }

    position.addScaledVector(velocity, dt);

    if (position.x > BOUND_X) { position.x = BOUND_X; velocity.x = -velocity.x * BOUNCE; }
    else if (position.x < -BOUND_X) { position.x = -BOUND_X; velocity.x = -velocity.x * BOUNCE; }
    if (position.y > BOUND_Z) { position.y = BOUND_Z; velocity.y = -velocity.y * BOUNCE; }
    else if (position.y < -BOUND_Z) { position.y = -BOUND_Z; velocity.y = -velocity.y * BOUNCE; }

    const dz = position.y - previous.y;
    const dx = position.x - previous.x;
    ball.rotation.x -= dz / BALL_RADIUS;
    ball.rotation.z += dx / BALL_RADIUS;
    applyBallTransform();
    updateVelocityArrow();

    const shapeT = Math.min(1, dt * 3.5);
    squeezePhase += (squeezeTarget - squeezePhase) * shapeT;
    applyShapeTransform();
  }

  let stage = 0;
  function setStage(nextStage: number) {
    stage = Math.max(0, Math.min(5, nextStage));
    braking = false;
    // Each stage starts from a defined condition so the lesson is
    // deterministic regardless of what the learner did in earlier stages.
    if (stage === 0) {
      // At rest — the learner's push is what starts the motion.
      position.set(0, START_Z);
      velocity.set(0, 0);
    } else if (stage === 1 || stage === 2 || stage === 3) {
      // Already rolling forward, so the learner acts on a moving object.
      position.set(0, START_Z);
      velocity.set(0, -PUSH_SPEED);
    } else {
      // Shape / compare stages: park the ball out of the way.
      position.set(0, START_Z);
      velocity.set(0, 0);
    }
    squeezeTarget = 0;
    squeezePhase = 0;
    applyBallTransform();
    updateVelocityArrow();
    applyShapeTransform();
  }
  setStage(0);

  function dispose() {
    config.scene.remove(root);
    root.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
  }

  return {
    root,
    track: arena,
    ball,
    pushControl,
    brakeControl,
    accelerateControl,
    deflectControl,
    shapeRig: shapeRig.root,
    squeezeControl,
    releaseControl,
    comparisonBoard,
    setStage,
    update,
    applyPush,
    applyBrake,
    applyAccelerate,
    applyDeflect,
    squeezeBall,
    releaseBall,
    // Exposed for tests/inspection.
    getMotionState: () => ({
      position: position.clone(),
      velocity: velocity.clone(),
      braking,
    }),
    dispose,
  };
}

export type ForceMotionScene = ReturnType<typeof createForceMotionScene>;
