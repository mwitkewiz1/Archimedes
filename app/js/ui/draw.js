// draw.js — the pipe picture on the Cut & fuse screen: what you keep, what
// fusing eats, where the saw runs, what's scrap, and where to mark.
// Thin slices (a 3/32" kerf on a 5' pipe) are drawn wider than true so you
// can see them; the picture says "not to scale" when that happens.

import { toNumber, formatInches } from '../core/measure.js';
import { el } from './el.js';
import { pretty } from './frac.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340, PIPE_Y = 70, PIPE_H = 34, H = 214, LANE = 21;
const MIN = { kerf: 7, fuse: 9, scrap: 22, keep: 60 };
const NAMES = { keep: 'Keep', fuse: 'Fusing eats', kerf: 'Saw blade', scrap: 'Scrap' };

function svg(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// Text whose baseline sits at y, with fractions stacked like the rest of the
// app: HTML inside the drawing, since SVG text can't stack them.
function richText(x, y, anchor, text, cls) {
  const w = 220, h = 30;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const fo = svg('foreignObject', { x: left, y: y - h + 4, width: w, height: h });
  fo.append(el(`div.fo-text.${cls.split(' ').join('.')}`,
    { style: `justify-content: ${anchor === 'middle' ? 'center' : anchor === 'end' ? 'flex-end' : 'flex-start'}` },
    el('span', pretty(text))));
  return fo;
}

function dimText(x1, x2, y, text) {
  const mid = (x1 + x2) / 2;
  const half = text.length * 4.5; // about half the width of 14px bold digits
  if (mid - half < 2) return richText(x1, y - 5, 'start', text, 'dim-text');
  if (mid + half > W - 2) return richText(x2, y - 5, 'end', text, 'dim-text');
  return richText(mid, y - 5, 'middle', text, 'dim-text');
}

// parts: [{kind, len}] left to right (len null = "the run goes on").
// marks: boundary indexes where a pencil mark goes (boundary i = left edge of part i).
// dims: [{a, b, text}] dimension lines between boundaries.
export function drawPipe({ parts, marks = [], dims = [], openEnds = false }) {
  const total = parts.reduce((s, p) => s + (p.len ? toNumber(p.len) : 0), 0) || 1;
  const usable = W - 20;
  // Pipe that runs on past the picture (len null) gets what the measured
  // slices leave over, so the measured part sits in the middle at a readable size.
  const openCount = parts.filter((p) => !p.len).length;
  const measuredRoom = openCount ? usable * 0.5 : usable;
  let widths = parts.map((p) => (p.len ? (toNumber(p.len) / total) * measuredRoom : 0));
  let scaled = false;
  widths = widths.map((w, i) => {
    if (!parts[i].len) return 0;
    const min = MIN[parts[i].kind];
    if (w < min) { scaled = true; return min; }
    return w;
  });
  if (openCount) {
    const left = Math.max(MIN.keep * openCount, usable - widths.reduce((a, b) => a + b, 0));
    widths = widths.map((w, i) => (parts[i].len ? w : left / openCount));
  }
  const sum = widths.reduce((a, b) => a + b, 0);
  // Squeeze the keep pieces so the whole pipe still fits.
  const keepIdx = widths.map((w, i) => (parts[i].kind === 'keep' ? i : -1)).filter((i) => i >= 0);
  const over = sum - usable;
  if (over > 0 && keepIdx.length) {
    const keepSum = keepIdx.reduce((s, i) => s + widths[i], 0);
    for (const i of keepIdx) widths[i] = Math.max(MIN.keep, widths[i] - over * (widths[i] / keepSum));
  }
  const xs = [10];
  for (const w of widths) xs.push(xs[xs.length - 1] + w);

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pipe', role: 'img', 'aria-label': 'Pipe drawing' });
  const defs = svg('defs', {});
  const hatch = svg('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  hatch.append(svg('rect', { width: 6, height: 6, class: 'scrap-bg' }), svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, class: 'scrap-line' }));
  defs.append(hatch);
  root.append(defs);

  parts.forEach((p, i) => {
    root.append(svg('rect', { x: xs[i], y: PIPE_Y, width: widths[i], height: PIPE_H, class: `part ${p.kind}`, fill: p.kind === 'scrap' ? 'url(#hatch)' : null }));
  });
  root.append(svg('rect', { x: xs[0], y: PIPE_Y, width: xs[xs.length - 1] - xs[0], height: PIPE_H, class: 'outline' }));
  if (openEnds) {
    // Wavy break lines: the run keeps going past the picture.
    for (const x of [xs[0], xs[xs.length - 1]]) {
      root.append(svg('path', { d: `M${x} ${PIPE_Y - 4} q6 ${PIPE_H / 4} 0 ${PIPE_H / 2} q-6 ${PIPE_H / 4} 0 ${PIPE_H / 2 + 8}`, class: 'break' }));
    }
  }

  // Pencil marks: a tick through the pipe and a triangle on top.
  for (const b of marks) {
    const x = xs[b];
    root.append(
      svg('line', { x1: x, y1: PIPE_Y - 8, x2: x, y2: PIPE_Y + PIPE_H + 8, class: 'mark' }),
      svg('path', { d: `M${x - 6} ${PIPE_Y - 18} L${x + 6} ${PIPE_Y - 18} L${x} ${PIPE_Y - 9} Z`, class: 'mark-tip' }),
    );
  }

  // Dimension lines above the pipe, stacked.
  dims.forEach((d, n) => {
    const y = PIPE_Y - 30 - n * 24;
    const x1 = xs[d.a], x2 = xs[d.b];
    root.append(
      svg('line', { x1, y1: y, x2, y2: y, class: 'dim' }),
      svg('line', { x1, y1: y - 5, x2: x1, y2: y + 5, class: 'dim' }),
      svg('line', { x1: x2, y1: y - 5, x2, y2: y + 5, class: 'dim' }),
      // A short span near an edge would push its number off the picture: hang it inward.
      dimText(x1, x2, y, d.text),
    );
  });

  // Labels under the pipe, one per kind, each on its own line so thin slices
  // side by side never print on top of each other. A leader runs up to the slice.
  const seen = new Set();
  let lane = 0;
  parts.forEach((p, i) => {
    if (seen.has(p.kind)) return;
    seen.add(p.kind);
    const cx = xs[i] + widths[i] / 2;
    const y = PIPE_Y + PIPE_H + 20 + lane++ * LANE;
    const label = NAMES[p.kind] + (p.len && p.kind !== 'keep' ? ` ${formatInches(p.len)}` : '');
    const right = cx > W / 2;
    root.append(
      svg('polyline', { points: `${cx},${PIPE_Y + PIPE_H} ${cx},${y - 4} ${right ? cx - 4 : cx + 4},${y - 4}`, class: 'leader' }),
      richText(right ? cx - 7 : cx + 7, y, right ? 'end' : 'start', label, `lbl ${p.kind}-text`),
    );
  });
  if (scaled) root.append(svg('text', { x: W - 4, y: H - 4, class: 'scale-note', 'text-anchor': 'end' }, 'thin slices drawn wider: not to scale'));
  return root;
}
