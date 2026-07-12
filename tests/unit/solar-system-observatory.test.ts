import { describe, expect, it } from 'vitest';
import { createSolarSystemObservatory } from '../../apps/web/lib/world-builder/solarSystemObservatory';

describe('solar system observatory', () => {
  it('starts paused with the core learning layers visible', () => {
    const observatory = createSolarSystemObservatory();
    expect(observatory.snapshot()).toMatchObject({
      paused: true,
      timePreset: 'day',
      selectedPlanetId: 'earth',
      comparisonPlanetId: 'jupiter',
      layers: { orbits: true, labels: true, gravity: false, trueScale: false },
    });
  });

  it('changes time, layers, selection, and comparison deterministically', () => {
    const observatory = createSolarSystemObservatory();
    expect(observatory.setTimePreset('month').daysPerSecond).toBe(30);
    expect(observatory.toggleLayer('gravity').layers.gravity).toBe(true);
    expect(observatory.selectPlanet('saturn').selectedPlanetId).toBe('saturn');
    expect(observatory.compareWith('uranus').comparisonPlanetId).toBe('uranus');
  });

  it('never compares a planet with itself', () => {
    const observatory = createSolarSystemObservatory();
    const selected = observatory.selectPlanet('jupiter');
    expect(selected.selectedPlanetId).toBe('jupiter');
    expect(selected.comparisonPlanetId).not.toBe('jupiter');
    const compared = observatory.compareWith('jupiter');
    expect(compared.comparisonPlanetId).not.toBe('jupiter');
  });

  it('returns comparison values from the astronomy model', () => {
    const observatory = createSolarSystemObservatory();
    const comparison = observatory.comparison();
    expect(comparison.primary.id).toBe('earth');
    expect(comparison.secondary.id).toBe('jupiter');
    expect(comparison.rows.map(row => row.label)).toEqual([
      'Distance from Sun', 'Orbital period', 'Orbital speed', 'Radius', 'Mean temperature',
    ]);
  });

  it('restarts every observatory control', () => {
    const observatory = createSolarSystemObservatory();
    observatory.setPaused(false);
    observatory.setTimePreset('year');
    observatory.toggleLayer('trueScale');
    observatory.selectPlanet('neptune');
    expect(observatory.restart()).toEqual(observatory.snapshot());
    expect(observatory.snapshot()).toMatchObject({
      paused: true,
      timePreset: 'day',
      selectedPlanetId: 'earth',
      comparisonPlanetId: 'jupiter',
    });
  });
});
