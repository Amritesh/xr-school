import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  createVrLocomotion,
  rotateRigAboutHead,
  smoothAxis,
} from '../../apps/web/lib/vr/vrLocomotion';
import { createVrPlayerRig } from '../../apps/web/lib/vr/vrPlayerRig';
import { createVrHudPanel } from '../../apps/web/lib/vr/vrHudPanel';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const viewerPaths = [
  'apps/web/components/simulations/PollinationViewer.tsx',
  'apps/web/components/simulations/BreathingProcessViewer.tsx',
  'apps/web/components/simulations/ForceMotionViewer.tsx',
  'apps/web/components/simulations/CircuitViewer.tsx',
  'apps/web/components/simulations/StatesOfMatterViewer.tsx',
];

describe('shared VR simulation framework', () => {
  it('keeps legacy app imports as public simulation-web compatibility shims', () => {
    const rigShim = source('apps/web/lib/vr/vrPlayerRig.ts');
    const locomotionShim = source('apps/web/lib/vr/vrLocomotion.ts');
    const rigLibrary = source('packages/simulation-web/src/vr/vrPlayerRig.ts');
    const locomotionLibrary = source('packages/simulation-web/src/vr/vrLocomotion.ts');

    expect(rigShim).toContain("from '@xr-school/simulation-web'");
    expect(locomotionShim).toContain("from '@xr-school/simulation-web'");
    expect(rigLibrary).toContain('createVrPlayerRig');
    expect(locomotionLibrary).toContain('createVrLocomotion');
  });

  it('wires every QA-targeted viewer through the shared VR rig, HUD, and locomotion modules', () => {
    for (const path of viewerPaths) {
      const text = source(path);

      expect(text, path).toContain('createVrPlayerRig');
      expect(text, path).toContain('createVrHudPanel');
      expect(text, path).toContain('createVrLocomotion');
      expect(text, path).toContain('updateXrHover');
    }
  });

  it('ignores thumbstick drift inside the dead zone and saturates at full deflection', () => {
    expect(smoothAxis(0.1)).toBe(0);
    expect(smoothAxis(-0.1)).toBe(0);
    expect(smoothAxis(1)).toBe(1);
    expect(smoothAxis(-1)).toBe(-1);
  });

  it('keeps the learner head fixed in world space while the rig yaws', () => {
    const rig = new THREE.Group();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0.8, 1.6, 0.3); // learner stepped away from rig centre
    rig.add(camera);
    rig.updateMatrixWorld(true);
    const before = camera.getWorldPosition(new THREE.Vector3());

    rotateRigAboutHead(rig, before, Math.PI / 2);
    rig.updateMatrixWorld(true);
    const after = camera.getWorldPosition(new THREE.Vector3());

    expect(after.distanceTo(before)).toBeLessThan(1e-6);
  });
});

describe('createVrLocomotion', () => {
  function makeRig() {
    const rig = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(); // default pose looks down -Z
    rig.add(camera);
    rig.updateMatrixWorld(true);
    return { rig, camera };
  }

  function fakeRenderer(camera: THREE.Camera, inputSources: unknown[]) {
    return {
      xr: {
        getSession: () => ({ inputSources }),
        getCamera: () => camera,
      },
    } as unknown as THREE.WebGLRenderer;
  }

  function stick(handedness: string, axisX: number, axisY: number, backPressed = false) {
    const buttons = Array.from({ length: 6 }, () => ({ pressed: false }));
    if (backPressed) buttons[handedness === 'left' ? 4 : 5].pressed = true;
    return { handedness, gamepad: { axes: [0, 0, axisX, axisY], buttons } };
  }

  it('does not translate from a held thumbstick because locomotion is stationary by default', () => {
    const { rig, camera } = makeRig();
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('left', 1, 0)]),
      rig,
    });

    for (let index = 0; index < 100; index += 1) locomotion.update(1);

    expect(rig.position.length()).toBe(0);
  });

  it('rejects bounded teleport without authored spatial bounds', () => {
    const { rig, camera } = makeRig();

    expect(() => createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('left', 0, -1)]),
      rig,
      locomotion: 'boundedTeleport',
    })).toThrow(/bounded teleport requires authored bounds/i);

    expect(() => createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('left', 0, -1)]),
      rig,
      locomotion: 'boundedTeleport',
      movementBounds: new THREE.Box3(
        new THREE.Vector3(-1, Number.NEGATIVE_INFINITY, -1),
        new THREE.Vector3(1, 2, 1),
      ),
    })).toThrow(/finite, non-empty authored bounds/i);
  });

  it('snap-teleports head-relative once per deflection and clamps to bounds', () => {
    const { rig, camera } = makeRig();
    const source = stick('left', 0, -1);
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [source]),
      rig,
      locomotion: 'boundedTeleport',
      movementBounds: new THREE.Box3(
        new THREE.Vector3(-1, -10, -1),
        new THREE.Vector3(1, 10, 1),
      ),
      teleportStepMeters: 0.75,
    });

    locomotion.update(0.016);
    expect(rig.position.z).toBeCloseTo(-0.75);
    locomotion.update(0.016);
    expect(rig.position.z).toBeCloseTo(-0.75);

    source.gamepad.axes[3] = 0;
    locomotion.update(0.016);
    source.gamepad.axes[3] = -1;
    locomotion.update(0.016);
    expect(rig.position.z).toBeCloseTo(-1);
  });

  it('snap-turns once per right-stick deflection and rearms after release', () => {
    const { rig, camera } = makeRig();
    const source = stick('right', 1, 0);
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [source]),
      rig,
    });

    locomotion.update(0.016);
    const firstTurn = rig.rotation.y;
    locomotion.update(0.016);
    expect(rig.rotation.y).toBe(firstTurn);

    source.gamepad.axes[2] = 0;
    locomotion.update(0.016);
    source.gamepad.axes[2] = 1;
    locomotion.update(0.016);
    expect(rig.rotation.y).toBeCloseTo(firstTurn * 2);
  });

  it('preserves an explicit no-turn preference', () => {
    const { rig, camera } = makeRig();
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('right', 1, 0)]),
      rig,
      turnMode: 'none',
    });

    locomotion.update(1);

    expect(rig.rotation.y).toBe(0);
  });

  it('never moves the rig from the right stick, and never turns it from the left stick', () => {
    const { rig, camera } = makeRig();
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('right', 1, 1)]),
      rig,
    });
    locomotion.update(1);
    expect(rig.position.length()).toBeLessThan(1e-6);

    const other = makeRig();
    const leftOnly = createVrLocomotion({
      renderer: fakeRenderer(other.camera, [stick('left', 1, 0)]),
      rig: other.rig,
    });
    leftOnly.update(1);
    expect(other.rig.rotation.y).toBe(0);
  });

  it('fires back exactly once per held B press', () => {
    const { rig, camera } = makeRig();
    const sources = [stick('right', 0, 0, true)];
    let backs = 0;
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, sources),
      rig,
      onBack: () => { backs += 1; },
    });

    locomotion.update(0.016);
    locomotion.update(0.016);
    expect(backs).toBe(1);

    sources[0].gamepad.buttons[5].pressed = false;
    locomotion.update(0.016);
    sources[0].gamepad.buttons[5].pressed = true;
    locomotion.update(0.016);
    expect(backs).toBe(2);
  });
});

