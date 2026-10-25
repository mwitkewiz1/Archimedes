// diodeart.js — the Diodes tool's drawings: a battery, diode and lamp; the part
// and its stripe; an LED's legs; a relay coil with its flyback diode and the
// kick at the switch; a bridge rectifier, animated, with its waves.
// Live wires (where current is flowing) carry class "live" and crawl the way it flows.

import { switchVolts, rectify } from '../core/diode.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}
const text = (x, y, words, cls = 'lbl', anchor = 'middle') => s('text', { x, y, class: cls, 'text-anchor': anchor }, words);

// A diode symbol from (x1, y1), its + end, to (x2, y2), its stripe end: the arrow points the way current passes.
function diodeSym(x1, y1, x2, y2, cls = '') {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const m = len / 2;
  const g = s('g', { transform: `translate(${x1} ${y1}) rotate(${deg})`, class: `diode ${cls}` });
  g.append(s('path', { d: `M0 0 H${m - 9} M${m + 9} 0 H${len} M${m + 9} -10 V10`, class: 'wire' }));
  g.append(s('path', { d: `M${m - 9} -10 L${m + 9} 0 L${m - 9} 10 Z`, class: 'tri' }));
  return g;
}

// Battery, diode and lamp in a loop. back: the diode turned round.
export function oneWay(back) {
  const svg = s('svg', { viewBox: '0 0 340 150', class: 'pipe rd-art', role: 'img',
    'aria-label': back ? 'Diode turned against the battery: no current, lamp dark' : 'Diode with the battery: current flows, lamp lit' });
  const LOOP = 'M50 62 V30 H125 M215 30 H290 V58 M290 92 V120 H50 V82'; // from + round to −
  svg.append(s('path', { d: LOOP, class: 'wire' }));
  if (!back) svg.append(s('path', { d: LOOP, class: 'live' }));
  // Battery: long plate +.
  svg.append(s('path', { d: 'M34 62 H66 M42 82 H58', class: 'wire' }), s('path', { d: 'M42 82 H58', class: 'wire thick' }));
  svg.append(text(24, 60, '+'), text(24, 92, '−'), text(16, 140, '12 V battery', 'lbl', 'start'));
  svg.append(back ? diodeSym(215, 30, 125, 30) : diodeSym(125, 30, 215, 30, 'live'));
  svg.append(text(170, 62, back ? '12 V across it: blocked' : '0.7 V across it'));
  // Lamp.
  svg.append(s('circle', { cx: 290, cy: 75, r: 17, class: back ? 'lamp-off' : 'lamp-on' }));
  svg.append(s('path', { d: 'M278 63 L302 87 M302 63 L278 87', class: 'wire' }));
  svg.append(text(330, 140, back ? 'lamp: 0 V, dark' : 'lamp: 11.3 V, lit', 'lbl', 'end'));
  return svg;
}

// The part as it comes, its symbol under it, ends lined up.
export function whichEnd() {
  const svg = s('svg', { viewBox: '0 0 340 132', class: 'pipe rd-art', role: 'img', 'aria-label': 'A diode: the stripe end is the bar of the symbol, the − end' });
  svg.append(s('line', { x1: 20, y1: 34, x2: 320, y2: 34, class: 'lead' }));
  svg.append(s('rect', { x: 120, y: 20, width: 100, height: 28, rx: 5, class: 'dbody' }));
  svg.append(s('rect', { x: 196, y: 20, width: 10, height: 28, class: 'dstripe' }));
  // The symbol drawn by hand so its bar sits right under the stripe.
  svg.append(s('path', { d: 'M20 86 H183 M201 86 H320 M201 76 V96', class: 'wire' }), s('path', { d: 'M183 76 L201 86 L183 96 Z', class: 'tri' }));
  svg.append(text(60, 70, '+ end (anode)'), text(280, 70, '− end (cathode)'));
  svg.append(text(170, 124, 'the stripe is the bar: current flows toward it'));
  return svg;
}

// An LED: long leg +, short leg and flat rim −.
export function ledLegs() {
  const svg = s('svg', { viewBox: '0 0 340 120', class: 'pipe rd-art', role: 'img', 'aria-label': 'An LED: the long leg is +, the short leg by the flat side is −' });
  svg.append(s('path', { d: 'M152 72 V38 A18 18 0 0 1 188 38 V72 Z', class: 'led' }));
  svg.append(s('path', { d: 'M146 72 H188 V78 H146 Z', class: 'led' }));
  svg.append(s('path', { d: 'M162 78 V114 M178 78 V100', class: 'lead' }));
  svg.append(text(140, 108, '+ long leg', 'lbl', 'end'), text(196, 96, '− short leg', 'lbl', 'start'), text(196, 70, 'flat side is −', 'lbl', 'start'));
  return svg;
}

