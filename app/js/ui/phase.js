// phase.js (screen) — the Electric tab's Phases tool: single against three
// phase, animated (waves, the field in the motor, the power it gets), with
// two legs swapped or one lost; what each service reads on a meter; and the
// imbalance of three readings.

import { el } from './el.js';
import { load, save } from './store.js';
import { electricNav } from './subnav.js';
import { legs, field, power, SERVICES, imbalance, derate, verdict } from '../core/phase.js';
import { parseValue, formatNumber } from '../core/ohm.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

const SPEED = 0.4; // wave turns a second: slow enough to follow
const X0 = 30, X1 = 200, MID = 70, AMP = 42, CX = 272, CY = 70, R = 50;

// The picture: waves on the left, the motor seen end on at the right, power under both.
function picture() {
  const svg = s('svg', { viewBox: '0 0 340 196', class: 'pipe phase-art', role: 'img',
    'aria-label': 'Volts on each leg over time, the magnetic field inside a motor, and the power delivered' });
  svg.append(s('line', { x1: X0, x2: X1, y1: MID, y2: MID, class: 'ph-axis' }));
  svg.append(s('text', { x: X0 - 4, y: MID - AMP + 4, class: 'ph-tick', 'text-anchor': 'end' }, '+'));
  svg.append(s('text', { x: X0 - 4, y: MID + AMP + 4, class: 'ph-tick', 'text-anchor': 'end' }, '−'));
  svg.append(s('text', { x: (X0 + X1) / 2, y: 132, class: 'ph-tick', 'text-anchor': 'middle' }, 'volts on each leg, over time'));
  const waves = [0, 1, 2].map((k) => s('path', { class: `ph-wave ph-l${k + 1}` }));
  const names = [0, 1, 2].map((k) => s('text', { x: X1 + 4, class: `ph-name ph-t${k + 1}` }, `L${k + 1}`));
  svg.append(...waves, ...names);

  // The motor: stator ring, a coil for each leg a third of the way round, the field arrow, the rotor.
  svg.append(s('circle', { cx: CX, cy: CY, r: R, class: 'ph-stator' }));
  const coils = [0, 1, 2].map((k) => {
    const a = (k * 2 * Math.PI) / 3;
    const x = CX + Math.cos(a) * (R + 10), y = CY + Math.sin(a) * (R + 10);
    svg.append(s('text', { x, y: y + 4, class: `ph-name ph-t${k + 1}`, 'text-anchor': 'middle' }, `L${k + 1}`));
    const c = s('rect', { x: CX + Math.cos(a) * (R - 6) - 6, y: CY + Math.sin(a) * (R - 6) - 6, width: 12, height: 12, rx: 2, class: `ph-coil ph-c${k + 1}` });
    svg.append(c);
    return c;
  });
  const rotor = s('g', {});
  rotor.append(s('circle', { cx: 0, cy: 0, r: 18, class: 'ph-rotor' }), s('line', { x1: 0, y1: 0, x2: 18, y2: 0, class: 'ph-mark' }));
  const arrow = s('line', { x1: CX, y1: CY, class: 'ph-field' });
  svg.append(rotor, arrow);

  // Power bar.
  svg.append(s('text', { x: X0, y: 158, class: 'ph-tick' }, 'power to the load'));
  svg.append(s('rect', { x: X0, y: 164, width: 300, height: 18, rx: 4, class: 'ph-track' }));
  const bar = s('rect', { x: X0, y: 164, height: 18, rx: 4, class: 'ph-power' });
  svg.append(bar, s('line', { x1: X0 + 150, x2: X0 + 150, y1: 160, y2: 186, class: 'ph-avg' }));

  let rotorAngle = 0;
  function update(st, t, dt) {
    const n = st.mode === 'one' ? 1 : 3;
    for (let k = 0; k < 3; k++) {
      waves[k].style.display = names[k].style.display = k < n ? '' : 'none';
      coils[k].style.display = st.mode === 'one' && k ? 'none' : '';
    }
    // The last cycle and a half, newest at the right.
    const pts = [[], [], []];
    for (let i = 0; i <= 60; i++) {
      const tt = t - 1.5 + (1.5 * i) / 60;
      legs(st.mode, tt, st).forEach((v, k) => pts[k].push(`${(X0 + ((X1 - X0) * i) / 60).toFixed(1)} ${(MID - v * AMP).toFixed(1)}`));
    }
    const now = legs(st.mode, t, st);
    for (let k = 0; k < n; k++) {
      waves[k].setAttribute('d', `M${pts[k].join(' L')}`);
      names[k].setAttribute('y', MID - now[k] * AMP + 4);
      coils[k].style.opacity = String(0.25 + 0.75 * Math.abs(now[k]));
    }
    const f = field(st.mode, t, st);
    arrow.setAttribute('x2', CX + f.x * 22);
    arrow.setAttribute('y2', CY + f.y * 22);
    // The rotor follows a turning field a little behind; a flapping field can't start it.
    const turns = st.mode === 'three' && !st.lost;
    if (turns) rotorAngle += (st.swap ? -1 : 1) * 360 * SPEED * 0.9 * dt;
    rotor.setAttribute('transform', `translate(${CX} ${CY}) rotate(${rotorAngle})`);
    bar.setAttribute('width', Math.max(0, Math.min(300, power(st.mode, t, st) * 150)));
  }
  return { svg, update };
}

