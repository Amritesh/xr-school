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
    const { isSupportedNodeVersion, runDevEnvCheck } = await import(modulePath);

    expect(isSupportedNodeVersion('v14.21.3')).toBe(false);
    expect(isSupportedNodeVersion('v20.19.1')).toBe(false);

    const result = runDevEnvCheck({
      nodeVersion: 'v20.19.1',
      platform: 'win32',
      exists: () => true,
    });

    expect(result.failures).toContain('Node v20.19.1 is unsupported. Use Node 22 or newer.');
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

  it('does not require a POSIX shell on Windows', async () => {
    const { runDevEnvCheck } = await import(modulePath);

    const result = runDevEnvCheck({
      nodeVersion: 'v22.0.0',
      platform: 'win32',
      exists: () => true,
    });

    expect(result.failures).not.toContain('Missing /bin/sh. npm script execution expects a POSIX shell.');
  });
});
