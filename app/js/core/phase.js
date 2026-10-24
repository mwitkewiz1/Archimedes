// phase.js — single and three phase: the waves, the magnetic field they make
// in a motor, the power they deliver; what each kind of service reads on a
// meter; and how far apart three readings are (imbalance). Pure: no DOM.

const TAU = Math.PI * 2;
const SHIFT = [0, TAU / 3, (2 * TAU) / 3]; // each leg peaks a third of a turn after the one before

// Volts on each leg at time t (in turns of the wave), as -1..1. Single phase has one
// wave (the second leg of a 240 V service is the same wave upside down: one phase, split).
// swap: L1 and L2 trade places. lost: L3's fuse is blown, so it carries nothing.
export function legs(mode, t, { swap = false, lost = false } = {}) {
  if (mode === 'one') return [Math.sin(TAU * t)];
  const v = SHIFT.map((s) => Math.sin(TAU * t - s));
  if (swap) [v[0], v[1]] = [v[1], v[0]];
  if (lost) v[2] = 0;
  return v;
}

// The currents in a three-phase motor's windings (wye, no neutral): with L3 open,
// L1 and L2 share one current, out on one and back on the other.
function currents(mode, t, opts) {
  const v = legs(mode, t, opts);
  if (mode === 'one') return v;
  if (opts && opts.lost) {
    const i = (v[0] - v[1]) / Math.sqrt(3);
    return [i, -i, 0];
  }
  return v;
}

// The magnetic field in the motor: each winding pushes along its own direction,
// a third of a turn apart round the motor. Returns { x, y }.
export function field(mode, t, opts) {
  const i = currents(mode, t, opts);
  if (mode === 'one') return { x: i[0] * 1.5, y: 0 };
  return i.reduce((f, a, k) => ({ x: f.x + a * Math.cos(SHIFT[k]), y: f.y + a * Math.sin(SHIFT[k]) }), { x: 0, y: 0 });
}

// Power delivered to a plain load (a heater) at time t, where 1 is the average.
export function power(mode, t, opts) {
  const i = currents(mode, t, opts);
  const full = mode === 'one' ? 0.5 : 1.5; // the average of the squares when nothing is wrong
  return i.reduce((p, a) => p + a * a, 0) / full;
}

// Services: what each reads leg to leg and leg to neutral (N) or ground.
// Wye leg-to-neutral is leg-to-leg ÷ √3. Readings within about 5% are normal.
export const SERVICES = [
  { id: 'split', name: '120/240 V single phase', where: 'Houses, small shops, most job trailers.',
    readings: [['L1 to L2', 240], ['L1 to N', 120], ['L2 to N', 120]],
    says: 'Two hot legs off one transformer coil with its middle grounded (neutral). It is one phase split in two, not two phases: 120 V from either leg to neutral, 240 V across both.' },
  { id: '208y', name: '208Y/120 V three phase', where: 'Commercial buildings, warehouses.',
    readings: [['L1 to L2', 208], ['L2 to L3', 208], ['L1 to L3', 208], ['Each leg to N', 120]],
    says: 'Wye: three coils joined at a center point that is the neutral. 120 V for outlets off any leg, 208 V across any two. A 230 V motor runs a little weak on it; check the plate says 208-230.' },
  { id: '480y', name: '480Y/277 V three phase', where: 'Industrial plants, bigger pump stations.',
    readings: [['L1 to L2', 480], ['L2 to L3', 480], ['L1 to L3', 480], ['Each leg to N', 277]],
    says: 'Wye at higher voltage. 277 V runs the lights; motors with a 460 V plate run on the 480. Same wire carries twice the power of 240, so big motors live here.' },
  { id: '600y', name: '600Y/347 V three phase', where: 'Canada mostly.',
    readings: [['L1 to L2', 600], ['L2 to L3', 600], ['L1 to L3', 600], ['Each leg to N', 347]],
    says: 'The Canadian version of 480Y/277. Motors with a 575 V plate run on it.' },
  { id: 'delta', name: '240 V or 480 V delta, no neutral', where: 'Older plants, some pump stations.',
    readings: [['L1 to L2', '240 or 480'], ['L2 to L3', '240 or 480'], ['L1 to L3', '240 or 480'], ['Leg to ground', 'varies']],
    says: 'Delta: three coils joined end to end in a triangle, no center point, so no neutral. Leg to leg is all that counts. If one corner is grounded (corner-grounded delta), that leg reads 0 V to ground; that is normal there, not a dead leg.' },
  { id: 'highleg', name: '240/120 V high-leg delta', where: 'Older shops and farms that need both 120 V and 3-phase.',
    readings: [['L1 to L2', 240], ['L2 to L3', 240], ['L1 to L3', 240], ['L1 to N', 120], ['L2 to N (wild leg)', 208], ['L3 to N', 120]],
    says: 'A delta with one coil center-tapped for a neutral. Two legs read 120 V to neutral; the third, the high or wild leg, reads about 208 V. The code marks it orange and puts it in the middle (B phase) of a panel. Never put a 120 V load on it.' },
];

// How far apart three readings are: the biggest gap from their average, as a
// percent of the average (the NEMA way).
export function imbalance(a, b, c) {
  const avg = (a + b + c) / 3;
  const dev = Math.max(Math.abs(a - avg), Math.abs(b - avg), Math.abs(c - avg));
  return { avg, dev, pct: (dev / avg) * 100 };
}

// How much of its rating a motor may carry on unbalanced volts (NEMA MG 1 derating
// curve: none at 0, 98% at 1%, 95% at 2%, 88% at 3%, 82% at 4%, 75% at 5%).
// Over 5% it should not run at all: null.
const CURVE = [[0, 1], [1, 0.98], [2, 0.95], [3, 0.88], [4, 0.82], [5, 0.75]];
export function derate(pct) {
  if (pct > 5) return null;
  const k = CURVE.findIndex(([p]) => p >= pct);
  if (k <= 0) return 1;
  const [p0, d0] = CURVE[k - 1], [p1, d1] = CURVE[k];
  return d0 + ((d1 - d0) * (pct - p0)) / (p1 - p0);
}

// Plain verdict. Volts: under 1% is fine, up to 2% watch it, over that find
// the cause. Amps run 6 to 10 times the volts' imbalance; motor makers allow about 5%.
export function verdict(pct, kind) {
  if (kind === 'amps') return pct <= 5 ? 'ok' : pct <= 10 ? 'watch' : 'bad';
  return pct <= 1 ? 'ok' : pct <= 2 ? 'watch' : 'bad';
}
