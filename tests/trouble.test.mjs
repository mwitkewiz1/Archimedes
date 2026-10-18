import test from 'node:test';
import assert from 'node:assert/strict';
import { SYMPTOMS, troubleFor } from '../app/js/core/trouble.js';
import { KINDS } from '../app/js/core/kinds.js';

const ids = new Set(KINDS.map((k) => k.id));

test('every symptom and cause is complete and names real pumps', () => {
  for (const s of SYMPTOMS) {
    assert.ok(s.name && s.causes.length, `${s.id}: needs a name and causes`);
    for (const k of s.kinds || []) assert.ok(ids.has(k), `${s.id}: no pump ${k}`);
    for (const c of s.causes) {
      assert.ok(c.why && c.check && c.fix, `${s.id}: each cause needs why, check, fix`);
      for (const k of c.kinds || []) assert.ok(ids.has(k), `${s.id}: no pump ${k}`);
      if (c.part) assert.ok(ids.has(c.part), `${s.id}: no part page ${c.part}`);
    }
  }
});

test('every pump has something to troubleshoot', () => {
  for (const k of KINDS) assert.ok(troubleFor(k.id).length >= 3, `${k.id}: too few symptoms`);
});

test('filtering by pump keeps only what fits', () => {
  const sub = troubleFor('submersible');
  assert.ok(!sub.some((s) => s.id === 'noprime'), 'submersibles need no priming');
  assert.ok(sub.some((s) => s.id === 'milky'));
  const gas = troubleFor('gas');
  assert.ok(gas.some((s) => s.id === 'noprime'));
  assert.ok(!gas.flatMap((s) => s.causes).some((c) => c.why.startsWith('Running backwards')), 'an engine pump has no phase rotation');
  assert.equal(troubleFor('').length, SYMPTOMS.length);
});
