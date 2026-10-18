import test from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, GROUPS, searchSymbols } from '../app/js/core/symbols.js';

const SHAPES = { line: 5, path: 2, circle: 4, dot: 3, text: 4 };

test('every symbol is complete and drawable on its grid', () => {
  const ids = new Set();
  const groups = new Set(GROUPS.map(([g]) => g));
  for (const s of SYMBOLS) {
    assert.ok(!ids.has(s.id), `two symbols called ${s.id}`);
    ids.add(s.id);
    assert.ok(groups.has(s.group), `${s.id}: no group ${s.group}`);
    assert.ok(s.name && s.says, `${s.id}: needs a name and plain words`);
    assert.ok(s.draw.length, `${s.id}: nothing to draw`);
    for (const shape of s.draw) {
      assert.equal(shape.length, SHAPES[shape[0]], `${s.id}: bad ${shape[0]}`);
      for (const n of shape.slice(1).filter((x) => typeof x === 'number')) assert.ok(n >= 0 && n <= 100, `${s.id}: ${n} off the grid`);
    }
  }
});

test('search by name, letters or plain words', () => {
  assert.equal(searchSymbols('float')[0].id, 'float');
  assert.ok(searchSymbols('OL').some((s) => s.id === 'ol-contact'));
  assert.ok(searchSymbols('stop').some((s) => s.id === 'pb-nc'));
  assert.ok(searchSymbols('lockout').some((s) => s.id === 'disconnect'));
  assert.equal(searchSymbols('').length, SYMBOLS.length);
  assert.ok(searchSymbols('', 'relay').every((s) => s.group === 'relay'));
  assert.equal(searchSymbols('banana').length, 0);
});
