import test from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, ROWS } from '../app/js/core/catalog-data.js';
import { CATALOG, pumpName, searchCatalog, curveFrom, said } from '../app/js/core/catalog.js';
import { KINDS } from '../app/js/core/kinds.js';
import { pumpHead } from '../app/js/core/pump.js';

const kinds = new Set(KINDS.map((k) => k.id));

// The public repo carries a kind id and numbers per pump, nothing else: no
// brand, model, part number or price can ride along (docs/decisions.md, pumps).
test('catalog rows are a kind and numbers only', () => {
  assert.ok(ROWS.length > 100);
  for (const row of ROWS) {
    assert.ok(kinds.has(row[0]), `unknown kind ${row[0]}`);
    assert.ok(row.length <= COLUMNS.length);
    for (const v of row.slice(1)) assert.equal(typeof v, 'number', `not a number: ${v}`);
  }
});

test('specs are in sensible ranges', () => {
  for (const p of CATALOG) {
    if (p.hp) assert.ok(p.hp > 0 && p.hp <= 400, pumpName(p));
    if (p.volts) assert.ok([110, 115, 120, 200, 208, 220, 230, 240, 460, 480, 575, 600].includes(p.volts), pumpName(p));
    if (p.phase) assert.ok([1, 3].includes(p.phase), pumpName(p));
    if (p.discharge) assert.ok(p.discharge >= 0.5 && p.discharge <= 24, pumpName(p));
  }
});

test('names read plainly', () => {
  assert.equal(said(0.5), '1/2');
  assert.equal(said(2 / 3), '2/3');
  assert.equal(said(1.25), '1 1/4');
  assert.equal(said(7.5), '7 1/2');
  assert.equal(pumpName({ kind: 'slurry', hp: 30, volts: 575, phase: 3, discharge: 6 }), 'Electric slurry pump, 30 HP, 575 V 3-phase, 6" discharge');
});

test('search by words and numbers', () => {
  assert.ok(searchCatalog('slurry').length > 0);
  assert.ok(searchCatalog('', 'sewage').every((p) => p.kind === 'sewage'));
  assert.ok(searchCatalog('460').every((p) => p.volts === 460 || pumpName(p).includes('460')));
  assert.equal(searchCatalog('banana').length, 0);
});

test('estimated curves pass through what the list gave', () => {
  const rated = curveFrom({ flow: 300, head: 120 });
  assert.equal(pumpHead(rated, 300), 120);
  const ends = curveFrom({ maxflow: 200, maxhead: 50 });
  assert.equal(pumpHead(ends, 0), 50);
  assert.equal(curveFrom({ hp: 5 }), null);
});

test('numbers in a search are numbers, not text', () => {
  assert.ok(searchCatalog('30 hp').every((p) => p.hp === 30), '30 hp is not 230 V');
  assert.ok(searchCatalog('30hp 460').every((p) => p.hp === 30 && p.volts === 460));
  assert.ok(searchCatalog('4"').every((p) => p.discharge === 4));
  assert.ok(searchCatalog('slurry 460v').every((p) => p.kind === 'slurry' && p.volts === 460));
});