// A DC relay coil on a switch, its flyback diode across it. mode: 'in', 'none',
// 'backwards'. on: switch closed. after: just switched off (the coil's current coasting or sparking).
export function flyback(mode, on, after) {
  const svg = s('svg', { viewBox: '0 0 340 176', class: 'pipe rd-art', role: 'img', 'aria-label': flyLabel(mode, on, after) });
  const blown = mode === 'backwards' && on;
  svg.append(text(16, 34, '+24 V', 'lbl', 'start'), text(16, 164, '0 V', 'lbl', 'start'));
  // Fuse on the + side.
  svg.append(s('path', { d: 'M56 30 H84 M116 30 H160 M206 30 H250 V72 M250 108 V160 H56', class: 'wire' }));
  svg.append(s('rect', { x: 84, y: 22, width: 32, height: 16, rx: 3, class: blown ? 'fuse-blown' : 'fuse-ok' }));
  svg.append(text(100, 54, blown ? 'fuse blown' : 'fuse', blown ? 'lbl bad' : 'lbl'));
  // The switch: a contact or a PLC output.
  svg.append(s('circle', { cx: 160, cy: 30, r: 3, class: 'dotf' }), s('circle', { cx: 206, cy: 30, r: 3, class: 'dotf' }));
  svg.append(s('path', { d: on ? 'M160 30 L206 30' : 'M160 30 L200 12', class: 'wire' }));
  svg.append(text(183, 58, 'switch'));
  if (after && mode === 'none') svg.append(s('path', { d: 'M184 22 l6 6 l-6 3 l7 6 l-5 2 l9 4', class: 'spark' }));
  // The coil, ladder style, and the diode across it.
  svg.append(s('circle', { cx: 250, cy: 90, r: 18, class: 'coil' }), text(250, 95, 'CR', 'sym'));
  svg.append(s('path', { d: 'M250 46 H300 M300 134 H250', class: 'wire' }), s('circle', { cx: 250, cy: 46, r: 3.5, class: 'dotf' }), s('circle', { cx: 250, cy: 134, r: 3.5, class: 'dotf' }));
  if (mode !== 'none') svg.append(mode === 'in' ? diodeSym(300, 134, 300, 46, after ? 'live' : '') : diodeSym(300, 46, 300, 134, blown ? 'short' : ''));
  else svg.append(s('path', { d: 'M300 46 V70 M300 110 V134', class: 'wire faint' }));
  svg.append(text(214, 94, 'coil', 'lbl', 'end'));
  svg.append(text(326, 30, mode === 'none' ? 'no diode' : mode === 'in' ? 'stripe to +' : 'stripe to −', 'lbl', 'end'));
  // Where the current goes.
  if (on && !blown) svg.append(s('path', { d: 'M56 30 H84 M116 30 H250 V72 M250 108 V160 H56', class: 'live' }));
  if (blown) svg.append(s('path', { d: 'M56 30 H84 M116 30 H250 V46 H300 M300 134 H250 V160 H56', class: 'live bad' }));
  if (after && mode === 'in') svg.append(s('path', { d: 'M250 46 V72 M250 108 V134 H300 M300 46 H250', class: 'live' }));
  return svg;
}

function flyLabel(mode, on, after) {
  if (mode === 'backwards' && on) return 'Diode in backwards: it shorts the supply and the fuse blows';
  if (on) return 'Switch on: current through the coil';
  if (after && mode === 'in') return 'Switched off: the coil\'s current coasts round the diode';
  if (after) return 'Switched off with no diode: a spark at the switch';
  return 'Switch off';
}

// Volts across the switch as it opens, against time. Off the top: hundreds of volts.
export function kickTrace(mode, supply) {
  const svg = s('svg', { viewBox: '0 0 340 110', class: 'pipe rd-art', role: 'img', 'aria-label': 'Volts across the switch as it opens' });
  const X0 = 40, X1 = 330, Y0 = 92, TOP = 10, PER = 2.2; // px per volt
  const x = (t) => X0 + ((t + 1) / 5) * (X1 - X0);
  const y = (v) => Math.max(TOP, Y0 - v * PER);
  svg.append(s('path', { d: `M${X0} ${Y0} H${X1} M${X0} ${TOP} V${Y0}`, class: 'axis' }));
  svg.append(s('path', { d: `M${X0} ${y(supply)} H${X1}`, class: 'ref' }));
  svg.append(text(X0 - 4, y(supply) + 4, `${supply} V`, 'dim', 'end'), text(X0 - 4, Y0 + 4, '0', 'dim', 'end'));
  svg.append(s('path', { d: `M${x(0)} ${Y0} V${Y0 + 6}`, class: 'axis' }), text(x(0), 106, 'switch opens', 'dim'));
  if (mode === 'backwards') {
    svg.append(text(185, 55, 'no kick: the fuse blew when it switched on', 'lbl bad'));
    return svg;
  }
  const pts = [];
  for (let k = 0; k <= 200; k++) {
    const t = -1 + (5 * k) / 200;
    pts.push(`${x(t).toFixed(1)} ${y(switchVolts(mode, supply, t)).toFixed(1)}`);
  }
  svg.append(s('path', { d: `M${pts.join(' L')}`, class: mode === 'none' ? 'trace bad' : 'trace' }));
  svg.append(text(x(1), TOP + 12, mode === 'none' ? 'hundreds of volts, off the top' : `${supply + 0.7} V: just over the supply`, mode === 'none' ? 'lbl bad' : 'lbl', 'start'));
  return svg;
}

