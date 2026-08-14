import { describe, expect, it } from 'vitest';

import { buildReleaseMetadata } from '../../apps/web/lib/releaseMetadata';
import { IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/implemented/registry';
import { EXPECTED_RELEASED_SIMULATION_COUNT } from '../../scripts/lib/simulation-quality-data';

describe('release metadata', () => {
  it('exposes the deployed SHA without overstating evidence', () => {
    expect(buildReleaseMetadata('abc123', IMPLEMENTED_SIMULATIONS)).toEqual({
      commitSha: 'abc123',
      publiclyLaunchable: EXPECTED_RELEASED_SIMULATION_COUNT,
      evidenceMaturity: {
        internalQA: EXPECTED_RELEASED_SIMULATION_COUNT,
        deviceVerified: 0,
        classroomVerified: 0,
      },
    });
  });
});
