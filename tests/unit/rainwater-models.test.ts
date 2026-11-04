import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { beforeAll, describe, expect, it } from 'vitest';

const MODELS = resolve(process.cwd(), 'apps/web/public/models/rainwater');
const EAVE = 2.66;
const RIDGE = 3.62;
const RUN = 2.38;

async function worldVertices(file: string) {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const document = await io.read(resolve(MODELS, file));
  const vertices: [number, number, number][] = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION')!;
      const p = [0, 0, 0];
      for (let index = 0; index < positions.getCount(); index += 1) {
        positions.getElement(index, p);
        vertices.push([
          m[0] * p[0]! + m[4] * p[1]! + m[8] * p[2]! + m[12],
          m[1] * p[0]! + m[5] * p[1]! + m[9] * p[2]! + m[13],
          m[2] * p[0]! + m[6] * p[1]! + m[10] * p[2]! + m[14],
        ]);
      }
    }
  }
  return vertices;
}

describe('rainwater models', () => {
  let house: [number, number, number][];
  beforeAll(async () => {
    house = await worldVertices('sundargram-house.glb');
  });

  it('lays every roof tile row along the slope so rain runs down to the eave', () => {
    const slopeHeight = (z: number) => EAVE + (RIDGE - EAVE) * (1 - Math.abs(z) / RUN);
    const worst = house
      .filter(([, y, z]) => y > EAVE + 0.06 && Math.abs(z) > 0.25 && Math.abs(z) < RUN)
      .reduce((most, [, y, z]) => Math.max(most, y - slopeHeight(z)), -Infinity);
    expect(worst).toBeLessThan(0.11);
  });
});
