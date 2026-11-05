import { describe, expect, it } from 'vitest';
import {
  createSocketAssembly,
  emptySockets,
  isAssemblyFull,
  isAssemblySolved,
  pickPiece,
  placePiece,
  removePiece,
} from '../../packages/simulation-runtime/src/experience/socketAssembly';

const ordered = () =>
  createSocketAssembly({
    pieces: { a: 'stones', b: 'sand' },
    sockets: [
      { id: 'top', solutionKind: 'stones' },
      { id: 'bottom', solutionKind: 'sand' },
    ],
  });

const place = (state: ReturnType<typeof ordered>, piece: string, socket: string) =>
  placePiece(pickPiece(state, piece), socket);

describe('socket assembly', () => {
  it('lets a socket hold one piece and keeps the picked piece when occupied', () => {
    const one = place(ordered(), 'a', 'top');
    const rejected = place(one, 'b', 'top');
    expect(rejected.placed.top).toBe('a');
    expect(rejected.picked).toBe('b');
    expect(rejected.lastResult).toBe('rejected');
  });

  it('treats a wrong kind as full but unsolved until it is replaced', () => {
    let state = place(place(ordered(), 'b', 'top'), 'a', 'bottom');
    expect(isAssemblyFull(state)).toBe(true);
    expect(isAssemblySolved(state)).toBe(false);
    state = removePiece(removePiece(state, 'top'), 'bottom');
    expect(emptySockets(state)).toEqual(['top', 'bottom']);
    state = place(place(state, 'a', 'top'), 'b', 'bottom');
    expect(isAssemblySolved(state)).toBe(true);
  });

  it('counts sockets without a solution kind as solved once filled', () => {
    let state = createSocketAssembly({
      pieces: { g1: 'gutter', g2: 'gutter' },
      sockets: [{ id: 's1' }, { id: 's2' }],
    });
    state = place(state, 'g1', 's2');
    expect(isAssemblySolved(state)).toBe(false);
    expect(emptySockets(state)).toEqual(['s1']);
    state = place(state, 'g2', 's1');
    expect(isAssemblySolved(state)).toBe(true);
  });

  it('ignores a placement with nothing picked or an unknown socket', () => {
    const state = ordered();
    expect(placePiece(state, 'top').placed.top).toBeUndefined();
    const picked = pickPiece(state, 'a');
    expect(placePiece(picked, 'missing').picked).toBe('a');
    expect(pickPiece(state, 'missing').picked).toBeNull();
  });

  it('does not let one piece fill two sockets', () => {
    const state = place(ordered(), 'a', 'top');
    expect(pickPiece(state, 'a').picked).toBeNull();
  });
});
