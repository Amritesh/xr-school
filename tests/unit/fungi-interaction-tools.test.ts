import { describe, expect, it } from 'vitest';
import {
  createFungiExperienceDirector,
  type FungiExperienceDirector,
  type FungiInputSource,
  type FungiMissionId,
} from '../../apps/web/lib/fungi/fungiExperienceDirector';
import {
  SPECIMEN_LENS_TARGETS,
  createFungiInteractionTools,
  type FungiInteractionTools,
  type FungiManipulation,
} from '../../apps/web/lib/fungi/fungiInteractionTools';

const SOURCES: FungiInputSource[] = ['mouse', 'touch', 'keyboard', 'xr-controller'];

interface Harness {
  director: FungiExperienceDirector;
  tools: FungiInteractionTools;
}

function setup(): Harness {
  const director = createFungiExperienceDirector();
  const tools = createFungiInteractionTools(director);
  return { director, tools };
}

function applyAll(
  tools: FungiInteractionTools,
  manipulations: FungiManipulation[],
  source: FungiInputSource = 'mouse',
) {
  for (const manipulation of manipulations) tools.apply(manipulation, source);
}

/** Drives the lens onto a named specimen using the tool's own mapping. */
function lensOnto(specimenId: keyof typeof SPECIMEN_LENS_TARGETS): FungiManipulation {
  const target = SPECIMEN_LENS_TARGETS[specimenId];
  return { type: 'lens-move', normalizedX: target[0], normalizedY: target[1] };
}

const LENS_AWAY: FungiManipulation = {
  type: 'lens-move',
  normalizedX: 0.5,
  normalizedY: 0.98,
};

const BRANCH_PROBES = [
  { depth: 0.2, normalizedX: 0.15 },
  { depth: 0.5, normalizedX: 0.5 },
  { depth: 0.8, normalizedX: 0.85 },
] as const;

/**
 * Walks the journey through its real evidence gates so each tool is exercised
 * in the mission where the director actually accepts its observations.
 */
function advanceTo({ director, tools }: Harness, missionId: FungiMissionId): void {
  const source: FungiInputSource = 'mouse';
  const reached = () => director.snapshot().missionId === missionId;
  if (reached()) return;

  director.dispatch({ actionId: 'diagnose.classify', source, value: 'only-the-green-plant' });
  for (const specimen of ['mushroom', 'bread-mould', 'green-plant'] as const) {
    applyAll(tools, [LENS_AWAY, lensOnto(specimen)], source);
  }
  director.dispatch({
    actionId: 'diagnose.classify',
    source,
    value: 'mushroom-and-bread-mould',
  });
  if (reached()) return;

  for (const probe of BRANCH_PROBES) {
    tools.apply({ type: 'focus-set', depth: probe.depth }, source);
    tools.apply({ type: 'lens-move', normalizedX: probe.normalizedX, normalizedY: 0.5 }, source);
  }
  director.dispatch({
    actionId: 'mycelium.interpret',
    source,
    value: 'connected-feeding-network',
  });
  if (reached()) return;

  director.dispatch({ actionId: 'spore.record-landing', source, value: 'missed' });
  director.dispatch({ actionId: 'spore.record-landing', source, value: 'germinating' });
  if (reached()) return;

  director.dispatch({ actionId: 'growth.predict', source, value: 'rapid-growth' });
  director.dispatch({
    actionId: 'growth.run-trial',
    source,
    input: {
      temperatureC: 27,
      moisturePercent: 82,
      substrate: 'bread',
      elapsedHours: 96,
      inoculumViability: 1,
    },
  });
  director.dispatch({ actionId: 'growth.save-trial', source });
  director.dispatch({
    actionId: 'growth.run-trial',
    source,
    input: {
      temperatureC: 9,
      moisturePercent: 82,
      substrate: 'bread',
      elapsedHours: 96,
      inoculumViability: 1,
    },
  });
  director.dispatch({ actionId: 'growth.save-trial', source });
  director.dispatch({
    actionId: 'growth.compare-trials',
    source,
    trialIds: ['trial-1', 'trial-2'],
  });
  director.dispatch({
    actionId: 'growth.interpret',
    source,
    value: 'temperature-changed-growth',
  });
  if (reached()) return;

  director.dispatch({
    actionId: 'useful.observe-dough',
    source,
    value: 'yeast-expanded-more-than-control',
  });
  for (const [actorId, role] of [
    ['yeast', 'food'],
    ['antibiotic-producing-fungus', 'medicine'],
    ['saprotrophic-fungus', 'decomposer'],
  ] as const) {
    director.dispatch({ actionId: 'useful.match-role', source, targetId: actorId, value: role });
  }
  if (reached()) return;

  director.dispatch({ actionId: 'safety.scan', source, value: 0.9 });
  director.dispatch({
    actionId: 'safety.classify',
    source,
    targetId: 'fresh-item',
    value: 'check-use',
  });
  director.dispatch({
    actionId: 'safety.classify',
    source,
    targetId: 'mouldy-item',
    value: 'do-not-eat',
  });
  director.dispatch({ actionId: 'safety.explain', source, value: 'only-the-visible-patch' });
  director.dispatch({
    actionId: 'safety.explain',
    source,
    value: 'hidden-hyphae-extend-beyond-visible-patch',
  });
  if (reached()) return;

  throw new Error(`could not advance to ${missionId}`);
}

