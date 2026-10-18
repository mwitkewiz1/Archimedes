// pump.js (screen) — the Pumps tab's first tool: a pump curve playground.
// Pick a pump, set the lift, the pipe and a valve, and see where the pump
// runs, how far from its best point, and what that does to it.

import { el } from './el.js';
import { load, save } from './store.js';
import { PUMPS, PIPE_SIZES, MATERIALS, insideDiameter, dutyPoint, bep, feetToPsi } from '../core/pump.js';
import { DRS } from '../core/fusion.js';
import { drawCurve } from './curve.js';
import { CATALOG, pumpName, curveFrom } from '../core/catalog.js';
import { pumpsNav } from './subnav.js';

const DEFAULTS = { pump: 'dewater', speed: 100, lift: 60, material: 'hdpe', size: '6', dr: '11', length: 1500, valve: 100 };

const ZONE = {
  sweet: ['Sweet spot', 'Right around its best point. Smooth, efficient, long seal and bearing life.'],
  ok: ['Fine', 'A little off its best point, but inside the range pumps are built for.'],
  left: ['Too little flow', 'The pump churns water it can\'t push out: heat, vibration, short seal and bearing life. Either the pipe is choking it (part-closed valve, long or thin pipe), so open it up or go bigger, or the lift is close to the most this pump can make, so it needs a pump with more head.'],
  right: ['Too much flow', 'Running off the end of its curve: risk of cavitation (sounds like gravel going through it) and high motor amps that can trip the overload. More restriction, or slow it down.'],
  deadhead: ['Dead-headed', 'The pipe needs more head than this pump can make, so nothing comes out. The water inside just heats up. Don\'t run it like this: less lift, or a bigger pump or full speed.'],
};

