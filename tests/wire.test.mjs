import test from 'node:test';
import assert from 'node:assert/strict';
import { pickWire, safeAmps, SIZES } from '../app/js/core/wire.js';

const size = (name) => SIZES.find((s) => s.name === name);

test('small wire is capped by its breaker limit', () => {
  assert.equal(safeAmps(size('14 AWG')), 15);
  assert.equal(safeAmps(size('12 AWG')), 20);
  assert.equal(safeAmps(size('10 AWG')), 30);
  assert.equal(safeAmps(size('8 AWG')), 40); // 60 °C column up to 1 AWG
  assert.equal(safeAmps(size('1/0')), 150); // 75 °C column above
});

test('a 1500 W heater on 120 V, 50 ft: amps decide', () => {
  const r = pickWire({ system: 'ac120', amps: 12.5, feet: 50, continuous: true });
  assert.ok(r.ok);
  assert.equal(r.designAmps, 15.625); // runs for hours: 125%
  assert.equal(r.size.name, '12 AWG');
  assert.equal(r.decidedBy, 'amps');
  assert.equal(r.smaller.why, 'amps');
  assert.ok(Math.abs(r.drop - 2.475) < 1e-9); // 2 × 50 × 12.5 × 1.98 / 1000
});

test('12 V DC, 10 A, 20 ft: voltage drop decides', () => {
  const r = pickWire({ system: 'dc12', amps: 10, feet: 20 });
  assert.ok(r.ok);
  assert.equal(r.size.name, '8 AWG');
  assert.equal(r.decidedBy, 'drop');
  assert.equal(r.smaller.why, 'drop');
  assert.ok(r.dropPct <= 0.03);
});

test('480 V three phase, 50 A, 200 ft', () => {
  const r = pickWire({ system: 'ac480', amps: 50, feet: 200 });
  assert.equal(r.size.name, '6 AWG');
  assert.ok(Math.abs(r.drop - Math.sqrt(3) * 200 * 50 * 0.491 / 1000) < 1e-9);
});

test('575 V and 630 V three phase lose a smaller share than 480 V', () => {
  const at = (system) => pickWire({ system, amps: 60, feet: 400 });
  assert.ok(at('ac575').dropPct < at('ac480').dropPct);
  assert.ok(at('ac630').dropPct < at('ac575').dropPct);
  assert.equal(at('ac630').system.volts, 630);
});

test('fixture wire only on DC', () => {
  assert.equal(pickWire({ system: 'dc12', amps: 1, feet: 5 }).size.name, '18 AWG');
  assert.equal(pickWire({ system: 'ac120', amps: 1, feet: 5 }).size.name, '14 AWG');
});

test('says what is wrong in plain words', () => {
  assert.match(pickWire({ system: 'ac120', feet: 50 }).error, /amps/);
  assert.match(pickWire({ system: 'ac120', amps: 10 }).error, /far/);
  assert.match(pickWire({ system: 'ac120', amps: 500, feet: 50 }).error, /electrician/);
  assert.match(pickWire({ system: 'dc12', amps: 100, feet: 500 }).error, /closer/);
});
