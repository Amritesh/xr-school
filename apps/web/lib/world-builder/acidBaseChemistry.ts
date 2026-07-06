export type AcidBaseClass = 'acid' | 'neutral' | 'base';

/** Classify a solution by pH. Near 7 is treated as neutral. */
export function classifyByPh(ph: number): AcidBaseClass {
  if (ph < 6.5) return 'acid';
  if (ph > 7.5) return 'base';
  return 'neutral';
}

/** Approximate universal-indicator colour for a pH, red (acid) through green
 * (neutral) to violet (strong base) — the real indicator's colour scale, so
 * the solution's colour becomes a readable stand-in for the invisible pH. */
export function universalIndicatorColor(ph: number): string {
  const stops: { ph: number; color: string }[] = [
    { ph: 1, color: '#e11d48' }, // red
    { ph: 4, color: '#f97316' }, // orange
    { ph: 6, color: '#facc15' }, // yellow
    { ph: 7, color: '#22c55e' }, // green (neutral)
    { ph: 9, color: '#0ea5e9' }, // blue-green
    { ph: 11, color: '#2563eb' }, // blue
    { ph: 14, color: '#7c3aed' }, // violet
  ];
  const clamped = Math.min(14, Math.max(0, ph));
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (clamped >= stops[i].ph && clamped <= stops[i + 1].ph) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi.ph - lo.ph || 1;
  const t = (clamped - lo.ph) / span;
  return lerpHex(lo.color, hi.color, t);
}

/**
 * Colour a strip of litmus paper takes in a solution.
 * - Blue litmus turns red in acid; stays blue otherwise.
 * - Red litmus turns blue in a base; stays red otherwise.
 * - Both read purple in a neutral solution.
 */
export function litmusColor(ph: number, paper: 'red' | 'blue'): string {
  const RED = '#dc2626';
  const BLUE = '#2563eb';
  const PURPLE = '#7e5bd6';
  const klass = classifyByPh(ph);
  if (klass === 'neutral') return PURPLE;
  if (klass === 'acid') return RED; // both papers read acidic red
  return BLUE; // both papers read basic blue
}

function lerpHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const clamp = Math.min(1, Math.max(0, t));
  const r = Math.round(ca.r + (cb.r - ca.r) * clamp);
  const g = Math.round(ca.g + (cb.g - ca.g) * clamp);
  const bl = Math.round(ca.b + (cb.b - ca.b) * clamp);
  return `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}
