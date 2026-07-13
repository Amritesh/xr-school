import { describe, expect, it } from 'vitest';
import {
  createSolubilityModel,
  type MixtureSnapshot,
} from '../../apps/web/lib/world-builder/solubilityModel';

function total(snapshot: MixtureSnapshot) {
  return snapshot.dissolvedMassG
    + snapshot.suspendedMassG
    + snapshot.settledMassG
    + snapshot.separatedMassG;
}

function advance(model: ReturnType<typeof createSolubilityModel>, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) model.step(1 / 60);
  return model.snapshot();
}

describe('solubility domain model', () => {
  it('conserves every gram across mixture pools', () => {
    const model = createSolubilityModel({ substanceId: 'salt' });
    model.addSolute(25);
    model.setStirring(true);
    const result = advance(model, 18);
    expect(total(result)).toBeCloseTo(result.addedMassG, 3);
  });

  it('reaches saturation and leaves excess salt as visible solid', () => {
    const model = createSolubilityModel({ substanceId: 'salt', waterMassG: 100 });
    model.addSolute(50);
    model.setStirring(true);
    const result = advance(model, 120);
    expect(result.saturationCapacityG).toBeCloseTo(36, 0);
    expect(result.dissolvedMassG).toBeCloseTo(result.saturationCapacityG, 1);
    expect(result.settledMassG).toBeGreaterThan(10);
    expect(result.saturationState).toBe('saturated');
  });

  it('stirring changes dissolution rate but not equilibrium capacity', () => {
    const still = createSolubilityModel({ substanceId: 'sugar' });
    const stirred = createSolubilityModel({ substanceId: 'sugar' });
    still.addSolute(40);
    stirred.addSolute(40);
    stirred.setStirring(true);
    const stillEarly = advance(still, 8);
    const stirredEarly = advance(stirred, 8);
    expect(stirredEarly.dissolvedMassG).toBeGreaterThan(stillEarly.dissolvedMassG);
    expect(stirredEarly.saturationCapacityG).toBeCloseTo(stillEarly.saturationCapacityG, 6);
  });

  it('warmer water increases sugar capacity and dissolution rate', () => {
    const cool = createSolubilityModel({ substanceId: 'sugar', temperatureC: 15 });
    const warm = createSolubilityModel({ substanceId: 'sugar', temperatureC: 55 });
    cool.addSolute(100);
    warm.addSolute(100);
    const coolResult = advance(cool, 5);
    const warmResult = advance(warm, 5);
    expect(warmResult.saturationCapacityG).toBeGreaterThan(coolResult.saturationCapacityG);
    expect(warmResult.dissolvedMassG).toBeGreaterThan(coolResult.dissolvedMassG);
  });

  it('keeps sand insoluble while agitation suspends and waiting settles it', () => {
    const model = createSolubilityModel({ substanceId: 'sand' });
    model.addSolute(20);
    model.setStirring(true);
    const mixed = advance(model, 5);
    expect(mixed.dissolvedMassG).toBe(0);
    expect(mixed.suspendedMassG).toBeGreaterThan(1);
    model.setStirring(false);
    const rested = advance(model, 35);
    expect(rested.suspendedMassG).toBeLessThan(mixed.suspendedMassG);
    expect(rested.settledMassG).toBeGreaterThan(mixed.settledMassG);
  });

  it('forms temporary oil droplets then restores a separated upper phase', () => {
    const model = createSolubilityModel({ substanceId: 'oil' });
    model.addSolute(20);
    model.setStirring(true);
    const emulsified = advance(model, 4);
    expect(emulsified.suspendedMassG).toBeGreaterThan(5);
    expect(emulsified.dissolvedMassG).toBe(0);
    model.setStirring(false);
    const separated = advance(model, 40);
    expect(separated.separatedMassG).toBeGreaterThan(18);
    expect(separated.phaseState).toBe('separated-layer');
  });

  it('resets deterministically and rejects non-finite input', () => {
    const model = createSolubilityModel({ substanceId: 'chalk' });
    model.addSolute(10);
    model.setStirring(true);
    advance(model, 3);
    model.reset('chalk');
    expect(model.snapshot()).toMatchObject({
      substanceId: 'chalk', addedMassG: 0, dissolvedMassG: 0,
      suspendedMassG: 0, settledMassG: 0, separatedMassG: 0,
    });
    expect(() => model.addSolute(Number.NaN)).toThrow(/finite/i);
    expect(() => model.step(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
