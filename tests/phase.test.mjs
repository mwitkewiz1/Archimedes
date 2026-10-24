import test from 'node:test';
import assert from 'node:assert/strict';
import { legs, field, power, SERVICES, imbalance, derate, verdict } from '../app/js/core/phase.js';

const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const times = Array.from({ length: 50 }, (_, k) => k / 50);

test('three phase delivers steady power; single phase pulses to nothing twice a cycle', () => {
  for (const t of times) assert.ok(near(power('three', t), 1), `three at ${t}`);
  assert.ok(near(power('one', 0), 0) && near(power('one', 0.5), 0));
  assert.ok(near(power('one', 0.25), 2));
});

test('three phase field turns at a steady strength; single phase only flaps', () => {
  for (const t of times) {
    const f = field('three', t);
    assert.ok(near(Math.hypot(f.x, f.y), 1.5), 'steady strength');
    assert.ok(near(field('one', t).y, 0), 'single phase stays on one line');
  }
});

// Which way the field turns: + is one way, − the other, 0 is flapping on a line.
function turning(mode, opts) {
  let sum = 0;
  for (const t of times) {
    const a = field(mode, t, opts), b = field(mode, t + 0.01, opts);
    sum += a.x * b.y - a.y * b.x;
  }
  return sum;
}

test('swapping two legs turns the motor the other way', () => {
  assert.ok(turning('three') > 0);
  assert.ok(turning('three', { swap: true }) < 0);
});

test('a lost leg leaves the field flapping, not turning, and the power pulsing', () => {
  assert.ok(near(turning('three', { lost: true }), 0, 1e-6));
  assert.ok(times.some((t) => power('three', t, { lost: true }) < 0.05));
  assert.ok(legs('three', 0.3, { lost: true })[2] === 0);
});

test('services: wye leg to neutral is leg to leg ÷ √3', () => {
  for (const id of ['208y', '480y', '600y']) {
    const s = SERVICES.find((x) => x.id === id);
    const ll = s.readings[0][1], ln = s.readings[s.readings.length - 1][1];
    assert.ok(Math.abs(ll / Math.sqrt(3) - ln) < 1, `${id}: ${ll} / √3 ≈ ${ln}`);
  }
  const hl = SERVICES.find((x) => x.id === 'highleg').readings.find((r) => /wild/.test(r[0]));
  assert.ok(Math.abs(hl[1] - 240 * Math.sqrt(3) / 2) < 1, 'wild leg ≈ 208');
});

test('imbalance the NEMA way, with derating', () => {
  const r = imbalance(460, 467, 450);
  assert.ok(near(r.avg, 459));
  assert.ok(near(r.pct, (9 / 459) * 100));
  assert.equal(derate(0), 1);
  assert.ok(near(derate(0.5), 0.99));
  assert.equal(derate(2), 0.95);
  assert.ok(near(derate(2.5), 0.915));
  assert.equal(derate(6), null);
  assert.equal(verdict(0.8, 'volts'), 'ok');
  assert.equal(verdict(3, 'volts'), 'bad');
  assert.equal(verdict(4, 'amps'), 'ok');
});
