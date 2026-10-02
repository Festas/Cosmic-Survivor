// check.mjs — syntax-check every source module with `node --check`.
// Acts as a lightweight lint step for CI (no external dependencies).

import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (['.js', '.mjs'].includes(extname(entry.name))) out.push(full);
  }
  return out;
}

const dirs = ['src', 'tools', 'tests'];
let failed = 0;
let count = 0;
for (const d of dirs) {
  let files = [];
  try { files = await walk(join(root, d)); } catch { continue; }
  for (const f of files) {
    count++;
    try {
      await run(process.execPath, ['--check', f]);
    } catch (err) {
      failed++;
      console.error(`✗ ${f.replace(root, '')}`);
      console.error(err.stderr || err.message);
    }
  }
}

if (failed) {
  console.error(`\n${failed}/${count} file(s) failed syntax check.`);
  process.exit(1);
}
console.log(`✓ ${count} files passed syntax check.`);
