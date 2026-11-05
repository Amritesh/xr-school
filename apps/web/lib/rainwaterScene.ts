import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isAssemblySolved } from '@xr-school/simulation-runtime';
import {
  RAINWATER_GOAL_LITRES,
  RAINWATER_STAGES,
  SUMMER_NEEDS,
  savedLitres,
  spillingSockets,
  storedLitres,
  waterIsClear,
  type AssemblyStageId,
  type RainwaterStageId,
  type RainwaterState,
} from './rainwaterLesson';
import { STORM, stormResult, type StormState, type StormTarget } from './rainwaterStorm';
import { disposeObjectTree, type GlbAssetLoader } from './world-builder/glbAssets';
import { createStylizedLighting, type StylizedMood } from './world-builder/stylizedKit';
import {
  createDropletPool,
  createFillVolume,
  createFlowRibbon,
} from './world-builder/waterEffects';

const MODELS = '/models/rainwater';
const EAVE_Y = 2.6;
const EAVE_Z = 2.46;
const TANK = new THREE.Vector3(3.05, 0.41, EAVE_Z);
const TANK_TOP_Y = 1.41;
const PIPE_OUTLET_Y = 1.98;
const HOUSE_FILL_SECONDS = 8;
const SCHOOL_FILL_SECONDS = 4;
const CLEARING_SECONDS = 2.5;
const DRAIN_SECONDS = 2;
const DIRTY_CLARITY = 0.15;
const RAIN_PER_SECOND = 130;
const STORM_RAIN_PER_SECOND = 320;
const SPILL_INTERVAL_SECONDS = 0.05;
const LOST_COUNT_SECONDS = 6;
const CHEER_SECONDS = 2.2;
const SETTLE_SECONDS = 3;
const VALVE_POSITION = new THREE.Vector3(2.42, 1.72, 2.56);
const SCHOOL = new THREE.Vector3(-10, 0, -0.5);
const SCHOOL_GUTTER = new THREE.Vector3(-10, 3.26, 2.13);
const SCHOOL_PIPE = new THREE.Vector3(-5.3, 2.15, 2.13);
const SUMP = new THREE.Vector3(-4.4, 0, 2.13);
const CUTAWAY = new THREE.Vector3(8.5, 0, 2.5);
const POND = new THREE.Vector3(-5.5, 0, 7.5);
const FIELD = new THREE.Vector3(5.4, 0, 1.2);
const STATION = new THREE.Vector3(0, 0, 7.2);
const DROPPY_HOME = new THREE.Vector3(1.05, 0.05, 3.7);
const TABLE_TOP_Y = 0.8;

const TABLES: Partial<Record<RainwaterStageId, THREE.Vector3>> = {
  rooftop: new THREE.Vector3(-1.95, 0, 4.0),
  filter: new THREE.Vector3(-0.3, 0, 4.1),
  school: new THREE.Vector3(-7.4, 0, 3.9),
  recharge: new THREE.Vector3(6.2, 0, 3.6),
};

interface Focus {
  position: THREE.Vector3;
  target: THREE.Vector3;
}
const focus = (p: [number, number, number], t: [number, number, number]): Focus => ({
  position: new THREE.Vector3(...p),
  target: new THREE.Vector3(...t),
});
const WIDE_FOCUS = focus([0.1, 2.1, 8.9], [1.15, 1.5, 1.2]);
const FOCI: Partial<Record<RainwaterStageId, Focus>> = {
  filter: focus([0.75, 2.2, 7.2], [1.35, 1.4, 2.6]),
  school: focus([-8.0, 4.4, 12.6], [-6.9, 1.7, 1.8]),
  recharge: focus([7.4, 2.2, 8.4], [8.4, 1.05, 2.6]),
  storm: focus([3.6, 7.4, 17.5], [3.6, 0.9, 3.2]),
  summer: focus([0.6, 2.7, 10.4], [0.3, 1.0, 2.8]),
  finale: focus([0.8, 2.4, 9.2], [1.1, 1.4, 2.4]),
};

/** Where the child stands in VR for each stage. The rig faces -Z, towards the work. */
const VR_SPOTS: Record<RainwaterStageId, THREE.Vector3> = {
  'rainy-day': new THREE.Vector3(0, 0, 7),
  drought: new THREE.Vector3(0, 0, 7),
  rooftop: new THREE.Vector3(-0.3, 0, 7),
  filter: new THREE.Vector3(1.4, 0, 7.2),
  school: new THREE.Vector3(-6, 0, 8.2),
  recharge: new THREE.Vector3(7.5, 0, 7.2),
  storm: new THREE.Vector3(0, 0, 9.6),
  summer: new THREE.Vector3(0, 0, 7.4),
  finale: new THREE.Vector3(1, 0, 6.8),
};

