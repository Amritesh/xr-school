import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';

import {
  createScreenSafePanelFollower,
  fitTextLines,
} from '../../apps/web/lib/vr/screenSafeTextPanel';

const approximateMeasure = (text: string, fontSize: number) =>
  text.length * fontSize * 0.54;

describe('screen-safe text layout', () => {
  it('routes every floating instruction-card implementation through the shared fitter and follower', () => {
    const customCardViewers = [
      'FloatOrSinkViewer.tsx',
      'LipidTestViewer.tsx',
      'MineralSourcesViewer.tsx',
      'SecretGardenKitchenViewer.tsx',
      'ShapeSortingViewer.tsx',
      'SolubleInsolubleViewer.tsx',
      'SpaceShuttleLaunchViewer.tsx',
      'StatesOfMatterViewer.tsx',
      'VitaminDeficiencyViewer.tsx',
    ];
    for (const fileName of customCardViewers) {
      const source = readFileSync(resolve(
        process.cwd(),
        'apps/web/components/simulations',
        fileName,
      ), 'utf8');
      expect(source, fileName).toContain('drawFittedText');
      expect(source, fileName).toContain('createScreenSafePanelFollower');
    }

    const immersiveHud = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/vr/vrHudPanel.ts',
    ), 'utf8');
    const interactiveLabels = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/simulations/interactive/sceneKit.ts',
    ), 'utf8');
    expect(immersiveHud).toContain('drawFittedText');
    expect(interactiveLabels).toContain('drawFittedText');
  });

  it('fits text into fixed screen bounds instead of growing the panel', () => {
    const layout = fitTextLines(
      'A fixed instruction card wraps its complete message while remaining inside the authored screen area.',
      approximateMeasure,
      {
        width: 360,
        height: 96,
        maxFontSize: 28,
        minFontSize: 14,
        maxLines: 4,
      },
    );

    expect(layout.truncated).toBe(false);
    expect(layout.height).toBeLessThanOrEqual(96);
    expect(layout.lines.every(line => approximateMeasure(line, layout.fontSize) <= 360)).toBe(true);
  });

  it('breaks long tokens and safely ellipsizes impossible content', () => {
    const layout = fitTextLines(
      'averylongunbrokeninstructiontoken-that-must-never-leave-the-card repeated repeated repeated',
      approximateMeasure,
      {
        width: 90,
        height: 22,
        maxFontSize: 20,
        minFontSize: 12,
        maxLines: 1,
      },
    );

    expect(layout.truncated).toBe(true);
    expect(layout.lines).toHaveLength(1);
    expect(approximateMeasure(layout.lines[0], layout.fontSize)).toBeLessThanOrEqual(90);
  });

  it('keeps every released simulation title, cue, and answer inside the shared HUD regions', () => {
    expect(IMPLEMENTED_SIMULATIONS).toHaveLength(36);
    for (const definition of IMPLEMENTED_SIMULATIONS) {
      for (const stage of definition.experience.stages) {
        const title = fitTextLines(stage.title, approximateMeasure, {
          width: 944,
          height: 104,
          maxFontSize: 46,
          minFontSize: 28,
          maxLines: 2,
        });
        const cue = fitTextLines(stage.cue, approximateMeasure, {
          width: 944,
          height: 137,
          maxFontSize: 29,
          minFontSize: 18,
          maxLines: 5,
        });
        expect(title.truncated, `${definition.module.slug}: ${stage.id} title`).toBe(false);
        expect(cue.truncated, `${definition.module.slug}: ${stage.id} cue`).toBe(false);
      }

      for (const prompt of definition.assessment.prompts) {
        for (const option of prompt.options ?? []) {
          const choice = fitTextLines(option.label, approximateMeasure, {
            width: 928,
            height: 58,
            maxFontSize: 25,
            minFontSize: 14,
            maxLines: 3,
          });
          expect(choice.truncated, `${definition.module.slug}: ${prompt.id} option`).toBe(false);
        }
      }
    }
  });
});

describe('screen-safe panel placement', () => {
  it('sizes and anchors a panel from the camera projection rather than message length', () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    camera.position.set(0, 1.6, 3);
    camera.lookAt(0, 1.2, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.1),
      new THREE.MeshBasicMaterial(),
    );
    const follower = createScreenSafePanelFollower(panel, {
      panelWidth: 2.8,
      panelHeight: 1.1,
      smoothing: 0,
    });

    follower.update(camera);

    expect(panel.position.distanceTo(camera.position)).toBeGreaterThan(1.8);
    expect(panel.position.distanceTo(camera.position)).toBeLessThan(3.2);
    expect(panel.scale.x).toBeGreaterThan(0);
    expect(panel.scale.x).toBeLessThanOrEqual(1.2);
    expect((panel.material as THREE.Material).depthTest).toBe(false);
    expect((panel.material as THREE.Material).depthWrite).toBe(false);
  });
});
