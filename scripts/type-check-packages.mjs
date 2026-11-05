import { spawnSync } from 'node:child_process';

const packageNames = [
  '@xr-school/simulation-schema',
  '@xr-school/simulation-runtime',
  '@xr-school/evaluation-engine',
  '@xr-school/simulation-content',
  '@xr-school/classroom-sync',
  '@xr-school/simulation-web',
];

for (const packageName of packageNames) {
  // A command string with shell: true resolves npm.cmd on Windows, where Node
  // refuses to spawn .cmd files directly.
  const result = spawnSync(`npm --workspace ${packageName} run type-check`, {
    shell: true,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
