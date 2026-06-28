import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const deployWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/deploy.yml'), 'utf8');
const qualityWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/quality.yml'), 'utf8');
const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const vercelConfigPath = resolve(process.cwd(), 'vercel.json');
const vercelConfig = (existsSync(vercelConfigPath)
  ? JSON.parse(readFileSync(vercelConfigPath, 'utf8'))
  : {}) as {
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
};

describe('web build workflows', () => {
  it.each([
    ['deploy', deployWorkflow],
    ['quality', qualityWorkflow],
  ])('%s installs workspace dependencies from the repository root', (_name, workflow) => {
    expect(workflow).toMatch(/- name: Install (?:web )?dependencies\n\s+run: npm ci\n(?!\s+working-directory: apps\/web)/);
  });

  it('deploy invokes typecheck and build through the web workspace', () => {
    expect(deployWorkflow).toContain('run: npm --workspace apps/web run type-check');
    expect(deployWorkflow).toContain('run: npm --workspace apps/web run build');
  });

  it('uploads the prebuilt Vercel artifact as one compressed archive', () => {
    expect(deployWorkflow).toContain(
      'vercel deploy --prebuilt --prod --archive=tgz --token=${{ secrets.VERCEL_TOKEN }}',
    );
  });

  it('quality invokes the production build through the web workspace', () => {
    expect(qualityWorkflow).toContain('run: npm --workspace apps/web run build');
  });

  it('exposes a root build script for the Vercel monorepo project', () => {
    expect(rootPackage.scripts?.build).toBe('npm --workspace apps/web run build');
  });

  it('points Vercel at the web workspace build output', () => {
    expect(vercelConfig).toMatchObject({
      framework: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: 'apps/web/.next',
    });
  });
});
