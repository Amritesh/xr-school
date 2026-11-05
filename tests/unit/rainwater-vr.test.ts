import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createQuestVrControls } from '../../apps/web/components/simulations/questVrControls';
import { createRainwaterScene } from '../../apps/web/lib/rainwaterScene';
import { watchInterruptions } from '../../apps/web/lib/world-builder/sessionInterruptions';
import type { GlbAssetLoader } from '../../apps/web/lib/world-builder/glbAssets';

function fakeXr() {
  const session = Object.assign(new EventTarget(), {
    ended: 0,
    visibilityState: 'visible' as XRVisibilityState,
    end() {
      this.ended += 1;
      return Promise.resolve();
    },
  });
  const xr = Object.assign(new EventTarget(), {
    isPresenting: false,
    getSession: () => session as unknown as XRSession,
    getCamera: () => new THREE.PerspectiveCamera(),
  });
  return { session, xr };
}

function quest(options: { gripExits?: boolean }) {
  const { session, xr } = fakeXr();
  const controllers = [new THREE.Group(), new THREE.Group()] as unknown as THREE.XRTargetRaySpace[];
  const controls = createQuestVrControls({
    renderer: { xr } as unknown as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    controllers,
    onPrimary: () => undefined,
    onBack: () => undefined,
    onNarrate: () => undefined,
    ...options,
  });
  xr.dispatchEvent(new Event('sessionstart'));
  const squeeze = () => {
    controllers[1]!.dispatchEvent({ type: 'squeezestart' } as never);
    session.dispatchEvent(
      Object.assign(new Event('squeezestart'), { inputSource: { handedness: 'right' } }),
    );
  };
  return { session, squeeze, controls };
}

describe('Quest grip button', () => {
  it('still ends VR by default for other simulations', () => {
    const { session, squeeze } = quest({});
    squeeze();
    expect(session.ended).toBeGreaterThan(0);
  });

  it('can be turned off where the lesson asks children to pick things up', () => {
    const { session, squeeze } = quest({ gripExits: false });
    squeeze();
    expect(session.ended).toBe(0);
  });
});

describe('storm interruptions', () => {
  function watch() {
    const { session, xr } = fakeXr();
    const doc = Object.assign(new EventTarget(), { hidden: false });
    const log: boolean[] = [];
    const stop = watchInterruptions({
      document: doc as unknown as Document,
      xr: xr as never,
      onPausedChange: paused => log.push(paused),
    });
    return { session, xr, doc, log, stop };
  }

  it('pauses when the tab is hidden and resumes when it returns', () => {
    const { doc, log } = watch();
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(log).toEqual([true, false]);
  });

  it('pauses when VR ends and resumes on re-entering VR', () => {
    const { xr, log } = watch();
    xr.dispatchEvent(new Event('sessionend'));
    expect(log).toEqual([true]);
    xr.dispatchEvent(new Event('sessionstart'));
    expect(log).toEqual([true, false]);
  });

  it('pauses behind the Quest system menu', () => {
    const { session, xr, log } = watch();
    xr.dispatchEvent(new Event('sessionstart'));
    session.visibilityState = 'hidden';
    session.dispatchEvent(new Event('visibilitychange'));
    session.visibilityState = 'visible';
    session.dispatchEvent(new Event('visibilitychange'));
    expect(log).toEqual([false, true, false]);
  });

  it('ignores page visibility while in VR, which the headset may report as hidden', () => {
    const { xr, doc, log } = watch();
    xr.isPresenting = true;
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(log).toEqual([]);
  });

  it('stops listening when disposed', () => {
    const { doc, log, stop } = watch();
    stop();
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(log).toEqual([]);
  });
});

describe('VR standing spots', () => {
  const fallbackOnly: GlbAssetLoader = {
    load: () => Promise.reject(new Error('offline')),
    loadOrFallback: (_url, fallback) => Promise.resolve(fallback()),
    dispose: () => undefined,
  };

  it('stands the child in front of each stage, facing the work', async () => {
    const world = await createRainwaterScene(new THREE.Scene(), fallbackOnly, {
      reducedMotion: false,
    });
    const inFront = (stage: Parameters<typeof world.vrSpotFor>[0], target: THREE.Object3D) => {
      const spot = world.vrSpotFor(stage);
      const away = target.position.clone().sub(spot).setY(0);
      // The rig starts facing -Z: the target should be ahead and within a comfortable turn.
      expect(away.z, stage).toBeLessThan(0);
      expect(Math.abs(Math.atan2(away.x, -away.z)), stage).toBeLessThan(THREE.MathUtils.degToRad(45));
      expect(spot.y, stage).toBe(0);
    };
    inFront('rooftop', world.socketTargets.get('gutter-socket-3')!);
    inFront('rooftop', world.pieceTargets.get('gutter-1')!);
    inFront('filter', world.socketTargets.get('filter-top')!);
    inFront('filter', world.pieceTargets.get('stones')!);
    inFront('school', world.socketTargets.get('school-tank-socket')!);
    inFront('school', world.pieceTargets.get('school-tank')!);
    inFront('recharge', world.socketTargets.get('pit-top')!);
    inFront('recharge', world.pieceTargets.get('pit-sand')!);
    inFront('storm', world.stormTargets.get('valve-pond')!);
    inFront('storm', world.stormTargets.get('valve-houseTank')!);
    inFront('storm', world.stormTargets.get('leaf-block')!);
  });
});
