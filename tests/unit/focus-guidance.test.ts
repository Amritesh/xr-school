import { describe, expect, it } from 'vitest';
import { resolveFocusGuide } from '../../apps/web/lib/world-builder/focusGuidance';

describe('focus guidance', () => {
  it('stays hidden while the target is comfortably inside the viewport', () => {
    expect(resolveFocusGuide({ x: 0.2, y: -0.3, z: 0.4 })).toEqual({
      direction: 'forward',
      visible: false,
    });
  });

  it('points toward targets outside either horizontal edge', () => {
    expect(resolveFocusGuide({ x: -0.9, y: 0, z: 0.4 })).toEqual({
      direction: 'left',
      visible: true,
    });
    expect(resolveFocusGuide({ x: 0.9, y: 0, z: 0.4 })).toEqual({
      direction: 'right',
      visible: true,
    });
  });

  it('uses forward guidance for targets above or below the safe view', () => {
    expect(resolveFocusGuide({ x: 0.1, y: 0.9, z: 0.4 })).toEqual({
      direction: 'forward',
      visible: true,
    });
  });
});
