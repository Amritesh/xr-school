import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  savedLitres,
  spillingSockets,
  type RainwaterStageId,
  type RainwaterState,
} from './rainwaterLesson';
import { isAssemblySolved } from '@xr-school/simulation-runtime';
import { disposeObjectTree, type GlbAssetLoader } from './world-builder/glbAssets';
import { createStylizedLighting, type StylizedMood } from './world-builder/stylizedKit';
import {
  createDropletPool,
  createFillVolume,
  createFlowRibbon,
} from './world-builder/waterEffects';

const MODELS = '/models/rainwater';
const SOCKET_X = [-1.65, -0.55, 0.55, 1.65];
const EAVE_Y = 2.6;
const EAVE_Z = 2.46;
const TANK = new THREE.Vector3(3.05, 0.41, EAVE_Z);
const TANK_FILL_SECONDS = 4;
const RAIN_PER_SECOND = 130;
const SPILL_INTERVAL_SECONDS = 0.05;

const ignoreRaycast: THREE.Mesh['raycast'] = () => undefined;

/** A carried piece sits under the pointer, so it must not catch the next click. */
function setClickable(object: THREE.Object3D, clickable: boolean) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.raycast = clickable ? THREE.Mesh.prototype.raycast : ignoreRaycast;
  });
}

function moodFor(stage: RainwaterStageId): StylizedMood {
  if (stage === 'drought') return 'drought';
  if (stage === 'summer' || stage === 'finale') return 'restored';
  return 'monsoon';
}

const raining = (stage: RainwaterStageId) => moodFor(stage) === 'monsoon';

function flatMesh(geometry: THREE.BufferGeometry, colour: number) {
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9 }),
  );
}

function fallbackGroup(...meshes: THREE.Object3D[]) {
  const group = new THREE.Group();
  group.add(...meshes);
  return group;
}

function fallbackHouse() {
  const walls = flatMesh(new THREE.BoxGeometry(4.8, 2.3, 3.6), 0xf3e7c9);
  walls.position.y = 1.3;
  const roof = flatMesh(new THREE.ConeGeometry(3.6, 1.1, 4), 0xb9573a);
  roof.position.y = 3.1;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  return fallbackGroup(walls, roof);
}

function fallbackGround() {
  const ground = flatMesh(new THREE.CircleGeometry(60, 24), 0x8c8a55);
  ground.rotation.x = -Math.PI / 2;
  return fallbackGroup(ground);
}

function fallbackGutter() {
  return fallbackGroup(flatMesh(new THREE.BoxGeometry(1.08, 0.08, 0.15), 0xa7bac6));
}

function fallbackDownpipe() {
  const pipe = flatMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.08, 8), 0xa7bac6);
  pipe.position.y = -0.54;
  return fallbackGroup(pipe);
}

/** A work table: a thin top on four legs, merged into one draw call. */
function benchGeometry() {
  const parts = [new THREE.BoxGeometry(1.3, 0.05, 1.4).translate(0, 0.72, 0)];
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.62, 0.62]) {
      parts.push(new THREE.BoxGeometry(0.07, 0.7, 0.07).translate(x, 0.35, z));
    }
  }
  return mergeGeometries(parts)!;
}

/** Droppy, the guide. Replaced by an animated model in the story stage work. */
function createDroppy() {
  const profile = [
    [0, 0],
    [0.2, 0.03],
    [0.3, 0.17],
    [0.27, 0.34],
    [0.14, 0.52],
    [0, 0.7],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 12),
    new THREE.MeshStandardMaterial({ color: 0x3fb6e8, roughness: 0.3, flatShading: true }),
  );
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x0b2d44 });
  const eyeGeometry = new THREE.SphereGeometry(0.036, 6, 5);
  const eyes = new THREE.InstancedMesh(eyeGeometry, eyeMaterial, 2);
  eyes.setMatrixAt(0, new THREE.Matrix4().setPosition(-0.09, 0.3, 0.26));
  eyes.setMatrixAt(1, new THREE.Matrix4().setPosition(0.09, 0.3, 0.26));
  const droppy = new THREE.Group();
  droppy.name = 'droppy';
  droppy.add(body, eyes);
  return droppy;
}

