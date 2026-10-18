// entry.js — the calculator's typed line as something you can edit by touch:
// text, and fractions with a top box and a bottom box. The cursor is either at
// the end of the line or in one box of one fraction. It turns into the plain
// text the parser reads (3 5/8, 5'1" − 3 1/4") and back. Pure: no DOM.

// A fraction, optionally with a whole number before it: "3 5/8", "3-5/8", "5/8".
// The separator only counts when a digit comes right before it.
const FRAC = /(?<=\d)[ -](\d+)\/(\d+)|(\d+)\/(\d+)/g;

// Text → items. The space or hyphen between a whole number and its fraction is
// dropped here and put back by toText, so text never ends in it.
export function parseLine(text) {
  const items = [];
  let last = 0;
  for (const m of String(text).matchAll(FRAC)) {
    if (m.index > last) items.push({ t: 'text', s: text.slice(last, m.index) });
    items.push({ t: 'frac', n: m[1] ?? m[3], d: m[2] ?? m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) items.push({ t: 'text', s: text.slice(last) });
  return { items, cur: null };
}

// Items → the text the parser reads. A fraction right after a digit gets a
// space, so 3 then a fraction reads as three and a fraction.
export function toText({ items }) {
  let out = '';
  for (const it of items) {
    if (it.t === 'text') out += it.s;
    else out += (/\d$/.test(out) ? ' ' : '') + `${it.n}/${it.d}`;
  }
  return out;
}

// A fraction still missing a number, and which one, or null.
export function unfinished({ items }) {
  for (const it of items) {
    if (it.t !== 'frac') continue;
    if (!it.n) return 'n';
    if (!it.d) return 'd';
  }
  return null;
}

const copy = (st) => ({ items: st.items.map((x) => ({ ...x })), cur: st.cur && { ...st.cur } });
const tidy = (st) => { st.items = st.items.filter((x) => x.t === 'frac' || x.s); return st; };

// Text from a key (an operator, a unit, a bracket): always lands at the end of
// the line, leaving any fraction.
export function typeText(st, s) {
  st = copy(st);
  st.cur = null;
  const lastItem = st.items[st.items.length - 1];
  if (lastItem?.t === 'text') lastItem.s += s; else st.items.push({ t: 'text', s });
  return st;
}

// A digit goes in the box the cursor is in, or at the end.
export function typeDigit(st, ch) {
  if (!st.cur) return typeText(st, ch);
  st = copy(st);
  st.items[st.cur.i][st.cur.box] += ch;
  return st;
}

// The fraction key: open a new fraction (cursor in its top box), or from a
// filled top box move down to the bottom, or from a filled bottom box leave it.
export function fractionKey(st) {
  st = copy(st);
  const it = st.cur && st.items[st.cur.i];
  if (it) {
    if (st.cur.box === 'n' && it.n) st.cur.box = 'd';
    else if (st.cur.box === 'd' && it.d) st.cur = null;
    return st;
  }
  st.items.push({ t: 'frac', n: '', d: '' });
  st.cur = { i: st.items.length - 1, box: 'n' };
  return st;
}

// A typed slash: the digits just before it become the top of a fraction.
export function slash(st) {
  if (st.cur) return fractionKey(st);
  st = copy(st);
  const lastItem = st.items[st.items.length - 1];
  const m = lastItem?.t === 'text' && lastItem.s.match(/(\d+)$/);
  if (!m) return fractionKey(st);
  lastItem.s = lastItem.s.slice(0, -m[1].length).replace(/[ -]$/, '');
  st.items.push({ t: 'frac', n: m[1], d: '' });
  st.cur = { i: st.items.length - 1, box: 'd' };
  return tidy(st);
}

// Tap a box to put the cursor in it.
export function tapBox(st, i, box) {
  st = copy(st);
  st.cur = { i, box };
  return st;
}

// ⌫: inside a fraction, take a digit off the box, then step up to the top
// box, then remove the empty fraction. At the end of the line, back into a
// fraction's bottom box, or take off the last character (a whole operator at once).
export function back(st) {
  st = copy(st);
  if (st.cur) {
    const it = st.items[st.cur.i];
    if (it[st.cur.box]) it[st.cur.box] = it[st.cur.box].slice(0, -1);
    else if (st.cur.box === 'd') st.cur.box = 'n';
    else if (!it.d) { st.items.splice(st.cur.i, 1); st.cur = null; }
    return tidy(st);
  }
  const lastItem = st.items[st.items.length - 1];
  if (!lastItem) return st;
  if (lastItem.t === 'frac') return back({ ...st, cur: { i: st.items.length - 1, box: 'd' } });
  lastItem.s = lastItem.s.replace(/\s*[÷×−+]\s*$|.$/, '');
  return tidy(st);
}

export const EMPTY = { items: [], cur: null };
