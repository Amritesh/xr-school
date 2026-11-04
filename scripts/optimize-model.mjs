#!/usr/bin/env node
// Compresses a source GLB into apps/web/public/models/<group>/ and records its
// provenance in that group's SOURCES.json. Compression only: named nodes are
// kept, so merge meshes when authoring (one mesh per shared material).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    group: { type: 'string' },
    source: { type: 'string' },
    author: { type: 'string' },
    license: { type: 'string' },
    modifications: { type: 'string' },
  },
});

const [input, outName] = positionals;
const missing = ['group', 'source', 'author', 'license', 'modifications'].filter(
  key => !values[key]?.trim(),
);
if (!input || !outName || missing.length > 0) {
  console.error(
    'Usage: optimize-model.mjs <source.glb> <outName> --group <g> --source <url> ' +
      '--author <name> --license <id> --modifications <text>',
  );
  if (missing.length > 0) console.error(`Missing: ${missing.join(', ')}`);
  process.exit(1);
}

function countTriangles(document) {
  let triangles = 0;
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const count = indices
        ? indices.getCount()
        : (primitive.getAttribute('POSITION')?.getCount() ?? 0);
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(input);
const triangles = countTriangles(document);

const groupDirectory = join(repositoryRoot, 'apps/web/public/models', values.group);
mkdirSync(groupDirectory, { recursive: true });
const file = `${outName}.glb`;
const output = join(groupDirectory, file);
const compressed = spawnSync(
  `npx gltf-transform meshopt "${resolve(input)}" "${output}" --level medium`,
  { cwd: repositoryRoot, shell: true, stdio: 'inherit' },
);
if (compressed.error) throw compressed.error;
if (compressed.status !== 0) process.exit(compressed.status ?? 1);

const registerPath = join(groupDirectory, 'SOURCES.json');
let register = [];
try {
  register = JSON.parse(readFileSync(registerPath, 'utf8'));
} catch {
  register = [];
}
const entry = {
  file,
  source: values.source,
  author: values.author,
  license: values.license,
  modifications: values.modifications,
  bytes: statSync(output).size,
  sha256: createHash('sha256').update(readFileSync(output)).digest('hex'),
  triangles,
};
register = [...register.filter(item => item.file !== file), entry].sort((a, b) =>
  a.file.localeCompare(b.file),
);
writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`);
console.log(`${file}: ${triangles} triangles, ${entry.bytes} bytes`);
