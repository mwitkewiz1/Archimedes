import test from 'node:test';
import assert from 'node:assert/strict';
import { frac } from '../app/js/core/measure.js';
import { wall, jointLoss, summarize, perEnd, pipeName, SYSTEMS } from '../app/js/core/fusion.js';

test('wall thickness is outside diameter over DR', () => {
  assert.deepEqual(wall({ system: 'IPS', size: '4', dr: '11' }), frac(9, 22)); // 4.5 / 11 ≈ 0.409"
  assert.deepEqual(wall({ system: 'IPS', size: '6', dr: '17' }), frac(6625, 17000)); // 6.625 / 17 ≈ 0.390"
  assert.equal(wall({ system: 'IPS', size: '7', dr: '11' }), null);
  assert.equal(pipeName({ system: 'IPS', size: '4', dr: '11' }), '4" IPS DR 11');
});

test('every size has an outside diameter bigger than the last', () => {
  for (const { sizes } of Object.values(SYSTEMS)) {
    const list = sizes.map(([, d]) => d);
    list.forEach((d, i) => i && assert.ok(d > list[i - 1]));
  }
});

test('measure it once: marks 6" back, 11 3/4" across = 1/4" joint, 1/8" each end', () => {
  const r = jointLoss(frac(6), frac(47, 4));
  assert.ok(r.ok);
  assert.deepEqual(r.loss, frac(1, 4));
  assert.deepEqual(perEnd(r.loss), frac(1, 8));
});

test('catches numbers that cannot be right', () => {
  assert.equal(jointLoss(frac(6), frac(25, 2)).ok, false); // longer than 12"
  assert.equal(jointLoss(frac(6), frac(5)).ok, false); // ate 7" — no
  assert.equal(jointLoss(frac(6), null).ok, false);
});

test('average of several joints', () => {
  const s = summarize([frac(1, 4), frac(3, 16), frac(5, 16)]);
  assert.equal(s.count, 3);
  assert.deepEqual(s.average, frac(1, 4));
  assert.deepEqual(s.low, frac(3, 16));
  assert.deepEqual(s.high, frac(5, 16));
  assert.equal(summarize([]), null);
});
