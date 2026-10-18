// frac.js — writes fractions the way a hand does: whole number full size, the
// fraction small beside it, top raised, slash, bottom lowered (⁵⁄₃₂). pretty('73 17/32"') gives nodes for el().
// Only a slash with no spaces is a fraction; " / " with spaces is divide.

import { el } from './el.js';

// A whole number then a space or hyphen then a fraction (3 1/4, 3-1/4), or a bare fraction (3/32).
const FRAC = /(\d+)[ -](\d+)\/(\d+)|(\d+)\/(\d+)/g;

export function fracEl(n, d) {
  return el('span.fr', { role: 'img', 'aria-label': `${n}/${d}` }, el('span.fr-n', n), el('span.fr-s', '⁄'), el('span.fr-d', d));
}

export function pretty(text) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(FRAC)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(m[1], fracEl(m[2], m[3]));
    else out.push(fracEl(m[4], m[5]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
