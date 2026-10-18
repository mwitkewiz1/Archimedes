import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, parseValue, formatNumber, withPrefix } from '../app/js/core/ohm.js';

const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.abs(b) * 1e-12, `${a} ≠ ${b}`);
const check = (given, want) => {
  const r = solve(given);
  assert.ok(r.ok, r.error);
  for (const k of ['V', 'I', 'R', 'P']) near(r.values[k], want[k]);
  assert.equal(r.steps.length, 2);
};

// One circuit, every pair: 12 V across 6 Ω pulls 2 A and makes 24 W.
const ONE = { V: 12, I: 2, R: 6, P: 24 };

test('any two give the other two', () => {
  const keys = ['V', 'I', 'R', 'P'];
  for (const a of keys) for (const b of keys) {
    if (a >= b) continue;
    check({ [a]: ONE[a], [b]: ONE[b] }, ONE);
  }
});

test('a 1500 W heater on 120 V', () => {
  check({ V: 120, P: 1500 }, { V: 120, I: 12.5, R: 9.6, P: 1500 });
  const r = solve({ V: 120, P: 1500 });
  assert.deepEqual(r.steps.map((s) => s.formula), ['Amps = Watts ÷ Volts', 'Ohms = Volts × Volts ÷ Watts']);
  assert.equal(r.steps[0].work, '1,500 ÷ 120');
});

test('says what is wrong in plain words', () => {
  assert.match(solve({ V: 12 }).error, /any two/);
  assert.match(solve({ V: 12, I: 2, R: 6 }).error, /any two/);
  assert.match(solve({ V: 12, R: 0 }).error, /dead short/);
  assert.match(solve({ V: -12, R: 6 }).error, /minus/);
});

test('reads what a person types', () => {
  assert.equal(parseValue('12'), 12);
  assert.equal(parseValue('.5'), 0.5);
  assert.equal(parseValue('1,500 W'), 1500);
  assert.equal(parseValue('1.5k'), 1500);
  assert.equal(parseValue('4.7kΩ'), 4700);
  assert.equal(parseValue('2M'), 2e6);
  assert.equal(parseValue('500m'), 0.5);
  assert.equal(parseValue('120 volts'), 120);
  assert.equal(parseValue('12.'), 12);
  assert.equal(parseValue(''), null);
  assert.equal(parseValue('abc'), null);
  assert.equal(parseValue('-3'), null);
});

test('writes numbers plainly', () => {
  assert.equal(formatNumber(12.5), '12.5');
  assert.equal(formatNumber(1500), '1,500');
  assert.equal(formatNumber(Math.sqrt(12)), '3.464');
  assert.equal(formatNumber(0.05), '0.05');
  assert.equal(withPrefix(0.05, 'A'), '50 mA');
  assert.equal(withPrefix(12000, 'Ω'), '12 kΩ');
  assert.equal(withPrefix(1500, 'W'), '1.5 kW');
  assert.equal(withPrefix(12, 'V'), null);
});
