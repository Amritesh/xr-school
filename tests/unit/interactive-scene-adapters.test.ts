import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createResourceRegistry } from '../../packages/simulation-runtime/src/index';
import type {
  NormalizedAction,
  NormalizedInputSource,
} from '../../packages/simulation-schema/src/index';
import type {
  SimulationInteractionRegistry,
  SimulationInteractionTarget,
  SimulationSceneContext,
} from '../../packages/simulation-web/src/index';
import { INTERACTIVE_VIEWER_REGISTRATIONS } from '../../apps/web/lib/simulations/interactive/registrations';

function createRecordingContext() {
  const registeredTargets: SimulationInteractionTarget[] = [];
  const targets = new Map<string, SimulationInteractionTarget>();
  const unregister = vi.fn();
  const dispatch = vi.fn<(action: NormalizedAction) => void>();
  const recordEvidence = vi.fn<(evidenceId: string) => void>();
  const interactions: SimulationInteractionRegistry = {
    register(target) {
      registeredTargets.push(target);
      targets.set(target.id, target);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        targets.delete(target.id);
        unregister(target.id);
      };
    },
    activate(targetId: string, source: NormalizedInputSource) {
      const target = targets.get(targetId);
      if (!target) throw new Error(`Unknown interaction target: ${targetId}`);
      dispatch({
        actionId: target.actionId,
        targetEntityId: target.id,
        source,
        phase: 'commit',
        stageId: 'test-stage',
        timestampMs: 1,
      });
    },
    clear() {
      targets.clear();
    },
  };
  const resources = createResourceRegistry();
  const context: SimulationSceneContext = {
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    resources,
    profile: () => 'browserBalanced',
    preferences: {
      reducedMotion: false,
      seatedMode: false,
      locomotion: 'stationary',
      turnMode: 'snap',
    },
    interactions,
    dispatch,
    recordEvidence,
  };
  return {
    context,
    registeredTargets,
    unregister,
    dispatch,
    recordEvidence,
    interactions,
    resources,
  };
}

describe('interactive scene adapters', () => {
  it.each(Object.entries(INTERACTIVE_VIEWER_REGISTRATIONS))(
    '%s remains a projection-only, disposable interaction surface',
    async (_viewerKey, registration) => {
      const recording = createRecordingContext();
      const adapter = registration.createAdapter();
      const handle = await adapter.create(recording.context);
      const snapshot = registration.createSession().snapshot();

      expect(recording.registeredTargets.length).toBeGreaterThan(0);
      expect(
        recording.registeredTargets.every(target =>
          target.accessibilityLabel.trim(),
        ),
      ).toBe(true);
      expect(
        recording.registeredTargets.every(
          target => target.inputSources?.includes('xr-controller') ?? true,
        ),
      ).toBe(true);
      expect(recording.recordEvidence).not.toHaveBeenCalled();

      handle.applySnapshot(snapshot.lesson);
      adapter.projectDomain(snapshot.domain);
      recording.interactions.activate(
        recording.registeredTargets[0].id,
        'xr-controller',
      );
      expect(recording.dispatch).toHaveBeenCalledTimes(1);
      expect(recording.recordEvidence).not.toHaveBeenCalled();
      expect(() =>
        recording.interactions.activate('unregistered-mesh', 'mouse'),
      ).toThrow(/unknown interaction target/i);

      await handle.dispose();
      await handle.dispose();
      expect(recording.unregister).toHaveBeenCalledTimes(
        recording.registeredTargets.length,
      );
      expect(recording.context.scene.children).toHaveLength(0);
      await recording.resources.disposeAll();
    },
  );
});
