// valveart.js — valve cutaways. drawValve(id, pos) draws one kind (ids match
// core/valve.js) at pos 0 (shut, or flow stopped) to 1 (open); the screen
// redraws it as pos moves. mainValve(state) draws a pilot-operated control
// valve with its cover, diaphragm, pilot and tubing (state from core/control.js).
// Water moves along its path; with reduced motion on it holds still (style.css).

const NS = 'http://www.w3.org/2000/svg';
const W = 320, H = 200;
const TOP = 70, BOT = 130, MID = 100; // the pipe's bore

function s(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// A part name with a thin leader line to what it names.
function label(svg, text, tx, ty, px, py, anchor = 'start') {
  const width = text.length * 6.3;
  const left = anchor === 'end' ? tx - width : anchor === 'middle' ? tx - width / 2 : tx;
  const right = left + width;
  const lx = px > right ? right + 3 : px < left ? left - 3 : px;
  if (px != null) svg.append(s('line', { x1: px, y1: py, x2: lx, y2: ty - 4, class: 'pa-leader' }));
  svg.append(s('text', { x: tx, y: ty, class: 'pa-label', 'text-anchor': anchor }, text));
}

// Straight pipe through the picture with flanges where the valve bolts in.
function pipe(svg, x0 = 118, x1 = 202) {
  svg.append(s('rect', { x: 0, y: TOP, width: W, height: BOT - TOP, class: 'pa-water' }));
  for (const y of [TOP, BOT]) svg.append(s('line', { x1: 0, y1: y, x2: W, y2: y, class: 'va-wall' }));
  for (const x of [x0, x1]) svg.append(s('rect', { x: x - 4, y: TOP - 12, width: 8, height: BOT - TOP + 24, class: 'va-flange' }));
}

// Water moving: forward (left to right) or back, faint as it slows.
function stream(svg, amount, back = false, y = MID) {
  if (amount < 0.05) return;
  const d = back ? `M${W - 8} ${y} L8 ${y}` : `M8 ${y} L${W - 8} ${y}`;
  svg.append(s('path', { d, class: 'pa-flow', opacity: Math.min(1, 0.25 + amount).toFixed(2) }));
  const x = back ? 14 : W - 14;
  svg.append(s('path', { d: back ? `M${x + 10} ${y - 7} L${x} ${y} L${x + 10} ${y + 7}` : `M${x - 10} ${y - 7} L${x} ${y} L${x - 10} ${y + 7}`, class: 'va-arrow', opacity: Math.min(1, 0.25 + amount).toFixed(2) }));
}

const rot = (a, cx, cy) => `rotate(${a.toFixed(1)} ${cx} ${cy})`;

const DRAW = {
  gate(svg, p) {
    pipe(svg);
    svg.append(s('path', { d: `M130 ${TOP} L130 18 L190 18 L190 ${TOP}`, class: 'pa-casing' }));
    svg.append(s('rect', { x: 131, y: TOP - 2, width: 58, height: 4, class: 'pa-water' }));
    const top = 72 - p * 52; // shut: 72..130; open: tucked up in the bonnet
    svg.append(s('line', { x1: 160, y1: 2, x2: 160, y2: top, class: 'pa-shaft' }));
    svg.append(s('ellipse', { cx: 160, cy: 6, rx: 24, ry: 4, class: 'va-wheel' }));
    svg.append(s('path', { d: `M144 ${top} L176 ${top} L172 ${top + 58} L148 ${top + 58} Z`, class: 'va-part' }));
    for (const x of [142, 174]) svg.append(s('rect', { x, y: BOT - 6, width: 4, height: 8, class: 'va-seat' }));
    stream(svg, p);
    label(svg, 'Handwheel', 196, 12, 184, 6);
    label(svg, 'Bonnet', 200, 40, 190, 40);
    label(svg, 'Wedge (gate)', 210, 160, 168, top + 40);
    label(svg, 'Seats', 100, 160, 144, BOT, 'end');
    label(svg, 'Stem', 118, 30, 160, 26, 'end');
  },
  butterfly(svg, p) {
    pipe(svg);
    svg.append(s('rect', { x: 146, y: 22, width: 28, height: 26, rx: 3, class: 'pa-casing' }));
    svg.append(s('line', { x1: 160, y1: 48, x2: 160, y2: TOP, class: 'pa-shaft' }));
    for (const y of [TOP, BOT - 5]) svg.append(s('rect', { x: 156, y, width: 8, height: 5, class: 'va-seat' }));
    const a = 90 - p * 85; // shut: the disc stands across the pipe
    svg.append(s('rect', { x: 130, y: 96, width: 60, height: 8, rx: 4, class: 'va-part', transform: rot(a, 160, 100) }));
    svg.append(s('circle', { cx: 160, cy: 100, r: 4, class: 'pa-hub' }));
    stream(svg, p, false, p > 0.5 ? 84 : 100);
    label(svg, 'Gear operator', 190, 30, 174, 34);
    label(svg, 'Disc', 210, 160, 172, 112);
    label(svg, 'Seat liner', 100, 160, 158, BOT - 3, 'end');
    label(svg, 'Shaft', 120, 60, 160, 60, 'end');
  },
  ball(svg, p) {
    pipe(svg);
    svg.append(s('circle', { cx: 160, cy: 100, r: 44, class: 'pa-casing' }));
    svg.append(s('circle', { cx: 160, cy: 100, r: 34, class: 'va-part' }));
    const a = 90 - p * 90;
    svg.append(s('rect', { x: 124, y: 82, width: 72, height: 36, class: 'va-bore', transform: rot(a, 160, 100) }));
    svg.append(s('rect', { x: 124, y: 82, width: 72, height: 36, class: 'pa-water', transform: rot(a, 160, 100) }));
    svg.append(s('rect', { x: 116, y: 82, width: 12, height: 36, class: 'pa-water' }));
    svg.append(s('rect', { x: 192, y: 82, width: 12, height: 36, class: 'pa-water' }));
    svg.append(s('line', { x1: 160, y1: 56, x2: 160, y2: 36, class: 'pa-shaft' }));
    // The handle seen from the side: lying along the pipe when open, pointing at you when shut.
    const len = 60 * Math.cos((1 - p) * Math.PI / 2);
    svg.append(s('line', { x1: 160, y1: 34, x2: 160 + len, y2: 34, class: 'va-handle' }));
    svg.append(s('circle', { cx: 160, cy: 34, r: 5, class: 'va-wheel' }));
    stream(svg, p);
    label(svg, p > 0.5 ? 'Handle in line: open' : 'Handle across: shut', 160, 18, null, null, 'middle');
    label(svg, 'Ball', 214, 165, 186, 124);
    label(svg, 'Bore', 100, 165, 150, 108, 'end');
  },
  plug(svg, p) {
    pipe(svg);
    svg.append(s('circle', { cx: 160, cy: 96, r: 52, class: 'pa-casing' }));
    svg.append(s('circle', { cx: 160, cy: 96, r: 47, class: 'pa-water' }));
    svg.append(s('rect', { x: 200, y: TOP, width: 6, height: BOT - TOP, class: 'va-seat', opacity: 0.6 }));
    // The plug: half a cylinder on the shaft. Shut, its rubber face stands across the
    // bore against the seat; open, it swings up into the top of the body, out of the stream.
    const a = -p * 90;
    svg.append(s('path', { d: 'M160 52 A44 44 0 0 1 160 140 Z', class: 'va-part', transform: rot(a, 160, 96) }));
    svg.append(s('circle', { cx: 160, cy: 96, r: 6, class: 'pa-hub' }));
    stream(svg, p, false, 120);
    label(svg, 'Shaft (gear on it, outside)', 160, 30, 160, 92, 'middle');
    label(svg, 'Plug, rubber face', 224, 175, 186, 112);
    label(svg, 'Seat, one end', 96, 175, 203, BOT - 2, 'end');
  },
  knife(svg, p) {
    pipe(svg);
    svg.append(s('path', { d: `M148 ${TOP} L148 14 L172 14 L172 ${TOP}`, class: 'pa-casing' }));
    const top = 72 - p * 58;
    svg.append(s('line', { x1: 160, y1: 0, x2: 160, y2: top, class: 'pa-shaft' }));
    svg.append(s('path', { d: `M156 ${top} L164 ${top} L164 ${top + 60} L156 ${top + 54} Z`, class: 'va-part' }));
    for (const x of [150, 166]) svg.append(s('rect', { x, y: BOT - 6, width: 4, height: 8, class: 'va-seat' }));
    stream(svg, p);
    label(svg, 'Packing', 196, 22, 172, 22);
    label(svg, 'Blade', 210, 160, 162, top + 40);
    label(svg, 'Seat', 110, 160, 152, BOT, 'end');
  },
  swing(svg, p) {
    pipe(svg, 110, 230);
    svg.append(s('path', { d: `M120 ${TOP} Q130 34 170 34 Q220 34 220 ${TOP}`, class: 'pa-casing' }));
    svg.append(s('path', { d: `M124 ${TOP + 1} Q134 38 170 38 Q216 38 216 ${TOP + 1} Z`, class: 'pa-water' }));
    svg.append(s('rect', { x: 146, y: TOP + 4, width: 6, height: BOT - TOP - 4, class: 'va-seat' }));
    const a = -p * 72; // swings up and downstream
    const g = s('g', { transform: rot(a, 158, 58) });
    g.append(s('line', { x1: 158, y1: 58, x2: 158, y2: 72, class: 'pa-shaft' }));
    g.append(s('rect', { x: 153, y: 70, width: 10, height: 60, rx: 3, class: 'va-part' }));
    svg.append(g);
    svg.append(s('circle', { cx: 158, cy: 58, r: 4, class: 'pa-hub' }));
    // Lever and weight outside on the same shaft (drawn faint, it is outside the body).
    const lw = s('g', { transform: rot(a, 158, 58), opacity: 0.6 });
    lw.append(s('line', { x1: 158, y1: 58, x2: 116, y2: 30, class: 'pa-shaft' }));
    lw.append(s('circle', { cx: 112, cy: 28, r: 8, class: 'va-wheel' }));
    svg.append(lw);
    stream(svg, p, false, 116);
    label(svg, 'Hinge pin', 210, 22, 160, 54);
    label(svg, 'Clapper', 232, 160, 162, 116);
    label(svg, 'Seat', 112, 160, 148, BOT - 6, 'end');
    label(svg, 'Lever and weight (outside)', 8, 14, null, null);
  },
  wafer(svg, p) {
    pipe(svg, 146, 174);
    svg.append(s('rect', { x: 150, y: TOP - 8, width: 20, height: BOT - TOP + 16, class: 'pa-casing' }));
    svg.append(s('rect', { x: 150, y: TOP, width: 20, height: BOT - TOP, class: 'pa-water' }));
    const a = p * 80;
    svg.append(s('rect', { x: 156, y: TOP + 2, width: 8, height: 28, rx: 2, class: 'va-part', transform: rot(a, 160, 100) }));
    svg.append(s('rect', { x: 156, y: 100, width: 8, height: 28, rx: 2, class: 'va-part', transform: rot(-a, 160, 100) }));
    svg.append(s('circle', { cx: 160, cy: 100, r: 4, class: 'pa-hub' }));
    if (p > 0.05) for (const y of [TOP + 14, BOT - 14]) svg.append(s('path', { d: `M8 ${y} L${W - 8} ${y}`, class: 'pa-flow', opacity: Math.min(1, 0.25 + p).toFixed(2) }));
    label(svg, 'Ring between the flanges', 160, 40, 160, TOP - 8, 'middle');
    label(svg, 'Two plates on springs', 200, 165, 186, 118);
    label(svg, 'Center pin', 112, 165, 158, 102, 'end');
  },
  ballcheck(svg, p) {
    pipe(svg, 110, 230);
    svg.append(s('path', { d: `M128 ${TOP} L128 44 Q170 6 222 16 L222 ${TOP}`, class: 'pa-casing' }));
    svg.append(s('path', { d: `M132 ${TOP + 1} L132 47 Q170 11 218 20 L218 ${TOP + 1} Z`, class: 'pa-water' }));
    svg.append(s('rect', { x: 130, y: TOP, width: 8, height: BOT - TOP, class: 'va-seat', opacity: 0.6 }));
    svg.append(s('rect', { x: 130, y: 84, width: 8, height: 32, class: 'pa-water' }));
    const x = 164 + p * 30, y = 100 - p * 56;
    svg.append(s('circle', { cx: x, cy: y, r: 22, class: 'va-part' }));
    stream(svg, p, false, 118);
    label(svg, 'Ball pocket', 60, 36, 132, 40);
    label(svg, 'Rubber ball', 236, 165, x + 14, y + 18);
    label(svg, 'Seat', 100, 165, 134, BOT - 4, 'end');
  },
  air(svg, p) {
    // The line along the bottom; a chamber on top of a riser at the high point.
    svg.append(s('rect', { x: 0, y: 150, width: W, height: 40, class: 'pa-water' }));
    for (const y of [150, 190]) svg.append(s('line', { x1: 0, y1: y, x2: W, y2: y, class: 'va-wall' }));
    svg.append(s('rect', { x: 128, y: 24, width: 64, height: 120, rx: 8, class: 'pa-casing' }));
    svg.append(s('rect', { x: 150, y: 140, width: 20, height: 12, class: 'pa-water' }));
    const level = 46 + p * 70; // water surface in the chamber
    svg.append(s('rect', { x: 134, y: level, width: 52, height: 140 - level, class: 'pa-water' }));
    svg.append(s('line', { x1: 134, y1: level, x2: 186, y2: level, class: 'pa-waterline' }));
    svg.append(s('circle', { cx: 160, cy: level - 2, r: 13, class: 'pa-float' }));
    svg.append(s('rect', { x: 156, y: 16, width: 8, height: 10, class: 'va-seat' }));
    if (p > 0.3) svg.append(s('path', { d: 'M160 20 L160 2', class: 'va-air' }));
    if (p > 0.05) for (const x of [70, 230]) svg.append(s('circle', { cx: x, cy: 158, r: 5 + p * 4, class: 'va-bubble' }));
    label(svg, p > 0.3 ? 'Air out' : 'Orifice', 176, 12, 164, 20);
    label(svg, 'Float', 210, 70, 172, level - 4);
    label(svg, 'Air bubbles in the line', 8, 140, null, null);
  },
};

export function drawValve(id, pos) {
  if (id === 'control') return mainValve({ open: pos, pilot: pos, inlet: 120, outlet: 60 });
  const v = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pipe pump-art valve-art', role: 'img', 'aria-label': 'Valve cutaway' });
  DRAW[id](v, pos);
  return v;
}

export const VALVE_DRAWINGS = [...Object.keys(DRAW), 'control'];

// The pilot-operated main valve. kind 'modulating' (restriction in, pilot out)
// or 'on-off' (a three-way pilot feeds or vents the cover). moving: +1 opening,
// -1 closing, 0 still, so the tube that is carrying water shows it.
export function mainValve(st, kind = 'modulating', moving = 0) {
  const svg = s('svg', { viewBox: '0 0 320 240', class: 'pipe pump-art valve-art', role: 'img', 'aria-label': 'Cutaway of a pilot-operated control valve' });
  const o = Math.max(0, Math.min(1, st.open));
  // Pipes in and out, and the globe body.
  svg.append(s('rect', { x: 0, y: 172, width: 90, height: 34, class: 'pa-water' }));
  svg.append(s('rect', { x: 230, y: 172, width: 90, height: 34, class: 'pa-water' }));
  for (const y of [172, 206]) { svg.append(s('line', { x1: 0, y1: y, x2: 86, y2: y, class: 'va-wall' })); svg.append(s('line', { x1: 234, y1: y, x2: 320, y2: y, class: 'va-wall' })); }
  svg.append(s('rect', { x: 84, y: 112, width: 152, height: 112, rx: 18, class: 'pa-casing' }));
  svg.append(s('rect', { x: 88, y: 172, width: 108, height: 46, class: 'va-in' }));               // inlet chamber
  svg.append(s('path', { d: 'M112 128 L232 128 L232 218 L198 218 L198 168 L112 168 Z', class: 'pa-water' })); // outlet chamber
  // Seat: the hole in the partition between them.
  svg.append(s('rect', { x: 140, y: 166, width: 40, height: 8, class: 'va-in' }));
  for (const x of [134, 180]) svg.append(s('rect', { x, y: 166, width: 6, height: 6, class: 'va-seat' }));
  // Disc and stem, lifted by how open it is.
  const lift = o * 30;
  svg.append(s('line', { x1: 160, y1: 30 - lift, x2: 160, y2: 160 - lift, class: 'pa-shaft' }));
  svg.append(s('rect', { x: 130, y: 156 - lift, width: 60, height: 10, rx: 2, class: 'va-part' }));
  // Cover with its water above the diaphragm; spring pushing down.
  const dy = 106 - lift;
  svg.append(s('path', { d: `M92 112 L92 58 Q92 46 104 46 L216 46 Q228 46 228 58 L228 112`, class: 'pa-casing' }));
  svg.append(s('rect', { x: 96, y: 50, width: 128, height: dy - 50, class: 'va-cover', opacity: (0.35 + (1 - o) * 0.5).toFixed(2) }));
  svg.append(s('path', { d: `M92 ${dy + 4} Q160 ${dy - 6} 228 ${dy + 4}`, class: 'va-diaphragm' }));
  let zz = `M160 50`;
  for (let i = 1; i <= 6; i++) zz += ` L${i % 2 ? 150 : 170} ${50 + (dy - 50) * i / 7}`;
  svg.append(s('path', { d: `${zz} L160 ${dy}`, class: 'va-spring' }));
  // Tubing: inlet up to the cover, and the cover out through the pilot to the outlet.
  const active = (on) => (on ? 'va-tube on' : 'va-tube');
  const feeding = kind === 'modulating' ? st.pilot > 0.05 || moving < 0 : moving < 0;
  const bleeding = kind === 'modulating' ? st.pilot > 0.05 : moving > 0;
  svg.append(s('path', { d: 'M40 172 L40 26 L120 26 L120 46', class: active(feeding) }));
  svg.append(s('path', { d: 'M200 46 L200 26 L270 26', class: active(bleeding) }));
  svg.append(s('path', { d: 'M302 40 L302 172', class: active(bleeding) }));
  svg.append(s('rect', { x: 270, y: 12, width: 46, height: 28, rx: 5, class: st.pilot > 0.05 ? 'va-pilot on' : 'va-pilot' }));
  svg.append(s('text', { x: 293, y: 31, class: 'pa-label', 'text-anchor': 'middle' }, 'Pilot'));
  svg.append(s('rect', { x: 34, y: 60, width: 12, height: 12, class: kind === 'modulating' ? 'va-restrict' : 'va-pilot' }));
  // Gauges.
  const gauge = (x, y, v, name) => {
    svg.append(s('circle', { cx: x, cy: y, r: 17, class: 'va-gauge' }));
    svg.append(s('text', { x, y: y + 4, class: 'va-gauge-num', 'text-anchor': 'middle' }, v == null ? '—' : String(Math.round(v))));
    svg.append(s('text', { x, y: y + 30, class: 'pa-label', 'text-anchor': 'middle' }, name));
  };
  gauge(70, 138, st.inlet, 'In, psi');
  if (st.tank != null) {
    svg.append(s('rect', { x: 252, y: 92, width: 34, height: 60, class: 'va-tank' }));
    svg.append(s('rect', { x: 253, y: 92 + 60 * (1 - st.tank), width: 32, height: 60 * st.tank, class: 'pa-water' }));
    svg.append(s('text', { x: 269, y: 166, class: 'pa-label', 'text-anchor': 'middle' }, 'Tank'));
  } else gauge(262, 138, st.outlet, 'Out, psi');
  if (o > 0.05) svg.append(s('path', { d: 'M10 189 L120 189 L150 180 L160 150 L215 150 L215 189 L310 189', class: 'pa-flow', opacity: (0.3 + o * 0.7).toFixed(2) }));
  label(svg, kind === 'modulating' ? 'Restriction' : 'Speed needle', 50, 16, 44, 60);
  label(svg, 'Cover', 100, 64, null, null);
  label(svg, 'Diaphragm', 234, 100, 222, dy + 2);
  label(svg, 'Disc and seat', 160, 236, 160, 166 - lift, 'middle');
  label(svg, 'Position', 172, 12, 162, 24 - lift);
  return svg;
}
