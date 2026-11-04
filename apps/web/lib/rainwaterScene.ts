import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  RAINWATER_STAGES,
  savedLitres,
  spillingSockets,
  waterIsClear,
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
const TANK_TOP_Y = 1.41;
const PIPE_OUTLET_Y = 1.98;
const TANK_FILL_SECONDS = 8;
const CLEARING_SECONDS = 2.5;
const DIRTY_CLARITY = 0.15;
const RAIN_PER_SECOND = 130;
const SPILL_INTERVAL_SECONDS = 0.05;
const VALVE_POSITION = new THREE.Vector3(2.42, 1.72, 2.56);
const TABLE = new THREE.Vector3(-1.95, 0, 4.0);
/** Close to the tank, so the camera can frame the table and the filter together. */
const FILTER_TABLE = new THREE.Vector3(-0.3, 0, 4.1);
const TABLE_TOP_Y = 0.8;

const FILTER_LAYERS = [
  { pieceId: 'stones', model: 'filter-stones', colour: 0x7a7367, socketId: 'filter-top', y: 1.81 },
  { pieceId: 'sand', model: 'filter-sand', colour: 0xdcc18c, socketId: 'filter-middle', y: 1.67 },
  { pieceId: 'charcoal', model: 'filter-charcoal', colour: 0x2b2b2e, socketId: 'filter-bottom', y: 1.53 },
];

const WIDE_FOCUS = {
  position: new THREE.Vector3(0.1, 2.1, 8.9),
  target: new THREE.Vector3(1.15, 1.5, 1.2),
};
const FILTER_FOCUS = {
  position: new THREE.Vector3(0.75, 2.2, 7.2),
  target: new THREE.Vector3(1.35, 1.4, 2.6),
};

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
const reached = (stage: RainwaterStageId, goal: RainwaterStageId) =>
  RAINWATER_STAGES.indexOf(stage) >= RAINWATER_STAGES.indexOf(goal);

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
  const pipe = flatMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 8), 0xa7bac6);
  pipe.position.y = -0.31;
  return fallbackGroup(pipe);
}

function fallbackFrame() {
  const base = flatMesh(new THREE.CylinderGeometry(0.37, 0.37, 0.035, 16), 0x6f8591);
  return fallbackGroup(base);
}

function fallbackValve() {
  const wheel = flatMesh(new THREE.TorusGeometry(0.13, 0.024, 6, 14), 0xe4476b);
  return fallbackGroup(wheel);
}

