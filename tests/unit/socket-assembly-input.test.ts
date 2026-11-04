import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createSocketInput } from '../../apps/web/lib/world-builder/socketAssemblyInput';

function setup(picked: string | null = null) {
  const pieces = new Map([['g1', new THREE.Group()]]);
  const sockets = new Map([['s1', new THREE.Group()]]);
  const dispatched: unknown[] = [];
  const carry = new THREE.Vector3(1, 2, 3);
  const input = createSocketInput({
    pieces,
    sockets,
    getPicked: () => picked,
    dispatch: action => dispatched.push(action),
    getCarryPoint: () => carry,
  });
  return { input, pieces, dispatched, carry };
}

describe('socket assembly input', () => {
  it('dispatches pick for a piece and place for a socket', () => {
    const { input, dispatched } = setup();
    expect(input.handleSelect('g1')).toBe(true);
    input.update(0.016);
    expect(input.handleSelect('s1')).toBe(true);
    expect(dispatched).toEqual([
      { kind: 'pick', pieceId: 'g1' },
      { kind: 'place', socketId: 's1' },
    ]);
  });

  it('ignores a second selection of the same target in one frame', () => {
    const { input, dispatched } = setup();
    input.handleSelect('s1');
    input.handleSelect('s1');
    expect(dispatched).toHaveLength(1);
    input.update(0.016);
    input.handleSelect('s1');
    expect(dispatched).toHaveLength(2);
  });

  it('reports unknown targets as not handled', () => {
    const { input, dispatched } = setup();
    expect(input.handleSelect('btn-next')).toBe(false);
    expect(dispatched).toEqual([]);
  });

  it('moves the picked piece toward the carry point', () => {
    const { input, pieces, carry } = setup('g1');
    input.update(10);
    expect(pieces.get('g1')!.position.distanceTo(carry)).toBeLessThan(0.001);
  });
});
