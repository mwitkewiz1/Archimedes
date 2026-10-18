// electric.js — the switch at the top of the Electric tab between its tools.
// Add a tool: a line here, a route in app.js (and its tab in TAB_OF there).

import { el } from './el.js';

const TOOLS = [
  ['ohm', 'Ohm\'s law'],
  ['wire', 'Wire size'],
  ['symbols', 'Symbols'],
];

export function electricNav(current) {
  return el('nav.subnav', { 'aria-label': 'Electric tools' },
    TOOLS.map(([id, label]) =>
      el('a', { href: `#/${id}`, class: id === current ? 'on' : null, 'aria-current': id === current ? 'page' : null }, label)));
}
