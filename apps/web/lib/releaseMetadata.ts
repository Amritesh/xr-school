import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';

export interface ReleaseMetadata {
  commitSha: string;
  publiclyLaunchable: number;
  evidenceMaturity: {
    internalQA: number;
    deviceVerified: number;
    classroomVerified: number;
  };
}

export function buildReleaseMetadata(
  commitSha: string,
  definitions: readonly ImplementedSimulationDefinition[],
): ReleaseMetadata {
  const released = definitions.filter(
    definition => definition.module.publicationStatus === 'released',
  );
  return {
    commitSha,
    publiclyLaunchable: released.length,
    evidenceMaturity: {
      internalQA: released.filter(
        definition => definition.module.evidenceMaturity === 'internalQA',
      ).length,
      deviceVerified: released.filter(
        definition => definition.module.evidenceMaturity === 'deviceVerified',
      ).length,
      classroomVerified: released.filter(
        definition => definition.module.evidenceMaturity === 'classroomVerified',
      ).length,
    },
  };
}