const STORM_TARGETS: { id: StormTarget; label: string; colour: number; channelEnd: THREE.Vector3; labelAt: THREE.Vector3 }[] = [
  { id: 'houseTank', label: '1 House', colour: 0x3fb6e8, channelEnd: new THREE.Vector3(3.05, 0.1, 3.2), labelAt: new THREE.Vector3(3.05, 2.75, 2.46) },
  { id: 'schoolTank', label: '2 School', colour: 0xf2c230, channelEnd: new THREE.Vector3(-4.4, 0.1, 3.2), labelAt: new THREE.Vector3(-4.4, 2, 2.13) },
  { id: 'rechargePit', label: '3 Pit', colour: 0x67c845, channelEnd: new THREE.Vector3(8.5, 0.1, 3.6), labelAt: new THREE.Vector3(8.5, 2.75, 2.5) },
  { id: 'pond', label: '4 Pond', colour: 0xe4476b, channelEnd: new THREE.Vector3(-4.2, 0.1, 7.4), labelAt: new THREE.Vector3(-5.5, 1.3, 7.5) },
];

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

function group(...meshes: THREE.Object3D[]) {
  const result = new THREE.Group();
  result.add(...meshes);
  return result;
}

function fallbackHouse() {
  const walls = flatMesh(new THREE.BoxGeometry(4.8, 2.3, 3.6), 0xf3e7c9);
  walls.position.y = 1.3;
  const roof = flatMesh(new THREE.ConeGeometry(3.6, 1.1, 4), 0xb9573a);
  roof.position.y = 3.1;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  return group(walls, roof);
}

function fallbackGround() {
  const ground = flatMesh(new THREE.CircleGeometry(60, 24), 0x8c8a55);
  ground.rotation.x = -Math.PI / 2;
  return group(ground);
}

function fallbackBox(x: number, y: number, z: number, colour: number) {
  return () => group(flatMesh(new THREE.BoxGeometry(x, y, z), colour));
}

function fallbackDisc(radius: number, height: number, colour: number) {
  return () => group(flatMesh(new THREE.CylinderGeometry(radius, radius, height, 12), colour));
}

function fallbackValve() {
  return group(flatMesh(new THREE.TorusGeometry(0.13, 0.024, 6, 14), 0xe4476b));
}

