// subnav.js — the switch at the top of a tab between its tools.
// Add a tool: a line in its list here, a route in app.js (and its tab in TAB_OF there).

import { el } from './el.js';

const FUSE = [
  ['cut', 'Cut & fuse'],
  ['fusion', 'Fusing loss'],
];

const ELECTRIC = [
  ['ohm', 'Ohm\'s law'],
  ['wire', 'Wire size'],
  ['motor', 'Motor amps'],
  ['plate', 'Nameplate'],
  ['phase', 'Phases'],
  ['symbols', 'Symbols'],
  ['resistor', 'Resistors'],
  ['diode', 'Diodes'],
];

const PUMPS = [
  ['catalog', 'Our pumps'],
  ['pump', 'Pump curve'],
  ['kinds', 'How they work'],
  ['trouble', 'Troubleshoot'],
  ['lift', 'Lift station'],
];

const VALVES = [
  ['valve', 'Kinds'],
  ['control', 'Control valves'],
  ['adjust', 'Adjust'],
  ['vtrouble', 'Troubleshoot'],
];

// Over six tools go three to a row.
function toolNav(tools, current, name) {
  return el(tools.length > 6 ? 'nav.subnav.many' : 'nav.subnav', { 'aria-label': name },
    tools.map(([id, label]) =>
      el('a', { href: `#/${id}`, class: id === current ? 'on' : null, 'aria-current': id === current ? 'page' : null }, label)));
}

export const fuseNav = (current) => toolNav(FUSE, current, 'Fusion tools');
export const electricNav = (current) => toolNav(ELECTRIC, current, 'Electric tools');
export const pumpsNav = (current) => toolNav(PUMPS, current, 'Pump tools');
export const valvesNav = (current) => toolNav(VALVES, current, 'Valve tools');
