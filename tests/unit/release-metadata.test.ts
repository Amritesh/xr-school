import { describe, expect, it } from 'vitest';

import { buildReleaseMetadata } from '../../apps/web/lib/releaseMetadata';
import { IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/implemented/registry';

describe('release metadata', () => {
  it('exposes the deployed SHA without overstating evidence', () => {
    expect(buildReleaseMetadata('abc123', IMPLEMENTED_SIMULATIONS)).toEqual({
      commitSha: 'abc123',
      publiclyLaunchable: 36,
      evidenceMaturity: {
        internalQA: 36,
        deviceVerified: 0,
        classroomVerified: 0,
      },
    });
  });
});
