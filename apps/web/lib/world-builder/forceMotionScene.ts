import * as THREE from 'three';
import {
  createAccelerateControl,
  createComparisonBoard,
  createForceControl,
  createMotionBall,
  createPedestal,
  createShapeRig,
  createTrack,
  type ForceMotionMaterials,
} from './forceMotionAnatomy';

export interface ForceMotionSceneConfig {
  scene: THREE.Scene;
  materials: ForceMotionMaterials;
}

// Kept short deliberately: the guided camera frames each stage once, at
// the moment it begins, around the ball's position at that instant. If the
// ball then rolled far beyond that frame before the learner reacted, it
// would drift out of view — so every leg of the journey is short enough to
// stay inside a tightly-framed shot for the few seconds it takes to react.
const REST_Z = -0.55;
const CRUISE_Z = 0;
const FAR_Z = 0.75;
const SIDE_X = 0.4;
const BALL_RADIUS = 0.14;
const BASE_EASE_RATE = 1.1;
const FAST_EASE_RATE = 3.2;
const PADDLE_GAP_OPEN = 0.24;
const PADDLE_GAP_CLOSED = 0.1;

export function createForceMotionScene(config: ForceMotionSceneConfig) {
  const root = new THREE.Group();
  root.name = 'force-motion-production-world';
  config.scene.add(root);

  const track = createTrack(config.materials.track);
  const ball = createMotionBall(config.materials.ball);

  const pushControl = createForceControl('push-control', 'forward', config.materials.pushControl);
  pushControl.position.set(-0.4, 0.16, REST_Z);
  const brakeControl = createForceControl('brake-control', 'backward', config.materials.brakeControl);
  brakeControl.position.set(-0.4, 0.16, CRUISE_Z);
  const accelerateControl = createAccelerateControl(config.materials.accelerateControl);
  accelerateControl.position.set(0.4, 0.16, CRUISE_Z);
  const deflectControl = createForceControl('deflect-control', 'side', config.materials.deflectControl);
  deflectControl.position.set(0.4, 0.16, FAR_Z * 0.55);

  const pedestal = createPedestal(config.materials.track);
  pedestal.position.set(0.75, -0.02, 1.35);
  const shapeRig = createShapeRig(config.materials.shapeBall, config.materials.paddle);
  shapeRig.root.position.set(0.75, 0.18, 1.35);

  const squeezeControl = createForceControl('squeeze-control', 'up', config.materials.shapeControl);
  squeezeControl.position.set(0.42, 0.45, 1.35);
  squeezeControl.rotation.z = Math.PI;
  const releaseControl = createForceControl('release-control', 'up', config.materials.shapeControl);
  releaseControl.position.set(1.08, 0.3, 1.35);

  const comparisonBoard = createComparisonBoard(config.materials.board, [
    config.materials.pushControl,
    config.materials.brakeControl,
    config.materials.accelerateControl,
    config.materials.deflectControl,
    config.materials.shapeControl,
  ]);
  comparisonBoard.position.set(0, 0.55, 1.75);

  root.add(
    track,
    ball,
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

  let ballZ = REST_Z;
  let targetZ = REST_Z;
  let ballX = 0;
  let targetX = 0;
  let easeRate = BASE_EASE_RATE;
  let squeezePhase = 0;
  let squeezeTarget = 0;

  function applyBallTransform() {
    ball.position.set(ballX, BALL_RADIUS, ballZ);
  }
  applyBallTransform();

  function applyShapeTransform() {
    shapeRig.ball.scale.set(1 + squeezePhase * 0.3, 1 - squeezePhase * 0.55, 1 + squeezePhase * 0.3);
    shapeRig.topPaddle.position.y = THREE.MathUtils.lerp(PADDLE_GAP_OPEN, PADDLE_GAP_CLOSED, squeezePhase);
    shapeRig.bottomPaddle.position.y = -shapeRig.topPaddle.position.y;
  }
  applyShapeTransform();

  function applyPush() {
    targetZ = CRUISE_Z;
  }
  function applyBrake() {
    targetZ = ballZ;
  }
  function applyAccelerate() {
    easeRate = FAST_EASE_RATE;
  }
  function applyDeflect() {
    targetX = SIDE_X;
  }
  function squeezeBall() {
    squeezeTarget = 1;
  }
  function releaseBall() {
    squeezeTarget = 0;
  }

  function update(deltaSeconds: number) {
    const t = Math.min(1, deltaSeconds * easeRate);
    const previousZ = ballZ;
    ballZ += (targetZ - ballZ) * t;
    ballX += (targetX - ballX) * t;
    ball.rotation.x += (ballZ - previousZ) / BALL_RADIUS;
    applyBallTransform();

    const shapeT = Math.min(1, deltaSeconds * 3.5);
    squeezePhase += (squeezeTarget - squeezePhase) * shapeT;
    applyShapeTransform();
  }

  let stage = 0;
  function setStage(nextStage: number) {
    stage = Math.max(0, Math.min(5, nextStage));
    easeRate = BASE_EASE_RATE;
    if (stage === 0) {
      ballZ = REST_Z; targetZ = REST_Z; ballX = 0; targetX = 0;
    } else if (stage === 1 || stage === 2 || stage === 3) {
      ballZ = CRUISE_Z; targetZ = FAR_Z; ballX = 0; targetX = 0;
    } else if (stage === 4) {
      ballZ = FAR_Z; targetZ = FAR_Z; ballX = 0; targetX = 0;
    } else {
      ballZ = FAR_Z; targetZ = FAR_Z; ballX = SIDE_X; targetX = SIDE_X;
    }
    applyBallTransform();
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
    track,
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
    dispose,
  };
}

export type ForceMotionScene = ReturnType<typeof createForceMotionScene>;
