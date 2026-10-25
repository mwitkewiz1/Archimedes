import test from 'node:test';
import assert from 'node:assert/strict';
import { DROP, LEDS, ledResistor, switchVolts, kick, rectify, dcOut, READINGS, judge, BRIDGE_CHECKS } from '../app/js/core/diode.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('an LED on 12 V at 20 mA wants 450 Ω, so a 470', () => {
  const r = ledResistor(12, 3, 20);
  assert.ok(r.ok);
  near(r.ohms, 450);
  assert.equal(r.pick, 470);
  assert.ok(r.mA < 20 && r.mA > 19);
  assert.deepEqual(r.size, ['1/2', 0.5]);
  assert.ok(!ledResistor(2, 2.2, 10).ok, 'supply under the LED');
  for (const led of LEDS) {
    const x = ledResistor(24, led.vf, 10);
    assert.ok(x.ok && x.pick >= x.ohms && x.mA <= 10, led.name);
  }
});

test('a flyback diode holds the switch to the supply plus one drop; without it the switch sees hundreds of volts', () => {
  assert.equal(kick('in', 24).peak, 24 + DROP);
  assert.ok(kick('none', 24).peak >= 240);
  assert.ok(kick('backwards', 24).short);
  assert.equal(switchVolts('in', 24, -1), 0, 'closed switch: no volts across it');
  assert.equal(switchVolts('in', 24, 5), 24, 'open and settled: the supply');
  near(switchVolts('none', 24, 5), 24, 1e-6);
});

test('one diode passes half the wave; a bridge flips the other half up', () => {
  for (let k = 0; k < 100; k++) {
    const t = k / 100;
    const h = rectify('half', t), b = rectify('bridge', t), c = rectify('cap', t);
    assert.ok(h.out >= 0 && b.out >= 0);
    near(b.out, Math.abs(h.vin));
    if (h.vin < 0) { assert.equal(h.out, 0); assert.equal(h.path, null); assert.equal(b.path, 'b'); }
    if (h.vin > 0) { assert.equal(h.path, 'a'); assert.equal(b.path, 'a'); }
    assert.ok(c.out >= b.out - 1e-12, 'the capacitor only fills in the dips');
    assert.ok(c.out > 0.8, `ripple too deep at ${t}: ${c.out}`);
  }
});

test('the capacitor feeds the load between humps; the diodes only carry the tops', () => {
  assert.equal(rectify('cap', 0.25).path, 'a');
  assert.equal(rectify('cap', 0.75).path, 'b');
  assert.equal(rectify('cap', 0.5).path, null);
  assert.equal(rectify('cap', 1.0).path, null);
});

test('DC from AC: a meter on 120 V AC through a bridge reads about 107 V, 168 V with a capacitor', () => {
  const b = dcOut(120, 'bridge');
  near(b.peak, 120 * Math.SQRT2 - 1.4);
  assert.ok(b.avg > 106 && b.avg < 108);
  const h = dcOut(120, 'half');
  near(h.avg, (120 * Math.SQRT2 - 0.7) / Math.PI);
  assert.ok(dcOut(24, 'bridge').peak > 32 && dcOut(24, 'bridge').peak < 33);
  assert.equal(dcOut(0.5, 'bridge').peak, 0);
});

test('the average of the drawn waves matches the meter numbers', () => {
  const avg = (kind) => {
    let sum = 0;
    for (let k = 0; k < 10000; k++) sum += rectify(kind, (k + 0.5) / 10000).out;
    return sum / 10000;
  };
  near(avg('bridge'), 2 / Math.PI, 1e-4);
  near(avg('half'), 1 / Math.PI, 1e-4);
});

test('every pair of meter readings gets a verdict', () => {
  const ids = READINGS.map(([id]) => id);
  for (const f of ids) for (const b of ids) {
    const v = judge(f, b);
    assert.ok(['good', 'bad', 'check'].includes(v.say), `${f}/${b}`);
    assert.ok(v.title && v.why, `${f}/${b}`);
  }
  assert.equal(judge('drop', 'ol').say, 'good');
  assert.equal(judge('led', 'ol').say, 'good');
  assert.equal(judge('zero', 'zero').title, 'Shorted');
  assert.equal(judge('ol', 'ol').title, 'Open');
  assert.equal(judge('drop', 'drop').title, 'Leaky');
  assert.equal(judge('ol', 'drop').title, 'Good, but the other way round');
});

test('a bridge check names every pair of legs, both ways', () => {
  assert.equal(BRIDGE_CHECKS.length, 7);
  assert.ok(BRIDGE_CHECKS.every(([where, read]) => where && read));
  assert.equal(BRIDGE_CHECKS.filter(([, read]) => read === 'OL').length, 4, 'every backwards pair blocks');
});
