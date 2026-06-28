import type { QualityProfileId } from '../../../simulation-schema/src/world';

export interface DeviceQualityCapabilities {
  isImmersiveXr: boolean;
  deviceMemoryGb?: number;
  maxTextureSize?: number;
}

export function chooseQualityProfile(
  capabilities: DeviceQualityCapabilities,
): QualityProfileId {
  if (capabilities.isImmersiveXr) return 'questBaseline';
  if (Number.isFinite(capabilities.deviceMemoryGb)
    && Number.isFinite(capabilities.maxTextureSize)
    && capabilities.deviceMemoryGb! >= 8
    && capabilities.maxTextureSize! >= 8192) {
    return 'browserEnhanced';
  }
  return 'browserBalanced';
}

export function nextLowerQualityProfile(
  profile: QualityProfileId,
): QualityProfileId | undefined {
  if (profile === 'browserEnhanced') return 'browserBalanced';
  if (profile === 'browserBalanced') return 'questBaseline';
  return undefined;
}
