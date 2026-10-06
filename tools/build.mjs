// build.mjs — produce a static `dist/` folder ready for any static host.
// The game needs no bundling (native ES modules), so we just copy assets and then
// stamp the service worker with a content hash for reliable cache-busting.

import { cp, rm, mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFiles, stampVersion } from './sw-version.mjs';

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

// Stamp the service worker with a content hash of the built site so every deploy
// gets a unique cache name (see sw.js) and clients never get stuck on old code.
// Everything except sw.js is hashed, so the value doesn't depend on itself.
const swPath = join(dist, 'sw.js');
if (await exists(swPath)) {
  const files = (await listFiles(dist)).filter((f) => f !== swPath);
  const entries = await Promise.all(
    files.map(async (f) => ({ path: relative(dist, f), data: await readFile(f) }))
  );
  const version = hashFiles(entries);
  await writeFile(swPath, stampVersion(await readFile(swPath, 'utf8'), version));
  console.log(`✓ Stamped service worker cache: cosmic-survivor-${version}`);
}

const built = await readdir(dist);
console.log(`✓ Built static site to dist/ (${built.length} entries): ${built.join(', ')}`);

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full));
    else out.push(full);
  }
  return out;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

