// motor.js (screen) — the Electric tab's motor amps tool: horsepower, volts and
// phase in; out come the code table's full-load amps and what they size: wire,
// the breaker's most, the overload setting and a generator to start it.

import { el } from './el.js';
import { load, save } from './store.js';
import { electricNav } from './subnav.js';
import { pretty } from './frac.js';
import { SUPPLIES, CODES, supply, sizesFor, fullLoadAmps, hpValue, maxBreaker, overload, generator, sizingAmps } from '../core/motor.js';
import { pickWire } from '../core/wire.js';
import { parseValue, formatNumber } from '../core/ohm.js';

const LOW = Object.fromEntries(CODES.map(([c], i) => [c, i ? CODES[i - 1][1] + 0.01 : 0]));

export function renderMotor(view) {
  // Saved state may be missing or from an older version: fill it in.
  const st = { supply: '3ph460', hp: '10', start: 'atl', code: 'G', plate: '', sf: 1.15, rpm: '', feet: '', ...load('motor', {}) };
  if (!supply(st.supply)) st.supply = '3ph460';

  const sup = el('select', { id: 'm-sup', onchange: () => { st.supply = sup.value; fillHp(); show(); } },
    SUPPLIES.map((s) => el('option', { value: s.id, selected: s.id === st.supply }, s.label)));
  const hp = el('select', { id: 'm-hp', onchange: () => { st.hp = hp.value; show(); } });
  function fillHp() {
    const list = sizesFor(st.supply);
    if (!list.includes(st.hp)) st.hp = list.find((h) => hpValue(h) >= hpValue(st.hp)) || list[list.length - 1];
    hp.replaceChildren(...list.map((h) => el('option', { value: h, selected: h === st.hp }, `${h} hp`)));
  }
  const starts = [['atl', 'Across the line'], ['vfd', 'VFD (drive)']].map(([k, label]) =>
    el('button.seg', { onclick: () => { st.start = k; show(); } }, label));
  const code = el('select', { id: 'm-code', onchange: () => { st.code = code.value; show(); } },
    CODES.map(([c, top]) => el('option', { value: c, selected: c === st.code }, `${c}  (${formatNumber(LOW[c])}–${formatNumber(top)} kVA per hp)`)));
  const plate = el('input.measure', { id: 'm-plate', inputmode: 'decimal', autocomplete: 'off', placeholder: 'FLA on the plate',
    oninput: () => { st.plate = plate.value; show(); } });
  const sf = el('select', { id: 'm-sf', onchange: () => { st.sf = +sf.value; show(); } },
    [[1.15, '1.15 or more'], [1, '1.0 (or none on the plate)']].map(([v, t]) => el('option', { value: v, selected: v === st.sf }, t)));
  const feet = el('input.measure', { id: 'm-feet', inputmode: 'decimal', autocomplete: 'off', placeholder: 'optional',
    oninput: () => { st.feet = feet.value; show(); } });
  const rpm = el('input.measure', { id: 'm-rpm', inputmode: 'numeric', autocomplete: 'off', placeholder: 'optional',
    oninput: () => { st.rpm = rpm.value; show(); } });
  plate.value = st.plate;
  rpm.value = st.rpm;
  feet.value = st.feet;
  const codeField = el('label.field', { for: 'm-code' }, el('span.field-label', 'Code letter (CODE on the plate)'), code);
  const head = el('div.joint-result', { 'aria-live': 'polite' });
  const out = el('div.cut-out', { 'aria-live': 'polite' });

  function show() {
    save('motor', st);
    starts.forEach((b, k) => b.setAttribute('aria-pressed', String(['atl', 'vfd'][k] === st.start)));
    codeField.hidden = st.start === 'vfd';
    const [top, ...cards] = result(st);
    head.replaceChildren(top);
    out.replaceChildren(...cards);
  }

  view.append(el('section.motor',
    electricNav('motor'),
    el('h1', 'Motor amps'),
    el('p.note', 'The code book\'s amps for a motor this size. Wire and breakers are sized from these, not the nameplate; the overload is set from the nameplate.'),
    el('div.fields',
      el('label.field', { for: 'm-sup' }, el('span.field-label', 'Runs on'), sup),
      el('label.field', { for: 'm-hp' }, el('span.field-label', 'Horsepower'), hp)),
    head,
    el('div.fields',
      el('div.field', el('span.field-label', 'Started by'), el('div.segs.two-segs', { role: 'group', 'aria-label': 'Started by' }, starts)),
      codeField,
      el('div.two',
        el('label.field', { for: 'm-plate' }, el('span.field-label', 'Nameplate amps'), plate),
        el('label.field', { for: 'm-feet' }, el('span.field-label', 'Run length (ft)'), feet)),
      el('label.field', { for: 'm-sf' }, el('span.field-label', 'Service factor (SF on the plate)'), sf),
      el('label.field', { for: 'm-rpm' }, el('span.field-label', 'Speed (RPM on the plate)'), rpm),
    ),
    out,
    el('p.engine-note', el('strong', 'Engine terms: '), 'Starting a motor across the line is like cranking an engine: for a second or two it pulls five to eight times its running amps. ' +
      'That kick (locked-rotor amps) is what dims the lights and what a generator has to survive. A drive (VFD) ramps it up gently instead, like easing out the clutch.'),
    el('h2', 'Reading the plate'),
    el('ul.rules',
      el('li', 'HP is horsepower. V is volts; a 460 V motor runs on a 480 V supply, 575 V on 600 V, 230 V on 240 V.'),
      el('li', 'FLA (or A) is the nameplate amps at full load. The overload is set from this.'),
      el('li', 'SF, service factor: 1.15 means it can carry 15% over its horsepower for a while. It decides how high the overload may go.'),
      el('li', 'CODE is a letter for the starting kick: the further down the alphabet, the bigger the kick and the bigger the generator.'),
      el('li', 'PH is phase: 1 or 3. Hz is 60 in North America.'),
      el('li', 'RPM under 1200: the code sizes wire and breaker from the plate\'s amps instead of the table, and so does this.'),
      el('li', 'Or copy the whole plate into ', el('a', { href: '#/plate' }, 'Nameplate'), ': it explains every box, checks the plate against the supply and fills these in.'),
    ),
    el('h2', 'What this doesn\'t cover'),
    el('p.note', 'Wire derating (hot spaces, more than 3 wires in a conduit), aluminum, motors over 600 V, wound-rotor and DC motors, and other loads sharing the generator. ' +
      'The generator size is a rule of thumb; the generator\'s maker sizes it for real. If it\'s permitted work, an electrician or inspector has the last word.'),
  ));
  fillHp();
  show();
}

