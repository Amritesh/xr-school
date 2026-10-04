// Run after downloading the RBI originals named below into the public directory.
// This only optimizes source photos and separates the two sides of the ₹500 pair.
// Currency artwork, including RBI's specimen markings, is never redrawn.
import sharp from 'sharp';
import { mkdir, rename, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('apps/web/public/images/money-town');
const originals = resolve('tmp/money-image-originals');
await mkdir(originals, { recursive: true });
const jobs = [];
for (const value of [1, 2, 5, 10]) {
  for (const side of ['front', 'back'])
    jobs.push({ id: `coin-rs-${value}-${side}`, ext: 'png' });
}
for (const value of [10, 20, 50, 100, 200]) {
  for (const side of ['front', 'back'])
    jobs.push({ id: `note-rs-${value}-${side}`, ext: 'png' });
}
jobs.push(
  {
    id: 'note-rs-500-front',
    original: 'note-rs-500-pair',
    ext: 'jpg',
    extract: { left: 0, top: 0, width: 338, height: 150 },
  },
  {
    id: 'note-rs-500-back',
    original: 'note-rs-500-pair',
    ext: 'jpg',
    extract: { left: 344, top: 0, width: 337, height: 150 },
  },
);
for (const job of jobs) {
  const originalName = `${job.original ?? job.id}.${job.ext}`;
  const publicOriginal = resolve(output, originalName);
  const savedOriginal = resolve(originals, originalName);
  try {
    await access(savedOriginal);
  } catch {
    await rename(publicOriginal, savedOriginal);
  }
  let pipeline = sharp(savedOriginal);
  if (job.extract) pipeline = pipeline.extract(job.extract);
  const info = await pipeline
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(resolve(output, `${job.id}.webp`));
  console.log(`${job.id}: ${info.width}×${info.height}, ${info.size} bytes`);
}
