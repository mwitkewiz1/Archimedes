// resistor.js (screen) — the Electric tab's Resistors tool: read the color
// bands (or type ohms and see the bands), resistors chained and side by side,
// the watts one can take, and where resistors show up in a pump panel.

import { el } from './el.js';
import { load, save } from './store.js';
import { pretty } from './frac.js';
import { electricNav } from './subnav.js';
import { COLOR, bandRoles, choices, readBands, bandsFor, share, wattSize, heat, BODY } from '../core/resistor.js';
import { parseValue, formatNumber, withPrefix } from '../core/ohm.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// 4,700 Ω reads as 4.7 kΩ; under 1,000 stays plain.
export const ohmsText = (x) => (x >= 1000 ? withPrefix(x, 'Ω') : `${formatNumber(x)} Ω`);
const ampsText = (x) => withPrefix(x, 'A') || `${formatNumber(x)} A`;

const ROLE_NAME = { digit: 'digit', mult: 'times', tol: '±' };

// What a color means in a band with this role: "2", "×1k", "±5%".
function meaning(c, role) {
  if (role === 'digit') return String(c.digit);
  if (role === 'mult') return c.exp < 3 ? `×${formatNumber(10 ** c.exp)}` : `×${10 ** (c.exp % 3)}${['k', 'M', 'G'][Math.floor(c.exp / 3) - 1]}`;
  return `±${c.tol}%`;
}

const FRESH = { count: 4, b4: ['yellow', 'violet', 'red', 'gold'], b5: ['brown', 'black', 'black', 'brown', 'brown'], pick: 0,
  how: 'series', rs: ['100', '220'], volts: '', wOhms: '', wBy: 'volts', wVal: '' };

// The motor ones carry no volts: a running motor pulls far fewer amps than its meter ohms say (see Ohm's law).
const EXAMPLES = [
  ['Motor windings wired for 460 V', { how: 'series', rs: ['2', '2'], volts: '' }],
  ['Same windings wired for 230 V', { how: 'parallel', rs: ['2', '2'], volts: '' }],
  ['Two 120 V heaters on 240 V', { how: 'series', rs: ['144', '144'], volts: '240' }],
  ['Two heaters side by side on 120 V', { how: 'parallel', rs: ['144', '144'], volts: '120' }],
];

const WHERE = [
  ['Pilot lights', 'An old neon pilot light on 120 V has a resistor in line, about 100,000 Ω (100 kΩ), often inside the lamp holder: the neon would short out without it. An LED pilot light has one built in.'],
  ['Panel and motor heaters', 'A heater strip or a motor\'s space heater is a resistor made to get hot. Check one cold with an ohmmeter: a 100 W heater for 120 V reads about 144 Ω (volts × volts ÷ watts). OL means it has burnt open.'],
  ['Level transducers (4 to 20 mA)', 'A level transducer in a wet well sends 4 mA when empty and 20 mA when full. A 250 Ω resistor at the controller turns that into 1 to 5 V: 0.004 A × 250 Ω = 1 V, 0.020 A × 250 Ω = 5 V.'],
  ['Heat sensors in a submersible', 'Two kinds sit in the windings. A thermal switch reads near 0 Ω and opens when hot. A thermistor (PTC) reads a few hundred ohms cold and jumps to thousands when hot. Either way, the panel\'s relay reads it and stops the pump.'],
  ['Seal-leak probe', 'A probe in a submersible\'s oil chamber. Clean oil reads very high ohms; water getting past the seal drops it, and the panel\'s relay trips or lights the seal-fail light. Time for oil and seals.'],
  ['Start capacitor bleeder', 'A resistor clipped across a single-phase motor\'s start capacitor (often about 15,000 Ω, 2 W) drains its charge after it shuts off. Don\'t trust it: short the terminals through a resistor before you touch them.'],
  ['Motor windings', 'On an ohmmeter each winding reads low, a fraction of an ohm to a few ohms on a big motor, and all three should match. A megger reads winding to ground in millions of ohms (MΩ): low means water or broken insulation.'],
];

