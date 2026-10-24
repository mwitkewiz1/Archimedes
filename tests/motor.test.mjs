import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPLIES, sizesFor, fullLoadAmps, hpValue, maxBreaker, overload, generator } from '../app/js/core/motor.js';

test('full-load amps match the code tables', () => {
  assert.equal(fullLoadAmps('1', '1ph230'), 8.0);
  assert.equal(fullLoadAmps('1/2', '1ph115'), 9.8);
  assert.equal(fullLoadAmps('10', '3ph460'), 14);
  assert.equal(fullLoadAmps('7-1/2', '3ph208'), 24.2);
  assert.equal(fullLoadAmps('100', '3ph575'), 99);
  assert.equal(fullLoadAmps('300', '3ph230'), null, 'not listed at 230 V');
  assert.equal(fullLoadAmps('15', '1ph230'), null, 'no 15 hp single phase');
});

test('every listed size has amps, and amps grow with horsepower', () => {
  for (const s of SUPPLIES) {
    let last = 0, lastHp = 0;
    for (const hp of sizesFor(s.id)) {
      const a = fullLoadAmps(hp, s.id);
      assert.ok(a > last && hpValue(hp) > lastHp, `${s.id} ${hp} hp`);
      last = a; lastHp = hpValue(hp);
    }
  }
});

test('horsepower reads like the plate', () => {
  assert.equal(hpValue('7-1/2'), 7.5);
  assert.equal(hpValue('1/3'), 1 / 3);
  assert.equal(hpValue('40'), 40);
});

test('breaker: 250%, next standard size up', () => {
  assert.deepEqual(maxBreaker(14), { limit: 35, size: 35 });
  assert.equal(maxBreaker(28).size, 70);
  assert.equal(maxBreaker(52).size, 150);
});

test('overload: 125% with service factor 1.15, else 115%', () => {
  assert.equal(overload(10, 1.15), 12.5);
  assert.ok(Math.abs(overload(10, 1.0) - 11.5) < 1e-9);
});

test('generator: starting kick sizes it across the line; a drive needs less', () => {
  const atl = generator({ hp: '10', fla: 14, volts: 460, phase: 3, code: 'G', start: 'atl' });
  assert.equal(atl.by, 'start');
  assert.ok(atl.kw >= 20 && atl.kw <= 30, `${atl.kw} kW`);
  const vfd = generator({ hp: '10', fla: 14, volts: 460, phase: 3, code: 'G', start: 'vfd' });
  assert.ok(vfd.kw < atl.kw);
  const hiCode = generator({ hp: '10', fla: 14, volts: 460, phase: 3, code: 'L', start: 'atl' });
  assert.ok(hiCode.kw > atl.kw, 'a higher code letter needs a bigger generator');
});