function fallbackDroppy() {
  const body = flatMesh(new THREE.ConeGeometry(0.3, 0.8, 10), 0x3fb6e8);
  body.position.y = 0.4;
  return group(body);
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

function makeLabel(text: string, colour: number): THREE.Object3D {
  if (typeof document === 'undefined') return new THREE.Object3D();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Object3D();
  context.fillStyle = 'rgba(8,47,73,0.88)';
  context.fillRect(0, 0, 256, 72);
  context.fillStyle = `#${colour.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, 14, 72);
  context.fillStyle = '#ffffff';
  context.font = 'bold 40px sans-serif';
  context.textBaseline = 'middle';
  context.fillText(text, 28, 38);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, fog: false }),
  );
  sprite.scale.set(1.6, 0.45, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export type DroppyMood = 'idle' | 'worried' | 'cheering';

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
  const models = Object.fromEntries(
    await Promise.all(
      (
        [
          ['house', 'sundargram-house', fallbackHouse],
          ['ground', 'courtyard-ground', fallbackGround],
          ['backdrop', 'village-backdrop', () => new THREE.Group()],
          ['downpipe', 'downpipe', fallbackDisc(0.05, 0.6, 0xa7bac6)],
          ['gutter', 'gutter-piece', fallbackBox(1.08, 0.08, 0.15, 0xa7bac6)],
          ['frame', 'filter-unit', fallbackDisc(0.37, 0.035, 0x6f8591)],
          ['valve', 'flush-valve', fallbackValve],
          ['stones', 'filter-stones', fallbackDisc(0.31, 0.1, 0x7a7367)],
          ['sand', 'filter-sand', fallbackDisc(0.31, 0.1, 0xdcc18c)],
          ['charcoal', 'filter-charcoal', fallbackDisc(0.31, 0.1, 0x2b2b2e)],
          ['school', 'school', fallbackBox(8.2, 3.2, 4, 0xf3e7c9)],
          ['schoolGutter', 'school-gutter', fallbackBox(8, 0.1, 0.18, 0xa7bac6)],
          ['schoolPipe', 'school-pipe', fallbackBox(0.14, 2.2, 0.14, 0xa7bac6)],
          ['schoolCover', 'school-tank-cover', fallbackDisc(1, 0.1, 0x7a7367)],
          ['cutaway', 'recharge-cutaway', fallbackBox(3.2, 0.44, 1.8, 0x8c6541)],
          ['largeStones', 'pit-large-stones', fallbackBox(1.32, 0.32, 1.1, 0x7a7367)],
          ['smallStones', 'pit-small-stones', fallbackBox(1.32, 0.32, 1.1, 0x9c9486)],
          ['pitSand', 'pit-sand', fallbackBox(1.32, 0.32, 1.1, 0xdcc18c)],
          ['pond', 'pond', fallbackDisc(1.65, 0.02, 0x8c6541)],
          ['crops', 'crops', fallbackBox(2.4, 0.5, 3.2, 0x4f8a4a)],
          ['station', 'control-station', fallbackBox(3.2, 1.2, 0.3, 0x7a5233)],
          ['leaves', 'leaf-pile', fallbackDisc(0.3, 0.15, 0x4f8a4a)],
          ['droppy', 'droppy', fallbackDroppy],
          ['badge', 'guardian-badge', fallbackDisc(0.26, 0.04, 0xf2c230)],
          ['summerProps', 'summer-props', () => new THREE.Group()],
          ['goat', 'goat', fallbackBox(0.7, 0.5, 0.25, 0xf3e7c9)],
        ] as [string, string, () => THREE.Group][]
      ).map(async ([key, name, fallback]) => [key, await load(name, fallback)] as const),
    ),
  ) as Record<string, THREE.Group>;

  const m = models;
  m.ground!.traverse(child => {
    child.receiveShadow = true;
  });
  for (const caster of [m.house!, m.school!]) {
    caster.traverse(child => {
      child.castShadow = true;
    });
  }
  m.downpipe!.position.set(2.25, EAVE_Y, EAVE_Z);
  m.frame!.position.set(TANK.x, TANK_TOP_Y, TANK.z);
  m.valve!.position.copy(VALVE_POSITION);
  m.valve!.name = 'first-flush-valve';
  m.school!.position.copy(SCHOOL);
  m.cutaway!.position.copy(CUTAWAY);
  m.pond!.position.copy(POND);
  m.crops!.position.copy(FIELD);
  m.station!.position.copy(STATION);
  m.badge!.position.set(DROPPY_HOME.x, 1.3, DROPPY_HOME.z);
  const goats = [m.goat!, m.goat!.clone()];
  goats[0]!.position.set(-3.3, 0, 3.15);
  goats[1]!.position.set(-2.2, 0, 4.0);
  goats[1]!.rotation.y = 1.9;
  root.add(
    m.ground!, m.backdrop!, m.house!, m.downpipe!, m.frame!, m.valve!, m.school!, m.cutaway!,
    m.pond!, m.crops!, m.station!, m.badge!,
  );

  const summer = group(m.summerProps!, ...goats);
  root.add(summer);

  // House tank: a see-through shell so the child can watch their water rise.
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfeaf0,
    roughness: 0.4,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const tankShell = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1, 16, 1, true), shellMaterial);
  tankShell.position.copy(TANK).setY(TANK.y + 0.5);
  const tankWater = createFillVolume({ radius: 0.49, height: 0.97, color: 0x46a7dd });
  tankWater.object.position.copy(TANK).setY(TANK.y + 0.01);
  const sumpShell = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 1, 18, 1, true), shellMaterial);
  sumpShell.position.copy(SUMP).setY(0.5);
  const sumpWater = createFillVolume({ radius: 0.93, height: 0.96, color: 0x46a7dd });
  sumpWater.object.position.copy(SUMP).setY(0.02);
  sumpWater.setClarity(1);
  const pondWater = createFillVolume({ radius: 1.62, height: 0.2, color: 0x3a9bc9 });
  pondWater.object.position.copy(POND).setY(0.03);
  pondWater.setClarity(1);
  const groundwater = createFillVolume({ box: { x: 3.18, z: 0.05 }, height: 0.44, color: 0x3a9bc9 });
  groundwater.object.position.set(CUTAWAY.x, 0.01, CUTAWAY.z + 0.93);
  groundwater.setClarity(1);
  const flood = createFillVolume({ box: { x: 20, z: 2.6 }, height: 0.24, color: 0x5f93a8 });
  flood.object.position.set(0, 0.02, 5.1);
  flood.setClarity(0.45);
  const trough = createFillVolume({ box: { x: 1.4, z: 0.52 }, height: 0.3, color: 0x46a7dd });
  trough.object.position.set(-3.3, 0.07, 3.9);
  trough.setClarity(1);
  const bucketShell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.34, 10, 1, true), flatMaterial());
  bucketShell.position.set(2.15, 0.17, 4.0);
  const bucket = createFillVolume({ radius: 0.18, height: 0.3, color: 0x46a7dd });
  bucket.object.position.set(2.15, 0.02, 4.0);
  bucket.setClarity(1);
  summer.add(trough.object, bucketShell, bucket.object);
  root.add(tankWater.object, tankShell, sumpWater.object, sumpShell, pondWater.object, groundwater.object, flood.object);

  const droppy = m.droppy!;
  droppy.name = 'droppy';
  droppy.position.copy(DROPPY_HOME);
  root.add(droppy);

  // Pieces the child carries, and the glowing places they go.
  const work = new THREE.Group();
  work.name = 'work-area';
  root.add(work);
  const bench = flatMesh(benchGeometry(), 0x7a5233);
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
  const socketGeometries: THREE.BufferGeometry[] = [];
  const geometry = <T extends THREE.BufferGeometry>(made: T): T => {
    socketGeometries.push(made);
    return made;
  };
  const addSocket = (id: string, shape: THREE.BufferGeometry, position: THREE.Vector3) => {
    const socket = new THREE.Mesh(shape, socketMaterial);
    socket.name = id;
    socket.position.copy(position);
    work.add(socket);
    socketTargets.set(id, socket);
    socketPositions.set(id, position.clone());
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
  const addRibbon = (socketId: string, curve: THREE.Curve<THREE.Vector3>, width: number) => {
    const ribbon = createFlowRibbon(curve, { width, color: 0x8fd2f2, reducedMotion });
    work.add(ribbon.object);
    ribbons.set(socketId, ribbon);
  };

  // Rooftop.
  const gutterShape = geometry(new THREE.BoxGeometry(1.06, 0.2, 0.22));
  [-1.65, -0.55, 0.55, 1.65].forEach((x, index) => {
    const number = index + 1;
    const authored = m.house!.getObjectByName(`Socket_Gutter_${number}`);
    const position = new THREE.Vector3(x, EAVE_Y, EAVE_Z);
    if (authored) authored.getWorldPosition(position);
    const socketId = `gutter-socket-${number}`;
    addSocket(socketId, gutterShape, position);
    addPiece(
      `gutter-${number}`,
      m.gutter!.clone(),
      new THREE.Vector3(TABLES.rooftop!.x, TABLE_TOP_Y, 3.55 + index * 0.3),
    );
    addRibbon(
      socketId,
      new THREE.LineCurve3(
        new THREE.Vector3(x - 0.54, position.y - 0.035, position.z),
        new THREE.Vector3(x + 0.54, position.y - 0.035, position.z),
      ),
      0.09,
    );
  });

  // Filter.
  const layerShape = geometry(new THREE.CylinderGeometry(0.33, 0.33, 0.125, 12));
  (
    [
      ['stones', m.stones!, 'filter-top', 1.81],
      ['sand', m.sand!, 'filter-middle', 1.67],
      ['charcoal', m.charcoal!, 'filter-bottom', 1.53],
    ] as const
  ).forEach(([pieceId, model, socketId, y], index) => {
    addSocket(socketId, layerShape, new THREE.Vector3(TANK.x, y, TANK.z));
    addPiece(
      pieceId,
      model,
      new THREE.Vector3(TABLES.filter!.x, TABLE_TOP_Y + 0.05, TABLES.filter!.z - 0.45 + index * 0.45),
    );
  });

  // School: a long gutter, a pipe and the tank cover.
  addSocket('school-gutter-socket', geometry(new THREE.BoxGeometry(8.1, 0.26, 0.28)), SCHOOL_GUTTER);
  addSocket('school-pipe-socket', geometry(new THREE.BoxGeometry(0.34, 2.6, 0.34)), SCHOOL_PIPE);
  addSocket('school-tank-socket', geometry(new THREE.CylinderGeometry(1.03, 1.03, 0.2, 16)), new THREE.Vector3(SUMP.x, 1.03, SUMP.z));
  addPiece('school-gutter', m.schoolGutter!, new THREE.Vector3(-10, 0.14, 3.7));
  addPiece('school-pipe', m.schoolPipe!, new THREE.Vector3(-6.4, 1.3, 3.5));
  addPiece('school-tank', m.schoolCover!, new THREE.Vector3(-7.4, TABLE_TOP_Y, 3.9));
  addRibbon(
    'school-gutter-socket',
    new THREE.LineCurve3(
      new THREE.Vector3(-14, SCHOOL_GUTTER.y - 0.04, SCHOOL_GUTTER.z),
      new THREE.Vector3(-6, SCHOOL_GUTTER.y - 0.04, SCHOOL_GUTTER.z),
    ),
    0.11,
  );

  // Recharge pit: built up inside the cut-open mound.
  const pitShape = geometry(new THREE.BoxGeometry(1.36, 0.34, 1.12));
  (
    [
      ['large-stones', m.largeStones!, 'pit-bottom', 0.62, 1.62],
      ['small-stones', m.smallStones!, 'pit-middle', 1.0, 1.25],
      ['pit-sand', m.pitSand!, 'pit-top', 1.38, 0.88],
    ] as const
  ).forEach(([pieceId, model, socketId, y, restY]) => {
    addSocket(socketId, pitShape, new THREE.Vector3(CUTAWAY.x, y, CUTAWAY.z + 0.35));
    addPiece(pieceId, model, new THREE.Vector3(TABLES.recharge!.x, restY, TABLES.recharge!.z));
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

  const schoolStream = createFlowRibbon(
    new THREE.LineCurve3(new THREE.Vector3(SUMP.x, 1.15, SUMP.z), new THREE.Vector3(SUMP.x, 0.3, SUMP.z)),
    { width: 0.1, color: 0x8fd2f2, reducedMotion },
  );
  root.add(schoolStream.object);
  const pitTrickle = createFlowRibbon(
    new THREE.LineCurve3(
      new THREE.Vector3(CUTAWAY.x, 1.6, CUTAWAY.z + 0.93),
      new THREE.Vector3(CUTAWAY.x, 0.4, CUTAWAY.z + 0.93),
    ),
    { width: 0.09, color: 0x8fd2f2, reducedMotion },
  );
  root.add(pitTrickle.object);

  // The lost rain: roof to road to drain, with one big raindrop to follow.
  const lostCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 2.62, 2.42),
    new THREE.Vector3(-0.2, 0.06, 2.9),
    new THREE.Vector3(-0.6, 0.05, 4.4),
    new THREE.Vector3(-2.5, 0.05, 5.45),
  ]);
  const lostStream = createFlowRibbon(lostCurve, { width: 0.14, color: 0x8fd2f2, reducedMotion });
  root.add(lostStream.object);
  const raindrop = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.14, 1).scale(1, 1.4, 1),
    new THREE.MeshStandardMaterial({ color: 0x6fc9f2, roughness: 0.15, emissive: 0x124a66 }),
  );
  raindrop.visible = false;
  root.add(raindrop);

  // Storm controls and channels.
  const stormTargets = new Map<string, THREE.Object3D>();
  const stormParts = new THREE.Group();
  root.add(stormParts);
  const channels = new Map<StormTarget, ReturnType<typeof createFlowRibbon>>();
  const valves = new Map<StormTarget, THREE.Object3D>();
  const discGeometry = geometry(new THREE.CircleGeometry(0.07, 12));
  const labelObjects: THREE.Object3D[] = [];
  STORM_TARGETS.forEach(({ id, label, colour, channelEnd, labelAt }, index) => {
    const wheel = m.valve!.clone();
    wheel.position.set(0, 0, 0.02);
    const disc = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({ color: colour }));
    disc.position.z = 0.06;
    const control = group(wheel, disc);
    control.name = `valve-${id}`;
    control.position.set(STATION.x - 1.05 + index * 0.7, 1.15, STATION.z + 0.1);
    control.scale.setScalar(2);
    stormParts.add(control);
    stormTargets.set(`valve-${id}`, control);
    valves.set(id, control);
    const channel = createFlowRibbon(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(STATION.x - 1.05 + index * 0.7, 0.06, STATION.z - 0.5),
        new THREE.Vector3(STATION.x - 1.05 + index * 0.7, 0.06, 5.9),
        channelEnd.clone().setY(0.08),
      ]),
      { width: 0.16, color: colour, reducedMotion },
    );
    channel.setClarity(1);
    stormParts.add(channel.object);
    channels.set(id, channel);
    const sign = makeLabel(label, colour);
    sign.position.copy(labelAt);
    stormParts.add(sign);
    labelObjects.push(sign);
  });
  m.leaves!.position.set(STATION.x, 0.1, 6.2);
  m.leaves!.scale.setScalar(2.2);
  m.leaves!.name = 'leaf-block';
  stormParts.add(m.leaves!);
  stormTargets.set('leaf-block', m.leaves!);
  stormParts.visible = false;
  for (const target of stormTargets.values()) target.visible = false;

  const rain = createDropletPool({ max: 200, reducedMotion });
  root.add(rain.mesh);

  const targets = new Map<string, THREE.Object3D>([...pieceTargets, ...socketTargets]);
  const ASSEMBLY_STAGES: AssemblyStageId[] = ['rooftop', 'filter', 'school', 'recharge'];
  const DROUGHT_TINT = new THREE.Color(0xe6c88e);
  const WET_TINT = new THREE.Color(0xf0f4ee);
  const GREEN_TINT = new THREE.Color(0xffffff);

  const tintable: THREE.MeshStandardMaterial[] = [];
  for (const model of [m.ground!, m.backdrop!]) {
    model.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) tintable.push(mesh.material as THREE.MeshStandardMaterial);
    });
  }
  const cropMaterials: THREE.MeshStandardMaterial[] = [];
  m.crops!.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) cropMaterials.push(mesh.material as THREE.MeshStandardMaterial);
  });

  let state: RainwaterState | null = null;
  let storm: StormState | null = null;
  let previousSaved = 0;
  let tankLevel = 0;
  let schoolLevel = 0;
  let groundLevel = 0.25;
  let pond = 0.55;
  let crops = 0.7;
  let troughLevel = 0;
  let bucketLevel = 0;
  let clarity = DIRTY_CLARITY;
  let lostClock = 0;
  let rainDebt = 0;
  let spillClock = 0;
  let cheerUntil = -1;
  let time = 0;
  let nextThunder = 6;
  let flash = 0;
  const emitPoint = new THREE.Vector3();
  const emitVelocity = new THREE.Vector3();
  tankWater.setClarity(clarity);
  tankStream.setClarity(clarity);
  const approach = (value: number, goal: number, rate: number) =>
    reducedMotion ? goal : value + THREE.MathUtils.clamp(goal - value, -rate, rate);

  function flushFlowing() {
    return state !== null && state.stage === 'filter' && state.firstFlushOpen && !waterIsClear(state);
  }

  function apply(next: RainwaterState) {
    state = next;
    const { stage, assemblies } = next;
    const mood = moodFor(stage);
    lighting.setMood(mood);
    const tint = mood === 'drought' ? DROUGHT_TINT : mood === 'restored' ? GREEN_TINT : WET_TINT;
    for (const material of tintable) material.color.copy(tint);
    const rainingNow = raining(stage);
    const table = TABLES[stage];
    bench.visible = table !== undefined;
    if (table) bench.position.copy(table);
    m.frame!.visible = reached(stage, 'filter');
    m.valve!.visible = reached(stage, 'filter');
    m.valve!.rotation.z = next.firstFlushOpen ? -Math.PI / 2 : 0;
    m.station!.visible = stage === 'storm';
    m.badge!.visible = stage === 'finale';
    summer.visible = stage === 'summer' || stage === 'finale';

    for (const activeStage of ASSEMBLY_STAGES) {
      const assembly = assemblies[activeStage];
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
    schoolStream.setFlow(isAssemblySolved(assemblies.school) && rainingNow ? 1 : 0);
    pitTrickle.setFlow(isAssemblySolved(assemblies.recharge) && rainingNow ? 1 : 0);
    lostStream.setFlow(stage === 'rainy-day' && next.observedRunoff ? 1 : 0);
    if (stage !== 'storm') applyStorm(null);

    const saved = savedLitres(next);
    if (saved > previousSaved) cheerUntil = time + CHEER_SECONDS;
    previousSaved = saved;
  }

  function applyStorm(next: StormState | null) {
    storm = next;
    stormParts.visible = next !== null;
    for (const [id, target] of stormTargets) {
      target.visible = next !== null && (id !== 'leaf-block' || next.blocked);
    }
    if (next) {
      for (const { id } of STORM_TARGETS) {
        channels.get(id)!.setFlow(flowingChannel() === id ? 1 : 0);
        const active = next.active === id;
        valves.get(id)!.scale.setScalar(active ? 2.5 : 2);
        valves.get(id)!.rotation.z = active ? -Math.PI / 2 : 0;
      }
    }
  }

  function flowingChannel(): StormTarget | null {
    if (!storm || stormResult(storm).finished || storm.paused) return null;
    if (storm.blocked && storm.blockedFor >= STORM.blockGraceSeconds) return null;
    return storm.levels[storm.active] < STORM.capacities[storm.active] ? storm.active : null;
  }

  function floodLevel() {
    return storm ? THREE.MathUtils.clamp(storm.flooded / (STORM.totalLitres * 0.6), 0, 1) : 0;
  }

  function stormShare(target: StormTarget) {
    return storm ? storm.levels[target] / STORM.capacities[target] : 0;
  }

  function spillCount() {
    return state?.stage === 'rooftop' ? spillingSockets(state).length : 0;
  }

  function lostLitres() {
    return Math.round(RAINWATER_GOAL_LITRES * Math.min(1, lostClock / LOST_COUNT_SECONDS));
  }

  function droppyMood(): DroppyMood {
    if (time < cheerUntil) return 'cheering';
    if (!state) return 'idle';
    if (state.stage === 'drought') return 'worried';
    if (state.stage === 'rainy-day' && state.observedRunoff) return 'worried';
    return 'idle';
  }

  function update(dt: number) {
    time += dt;
    for (const ribbon of ribbons.values()) ribbon.update(dt);
    for (const channel of channels.values()) channel.update(dt);
    for (const stream of [tankStream, flushStream, schoolStream, pitTrickle, lostStream]) {
      stream.update(dt);
    }

    if (state) {
      const { assemblies, stage } = state;
      const settle = dt / SETTLE_SECONDS;

      // Tanks rise as systems come online, then the storm tops them up.
      const clear = waterIsClear(state);
      if (isAssemblySolved(assemblies.rooftop)) {
        if (clear && clarity < 1) {
          // Filtering cannot clean what is already in the tank: empty it first.
          tankLevel = approach(tankLevel, 0, dt / DRAIN_SECONDS);
          if (tankLevel <= 0) clarity = 1;
        } else if (!clear) {
          clarity = approach(clarity, DIRTY_CLARITY, dt / CLEARING_SECONDS);
        }
        if (!clear || clarity >= 1) {
          const goal = Math.min(1, (clear ? 0.5 : 0.25) + stormShare('houseTank') * 0.5);
          tankLevel = approach(tankLevel, Math.max(goal, tankLevel), dt / HOUSE_FILL_SECONDS);
        }
        tankWater.setClarity(clarity);
        tankStream.setClarity(clear ? 1 : DIRTY_CLARITY);
      }
      tankWater.setFill(tankLevel);
      if (isAssemblySolved(assemblies.school)) {
        const goal = Math.min(1, 0.5 + stormShare('schoolTank') * 0.5);
        schoolLevel = approach(schoolLevel, Math.max(goal, schoolLevel), dt / SCHOOL_FILL_SECONDS);
      }
      sumpWater.setFill(schoolLevel);

      const groundGoal = isAssemblySolved(assemblies.recharge)
        ? 0.7 + stormShare('rechargePit') * 0.3
        : 0.25;
      groundLevel = approach(groundLevel, groundGoal, settle);
      groundwater.setFill(groundLevel);

      const stored = THREE.MathUtils.clamp(storedLitres(state) / 8500, 0, 1);
      const pondGoal =
        stage === 'rainy-day'
          ? 0.55
          : stage === 'drought'
            ? 0.08
            : reached(stage, 'summer')
              ? 0.35 + stored * 0.65
              : 0.5 + stormShare('pond') * 0.5;
      pond = approach(pond, pondGoal, settle);
      pondWater.setFill(pond);

      const garden = state.allocated.garden / SUMMER_NEEDS.garden;
      const cropGoal =
        stage === 'drought'
          ? 0.15
          : reached(stage, 'summer')
            ? 0.3 + garden * 0.7
            : isAssemblySolved(assemblies.recharge)
              ? 0.85
              : 0.7;
      crops = approach(crops, cropGoal, settle);
      m.crops!.scale.y = 0.35 + crops * 0.65;
      for (const material of cropMaterials) material.color.setRGB(1, 0.72 + crops * 0.28, 0.45 + crops * 0.55);

      troughLevel = approach(troughLevel, state.allocated.animals / SUMMER_NEEDS.animals, settle);
      trough.setFill(troughLevel);
      bucketLevel = approach(bucketLevel, state.allocated.cleaning / SUMMER_NEEDS.cleaning, settle);
      bucket.setFill(bucketLevel);

      if (stage === 'rainy-day' && state.observedRunoff) {
        lostClock = reducedMotion ? LOST_COUNT_SECONDS : Math.min(LOST_COUNT_SECONDS, lostClock + dt);
        const progress = (lostClock / LOST_COUNT_SECONDS) % 1;
        raindrop.visible = !reducedMotion && lostClock < LOST_COUNT_SECONDS;
        if (raindrop.visible) raindrop.position.copy(lostCurve.getPoint(progress));
      } else {
        raindrop.visible = false;
      }
    }

    flood.setFill(floodLevel());

    const intensity = storm ? storm.elapsed / STORM.durationSeconds : 0;
    if (state && raining(state.stage)) {
      const rate = storm
        ? RAIN_PER_SECOND + (STORM_RAIN_PER_SECOND - RAIN_PER_SECOND) * intensity
        : RAIN_PER_SECOND;
      rainDebt += rate * Math.min(dt, 0.1);
      while (rainDebt >= 1) {
        rainDebt -= 1;
        emitPoint.set((Math.random() - 0.5) * 24, 7 + Math.random() * 2, (Math.random() - 0.5) * 14 + 3);
        rain.emit(emitPoint, emitVelocity.set(0, -9 - intensity * 4, 0));
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

    // Thunder gets more frequent as the storm builds. Never flashes with reduced motion.
    if (storm && !storm.paused && !reducedMotion) {
      nextThunder -= dt;
      if (nextThunder <= 0) {
        flash = 1;
        nextThunder = 9 - intensity * 5 + Math.random() * 3;
      }
    }
    flash = Math.max(0, flash - dt * 4);
    lighting.setFlash(flash);

    const mood = droppyMood();
    if (!reducedMotion) {
      const bob = Math.sin(time * 1.8);
      if (mood === 'cheering') {
        droppy.position.y = DROPPY_HOME.y + Math.abs(Math.sin(time * 7)) * 0.32;
        droppy.rotation.y = Math.sin(time * 5) * 0.35;
        droppy.scale.set(1, 1, 1);
      } else if (mood === 'worried') {
        droppy.position.y = DROPPY_HOME.y;
        droppy.rotation.y = Math.sin(time * 2.4) * 0.45;
        droppy.scale.set(1.08, 0.86, 1.08);
      } else {
        droppy.position.y = DROPPY_HOME.y + bob * 0.05;
        droppy.rotation.y = bob * 0.1;
        droppy.scale.set(1 + bob * 0.015, 1 - bob * 0.015, 1 + bob * 0.015);
      }
      if (m.badge!.visible) m.badge!.rotation.y = time * 0.9;
    } else {
      droppy.scale.setScalar(1);
      droppy.rotation.y = 0;
      droppy.position.y = DROPPY_HOME.y;
    }
  }

  return {
    apply,
    applyStorm,
    update,
    targets,
    pieceTargets,
    socketTargets,
    stormTargets,
    valve: m.valve!,
    badge: m.badge!,
    tankFill: () => tankWater.fill(),
    tankClarity: () => clarity,
    schoolTankFill: () => sumpWater.fill(),
    groundwaterLevel: () => groundLevel,
    pondLevel: () => pond,
    cropHealth: () => crops,
    troughFill: () => troughLevel,
    bucketFill: () => bucketLevel,
    lostLitres,
    flowingChannel,
    floodLevel,
    droppyMood,
    flushFlowing,
    spillCount,
    focusFor: (stage: RainwaterStageId) => FOCI[stage] ?? WIDE_FOCUS,
    vrSpotFor: (stage: RainwaterStageId) => VR_SPOTS[stage],
    dispose() {
      for (const ribbon of ribbons.values()) ribbon.dispose();
      for (const channel of channels.values()) channel.dispose();
      for (const stream of [tankStream, flushStream, schoolStream, pitTrickle, lostStream]) {
        stream.dispose();
      }
      for (const volume of [tankWater, sumpWater, pondWater, groundwater, flood, trough, bucket]) {
        volume.dispose();
      }
      rain.dispose();
      lighting.dispose();
      disposeObjectTree(root);
      for (const shape of socketGeometries) shape.dispose();
      socketMaterial.dispose();
      shellMaterial.dispose();
      for (const label of labelObjects) {
        const sprite = label as THREE.Sprite;
        sprite.material?.map?.dispose();
        sprite.material?.dispose();
      }
      scene.remove(root);
    },
  };
}

function flatMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x8f9ba3, roughness: 0.6, side: THREE.DoubleSide });
}

export type RainwaterScene = Awaited<ReturnType<typeof createRainwaterScene>>;
