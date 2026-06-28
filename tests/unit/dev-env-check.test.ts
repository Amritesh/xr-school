import { describe, expect, it } from 'vitest';

const modulePath = '../../scripts/dev-env-check.mjs';

describe('dev environment check', () => {
  it('accepts Node versions 22 and newer', async () => {
    const { isSupportedNodeVersion } = await import(modulePath);

    expect(isSupportedNodeVersion('v22.0.0')).toBe(true);
    expect(isSupportedNodeVersion('v23.11.0')).toBe(true);
    expect(isSupportedNodeVersion('24.1.0')).toBe(true);
  });

  it('rejects Node versions older than 22', async () => {
    const { isSupportedNodeVersion } = await import(modulePath);

    expect(isSupportedNodeVersion('v14.21.3')).toBe(false);
    expect(isSupportedNodeVersion('v20.19.1')).toBe(false);
  });

  it('reports missing required paths by label', async () => {
    const { collectMissingRequiredPaths } = await import(modulePath);

    const missing = collectMissingRequiredPaths(
      [
        { label: 'contract', path: '/repo/contracts/typespec/main.tsp' },
        { label: 'catalog', path: '/repo/docs/catalog/catalog.csv' },
      ],
      candidate => candidate.endsWith('main.tsp')
    );

    expect(missing).toEqual(['catalog']);
  });
});
