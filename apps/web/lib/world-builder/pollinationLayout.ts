import {
  checkClearance,
  createAnchor,
  isWithinFootprint,
  placeOnSurface,
  type Vec3Tuple,
} from './anchoredPlacement';

const tableSurfaceY = 0.905;
const bedSoilSurfaceY = 0.31;

export const POLLINATION_ANCHORS = {
  treatmentBed: createAnchor({
    id: 'treatment-bed-soil',
    position: [-2.35, bedSoilSurfaceY, -1.05],
    footprint: { width: 2.55, depth: 2.6 },
  }),
  controlBed: createAnchor({
    id: 'control-bed-soil',
    position: [2.35, bedSoilSurfaceY, -1.05],
    footprint: { width: 2.55, depth: 2.6 },
  }),
  fieldTable: createAnchor({
    id: 'field-table-top',
    position: [2.9, tableSurfaceY, 1.7],
    footprint: { width: 1.7, depth: 0.78 },
  }),
  soilWindow: createAnchor({
    id: 'soil-observation-window',
    position: [-2.7, 0.38, 2.9],
    footprint: { width: 1.36, depth: 0.28 },
  }),
  observationBay: createAnchor({
    id: 'observation-cutaway-bay',
    position: [0, 0.95, -1.25],
    footprint: { width: 2.4, depth: 1.2 },
  }),
} as const;

const treatmentFlower = placeOnSurface(POLLINATION_ANCHORS.treatmentBed, {
  contactHeight: 0,
  localOffset: [0, 0, 0],
});
const controlFlower = placeOnSurface(POLLINATION_ANCHORS.controlBed, {
  contactHeight: 0,
  localOffset: [0, 0, 0],
});

const toolRoot: Vec3Tuple = [2.9, 0, 1.7];
const toolLocal = {
  brush: [-0.45, 0.94, 0.03],
  lens: [-0.06, 1.04, 0.03],
  'watering-can': [0.48, 0.91, -0.02],
  trowel: [0.04, 0.94, -0.18],
  'time-lapse-dial': [0.43, 0.94, 0.25],
  'field-tags': [-0.2, 0.96, 0.27],
} satisfies Record<string, Vec3Tuple>;

function addVec3(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export const POLLINATION_LAYOUT = {
  treatmentFlower: {
    anchorId: treatmentFlower.anchorId,
    position: treatmentFlower.position,
    height: 0.92,
  },
  controlFlower: {
    anchorId: controlFlower.anchorId,
    position: controlFlower.position,
    height: 0.88,
  },
  beeFlightCenter: [-2.35, 1.35, -1.06] as Vec3Tuple,
  fruit: {
    anchorId: 'treatment-flower-head',
    position: [-2.35, 1.22, -1.05] as Vec3Tuple,
  },
  pollenCloudOrigin: [-2.35, 1.43, -1.05] as Vec3Tuple,
  pistilCutaway: {
    anchorId: POLLINATION_ANCHORS.observationBay.id,
    position: [0, 0.56, -1.1] as Vec3Tuple,
    scale: 1.55,
  },
  germinationCutaway: {
    anchorId: POLLINATION_ANCHORS.observationBay.id,
    position: POLLINATION_ANCHORS.observationBay.position,
    scale: 1.75,
  },
  toolRoot: {
    anchorId: POLLINATION_ANCHORS.fieldTable.id,
    position: toolRoot,
  },
  toolLocal,
  toolWorld: Object.fromEntries(
    Object.entries(toolLocal).map(([id, position]) => [id, addVec3(toolRoot, position)]),
  ) as Record<keyof typeof toolLocal, Vec3Tuple>,
} as const;

export function pollinationLayoutDiagnostics() {
  const flowerDiagnostics = [
    {
      id: 'treatment-flower',
      anchor: POLLINATION_ANCHORS.treatmentBed,
      position: POLLINATION_LAYOUT.treatmentFlower.position,
    },
    {
      id: 'control-flower',
      anchor: POLLINATION_ANCHORS.controlBed,
      position: POLLINATION_LAYOUT.controlFlower.position,
    },
  ].map(item => ({
    id: item.id,
    anchorId: item.anchor.id,
    withinFootprint: isWithinFootprint(item.anchor, item.position, 0.32),
  }));

  const toolDiagnostics = ([
    ['brush', 0.035],
    ['lens', 0.135],
    ['watering-can', 0.005],
    ['trowel', 0.035],
    ['time-lapse-dial', 0.035],
  ] as const).map(([id, contactHeight]) => {
    const position = POLLINATION_LAYOUT.toolWorld[id];
    const expectedY = POLLINATION_ANCHORS.fieldTable.position[1] + contactHeight;
    return {
      id,
      anchorId: POLLINATION_ANCHORS.fieldTable.id,
      onSurface: Math.abs(position[1] - expectedY) < 0.012,
    };
  });

  const clearanceFailures = checkClearance([
    { id: 'fruit', position: POLLINATION_LAYOUT.fruit.position, radius: 0.2 },
    {
      id: 'planting-soil-window',
      position: POLLINATION_ANCHORS.soilWindow.position,
      radius: 0.46,
    },
    {
      id: 'germination-cutaway',
      position: POLLINATION_LAYOUT.germinationCutaway.position,
      radius: 0.72,
    },
  ], 0.08);

  return {
    flowers: flowerDiagnostics,
    tools: toolDiagnostics,
    clearanceFailures,
  };
}
