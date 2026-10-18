// measure.js — exact tape-measure numbers. Owns: fractions (rationals),
// reading what a person types (5'1", 3 1/4, 3-1/4", 57.75) and writing
// inches back the way a tape reads. Pure: no DOM, no storage.

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

// A rational number {n, d}: d > 0, reduced.
export function frac(n, d = 1) {
  if (d === 0) throw new Error('divide by zero');
  if (!Number.isInteger(n) || !Number.isInteger(d)) return fromDecimal(n / d);
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

// Decimals become exact fractions (57.75 → 231/4) by counting decimal places.
export function fromDecimal(x) {
  if (!Number.isFinite(x)) throw new Error('not a number');
  const s = String(x);
  if (s.includes('e')) return frac(Math.round(x * 1e6), 1e6);
  const places = (s.split('.')[1] || '').length;
  const d = 10 ** places;
  return frac(Math.round(x * d), d);
}

export const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const div = (a, b) => {
  if (b.n === 0) throw new Error('divide by zero');
  return frac(a.n * b.d, a.d * b.n);
};
export const cmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
export const toNumber = (a) => a.n / a.d;
export const ZERO = frac(0);

// One plain number: whole, decimal, fraction, or mixed (3 1/4 or 3-1/4).
// The bare fraction goes first so a scan from the left reads 3/32 whole, not 3.
const NUM = String.raw`(?:\d+\/\d+|\d+(?:\.\d+)?(?:(?:\s+|-)\d+\/\d+)?|\.\d+)`;
// A measurement: feet, inches, or both. Unit marks are optional on inches.
export const MEASURE_SRC = String.raw`(?:(${NUM})\s*')?\s*(?:(${NUM})\s*("?))?`;

export function normalize(s) {
  return String(s)
    .replace(/[″“”]|''/g, '"')
    .replace(/[′‘’]/g, "'")
    .replace(/(\d)\s*(feet|foot|ft)\b\.?/gi, "$1'")
    .replace(/(\d)\s*(inches|inch|in)\b\.?/gi, '$1"')
    .replace(/[½¼¾⅛⅜⅝⅞]/g, (c) => ' ' + ({ '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' })[c]);
}

export function parseNumber(s) {
  s = s.trim();
  let m = s.match(/^(\d+)(?:\s+|-)(\d+)\/(\d+)$/);
  if (m) return add(frac(+m[1]), frac(+m[2], +m[3]));
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return frac(+m[1], +m[2]);
  if (/^(\d+(\.\d+)?|\.\d+)$/.test(s)) return fromDecimal(parseFloat(s));
  return null;
}

// Reads one measurement. Returns { value, unit } where value is inches and
// unit is 'length' when a ' or " was typed, 'bare' for a plain number.
// Returns null when the text isn't a measurement.
export function parseMeasure(text) {
  const s = normalize(text).trim();
  if (!s) return null;
  const m = s.match(new RegExp('^' + MEASURE_SRC + '$'));
  if (!m || (m[1] == null && m[2] == null)) return null;
  let value = ZERO;
  if (m[1] != null) value = add(value, mul(parseNumber(m[1]), frac(12)));
  if (m[2] != null) value = add(value, parseNumber(m[2]));
  const unit = m[1] != null || m[3] ? 'length' : 'bare';
  return { value, unit };
}

// Rounds to the nearest 1/denom of an inch (16 = a sixteenth).
export function roundTo(a, denom) {
  return frac(Math.round((a.n * denom) / a.d), denom);
}

// Whole and fraction parts of a non-negative rational: 57 7/8.
function mixed(a) {
  const whole = Math.floor(a.n / a.d);
  const rest = frac(a.n - whole * a.d, a.d);
  return { whole, rest };
}

function mixedText(a) {
  const { whole, rest } = mixed(a);
  if (rest.n === 0) return String(whole);
  return whole ? `${whole} ${rest.n}/${rest.d}` : `${rest.n}/${rest.d}`;
}

// Inches as a tape reads: 57 7/8". Exact when it lands on a 64th,
// otherwise the nearest 64th with "about" (≈).
export function formatInches(a, { feet = false } = {}) {
  const neg = a.n < 0;
  let v = neg ? frac(-a.n, a.d) : a;
  const exact = 64 % v.d === 0;
  if (!exact) v = roundTo(v, 64);
  let text;
  const { whole } = mixed(v);
  if (feet && whole >= 12) {
    const ft = Math.floor(whole / 12);
    const inches = sub(v, frac(ft * 12));
    text = `${ft}' ${mixedText(inches)}"`;
  } else {
    text = `${mixedText(v)}"`;
  }
  return (exact ? '' : '≈ ') + (neg ? '−' : '') + text;
}

// What to read on a tape marked in 1/denom: the nearest mark and whether the
// true number is a hair over or under it.
export function onTape(a, denom = 16) {
  const mark = roundTo(a, denom);
  const off = sub(a, mark);
  const side = off.n === 0 ? 'on' : off.n > 0 ? 'over' : 'under';
  return { mark, side, off };
}
