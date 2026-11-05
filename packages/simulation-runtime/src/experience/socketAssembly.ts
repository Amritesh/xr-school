export interface AssemblySocket {
  readonly id: string;
  /** When set, the socket is only solved by a piece of this kind. */
  readonly solutionKind?: string;
}

export interface AssemblyConfig {
  /** Piece id to piece kind. */
  readonly pieces: Readonly<Record<string, string>>;
  readonly sockets: readonly AssemblySocket[];
}

export interface AssemblyState extends AssemblyConfig {
  readonly picked: string | null;
  /** Socket id to placed piece id. */
  readonly placed: Readonly<Record<string, string | undefined>>;
  readonly lastResult: 'placed' | 'rejected' | null;
}

export function createSocketAssembly(config: AssemblyConfig): AssemblyState {
  return { ...config, picked: null, placed: {}, lastResult: null };
}

export function pickPiece(state: AssemblyState, pieceId: string): AssemblyState {
  const known = Object.hasOwn(state.pieces, pieceId);
  const alreadyPlaced = Object.values(state.placed).includes(pieceId);
  if (!known || alreadyPlaced) return state;
  return { ...state, picked: pieceId, lastResult: null };
}

export function placePiece(state: AssemblyState, socketId: string): AssemblyState {
  if (state.picked === null) return state;
  if (!state.sockets.some(socket => socket.id === socketId)) return state;
  if (state.placed[socketId] !== undefined) {
    return { ...state, lastResult: 'rejected' };
  }
  return {
    ...state,
    picked: null,
    placed: { ...state.placed, [socketId]: state.picked },
    lastResult: 'placed',
  };
}

export function removePiece(state: AssemblyState, socketId: string): AssemblyState {
  if (state.placed[socketId] === undefined) return state;
  return {
    ...state,
    placed: { ...state.placed, [socketId]: undefined },
    lastResult: null,
  };
}

export function emptySockets(state: AssemblyState): string[] {
  return state.sockets
    .filter(socket => state.placed[socket.id] === undefined)
    .map(socket => socket.id);
}

export function isAssemblyFull(state: AssemblyState): boolean {
  return emptySockets(state).length === 0;
}

export function isAssemblySolved(state: AssemblyState): boolean {
  return state.sockets.every(socket => {
    const piece = state.placed[socket.id];
    if (piece === undefined) return false;
    return !socket.solutionKind || state.pieces[piece] === socket.solutionKind;
  });
}