export function renderResistor(view) {
  const st = { ...FRESH, ...load('resistor', {}) };
  for (const k of ['b4', 'b5', 'rs']) if (!Array.isArray(st[k])) st[k] = FRESH[k];
  const bands = () => (st.count === 5 ? st.b5 : st.b4);

  // Color bands.
  const counts = [4, 5].map((n) => el('button.seg', { onclick: () => { st.count = n; st.pick = 0; drawBands(); } }, `${n} bands`));
  const art = el('div');
  const bandRow = el('div.bands');
  const palette = el('div.swatches', { role: 'group', 'aria-label': 'Band color' });
  const readOut = el('div.joint-result', { 'aria-live': 'polite' });
  const typed = el('input.measure', { id: 'r-ohms', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: 'like 4.7k', oninput: () => fromOhms() });
  const typedNote = el('p.note', { 'aria-live': 'polite' });

  function fromOhms() {
    const ohms = parseValue(typed.value);
    if (!typed.value.trim()) { typedNote.textContent = ''; return; }
    if (ohms == null) { typedNote.textContent = 'Type a plain number, like 470 or 4.7k.'; return; }
    let b = bandsFor(ohms, st.count - 2);
    let say = '';
    // The other kind of part may make it exactly: 4.75k needs five bands, 0.47 four.
    const other = st.count === 4 ? 5 : 4;
    if (!b.ok && bandsFor(ohms, other - 2).ok) {
      st.count = other; b = bandsFor(ohms, other - 2); say = `That takes a ${other}-band part. `;
    }
    if (!b.ok && ohms < 0.1) { typedNote.textContent = 'Under 0.1 Ω is too small for color bands: those parts have the ohms printed on them.'; return; }
    if (!b.ok && !b.bands) { typedNote.textContent = b.error; return; }
    if (!b.ok) say += `${b.error} The nearest it makes is ${ohmsText(b.near)}.`;
    const list = bands();
    b.bands.forEach((c, k) => { list[k] = c; });
    typedNote.textContent = say;
    drawBands({ keepTyped: true });
  }

  function drawBands({ keepTyped = false } = {}) {
    save('resistor', st);
    const b = bands();
    const roles = bandRoles(b.length);
    st.pick = Math.min(st.pick, b.length - 1);
    counts.forEach((x, k) => x.setAttribute('aria-pressed', String([4, 5][k] === st.count)));
    if (!keepTyped) { typed.value = ''; typedNote.textContent = ''; }
    const pick = (k) => { st.pick = k; drawBands(); };
    art.replaceChildren(bandArt(b, st.pick, pick));
    bandRow.style.setProperty('--n', b.length);
    bandRow.replaceChildren(...b.map((c, k) => el('button.band-btn', { 'aria-pressed': String(k === st.pick), onclick: () => pick(k) },
      el('span.swatch', { style: swatchStyle(c) }),
      el('span', `${k + 1}: ${ROLE_NAME[roles[k]]}`))));
    // Picking a color moves on to the next band, so a whole part is a tap per band.
    palette.replaceChildren(...choices(roles[st.pick]).map((c) =>
      el('button.swatch-btn', { 'aria-pressed': String(c.id === b[st.pick]), onclick: () => { b[st.pick] = c.id; st.pick = Math.min(st.pick + 1, b.length - 1); drawBands(); } },
        el('span.swatch', { style: swatchStyle(c.id) }), `${c.name} ${meaning(c, roles[st.pick])}`)));
    const r = readBands(b);
    readOut.replaceChildren(...(r.ok ? [
      el('div.big', ohmsText(r.ohms)),
      el('div.note', `±${r.tol}%: anything from ${ohmsText(r.low)} to ${ohmsText(r.high)} on a meter is good.`),
      r.ohms >= 1000 && el('div.note', `Same as ${formatNumber(r.ohms)} Ω.`),
    ] : [el('p.note', r.error)]));
  }

  // Chained or side by side.
  const hows = [['series', 'Chained (series)'], ['parallel', 'Side by side']].map(([k, label]) =>
    el('button.seg', { onclick: () => { st.how = k; drawCombo(); } }, label));
  const rlist = el('div.rlist');
  const volts = el('input.measure', { id: 'r-volts', inputmode: 'decimal', autocomplete: 'off', placeholder: 'blank if you don\'t know', oninput: () => { st.volts = volts.value; drawCombo({ typing: true }); } });
  const comboOut = el('div.cut-out', { 'aria-live': 'polite' });
  const comboArt = el('div');

  function rows() {
    return st.rs.map((t, k) => {
      const i = el('input.measure', { id: `r-r${k}`, inputmode: 'decimal', autocomplete: 'off', placeholder: 'ohms', oninput: () => { st.rs[k] = i.value; drawCombo({ typing: true }); } });
      i.value = t;
      const drop = el('button.small-btn', { 'aria-label': `Take out R${k + 1}`, disabled: st.rs.length <= 2, onclick: () => { st.rs.splice(k, 1); drawCombo(); } }, '×');
      return el('div.rrow', el('label.field', { for: `r-r${k}` }, el('span.field-label', `R${k + 1}`), i), drop);
    });
  }

  // typing: leave the boxes alone (never rewrite the box under your thumb).
  function drawCombo({ typing = false } = {}) {
    save('resistor', st);
    hows.forEach((x, k) => x.setAttribute('aria-pressed', String(['series', 'parallel'][k] === st.how)));
    if (!typing) {
      rlist.replaceChildren(...rows(), el('button.small-btn', { disabled: st.rs.length >= 6, onclick: () => { st.rs.push(''); drawCombo(); } }, 'Add one'));
      volts.value = st.volts;
    }
    const rs = st.rs.map((t) => parseValue(t));
    comboArt.replaceChildren(comboPic(st.how, rs));
    comboOut.replaceChildren(...combo(st.how, rs, parseValue(st.volts)));
  }

  // Watts.
  const wOhms = el('input.measure', { id: 'r-wohms', inputmode: 'decimal', autocomplete: 'off', placeholder: 'ohms', oninput: () => { st.wOhms = wOhms.value; drawWatts(); } });
  const bys = [['volts', 'Volts across it'], ['amps', 'Amps through it']].map(([k, label]) =>
    el('button.seg', { onclick: () => { st.wBy = k; drawWatts(); } }, label));
  const wVal = el('input.measure', { id: 'r-wval', inputmode: 'decimal', autocomplete: 'off', oninput: () => { st.wVal = wVal.value; drawWatts(); } });
  const wLabel = el('span.field-label');
  const wOut = el('div.cut-out', { 'aria-live': 'polite' });
  wOhms.value = st.wOhms;
  wVal.value = st.wVal;

  function drawWatts() {
    save('resistor', st);
    bys.forEach((x, k) => x.setAttribute('aria-pressed', String(['volts', 'amps'][k] === st.wBy)));
    wLabel.textContent = st.wBy === 'volts' ? 'Volts across it' : 'Amps through it';
    wOut.replaceChildren(...watts(parseValue(st.wOhms), st.wBy, parseValue(st.wVal)));
  }

  function example(x) {
    Object.assign(st, x, { rs: [...x.rs] });
    drawCombo();
  }

  const jump = (label, target) => el('button.chip', { onclick: () => target.scrollIntoView({ behavior: 'smooth' }) }, label);
  const hBands = el('h2', 'Color bands');
  const hCombo = el('h2', 'Chained and side by side');
  const hWatts = el('h2', 'Watts it can take');
  const hWhere = el('h2', 'Where you\'ll see them');

  view.append(el('section.resistor',
    electricNav('resistor'),
    el('h1', 'Resistors'),
    el('p.note', 'A resistor holds back flow on purpose: to limit amps or drop volts. Whatever it holds back it turns into heat.'),
    el('div.chips', jump('Color bands', hBands), jump('Chained, side by side', hCombo), jump('Watts', hWatts), jump('Where', hWhere)),
    el('p.engine-note', el('strong', 'Engine terms: '), 'A resistor is a carburetor jet: a fixed restriction that sets how much flows for the push behind it. ' +
      'And like brakes turning speed into heat, it turns the flow it stops into heat.'),

    hBands,
    el('div.segs.two-segs', { role: 'group', 'aria-label': '4 or 5 bands' }, counts),
    art,
    el('p.note', 'Hold it with the gold or silver band (or the one set apart) on the right, and read left to right. Tap a band, then its color.'),
    bandRow,
    palette,
    readOut,
    el('label.field', { for: 'r-ohms' }, el('span.field-label', 'Or type the ohms to see its bands'), typed),
    typedNote,
    el('ul.rules',
      el('li', 'Digits, 0 to 9: Black, Brown, Red, Orange, Yellow, Green, Blue, Violet, Grey, White. To remember the order: ',
        el('em', 'Better Be Right Or Your Great Big Venture Goes Wrong.')),
      el('li', 'The band after the digits says how many zeros to add: red is two (×100), orange three (×1,000). Gold shifts the point left one place (×0.1), silver two (×0.01).'),
      el('li', 'The last band is how close it\'s made: gold ±5%, silver ±10%, brown ±1%. No last band: ±20%.'),
    ),

    hCombo,
    el('div.segs.two-segs', { role: 'group', 'aria-label': 'Chained or side by side' }, hows),
    comboArt,
    rlist,
    el('label.field', { for: 'r-volts' }, el('span.field-label', 'Supply volts across the lot'), volts),
    comboOut,
    el('p', 'Think of hoses. ', el('strong', 'Chained'), ', end to end: every length adds drag, so the ohms add up. ',
      el('strong', 'Side by side'), ': more paths, so less drag than even the easiest path alone. Two the same side by side make half.'),
    el('p', 'A dual-voltage motor does exactly this. Each winding wants 230 V. On 460 V its windings are chained, so each gets half; on 230 V they go side by side, so each gets the full 230 and the motor pulls twice the amps. That is why the plate\'s amps for 230 V are double those for 460 V. ' +
      'On a meter, lead to lead, it reads four times the ohms wired for 460 as wired for 230. Leave the volts blank for a motor: running, it pulls far fewer amps than its few ohms suggest.'),
    el('div.ohm-examples', EXAMPLES.map(([label, x]) => el('button.small-btn', { onclick: () => example(x) }, label))),

    hWatts,
    el('p.note', 'A resistor turns what it holds back into heat. Too small a part for the heat and it browns, cracks and fails, often open.'),
    el('label.field', { for: 'r-wohms' }, el('span.field-label', 'Ohms'), wOhms),
    el('div.segs.two-segs', { role: 'group', 'aria-label': 'What you know' }, bys),
    el('label.field', { for: 'r-wval' }, wLabel, wVal),
    wOut,
    el('h2.small', 'How big is it?'),
    el('p.note', 'Small resistors have no watts printed on them; their size tells you. About, for the common tan (carbon film) kind; blue metal-film ones run smaller for their watts.'),
    el('div.read-table', BODY.map(([w, long]) => el('div.read-row', el('span', ...pretty(`About ${long} long`)), el('strong', ...pretty(`${w} W`))))),
    el('p.note', 'From 3 W up they are bigger (often white ceramic blocks) and have the ohms and watts printed on them.'),

    hWhere,
    el('div.parts', WHERE.map(([name, says]) => el('div.part-card', el('div.part-name', name), el('p.part-does', says)))),
  ));
  drawBands();
  drawCombo();
  drawWatts();
}