export async function createRainwaterScene(
  scene: THREE.Scene,
  assets: GlbAssetLoader,
  { reducedMotion, onDiagnostic }: { reducedMotion: boolean; onDiagnostic?: (message: string) => void },
) {
  const root = new THREE.Group();
  root.name = 'sundargram';
  scene.add(root);
  const lighting = createStylizedLighting(scene, root);

  const [house, ground, backdrop, downpipe, gutterModel] = await Promise.all([
    assets.loadOrFallback(`${MODELS}/sundargram-house.glb`, fallbackHouse, onDiagnostic),
    assets.loadOrFallback(`${MODELS}/courtyard-ground.glb`, fallbackGround, onDiagnostic),
    assets.loadOrFallback(`${MODELS}/village-backdrop.glb`, () => new THREE.Group(), onDiagnostic),
    assets.loadOrFallback(`${MODELS}/downpipe.glb`, fallbackDownpipe, onDiagnostic),
    assets.loadOrFallback(`${MODELS}/gutter-piece.glb`, fallbackGutter, onDiagnostic),
  ]);
  ground.traverse(child => {
    child.receiveShadow = true;
  });
  house.traverse(child => {
    child.castShadow = true;
  });
  downpipe.position.set(2.25, EAVE_Y, EAVE_Z);
  root.add(ground, backdrop, house, downpipe);

  // Tank: a see-through shell so the child can watch their water rise.
  const tankShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 1, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xdfeaf0,
      roughness: 0.4,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  tankShell.position.copy(TANK).setY(TANK.y + 0.5);
  const tankWater = createFillVolume({ radius: 0.49, height: 0.97, color: 0x46a7dd });
  tankWater.object.position.copy(TANK).setY(TANK.y + 0.01);
  root.add(tankWater.object, tankShell);

  const droppy = createDroppy();
  droppy.position.set(1.05, 0.05, 3.7);
  root.add(droppy);

  // Rooftop work area.
  const rooftop = new THREE.Group();
  rooftop.name = 'rooftop-stage';
  root.add(rooftop);
  const bench = flatMesh(benchGeometry(), 0x7a5233);
  bench.position.set(-1.95, 0, 4.0);
  rooftop.add(bench);

  const targets = new Map<string, THREE.Object3D>();
  const restPositions = new Map<string, THREE.Vector3>();
  const socketPositions = new Map<string, THREE.Vector3>();
  const ribbons = new Map<string, ReturnType<typeof createFlowRibbon>>();
  const socketMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc23d,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const socketGeometry = new THREE.BoxGeometry(1.06, 0.2, 0.22);

  SOCKET_X.forEach((x, index) => {
    const number = index + 1;
    const pieceId = `gutter-${number}`;
    const socketId = `gutter-socket-${number}`;

    const socket = new THREE.Mesh(socketGeometry, socketMaterial);
    const authored = house.getObjectByName(`Socket_Gutter_${number}`);
    if (authored) authored.getWorldPosition(socket.position);
    else socket.position.set(x, EAVE_Y, EAVE_Z);
    socket.name = socketId;
    rooftop.add(socket);
    targets.set(socketId, socket);
    socketPositions.set(socketId, socket.position.clone());

    const piece = gutterModel.clone();
    piece.name = pieceId;
    piece.traverse(child => {
      child.castShadow = true;
    });
    const rest = new THREE.Vector3(-1.95, 0.8, 3.55 + index * 0.3);
    piece.position.copy(rest);
    restPositions.set(pieceId, rest);
    rooftop.add(piece);
    targets.set(pieceId, piece);

    const ribbon = createFlowRibbon(
      new THREE.LineCurve3(
        new THREE.Vector3(x - 0.54, socket.position.y - 0.035, socket.position.z),
        new THREE.Vector3(x + 0.54, socket.position.y - 0.035, socket.position.z),
      ),
      { width: 0.09, color: 0x8fd2f2, reducedMotion },
    );
    rooftop.add(ribbon.object);
    ribbons.set(socketId, ribbon);
  });

  const tankStream = createFlowRibbon(
    new THREE.LineCurve3(
      new THREE.Vector3(TANK.x, EAVE_Y - 1.1, TANK.z),
      new THREE.Vector3(TANK.x, TANK.y + 0.3, TANK.z),
    ),
    { width: 0.07, color: 0x8fd2f2, reducedMotion },
  );
  root.add(tankStream.object);

  const rain = createDropletPool({ max: 200, reducedMotion });
  root.add(rain.mesh);

  let state: RainwaterState | null = null;
  let tankLevel = 0;
  let rainDebt = 0;
  let spillClock = 0;
  let time = 0;
  const emitPoint = new THREE.Vector3();
  const emitVelocity = new THREE.Vector3();

  function apply(next: RainwaterState) {
    state = next;
    lighting.setMood(moodFor(next.stage));
    const onRooftop = next.stage === 'rooftop';
    const assembly = next.assemblies.rooftop;
    rooftop.visible = true;
    bench.visible = onRooftop;
    for (const [socketId, position] of socketPositions) {
      const socket = targets.get(socketId)!;
      const pieceId = assembly.placed[socketId];
      socket.visible = onRooftop && pieceId === undefined;
      ribbons.get(socketId)!.setFlow(pieceId !== undefined && raining(next.stage) ? 1 : 0);
      if (pieceId) {
        const piece = targets.get(pieceId)!;
        piece.position.copy(position);
        piece.visible = true;
      }
    }
    const placedPieces = new Set(Object.values(assembly.placed));
    for (const [pieceId, rest] of restPositions) {
      if (placedPieces.has(pieceId)) continue;
      const piece = targets.get(pieceId)!;
      piece.visible = onRooftop;
      if (assembly.picked !== pieceId) piece.position.copy(rest);
    }
    for (const pieceId of restPositions.keys()) {
      setClickable(targets.get(pieceId)!, assembly.picked !== pieceId);
    }
    tankStream.setFlow(isAssemblySolved(assembly) && raining(next.stage) ? 1 : 0);
  }

  function spillCount() {
    return state?.stage === 'rooftop' ? spillingSockets(state).length : 0;
  }

  function update(dt: number) {
    time += dt;
    for (const ribbon of ribbons.values()) ribbon.update(dt);
    tankStream.update(dt);

    if (state && isAssemblySolved(state.assemblies.rooftop)) {
      tankLevel = reducedMotion ? 1 : Math.min(1, tankLevel + dt / TANK_FILL_SECONDS);
      tankWater.setFill(tankLevel * (savedLitres(state) > 0 ? 1 : 0));
    }

    if (state && raining(state.stage)) {
      rainDebt += RAIN_PER_SECOND * Math.min(dt, 0.1);
      while (rainDebt >= 1) {
        rainDebt -= 1;
        emitPoint.set(
          (Math.random() - 0.5) * 18,
          7 + Math.random() * 2,
          (Math.random() - 0.5) * 12 + 2,
        );
        rain.emit(emitPoint, emitVelocity.set(0, -9, 0));
      }
    }
    if (spillCount() > 0) {
      spillClock += dt;
      if (spillClock >= SPILL_INTERVAL_SECONDS) {
        spillClock = 0;
        for (const socketId of spillingSockets(state!)) {
          emitPoint.copy(socketPositions.get(socketId)!);
          emitPoint.x += (Math.random() - 0.5) * 1;
          rain.emit(emitPoint, emitVelocity.set(0, -1.2, 0.5));
        }
      }
    }
    rain.update(Math.min(dt, 0.1));

    if (!reducedMotion) droppy.position.y = 0.05 + Math.sin(time * 1.8) * 0.05;
  }

  return {
    apply,
    update,
    targets,
    tankFill: () => tankWater.fill(),
    spillCount,
    dispose() {
      for (const ribbon of ribbons.values()) ribbon.dispose();
      tankStream.dispose();
      rain.dispose();
      tankWater.dispose();
      lighting.dispose();
      disposeObjectTree(root);
      socketGeometry.dispose();
      socketMaterial.dispose();
      scene.remove(root);
    },
  };
}

export type RainwaterScene = Awaited<ReturnType<typeof createRainwaterScene>>;
