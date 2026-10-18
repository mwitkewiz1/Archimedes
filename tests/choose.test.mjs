import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, choosePump } from '../app/js/core/choose.js';
import { KINDS } from '../app/js/core/kinds.js';

const ids = new Set(KINDS.map((k) => k.id));

// Every combination of answers.
function* all(i = 0, picked = {}) {
  if (i === QUESTIONS.length) { yield picked; return; }
  for (const [v] of QUESTIONS[i].options) yield* all(i + 1, { ...picked, [QUESTIONS[i].key]: v });
}

test('every answer lands on a pump the app explains', () => {
  for (const a of all()) {
    const r = choosePump(a);
    assert.ok(ids.has(r.kind), `${JSON.stringify(a)} → ${r.kind}`);
    assert.ok(r.why, 'says why');
    if (r.also) assert.ok(ids.has(r.also), `also ${r.also}`);
  }
});

test('the rules of thumb', () => {
  assert.equal(choosePump({ water: 'clear', depth: 'shallow', power: 'no', size: 'big' }).kind, 'dieseldw');
  assert.equal(choosePump({ water: 'trash', depth: 'shallow', power: 'no', size: 'big' }).kind, 'diesel');
  assert.equal(choosePump({ water: 'clear', depth: 'deep', power: 'no', size: 'big' }).kind, 'submersible');
  assert.equal(choosePump({ water: 'slurry', depth: 'shallow', power: 'yes', size: 'big' }).kind, 'slurry');
  assert.equal(choosePump({ water: 'clear', depth: 'shallow', power: 'no', size: 'small' }).kind, 'gas');
});

test('the newer jobs', () => {
  assert.equal(choosePump({ water: 'sewage', depth: 'shallow', power: 'yes', size: 'small' }).kind, 'grinder');
  assert.equal(choosePump({ water: 'sewage', depth: 'deep', power: 'yes', size: 'big' }).kind, 'sewage');
  assert.equal(choosePump({ water: 'thick', depth: 'shallow', power: 'no', size: 'big' }).kind, 'diaphragm');
  assert.equal(choosePump({ water: 'boost', depth: 'shallow', power: 'yes', size: 'big' }).kind, 'booster');
  assert.equal(choosePump({ water: 'trash', depth: 'deep', power: 'no', size: 'big' }).also, 'hydraulic');
});
