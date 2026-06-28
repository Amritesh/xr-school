import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const deployWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/deploy.yml'), 'utf8');
const qualityWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/quality.yml'), 'utf8');

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

  it('quality invokes the production build through the web workspace', () => {
    expect(qualityWorkflow).toContain('run: npm --workspace apps/web run build');
  });
});
