import { describe, expect, it } from 'vitest';
import {
  createScaleTransition,
} from '../../apps/web/lib/world-builder/scaleTransition';

describe('scale transition controller', () => {
  it('declares literal and enlarged representations during a transition', () => {
    const transition = createScaleTransition();

    const snapshot = transition.begin('flower', 'pistil-cutaway');

    expect(snapshot.from).toMatchObject({
      id: 'flower',
      representation: 'literal',
      scaleLabel: 'Life size',
    });
    expect(snapshot.to).toMatchObject({
      id: 'pistil-cutaway',
      representation: 'enlarged',
    });
    expect(snapshot.scaleDisclosure).toMatch(/enlarged/i);
  });

  it('uses a cross-fade instead of rig travel in reduced motion', () => {
    const transition = createScaleTransition({ reducedMotion: true });

    expect(transition.begin('flower', 'pistil-cutaway').mode).toBe('cross-fade');
  });

  it('clamps progress and resets to the literal garden', () => {
    const transition = createScaleTransition();
    transition.begin('flower', 'pistil-cutaway');

    expect(transition.update(2).progress).toBe(1);
    expect(transition.reset()).toMatchObject({
      active: false,
      progress: 0,
      from: { id: 'garden', representation: 'literal' },
    });
  });
});
