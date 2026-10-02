// build.mjs — produce a static `dist/` folder ready for any static host.
// The game needs no bundling (native ES modules), so we just copy assets.

import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

const ENTRIES = [
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'sw.js',
  'src',
  'assets',
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const name of ENTRIES) {
  const from = join(root, name);
  const to = join(dist, name);
  try {
    await cp(from, to, { recursive: true });
  } catch (err) {
    console.warn(`skip ${name}: ${err.message}`);
  }
}

const files = await readdir(dist);
console.log(`✓ Built static site to dist/ (${files.length} entries): ${files.join(', ')}`);
