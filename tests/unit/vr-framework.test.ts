import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createVrLocomotion,
  rotateRigAboutHead,
  smoothAxis,
} from '../../apps/web/lib/vr/vrLocomotion';

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

  it('glides the rig toward the learner right when the left stick is pushed right', () => {
    const { rig, camera } = makeRig();
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('left', 1, 0)]),
      rig,
    });

    locomotion.update(1);

    // Facing -Z, the learner's right is +X.
    expect(rig.position.x).toBeGreaterThan(0.5);
    expect(Math.abs(rig.position.z)).toBeLessThan(1e-6);
  });

  it('glides forward along the view direction when the left stick is pushed up', () => {
    const { rig, camera } = makeRig();
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('left', 0, -1)]),
      rig,
    });

    locomotion.update(1);

    expect(rig.position.z).toBeLessThan(-0.5);
    expect(Math.abs(rig.position.x)).toBeLessThan(1e-6);
  });

  it('smoothly turns the view right when the right stick is pushed right', () => {
    const { rig, camera } = makeRig();
    const locomotion = createVrLocomotion({
      renderer: fakeRenderer(camera, [stick('right', 1, 0)]),
      rig,
    });

    locomotion.update(0.5);

    expect(rig.rotation.y).toBeLessThan(-0.1); // clockwise = turning right
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

describe('shared VR HUD panel', () => {

  it('exposes controller-selectable HUD buttons for universal VR navigation', () => {
    const text = source('apps/web/lib/vr/vrHudPanel.ts');

    expect(text).toContain("export type VrHudButtonId = 'previous' | 'next' | 'replay' | 'exit'");
    expect(text).toContain("buttonIdFor(objectName: string)");
    expect(text).toContain('Trigger: select');
    expect(text).toContain('B: back');
  });
});
