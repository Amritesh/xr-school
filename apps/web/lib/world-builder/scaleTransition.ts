export type ScaleRepresentation = 'literal' | 'enlarged';
export type ScaleTransitionMode = 'curve' | 'cross-fade';

export interface ScaleEndpoint {
  id: string;
  representation: ScaleRepresentation;
  scaleLabel: string;
}

export interface ScaleTransitionSnapshot {
  active: boolean;
  mode: ScaleTransitionMode;
  progress: number;
  from: ScaleEndpoint;
  to: ScaleEndpoint;
  scaleDisclosure: string;
}

const LITERAL_GARDEN: ScaleEndpoint = {
  id: 'garden',
  representation: 'literal',
  scaleLabel: 'Life size',
};

function endpoint(id: string): ScaleEndpoint {
  const enlarged = id.includes('cutaway') || id.includes('germination');
  return {
    id,
    representation: enlarged ? 'enlarged' : 'literal',
    scaleLabel: enlarged ? 'Enlarged scientific view' : 'Life size',
  };
}

export function createScaleTransition(
  options: { reducedMotion?: boolean } = {},
) {
  let snapshot: ScaleTransitionSnapshot = {
    active: false,
    mode: options.reducedMotion ? 'cross-fade' : 'curve',
    progress: 0,
    from: LITERAL_GARDEN,
    to: LITERAL_GARDEN,
    scaleDisclosure: 'The garden is shown at life size.',
  };

  return {
    snapshot: () => ({
      ...snapshot,
      from: { ...snapshot.from },
      to: { ...snapshot.to },
    }),

    begin(fromId: string, toId: string) {
      const from = endpoint(fromId);
      const to = endpoint(toId);
      snapshot = {
        active: true,
        mode: options.reducedMotion ? 'cross-fade' : 'curve',
        progress: 0,
        from,
        to,
        scaleDisclosure: to.representation === 'enlarged'
          ? 'You are entering an enlarged scientific view; sizes are representational.'
          : 'You are returning to the life-size garden.',
      };
      return this.snapshot();
    },

    update(deltaProgress: number) {
      snapshot.progress = Math.max(0, Math.min(1, snapshot.progress + deltaProgress));
      snapshot.active = snapshot.progress < 1;
      return this.snapshot();
    },

    reset() {
      snapshot = {
        active: false,
        mode: options.reducedMotion ? 'cross-fade' : 'curve',
        progress: 0,
        from: LITERAL_GARDEN,
        to: LITERAL_GARDEN,
        scaleDisclosure: 'The garden is shown at life size.',
      };
      return this.snapshot();
    },
  };
}

export type ScaleTransition = ReturnType<typeof createScaleTransition>;