describe('createFungiInteractionTools', () => {
  it('records a lens crossing only when the lens actually enters a specimen', () => {
    const { director, tools } = setup();
    director.dispatch({
      actionId: 'diagnose.classify',
      source: 'mouse',
      value: 'only-the-green-plant',
    });

    tools.apply(LENS_AWAY, 'mouse');
    expect(director.snapshot().evidence.diagnose.lensCrossings).toEqual([]);
    expect(tools.snapshot().lens.insideSpecimenId).toBeUndefined();

    tools.apply(lensOnto('mushroom'), 'mouse');
    expect(director.snapshot().evidence.diagnose.lensCrossings).toEqual(['mushroom']);
    expect(tools.snapshot().lens.insideSpecimenId).toBe('mushroom');

    // Moving within the same specimen is not a second crossing.
    tools.apply(lensOnto('mushroom'), 'mouse');
    expect(
      director
        .snapshot()
        .observationHistory.filter((record) => record.actionId === 'diagnose.inspect'),
    ).toHaveLength(1);

    applyAll(tools, [LENS_AWAY, lensOnto('bread-mould'), LENS_AWAY, lensOnto('green-plant')]);
    expect(director.snapshot().evidence.diagnose.lensCrossings).toEqual([
      'mushroom',
      'bread-mould',
      'green-plant',
    ]);
    expect(tools.snapshot().lens.insideSpecimenId).toBe('green-plant');
  });

  it('traces a hyphal branch only when its layer is genuinely in focus', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'mycelium');

    // The near branch sits in the first band; the microscope is focused deep.
    tools.apply({ type: 'focus-set', depth: 0.85 }, 'mouse');
    tools.apply({ type: 'lens-move', normalizedX: 0.15, normalizedY: 0.5 }, 'mouse');
    expect(director.snapshot().evidence.mycelium.branchTraces).toEqual([]);

    tools.apply({ type: 'focus-set', depth: 0.2 }, 'mouse');
    tools.apply({ type: 'lens-move', normalizedX: 0.15, normalizedY: 0.5 }, 'mouse');
    expect(director.snapshot().evidence.mycelium.branchTraces).toHaveLength(1);

    for (const probe of BRANCH_PROBES.slice(1)) {
      tools.apply({ type: 'focus-set', depth: probe.depth }, 'mouse');
      tools.apply({ type: 'lens-move', normalizedX: probe.normalizedX, normalizedY: 0.5 }, 'mouse');
    }

    const traced = director.snapshot().evidence.mycelium.branchTraces;
    expect(traced).toHaveLength(3);
    expect(new Set(traced).size).toBe(3);
    expect(tools.snapshot().tracedBranchIds).toEqual(traced);
  });

  it('carries a released spore on the fan and lands it where the flight ends', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'spore-flight');

    // No fan: the spore falls beside the log and reaches no growing surface.
    tools.apply({ type: 'fan-set', directionRadians: 0, strength: 0 }, 'mouse');
    tools.apply({ type: 'spore-release' }, 'mouse');
    const missed = tools.snapshot().spore;
    expect(missed.released).toBe(true);
    expect(missed.outcome).toBe('missed');
    expect(director.snapshot().evidence.sporeFlight.landingOutcomes).toEqual(['missed']);

    // Enough airflow on the right heading: the spore reaches the moist tray.
    const germinating = tools.findLandingSettings('germinating');
    expect(germinating).toBeDefined();
    tools.apply({ type: 'fan-set', ...germinating! }, 'mouse');
    tools.apply({ type: 'spore-release' }, 'mouse');
    expect(tools.snapshot().spore.outcome).toBe('germinating');
    expect(director.snapshot().evidence.sporeFlight.landingOutcomes).toEqual([
      'missed',
      'germinating',
    ]);

    // A dry landing surface leaves the spore dormant rather than germinating.
    const dormant = tools.findLandingSettings('dormant');
    expect(dormant).toBeDefined();
    tools.apply({ type: 'fan-set', ...dormant! }, 'mouse');
    tools.apply({ type: 'spore-release' }, 'mouse');
    expect(tools.snapshot().spore.outcome).toBe('dormant');

    // The landing position is the integrated flight, not the release point.
    const landed = tools.snapshot().spore.position;
    expect(landed.every((value) => Number.isFinite(value))).toBe(true);
    expect(landed[0]).toBeGreaterThan(-4.4);
  });

  it('integrates spore flight deterministically for identical fan settings', () => {
    const first = setup();
    const second = setup();
    for (const harness of [first, second]) {
      advanceTo(harness, 'spore-flight');
      harness.tools.apply({ type: 'fan-set', directionRadians: 0.35, strength: 0.42 }, 'mouse');
      harness.tools.apply({ type: 'spore-release' }, 'mouse');
    }
    expect(first.tools.snapshot().spore).toEqual(second.tools.snapshot().spore);
  });

  it('clamps every growth input to the bounds the model accepts', () => {
    const { tools } = setup();

    tools.apply({ type: 'growth-input-set', field: 'temperatureC', value: 1000 }, 'mouse');
    expect(tools.snapshot().growthInput.temperatureC).toBe(40);
    tools.apply({ type: 'growth-input-set', field: 'temperatureC', value: -50 }, 'mouse');
    expect(tools.snapshot().growthInput.temperatureC).toBe(5);
    tools.apply({ type: 'growth-input-set', field: 'moisturePercent', value: 500 }, 'mouse');
    expect(tools.snapshot().growthInput.moisturePercent).toBe(100);
    tools.apply({ type: 'growth-input-set', field: 'elapsedHours', value: -3 }, 'mouse');
    expect(tools.snapshot().growthInput.elapsedHours).toBe(0);
    tools.apply({ type: 'substrate-set', substrate: 'dry-paper' }, 'mouse');
    expect(tools.snapshot().growthInput.substrate).toBe('dry-paper');
  });

  it('runs a real trial on every chamber adjustment once the chamber is live', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'growth-chamber');

    tools.apply({ type: 'growth-input-set', field: 'temperatureC', value: 27 }, 'mouse');
    tools.apply({ type: 'growth-input-set', field: 'moisturePercent', value: 85 }, 'mouse');
    tools.apply({ type: 'substrate-set', substrate: 'bread' }, 'mouse');

    const coverages: number[] = [];
    for (const hours of [0, 24, 60, 120]) {
      tools.apply({ type: 'growth-input-set', field: 'elapsedHours', value: hours }, 'mouse');
      coverages.push(director.snapshot().experiment.currentOutput.surfaceCoverage);
    }

    expect(coverages).toEqual([...coverages].sort((a, b) => a - b));
    expect(new Set(coverages).size).toBeGreaterThan(2);
    expect(tools.snapshot().growthOutput.surfaceCoverage).toBeCloseTo(coverages.at(-1)!, 9);
  });

  it('leaves the director untouched when the chamber is not the current mission', () => {
    const { director, tools } = setup();
    const before = director.snapshot();

    tools.apply({ type: 'growth-input-set', field: 'temperatureC', value: 33 }, 'mouse');

    // The apparatus still responds — the nursery is persistent — but nothing
    // is recorded as evidence outside the mission that asks for it.
    expect(tools.snapshot().growthOutput.surfaceCoverage).toBeGreaterThanOrEqual(0);
    expect(director.snapshot()).toEqual(before);
  });

  it('records the honest dough comparison the yeast model produces', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'useful-fungi');

    tools.apply({ type: 'growth-input-set', field: 'temperatureC', value: 30 }, 'mouse');
    tools.apply({ type: 'growth-input-set', field: 'elapsedHours', value: 24 }, 'mouse');
    tools.apply({ type: 'pipette-drop', vesselId: 'yeast' }, 'mouse');

    expect(tools.snapshot().yeast.inoculated).toBe(true);
    expect(director.snapshot().evidence.usefulFungi.doughObservations).toContain(
      'yeast-expanded-more-than-control',
    );

    // Inoculating the control too destroys the comparison, and the tool says so.
    tools.apply({ type: 'pipette-drop', vesselId: 'control' }, 'mouse');
    expect(tools.snapshot().yeast.controlInoculated).toBe(true);
    expect(director.snapshot().evidence.usefulFungi.doughObservations.at(-1)).toBe(
      'no-difference-from-control',
    );
  });

  it('routes organism tokens to right and wrong destinations alike', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'useful-fungi');

    tools.apply({ type: 'token-grab', actorId: 'yeast' }, 'mouse');
    tools.apply({ type: 'role-drop', actorId: 'yeast', role: 'medicine' }, 'mouse');
    tools.apply({ type: 'token-grab', actorId: 'yeast' }, 'mouse');
    tools.apply({ type: 'role-drop', actorId: 'yeast', role: 'food' }, 'mouse');

    expect(director.snapshot().evidence.usefulFungi.roleAttempts).toEqual([
      { actorId: 'yeast', role: 'medicine', correct: false },
      { actorId: 'yeast', role: 'food', correct: true },
    ]);
    expect(director.snapshot().evidence.usefulFungi.roleByActor).toEqual({ yeast: 'food' });
  });

  it('drops a cancelled drag instead of routing it', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'useful-fungi');

    tools.apply({ type: 'token-grab', actorId: 'saprotrophic-fungus' }, 'mouse');
    expect(tools.snapshot().grabbedActorId).toBe('saprotrophic-fungus');
    tools.apply({ type: 'manipulation-cancel' }, 'mouse');

    expect(tools.snapshot().grabbedActorId).toBeUndefined();
    tools.apply({ type: 'role-drop', actorId: 'saprotrophic-fungus', role: 'decomposer' }, 'mouse');
    expect(director.snapshot().evidence.usefulFungi.roleAttempts).toEqual([]);
  });

  it('reports only the depth the scanner has actually reached', () => {
    const harness = setup();
    const { director, tools } = harness;
    advanceTo(harness, 'safety');

    tools.apply({ type: 'scanner-set', depth: 0.3 }, 'mouse');
    expect(director.snapshot().evidence.safety.maximumScanDepth).toBeCloseTo(0.3, 6);

    tools.apply({ type: 'scanner-set', depth: 0.9 }, 'mouse');
    expect(director.snapshot().evidence.safety.maximumScanDepth).toBeCloseTo(0.9, 6);

    // Pulling the scanner back out never un-observes what was already seen.
    tools.apply({ type: 'scanner-set', depth: 0.1 }, 'mouse');
    expect(director.snapshot().evidence.safety.maximumScanDepth).toBeCloseTo(0.9, 6);
    expect(tools.snapshot().scannerDepth).toBeCloseTo(0.1, 6);

    tools.apply({ type: 'scanner-set', depth: 5 }, 'mouse');
    expect(tools.snapshot().scannerDepth).toBe(1);
  });

  it('produces identical director and tool state from mouse, touch, keyboard, and XR', () => {
    const snapshots = SOURCES.map((source) => {
      const { director, tools } = setup();
      director.dispatch({
        actionId: 'diagnose.classify',
        source,
        value: 'only-the-green-plant',
      });
      applyAll(
        tools,
        [
          LENS_AWAY,
          lensOnto('mushroom'),
          LENS_AWAY,
          lensOnto('bread-mould'),
          LENS_AWAY,
          lensOnto('green-plant'),
          { type: 'focus-set', depth: 0.5 },
          { type: 'fan-set', directionRadians: 0.4, strength: 0.5 },
          { type: 'growth-input-set', field: 'temperatureC', value: 27 },
          { type: 'growth-input-set', field: 'moisturePercent', value: 84 },
          { type: 'growth-input-set', field: 'elapsedHours', value: 72 },
          { type: 'scanner-set', depth: 0.7 },
        ],
        source,
      );
      return { director: director.snapshot(), tools: tools.snapshot() };
    });

    for (const snapshot of snapshots.slice(1)) {
      expect(snapshot.director).toEqual(snapshots[0]!.director);
      expect(snapshot.tools).toEqual(snapshots[0]!.tools);
    }
  });

  it('rejects malformed manipulations without changing tool or director state', () => {
    const { director, tools } = setup();
    tools.apply({ type: 'focus-set', depth: 0.4 }, 'mouse');
    const toolsBefore = tools.snapshot();
    const directorBefore = director.snapshot();

    const malformed: unknown[] = [
      null,
      { type: 'nope' },
      { type: 'lens-move', normalizedX: Number.NaN, normalizedY: 0.5 },
      { type: 'focus-set', depth: 'deep' },
      { type: 'fan-set', directionRadians: 0, strength: Number.POSITIVE_INFINITY },
      { type: 'growth-input-set', field: 'pressure', value: 3 },
      { type: 'substrate-set', substrate: 'granite' },
      { type: 'role-drop', actorId: 'yeast', role: 'sorcery' },
      { type: 'pipette-drop', vesselId: 'sink' },
      { type: '__proto__' },
    ];

    for (const manipulation of malformed) {
      expect(() => tools.apply(manipulation as FungiManipulation, 'mouse')).toThrow();
    }

    expect(tools.snapshot()).toEqual(toolsBefore);
    expect(director.snapshot()).toEqual(directorBefore);
  });

  it('rejects an unsupported input source before dispatching anything', () => {
    const { director, tools } = setup();
    const before = director.snapshot();

    expect(() =>
      tools.apply({ type: 'scanner-set', depth: 0.5 }, 'gamepad' as FungiInputSource),
    ).toThrow(/source/i);
    expect(director.snapshot()).toEqual(before);
  });

  it('projects apparatus state the world can render directly', () => {
    const { tools } = setup();
    tools.apply({ type: 'growth-input-set', field: 'temperatureC', value: 26 }, 'mouse');
    tools.apply({ type: 'growth-input-set', field: 'elapsedHours', value: 48 }, 'mouse');
    tools.apply({ type: 'fan-set', directionRadians: 0.4, strength: 0.6 }, 'mouse');
    tools.apply({ type: 'scanner-set', depth: 0.65 }, 'mouse');
    tools.apply({ type: 'pipette-drop', vesselId: 'yeast' }, 'mouse');

    const projection = tools.worldProjection();
    expect(projection.airflow).toEqual({ directionRadians: 0.4, strength: 0.6 });
    expect(projection.safetyScanDepth).toBeCloseTo(0.65, 6);
    expect(projection.yeast).toEqual({
      temperatureC: 26,
      elapsedHours: 48,
      inoculated: true,
    });
    expect(projection.litter.elapsedHours).toBe(48);
    expect(projection.litter.temperatureC).toBe(26);
    expect(projection.litter.initialLitterMassGrams).toBeGreaterThan(0);
    expect(projection.growth).toEqual(tools.snapshot().growthOutput);
  });

  it('clears transient apparatus on an experiment reset but keeps calibration on an observation reset', () => {
    const { tools } = setup();
    tools.apply({ type: 'focus-set', depth: 0.8 }, 'mouse');
    tools.apply({ type: 'fan-set', directionRadians: 1.1, strength: 0.7 }, 'mouse');
    tools.apply({ type: 'spore-release' }, 'mouse');
    tools.apply({ type: 'scanner-set', depth: 0.9 }, 'mouse');

    tools.reset('observation');
    expect(tools.snapshot().focusDepth).toBeCloseTo(0.8, 6);
    expect(tools.snapshot().spore.released).toBe(false);

    tools.apply({ type: 'spore-release' }, 'mouse');
    tools.reset('experiment');
    const afterExperiment = tools.snapshot();
    expect(afterExperiment.spore.released).toBe(false);
    expect(afterExperiment.scannerDepth).toBe(0);
    expect(afterExperiment.fan).toEqual({ directionRadians: 0, strength: 0 });
  });
});
