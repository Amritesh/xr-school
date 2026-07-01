import {
  chooseQualityProfile,
  type DeviceQualityCapabilities,
} from '../../../../packages/simulation-runtime/src/world/quality';

interface RendererCapabilities {
  capabilities: {
    maxTextureSize?: number;
  };
  xr?: {
    isPresenting?: boolean;
  };
}

interface DeviceMemoryNavigator extends Navigator {
  deviceMemory?: number;
}

export function readDeviceQualityCapabilities(
  renderer: RendererCapabilities,
  xrSession?: unknown,
): DeviceQualityCapabilities {
  const browserNavigator = typeof navigator === 'undefined'
    ? undefined
    : navigator as DeviceMemoryNavigator;
  return {
    isImmersiveXr: Boolean(xrSession ?? renderer.xr?.isPresenting),
    deviceMemoryGb: browserNavigator?.deviceMemory,
    maxTextureSize: renderer.capabilities.maxTextureSize,
  };
}

export function detectDeviceProfile(
  renderer: RendererCapabilities,
  xrSession?: unknown,
) {
  return chooseQualityProfile(readDeviceQualityCapabilities(renderer, xrSession));
}
