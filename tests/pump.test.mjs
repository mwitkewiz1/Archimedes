import test from 'node:test';
import assert from 'node:assert/strict';
import { PUMPS, pumpHead, maxFlow, bep, efficiency, frictionHead, systemHead, dutyPoint, insideDiameter, zoneOf } from '../app/js/core/pump.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b} ± ${tol}`);
const pump = PUMPS.find((p) => p.id === 'dewater');

test('the curve passes through shutoff and BEP', () => {
  for (const p of PUMPS) {
    near(pumpHead(p, 0), p.shutoff, 1e-9);
    near(pumpHead(p, p.bepFlow), p.bepHead, 1e-9);
    near(pumpHead(p, maxFlow(p)), 0, 1e-6);
    near(efficiency(p, p.bepFlow), p.bestEff, 1e-12);
  }
});

test('slowing the pump follows the affinity laws', () => {
  const half = bep(pump, 0.5);
  near(half.flow, 350, 1e-9);
  near(half.head, 32.5, 1e-9);
  near(pumpHead(pump, half.flow, 0.5), half.head, 1e-9);
});

test('pipe friction matches a hand check', () => {
  // 500 GPM through 1000 ft of 6.065" steel (C 120), worked by hand:
  // 2.083 × (100/120)^1.85 × 500^1.85 ÷ 6.065^4.8655 ≈ 2.083 × 0.7137 × 98,670 ÷ 6,440 ≈ 22.8 ft.
  near(frictionHead(500, { length: 1000, id: 6.065, c: 120 }), 22.8, 0.2);
  assert.equal(frictionHead(0, { length: 1000, id: 6, c: 150 }), 0);
});

test('HDPE inside diameter comes from its DR', () => {
  near(insideDiameter({ material: 'hdpe', size: '6', dr: '11' }), 6.625 * (1 - 2 / 11), 1e-12);
  assert.equal(insideDiameter({ material: 'steel', size: '4' }), 4.026);
});

test('duty point: pump and pipe agree there', () => {
  const sys = { lift: 60, length: 800, id: 5.42, c: 150, valveOpen: 1 };
  const d = dutyPoint(pump, sys);
  near(pumpHead(pump, d.flow), systemHead(d.flow, sys), 1e-6);
  assert.ok(d.flow > 0 && d.flow < maxFlow(pump));
});

test('closing a valve moves the pump back up its curve', () => {
  const open = { lift: 60, length: 800, id: 5.42, c: 150, valveOpen: 1 };
  const half = { ...open, valveOpen: 0.5 };
  assert.ok(dutyPoint(pump, half).flow < dutyPoint(pump, open).flow);
});

test('too much lift: the pump dead-heads', () => {
  const d = dutyPoint(pump, { lift: 200, length: 100, id: 6, c: 150, valveOpen: 1 });
  assert.equal(d.zone, 'deadhead');
  assert.equal(d.flow, 0);
});

test('zones around BEP', () => {
  assert.equal(zoneOf(0.5), 'left');
  assert.equal(zoneOf(0.75), 'ok');
  assert.equal(zoneOf(1), 'sweet');
  assert.equal(zoneOf(1.3), 'right');
});