function fallbackLayer(colour: number) {
  return () => fallbackGroup(flatMesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 12), colour));
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

  const load = (name: string, fallback: () => THREE.Group) =>
    assets.loadOrFallback(`${MODELS}/${name}.glb`, fallback, onDiagnostic);
  const [house, ground, backdrop, downpipe, gutterModel, frame, valve, ...layerModels] =
    await Promise.all([
      load('sundargram-house', fallbackHouse),
      load('courtyard-ground', fallbackGround),
      load('village-backdrop', () => new THREE.Group()),
      load('downpipe', fallbackDownpipe),
      load('gutter-piece', fallbackGutter),
      load('filter-unit', fallbackFrame),
      load('flush-valve', fallbackValve),
      ...FILTER_LAYERS.map(layer => load(layer.model, fallbackLayer(layer.colour))),
    ]);
  ground.traverse(child => {
    child.receiveShadow = true;
  });
  house.traverse(child => {
    child.castShadow = true;
  });
  downpipe.position.set(2.25, EAVE_Y, EAVE_Z);
  frame.position.set(TANK.x, TANK_TOP_Y, TANK.z);
  valve.position.copy(VALVE_POSITION);
  valve.name = 'first-flush-valve';
  root.add(ground, backdrop, house, downpipe, frame, valve);

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

  const work = new THREE.Group();
  work.name = 'work-area';
  root.add(work);
  const bench = flatMesh(benchGeometry(), 0x7a5233);
  bench.position.copy(TABLE);
  work.add(bench);

  const pieceTargets = new Map<string, THREE.Object3D>();
  const socketTargets = new Map<string, THREE.Object3D>();
  const restPositions = new Map<string, THREE.Vector3>();
  const socketPositions = new Map<string, THREE.Vector3>();
  const ribbons = new Map<string, ReturnType<typeof createFlowRibbon>>();
  const socketMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc23d,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const gutterSocketGeometry = new THREE.BoxGeometry(1.06, 0.2, 0.22);
  const layerSocketGeometry = new THREE.CylinderGeometry(0.33, 0.33, 0.125, 12);

  const addSocket = (id: string, geometry: THREE.BufferGeometry, position: THREE.Vector3) => {
    const socket = new THREE.Mesh(geometry, socketMaterial);
    socket.name = id;
    socket.position.copy(position);
    work.add(socket);
    socketTargets.set(id, socket);
    socketPositions.set(id, position.clone());
    return socket;
  };
  const addPiece = (id: string, model: THREE.Object3D, rest: THREE.Vector3) => {
    model.name = id;
    model.traverse(child => {
      child.castShadow = true;
    });
    model.position.copy(rest);
    work.add(model);
    pieceTargets.set(id, model);
    restPositions.set(id, rest.clone());
  };

  SOCKET_X.forEach((x, index) => {
    const number = index + 1;
    const authored = house.getObjectByName(`Socket_Gutter_${number}`);
    const position = new THREE.Vector3(x, EAVE_Y, EAVE_Z);
    if (authored) authored.getWorldPosition(position);
    const socketId = `gutter-socket-${number}`;
    addSocket(socketId, gutterSocketGeometry, position);
    addPiece(
      `gutter-${number}`,
      gutterModel.clone(),
      new THREE.Vector3(TABLE.x, TABLE_TOP_Y, 3.55 + index * 0.3),
    );
    const ribbon = createFlowRibbon(
      new THREE.LineCurve3(
        new THREE.Vector3(x - 0.54, position.y - 0.035, position.z),
        new THREE.Vector3(x + 0.54, position.y - 0.035, position.z),
      ),
      { width: 0.09, color: 0x8fd2f2, reducedMotion },
    );
    work.add(ribbon.object);
    ribbons.set(socketId, ribbon);
  });

  FILTER_LAYERS.forEach((layer, index) => {
    addSocket(layer.socketId, layerSocketGeometry, new THREE.Vector3(TANK.x, layer.y, TANK.z));
    addPiece(
      layer.pieceId,
      layerModels[index]!,
      new THREE.Vector3(FILTER_TABLE.x, TABLE_TOP_Y + 0.05, FILTER_TABLE.z - 0.45 + index * 0.45),
    );
  });

  const tankStream = createFlowRibbon(
    new THREE.LineCurve3(
      new THREE.Vector3(TANK.x, PIPE_OUTLET_Y, TANK.z),
      new THREE.Vector3(TANK.x, TANK.y + 0.3, TANK.z),
    ),
    { width: 0.07, color: 0x8fd2f2, reducedMotion },
  );
  root.add(tankStream.object);

  // First flush: dirty water leaves the chamber and runs to the road drain.
  const flushStream = createFlowRibbon(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(VALVE_POSITION.x, 1.02, 2.58),
      new THREE.Vector3(VALVE_POSITION.x, 0.05, 2.72),
      new THREE.Vector3(2.5, 0.04, 3.9),
      new THREE.Vector3(2.2, 0.04, 5.45),
    ]),
    { width: 0.1, color: 0x8fd2f2, reducedMotion },
  );
  flushStream.setClarity(0);
  root.add(flushStream.object);

  const rain = createDropletPool({ max: 200, reducedMotion });
  root.add(rain.mesh);

  const targets = new Map<string, THREE.Object3D>([...pieceTargets, ...socketTargets]);

  let state: RainwaterState | null = null;
  let tankLevel = 0;
  let clarity = DIRTY_CLARITY;
  let rainDebt = 0;
  let spillClock = 0;
  let time = 0;
  const emitPoint = new THREE.Vector3();
  const emitVelocity = new THREE.Vector3();
  tankWater.setClarity(clarity);
  tankStream.setClarity(clarity);

  function flushFlowing() {
    return state !== null && state.stage === 'filter' && state.firstFlushOpen && !waterIsClear(state);
  }

  function apply(next: RainwaterState) {
    state = next;
    lighting.setMood(moodFor(next.stage));
    const { stage, assemblies } = next;
    const rainingNow = raining(stage);
    const atFilterOrLater = reached(stage, 'filter');
    bench.visible = stage === 'rooftop' || stage === 'filter';
    bench.position.copy(stage === 'filter' ? FILTER_TABLE : TABLE);
    frame.visible = atFilterOrLater;
    valve.visible = atFilterOrLater;
    valve.rotation.z = next.firstFlushOpen ? -Math.PI / 2 : 0;

    for (const [assembly, activeStage] of [
      [assemblies.rooftop, 'rooftop'],
      [assemblies.filter, 'filter'],
    ] as const) {
      const placedPieces = new Set(Object.values(assembly.placed));
      for (const { id: socketId } of assembly.sockets) {
        const pieceId = assembly.placed[socketId];
        socketTargets.get(socketId)!.visible = stage === activeStage && pieceId === undefined;
        if (pieceId) {
          const piece = pieceTargets.get(pieceId)!;
          piece.position.copy(socketPositions.get(socketId)!);
          piece.visible = true;
        }
        ribbons.get(socketId)?.setFlow(pieceId !== undefined && rainingNow ? 1 : 0);
      }
      for (const pieceId of Object.keys(assembly.pieces)) {
        setClickable(pieceTargets.get(pieceId)!, assembly.picked !== pieceId);
        if (placedPieces.has(pieceId)) continue;
        const piece = pieceTargets.get(pieceId)!;
        piece.visible = stage === activeStage;
        if (assembly.picked !== pieceId) piece.position.copy(restPositions.get(pieceId)!);
      }
    }
    tankStream.setFlow(isAssemblySolved(assemblies.rooftop) && rainingNow ? 1 : 0);
    flushStream.setFlow(flushFlowing() ? 1 : 0);
  }

  function spillCount() {
    return state?.stage === 'rooftop' ? spillingSockets(state).length : 0;
  }

  function update(dt: number) {
    time += dt;
    for (const ribbon of ribbons.values()) ribbon.update(dt);
    tankStream.update(dt);
    flushStream.update(dt);

    if (state && isAssemblySolved(state.assemblies.rooftop)) {
      const clear = waterIsClear(state);
      const levelGoal = clear ? 1 : 0.5;
      tankLevel = reducedMotion
        ? levelGoal
        : Math.min(levelGoal, tankLevel + dt / TANK_FILL_SECONDS);
      tankWater.setFill(tankLevel * (savedLitres(state) > 0 ? 1 : 0));
      const clarityGoal = clear ? 1 : DIRTY_CLARITY;
      const clarityStep = reducedMotion ? 1 : dt / CLEARING_SECONDS;
      clarity += THREE.MathUtils.clamp(clarityGoal - clarity, -clarityStep, clarityStep);
      tankWater.setClarity(clarity);
      tankStream.setClarity(clarity);
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
    pieceTargets,
    socketTargets,
    valve,
    tankFill: () => tankWater.fill(),
    tankClarity: () => clarity,
    flushFlowing,
    spillCount,
    focusFor: (stage: RainwaterStageId) => (stage === 'filter' ? FILTER_FOCUS : WIDE_FOCUS),
    dispose() {
      for (const ribbon of ribbons.values()) ribbon.dispose();
      tankStream.dispose();
      flushStream.dispose();
      rain.dispose();
      tankWater.dispose();
      lighting.dispose();
      disposeObjectTree(root);
      gutterSocketGeometry.dispose();
      layerSocketGeometry.dispose();
      socketMaterial.dispose();
      scene.remove(root);
    },
  };
}

export type RainwaterScene = Awaited<ReturnType<typeof createRainwaterScene>>;
