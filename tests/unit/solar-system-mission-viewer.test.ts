import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/SolarSystemMissionViewer.tsx');
const routePath = resolve(process.cwd(), 'apps/web/app/simulations/c8-10-science-solar-system/page.tsx');

describe('Classes 8-10 Solar System mission viewer', () => {
  it('exposes a dedicated simulation route', () => {
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, 'utf8')).toContain('SolarSystemMissionViewer');
  });

  it('keeps spacecraft WebXR controls, narration, and mission UI affordances', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      "renderer.xr.setReferenceSpaceType('local-floor')",
      'renderer.xr.getController(0)',
      'renderer.xr.getController(1)',
      'optionalFeatures',
      'hand-tracking',
      'playSimulationNarration',
      'stopSimulationNarration',
      'aria-live="polite"',
      'Voice on',
      'Comfort',
      'Restart',
      'ultra-modern-spacecraft-panoramic-glass-cockpit-holographic-dashboard-ai-assistant',
      'mission-control-dashboard-navigation-controls-oxygen-speed-distance-tracker',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('builds the requested cinematic solar system mission scenes', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'Exploring Our Solar System',
      'millions-of-stars-milky-way-nebulae-deep-space-dust',
      'sun-animated-plasma-surface-solar-granulation-flares-prominences-sunspots-corona-magnetic-loops-heat-distortion-volumetric-glow',
      'international-space-station-and-artificial-satellites-orbit-earth',
      'moon-high-detail-lunar-surface-craters-mountains-apollo-landing-site-flag-footprints-lunar-rover-low-gravity-dust',
      'asteroid-belt-rotating-rocky-objects-ceres-safe-navigation',
      'saturn-transparent-ring-system-multiple-ring-layers-dynamic-shadows-ice-particle-field',
      'pluto-dwarf-planets-kuiper-belt-frozen-objects',
      'comet-ice-dust-bright-tail-ion-tail-points-away-from-sun',
      'solar-system-explorer-gold-mission-badge-certificate-space-explorer-medal-keep-looking-up',
      'solar-system-vr-controller-navigation',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('uses procedural PBR-style visuals instead of flat primitive planet colors', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'makeProceduralPlanetTexture',
      'pbr-procedural-${planetId}-material-with-texture-normal-roughness-ambient-occlusion',
      'transparent-holographic-planet-information-display',
      'earth-atmospheric-scattering-blue-glow-aurora-cloud-layer-night-lights',
      'earth-independent-rotating-clouds-dynamic-weather-ocean-reflections',
      'venus-dense-yellow-clouds-atmospheric-scattering-animated-cloud-movement',
      'sun-animated-plasma-surface-solar-granulation-flares-prominences-sunspots-corona-magnetic-loops-heat-distortion-volumetric-glow',
      'ultra-hdr-space-skybox-nebula-gas-cloud-galaxy-background-parallax',
      'saturn-transparent-ring-system-multiple-ring-layers-dynamic-shadows-ice-particle-field',
      'saturn-individual-ice-rock-ring-particle',
      'animated-spacecraft-control-panel-glowing-button-reflection',
      'comet-ion-tail-dynamic-sunlight-interaction',
    ]) {
      expect(source).toContain(identifier);
    }
  });
});
