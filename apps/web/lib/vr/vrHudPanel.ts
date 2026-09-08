import * as THREE from 'three';
import { drawFittedText } from './screenSafeTextPanel';

/**
 * In-scene instruction/completion card for VR.
 *
 * Every simulation's guidance (stage cue, next action, completion summary)
 * is DOM in browser mode, and DOM is never composited into an immersive
 * WebXR session — which is why QA saw no instruction cards in any headset.
 * This panel renders the same guidance onto a CanvasTexture mesh that
 * lazily follows the learner: it stays at a comfortable reading distance
 * in front of them and re-centres itself when they turn or walk away.
 */

export type VrHudButtonId =
  | 'previous'
  | 'next'
  | 'choice-a'
  | 'choice-b'
  | 'choice-c'
  | 'help'
  | 'replay'
  | 'restart'
  | 'exit';

export interface VrHudChoice {
  label: string;
}

export interface VrHudContent {
  /** Small line above the title, e.g. "Stage 2 / 8". */
  eyebrow: string;
  title: string;
  body: string;
  /** Amber "do this next" line under the body. */
  hint?: string;
  /** "Today you learned" list for the completion screen. */
  bullets?: string[];
  /** Up to three authored answer labels, selected through choice A/B/C. */
  choices?: VrHudChoice[];
  buttons: VrHudButtonId[];
}

const BUTTON_STYLE: Record<VrHudButtonId, { label: string; color: string }> = {
  previous: { label: '◀ Previous', color: '#94a3b8' },
  next: { label: 'Next ▶', color: '#fbbf24' },
  'choice-a': { label: 'A', color: '#38bdf8' },
  'choice-b': { label: 'B', color: '#38bdf8' },
  'choice-c': { label: 'C', color: '#38bdf8' },
  help: { label: '? Help', color: '#c084fc' },
  replay: { label: '⟲ Replay Narration', color: '#4ade80' },
  restart: { label: '↻ Restart', color: '#fb923c' },
  exit: { label: '✕ Exit Simulation', color: '#f87171' },
};

const PANEL_WIDTH = 1.3;
const PANEL_HEIGHT = 0.82;
const BUTTON_WIDTH = 0.42;
const BUTTON_HEIGHT = 0.115;
const BUTTON_GAP = 0.03;
const FOLLOW_DISTANCE = 1.7;
const CONTROLS_FOOTER = 'Trigger: select · Right stick: turn · Left stick: move · B: back';

function makeButtonTexture(id: VrHudButtonId) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 104;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { label, color } = BUTTON_STYLE[id];
    ctx.fillStyle = 'rgba(7, 17, 31, 0.96)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface VrHudPanelConfig {
  scene: THREE.Scene;
}

