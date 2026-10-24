// liftart.js — the lift station's three drawings, each built once and handed
// back with an update(s) that moves it to the station's state (core/lift.js):
// the wet well (water, floats, pumps), the power side (480 V to the motors) and
// the ladder (120 V control). Live wires and closed contacts light up.

import { FLOATS, LADDER } from '../core/lift.js';

const NS = 'http://www.w3.org/2000/svg';

function s(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

// ---- The wet well, cut away ----
const TOP = 40, FLOOR = 228; // level 100 is TOP, level 0 is FLOOR
const yOf = (level) => FLOOR - (level / 100) * (FLOOR - TOP);
const PUMP_X = [118, 182];

export function wellArt() {
  const svg = s('svg', { viewBox: '0 0 320 252', class: 'pipe pump-art lift-well', role: 'img',
    'aria-label': 'Wet well cut away: sewage comes in on the right, four floats hang on the left, two pumps on the floor pump it up and out' });
  svg.append(s('path', { d: 'M0 30 H60 M220 30 H320', class: 'pa-ground' }));
  svg.append(s('rect', { x: 60, y: 30, width: 160, height: FLOOR - 30 + 8, class: 'lw-wall' }));
  svg.append(s('rect', { x: 68, y: 30, width: 144, height: FLOOR - 30, class: 'lw-inside' }));
  const water = s('rect', { x: 68, width: 144, class: 'pa-water lw-water' });
  const surface = s('line', { x1: 68, x2: 212, class: 'pa-waterline' });
  svg.append(water, surface);

  // Inflow pipe on the right, falling into the well.
  svg.append(s('path', { d: 'M320 70 H212', class: 'pa-hose' }));
  const pour = s('path', { d: 'M298 70 H214 Q206 72 206 84 V220', class: 'pa-flow lw-pour' });
  svg.append(pour, s('text', { x: 316, y: 60, class: 'pa-label', 'text-anchor': 'end' }, 'In'));

  // Floats: a dashed line across the well at each one's height, its name on the left.
  const bracket = { x: 72, y: 34 };
  const floats = FLOATS.map((f, k) => {
    const y = yOf(f.at);
    svg.append(s('line', { x1: 68, x2: 212, y1: y, y2: y, class: 'lw-mark' }));
    const name = s('text', { x: 56, y: y + 4, class: 'pa-label', 'text-anchor': 'end' }, f.name);
    svg.append(name);
    const x = 80 + k * 6;
    const cable = s('line', { x1: bracket.x, y1: bracket.y, x2: x, y2: y, class: 'pa-cable' });
    const body = s('ellipse', { cx: 0, cy: 0, rx: 9, ry: 4.5, class: 'pa-float' });
    const g = s('g', {});
    g.append(body);
    svg.append(cable, g);
    return { x, y, g, cable, name };
  });
  svg.append(s('rect', { x: 66, y: 31, width: 10, height: 5, class: 'pa-frame' }));

  // Two submersible pumps, risers up through check valves to the force main.
  svg.append(s('path', { d: `M${PUMP_X[0]} 18 H320 M${PUMP_X[1]} 18`, class: 'pa-hose' }));
  svg.append(s('text', { x: 316, y: 12, class: 'pa-label', 'text-anchor': 'end' }, 'Out'));
  const pumps = PUMP_X.map((x, i) => {
    svg.append(s('path', { d: `M${x} 186 V18`, class: 'pa-hose' }));
    svg.append(s('rect', { x: x - 6, y: 46, width: 12, height: 12, class: 'pa-check' }));
    const flow = s('path', { d: `M${x} 186 V18 H316`, class: 'pa-flow' });
    const body = s('g', { class: 'lw-pump' });
    body.append(s('rect', { x: x - 13, y: 184, width: 26, height: 30, rx: 4, class: 'pa-motor' }));
    body.append(s('path', { d: `M${x - 17} 214 H${x + 17} L${x + 13} 226 H${x - 13} Z`, class: 'pa-casing' }));
    body.append(s('text', { x, y: 204, class: 'pa-label', 'text-anchor': 'middle' }, String(i + 1)));
    svg.append(flow, body);
    const tag = s('text', { x, y: 248, class: 'pa-label lw-tag', 'text-anchor': 'middle' });
    svg.append(tag);
    return { flow, body, tag };
  });

  function update(st) {
    const y = yOf(st.level);
    water.setAttribute('y', y);
    water.setAttribute('height', Math.max(0, FLOOR - y));
    surface.setAttribute('y1', y);
    surface.setAttribute('y2', y);
    pour.setAttribute('d', `M298 70 H214 Q206 72 206 84 V${Math.max(86, y)}`);
    pour.classList.toggle('lw-storm', st.storm);
    FLOATS.forEach((f, k) => {
      const fl = floats[k];
      const up = st.up[f.id];
      fl.name.textContent = st.wired[f.id] === 'nc' ? `${f.name} NC` : f.name;
      fl.name.classList.toggle('lw-nc', st.wired[f.id] === 'nc');
      // Up: tipped up, riding the surface near its tether's reach. Down: hanging, nose down.
      const fy = up ? Math.max(fl.y - 8, y) : fl.y + 6;
      fl.g.setAttribute('transform', `translate(${fl.x + (up ? 8 : 0)} ${fy}) rotate(${up ? -25 : 75})`);
      fl.g.setAttribute('class', up ? 'lw-up' : '');
      fl.cable.setAttribute('x2', fl.x + (up ? 2 : 0));
      fl.cable.setAttribute('y2', fy);
    });
    pumps.forEach((p, i) => {
      p.flow.style.display = st.m[i] ? '' : 'none';
      p.body.classList.toggle('lw-run', st.m[i]);
      p.body.classList.toggle('lw-trip', st.ol[i]);
      p.tag.textContent = st.ol[i] ? 'Tripped' : st.m[i] ? 'Running' : st.alt === i ? 'Leads next' : '';
    });
  }
  return { svg, update };
}

// ---- Contacts and loads, shared by the power side and the ladder ----
// A contact on a wire at y, from x to x + 50; its plates at x+17 and x+33.
function contact(g, x, y, kind, label) {
  const shut = s('rect', { x: x + 17, y: y - 3, width: 16, height: 6, class: 'ld-shut' });
  g.append(shut);
  if (kind === 'pb') {
    g.append(s('circle', { cx: x + 17, cy: y, r: 3, class: 'wire' }), s('circle', { cx: x + 33, cy: y, r: 3, class: 'wire' }));
    g.append(s('path', { d: `M${x + 13} ${y - 9} H${x + 37} M${x + 25} ${y - 9} V${y - 15}`, class: 'wire' }));
  } else {
    g.append(s('line', { x1: x + 17, y1: y - 9, x2: x + 17, y2: y + 9, class: 'wire' }));
    g.append(s('line', { x1: x + 33, y1: y - 9, x2: x + 33, y2: y + 9, class: 'wire' }));
  }
  if (kind === 'nc') g.append(s('line', { x1: x + 12, y1: y + 10, x2: x + 38, y2: y - 10, class: 'wire' }));
  // A float's slash shows only while it is wired normally closed.
  const slash = kind === 'float' ? s('line', { x1: x + 12, y1: y + 10, x2: x + 38, y2: y - 10, class: 'wire' }) : null;
  if (slash) g.append(slash, s('path', { d: `M${x + 25} ${y + 3} V${y + 9}`, class: 'wire' }), s('circle', { cx: x + 25, cy: y + 12, r: 3, class: 'wire' }));
  g.append(s('text', { x: x + 25, y: y - (kind === 'pb' ? 19 : 13), class: 'ld-text', 'text-anchor': 'middle' }, label));
  return { shut, slash };
}

function load(g, x, y, kind, label) {
  const cx = x + 25;
  let body;
  if (kind === 'horn') {
    body = s('path', { d: `M${cx - 10} ${y - 5} H${cx - 4} L${cx + 8} ${y - 12} V${y + 12} L${cx - 4} ${y + 5} H${cx - 10} Z`, class: 'wire ld-load' });
    const lead = s('line', { x1: x, y1: y, x2: cx - 10, y2: y, class: 'wire' });
    g.append(lead, s('line', { x1: cx + 8, y1: y, x2: x + 50, y2: y, class: 'wire' }), body);
    g.append(s('text', { x: cx, y: y - 15, class: 'ld-text', 'text-anchor': 'middle' }, label));
    return { body, lead };
  }
  body = s('circle', { cx, cy: y, r: 13, class: `wire ld-load${kind === 'light' ? ' ld-red' : ''}` });
  const lead = s('line', { x1: x, y1: y, x2: cx - 13, y2: y, class: 'wire' });
  g.append(lead, s('line', { x1: cx + 13, y1: y, x2: x + 50, y2: y, class: 'wire' }), body);
  g.append(s('text', { x: cx, y: y + 4, class: 'ld-text ld-in', 'text-anchor': 'middle' }, label));
  return { body, lead };
}

// ---- The ladder: every rung of core/lift.js LADDER, live ----
const RH = 44, EW = 50, L1 = 14, L2 = 346;

export function ladderArt() {
  const svg = s('svg', { class: 'pipe ladder lift-ladder', role: 'img', 'aria-label': 'The control circuit as a ladder diagram, lit where power reaches' });
  const wires = []; // [line, node]
  const contacts = []; // [shut rect, closed(s)]
  const slashes = []; // [NC slash, which float]: drawn only while that float is wired normally closed
  const loads = []; // [body, on(s)]
  const edges = []; // [a, b, closed(s)]: contacts join nodes when closed
  const parent = [];
  const node = () => (parent.push(parent.length), parent.length - 1);
  const find = (n) => (parent[n] === n ? n : (parent[n] = find(parent[n])));
  const wire = (x1, y1, x2, y2, n) => {
    const l = s('line', { x1, y1, x2, y2, class: 'wire' });
    svg.append(l);
    wires.push([l, n]);
  };
  const rows = (seq) => Math.max(1, ...seq.map((x) => (x.par ? x.par.reduce((t, b) => t + rows(b), 0) : 1)));
  const width = (seq) => seq.reduce((t, x) => t + (x.par ? Math.max(...x.par.map(width)) : EW), 0);
  const rail = node();

  // Lay a run of contacts out from x on row y, starting at node n; return the node it ends on.
  function lay(seq, x, y, n) {
    for (const item of seq) {
      if (item.par) {
        const w = Math.max(...item.par.map(width));
        const out = node();
        let by = y;
        for (const b of item.par) {
          if (by !== y) { wire(x, y, x, by, n); svg.append(s('circle', { cx: x, cy: y, r: 3, class: 'dot' })); }
          const end = lay(b, x, by, n);
          const bw = width(b);
          if (bw < w) wire(x + bw, by, x + w, by, end);
          parent[find(end)] = find(out);
          if (by !== y) { wire(x + w, by, x + w, y, out); svg.append(s('circle', { cx: x + w, cy: y, r: 3, class: 'dot' })); }
          by += rows(b) * RH;
        }
        x += w;
        n = out;
      } else {
        const out = node();
        wire(x, y, x + 17, y, n);
        wire(x + 33, y, x + EW, y, out);
        const { shut, slash } = contact(svg, x, y, item.k, item.label);
        contacts.push([shut, item.closed]);
        if (slash) slashes.push([slash, item.float]);
        edges.push([n, out, item.closed]);
        x += EW;
        n = out;
      }
    }
    return n;
  }

  let y = 22;
  for (const rung of LADDER) {
    y += 44;
    svg.append(s('text', { x: L1 + 6, y: y - 30, class: 'ld-title' }, rung.title));
    const end = lay(rung.seq, L1, y, rail);
    wire(L1 + width(rung.seq), y, L2 - EW, y, end);
    const { body, lead } = load(svg, L2 - EW, y, rung.load.k, rung.load.label);
    wires.push([lead, end]);
    loads.push([body, rung.load.on]);
    y += rows(rung.seq) * RH - RH + 12;
  }
  const H = y + 10;
  svg.setAttribute('viewBox', `0 0 360 ${H}`);
  const railL = s('line', { x1: L1, y1: 4, x2: L1, y2: H, class: 'wire ld-live' });
  svg.prepend(railL, s('line', { x1: L2, y1: 4, x2: L2, y2: H, class: 'wire' }));
  svg.prepend(s('text', { x: L1 + 4, y: 12, class: 'ld-title' }, 'L1 (120 V)'), s('text', { x: L2 - 4, y: 12, class: 'ld-title', 'text-anchor': 'end' }, 'L2'));

  function update(st) {
    // Power spreads from L1 across every closed contact; loads stop it.
    const live = new Set([find(rail)]);
    for (let grew = true; grew;) {
      grew = false;
      for (const [a, b, closed] of edges) {
        if (!closed(st)) continue;
        const [ra, rb] = [find(a), find(b)];
        if (live.has(ra) !== live.has(rb)) { live.add(ra); live.add(rb); grew = true; }
      }
    }
    for (const [l, n] of wires) l.classList.toggle('ld-live', live.has(find(n)));
    for (const [r, closed] of contacts) r.classList.toggle('on', closed(st));
    for (const [l, id] of slashes) l.style.display = st.wired[id] === 'nc' ? '' : 'none';
    for (const [b, on] of loads) b.classList.toggle('on', on(st));
  }
  return { svg, update };
}

// ---- The power side: 480 V three phase through each starter to its motor ----
export function powerArt() {
  const svg = s('svg', { viewBox: '0 0 360 190', class: 'pipe ladder lift-power', role: 'img',
    'aria-label': 'Power side: three-phase lines feed each motor through its starter contacts and overload heaters; a control transformer makes 120 volts for the ladder' });
  const bus = [26, 38, 50];
  ['L1', 'L2', 'L3'].forEach((t, k) => {
    svg.append(s('line', { x1: 14, y1: bus[k], x2: 346, y2: bus[k], class: 'wire ld-live' }));
    svg.append(s('text', { x: 4, y: bus[k] + 4, class: 'ld-text' }, t));
  });
  svg.append(s('text', { x: 346, y: 16, class: 'ld-title', 'text-anchor': 'end' }, '480 V, 3 phase'));
  // Control transformer across L1 and L2.
  svg.append(s('path', { d: 'M40 26 V70 M52 38 V70', class: 'wire ld-live' }), s('circle', { cx: 40, cy: 26, r: 3, class: 'dot' }), s('circle', { cx: 52, cy: 38, r: 3, class: 'dot' }));
  svg.append(s('rect', { x: 30, y: 70, width: 32, height: 30, rx: 3, class: 'wire ld-box' }), s('text', { x: 46, y: 89, class: 'ld-text', 'text-anchor': 'middle' }, 'CPT'));
  svg.append(s('path', { d: 'M46 100 V128', class: 'wire ld-live' }));
  svg.append(s('text', { x: 46, y: 142, class: 'ld-text', 'text-anchor': 'middle' }, '120 V'), s('text', { x: 46, y: 155, class: 'ld-text', 'text-anchor': 'middle' }, 'to ladder'));

  const parts = [140, 270].map((cx, i) => {
    const below = [];
    const shuts = [];
    [-18, 0, 18].forEach((dx, k) => {
      const x = cx + dx;
      svg.append(s('line', { x1: x, y1: bus[k], x2: x, y2: 74, class: 'wire ld-live' }), s('circle', { cx: x, cy: bus[k], r: 3, class: 'dot' }));
      const shut = s('rect', { x: x - 3, y: 74, width: 6, height: 14, class: 'ld-shut' });
      shuts.push(shut);
      svg.append(shut, s('line', { x1: x - 8, y1: 74, x2: x + 8, y2: 74, class: 'wire' }), s('line', { x1: x - 8, y1: 88, x2: x + 8, y2: 88, class: 'wire' }));
      const l = s('path', { d: `M${x} 88 V104 q6 4 0 8 q-6 4 0 8 V${140 - (k === 1 ? 0 : 4)} L${cx} 146`, class: 'wire' });
      below.push(l);
      svg.append(l);
    });
    svg.append(s('text', { x: cx + 30, y: 85, class: 'ld-text' }, `M${i + 1}`), s('text', { x: cx + 30, y: 116, class: 'ld-text' }, `OL${i + 1}`));
    const motor = s('circle', { cx, cy: 162, r: 16, class: 'wire ld-load' });
    svg.append(motor, s('text', { x: cx, y: 167, class: 'ld-text ld-in', 'text-anchor': 'middle' }, 'MTR'), s('text', { x: cx + 22, y: 172, class: 'ld-text' }, `Pump ${i + 1}`));
    return { below, shuts, motor };
  });

  function update(st) {
    parts.forEach((p, i) => {
      for (const l of p.below) l.classList.toggle('ld-live', st.m[i]);
      for (const r of p.shuts) r.classList.toggle('on', st.m[i]);
      p.motor.classList.toggle('on', st.m[i]);
    });
  }
  return { svg, update };
}
