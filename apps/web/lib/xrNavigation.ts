export type ControllerSelection = 'next' | 'previous' | 'none';

export function resolveControllerSelection(objectName?: string): ControllerSelection {
  if (objectName === 'btn-next') return 'next';
  if (objectName === 'btn-prev') return 'previous';
  return 'none';
}
