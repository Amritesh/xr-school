#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

import {
  PR8_CONTRIBUTIONS,
  PR8_HEAD,
  inspectPr8Viewer,
  narrationKey,
} from './lib/pr8-quality-evidence.js';

const OUTPUT_PATH = resolve(
  process.cwd(),
  'tmp/pdfs/pr8-quality-audit/baseline-evidence.json',
);

const REVIEWED_SUMMARY = Object.freeze({
  pr: 8,
  headSha: PR8_HEAD,
  contributions: 23,
  netNewClasses: 22,
  overlappingEnhancements: 1,
  viewerAddedLines: 16_846,
  referencedNarrationClips: 189,
  trackedNarrationClips: 16,
  missingNarrationClips: 173,
});

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitText(path: string): string {
  return git('show', `${PR8_HEAD}:${path}`);
}

function collectStringLiterals(node: ts.Node, texts: string[]): void {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    texts.push(node.text);
    return;
  }
  node.forEachChild(child => collectStringLiterals(child, texts));
}

export function extractNarrationTexts(source: string, sourcePath = 'viewer.tsx'): string[] {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const texts: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && /NARRATION/i.test(node.name.text)
      && node.initializer
    ) {
      collectStringLiterals(node.initializer, texts);
      return;
    }
    node.forEachChild(visit);
  };

  visit(file);
  return texts;
}

function sourceLineCount(source: string): number {
  return source.length === 0 ? 0 : (source.match(/\n/g)?.length ?? 0) + (source.endsWith('\n') ? 0 : 1);
}

function assertReviewedSummary(actual: typeof REVIEWED_SUMMARY): void {
  for (const [key, expected] of Object.entries(REVIEWED_SUMMARY)) {
    const received = actual[key as keyof typeof actual];
    if (received !== expected) {
      throw new Error(
        `Immutable PR #8 evidence mismatch for ${key}: expected ${String(expected)}, received ${String(received)}`,
      );
    }
  }
}

export function capturePr8QualityEvidence() {
  const resolvedHead = git('rev-parse', PR8_HEAD).trim();
  if (resolvedHead !== PR8_HEAD) {
    throw new Error(`PR #8 head mismatch: expected ${PR8_HEAD}, received ${resolvedHead}`);
  }

  const trackedPaths = new Set(
    git('ls-tree', '-r', '--name-only', PR8_HEAD)
      .split(/\r?\n/)
      .filter(Boolean),
  );

  const contributions = PR8_CONTRIBUTIONS.map(contribution => {
    const source = gitText(contribution.sourcePath);
    const testSource = gitText(contribution.testPath);
    const narrationTexts = extractNarrationTexts(source, contribution.sourcePath);
    const evidence = inspectPr8Viewer({
      source,
      testSource,
      trackedNarrationPaths: trackedPaths,
      narrationTexts,
    });

    return {
      ...contribution,
      sourceLines: sourceLineCount(source),
      narrationKeys: narrationTexts.map(narrationKey),
      evidence,
    };
  }).sort((left, right) => left.prSlug.localeCompare(right.prSlug));

  const summary = {
    pr: 8,
    headSha: PR8_HEAD,
    contributions: contributions.length,
    netNewClasses: contributions.filter(item => item.integration === 'new-class').length,
    overlappingEnhancements: contributions.filter(
      item => item.integration === 'existing-enhancement',
    ).length,
    viewerAddedLines: contributions.reduce((total, item) => total + item.sourceLines, 0),
    referencedNarrationClips: contributions.reduce(
      (total, item) => total + item.evidence.referencedNarrationClips,
      0,
    ),
    trackedNarrationClips: contributions.reduce(
      (total, item) => total + item.evidence.trackedNarrationClips,
      0,
    ),
    missingNarrationClips: contributions.reduce(
      (total, item) => total + item.evidence.missingNarrationClips,
      0,
    ),
  } as const;

  assertReviewedSummary(summary);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    contributions,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const evidence = capturePr8QualityEvidence();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(
    `PR #8 baseline captured: ${evidence.summary.contributions} contributions, `
    + `${evidence.summary.referencedNarrationClips} narration references, `
    + `${evidence.summary.missingNarrationClips} missing clips.`,
  );
}