describe('createVrPlayerRig', () => {
  it('removes controller ray children and disposes idempotently', () => {
    const controllers = [new THREE.Group(), new THREE.Group()];
    const removeEventListener = vi.fn();
    const renderer = {
      xr: {
        getController: (index: number) => controllers[index],
        addEventListener: vi.fn(),
        removeEventListener,
      },
    } as unknown as THREE.WebGLRenderer;
    const scene = new THREE.Scene();
    const player = createVrPlayerRig({
      renderer,
      scene,
      camera: new THREE.PerspectiveCamera(),
      spawn: {
        position: new THREE.Vector3(0, 0, 2),
        lookAt: new THREE.Vector3(),
      },
    });
    const rays = controllers.map(controller => controller.children[0]);

    expect(rays.every(ray => ray instanceof THREE.Line)).toBe(true);
    player.dispose();
    player.dispose();

    expect(rays.map(ray => ray.parent)).toEqual([null, null]);
    expect(scene.children).not.toContain(player.rig);
    expect(removeEventListener).toHaveBeenCalledTimes(2);
  });
});

describe('shared VR HUD panel', () => {

  it('exposes controller-selectable HUD buttons for universal VR navigation', () => {
    const text = source('apps/web/lib/vr/vrHudPanel.ts');

    expect(text).toContain("'choice-a'");
    expect(text).toContain("'choice-b'");
    expect(text).toContain("'choice-c'");
    expect(text).toContain("'help'");
    expect(text).toContain("'restart'");
    expect(text).toContain("buttonIdFor(objectName: string)");
    expect(text).toContain('Trigger: select');
    expect(text).toContain('B: back');
  });

  it('shows, resolves, and hides authored choices and distinct help/restart controls', () => {
    const draw = vi.fn();
    const context = {
      clearRect: draw, fillRect: draw, strokeRect: draw, fillText: draw,
      measureText: (text: string) => ({ width: text.length * 12 }),
      fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
    };
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    });
    const panel = createVrHudPanel({ scene: new THREE.Scene() });

    panel.setContent({
      eyebrow: 'Question', title: 'Choose', body: 'Which answer?',
      choices: [{ label: 'First' }, { label: 'Second' }, { label: 'Third' }],
      buttons: ['previous', 'help', 'replay', 'restart', 'exit'],
    });
    expect(panel.buttonIdFor('vr-hud-choice-a')).toBe('choice-a');
    expect(panel.buttonIdFor('vr-hud-choice-b')).toBe('choice-b');
    expect(panel.buttonIdFor('vr-hud-choice-c')).toBe('choice-c');
    expect(panel.buttonIdFor('vr-hud-help')).toBe('help');
    expect(panel.buttonIdFor('vr-hud-restart')).toBe('restart');
    expect(panel.buttons['choice-a'].visible).toBe(true);
    expect(panel.buttons['choice-c'].visible).toBe(true);

    const visible = Object.values(panel.buttons).filter(button => button.visible);
    expect(Math.max(...visible.map(button => Math.abs(button.position.x)))).toBeLessThan(0.65);
    expect(new Set(visible.map(button => button.position.y)).size).toBeGreaterThanOrEqual(3);
    expect(panel.buttonIdFor('vr-hud-toString')).toBeUndefined();

    panel.setContent({ eyebrow: 'Stage', title: 'Observe', body: 'No question', buttons: ['replay'] });
    expect(panel.buttons['choice-a'].visible).toBe(false);
    expect(panel.buttons.help.visible).toBe(false);
    expect(panel.buttons.restart.visible).toBe(false);
    panel.dispose();
    vi.unstubAllGlobals();
  });
});
