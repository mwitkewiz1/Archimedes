// adjust.js (screen) — Adjust a pressure reducing valve: turn the pilot
// screw and the two speed needles, run a minute with a big draw in the
// middle, and read the pressure trace for hunting, sag, overshoot and hammer.

import { el } from './el.js';
import { load, save } from './store.js';
import { valvesNav } from './subnav.js';
import { simulate, judge, sayAdjust, SECONDS } from '../core/adjust.js';
import { mainValve } from './valveart.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

// The trace: inlet and outlet pressure over the minute, the setting dashed,
// the big draw shaded, the valve's opening as a strip along the bottom.
const W = 340, H = 250, L = 34, R = 8, T = 10, B = 196;
const PMAX = 160;
const X = (t) => L + (t / SECONDS) * (W - L - R);
const Y = (p) => B - (Math.min(p, PMAX) / PMAX) * (B - T);

function trace(run, set, upTo = SECONDS) {
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pipe adjust-trace', role: 'img', 'aria-label': 'Pressure over one minute' });
  svg.append(sv('rect', { x: X(12), y: T, width: X(37) - X(12), height: B - T, class: 'at-draw' }));
  svg.append(sv('text', { x: (X(12) + X(37)) / 2, y: T + 12, class: 'at-note', 'text-anchor': 'middle' }, 'big draw'));
  for (const p of [0, 40, 80, 120, 160]) {
    svg.append(sv('line', { x1: L, y1: Y(p), x2: W - R, y2: Y(p), class: 'at-grid' }));
    svg.append(sv('text', { x: L - 4, y: Y(p) + 4, class: 'at-axis', 'text-anchor': 'end' }, String(p)));
  }
  for (const t of [0, 15, 30, 45, 60]) svg.append(sv('text', { x: X(t), y: B + 14, class: 'at-axis', 'text-anchor': 'middle' }, `${t}s`));
  svg.append(sv('line', { x1: L, y1: Y(set), x2: W - R, y2: Y(set), class: 'at-set' }));
  const shown = run.filter((r) => r.t <= upTo);
  const line = (key) => shown.map((r, i) => `${i ? 'L' : 'M'}${X(r.t).toFixed(1)} ${Y(r[key]).toFixed(1)}`).join(' ');
  svg.append(sv('path', { d: line('p1'), class: 'at-in' }));
  svg.append(sv('path', { d: line('p2'), class: 'at-out' }));
  // Opening strip: taller is more open.
  svg.append(sv('path', { d: shown.map((r, i) => `${i ? 'L' : 'M'}${X(r.t).toFixed(1)} ${(H - 4 - r.x * 18).toFixed(1)}`).join(' '), class: 'at-open' }));
  svg.append(sv('text', { x: L - 4, y: H - 6, class: 'at-axis', 'text-anchor': 'end' }, 'open'));
  if (upTo < SECONDS) svg.append(sv('line', { x1: X(upTo), y1: T, x2: X(upTo), y2: H, class: 'at-cursor' }));
  return svg;
}

export function renderAdjust(view) {
  const st = { set: 60, open: 3, close: 3, ...load('adjust', {}) };
  let raf = 0;

  const setOut = el('div.big-mid');
  const screw = el('div.segs.two-segs',
    el('button.seg', { onclick: () => bump(-2) }, 'Screw out: lower'),
    el('button.seg', { onclick: () => bump(2) }, 'Screw in: raise'));
  function bump(d) { st.set = Math.max(40, Math.min(90, st.set + d)); show(); }
  const needle = (key) => el('div.segs.five-segs', { role: 'group' }, [1, 2, 3, 4, 5].map((n) =>
    el('button.seg', { dataset: { n }, onclick: () => { st[key] = n; show(); } }, n === 1 ? 'Slow' : n === 5 ? 'Fast' : String(n))));
  const openN = needle('open'), closeN = needle('close');
  const chart = el('div');
  const pic = el('div.valve-pic.small-pic');
  const verdicts = el('div.verdicts', { 'aria-live': 'polite' });
  const play = el('button.small-btn', { onclick: () => run() }, 'Watch it run');

  function show() {
    save('adjust', st);
    cancelAnimationFrame(raf);
    setOut.textContent = `${st.set} psi`;
    for (const [g, key] of [[openN, 'open'], [closeN, 'close']]) [...g.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === st[key])));
    const r = simulate(st);
    chart.replaceChildren(trace(r, st.set));
    pic.replaceChildren(mainValve({ open: r[0].x, pilot: r[0].x, inlet: r[0].p1, outlet: r[0].p2 }));
    verdicts.replaceChildren(...sayAdjust(judge(r, st.set), st.set).map(([kind, name, says]) =>
      el('div.part-card', el('span.zone-chip', { class: `zone-chip ${kind === 'ok' ? 'sweet' : 'left'}` }, name), el('p.part-does', says))));
  }

  // Replay the minute in about 15 seconds, the valve moving with the trace.
  function run() {
    const r = simulate(st);
    const start = performance.now();
    const frame = (now) => {
      if (!chart.isConnected) return;
      const t = Math.min(SECONDS, ((now - start) / 1000) * 4);
      const row = r[Math.min(r.length - 1, Math.round(t / (r[1].t - r[0].t)))];
      chart.replaceChildren(trace(r, st.set, t));
      pic.replaceChildren(mainValve({ open: row.x, pilot: row.x, inlet: row.p1, outlet: row.p2 }));
      if (t < SECONDS) raf = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  view.append(el('section.adjust',
    valvesNav('adjust'),
    el('h1', 'Adjust a pressure reducer'),
    el('p.note', 'A pressure reducing valve feeding a building from a 120 psi street. Over a minute, the taps open wide, then shut. Set the screw and the two needles; the trace shows what the downstream gauge would do.'),
    el('div.field', el('span.field-label', 'Pilot screw: the downstream setting'), setOut, screw),
    el('div.field', el('span.field-label', 'Opening speed needle'), openN),
    el('div.field', el('span.field-label', 'Closing speed needle'), closeN),
    chart,
    el('p.note.legend', el('span.lg.lg-out', 'Downstream'), ' ', el('span.lg.lg-in', 'Upstream (street)'), ' ', el('span.lg.lg-set', 'Setting')),
    verdicts,
    play,
    pic,
    el('h2', 'On a real one'),
    el('ol.steps',
      el('li.step', el('span.step-text', 'Gauges on both sides first. Some water must be flowing downstream, or the pilot has nothing to work on.')),
      el('li.step', el('span.step-text', 'Set the pressure with the pilot screw, a quarter turn at a time. Clockwise (in) raises it. Wait for the gauge to settle after each turn.')),
      el('li.step', el('span.step-text', 'If it hunts (the gauge needle swings and the valve thumps), slow the opening speed: turn its needle clockwise a little.')),
      el('li.step', el('span.step-text', 'If it sags on a big draw, open the opening speed a little; if it creeps high when the draw stops, open the closing speed a little.')),
      el('li.step', el('span.step-text', 'Change one thing at a time, and write down where each was: count turns from fully in.')),
    ),
    el('p.note', 'This is a toy with the right shape, not a valve maker\'s numbers. On a real valve the drop across it, its size and the pipe all change where the sweet spot is: a valve dropping a lot of pressure, or set low, is twitchier.'),
  ));
  show();
}