function result(st) {
  const s = supply(st.supply);
  const table = fullLoadAmps(st.hp, st.supply);
  if (table == null) return [el('p.big-note', 'The code table lists no motor that size on that supply.')];
  const r1 = (x) => formatNumber(Math.round(x * 10) / 10), r0 = (x) => formatNumber(Math.round(x));
  const feet = parseValue(st.feet);
  const plate = parseValue(st.plate);
  const { amps: fla, from } = sizingAmps(table, plate, parseValue(st.rpm));
  const w = pickWire({ sys: { volts: s.volts, kind: s.phase === 3 ? '3ph' : '1ph', label: s.label }, amps: fla, feet: feet > 0 ? feet : 1, continuous: true });
  const b = maxBreaker(fla);
  const g = generator({ hp: st.hp, fla, volts: s.volts, phase: s.phase, code: st.code, start: st.start });
  const card = (name, big, ...says) => el('div.part-card', el('div.part-name', name), el('div.big-mid', big), ...says.map((t) => el('p.part-does', t)));
  return [
    el('div',
      el('div.note', from === 'plate' ? 'Full-load amps (the plate\'s: under 1200 RPM)' : 'Full-load amps (code table)'),
      el('div.big', `${formatNumber(fla)} A`),
      el('div.alt', ...pretty(`${st.hp} hp`), `, ${s.label.replace(/ \(.*\)$/, '')}`)),
    el('div.parts',
      card('Wire (copper)', w.ok ? w.size.name : '—',
        w.ok ? `Sized for 125% of the amps: ${formatNumber(w.designAmps)} A. ${w.size.name} carries ${w.sizeAmps} A.` : w.error,
        w.ok && feet > 0 ? `Loses ${r1(w.drop)} V (${(w.dropPct * 100).toFixed(1)}%) over ${formatNumber(feet)} ft${w.decidedBy === 'drop' ? '; the length decided the size' : ''}.` : 'Add a run length to check the voltage that reaches the motor.'),
      card('Breaker (inverse time)', b.size ? `up to ${b.size} A` : 'over 1200 A',
        `250% of ${formatNumber(fla)} A is ${formatNumber(b.limit)} A${b.size !== b.limit ? `; the next standard size up, ${b.size} A, is allowed` : ''}.`,
        'That is the most it may be, so it holds the starting kick. The overload, not the breaker, protects the motor from running hot.'),
      card('Overload', plate > 0 ? `${r1(overload(plate, st.sf))} A at most` : 'from the plate',
        plate > 0 ? `${st.sf >= 1.15 ? '125' : '115'}% of the plate's ${formatNumber(plate)} A. Most set the dial at the plate amps; this is the highest it may go.`
          : 'Type the nameplate amps (FLA) above. Overloads are set from the plate, not the table.'),
      card('Generator', `at least ${g.kw} kW`,
        st.start === 'vfd'
          ? `The drive starts it gently, but its choppy current wants about twice the motor's running ${r1(g.runKW)} kW.`
          : `Starting it pulls about ${r0(g.startKVA)} kVA (${r0(g.startAmps)} A) for a second or two. ` +
            (g.by === 'start' ? 'This size keeps the voltage dip to about 30%, which most starters ride through.' : 'Running it with 25% spare decides the size here.'),
        'Rule of thumb, for this motor alone. Other loads on the generator add to it.'),
    ),
  ];
}