function swatchStyle(id) {
  const c = COLOR[id];
  return c && c.hex ? `background:${c.hex}` : 'background:transparent;border-style:dashed';
}

// The part, drawn: leads, a tan body and its bands. Tapping a band picks it.
function bandArt(bands, pick, onPick) {
  const svg = s('svg', { viewBox: '0 0 340 80', class: 'pipe rd-art', role: 'img', 'aria-label': `Resistor with bands ${bands.map((b) => COLOR[b].name).join(', ')}` });
  svg.append(s('line', { x1: 10, y1: 40, x2: 330, y2: 40, class: 'lead' }));
  svg.append(s('rect', { x: 78, y: 16, width: 184, height: 48, rx: 18, class: 'body' }));
  const xs = bands.length === 5 ? [100, 124, 148, 172, 226] : [106, 134, 162, 222];
  bands.forEach((id, k) => {
    const c = COLOR[id];
    const g = s('g', { class: k === pick ? 'band on' : 'band' });
    if (c.hex) g.append(s('rect', { x: xs[k] - 7, y: 16, width: 14, height: 48, fill: c.hex }));
    else g.append(s('rect', { x: xs[k] - 7, y: 16, width: 14, height: 48, class: 'band-none' }));
    g.append(s('rect', { x: xs[k] - 12, y: 0, width: 24, height: 80, class: 'hit' }));
    g.addEventListener('click', () => onPick(k));
    svg.append(g);
  });
  svg.append(s('path', { d: `M${xs[pick]} 76 l-6 -6 h12 Z`, class: 'tri live' }));
  return svg;
}

