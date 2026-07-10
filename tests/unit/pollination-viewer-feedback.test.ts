import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(
  process.cwd(),
  'apps/web/components/simulations/PollinationViewer.tsx',
);
const source = readFileSync(viewerPath, 'utf8');
const moduleSource = (name: string) => readFileSync(
  resolve(process.cwd(), `apps/web/lib/world-builder/${name}.ts`),
  'utf8',
);

describe('Pollination production viewer', () => {
  it('composes focused world and experiment systems instead of private scene builders', () => {
    expect(source).toContain('createPollinationScene');
    expect(source).toContain('createPollinationExperience');
    expect(source).toContain('createToolInteraction');
    expect(source).toContain('createScaleTransition');
    expect(source).toContain('SimulationExperienceShell');
    expect(source).not.toContain('function buildFlower');
    expect(source).not.toContain('function buildBee');
  });

  it('uses the shared runtime, environment, mapped PBR, and scientific verification', () => {
    expect(source).toContain('createWebSimulationRuntime');
    expect(source).toContain('createMaterialFactory');
    expect(source).toContain('createEnvironment');
    expect(source).toContain('createScientificModelRegistry');
    expect(source).not.toContain('new THREE.WebGLRenderer');
    expect(source).not.toContain('renderer.setAnimationLoop');
    expect(source).not.toContain('renderer.render(scene, camera)');
    expect(source).toContain('map: null');
  });

  it('requires experiment actions and evidence before Continue can advance', () => {
    expect(source).toContain('snapshotRef.current.stageComplete');
    expect(source).toContain('requiredActionIds.every');
    expect(source).toContain('experienceRef.current.observe');
    expect(source).not.toContain('Next Stage');
    expect(source).toContain('started && remainingActions.length > 0');
  });

  it('finishes the final stage through a terminal completion state instead of looping on Complete', () => {
    expect(source).toContain('setCompleted(true)');
    expect(source).toContain('completed={completed}');
    expect(source).toContain('if (snapshotRef.current.lessonComplete)');
    expect(source).not.toContain('evidence={[...evidence, scaleDisclosure]}');
  });

  it('lets object interactions advance the Quest flow without requiring HTML Next buttons', () => {
    expect(source).toContain('advanceAfterObjectAction');
    expect(source).toContain("source === 'xr-controller'");
    expect(source).toContain("source === 'mouse'");
    expect(source).toContain('experienceRef.current.next()');
    expect(source).toContain('if (next.lessonComplete && isObjectActionSource(source))');
    expect(source).toContain('focusGuide');
  });

  it('keeps scale disclosure separate from biological evidence in the shared HUD', () => {
    const shell = readFileSync(
      resolve(process.cwd(), 'apps/web/components/simulation-experience/SimulationExperienceShell.tsx'),
      'utf8',
    );
    const hud = readFileSync(
      resolve(process.cwd(), 'apps/web/components/simulation-experience/BrowserExperienceHud.tsx'),
      'utf8',
    );

    expect(shell).toContain('scaleNote');
    expect(shell).toContain('completed');
    expect(hud).toContain('scaleNote');
    expect(hud).toContain('evidence.length');
    expect(hud).not.toContain('Evidence {evidence.length +');
  });

  it('supports pointer, keyboard-equivalent controls, and Quest controllers', () => {
    expect(source).toContain("'mouse'");
    expect(source).toContain("'keyboard'");
    expect(source).toContain("'xr-controller'");
    expect(source).toContain('createVrPlayerRig');
    expect(source).toContain('createVrLocomotion');
    expect(source).toContain('createVrHudPanel');
    expect(source).toContain('updateXrHover');
  });

  it('keeps scale representation explicit during cutaway and germination views', () => {
    expect(source).toContain('scaleDisclosure');
    expect(source).toContain("transitionRef.current.begin('flower', 'pistil-cutaway')");
    expect(source).toContain("transitionRef.current.begin('garden', 'germination-cutaway')");
  });

  it('packages narration audio and starts it in browser and VR', () => {
    const audioDir = resolve(process.cwd(), 'apps/web/public/audio/pollination');
    expect(existsSync(audioDir)).toBe(true);
    expect(readdirSync(audioDir).filter(file => file.endsWith('.mp3')))
      .toHaveLength(8);
    expect(source).toContain('/audio/pollination/stage-');
    expect(source).toContain('playSimulationNarration');
    expect(source).toContain('playNarration');
  });

  it('authors complete botany, garden, tools, and a single scene disposal boundary', () => {
    const botany = moduleSource('pollinationBotany');
    const garden = moduleSource('pollinationGarden');
    const tools = moduleSource('pollinationTools');
    const scene = moduleSource('pollinationScene');

    expect(botany).toContain("name = 'anther-target'");
    expect(botany).toContain("name = 'stigma-target'");
    expect(botany).toContain("name = 'ovary-cutaway'");
    expect(botany).toContain('createFruitAndSeed');
    expect(botany).toContain('createGerminationSpecimen');
    expect(garden).toContain('THREE.InstancedMesh');
    expect(garden).toContain("name = 'field-table'");
    expect(garden).toContain("name = 'soil-observation-window'");
    expect(garden).toContain("name = 'school-science-block'");
    expect(garden).toContain("name = 'peripheral-flower-bed'");
    expect(garden).toContain("name = 'pollinator-habitat'");
    expect(garden).toContain("name = 'garden-sky'");
    expect(tools).toContain("name = 'pollen-brush'");
    expect(tools).toContain("name = 'hand-lens'");
    expect(tools).toContain("name = 'watering-can'");
    expect(tools).toContain("name = 'trowel'");
    expect(scene).toContain('treatmentFlower');
    expect(scene).toContain('controlFlower');
    expect(scene).toContain("name = 'enlarged-pistil-cutaway'");
    expect(scene).toContain("name = 'pollen-tube-path'");
    expect(scene).toContain('pistilCutaway');
    expect(scene).toContain("name = 'enlarged-germination-cutaway'");
    expect(scene).toContain('germinationCutaway');
    expect(scene).toContain('POLLINATION_LAYOUT');
    expect(tools).toContain('POLLINATION_LAYOUT');
    expect(scene).toContain('dispose()');
  });
});
