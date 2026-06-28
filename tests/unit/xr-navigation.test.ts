import { describe, expect, it } from 'vitest';
import {
  isQuestBackPressed,
  resolveBackAction,
  resolveControllerSelection,
  updateButtonLatch,
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

describe('Quest Back navigation', () => {
  it('returns to the previous stage or exits from stage zero', () => {
    expect(resolveBackAction(3)).toBe('previous');
    expect(resolveBackAction(0)).toBe('exit');
  });

  it('fires a held secondary button only once', () => {
    expect(updateButtonLatch(true, false)).toEqual({
      pressed: true,
      latched: true,
    });
    expect(updateButtonLatch(true, true)).toEqual({
      pressed: false,
      latched: true,
    });
    expect(updateButtonLatch(false, true)).toEqual({
      pressed: false,
      latched: false,
    });
  });

  it('maps X on the left controller and B on the right controller', () => {
    const buttons = Array.from({ length: 6 }, () => ({ pressed: false }));
    buttons[4].pressed = true;
    expect(isQuestBackPressed(buttons, 'left')).toBe(true);
    expect(isQuestBackPressed(buttons, 'right')).toBe(false);

    buttons[4].pressed = false;
    buttons[5].pressed = true;
    expect(isQuestBackPressed(buttons, 'right')).toBe(true);
    expect(isQuestBackPressed(buttons, 'left')).toBe(false);
  });
});
