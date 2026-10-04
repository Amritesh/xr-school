import type { SimulationHost } from '@xr-school/simulation-web';
import {
  createVrHudPanel,
  type VrHudButtonId,
  type VrHudContent,
} from '@/lib/vr/vrHudPanel';

export type ManagedVrHudActions = Partial<Record<VrHudButtonId, () => void>>;

/**
 * Projects the browser lesson controls into immersive WebXR. The panel uses
 * the host's existing XR ray input so a controller trigger activates the same
 * actions as the accessible DOM shell without leaking HUD actions into lesson
 * evidence.
 */
export function createManagedVrHud(host: SimulationHost) {
  const panel = createVrHudPanel({ scene: host.scene });
  let actions: ManagedVrHudActions = {};
  const unregister = (Object.keys(panel.buttons) as VrHudButtonId[]).map(id => (
    host.interactions.register({
      id: `managed-vr-hud-${id}`,
      object: panel.buttons[id],
      actionId: `host.vr-hud.${id}`,
      accessibilityLabel: `${id.replaceAll('-', ' ')} VR control`,
      inputSources: ['xr-controller'],
      emitAction: false,
      onCommit: () => actions[id]?.(),
    })
  ));
  const onSessionStart = () => panel.setVisible(true);
  const onSessionEnd = () => panel.setVisible(false);
  host.renderer.xr.addEventListener('sessionstart', onSessionStart);
  host.renderer.xr.addEventListener('sessionend', onSessionEnd);
  const removeFrameListener = host.addFrameListener(deltaSeconds => {
    if (host.renderer.xr.isPresenting) {
      panel.update(host.renderer.xr.getCamera(), deltaSeconds);
    }
  });

  return {
    setContent(content: VrHudContent, nextActions: ManagedVrHudActions) {
      actions = nextActions;
      panel.setContent(content);
    },
    dispose() {
      actions = {};
      removeFrameListener();
      host.renderer.xr.removeEventListener('sessionstart', onSessionStart);
      host.renderer.xr.removeEventListener('sessionend', onSessionEnd);
      for (const release of unregister) release();
      panel.dispose();
    },
  };
}

export type ManagedVrHud = ReturnType<typeof createManagedVrHud>;
