export type ControllerSelection = 'next' | 'previous' | 'none';

export function resolveControllerSelection(objectName?: string): ControllerSelection {
  if (objectName === 'btn-next') return 'next';
  if (objectName === 'btn-prev') return 'previous';
  return 'none';
}

const SNAP_TURN_DEAD_ZONE = 0.65;
const SNAP_TURN_RESET_ZONE = 0.25;
const SNAP_TURN_RADIANS = Math.PI / 6;

export function updateSnapTurn(axisX: number, latched: boolean) {
  if (Math.abs(axisX) <= SNAP_TURN_RESET_ZONE) {
    return { radians: 0, latched: false };
  }
  if (latched || Math.abs(axisX) < SNAP_TURN_DEAD_ZONE) {
    return { radians: 0, latched };
  }
  return {
    radians: axisX > 0 ? -SNAP_TURN_RADIANS : SNAP_TURN_RADIANS,
    latched: true,
  };
}
