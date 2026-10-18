import test from 'node:test';
import assert from 'node:assert/strict';
import { frac, parseMeasure, formatInches, onTape } from '../app/js/core/measure.js';
import { evaluate } from '../app/js/core/expr.js';
import { planCut } from '../app/js/core/cut.js';

const inch = (s) => parseMeasure(s).value;
const same = (a, b) => assert.deepEqual(a, b);

test('reads what a tape says', () => {
  same(inch(`5'1"`), frac(61));
  same(inch(`5' 1"`), frac(61));
  same(inch(`5ft 1in`), frac(61));
  same(inch('3 1/4'), frac(13, 4));
  same(inch('3-1/4"'), frac(13, 4));
  same(inch('3/32'), frac(3, 32));
  same(inch('57.75'), frac(231, 4));
  same(inch(`4' 9 7/8"`), frac(463, 8));
  same(inch('3¼'), frac(13, 4));
  assert.equal(parseMeasure('banana'), null);
  assert.equal(parseMeasure(`5'1"`).unit, 'length');
  assert.equal(parseMeasure('12').unit, 'bare');
});

test('writes inches the way a tape reads', () => {
  assert.equal(formatInches(frac(463, 8)), '57 7/8"');
  assert.equal(formatInches(frac(463, 8), { feet: true }), `4' 9 7/8"`);
  assert.equal(formatInches(frac(1, 3)), '≈ 21/64"');
  assert.equal(formatInches(frac(61), { feet: true }), `5' 1"`);
  assert.equal(formatInches(frac(-3, 32)), '−3/32"');
});

test('nearest tape mark, and which side of it', () => {
  const t = onTape(frac(3, 32), 16);
  same(t.mark, frac(1, 8)); // 3/32 is halfway; rounds up to 2/16
  assert.equal(t.side, 'under');
  assert.equal(onTape(frac(463, 8), 16).side, 'on');
});

test('the fraction calculator', () => {
  same(evaluate(`5'1" − 3 1/4"`).value, frac(231, 4));
  same(evaluate(`5'1" - 3 1/4" - 3/32 - 1/8`).value, frac(1841, 32));
  same(evaluate('57 7/8 ÷ 2').value, frac(463, 16));
  same(evaluate('57 7/8 / 2').value, frac(463, 16));
  same(evaluate('1/8 × 3').value, frac(3, 8));
  same(evaluate('(1 + 1/2) × 2').value, frac(3));
  const pieces = evaluate(`61 ÷ 4 3/4"`);
  assert.equal(pieces.unit, 'count');
  same(pieces.value, frac(244, 19));
  same(evaluate('3-1/4').value, frac(13, 4)); // a tape number, not 3 minus 1/4
  same(evaluate('3 - 1/4').value, frac(11, 4));
  assert.throws(() => evaluate(`2" × 3"`), /area/);
  assert.throws(() => evaluate('1 +'), /too soon/);
  assert.throws(() => evaluate('1 ÷ 0'), /zero/);
});

// Matthew's example: 5'1" HDPE, take 3 1/4" off, saw eats 3/32", fusing eats 1/8".
const his = { pipe: frac(61), takeOff: frac(13, 4), kerf: frac(3, 32), fuse: frac(1, 8) };

test('one end: mark at finished + fuse loss', () => {
  const r = planCut({ job: 'oneEnd', ...his });
  assert.ok(r.ok);
  same(r.numbers.finished, frac(231, 4)); // 57 3/4
  same(r.numbers.mark, frac(463, 8)); // 57 7/8
  same(r.numbers.scrap, frac(97, 32)); // 3 1/32 of scrap left over
});

test('both ends: equal trim from each end', () => {
  const r = planCut({ job: 'bothEnds', ...his });
  assert.ok(r.ok);
  same(r.numbers.offEach, frac(3, 2)); // (61 − 57 3/4 − 1/4) / 2 = 1 1/2
  same(r.numbers.between, frac(58)); // marks 58" apart
});

test('cut out: the joint eats both ends', () => {
  const r = planCut({ job: 'cutOut', takeOff: frac(13, 4), kerf: frac(3, 32), fuse: frac(1, 8) });
  assert.ok(r.ok);
  same(r.numbers.gap, frac(3)); // 3 1/4 − 2 × 1/8
  same(r.numbers.scrap, frac(45, 16)); // 3 − 2 × 3/32
});

test('says so when the saw is wider than what comes off', () => {
  const r = planCut({ job: 'bothEnds', pipe: frac(61), finished: frac(485, 8), kerf: frac(3, 32), fuse: frac(1, 8) });
  assert.equal(r.ok, false);
  assert.match(r.error, /Face it off/);
  assert.equal(planCut({ job: 'oneEnd', pipe: frac(61), finished: frac(62), kerf: frac(3, 32), fuse: frac(1, 8) }).ok, false);
});
