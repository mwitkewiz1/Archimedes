// plate.js (screen) — the Electric tab's nameplate reader: a drawn motor plate to
// copy a real one into, box for box. Tap a box to see what it means; the plate is
// checked against the supply it runs on, and it can fill in Motor amps.

import { el } from './el.js';
import { load, save } from './store.js';
import { electricNav } from './subnav.js';
import { pretty } from './frac.js';
import { supply } from '../core/motor.js';
import { SUPPLY_CHOICES, BOXES, markVolts, explain, check, toMotor } from '../core/plate.js';

// The drawing, row by row as on a real plate: each box and how many of the three columns it takes.
const ROWS = [[['hp'], ['rpm'], ['frame']], [['volts', 2], ['hz']], [['amps', 3]], [['ph'], ['sf'], ['sfa']],
  [['code'], ['des'], ['ins']], [['amb'], ['duty'], ['encl']], [['eff', 2], ['pf']]];
const BOX = Object.fromEntries(BOXES.map((b) => [b.id, b]));
const blank = () => ({ ...Object.fromEntries(BOXES.map((b) => [b.id, ''])), amps: {} });
const TAG = { ok: 'Fine.', watch: 'Look.', bad: 'Wrong.', note: 'Note.' };

// Explanations stack their fractions (7-1/2 hp); a volts mark (230/460) isn't one, so VOLTS stays flat.
const lineEl = (id, text) => el('p.part-does', ...(id === 'volts' ? [text] : pretty(text)));

export function renderPlate(view) {
  // Saved state may be missing or from an older version: fill it in.
  const saved = load('plate', {});
  const st = { supply: saved.supply || load('motor', {}).supply || '3ph460', plate: { ...blank(), ...saved.plate }, box: null };
  if (!supply(st.supply)) st.supply = '3ph460';

  const sup = el('select', { id: 'p-sup', onchange: () => { st.supply = sup.value; show(); } },
    SUPPLY_CHOICES.map((s) => el('option', { value: s.id, selected: s.id === st.supply }, s.label)));

  const boxEls = {};
  const focus = (id) => {
    st.box = id;
    for (const [k, b] of Object.entries(boxEls)) b.classList.toggle('on', k === id);
    showSay();
  };

  function control(b) {
    const props = { id: `p-${b.id}`, onfocus: () => focus(b.id) };
    const set = (v) => { st.plate[b.id] = v; if (b.id === 'volts') fillAmps(); show(); };
    if (b.pick) {
      const s = el('select', { ...props, onchange: () => set(s.value) },
        el('option', { value: '' }, '—'), b.pick.map((v) => el('option', { value: v, selected: v === st.plate[b.id] }, v)));
      return s;
    }
    const i = el('input', { ...props, inputmode: b.type, autocomplete: 'off', spellcheck: 'false',
      autocapitalize: b.type === 'text' ? 'characters' : 'off', oninput: () => set(i.value) });
    i.value = st.plate[b.id];
    return i;
  }

  // One amps box per volts the plate names, in its order.
  const amps = el('div.pamps');
  function fillAmps() {
    const volts = markVolts(st.plate.volts);
    amps.replaceChildren(...(volts.length ? volts.map((v) => {
      const i = el('input', { id: `p-amps-${v}`, inputmode: 'decimal', autocomplete: 'off', 'aria-label': `Amps at ${v} V`,
        onfocus: () => focus('amps'), oninput: () => { st.plate.amps[v] = i.value; show(); } });
      i.value = st.plate.amps[v] ?? '';
      return el('label.pamp', el('span.pamp-at', `${v} V`), i);
    }) : [el('span.pamp-none', 'Pick VOLTS first')]));
  }

  const plate = el('div.plate', el('div.plate-title', 'AC MOTOR'),
    ROWS.flat().map(([id, span]) => {
      const b = BOX[id];
      boxEls[id] = id === 'amps'
        ? el(`div.pbox.span3`, { onclick: () => focus('amps') }, el('span.pstamp', b.stamp), amps)
        : el(`label.pbox${span ? `.span${span}` : ''}`, el('span.pstamp', b.stamp), control(b));
      return boxEls[id];
    }));

  const say = el('div.plate-say', { 'aria-live': 'polite' });
  function showSay() {
    const b = BOX[st.box];
    say.replaceChildren(...(b ? [el('div.part-name', `${b.stamp}: ${b.name}`), ...explain(b.id, st.plate, st.supply).map((t) => lineEl(b.id, t))]
      : [el('p.note', 'Tap any box to see what it means.')]));
  }

  const checks = el('div.verdicts', { 'aria-live': 'polite' });
  const why = el('p.note');
  const go = el('button.primary', { onclick: () => {
    const m = toMotor(st.plate, st.supply);
    if (!m.motor) return;
    save('motor', { ...load('motor', {}), ...m.motor });
    location.hash = '#/motor';
  } }, 'Fill in Motor amps');

  function show() {
    save('plate', { supply: st.supply, plate: st.plate });
    const found = check(st.plate, st.supply);
    checks.replaceChildren(...(found.length
      ? found.map(({ level, text }) => el(`div.pcheck.pc-${level}`, el('strong.pcheck-tag', TAG[level]), ' ', ...pretty(text)))
      : [el('p.note', 'Fill in HP, VOLTS and AMPS to check the plate against the supply.')]));
    const m = toMotor(st.plate, st.supply);
    go.disabled = !m.motor;
    why.replaceChildren(...(m.why ? pretty(m.why) : []));
    showSay();
  }

  view.append(el('section.nameplate',
    electricNav('plate'),
    el('h1', 'Nameplate'),
    el('p.note', 'Copy the motor\'s plate, box for box. Tap any box to see what it means. Leave blank what your plate doesn\'t have.'),
    el('label.field', { for: 'p-sup' }, el('span.field-label', 'Runs on'), sup),
    plate,
    say,
    el('h2', 'On this supply'),
    checks,
    el('div.plate-go', why, go,
      el('button.small-btn', { onclick: () => { save('plate', { supply: st.supply, plate: blank() }); view.replaceChildren(); renderPlate(view); } }, 'Clear the plate')),
    el('details.losses', el('summary', 'Every box, one by one'),
      BOXES.map((b) => el('div.pbox-about', el('div.part-name', `${b.stamp}: ${b.name}`), b.says.map((t) => lineEl(b.id, t))))),
    el('h2', 'What this doesn\'t cover'),
    el('p.note', 'DC and wound-rotor motors, motors over 600 V, and two-speed motors (two sets of amps, one for each speed).'),
  ));
  fillAmps();
  show();
}
