import * as THREE from 'three';

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

export type VrHudButtonId = 'previous' | 'next' | 'replay' | 'exit';

export interface VrHudContent {
  /** Small line above the title, e.g. "Stage 2 / 8". */
  eyebrow: string;
  title: string;
  body: string;
  /** Amber "do this next" line under the body. */
  hint?: string;
  /** "Today you learned" list for the completion screen. */
  bullets?: string[];
  buttons: VrHudButtonId[];
}

const BUTTON_STYLE: Record<VrHudButtonId, { label: string; color: string }> = {
  previous: { label: '◀ Previous', color: '#94a3b8' },
  next: { label: 'Next ▶', color: '#fbbf24' },
  replay: { label: '⟲ Replay Activity', color: '#4ade80' },
  exit: { label: '✕ Exit Simulation', color: '#f87171' },
};

const PANEL_WIDTH = 1.3;
const PANEL_HEIGHT = 0.82;
const BUTTON_WIDTH = 0.42;
const BUTTON_HEIGHT = 0.115;
const BUTTON_GAP = 0.03;
const FOLLOW_DISTANCE = 1.7;
const CONTROLS_FOOTER = 'Trigger: select · Right stick: turn · Left stick: move · B: back';

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

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
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(content.eyebrow, 40, 62);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 46px sans-serif';
    let cursorY = 122;
    for (const line of wrapLines(ctx, content.title, w - 80).slice(0, 2)) {
      ctx.fillText(line, 40, cursorY);
      cursorY += 54;
    }
    cursorY += 8;

    ctx.fillStyle = '#d1d5db';
    ctx.font = '29px sans-serif';
    for (const line of wrapLines(ctx, content.body, w - 80).slice(0, 5)) {
      ctx.fillText(line, 40, cursorY);
      cursorY += 39;
    }

    if (content.bullets?.length) {
      cursorY += 10;
      ctx.fillStyle = '#fde68a';
      ctx.font = '28px sans-serif';
      for (const bullet of content.bullets.slice(0, 6)) {
        const lines = wrapLines(ctx, bullet, w - 130);
        ctx.fillText(`• ${lines[0]}`, 48, cursorY);
        cursorY += 37;
        for (const line of lines.slice(1)) {
          ctx.fillText(line, 78, cursorY);
          cursorY += 37;
        }
        if (cursorY > h - 110) break;
      }
    }

    if (content.hint) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(wrapLines(ctx, content.hint, w - 80)[0] ?? '', 40, h - 84);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '22px sans-serif';
    ctx.fillText(CONTROLS_FOOTER, 40, h - 32);
    texture.needsUpdate = true;
  }

  function layoutButtons(visibleIds: VrHudButtonId[]) {
    const total = visibleIds.length * BUTTON_WIDTH
      + Math.max(0, visibleIds.length - 1) * BUTTON_GAP;
    for (const id of Object.keys(buttons) as VrHudButtonId[]) {
      const mesh = buttons[id];
      const index = visibleIds.indexOf(id);
      mesh.visible = index >= 0;
      if (index >= 0) {
        mesh.position.set(
          -total / 2 + BUTTON_WIDTH / 2 + index * (BUTTON_WIDTH + BUTTON_GAP),
          -PANEL_HEIGHT / 2 - BUTTON_HEIGHT / 2 - 0.035,
          0.01,
        );
      }
    }
  }

  function setContent(content: VrHudContent) {
    const key = JSON.stringify(content);
    if (key === contentKey) return;
    contentKey = key;
    draw(content);
    layoutButtons(content.buttons);
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
    return objectName.startsWith('vr-hud-') && id in buttons ? id : undefined;
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
