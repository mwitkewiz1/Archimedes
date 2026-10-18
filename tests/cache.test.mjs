// The offline cache (app/sw.js FILES) lists every app file, and nothing that
// isn't there: a missing entry means phones keep an old copy offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const sw = readFileSync('app/sw.js', 'utf8');
const listed = [...sw.slice(sw.indexOf('FILES'), sw.indexOf('];')).matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [relative('app', p).split(sep).join('/')];
  });
}

test('every file the cache lists exists', () => {
  for (const f of listed) assert.ok(existsSync(join('app', f)), `sw.js lists ${f}, which isn't there`);
});

test('every app file is in the cache list', () => {
  const missing = files('app').filter((f) => f !== 'sw.js' && !listed.includes(f));
  assert.deepEqual(missing, [], 'add these to FILES in app/sw.js and bump VERSION');
});
