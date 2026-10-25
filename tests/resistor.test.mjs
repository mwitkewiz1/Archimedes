import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, bandRoles, choices, readBands, bandsFor, series, parallel, share, WATTS, wattSize, heat, E12, nextUp } from '../app/js/core/resistor.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) <= Math.abs(b) * 1e-12, msg || `${a} ≠ ${b}`);

test('the digits run black to white, 0 to 9 (Better Be Right Or Your Great Big Venture Goes Wrong)', () => {
  assert.deepEqual(COLORS.slice(0, 10).map((c) => c.digit), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(COLORS.slice(0, 10).map((c) => c.name[0]).join(''), 'BBROYGBVGW');
});

test('bands read the ohms and the spread', () => {
  const r = readBands(['yellow', 'violet', 'red', 'gold']);
  assert.ok(r.ok);
  assert.equal(r.ohms, 4700);
  assert.equal(r.tol, 5);
  near(r.low, 4465); near(r.high, 4935);
  assert.equal(readBands(['brown', 'black', 'orange', 'none']).ohms, 10000);
  assert.equal(readBands(['brown', 'black', 'orange', 'none']).tol, 20);
  assert.equal(readBands(['brown', 'black', 'black', 'brown', 'brown']).ohms, 1000);
  near(readBands(['yellow', 'violet', 'gold', 'gold']).ohms, 4.7);
  near(readBands(['yellow', 'violet', 'silver', 'gold']).ohms, 0.47);
  near(readBands(['red', 'red', 'black', 'silver', 'brown']).ohms, 2.2);
});

test('a band only takes the colors its place allows', () => {
  assert.ok(!readBands(['gold', 'violet', 'red', 'gold']).ok);
  assert.ok(!readBands(['yellow', 'violet', 'red', 'orange']).ok);
  assert.ok(!readBands(['yellow', 'violet', 'red']).ok);
  assert.ok(!choices('digit').some((c) => c.id === 'gold' || c.id === 'none'));
  assert.equal(choices('mult').length, 12);
});

test('ohms to bands and back, on every standard value from 1 Ω to 8.2 MΩ', () => {
  for (let exp = 0; exp <= 6; exp++) {
    for (const v of E12) {
      const ohms = exp ? v * 10 ** (exp - 1) : v / 10;
      for (const digits of [2, 3]) {
        const b = bandsFor(ohms, digits);
        assert.ok(b.ok, `${ohms} Ω with ${digits} digits: ${b.error}`);
        assert.equal(b.bands.length, digits + 1);
        const back = readBands([...b.bands, digits === 2 ? 'gold' : 'brown']);
        assert.ok(back.ok, back.error);
        near(back.ohms, ohms, `${ohms} Ω came back as ${back.ohms}`);
        assert.equal(bandRoles(digits + 2).length, digits + 2);
      }
    }
  }
});

test('ohms that need more digits than the part has', () => {
  const b = bandsFor(4750, 2);
  assert.ok(!b.ok);
  assert.equal(b.near, 4800);
  assert.ok(bandsFor(4750, 3).ok);
  assert.ok(!bandsFor(0.01, 2).ok);
  assert.ok(bandsFor(0.47, 2).ok, 'yellow violet silver');
  assert.match(bandsFor(0.47, 3).error, /Under 1 Ω/);
  assert.ok(!bandsFor(0, 2).ok);
  assert.ok(bandsFor(999.99, 3).near === 1000);
});

test('series adds; side by side comes out under the smallest', () => {
  assert.equal(series([100, 220, 330]), 650);
  near(parallel([100, 100]), 50);
  near(parallel([2, 2]), 1);
  assert.ok(parallel([10, 1000]) < 10);
  near(parallel([6, 3]), 2);
});

test('the supply shared out: series splits volts, side by side splits amps', () => {
  const s = share([4, 8], 'series', 12);
  near(s.total, 12); near(s.amps, 1);
  near(s.each[0].volts, 4); near(s.each[1].volts, 8);
  near(s.each[1].watts, 8);
  const p = share([4, 12], 'parallel', 12);
  near(p.total, 3); near(p.amps, 4);
  near(p.each[0].amps, 3); near(p.each[1].amps, 1);
  near(p.each[0].watts, 36);
  // Volts add back to the supply; watts add to the whole lot's.
  near(s.each.reduce((a, e) => a + e.volts, 0), 12);
  near(p.each.reduce((a, e) => a + e.watts, 0), 12 * p.amps);
});

test('a 250 Ω resistor turns a 4 to 20 mA signal into 1 to 5 V', () => {
  near(250 * 0.004, 1); near(250 * 0.02, 5);
  near(heat(250, { amps: 0.02 }), 0.1);
  near(heat(144, { volts: 120 }), 100);
});

test('watt size: at least double what it makes', () => {
  assert.deepEqual(wattSize(0.1), ['1/4', 0.25]);
  assert.deepEqual(wattSize(0.125), ['1/4', 0.25]);
  assert.deepEqual(wattSize(0.3), ['1', 1]);
  assert.deepEqual(wattSize(4), ['10', 10]);
  assert.equal(wattSize(60), null);
  for (let k = 1; k < WATTS.length; k++) assert.ok(WATTS[k][1] > WATTS[k - 1][1]);
});

test('next standard value up', () => {
  assert.equal(nextUp(450), 470);
  assert.equal(nextUp(470), 470);
  assert.equal(nextUp(471), 560);
  assert.equal(nextUp(83), 100);
  assert.equal(nextUp(9.6), 10);
  near(nextUp(0.5), 0.56);
  assert.equal(nextUp(1e6), 1e6);
});
