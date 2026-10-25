import test from 'node:test';
import assert from 'node:assert/strict';
import { BOXES, VOLT_MARKS, HPS, hookups, markVolts, fit, plateAmps, speed, frameInfo, explain, check, toMotor } from '../app/js/core/plate.js';
import { sizesFor } from '../app/js/core/motor.js';

const plate = (o) => ({ hp: '', rpm: '', frame: '', volts: '', amps: {}, hz: '', ph: '', sf: '', sfa: '', code: '', des: '', ins: '', amb: '', duty: '', encl: '', eff: '', pf: '', ...o });
const levels = (p, id) => check(p, id).map((c) => c.level);

test('volts marks read as hookups and ranges', () => {
  assert.deepEqual(hookups('208-230/460'), [[208, 230], [460]]);
  assert.deepEqual(hookups('115'), [[115]]);
  assert.deepEqual(markVolts('115/208-230'), [115, 208, 230]);
  for (const m of VOLT_MARKS) assert.ok(markVolts(m).every((v) => v > 100 && v < 700), m);
});

test('the hookup that suits the supply, and how well', () => {
  assert.deepEqual([fit('230/460', '3ph460').hookup, fit('230/460', '3ph460').how], [1, 'good']);
  assert.deepEqual([fit('230/460', '3ph230').hookup, fit('230/460', '3ph230').how], [0, 'good']);
  assert.equal(fit('208-230/460', '3ph208').how, 'good');
  assert.equal(fit('230', '3ph208').how, 'edge', '208 is 9.6% under 230');
  assert.equal(fit('460', '3ph230').how, 'low');
  assert.equal(fit('380-415', '3ph460').how, 'high');
  assert.equal(fit('575', '3ph575').how, 'good');
  assert.equal(fit('115', '1ph115').how, 'good');
  assert.equal(fit('', '3ph460'), null);
});

test('amps come from the hookup and volts nearest the supply', () => {
  const p = plate({ volts: '208-230/460', amps: { 208: '30', 230: '28', 460: '14' } });
  assert.deepEqual(plateAmps(p, '3ph208'), { amps: 30, at: 208, missing: null });
  assert.deepEqual(plateAmps(p, '3ph230'), { amps: 28, at: 230, missing: null });
  assert.deepEqual(plateAmps(p, '3ph460'), { amps: 14, at: 460, missing: null });
  const no208 = plate({ volts: '208-230/460', amps: { 230: '28', 460: '14' } });
  assert.deepEqual(plateAmps(no208, '3ph208'), { amps: 28, at: 230, missing: 208 });
  assert.equal(plateAmps(plate({ volts: '230/460' }), '3ph460'), null);
});

test('speed tells the poles and the slip', () => {
  assert.deepEqual([speed(3450).poles, speed(1760).poles, speed(1150).poles, speed(870).poles], [2, 4, 6, 8]);
  assert.equal(speed(1760).sync, 1800);
  assert.ok(Math.abs(speed(1764).slip - 0.02) < 1e-9);
  assert.equal(speed(1450, 50).sync, 1500);
  assert.equal(speed(4000), null);
});

test('frame: shaft height and the letters', () => {
  assert.deepEqual(frameInfo('215T').height, { n: 21, d: 4 });
  assert.deepEqual(frameInfo('56c').height, { n: 7, d: 2 });
  assert.equal(frameInfo('56C').letters.length, 1);
  assert.equal(frameInfo('145JM').letters.length, 1, 'JM is one mark, not J then M');
  assert.ok(frameInfo('145JM').letters[0].startsWith('JM'));
  assert.equal(frameInfo('184TCZ').letters.length, 3);
  assert.equal(frameInfo('256UQ').unknown, 'Q');
  assert.equal(frameInfo('big'), null);
});

test('a plain 10 hp 460 V plate checks out and fills Motor amps', () => {
  const p = plate({ hp: '10', rpm: '1760', volts: '230/460', amps: { 230: '25.2', 460: '12.6' }, hz: '60', ph: '3', sf: '1.15', code: 'G', duty: 'CONT', amb: '40' });
  assert.deepEqual(levels(p, '3ph460'), ['ok', 'ok']);
  assert.match(check(p, '3ph460')[0].text, /high hookup/);
  assert.deepEqual(toMotor(p, '3ph460').motor, { supply: '3ph460', hp: '10', plate: '12.6', sf: 1.15, rpm: '1760', code: 'G' });
  assert.equal(toMotor(p, '3ph230').motor.plate, '25.2', 'the low hookup on 240 V');
});