const STATUS = {
  one: 'Single phase: one wave. Twice every cycle it passes zero and the load gets nothing, so the power comes in pulses. The field in the motor only flaps back and forth; it can\'t start a motor turning by itself, so single-phase motors carry a start winding and capacitor to give it the first shove.',
  three: 'Three phase: three waves, each a third of a cycle behind the last. When one is passing zero the others are pushing, so the power never drops. The field turns round the motor by itself and drags the rotor with it: no start winding needed.',
  swap: 'L1 and L2 swapped: the waves now peak in the order L2, L1, L3, so the field turns the other way and so does the motor. Swapping any two legs does it.',
  lost: 'L3 lost (a blown fuse, a burnt contact): only L1 and L2 are left, which is single phase. The field flaps instead of turning. A stopped motor won\'t start, it just hums. A running one keeps turning but pulls about 1.7 times the amps on the two good legs and cooks unless the overloads trip.',
};

export function renderPhase(view) {
  const st = { mode: 'three', swap: false, lost: false, service: '480y', kind: 'volts', r: ['', '', ''], ...load('phase', {}) };
  if (!Array.isArray(st.r) || st.r.length !== 3) st.r = ['', '', ''];
  const art = picture();
  const status = el('p.lift-now', { 'aria-live': 'polite' });
  const modes = [['one', 'Single phase'], ['three', 'Three phase']].map(([k, label]) =>
    el('button.seg', { onclick: () => { st.mode = k; draw(); } }, label));
  const swapBtn = el('button.chip', { onclick: () => { st.swap = !st.swap; draw(); } }, 'Swap L1 and L2');
  const lostBtn = el('button.chip', { onclick: () => { st.lost = !st.lost; draw(); } }, 'Lose L3 (blown fuse)');

  // Expected readings for a service.
  const svc = el('select', { id: 'p-svc', onchange: () => { st.service = svc.value; draw(); } },
    SERVICES.map((x) => el('option', { value: x.id, selected: x.id === st.service }, x.name)));
  const readings = el('div');

  // Imbalance from three readings.
  const kinds = [['volts', 'Volts'], ['amps', 'Amps']].map(([k, label]) =>
    el('button.seg', { onclick: () => { st.kind = k; draw(); } }, label));
  const labels = [el('span.field-label'), el('span.field-label'), el('span.field-label')];
  const inputs = [0, 1, 2].map((k) => {
    const i = el('input.measure', { id: `p-r${k}`, inputmode: 'decimal', autocomplete: 'off', oninput: () => { st.r[k] = i.value; draw(); } });
    i.value = st.r[k];
    return i;
  });
  const imb = el('div.cut-out', { 'aria-live': 'polite' });

  function draw() {
    save('phase', st);
    modes.forEach((b, k) => b.setAttribute('aria-pressed', String(['one', 'three'][k] === st.mode)));
    swapBtn.setAttribute('aria-pressed', String(st.swap));
    lostBtn.setAttribute('aria-pressed', String(st.lost));
    swapBtn.disabled = lostBtn.disabled = st.mode === 'one';
    status.textContent = st.mode === 'one' ? STATUS.one : st.lost ? STATUS.lost : st.swap ? STATUS.swap : STATUS.three;

    const x = SERVICES.find((v) => v.id === st.service) || SERVICES[0];
    readings.replaceChildren(
      el('div.read-table', x.readings.map(([where, v]) => el('div.read-row', el('span', where), el('strong', typeof v === 'number' ? `${v} V` : v)))),
      el('p', x.says),
      el('p.note', `${x.where} Readings within about 5% of these are normal.`));

    kinds.forEach((b, k) => b.setAttribute('aria-pressed', String(['volts', 'amps'][k] === st.kind)));
    (st.kind === 'volts' ? ['L1 to L2', 'L2 to L3', 'L1 to L3'] : ['L1 amps', 'L2 amps', 'L3 amps']).forEach((t, k) => { labels[k].textContent = t; });
    const v = st.r.map((t) => parseValue(t));
    imb.replaceChildren(...imbalanceResult(v, st.kind));
  }

  let last = null, t = 0;
  function frame(now) {
    if (!view.contains(art.svg)) return; // left the screen
    // Reduced motion: hold one still frame (a moment where all three legs show).
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt = last == null || still ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    t = t ? t + dt * SPEED : 0.2;
    art.update(st, t, dt);
    requestAnimationFrame(frame);
  }

  view.append(el('section.phase',
    electricNav('phase'),
    el('h1', 'Phases'),
    el('p.note', 'A phase is one wave of alternating volts. Houses get one; big motors get three, each a third of a cycle behind the last.'),
    art.svg,
    el('div.segs.two-segs', { role: 'group', 'aria-label': 'Single or three phase' }, modes),
    el('div.chips', swapBtn, lostBtn),
    status,
    el('p.engine-note', el('strong', 'Engine terms: '), 'Single phase is a one-cylinder engine: one power stroke, then coasting, so it shakes and needs help to start. ' +
      'Three phase is a three-cylinder with the strokes evenly spaced: one is always pushing, so it runs smooth and starts itself. That is why big pumps run on three phase.'),
    el('h2', 'Rotation'),
    el('p', 'A three-phase motor turns whichever way the field turns, and that is set by the order the legs reach it. Swap any two legs (at the starter or the plug) and it runs backwards.'),
    el('ul.rules',
      el('li', 'A centrifugal pump running backwards still pumps, but weakly: low pressure, low flow, and some impellers unscrew themselves. It is easy to miss.'),
      el('li', 'Check it: bump the motor (on and straight off) and watch the shaft against the arrow on the pump casing.'),
      el('li', 'A sealed submersible: a phase rotation meter on the leads before you hook up, or run it both ways for a moment against a gauge. The right way makes more pressure. It also jerks against its rotation when it starts.'),
      el('li', 'A generator or a new service can come in with a different order. Check rotation every time the power source changes.'),
    ),
    el('h2', 'Losing a phase'),
    el('p', 'A blown fuse, a burnt starter contact or a loose lug drops one leg. The motor is then on single phase (single-phasing). Tap "Lose L3" above to see it.'),
    el('ul.rules',
      el('li', 'Stopped: it won\'t start, it hums. Running: it keeps going, slower and hot, pulling more amps on the two good legs.'),
      el('li', 'On the meter: one leg-to-leg reading normal, the two that include the dead leg low or odd, and one leg with no amps on a clamp meter.'),
      el('li', 'Overloads should trip it. If they keep tripping, check every fuse and the starter contacts before you reset again.'),
    ),
    el('h2', 'What should it read?'),
    el('label.field', { for: 'p-svc' }, el('span.field-label', 'Service'), svc),
    readings,
    el('h2', 'Imbalance'),
    el('p.note', 'Three legs should read nearly the same. Type three readings; a little imbalance in volts makes a lot more in amps and heats the motor.'),
    el('div.segs.two-segs', { role: 'group', 'aria-label': 'Volts or amps' }, kinds),
    el('div.three-in', inputs.map((i, k) => el('label.field', { for: `p-r${k}` }, labels[k], i))),
    imb,
  ));
  draw();
  requestAnimationFrame(frame);
}