// Up to six zigzags, in a chain or stacked between two rails.
const ZIG = 'h6 l3 -7 l6 14 l6 -14 l6 14 l6 -14 l3 7 h6'; // one resistor, 42 long
function comboPic(how, rs) {
  const n = rs.length;
  const label = (k) => (rs[k] > 0 ? ohmsText(rs[k]) : `R${k + 1}`);
  if (how === 'series') {
    const svg = s('svg', { viewBox: '0 0 340 64', class: 'pipe rd-art', role: 'img', 'aria-label': 'Resistors chained end to end' });
    const step = 320 / n;
    let d = 'M10 26';
    for (let k = 0; k < n; k++) {
      const x = 10 + step * k + (step - 42) / 2;
      d += ` H${x} ${ZIG}`;
      svg.append(s('text', { x: x + 21, y: 56, class: 'lbl', 'text-anchor': 'middle' }, label(k)));
    }
    svg.append(s('path', { d: `${d} H330`, class: 'wire' }));
    return svg;
  }
  const h = 20 + n * 34;
  const svg = s('svg', { viewBox: `0 0 340 ${h}`, class: 'pipe rd-art', role: 'img', 'aria-label': 'Resistors side by side between two wires' });
  svg.append(s('path', { d: `M10 ${h / 2} H60 M60 27 V${h - 27} M280 27 V${h - 27} M280 ${h / 2} H330`, class: 'wire' }));
  for (let k = 0; k < n; k++) {
    const y = 27 + k * 34;
    svg.append(s('path', { d: `M60 ${y} H110 ${ZIG} H280`, class: 'wire' }));
    svg.append(s('text', { x: 215, y: y - 6, class: 'lbl', 'text-anchor': 'middle' }, label(k)));
  }
  return svg;
}

