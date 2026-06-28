import { describe, expect, it } from 'vitest';
import { resolveControllerSelection } from '../../apps/web/lib/xrNavigation';

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
