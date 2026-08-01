import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';
import { NextResponse } from 'next/server';

import { buildReleaseMetadata } from '../../../lib/releaseMetadata';

export const dynamic = 'force-dynamic';

export function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA
    ?? process.env.GITHUB_SHA
    ?? 'development';
  return NextResponse.json(
    buildReleaseMetadata(commitSha, IMPLEMENTED_SIMULATIONS),
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
