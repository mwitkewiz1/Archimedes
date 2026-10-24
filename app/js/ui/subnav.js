// subnav.js — the switch at the top of a tab between its tools.
// Add a tool: a line in its list here, a route in app.js (and its tab in TAB_OF there).

import { el } from './el.js';

const ELECTRIC = [
  ['ohm', 'Ohm\'s law'],
  ['wire', 'Wire size'],
  ['symbols', 'Symbols'],
];

const PUMPS = [
  ['catalog', 'Our pumps'],
  ['pump', 'Pump curve'],
  ['kinds', 'How they work'],
  ['trouble', 'Troubleshoot'],
  ['lift', 'Lift station'],
];

function toolNav(tools, current, name) {
  return el('nav.subnav', { 'aria-label': name },
    tools.map(([id, label]) =>
      el('a', { href: `#/${id}`, class: id === current ? 'on' : null, 'aria-current': id === current ? 'page' : null }, label)));
}

export const electricNav = (current) => toolNav(ELECTRIC, current, 'Electric tools');
export const pumpsNav = (current) => toolNav(PUMPS, current, 'Pump tools');
