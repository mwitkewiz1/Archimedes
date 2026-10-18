// Nothing grows unchecked: every code file in app/ stays at or under 600 lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT = 600;

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(js|css|html)$/.test(n) ? [p] : [];
  });
}

test(`code files in app/ are at most ${LIMIT} lines`, () => {
  const over = files('app')
    .map((p) => [p, readFileSync(p, 'utf8').split('\n').length])
    .filter(([, n]) => n > LIMIT);
  assert.deepEqual(over, [], 'split these before they grow');
});
