import test from 'node:test';
import assert from 'node:assert/strict';
import { KINDS } from '../app/js/core/kinds.js';

test('every pump kind is complete', () => {
  const ids = new Set();
  for (const k of KINDS) {
    assert.ok(!ids.has(k.id), `two kinds called ${k.id}`);
    ids.add(k.id);
    for (const field of ['name', 'where', 'engine', 'watch']) assert.ok(k[field], `${k.id}: needs ${field}`);
    assert.ok(k.how.length >= 3, `${k.id}: walk through at least 3 steps`);
    for (const part of k.parts) assert.equal(part.length, 3, `${k.id}: each part needs name, what it does, how it fails`);
  }
});

test('every pump kind has a cutaway drawing', async () => {
  const { DRAWN } = await import('../app/js/ui/pumpart.js');
  for (const k of KINDS) assert.ok(DRAWN.includes(k.id), `${k.id}: no drawing in ui/pumpart.js`);
});
