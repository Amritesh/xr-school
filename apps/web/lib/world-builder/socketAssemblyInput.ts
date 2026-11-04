import type * as THREE from 'three';

export type SocketInputAction =
  | { kind: 'pick'; pieceId: string }
  | { kind: 'place'; socketId: string };

export interface SocketInputConfig {
  pieces: Map<string, THREE.Object3D>;
  sockets: Map<string, THREE.Object3D>;
  /** The currently picked piece id, read from lesson state. */
  getPicked(): string | null;
  dispatch(action: SocketInputAction): void;
  /** Where a carried piece should hover: along the pointer or controller ray. */
  getCarryPoint(): THREE.Vector3 | null;
}

const CARRY_FOLLOW_RATE = 14;

/**
 * Turns interaction-system selections into pick and place actions. A trigger
 * press and an A-button press can land in one frame, so a target is handled
 * once per frame.
 */
export function createSocketInput(config: SocketInputConfig) {
  const handledThisFrame = new Set<string>();

  function handleSelect(id: string): boolean {
    const isPiece = config.pieces.has(id);
    const isSocket = config.sockets.has(id);
    if (!isPiece && !isSocket) return false;
    if (handledThisFrame.has(id)) return true;
    handledThisFrame.add(id);
    config.dispatch(
      isPiece ? { kind: 'pick', pieceId: id } : { kind: 'place', socketId: id },
    );
    return true;
  }

  function update(dt: number) {
    handledThisFrame.clear();
    const picked = config.getPicked();
    const piece = picked ? config.pieces.get(picked) : undefined;
    const carryPoint = config.getCarryPoint();
    if (piece && carryPoint) {
      piece.position.lerp(carryPoint, Math.min(1, dt * CARRY_FOLLOW_RATE));
    }
  }

  return { handleSelect, update, dispose: () => handledThisFrame.clear() };
}

export type SocketInput = ReturnType<typeof createSocketInput>;
