import {
  SOLAR_PLANETS,
  getPlanet,
  type PlanetId,
  type PlanetSpec,
} from './solarSystemAstronomy';

export type ObservatoryTimePreset = 'paused' | 'day' | 'month' | 'year';
export type ObservatoryLayer = 'orbits' | 'labels' | 'gravity' | 'trueScale';

export const OBSERVATORY_TIME_PRESETS: Record<ObservatoryTimePreset, number> = {
  paused: 0,
  day: 8,
  month: 30,
  year: 120,
};

export interface ObservatorySnapshot {
  paused: boolean;
  timePreset: ObservatoryTimePreset;
  daysPerSecond: number;
  selectedPlanetId: PlanetId;
  comparisonPlanetId: PlanetId;
  layers: Record<ObservatoryLayer, boolean>;
}

export interface ObservatoryComparisonRow {
  label: string;
  primary: string;
  secondary: string;
}

export interface ObservatoryComparison {
  primary: PlanetSpec;
  secondary: PlanetSpec;
  rows: ObservatoryComparisonRow[];
}

const DEFAULT_SNAPSHOT: ObservatorySnapshot = {
  paused: true,
  timePreset: 'day',
  daysPerSecond: OBSERVATORY_TIME_PRESETS.day,
  selectedPlanetId: 'earth',
  comparisonPlanetId: 'jupiter',
  layers: {
    orbits: true,
    labels: true,
    gravity: false,
    trueScale: false,
  },
};

function cloneSnapshot(snapshot: ObservatorySnapshot): ObservatorySnapshot {
  return { ...snapshot, layers: { ...snapshot.layers } };
}

function nextPlanetAfter(planetId: PlanetId): PlanetId {
  const index = SOLAR_PLANETS.findIndex(planet => planet.id === planetId);
  return SOLAR_PLANETS[(index + 1) % SOLAR_PLANETS.length].id;
}

function formatComparison(primary: PlanetSpec, secondary: PlanetSpec): ObservatoryComparisonRow[] {
  return [
    { label: 'Distance from Sun', primary: `${primary.orbitRadiusAu} AU`, secondary: `${secondary.orbitRadiusAu} AU` },
    { label: 'Orbital period', primary: `${primary.orbitalPeriodDays.toLocaleString('en-IN')} days`, secondary: `${secondary.orbitalPeriodDays.toLocaleString('en-IN')} days` },
    { label: 'Orbital speed', primary: `${primary.orbitalSpeedKmPerS} km/s`, secondary: `${secondary.orbitalSpeedKmPerS} km/s` },
    { label: 'Radius', primary: `${primary.radiusEarths} Earths`, secondary: `${secondary.radiusEarths} Earths` },
    { label: 'Mean temperature', primary: `${primary.meanTempC} °C`, secondary: `${secondary.meanTempC} °C` },
  ];
}

export function createSolarSystemObservatory() {
  let state = cloneSnapshot(DEFAULT_SNAPSHOT);

  function snapshot() {
    return cloneSnapshot(state);
  }

  return {
    snapshot,
    setPaused(paused: boolean) {
      state = { ...state, paused };
      return snapshot();
    },
    setTimePreset(timePreset: ObservatoryTimePreset) {
      const daysPerSecond = OBSERVATORY_TIME_PRESETS[timePreset];
      state = {
        ...state,
        timePreset,
        daysPerSecond,
        paused: timePreset === 'paused',
      };
      return snapshot();
    },
    toggleLayer(layer: ObservatoryLayer) {
      state = {
        ...state,
        layers: { ...state.layers, [layer]: !state.layers[layer] },
      };
      return snapshot();
    },
    selectPlanet(selectedPlanetId: PlanetId) {
      getPlanet(selectedPlanetId);
      state = {
        ...state,
        selectedPlanetId,
        comparisonPlanetId: state.comparisonPlanetId === selectedPlanetId
          ? nextPlanetAfter(selectedPlanetId)
          : state.comparisonPlanetId,
      };
      return snapshot();
    },
    compareWith(comparisonPlanetId: PlanetId) {
      getPlanet(comparisonPlanetId);
      state = {
        ...state,
        comparisonPlanetId: comparisonPlanetId === state.selectedPlanetId
          ? nextPlanetAfter(state.selectedPlanetId)
          : comparisonPlanetId,
      };
      return snapshot();
    },
    comparison(): ObservatoryComparison {
      const primary = getPlanet(state.selectedPlanetId);
      const secondary = getPlanet(state.comparisonPlanetId);
      return { primary, secondary, rows: formatComparison(primary, secondary) };
    },
    restart() {
      state = cloneSnapshot(DEFAULT_SNAPSHOT);
      return snapshot();
    },
  };
}

export type SolarSystemObservatory = ReturnType<typeof createSolarSystemObservatory>;