// A bridge rectifier (or one diode) feeding a load, with its in and out waves.
// update(kind, t) moves the current and the waves; t in cycles.
export function bridge() {
  const svg = s('svg', { viewBox: '0 0 340 290', class: 'pipe rd-art', role: 'img', 'aria-label': 'AC in, the diodes, and DC out to a load, with the waves in and out' });
  // AC in.
  svg.append(s('circle', { cx: 40, cy: 100, r: 16, class: 'coil' }), s('path', { d: 'M30 100 q5 -10 10 0 t10 0', class: 'wire' }));
  svg.append(text(40, 202, 'AC in'));
  const acA = s('path', { d: 'M40 84 V40 H150', class: 'wire' });
  const acB = s('path', { d: 'M40 116 V160 H150', class: 'wire' });
  svg.append(acA, acB);
  // The four diodes, each pointing toward + (right node).
  const dTop = diodeSym(150, 40, 205, 100), dBot = diodeSym(150, 160, 205, 100);
  const dLT = diodeSym(95, 100, 150, 40), dLB = diodeSym(95, 100, 150, 160);
  const plain = s('path', { d: 'M95 100 L150 160', class: 'wire' }); // stands in for dLB with one diode
  svg.append(dTop, dBot, dLT, dLB, plain);
  svg.append(text(214, 92, '+', 'sym', 'start'), text(86, 92, '−', 'sym', 'end'));
  // The load, its wires (the − one hops the AC wire), and a capacitor across it.
  const LOAD = 'M205 100 H290 V118 l7 3 l-14 6 l14 6 l-14 6 l14 6 l-14 6 l7 3 V185 H95 V168 A8 8 0 0 1 95 152 V100';
  svg.append(s('path', { d: LOAD, class: 'wire' }), text(304, 145, 'load', 'lbl', 'start'));
  const cap = s('g');
  cap.append(s('path', { d: 'M250 100 V138 M236 138 H264 M236 146 H264 M250 146 V185', class: 'wire' }));
  cap.append(s('circle', { cx: 250, cy: 100, r: 3.5, class: 'dotf' }), s('circle', { cx: 250, cy: 185, r: 3.5, class: 'dotf' }), text(236, 170, 'capacitor', 'lbl', 'end'));
  svg.append(cap);
  // Live overlays: one per path, drawn the way the current goes.
  const live = {
    a: s('path', { class: 'live' }), // the diodes on the way light up themselves
    b: s('path', { d: 'M40 116 V160 H150 M150 40 H40 V84', class: 'live' }),
    load: s('path', { d: LOAD, class: 'live' }),
  };
  svg.append(live.a, live.b, live.load);
  // Waves: AC in thin, DC out thick, newest at the right.
  const W0 = 40, W1 = 320, MID = 254, AMP = 28;
  svg.append(s('path', { d: `M${W0} ${MID} H${W1}`, class: 'axis' }));
  svg.append(text(W0 - 4, MID - AMP + 4, '+', 'dim', 'end'), text(W0 - 4, MID + AMP + 4, '−', 'dim', 'end'));
  const inWave = s('path', { class: 'trace-in' }), outWave = s('path', { class: 'trace' });
  svg.append(inWave, outWave, text(W1, 216, 'AC in (thin), DC out (thick)', 'dim', 'end'));

  function update(kind, t) {
    const one = kind === 'half';
    for (const d of [dBot, dLT, dLB]) d.style.display = one ? 'none' : '';
    plain.style.display = one ? '' : 'none';
    cap.style.display = kind === 'cap' ? '' : 'none';
    const now = rectify(kind, t);
    live.a.setAttribute('d', one ? 'M40 84 V40 H150 M95 100 L150 160 H40 V116' : 'M40 84 V40 H150 M150 160 H40 V116');
    live.a.style.display = now.path === 'a' ? '' : 'none';
    live.b.style.display = now.path === 'b' ? '' : 'none';
    live.load.style.display = now.out > 0.02 ? '' : 'none';
    dTop.classList.toggle('live', now.path === 'a');
    dLB.classList.toggle('live', now.path === 'a');
    dBot.classList.toggle('live', now.path === 'b');
    dLT.classList.toggle('live', now.path === 'b');
    const a = [], b = [];
    for (let i = 0; i <= 90; i++) {
      const tt = t - 1.5 + (1.5 * i) / 90;
      const r = rectify(kind, tt);
      const px = (W0 + ((W1 - W0) * i) / 90).toFixed(1);
      a.push(`${px} ${(MID - r.vin * AMP).toFixed(1)}`);
      b.push(`${px} ${(MID - r.out * AMP).toFixed(1)}`);
    }
    inWave.setAttribute('d', `M${a.join(' L')}`);
    outWave.setAttribute('d', `M${b.join(' L')}`);
  }
  return { svg, update };
}
