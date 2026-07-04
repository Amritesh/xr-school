import type { FocusGuideDirection } from '@/components/simulation-experience/ExperienceFocusGuide';

export interface ProjectedFocusPoint {
  x: number;
  y: number;
  z: number;
}

export interface FocusGuideVisibility {
  direction: FocusGuideDirection;
  visible: boolean;
}

export function resolveFocusGuide(
  point: ProjectedFocusPoint,
  edgeThreshold = 0.72,
): FocusGuideVisibility {
  const outsideDepth = point.z < -1 || point.z > 1;
  const outsideHorizontal = Math.abs(point.x) > edgeThreshold;
  const outsideVertical = Math.abs(point.y) > edgeThreshold;

  if (!outsideDepth && !outsideHorizontal && !outsideVertical) {
    return { direction: 'forward', visible: false };
  }

  if (outsideHorizontal || outsideDepth) {
    return {
      direction: point.x < 0 ? 'left' : 'right',
      visible: true,
    };
  }

  return { direction: 'forward', visible: true };
}