export function createVrHudPanel(config: VrHudPanelConfig) {
  const group = new THREE.Group();
  group.name = 'vr-hud';
  group.visible = false;
  config.scene.add(group);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const panelMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT),
    panelMaterial,
  );
  panel.name = 'vr-hud-panel';
  panel.renderOrder = 30;
  group.add(panel);

  const buttons = {} as Record<VrHudButtonId, THREE.Mesh>;
  const buttonResources: Array<{ dispose(): void }> = [];
  for (const id of Object.keys(BUTTON_STYLE) as VrHudButtonId[]) {
    const buttonTexture = makeButtonTexture(id);
    const material = new THREE.MeshBasicMaterial({
      map: buttonTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(BUTTON_WIDTH, BUTTON_HEIGHT);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `vr-hud-${id}`;
    mesh.renderOrder = 31;
    mesh.visible = false;
    group.add(mesh);
    buttons[id] = mesh;
    buttonResources.push(buttonTexture, material, geometry);
  }

  let contentKey = '';

  function draw(content: VrHudContent) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(7, 17, 31, 0.94)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    drawFittedText(ctx, content.eyebrow, {
      x: 40, y: 34, width: w - 80, height: 34,
      color: '#7dd3fc', fontWeight: 800, maxFontSize: 26, minFontSize: 19,
      maxLines: 1,
    });
    drawFittedText(ctx, content.title, {
      x: 40, y: 79, width: w - 80, height: 104,
      color: '#f8fafc', fontWeight: 800, maxFontSize: 46, minFontSize: 28,
      maxLines: 2, verticalAlign: 'middle',
    });
    drawFittedText(ctx, content.body, {
      x: 40, y: 196, width: w - 80, height: 137,
      color: '#d1d5db', maxFontSize: 29, minFontSize: 18,
      maxLines: 5,
    });

    const detailTop = 346;
    const detailBottom = content.hint ? 532 : 580;
    const detailHeight = detailBottom - detailTop;
    if (content.choices?.length) {
      const authoredChoices = content.choices.slice(0, 3);
      const gap = 6;
      const rowHeight = Math.max(
        44,
        (detailHeight - gap * Math.max(0, authoredChoices.length - 1))
          / Math.max(1, authoredChoices.length),
      );
      authoredChoices.forEach((choice, index) => {
        drawFittedText(ctx, `${String.fromCharCode(65 + index)}. ${choice.label}`, {
          x: 48,
          y: detailTop + index * (rowHeight + gap),
          width: w - 96,
          height: rowHeight,
          color: '#bae6fd',
          fontWeight: 750,
          maxFontSize: 25,
          minFontSize: 14,
          maxLines: 3,
          verticalAlign: 'middle',
        });
      });
    } else if (content.bullets?.length) {
      drawFittedText(ctx, content.bullets.slice(0, 6).map(item => `• ${item}`).join('\n'), {
        x: 48, y: detailTop, width: w - 96, height: detailHeight,
        color: '#fde68a', maxFontSize: 27, minFontSize: 15,
        maxLines: 8, lineHeightRatio: 1.2,
      });
    }

    if (content.hint) {
      drawFittedText(ctx, content.hint, {
        x: 40, y: 538, width: w - 80, height: 48,
        color: '#fbbf24', fontWeight: 800, maxFontSize: 29, minFontSize: 17,
        maxLines: 2, verticalAlign: 'middle',
      });
    }

    drawFittedText(ctx, CONTROLS_FOOTER, {
      x: 40, y: 602, width: w - 80, height: 24,
      color: '#94a3b8', maxFontSize: 21, minFontSize: 16,
      maxLines: 1, verticalAlign: 'middle',
    });
    texture.needsUpdate = true;
  }

  function positionRow(ids: VrHudButtonId[], y: number) {
    const total = ids.length * BUTTON_WIDTH + Math.max(0, ids.length - 1) * BUTTON_GAP;
    ids.forEach((id, index) => {
      buttons[id].position.set(
        -total / 2 + BUTTON_WIDTH / 2 + index * (BUTTON_WIDTH + BUTTON_GAP),
        y,
        0.01,
      );
    });
  }

  function layoutButtons(content: VrHudContent) {
    const choiceIds = (['choice-a', 'choice-b', 'choice-c'] as const)
      .slice(0, Math.min(content.choices?.length ?? 0, 3));
    const controlIds = content.buttons.filter(id => !id.startsWith('choice-'));
    const visibleIds = new Set<VrHudButtonId>([...choiceIds, ...controlIds]);
    for (const id of Object.keys(buttons) as VrHudButtonId[]) {
      const mesh = buttons[id];
      mesh.visible = visibleIds.has(id);
    }
    const firstRowY = -PANEL_HEIGHT / 2 - BUTTON_HEIGHT / 2 - 0.035;
    positionRow([...choiceIds], firstRowY);
    const controlStartY = choiceIds.length ? firstRowY - BUTTON_HEIGHT - BUTTON_GAP : firstRowY;
    for (let offset = 0; offset < controlIds.length; offset += 3) {
      positionRow(
        controlIds.slice(offset, offset + 3),
        controlStartY - Math.floor(offset / 3) * (BUTTON_HEIGHT + BUTTON_GAP),
      );
    }
  }

  function setContent(content: VrHudContent) {
    const key = JSON.stringify(content);
    if (key === contentKey) return;
    contentKey = key;
    draw(content);
    layoutButtons(content);
  }

  // ── Lazy follow ──────────────────────────────────────────────────────
  const headPosition = new THREE.Vector3();
  const headForward = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const toPanel = new THREE.Vector3();
  let placed = false;
  let gliding = false;

  function update(camera: THREE.Camera, deltaSeconds: number) {
    if (!group.visible) return;
    camera.getWorldPosition(headPosition);
    camera.getWorldDirection(headForward);
    headForward.y = 0;
    if (headForward.lengthSq() < 1e-6) headForward.set(0, 0, -1);
    headForward.normalize();
    desired.copy(headPosition)
      .addScaledVector(headForward, FOLLOW_DISTANCE);
    desired.y = headPosition.y - 0.1;

    if (!placed) {
      group.position.copy(desired);
      placed = true;
    } else if (!gliding) {
      // Re-centre only once the card has drifted well out of view, so it
      // reads as a steady sign rather than something glued to the face.
      toPanel.copy(group.position).sub(headPosition);
      toPanel.y = 0;
      const distance = toPanel.length();
      const angle = distance > 1e-3 ? toPanel.normalize().angleTo(headForward) : 0;
      if (angle > 0.65 || distance > FOLLOW_DISTANCE * 1.5 || distance < FOLLOW_DISTANCE * 0.5) {
        gliding = true;
      }
    }
    if (gliding) {
      const t = 1 - Math.exp(-5 * deltaSeconds);
      group.position.lerp(desired, t);
      if (group.position.distanceTo(desired) < 0.04) gliding = false;
    }
    group.lookAt(headPosition);
  }

  function setVisible(visible: boolean) {
    if (group.visible === visible) return;
    group.visible = visible;
    if (!visible) {
      placed = false;
      gliding = false;
    }
  }

  /** Resolves a raycast hit name to a HUD button id, if it is one. */
  function buttonIdFor(objectName: string): VrHudButtonId | undefined {
    const id = objectName.replace('vr-hud-', '') as VrHudButtonId;
    return objectName.startsWith('vr-hud-')
      && Object.prototype.hasOwnProperty.call(buttons, id) ? id : undefined;
  }

  function dispose() {
    config.scene.remove(group);
    panel.geometry.dispose();
    panelMaterial.dispose();
    texture.dispose();
    for (const resource of buttonResources) resource.dispose();
  }

  return { group, buttons, setContent, setVisible, update, buttonIdFor, dispose };
}

export type VrHudPanel = ReturnType<typeof createVrHudPanel>;
