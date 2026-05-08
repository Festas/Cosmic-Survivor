import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';

test('tsc --noEmit passes', () => {
  const r = spawnSync('npx', ['tsc', '--noEmit'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
