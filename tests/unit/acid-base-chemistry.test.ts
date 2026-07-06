import { describe, expect, it } from 'vitest';
import { classifyByPh, litmusColor, universalIndicatorColor } from '../../apps/web/lib/world-builder/acidBaseChemistry';

describe('acid-base chemistry model', () => {
  it('classifies acid, neutral, and base by pH', () => {
    expect(classifyByPh(2)).toBe('acid');
    expect(classifyByPh(7)).toBe('neutral');
    expect(classifyByPh(12)).toBe('base');
  });

  it('turns litmus red in acid and blue in base, purple when neutral', () => {
    expect(litmusColor(2, 'blue')).toBe('#dc2626'); // blue litmus reddens in acid
    expect(litmusColor(2, 'red')).toBe('#dc2626');
    expect(litmusColor(12, 'red')).toBe('#2563eb'); // red litmus blues in base
    expect(litmusColor(12, 'blue')).toBe('#2563eb');
    expect(litmusColor(7, 'red')).toBe('#7e5bd6');
  });

  it('maps the universal indicator red (acid) -> green (neutral) -> violet (base)', () => {
    expect(universalIndicatorColor(1)).toBe('#e11d48');
    expect(universalIndicatorColor(7)).toBe('#22c55e');
    expect(universalIndicatorColor(14)).toBe('#7c3aed');
    // monotonic-ish: an acidic pH is not the neutral green
    expect(universalIndicatorColor(3)).not.toBe(universalIndicatorColor(7));
  });
});
