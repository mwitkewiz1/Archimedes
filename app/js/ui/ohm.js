// ohm.js — the Electric tab's first tool: Ohm's law and power. Type any two of
// volts, amps, ohms, watts; the other two fill in, with the formula shown and a
// picture of the circuit. The two you typed last are the ones that count.

import { el } from './el.js';
import { load, save } from './store.js';
import { electricNav } from './subnav.js';
import { QUANTS, ORDER, solve, parseValue, formatNumber, withPrefix } from '../core/ohm.js';

const SVG = 'http://www.w3.org/2000/svg';

const WHAT = {
  V: 'the push',
  I: 'how much flows',
  R: 'how hard the load resists',
  P: 'the work done (heat, light, turning)',
};

const EXAMPLES = [
  ['Heater on a wall plug', { V: '120', P: '1500' }],
  ['12 V bulb, 4 A', { V: '12', I: '4' }],
  ['Battery across 6 Ω', { V: '12', R: '6' }],
];

export function renderOhm(view) {
  // Saved state may be missing or from an older version: fill it in.
  const saved = load('ohm', {});
  let text = { V: '', I: '', R: '', P: '', ...(saved.text || {}) };
  let typed = Array.isArray(saved.typed) ? saved.typed.filter((k) => ORDER.includes(k)) : [];

  const inputs = {};
  const tags = {};
  const fields = ORDER.map((k) => {
    inputs[k] = el('input.measure', {
      id: `ohm-${k}`,
      inputmode: 'decimal',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: '–',
      oninput: () => typedInto(k),
    });
    tags[k] = el('span.ohm-tag');
    return el('label.field.ohm-field', { for: `ohm-${k}` },
      el('span.field-label', `${QUANTS[k].name} (${QUANTS[k].unit})`, tags[k]),
      el('span.ohm-what', WHAT[k]),
      inputs[k]);
  });

  const out = el('div.ohm-out', { 'aria-live': 'polite' });
  const picture = el('div.ohm-pic');

  function typedInto(k) {
    text[k] = inputs[k].value;
    typed = typed.filter((x) => x !== k);
    if (text[k].trim()) typed.push(k);
    // A third number pushes out the oldest one you typed; it becomes an answer.
    while (typed.length > 2) text[typed.shift()] = '';
    show({ keep: k });
  }

  function show({ keep } = {}) {
    save('ohm', { text, typed });
    const given = {};
    for (const k of typed) given[k] = parseValue(text[k]);
    const bad = typed.find((k) => given[k] == null);
    const r = bad ? { ok: false, error: `${QUANTS[bad].name}: type a plain number, like 12 or 1.5k.` } : solve(given);

    for (const k of ORDER) {
      const mine = typed.includes(k);
      inputs[k].classList.toggle('worked', !mine && r.ok);
      tags[k].textContent = mine ? ' · you typed' : r.ok ? ' · worked out' : '';
      if (k === keep) continue; // never rewrite the box under your thumb
      inputs[k].value = mine ? text[k] : r.ok ? formatNumber(r.values[k]) : '';
    }
    out.replaceChildren(...answer(r));
    picture.replaceChildren(circuit(r.ok ? r.values : null));
  }

  function clear() {
    text = { V: '', I: '', R: '', P: '' };
    typed = [];
    show();
  }

  function example(vals) {
    text = { V: '', I: '', R: '', P: '', ...vals };
    typed = Object.keys(vals);
    show();
    window.scrollTo(0, 0);
  }

  view.append(el('section.ohm',
    electricNav('ohm'),
    el('h1', 'Ohm\'s law'),
    el('p.note', 'Type any two. The other two work themselves out.'),
    el('div.two', fields),
    el('button.small-btn.ohm-clear', { onclick: clear }, 'Clear all'),
    out,
    picture,
    el('h2', 'What the four numbers mean'),
    el('p', 'Think of water in a hose. ',
      el('strong', 'Volts'), ' are the pressure. ',
      el('strong', 'Amps'), ' are the flow, how much goes through each second. ',
      el('strong', 'Ohms'), ' are how narrow the hose is: more ohms, less flow for the same push. ',
      el('strong', 'Watts'), ' are the work the flow does, the way a pump\'s horsepower is pressure and flow together.'),
    el('ul.rules',
      el('li', 'Amps = Volts ÷ Ohms. More push, more flow; more resistance, less.'),
      el('li', 'Watts = Volts × Amps. A 1,500 W heater on 120 V pulls 12.5 A.'),
      el('li', 'Big numbers: ', el('code', '1.5k'), ' is 1,500; ', el('code', '2M'), ' is 2,000,000; ', el('code', '500m'), ' is 0.5 (milli, a thousandth).'),
    ),
    el('h2', 'Try one'),
    el('div.ohm-examples', EXAMPLES.map(([label, vals]) =>
      el('button.small-btn', { onclick: () => example(vals) }, label))),
    el('h2', 'Where it stops working'),
    el('p.note', 'This is exact for batteries and DC, and for heaters and plain bulbs on AC. ' +
      'A motor on AC pulls more amps than watts ÷ volts, and a motor\'s winding reads far fewer ohms on a meter than it acts like when it runs. ' +
      'That is power factor, which gets its own tool later. Wire size is its own tool: Wire size, at the top of this tab.'),
  ));

  for (const k of ORDER) inputs[k].value = text[k];
  show();
}

