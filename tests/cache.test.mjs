// The offline cache (app/sw.js FILES) lists every app file, and nothing that
// isn't there: a missing entry means phones keep an old copy offline. And an
// update clears only this app's old caches: other apps on the same web address
// share the browser's cache store, and wiping theirs takes them offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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

// Runs sw.js's activate step against a fake browser cache; returns the names left.
async function activate(names) {
  const left = new Set(names);
  const on = {};
  const self = { addEventListener: (type, fn) => { on[type] = fn; }, clients: { claim: async () => {} } };
  const caches = { keys: async () => [...left], delete: async (k) => left.delete(k) };
  vm.runInNewContext(sw, { self, caches });
  let done;
  on.activate({ waitUntil: (p) => { done = p; } });
  await done;
  return [...left];
}

test("an update clears this app's old caches and leaves other apps' alone", async () => {
  const version = /VERSION = '([^']+)'/.exec(sw)[1];
  assert.match(version, /^archimedes-/, 'VERSION must start with archimedes- or old copies never get cleared');
  const left = await activate(['archimedes-v1', 'archimedes-v30', version, 'another-app-v7']);
  assert.deepEqual(left, [version, 'another-app-v7']);
});
