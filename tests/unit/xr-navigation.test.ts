import { describe, expect, it } from 'vitest';
import {
  resolveControllerSelection,
  updateSnapTurn,
} from '../../apps/web/lib/xrNavigation';

describe('resolveControllerSelection', () => {
  it('does nothing when the controller ray hits no navigation button', () => {
    expect(resolveControllerSelection(undefined)).toBe('none');
  });

  it('maps only named navigation buttons to stage actions', () => {
    expect(resolveControllerSelection('btn-next')).toBe('next');
    expect(resolveControllerSelection('btn-prev')).toBe('previous');
    expect(resolveControllerSelection('cue-card')).toBe('none');
  });
});

describe('updateSnapTurn', () => {
  it('emits one 30 degree turn per intentional thumbstick deflection', () => {
    expect(updateSnapTurn(0.8, false)).toEqual({
      radians: -Math.PI / 6,
      latched: true,
    });
    expect(updateSnapTurn(0.8, true)).toEqual({ radians: 0, latched: true });
    expect(updateSnapTurn(0.1, true)).toEqual({ radians: 0, latched: false });
    expect(updateSnapTurn(-0.8, false)).toEqual({
      radians: Math.PI / 6,
      latched: true,
    });
  });

  it('ignores thumbstick drift inside the dead zone', () => {
    expect(updateSnapTurn(0.5, false)).toEqual({ radians: 0, latched: false });
    expect(updateSnapTurn(-0.5, false)).toEqual({ radians: 0, latched: false });
  });
});