test('the checks catch what would hurt the motor', () => {
  const base = { hp: '5', volts: '230', amps: { 230: '14' }, ph: '3' };
  assert.equal(check(plate(base), '1ph230')[0].level, 'bad', '3 phase on single phase');
  assert.ok(toMotor(plate(base), '1ph230').why);
  assert.ok(levels(plate({ ...base, hz: '50' }), '3ph230').includes('bad'), '50 Hz on 60');
  assert.ok(toMotor(plate({ ...base, hz: '50' }), '3ph230').why);
  assert.equal(check(plate(base), '3ph208')[0].level, 'watch', '230 V motor on 208');
  assert.equal(check(plate({ ...base, volts: '460', amps: { 460: '7' } }), '3ph230')[0].level, 'bad');
  assert.ok(toMotor(plate({ ...base, volts: '460' }), '3ph230').why);
  assert.ok(levels(plate({ ...base, amps: { 230: '20' } }), '3ph230').includes('watch'), 'amps well over the table');
  assert.ok(levels(plate({ ...base, amps: { 230: '6' } }), '3ph230').includes('watch'), 'amps far under the table');
  assert.ok(levels(plate({ ...base, duty: '30 MIN' }), '3ph230').includes('watch'));
  assert.ok(levels(plate({ ...base, amb: '30' }), '3ph230').includes('watch'));
  assert.ok(levels(plate({ ...base, rpm: '5000' }), '3ph230').includes('bad'));
  assert.ok(levels(plate({ ...base, sfa: '12' }), '3ph230').includes('watch'), 'SF A under FLA');
});

test('a slow motor is sized from its plate', () => {
  const p = plate({ hp: '5', rpm: '1150', volts: '230', amps: { 230: '17' }, ph: '3' });
  const c = check(p, '3ph230');
  assert.ok(c.some((x) => x.level === 'note' && /1200 RPM/.test(x.text)));
  assert.ok(!c.some((x) => x.level === 'watch'), 'high amps are usual for a slow motor');
  assert.equal(toMotor(p, '3ph230').motor.rpm, '1150');
});

test('a size the supply\'s table lacks goes to the next size up, or nowhere', () => {
  assert.equal(toMotor(plate({ hp: '1/6', volts: '460', ph: '3' }), '3ph460').motor.hp, '1/2');
  assert.ok(toMotor(plate({ hp: '15', volts: '230', ph: '1' }), '1ph230').why);
  assert.equal(toMotor(plate({ hp: '1', volts: '115/230', sf: '1.0' }), '1ph230').motor.sf, 1);
  assert.equal(toMotor(plate({ hp: '1', volts: '115/230', sf: '1.35' }), '1ph230').motor.sf, 1.15);
});

test('every horsepower in the list is one the tables know', () => {
  const known = new Set([...sizesFor('1ph115'), ...sizesFor('3ph460')]);
  assert.ok(HPS.every((h) => known.has(h)) && HPS.length === known.size);
});

test('every box explains itself, blank or filled, and stays clear of volts marks', () => {
  const full = plate({ hp: '7-1/2', rpm: '1750', frame: '213T', volts: '208-230/460', amps: { 208: '22', 230: '20', 460: '10' }, hz: '50/60', ph: '3',
    sf: '1.15', sfa: '23', code: 'A', des: 'B', ins: 'F', amb: '40', duty: 'CONT', encl: 'TEFC', eff: '91.7', pf: '0.82' });
  for (const b of BOXES) {
    assert.ok(b.stamp && b.name && b.says.length, b.id);
    assert.ok(explain(b.id, plate({}), '3ph460').length >= b.says.length);
    const lines = explain(b.id, full, '3ph460');
    assert.ok(lines.every((l) => typeof l === 'string' && !/undefined|NaN|null/.test(l)), `${b.id}: ${lines}`);
    // The screen stacks fractions with pretty(); a volts mark like 230/460 would stack too. Only VOLTS may carry one.
    if (b.id !== 'volts') assert.ok(lines.every((l) => !/\d{3}\/\d{3}/.test(l)), b.id);
  }
  for (const c of check(full, '3ph208')) assert.ok(!/\d{3}\/\d{3}/.test(c.text), c.text);
});