function answer(r) {
  if (!r.ok) return [el('div.note', r.error)];
  return [
    el('ol.steps', r.steps.map((s) => {
      const v = r.values[s.key];
      const unit = QUANTS[s.key].unit;
      const easy = withPrefix(v, unit);
      return el('li.step',
        el('span.step-text', s.formula),
        el('span.tape-note', `${s.work} =`),
        el('strong.step-val', `${formatNumber(v)} ${unit}`),
        easy && el('span.tape-note', `same as ${easy}`));
    })),
  ];
}

// A battery, a load, and the flow around the loop, labelled with the numbers.
function circuit(v) {
  const s = (tag, attrs, text) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, x] of Object.entries(attrs)) n.setAttribute(k, x);
    if (text != null) n.textContent = text;
    return n;
  };
  const show = (k) => (v ? `${formatNumber(v[k])} ${QUANTS[k].unit}` : `? ${QUANTS[k].unit}`);
  const svg = s('svg', { viewBox: '0 0 320 170', class: 'pipe ohm-svg', role: 'img',
    'aria-label': v ? `Circuit: ${show('V')} battery, ${show('R')} load, ${show('I')} flowing, ${show('P')}` : 'Circuit picture' });

  // Wire loop with a gap on the left for the battery and on the right for the load.
  svg.append(s('path', { class: 'wire', d: 'M90 60 V30 H230 V60 M230 110 V140 H90 V110' }));
  // Battery: long line is +, short line is −.
  svg.append(s('line', { class: 'wire', x1: 70, y1: 75, x2: 110, y2: 75 }));
  svg.append(s('line', { class: 'wire thick', x1: 80, y1: 92, x2: 100, y2: 92 }));
  svg.append(s('line', { class: 'wire', x1: 90, y1: 60, x2: 90, y2: 75 }));
  svg.append(s('line', { class: 'wire', x1: 90, y1: 92, x2: 90, y2: 110 }));
  svg.append(s('text', { class: 'lbl', x: 114, y: 72 }, '+'));
  svg.append(s('text', { class: 'lbl', x: 106, y: 106 }, '−'));
  // Load as a zigzag resistor.
  svg.append(s('path', { class: 'wire', d: 'M230 60 l-10 5 l20 10 l-20 10 l20 10 l-20 10 l10 5' }));

  svg.append(s('text', { class: 'dim-text', x: 8, y: 88 }, show('V')));
  svg.append(s('text', { class: 'lbl', x: 8, y: 106 }, 'supply'));
  svg.append(s('text', { class: 'dim-text', x: 312, y: 88, 'text-anchor': 'end' }, show('R')));
  svg.append(s('text', { class: 'lbl', x: 312, y: 106, 'text-anchor': 'end' }, 'load'));
  // Flow arrow along the top wire, from + round to the load.
  svg.append(s('path', { class: 'flow', d: 'M135 30 h50 m-8 -5 l8 5 l-8 5' }));
  svg.append(s('text', { class: 'dim-text', x: 160, y: 20, 'text-anchor': 'middle' }, `${show('I')} flowing`));
  svg.append(s('text', { class: 'dim-text ohm-watts', x: 165, y: 92, 'text-anchor': 'middle' }, show('P')));
  svg.append(s('text', { class: 'lbl', x: 165, y: 110, 'text-anchor': 'middle' }, 'heat, light, motion'));
  return svg;
}
