// pumpart.js — the cutaway pictures on How pumps work, one per kind (ids
// match core/kinds.js). Impellers spin and water moves along its path; with
// reduced motion on, they hold still (style.css).

const NS = 'http://www.w3.org/2000/svg';
const W = 320, H = 230;

function s(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// An impeller seen face on: hub and curved vanes, spinning.
function impeller(cx, cy, r, vanes = 6) {
  const g = s('g', { class: 'pa-spin' });
  g.append(s('circle', { cx, cy, r, class: 'pa-imp' }));
  for (let i = 0; i < vanes; i++) {
    const a = (i / vanes) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r * 0.3, y1 = cy + Math.sin(a) * r * 0.3;
    const x2 = cx + Math.cos(a + 0.9) * r * 0.95, y2 = cy + Math.sin(a + 0.9) * r * 0.95;
    const qx = cx + Math.cos(a + 0.2) * r * 0.75, qy = cy + Math.sin(a + 0.2) * r * 0.75;
    g.append(s('path', { d: `M${x1} ${y1} Q${qx} ${qy} ${x2} ${y2}`, class: 'pa-vane' }));
  }
  g.append(s('circle', { cx, cy, r: r * 0.22, class: 'pa-hub' }));
  return g;
}

// An impeller seen from the side, inside a can: a flat disk with vanes that
// slide past, so it reads as turning.
function sideImpeller(x, y, w, h) {
  const g = s('g', {});
  g.append(s('rect', { x, y, width: w, height: h, rx: 3, class: 'pa-imp' }));
  const vanes = s('g', { class: 'pa-slide' });
  for (let i = -1; i < 6; i++) vanes.append(s('line', { x1: x + i * (w / 5), y1: y + 2, x2: x + i * (w / 5) + 6, y2: y + h - 2, class: 'pa-vane' }));
  const clip = `clip-${x}-${y}`;
  const cp = s('clipPath', { id: clip });
  cp.append(s('rect', { x, y, width: w, height: h }));
  g.append(cp);
  vanes.setAttribute('clip-path', `url(#${clip})`);
  g.append(vanes);
  return g;
}

function flow(d) { return s('path', { d, class: 'pa-flow' }); }

// A part name with a thin leader line to what it names.
// The leader stops at whichever end of the words faces the part.
function label(svg, text, tx, ty, px, py, anchor = 'start') {
  const width = text.length * 6.3; // about 6.3px a letter at 11.5px
  const left = anchor === 'end' ? tx - width : tx, right = anchor === 'end' ? tx : tx + width;
  const lx = px > right ? right + 3 : px < left ? left - 3 : px;
  svg.append(s('line', { x1: px, y1: py, x2: lx, y2: ty - 4, class: 'pa-leader' }));
  svg.append(s('text', { x: tx, y: ty, class: 'pa-label', 'text-anchor': anchor }, text));
}

function frame(name) {
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pipe pump-art', role: 'img', 'aria-label': `Cutaway of a ${name}` });
}

const DRAW = {
  centrifugal(svg) {
    // Volute: a spiral that widens clockwise from the left, all the way round,
    // into a discharge going straight up on the left. The impeller turns clockwise too.
    const cx = 176, cy = 132;
    const spiral = (r0, r1, from = 0) => {
      let d = '';
      for (let i = 0; i <= 60; i++) {
        const f = from + (1 - from) * (i / 60);
        const t = Math.PI + f * Math.PI * 2;
        const r = r0 + (r1 - r0) * f;
        d += `${i ? 'L' : 'M'}${(cx + Math.cos(t) * r).toFixed(1)} ${(cy + Math.sin(t) * r).toFixed(1)} `;
      }
      return d;
    };
    svg.append(s('path', { d: `${spiral(58, 82)} L${cx - 82} 18 L${cx - 58} 18 Z`, class: 'pa-casing' }));
    svg.append(impeller(cx, cy, 46));
    svg.append(s('circle', { cx, cy, r: 13, class: 'pa-eye' }));
    // Water flung off the impeller, round the volute and up the discharge.
    svg.append(flow(`${spiral(62, 72, 0.12)} L${cx - 70} 22`));
    label(svg, 'Discharge', 132, 30, cx - 58, 34);
    label(svg, 'Volute', 262, 150, cx + 74, cy + 22);
    label(svg, 'Impeller', 250, 52, cx + 28, cy - 30);
    label(svg, 'Eye: water in', 222, 220, cx + 6, cy + 11);
  },

  submersible(svg, { agitator = false } = {}) {
    // Water in the pit, the pump standing in it.
    svg.append(s('rect', { x: 0, y: 70, width: W, height: H - 70, class: 'pa-water' }));
    svg.append(s('line', { x1: 0, y1: 70, x2: W, y2: 70, class: 'pa-waterline' }));
    svg.append(s('text', { x: W - 6, y: 64, class: 'pa-label', 'text-anchor': 'end' }, 'water level'));
    // Hose and cable up out of the pit.
    svg.append(s('path', { d: 'M178 40 V12 H250', class: 'pa-hose' }));
    svg.append(s('path', { d: 'M136 40 Q120 10 70 8', class: 'pa-cable' }));
    // The can: motor on top, seals, pump end, strainer.
    svg.append(s('rect', { x: 118, y: 40, width: 84, height: 150, rx: 10, class: 'pa-casing' }));
    svg.append(s('rect', { x: 130, y: 52, width: 60, height: 68, rx: 4, class: 'pa-motor' }));
    for (let i = 0; i < 5; i++) svg.append(s('line', { x1: 134, y1: 60 + i * 13, x2: 186, y2: 60 + i * 13, class: 'pa-winding' }));
    svg.append(s('rect', { x: 140, y: 126, width: 40, height: 14, rx: 2, class: 'pa-oil' }));
    svg.append(s('line', { x1: 160, y1: 120, x2: 160, y2: 166, class: 'pa-shaft' }));
    svg.append(sideImpeller(128, 152, 64, 14));
    for (let x = 124; x <= 194; x += 10) svg.append(s('line', { x1: x, y1: 178, x2: x, y2: 190, class: 'pa-strainer' }));
    if (agitator) {
      svg.append(s('line', { x1: 160, y1: 190, x2: 160, y2: 204, class: 'pa-shaft' }));
      svg.append(sideImpeller(140, 202, 40, 8));
      // Settled solids being kicked up.
      for (const [x, y, dl] of [[110, 222, 0], [128, 218, .6], [192, 220, .3], [212, 223, .9], [150, 224, 1.2], [176, 221, 1.5]]) {
        svg.append(s('circle', { cx: x, cy: y, r: 2.6, class: 'pa-grit', style: `animation-delay:${dl}s` }));
      }
      svg.append(s('rect', { x: 60, y: 222, width: 200, height: 8, class: 'pa-mud' }));
      label(svg, 'Agitator', 260, 206, 182, 206);
    }
    // Water: in the strainer, up the jacket past the motor, out the hose.
    svg.append(flow('M150 200 V170 M170 200 V170 M196 160 V48 L178 40 V14 H246'));
    label(svg, 'Cable', 30, 24, 96, 12);
    label(svg, 'Motor', 12, 92, 130, 86);
    label(svg, 'Seals + oil', 12, 134, 140, 133);
    label(svg, 'Impeller', 12, 162, 128, 159);
    if (!agitator) label(svg, 'Strainer', 12, 196, 122, 184);
    label(svg, 'Hose', 262, 30, 246, 14);
  },

  slurry(svg) { DRAW.submersible(svg, { agitator: true }); },

  turbine(svg) {
    // Ground, the well, water partway down.
    svg.append(s('rect', { x: 110, y: 96, width: 100, height: H - 96, class: 'pa-water' }));
    svg.append(s('line', { x1: 110, y1: 96, x2: 210, y2: 96, class: 'pa-waterline' }));
    svg.append(s('line', { x1: 0, y1: 56, x2: W, y2: 56, class: 'pa-ground' }));
    svg.append(s('line', { x1: 110, y1: 56, x2: 110, y2: H, class: 'pa-ground' }));
    svg.append(s('line', { x1: 210, y1: 56, x2: 210, y2: H, class: 'pa-ground' }));
    // Motor on top, discharge head, column, lineshaft, bowls.
    svg.append(s('rect', { x: 134, y: 6, width: 52, height: 34, rx: 4, class: 'pa-motor' }));
    for (let i = 0; i < 3; i++) svg.append(s('line', { x1: 138, y1: 14 + i * 9, x2: 182, y2: 14 + i * 9, class: 'pa-winding' }));
    svg.append(s('rect', { x: 140, y: 40, width: 40, height: 16, class: 'pa-casing' }));
    svg.append(s('path', { d: 'M180 46 H250', class: 'pa-hose' }));
    svg.append(s('rect', { x: 148, y: 56, width: 24, height: 104, class: 'pa-casing' }));
    svg.append(s('line', { x1: 160, y1: 40, x2: 160, y2: 210, class: 'pa-shaft' }));
    for (let i = 0; i < 3; i++) {
      svg.append(s('rect', { x: 138, y: 160 + i * 16, width: 44, height: 16, rx: 3, class: 'pa-casing' }));
      svg.append(sideImpeller(144, 164 + i * 16, 32, 8));
    }
    svg.append(s('path', { d: 'M146 208 L136 222 H184 L174 208 Z', class: 'pa-casing' }));
    svg.append(flow('M160 222 V200 M152 196 V60 L152 50 H246'));
    label(svg, 'Motor', 12, 26, 134, 22);
    label(svg, 'Discharge', 262, 38, 248, 46);
    label(svg, 'Column + lineshaft', 12, 120, 148, 114);
    label(svg, 'Bowls (stages)', 222, 186, 182, 184);
    label(svg, 'Suction bell', 12, 222, 138, 218);
    label(svg, 'water level', 222, 108, 210, 96);
  },

  diesel(svg) {
    svg.append(s('line', { x1: 0, y1: 150, x2: 236, y2: 150, class: 'pa-ground' }));
    // The hole with water in it.
    svg.append(s('path', { d: 'M236 150 V226 H316 V150', class: 'pa-ground' }));
    svg.append(s('rect', { x: 237, y: 184, width: 78, height: 42, class: 'pa-water' }));
    svg.append(s('line', { x1: 237, y1: 184, x2: 315, y2: 184, class: 'pa-waterline' }));
    // Skid, engine, pump with its priming chamber.
    svg.append(s('rect', { x: 14, y: 140, width: 200, height: 10, class: 'pa-casing' }));
    svg.append(s('rect', { x: 20, y: 82, width: 96, height: 58, rx: 6, class: 'pa-motor' }));
    for (let i = 0; i < 6; i++) svg.append(s('line', { x1: 28 + i * 14, y1: 88, x2: 28 + i * 14, y2: 104, class: 'pa-winding' }));
    svg.append(s('path', { d: 'M40 82 V58 H50', class: 'pa-cable' }));
    svg.append(s('line', { x1: 116, y1: 112, x2: 136, y2: 112, class: 'pa-shaft' }));
    svg.append(s('rect', { x: 136, y: 76, width: 76, height: 64, rx: 10, class: 'pa-casing' }));
    svg.append(s('rect', { x: 142, y: 96, width: 64, height: 38, rx: 6, class: 'pa-water' }));
    svg.append(impeller(174, 114, 16, 4));
    // Suction hose down into the hole with the check valve; discharge up and out.
    svg.append(s('path', { d: 'M212 100 H262 V212', class: 'pa-hose' }));
    svg.append(s('rect', { x: 216, y: 92, width: 12, height: 16, class: 'pa-check' }));
    svg.append(s('path', { d: 'M174 76 V30 H110', class: 'pa-hose' }));
    svg.append(flow('M262 214 V104 L216 100 M174 96 V34 L114 30'));
    label(svg, 'Engine', 12, 176, 60, 140);
    label(svg, 'Priming chamber', 112, 200, 172, 134);
    label(svg, 'Check valve', 250, 76, 222, 92);
    label(svg, 'Suction hose', 296, 140, 264, 150, 'end');
    label(svg, 'Discharge', 60, 22, 110, 30);
  },
};

export function drawKind(kind) {
  const svg = frame(kind.name);
  DRAW[kind.id](svg);
  return svg;
}

export const DRAWN = Object.keys(DRAW);
