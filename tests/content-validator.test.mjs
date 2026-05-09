import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('validate:content accepts TypeScript entity tables', () => {
    const result = spawnSync('node', ['tools/content-validator/validate.mjs'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /\[validate:content\] OK/);
});
