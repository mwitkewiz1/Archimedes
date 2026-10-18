// expr.js — the fraction calculator. Owns: reading a line like
// 5'1" − 3 1/4" − 3/32" and working it out exactly. Pure: no DOM.
//
// Typing rules (shown in the app's help):
//   - A slash with no spaces is a fraction (3/32). Divide is ÷, or / with spaces.
//   - A hyphen joining a whole number to a fraction is a tape number (3-1/4).
//     Subtract is −, or - with a space after it.
//   - In + and −, a bare number is inches. In × and ÷, a bare number is a count:
//     57 7/8 ÷ 2 is half the length; 61 ÷ 4 3/4" is how many pieces fit.

import { MEASURE_SRC, normalize, add, sub, mul, div } from './measure.js';
import { parseMeasure } from './measure.js';

const OPS = { '+': '+', '−': '-', '-': '-', '×': '*', '*': '*', 'x': '*', '÷': '/', '/': '/' };

export function tokenize(text) {
  const s = normalize(text);
  const lit = new RegExp(MEASURE_SRC, 'y');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(' || c === ')') { out.push({ t: c }); i++; continue; }
    if (/\d|\./.test(c)) {
      lit.lastIndex = i;
      const m = lit.exec(s);
      const raw = m && m[0].trimEnd();
      if (!raw) throw new Error(`can't read "${s.slice(i)}"`);
      const meas = parseMeasure(raw);
      if (!meas) throw new Error(`can't read "${raw}"`);
      out.push({ t: 'num', ...meas });
      i += raw.length;
      continue;
    }
    if (c in OPS) { out.push({ t: 'op', op: OPS[c] }); i++; continue; }
    throw new Error(`"${c}" isn't something I can work with`);
  }
  return out;
}

// unit: 'length' (inches), 'count' (a plain number), 'bare' (not yet known).
function combine(op, a, b) {
  if (op === '+' || op === '-') {
    if (a.unit === 'count' || b.unit === 'count') {
      if (a.unit === 'length' || b.unit === 'length') throw new Error("can't add a count to a length");
    }
    const unit = a.unit === 'length' || b.unit === 'length' ? 'length' : a.unit === 'count' || b.unit === 'count' ? 'count' : 'bare';
    return { value: (op === '+' ? add : sub)(a.value, b.value), unit };
  }
  if (op === '*') {
    if (a.unit === 'length' && b.unit === 'length') throw new Error("length × length is an area, not a length; make one side a plain number");
    const unit = a.unit === 'length' || b.unit === 'length' ? 'length' : a.unit === 'count' || b.unit === 'count' ? 'count' : 'bare';
    return { value: mul(a.value, b.value), unit };
  }
  // divide
  if (b.value.n === 0) throw new Error("can't divide by zero");
  let unit;
  if (a.unit === 'length' && b.unit === 'length') unit = 'count';
  else if (a.unit === 'bare' && b.unit === 'length') unit = 'count';
  else if (b.unit === 'length') throw new Error("can't divide a count by a length");
  else unit = a.unit === 'length' ? 'length' : a.unit === 'bare' && b.unit === 'bare' ? 'bare' : a.unit;
  return { value: div(a.value, b.value), unit };
}

// Precedence climbing: × ÷ before + −, left to right, brackets allowed.
export function evaluate(text) {
  const toks = tokenize(text);
  if (!toks.length) return null;
  let p = 0;
  const peek = () => toks[p];
  function primary() {
    const t = toks[p++];
    if (!t) throw new Error('the line ends too soon');
    if (t.t === '(') {
      const v = sum();
      if (!toks[p] || toks[p].t !== ')') throw new Error('a bracket is missing');
      p++;
      return v;
    }
    if (t.t === 'op' && t.op === '-') {
      const v = primary();
      return { ...v, value: sub({ n: 0, d: 1 }, v.value) };
    }
    if (t.t !== 'num') throw new Error('two signs in a row');
    return { value: t.value, unit: t.unit };
  }
  function product() {
    let v = primary();
    while (peek() && peek().t === 'op' && (peek().op === '*' || peek().op === '/')) {
      const op = toks[p++].op;
      const r = primary();
      // A bare number on the right of × or ÷ is a count.
      v = combine(op, v, r.unit === 'bare' && v.unit === 'length' ? { ...r, unit: 'count' } : r);
    }
    return v;
  }
  function sum() {
    let v = product();
    while (peek() && peek().t === 'op' && (peek().op === '+' || peek().op === '-')) {
      const op = toks[p++].op;
      v = combine(op, v, product());
    }
    return v;
  }
  const v = sum();
  if (p < toks.length) throw new Error('something extra at the end');
  // Left over as bare means nobody said; on a tape that's inches.
  return v.unit === 'bare' ? { ...v, unit: 'length' } : v;
}
