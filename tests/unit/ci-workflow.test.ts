import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const normalizeLineEndings = (text: string) => text.replace(/\r\n/g, '\n');

const deployWorkflow = normalizeLineEndings(
  readFileSync(resolve(process.cwd(), '.github/workflows/deploy.yml'), 'utf8'),
);
const qualityWorkflow = normalizeLineEndings(
  readFileSync(resolve(process.cwd(), '.github/workflows/quality.yml'), 'utf8'),
);
const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const readme = normalizeLineEndings(readFileSync(resolve(process.cwd(), 'README.md'), 'utf8'));
const vercelConfigPath = resolve(process.cwd(), 'vercel.json');
const vercelConfig = (existsSync(vercelConfigPath)
  ? JSON.parse(readFileSync(vercelConfigPath, 'utf8'))
  : {}) as {
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
};
const webVercelConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), 'apps/web/vercel.json'), 'utf8'),
) as {
  buildCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
};

describe('web build workflows', () => {
  it.each([
    ['deploy', deployWorkflow],
    ['quality', qualityWorkflow],
  ])('%s installs workspace dependencies from the repository root', (_name, workflow) => {
    expect(workflow).toMatch(/- name: Install (?:web )?dependencies\n\s+run: npm ci\n(?!\s+working-directory: apps\/web)/);
  });

  it('deploy runs the root strict verification gate', () => {
    expect(deployWorkflow).toContain('run: npm run verify');
  });

  it('uploads the prebuilt Vercel artifact as one compressed archive', () => {
    expect(deployWorkflow).toContain(
      'vercel deploy --prebuilt --prod --archive=tgz --token=${{ secrets.VERCEL_TOKEN }}',
    );
  });

  it('quality runs the root strict verification gate', () => {
    expect(qualityWorkflow).toContain('run: npm run verify');
  });

  it('documents the same strict verification gate used by CI', () => {
    expect(readme).toContain('npm run verify');
    expect(readme).toContain('GitHub Actions quality gate');
    expect(readme).toContain('git diff --exit-code -- generated/openapi/openapi.json');
  });

  it('exposes a root build script for the Vercel monorepo project', () => {
    expect(rootPackage.scripts?.build).toBe(
      'npm run build:packages && npm --workspace apps/web run build',
    );
  });

  it('points Vercel at the web workspace build output', () => {
    expect(vercelConfig).toMatchObject({
      framework: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: 'apps/web/.next',
    });
  });

  it('builds the Vercel web-root project through the monorepo workspace', () => {
    expect(webVercelConfig).toMatchObject({
      installCommand: 'cd ../.. && npm install',
      buildCommand: 'cd ../.. && npm run build',
      outputDirectory: '.next',
    });
  });

  it('makes typecheck, build, and generated freshness strict release gates', () => {
    expect(rootPackage.scripts?.verify).toContain(
      'npm --workspace apps/web run type-check',
    );
    expect(rootPackage.scripts?.verify).toContain(
      'npm --workspace apps/web run build',
    );
    expect(qualityWorkflow).toContain('run: npm run verify');
    expect(qualityWorkflow).toContain('git diff --exit-code --');
    expect(qualityWorkflow).not.toContain('continue-on-error: true');
    expect(deployWorkflow).toContain('needs: verify');
  });

  it('gates report data, PDFs, APIs, packages, narration, and browser acceptance', () => {
    const gatedScripts = [
      'reports:validate',
      'reports:test',
      'reports:check',
      'test:e2e',
      'narration:validate:manifests',
      'type-check:packages',
      'build:packages',
      'api:test',
      'api:build',
    ];
    expect(rootPackage.scripts?.['reports:generate']).toBeTruthy();
    for (const script of gatedScripts) {
      expect(rootPackage.scripts?.[script], `missing root script ${script}`).toBeTruthy();
      expect(rootPackage.scripts?.verify).toContain(`npm run ${script}`);
    }
    expect(rootPackage.scripts?.verify).toContain('npm --workspace apps/web run build');
    expect(rootPackage.scripts?.verify).not.toContain('narration:author');
  });

  it.each([
    ['quality', qualityWorkflow],
    ['deploy verify', deployWorkflow.split('  deploy:')[0]],
  ])('%s installs the report and browser verification runtime', (_name, workflow) => {
    expect(workflow).toContain('actions/setup-python@v5');
    expect(workflow).toContain('python-version: "3.12"');
    expect(workflow).toContain('python -m pip install -r requirements-report.txt');
    expect(workflow).toContain('sudo apt-get install -y poppler-utils');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('run: npm run verify');
    expect(workflow).not.toMatch(/edge_tts|requirements-narration\.txt|pip install --user|narration:author/);
  });

  it('checks every generated simulation report and audited dataset for drift', () => {
    for (const path of [
      'reports/data/implemented-simulation-quality-cards.json',
      'reports/data/implemented-simulation-quality-evidence.json',
      'reports/data/new-simulation-before-after-scorecard.json',
      'reports/data/simulation-quality-pdf-visual-qa.json',
      'output/pdf/xr-school-implemented-simulations-quality-report.md',
      'output/pdf/xr-school-implemented-simulations-quality-report.pdf',
      'output/pdf/xr-school-new-simulations-top-10-mistakes.md',
      'output/pdf/xr-school-new-simulations-top-10-mistakes.pdf',
      'output/pdf/aditya-contribution-improvement-report.md',
      'output/pdf/aditya-contribution-improvement-report.pdf',
    ]) {
      expect(qualityWorkflow).toContain(path);
      expect(deployWorkflow).toContain(path);
    }
  });

  it('keeps pull-request drift checking dependency-free', () => {
    const driftJob = qualityWorkflow.split('drift-check:')[1];
    expect(driftJob).toBeDefined();
    expect(driftJob).not.toContain('npm ci');
    expect(driftJob).toContain('npm run spec:drift');
  });

  it('keeps generated workspace artifacts out of version control', () => {
    const trackedFiles = execFileSync(
      'git',
      ['ls-files', 'apps/web/package-lock.json', 'apps/web/tsconfig.tsbuildinfo'],
      { cwd: process.cwd(), encoding: 'utf8' },
    )
      .split(/\r?\n/)
      .filter(Boolean);

    expect(trackedFiles).toEqual([]);
  });
});
