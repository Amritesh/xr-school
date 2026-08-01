import { spawnSync } from 'node:child_process';

const packageNames = [
  '@xr-school/simulation-schema',
  '@xr-school/simulation-runtime',
  '@xr-school/evaluation-engine',
  '@xr-school/simulation-content',
  '@xr-school/classroom-sync',
  '@xr-school/simulation-web',
];

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const packageName of packageNames) {
  const result = spawnSync(
    npmCommand,
    ['--workspace', packageName, 'run', 'build'],
    { stdio: 'inherit' },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
