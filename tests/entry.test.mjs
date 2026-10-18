import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, toText, unfinished, typeText, typeDigit, fractionKey, slash, tapBox, back, EMPTY } from '../app/js/core/entry.js';
import { evaluate } from '../app/js/core/expr.js';
import { frac } from '../app/js/core/measure.js';

// Press keys in order: digits, 'F' the fraction key, '<' back, anything else as text.
function keys(seq, st = EMPTY) {
  for (const k of seq) {
    if (/\d/.test(k)) st = typeDigit(st, k);
    else if (k === 'F') st = fractionKey(st);
    else if (k === '<') st = back(st);
    else st = typeText(st, k);
  }
  return st;
}

test('3, fraction, 5, fraction, 8 is three and five eighths', () => {
  const st = keys(['3', 'F', '5', 'F', '8']);
  assert.equal(toText(st), '3 5/8');
  assert.deepEqual(evaluate(toText(st)).value, frac(29, 8));
});

test('the fraction key opens the top box, then moves down, then leaves', () => {
  let st = keys(['3', 'F']);
  assert.deepEqual(st.cur, { i: 1, box: 'n' });
  assert.equal(unfinished(st), 'n');
  st = keys(['5', 'F'], st);
  assert.equal(st.cur.box, 'd');
  st = keys(['1', '6', 'F'], st);
  assert.equal(st.cur, null);
  assert.equal(toText(st), '3 5/16');
});

test('tap the bottom box to fill it', () => {
  let st = keys(['F', '5']);
  st = tapBox(st, 0, 'd');
  st = keys(['8'], st);
  assert.equal(toText(st), '5/8');
  assert.equal(unfinished(st), null);
});

test('an operator leaves the fraction and lands at the end', () => {
  const st = keys(["5", "'", '1', '"', ' − ', '3', 'F', '1', 'F', '4', '"']);
  assert.equal(toText(st), `5'1" − 3 1/4"`);
  assert.deepEqual(evaluate(toText(st)).value, frac(231, 4));
});

test('back steps out of a fraction the way it came in', () => {
  let st = keys(['3', 'F', '5', 'F', '8']);
  st = back(st); assert.equal(toText(st), '3 5/');
  st = back(st); assert.equal(st.cur.box, 'n');
  st = back(st); st = back(st);
  assert.equal(toText(st), '3');
  assert.equal(st.cur, null);
  // From the end of the line, back goes into the last fraction's bottom box.
  st = back(keys([' + ', '1', 'F', '1', 'F', '2'], st));
  st = typeText(st, '');
  st = back(st);
  assert.equal(toText(st), '3 + 1 1/');
});

test('typing a slash on a keyboard makes a fraction from the digits before it', () => {
  let st = keys(['3', ' ', '5']);
  st = slash(st);
  st = keys(['8'], st);
  assert.equal(toText(st), '3 5/8');
});

test('saved lines read back the same', () => {
  for (const line of [`5'1" − 3 1/4" − 3/32"`, '57 7/8 ÷ 2', '3-1/4', '(1 + 1/2) × 2', '']) {
    const again = toText(parseLine(line));
    assert.deepEqual(evaluate(again || '0').value, evaluate(line || '0').value, line);
  }
  assert.equal(toText(parseLine('9\' 5/32" − 34 5/8')), '9\' 5/32" − 34 5/8');
});