function imbalanceResult(v, kind) {
  if (v.some((x) => !(x > 0))) return [el('p.note', kind === 'volts' ? 'Type all three leg-to-leg volts.' : 'Type the amps on all three legs (clamp meter, motor running).')];
  const r = imbalance(...v);
  const pct = r.pct;
  const say = verdict(pct, kind);
  const word = { ok: 'Fine', watch: 'Keep an eye on it', bad: kind === 'volts' ? 'Find the cause' : 'Too much' }[say];
  const out = [
    el('div.joint-result',
      el('div.note', `Average ${formatNumber(Math.round(r.avg * 10) / 10)} ${kind === 'volts' ? 'V' : 'A'}; furthest leg off by ${formatNumber(Math.round(r.dev * 10) / 10)}`),
      el('div.big', `${pct.toFixed(1)}%`),
      el('span', { class: `zone-chip ${say === 'ok' ? 'sweet' : say === 'watch' ? 'watch' : 'left'}` }, word)),
  ];
  if (kind === 'volts') {
    const d = derate(pct);
    out.push(el('p', d == null ? 'Over 5%: don\'t run the motor on this. Get the supply looked at.'
      : d === 1 ? 'Under 1% needs nothing. The motor may carry its full rating.'
      : `The motor may only carry about ${Math.round(d * 100)}% of its rating on this (NEMA derating). Over 2%, look for the cause: a bad connection, a single-phase load hogging one leg, or a weak transformer.`));
  } else {
    out.push(el('p', 'Motor makers want under about 5%. To tell the supply from the motor, roll the leads: move each motor lead one place over (L1 to L2, L2 to L3, L3 to L1, keeping rotation), measure again, and once more. ' +
      'If the high reading stays on the same supply leg, the supply is off; if it follows the same motor lead, the motor or its cable is.'));
  }
  return out;
}
