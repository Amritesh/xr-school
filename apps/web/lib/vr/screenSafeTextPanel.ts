import * as THREE from 'three';

export interface FittedTextLayoutOptions {
  width: number;
  height: number;
  maxFontSize: number;
  minFontSize?: number;
  lineHeightRatio?: number;
  maxLines?: number;
}

export interface FittedTextLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  height: number;
  truncated: boolean;
}

type MeasureTextAtSize = (text: string, fontSize: number) => number;

function splitLongToken(
  token: string,
  fontSize: number,
  maxWidth: number,
  measure: MeasureTextAtSize,
): string[] {
  if (measure(token, fontSize) <= maxWidth) return [token];
  const pieces: string[] = [];
  let piece = '';
  for (const character of token) {
    const candidate = `${piece}${character}`;
    if (piece && measure(candidate, fontSize) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece = candidate;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function wrapAtSize(
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: MeasureTextAtSize,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.trim().split(/\n+/);
  for (const paragraph of paragraphs) {
    const tokens = paragraph.trim().split(/\s+/).filter(Boolean)
      .flatMap(token => splitLongToken(token, fontSize, maxWidth, measure));
    let line = '';
    for (const token of tokens) {
      const candidate = line ? `${line} ${token}` : token;
      if (line && measure(candidate, fontSize) > maxWidth) {
        lines.push(line);
        line = token;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function ellipsize(
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: MeasureTextAtSize,
): string {
  const ellipsis = '…';
  if (measure(text, fontSize) <= maxWidth) return text;
  let value = text;
  while (value && measure(`${value}${ellipsis}`, fontSize) > maxWidth) {
    value = value.slice(0, -1).trimEnd();
  }
  return `${value}${ellipsis}`;
}

export function fitTextLines(
  text: string,
  measure: MeasureTextAtSize,
  options: FittedTextLayoutOptions,
): FittedTextLayout {
  const minFontSize = Math.max(8, options.minFontSize ?? 13);
  const maxFontSize = Math.max(minFontSize, options.maxFontSize);
  const lineHeightRatio = options.lineHeightRatio ?? 1.24;
  const configuredMaxLines = options.maxLines ?? Number.POSITIVE_INFINITY;
  let finalLines: string[] = [];

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const lineHeight = Math.ceil(fontSize * lineHeightRatio);
    const availableLines = Math.max(
      1,
      Math.min(configuredMaxLines, Math.floor(options.height / lineHeight)),
    );
    const lines = wrapAtSize(text, fontSize, options.width, measure);
    finalLines = lines;
    if (lines.length <= availableLines) {
      return {
        lines,
        fontSize,
        lineHeight,
        height: lines.length * lineHeight,
        truncated: false,
      };
    }
  }

  const fontSize = minFontSize;
  const lineHeight = Math.ceil(fontSize * lineHeightRatio);
  const availableLines = Math.max(
    1,
    Math.min(configuredMaxLines, Math.floor(options.height / lineHeight)),
  );
  const visibleLines = finalLines.slice(0, availableLines);
  if (finalLines.length > availableLines && visibleLines.length > 0) {
    const finalIndex = visibleLines.length - 1;
    visibleLines[finalIndex] = ellipsize(
      visibleLines[finalIndex],
      fontSize,
      options.width,
      measure,
    );
  }
  return {
    lines: visibleLines,
    fontSize,
    lineHeight,
    height: visibleLines.length * lineHeight,
    truncated: finalLines.length > visibleLines.length,
  };
}

export interface DrawFittedTextOptions extends FittedTextLayoutOptions {
  x: number;
  y: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
  align?: CanvasTextAlign;
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  options: DrawFittedTextOptions,
): FittedTextLayout {
  const fontFamily = options.fontFamily ?? 'system-ui, sans-serif';
  const fontWeight = options.fontWeight ?? 500;
  const measure = (value: string, fontSize: number) => {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    return context.measureText(value).width;
  };
  const layout = fitTextLines(text, measure, options);
  context.save();
  context.beginPath();
  context.rect(options.x, options.y, options.width, options.height);
  context.clip();
  context.fillStyle = options.color;
  context.font = `${fontWeight} ${layout.fontSize}px ${fontFamily}`;
  context.textAlign = options.align ?? 'left';
  context.textBaseline = 'top';
  const verticalAlign = options.verticalAlign ?? 'top';
  const offsetY = verticalAlign === 'middle'
    ? Math.max(0, (options.height - layout.height) / 2)
    : verticalAlign === 'bottom'
      ? Math.max(0, options.height - layout.height)
      : 0;
  const drawX = context.textAlign === 'center'
    ? options.x + options.width / 2
    : context.textAlign === 'right' || context.textAlign === 'end'
      ? options.x + options.width
      : options.x;
  layout.lines.forEach((line, index) => {
    context.fillText(
      line,
      drawX,
      options.y + offsetY + index * layout.lineHeight,
    );
  });
  context.restore();
  return layout;
}

export interface ScreenSafePanelFollowerOptions {
  panelWidth: number;
  panelHeight: number;
  distance?: number;
  widthFraction?: number;
  heightFraction?: number;
  marginFraction?: number;
  horizontal?: 'left' | 'center' | 'right';
  vertical?: 'top' | 'center' | 'bottom';
  smoothing?: number;
  renderOrder?: number;
}

function projectionFrame(camera: THREE.Camera) {
  const arrayCamera = camera as THREE.ArrayCamera;
  const projectionCamera = arrayCamera.isArrayCamera && arrayCamera.cameras.length > 0
    ? arrayCamera.cameras[0]
    : camera;
  const matrix = projectionCamera.projectionMatrix.elements;
  const verticalFov = 2 * Math.atan(1 / Math.max(1e-6, Math.abs(matrix[5])));
  const aspect = Math.max(0.2, Math.abs(matrix[5] / Math.max(1e-6, matrix[0])));
  return { verticalFov, aspect };
}

export function createScreenSafePanelFollower(
  panel: THREE.Object3D,
  options: ScreenSafePanelFollowerOptions,
) {
  const distance = options.distance ?? 2.15;
  const widthFraction = options.widthFraction ?? 0.62;
  const heightFraction = options.heightFraction ?? 0.27;
  const marginFraction = options.marginFraction ?? 0.045;
  const smoothing = Math.max(0, options.smoothing ?? 14);
  const cameraPosition = new THREE.Vector3();
  const cameraQuaternion = new THREE.Quaternion();
  const desiredPosition = new THREE.Vector3();
  const desiredQuaternion = new THREE.Quaternion();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  let placed = false;

  panel.renderOrder = options.renderOrder ?? 80;
  panel.traverse(object => {
    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      material.depthTest = false;
      material.depthWrite = false;
      material.transparent = true;
    }
    object.renderOrder = options.renderOrder ?? 80;
  });

  function update(camera: THREE.Camera, deltaSeconds = 1 / 60) {
    const { verticalFov, aspect } = projectionFrame(camera);
    const viewportHeight = 2 * Math.tan(verticalFov / 2) * distance;
    const viewportWidth = viewportHeight * aspect;
    const scale = Math.min(
      viewportWidth * widthFraction / options.panelWidth,
      viewportHeight * heightFraction / options.panelHeight,
    );
    const displayedWidth = options.panelWidth * scale;
    const displayedHeight = options.panelHeight * scale;
    const marginX = viewportWidth * marginFraction;
    const marginY = viewportHeight * marginFraction;
    const horizontalOffset = options.horizontal === 'center'
      ? 0
      : options.horizontal === 'right'
        ? viewportWidth / 2 - displayedWidth / 2 - marginX
        : -viewportWidth / 2 + displayedWidth / 2 + marginX;
    const verticalOffset = options.vertical === 'center'
      ? 0
      : options.vertical === 'bottom'
        ? -viewportHeight / 2 + displayedHeight / 2 + marginY
        : viewportHeight / 2 - displayedHeight / 2 - marginY;

    camera.getWorldPosition(cameraPosition);
    camera.getWorldQuaternion(cameraQuaternion);
    forward.set(0, 0, -1).applyQuaternion(cameraQuaternion);
    right.set(1, 0, 0).applyQuaternion(cameraQuaternion);
    up.set(0, 1, 0).applyQuaternion(cameraQuaternion);
    desiredPosition.copy(cameraPosition)
      .addScaledVector(forward, distance)
      .addScaledVector(right, horizontalOffset)
      .addScaledVector(up, verticalOffset);
    desiredQuaternion.copy(cameraQuaternion);

    if (!placed || smoothing === 0) {
      panel.position.copy(desiredPosition);
      panel.quaternion.copy(desiredQuaternion);
      placed = true;
    } else {
      const alpha = 1 - Math.exp(-smoothing * Math.max(0, deltaSeconds));
      panel.position.lerp(desiredPosition, alpha);
      panel.quaternion.slerp(desiredQuaternion, alpha);
    }
    panel.scale.setScalar(scale);
  }

  function reset() {
    placed = false;
  }

  return { update, reset };
}

export type ScreenSafePanelFollower = ReturnType<typeof createScreenSafePanelFollower>;
