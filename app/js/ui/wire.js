// wire.js — the Electric tab's wire size tool: what the circuit runs on, the
// amps, how far; out comes the smallest copper wire that is safe for the amps and
// keeps the voltage at the load, with which of the two checks decided it.

import { el } from './el.js';
import { load, save } from './store.js';
import { electricNav } from './electric.js';
import { SYSTEMS, pickWire } from '../core/wire.js';
import { parseValue, formatNumber } from '../core/ohm.js';

const SVG = 'http://www.w3.org/2000/svg';

export function renderWire(view) {
  // Saved state may be missing or from an older version: fill it in.
  const st = { system: 'ac120', amps: '', feet: '', continuous: false, maxDrop: 0.03, ...load('wire', {}) };

  const system = el('select', { id: 'w-sys', onchange: () => { st.system = system.value; show(); } },
    SYSTEMS.map((s) => el('option', { value: s.id, selected: s.id === st.system }, s.label)));
  const amps = el('input.measure', { id: 'w-amps', inputmode: 'decimal', autocomplete: 'off', placeholder: 'from the nameplate',
    oninput: () => { st.amps = amps.value; show(); } });
  const feet = el('input.measure', { id: 'w-feet', inputmode: 'decimal', autocomplete: 'off', placeholder: 'one way, in feet',
    oninput: () => { st.feet = feet.value; show(); } });
  const cont = el('input', { type: 'checkbox', id: 'w-cont', onchange: () => { st.continuous = cont.checked; show(); } });
  const drop = el('select', { id: 'w-drop', onchange: () => { st.maxDrop = +drop.value; show(); } },
    [[0.03, '3% (the usual aim)'], [0.05, '5% (most a whole run should lose)']].map(([v, t]) =>
      el('option', { value: v, selected: v === st.maxDrop }, t)));
  amps.value = st.amps;
  feet.value = st.feet;
  cont.checked = st.continuous;

  const out = el('div.cut-out', { 'aria-live': 'polite' });

  function show() {
    save('wire', st);
    const r = pickWire({
      system: st.system,
      amps: parseValue(st.amps) ?? NaN,
      feet: parseValue(st.feet) ?? NaN,
      continuous: st.continuous,
      maxDrop: st.maxDrop,
    });
    out.replaceChildren(...result(r, st));
  }

  view.append(el('section.wire',
    electricNav('wire'),
    el('h1', 'Wire size'),
    el('p.note', 'Copper wire. Two checks: will it carry the amps without overheating, and does enough voltage reach the load?'),
    el('div.fields',
      el('label.field', { for: 'w-sys' }, el('span.field-label', 'Runs on'), system),
      el('div.two',
        el('label.field', { for: 'w-amps' }, el('span.field-label', 'Amps'), amps),
        el('label.field', { for: 'w-feet' }, el('span.field-label', 'Run length (ft)'), feet)),
      el('label.check', { for: 'w-cont' }, cont,
        el('span', el('strong', 'Runs 3 hours or more, or it\'s a motor'), el('span.ohm-what', ' The code sizes these for 125% of the amps.'))),
      el('label.field', { for: 'w-drop' }, el('span.field-label', 'Most voltage the run may lose'), drop),
    ),
    out,
    el('h2', 'Why length matters'),
    el('p', 'Wire is a long, thin resistor. A long run of thin hose loses pressure before the nozzle, and a long run of thin wire loses volts before the load. ' +
      'The amps check keeps the wire from cooking; the voltage check keeps a motor from starting weak and running hot.'),
    el('ul.rules',
      el('li', 'Length is one way, supply to load. The math counts the trip back.'),
      el('li', 'Amps: the nameplate number (FLA on a motor). Only watts? Use the Ohm\'s law tool: amps = watts ÷ volts.'),
      el('li', 'Three phase loses less than single phase for the same amps, because the phases share the trip back.'),
    ),
    el('h2', 'What this doesn\'t cover'),
    el('p.note', 'More than 3 current-carrying wires in one conduit, hot attics or rooftops (both need bigger wire), aluminum, ground wire size, conduit fill, ' +
      'and local code. For a motor circuit an inspector uses the motor amps table in the code book, not the nameplate; they are close. The breaker must not be bigger than the wire\'s amps. If it\'s permitted work, an electrician or inspector has the last word.'),
  ));
  show();
}

function result(r, st) {
  if (!r.ok) return [el('p.big-note', r.error)];
  const v = r.system.volts;
  const why = r.decidedBy === 'amps'
    ? r.smaller
      ? `The amps decided. ${r.smaller.size.name} only carries ${r.smaller.sizeAmps} A, and this needs ${formatNumber(r.designAmps)} A${st.continuous ? ` (${formatNumber(r.designAmps / 1.25)} × 1.25 because it runs for hours)` : ''}.`
      : 'The amps decided. This is the smallest size the tool offers.'
    : `The length decided. ${r.smaller.size.name} would carry the amps, but loses ${pct(r.smaller.dropPct)} over the run.`;
  return [
    el('div.joint-result',
      el('div.note', 'Smallest copper wire'),
      el('div.big', r.size.name),
      el('div.alt', `carries ${r.sizeAmps} A safely · loses ${formatNumber(r.drop)} V (${pct(r.dropPct)})`)),
    el('p', why),
    run(r, st),
  ];
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;

// Supply, the run of wire, the load: volts at each end and what the wire ate.
function run(r, st) {
  const s = (tag, attrs, text) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, x] of Object.entries(attrs)) n.setAttribute(k, x);
    if (text != null) n.textContent = text;
    return n;
  };
  const svg = s('svg', { viewBox: '0 0 320 110', class: 'pipe ohm-svg', role: 'img',
    'aria-label': `${formatNumber(r.system.volts)} volts at the supply, ${formatNumber(r.atLoad)} volts at the load` });
  svg.append(s('rect', { class: 'box', x: 4, y: 30, width: 76, height: 44, rx: 6 }));
  svg.append(s('rect', { class: 'box', x: 240, y: 30, width: 76, height: 44, rx: 6 }));
  svg.append(s('text', { class: 'lbl', x: 42, y: 48, 'text-anchor': 'middle' }, 'supply'));
  svg.append(s('text', { class: 'dim-text', x: 42, y: 66, 'text-anchor': 'middle' }, `${formatNumber(r.system.volts)} V`));
  svg.append(s('text', { class: 'lbl', x: 278, y: 48, 'text-anchor': 'middle' }, 'load'));
  svg.append(s('text', { class: 'dim-text', x: 278, y: 66, 'text-anchor': 'middle' }, `${formatNumber(r.atLoad)} V`));
  svg.append(s('line', { class: 'wire', x1: 80, y1: 46, x2: 240, y2: 46 }));
  svg.append(s('line', { class: 'wire', x1: 80, y1: 58, x2: 240, y2: 58 }));
  svg.append(s('text', { class: 'lbl', x: 160, y: 24, 'text-anchor': 'middle' }, `${r.size.name}, ${st.feet} ft each way`));
  svg.append(s('text', { class: 'dim-text ohm-watts', x: 160, y: 92, 'text-anchor': 'middle' }, `−${formatNumber(r.drop)} V lost in the wire`));
  return svg;
}
