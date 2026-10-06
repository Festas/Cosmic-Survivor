import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFiles, stampVersion } from '../tools/sw-version.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('hashFiles is deterministic and order-independent', () => {
  const a = [{ path: 'a.js', data: Buffer.from('x') }, { path: 'b.js', data: Buffer.from('y') }];
  const b = [{ path: 'b.js', data: Buffer.from('y') }, { path: 'a.js', data: Buffer.from('x') }];
  assert.equal(hashFiles(a), hashFiles(b));
});

test('hashFiles changes when any file content changes', () => {
  const base = [{ path: 'a.js', data: Buffer.from('x') }];
  const changed = [{ path: 'a.js', data: Buffer.from('X') }];
  assert.notEqual(hashFiles(base), hashFiles(changed));
});

test('hashFiles changes when a file is renamed', () => {
  const base = [{ path: 'a.js', data: Buffer.from('x') }];
  const renamed = [{ path: 'b.js', data: Buffer.from('x') }];
  assert.notEqual(hashFiles(base), hashFiles(renamed));
});

test('stampVersion replaces the VERSION token and drops the placeholder', () => {
  const src = "const VERSION = 'dev';\nconst CACHE = `cosmic-survivor-${VERSION}`;\n";
  const out = stampVersion(src, 'abc123');
  assert.match(out, /const VERSION = 'abc123';/);
  assert.doesNotMatch(out, /'dev'/);
});

test('stampVersion leaves source untouched when the token is absent', () => {
  const src = 'const CACHE = "nope";\n';
  assert.equal(stampVersion(src, 'abc123'), src);
});

test('service worker precaches every src module (guards cache completeness)', async () => {
  const sw = await readFile(join(root, 'sw.js'), 'utf8');
  const mods = [];
  async function walk(dir, rel) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const r = `${rel}/${entry.name}`;
      if (entry.isDirectory()) await walk(join(dir, entry.name), r);
      else if (extname(entry.name) === '.js') mods.push(`.${r}`);
    }
  }
  await walk(join(root, 'src'), '/src');
  assert.ok(mods.length > 0, 'expected to find src modules');
  for (const m of mods) {
    assert.ok(sw.includes(`'${m}'`), `sw.js ASSETS is missing ${m}`);
  }
});

test('service worker exposes a stampable VERSION token', async () => {
  const sw = await readFile(join(root, 'sw.js'), 'utf8');
  assert.match(sw, /const VERSION = '[^']*';/);
});
