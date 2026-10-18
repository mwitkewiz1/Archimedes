// curve.js — the pump curve picture: flow across, head up. Draws the pump's
// curve, the pipe's curve, the good-running band around BEP, BEP itself, and
// the duty point where pump and pipe meet.

import { pumpHead, maxFlow, bep, systemHead, efficiency } from '../core/pump.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340, H = 250, L = 44, R = 12, T = 14, B = 40; // plot box margins

function s(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// A round step for axis ticks: 1, 2 or 5 times a power of ten, about 4-5 ticks.
function step(max) {
  const raw = max / 4.5;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw);
}

export function drawCurve(pump, sys, speed, duty) {
  const qMax = maxFlow(pump, 1) * 1.04;
  const hMax = pump.shutoff * 1.12;
  const x = (q) => L + (q / qMax) * (W - L - R);
  const y = (h) => H - B - (Math.max(0, h) / hMax) * (H - T - B);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pipe curve', role: 'img',
    'aria-label': duty.zone === 'deadhead' ? 'Pump curve: the pipe needs more head than the pump makes'
      : `Pump curve: runs at ${Math.round(duty.flow)} gallons a minute against ${Math.round(duty.head)} feet` });
  svg.append(s('defs', {}));

  // The good-running band: 70-120% of BEP flow, best 80-110%.
  const b = bep(pump, speed);
  const band = (a, z, cls) => svg.append(s('rect', { x: x(a * b.flow), y: T, width: x(z * b.flow) - x(a * b.flow), height: H - T - B, class: cls }));
  band(0.7, 1.2, 'band-ok');
  band(0.8, 1.1, 'band-best');

  // Grid and axes.
  const qs = step(qMax), hs = step(hMax);
  for (let q = 0; q <= qMax; q += qs) {
    svg.append(s('line', { x1: x(q), y1: T, x2: x(q), y2: H - B, class: 'grid' }));
    svg.append(s('text', { x: x(q), y: H - B + 15, class: 'tick', 'text-anchor': 'middle' }, String(q)));
  }
  for (let h = 0; h <= hMax; h += hs) {
    svg.append(s('line', { x1: L, y1: y(h), x2: W - R, y2: y(h), class: 'grid' }));
    svg.append(s('text', { x: L - 6, y: y(h) + 4, class: 'tick', 'text-anchor': 'end' }, String(h)));
  }
  svg.append(s('text', { x: (L + W - R) / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, 'Flow, gallons a minute'));
  svg.append(s('text', { x: 12, y: (T + H - B) / 2, class: 'axis', 'text-anchor': 'middle', transform: `rotate(-90 12 ${(T + H - B) / 2})` }, 'Head, feet'));

  // Curves: sample along flow.
  const path = (fn, top) => {
    let d = '';
    const end = top ?? qMax;
    for (let i = 0; i <= 80; i++) {
      const q = (end * i) / 80;
      const h = fn(q);
      if (h > hMax * 1.2) break;
      d += `${i ? 'L' : 'M'}${x(q).toFixed(1)} ${y(h).toFixed(1)} `;
    }
    return d;
  };
  svg.append(s('path', { d: path((q) => efficiency(pump, q, speed) * hMax, maxFlow(pump, speed)), class: 'eff' }));
  svg.append(s('path', { d: path((q) => systemHead(q, sys)), class: 'sys' }));
  svg.append(s('path', { d: path((q) => pumpHead(pump, q, speed), maxFlow(pump, speed)), class: 'pump' }));

  // BEP: a diamond on the pump curve.
  svg.append(s('path', { d: `M${x(b.flow)} ${y(b.head) - 7} l7 7 l-7 7 l-7 -7 Z`, class: 'bep' }));
  svg.append(s('text', { x: x(b.flow), y: y(b.head) - 11, class: 'lbl', 'text-anchor': 'middle' }, 'BEP'));

  // Duty point with lines down and across to the axes.
  if (duty.zone !== 'deadhead') {
    svg.append(s('line', { x1: x(duty.flow), y1: y(duty.head), x2: x(duty.flow), y2: H - B, class: 'duty-line' }));
    svg.append(s('line', { x1: L, y1: y(duty.head), x2: x(duty.flow), y2: y(duty.head), class: 'duty-line' }));
    svg.append(s('circle', { cx: x(duty.flow), cy: y(duty.head), r: 7, class: `duty ${duty.zone}` }));
  }

  return svg;
}
