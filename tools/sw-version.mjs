// sw-version.mjs — pure helpers to stamp the service worker with a build hash.
// Kept dependency-free and side-effect-free so `tools/build.mjs` stays thin and
// the logic is unit-testable (see tests/sw-version.test.mjs).

import { createHash } from 'node:crypto';

// Deterministic, order-independent content hash over the given files. Each entry
// is `{ path, data }`; both the path and the bytes are folded in so a renamed or
// edited file changes the result. Returns a short hex string.
export function hashFiles(entries) {
  const h = createHash('sha256');
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const { path, data } of sorted) {
    h.update(path);
    h.update('\0');
    h.update(data);
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

// Replace the `const VERSION = '...';` line in the service worker source with the
// given version. Returns the source unchanged if the token is missing.
export function stampVersion(swSource, version) {
  return swSource.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
}
