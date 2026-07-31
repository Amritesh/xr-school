import { spawnSync } from 'node:child_process';

const packageNames = [
  '@xr-school/simulation-schema',
  '@xr-school/simulation-runtime',
  '@xr-school/simulation-content',
  '@xr-school/classroom-sync',
  '@xr-school/evaluation-engine',
];

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const packageName of packageNames) {
  const result = spawnSync(
    npmCommand,
    ['--workspace', packageName, 'run', 'type-check'],
    { stdio: 'inherit' },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