export function renderPump(view) {
  const st = { ...DEFAULTS, ...load('pumpPlay', {}) };
  // The examples, plus a pump sent over from Our pumps with an estimated curve.
  const pumps = [...PUMPS];
  const picked = /^cat-(\d+)$/.exec(st.pump || '');
  const cat = picked && CATALOG[+picked[1]];
  const est = cat && curveFrom(cat);
  if (est) pumps.unshift({ id: st.pump, name: `${pumpName(cat)} (estimated curve)`, ...est, bestEff: 0.6 });
  if (!pumps.some((p) => p.id === st.pump)) st.pump = DEFAULTS.pump;
  const estNote = el('p.note');

  const out = el('div.pump-out', { 'aria-live': 'polite' });
  const more = el('div.pump-more');
  const chart = el('div.chart');

  const slider = (key, label, min, max, stepBy, unit, extra) => {
    const shown = el('output.slider-val');
    const input = el('input.slider', { type: 'range', id: `p-${key}`, min, max, step: stepBy,
      oninput: () => { st[key] = +input.value; update(); } });
    input.value = st[key];
    const row = el('label.field', { for: `p-${key}` }, el('span.field-label.slider-head', label, shown), input);
    row.show = () => { shown.textContent = `${st[key]}${unit}${extra ? extra(st[key]) : ''}`; };
    return row;
  };
  const select = (key, label, options) => {
    const sel = el('select', { id: `p-${key}`, onchange: () => { st[key] = sel.value; update(); } },
      options.map(([v, t]) => el('option', { value: v, selected: v === st[key] }, t)));
    return el('label.field', { for: `p-${key}` }, el('span.field-label', label), sel);
  };

  const sliders = [
    slider('lift', 'Lift: water level up to the outlet', 0, 200, 1, ' ft', (v) => ` (${Math.round(feetToPsi(v))} psi)`),
    slider('length', 'Pipe length', 0, 3000, 50, ' ft'),
    slider('valve', 'Valve open', 10, 100, 5, '%'),
    slider('speed', 'Motor speed (with a drive)', 50, 100, 5, '%'),
  ];
  const drRow = select('dr', 'HDPE DR', DRS.map((d) => [d, `DR ${d}`]));

  function update() {
    save('pumpPlay', st);
    drRow.hidden = st.material !== 'hdpe';
    for (const r of sliders) r.show();
    const pump = pumps.find((p) => p.id === st.pump);
    estNote.textContent = pump.how ? `Estimated curve: ${pump.how} Efficiency assumed 60%. Check it against the pump's spec sheet before you count on it.` : '';
    const id = insideDiameter(st);
    const sys = { lift: st.lift, length: st.length, id, c: MATERIALS[st.material].c, valveOpen: st.valve / 100 };
    const speed = st.speed / 100;
    const d = dutyPoint(pump, sys, speed);
    chart.replaceChildren(drawCurve(pump, sys, speed, d));
    const r = result(pump, d, speed, id);
    out.replaceChildren(...r.top);
    more.replaceChildren(...r.more);
  }

  view.append(el('section.pumps',
    pumpsNav('pump'),
    el('h1', 'Pump curve'),
    el('p.note', 'A pump doesn\'t pick its own flow. Your pipe does. Move the sliders and watch where the two curves cross.'),
    el('div.pump-pin', out, chart),
    el('div.legend', el('span.lg.pump', 'pump'), el('span.lg.sys', 'your pipe'), el('span.lg.eff', 'efficiency'), el('span.lg.band', 'good range')),
    el('div.fields',
      select('pump', 'Pump', pumps.map((p) => [p.id, p.name])),
      estNote,
      sliders[0],
      el('div.two',
        select('material', 'Pipe', Object.entries(MATERIALS).map(([k, m]) => [k, m.name])),
        select('size', 'Size', PIPE_SIZES.map((s) => [s, `${s}"`]))),
      drRow,
      sliders[1], sliders[2], sliders[3],
    ),
    more,
    el('h2', 'What you\'re looking at'),
    el('ul.rules',
      el('li', el('strong', 'Head'), ' is how high the pump can push water, in feet. 2.31 feet of water is 1 psi, so 100 ft of head is about 43 psi on a gauge.'),
      el('li', el('strong', 'The pump curve'), ' (blue): more flow means less head. With the valve shut it makes its most head (shutoff) and moves nothing.'),
      el('li', el('strong', 'Your pipe\'s curve'), ' (orange): the lift, which never changes, plus friction, which grows fast with flow. Double the flow and friction goes up about 3.6 times.'),
      el('li', el('strong', 'The dot'), ' is where they cross: the flow and head the pump actually runs at.'),
      el('li', el('strong', 'BEP'), ' (best efficiency point) is where the pump runs smoothest. The shaded band is the range to stay in: 70 to 120% of BEP flow, best 80 to 110%.'),
      el('li', 'Slowing a pump with a drive: flow drops with speed, head drops with speed squared. Half speed is half the flow and a quarter of the head.'),
    ),
    el('p.note', 'The "Example" pumps are made up with round numbers. Pick a pump on Our pumps to bring its listed numbers here. A real pump\'s curve is on its spec sheet. Curves are for clean water: slurry makes less head than the curve shows.'),
  ));
  update();
}

function result(pump, d, speed, id) {
  const [name, says] = ZONE[d.zone];
  if (d.zone === 'deadhead') {
    return {
      top: [el('div.zone-row', el('span.zone-chip.deadhead', name), el('span.note', 'No flow'))],
      more: [el('p', says), el('p.note', `This pump's shutoff head at ${Math.round(speed * 100)}% speed is ${Math.round(pump.shutoff * speed ** 2)} ft.`)],
    };
  }
  // Shaft horsepower for water: flow × head ÷ 3960 ÷ efficiency.
  const hp = d.eff > 0 ? (d.flow * d.head) / 3960 / d.eff : null;
  return { top: [
    el('div.duty-big', `${Math.round(d.flow)} GPM`, el('span.duty-at', ` at ${Math.round(d.head)} ft (${Math.round(feetToPsi(d.head))} psi)`)),
    el('div.zone-row',
      el(`span.zone-chip.${d.zone}`, name),
      el('span.note', `${Math.round(d.ofBep * 100)}% of BEP · ${Math.round(d.eff * 100)}% efficient${hp ? ` · ${hp.toFixed(hp < 10 ? 1 : 0)} hp` : ''}`)),
  ], more: [
    el('p', el('strong', `${name}: `), says),
    el('p.note', `Pipe inside diameter about ${id.toFixed(2)}". BEP at this speed: ${Math.round(bep(pump, speed).flow)} GPM at ${Math.round(bep(pump, speed).head)} ft. Horsepower is at the pump shaft, for clean water.`),
  ] };
}