function combo(how, rs, volts) {
  if (rs.some((r) => !(r > 0))) return [el('p.note', 'Type the ohms of each one. 4.7k is 4,700.')];
  const r = share(rs, how, volts > 0 ? volts : 1);
  const work = how === 'series' ? rs.map(formatNumber).join(' + ') : `1 ÷ (${rs.map((x) => `1 ÷ ${formatNumber(x)}`).join(' + ')})`;
  const out = [
    el('div.joint-result',
      el('div.note', `${how === 'series' ? 'Chained, the ohms add' : 'Side by side'}: ${work} =`),
      el('div.big', ohmsText(r.total))),
  ];
  if (how === 'parallel') out.push(el('p.note', `Under the smallest one (${ohmsText(Math.min(...rs))}), as it always is side by side.`));
  if (!(volts > 0)) return out;
  out.push(el('p', how === 'series'
    ? `${ampsText(r.amps)} flows through every one. The volts split by ohms: the biggest resistor takes the biggest share.`
    : `Each gets the full ${formatNumber(volts)} V and its own amps; ${ampsText(r.amps)} in all.`));
  out.push(el('div.read-table', r.each.map((e, k) => el('div.read-row',
    el('span', `R${k + 1}, ${ohmsText(e.ohms)}`),
    el('strong', `${formatNumber(e.volts)} V · ${ampsText(e.amps)} · ${formatNumber(e.watts)} W`)))));
  return out;
}

function watts(ohms, by, val) {
  if (!(ohms > 0) || !(val > 0)) return [el('p.note', `Type the ohms and the ${by === 'volts' ? 'volts across it' : 'amps through it'}.`)];
  const w = heat(ohms, by === 'volts' ? { volts: val } : { amps: val });
  const size = wattSize(w);
  return [
    el('div.joint-result',
      el('div.note', by === 'volts' ? `Volts × volts ÷ ohms: ${formatNumber(val)} × ${formatNumber(val)} ÷ ${formatNumber(ohms)} =` : `Amps × amps × ohms: ${formatNumber(val)} × ${formatNumber(val)} × ${formatNumber(ohms)} =`),
      el('div.big', `${formatNumber(w)} W`)),
    size
      ? el('p', 'Use a ', el('strong', ...pretty(`${size[0]} W`)), ' or bigger. Give it double what it makes: at its full rating a resistor runs too hot to touch.')
      : el('p', 'More than 50 W of heat: that is a heater, not a resistor you\'d buy. Use a heater element rated for it.'),
  ];
}
