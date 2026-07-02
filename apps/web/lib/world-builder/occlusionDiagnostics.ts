import type { NormalizedRect } from '../../../../packages/simulation-schema/src/index';

function area(rect: NormalizedRect) {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function validRect(rect: NormalizedRect) {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0
    && rect.height > 0;
}

export function occlusionRatio(
  focus: NormalizedRect,
  overlay: NormalizedRect,
) {
  if (!validRect(focus) || !validRect(overlay)) {
    throw new Error('Occlusion diagnostic requires finite positive rectangles');
  }
  const width = Math.max(
    0,
    Math.min(focus.x + focus.width, overlay.x + overlay.width)
      - Math.max(focus.x, overlay.x),
  );
  const height = Math.max(
    0,
    Math.min(focus.y + focus.height, overlay.y + overlay.height)
      - Math.max(focus.y, overlay.y),
  );
  return (width * height) / area(focus);
}

export function verifyClearView(
  focus: NormalizedRect,
  overlays: NormalizedRect[],
  maximumOcclusionRatio: number,
) {
  if (!Number.isFinite(maximumOcclusionRatio)
    || maximumOcclusionRatio < 0
    || maximumOcclusionRatio > 1) {
    throw new Error('Maximum occlusion ratio must be between 0 and 1');
  }
  return overlays.flatMap((overlay, index) => {
    const ratio = occlusionRatio(focus, overlay);
    return ratio > maximumOcclusionRatio
      ? [`overlay ${index + 1} occludes ${(ratio * 100).toFixed(1)}% of the focus region`]
      : [];
  });
}
