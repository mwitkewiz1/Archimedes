// adjust.js — a pressure reducing valve over a minute of a working day, to
// show what its three adjustments do: the setpoint screw, and the opening and
// closing speed needles. A toy with the right shape, not a valve maker's
// numbers. Pure: no DOM.
//
// What it models: the valve's opening (0..1) passes flow by its Cv against the
// pressure drop. Downstream is a run of pipe and taps: pressure rises when more
// goes in than is used, falls when less does. The pilot feels downstream
// pressure a moment late (the sensing tube and the pilot's own spring and
// diaphragm), and moves the main valve at a speed the needles limit. Water
// hammer: the inlet jumps when the flow through the valve is cut quickly.

const INLET = 120;          // psi, the street side
const CV = 200;             // gpm at 1 psi drop, wide open (about a 4" globe)
const STORE = 300;         // gpm for each psi/second change downstream: how much the pipe and taps cushion it
const LAG = 0.8;           // seconds the pilot runs behind the real downstream pressure
const GAIN = 1.2;          // per psi off the setting, of full speed
const HAMMER = 0.012;      // psi of inlet jump for each gpm/second the flow is cut
export const DT = 0.05, SECONDS = 60;

// Demand at the nominal 60 psi, gpm: quiet, a big draw (taps opening over a
// few seconds), quiet again (taps shutting).
const LOW = 80, HIGH = 600;
export function demand(t) {
  if (t < 12) return LOW;
  if (t < 15) return LOW + (HIGH - LOW) * (t - 12) / 3;
  if (t < 34) return HIGH;
  if (t < 37) return HIGH - (HIGH - LOW) * (t - 34) / 3;
  return LOW;
}

// Needle settings 1 (slowest) to 5 (fastest) → seconds for a full stroke.
export const STROKE = { 1: 30, 2: 12, 3: 5, 4: 2, 5: 0.6 };

export function simulate({ set = 60, open = 3, close = 3 } = {}, tune = {}) {
  const { store = STORE, lag = LAG, gain = GAIN, hammer = HAMMER, stroke = STROKE } = tune;
  const tOpen = stroke[open], tClose = stroke[close];
  let x = 0.07, p2 = set, felt = set, lastQ = null, surge = 0;
  const out = [];
  for (let k = 0; k * DT <= SECONDS + 1e-9; k++) {
    const t = k * DT;
    const p1 = INLET + surge;
    const q = CV * x * Math.sqrt(Math.max(p1 - p2, 0));
    const used = demand(t) * Math.sqrt(Math.max(p2, 0) / 60);
    p2 = Math.max(0, p2 + ((q - used) / store) * DT);
    felt += ((p2 - felt) / lag) * DT;
    const err = set - felt; // + : low, open up
    const speed = Math.max(-1, Math.min(1, err * gain));
    x += speed > 0 ? (speed / tOpen) * DT : (speed / tClose) * DT;
    x = Math.max(0, Math.min(1, x));
    const dq = lastQ == null ? 0 : (q - lastQ) / DT;
    lastQ = q;
    surge = Math.max(surge * 0.9, -dq * hammer); // a cut flow kicks the inlet up; it dies away
    out.push({ t, p1, p2, x, q });
  }
  return out;
}

// What the trace shows, from the numbers: how many times it swings round the
// setting, the lowest it sags when the big draw starts, the highest it creeps
// when the draw stops, and the biggest jump on the inlet.
export function judge(run, set) {
  const after = (a, b) => run.filter((r) => r.t >= a && r.t < b);
  let crossings = 0, prev = 0;
  for (const r of after(14, 34)) {
    const side = r.p2 > set + 1 ? 1 : r.p2 < set - 1 ? -1 : 0;
    if (side && prev && side !== prev) crossings++;
    if (side) prev = side;
  }
  const sag = Math.min(...after(12, 34).map((r) => r.p2));
  const creep = Math.max(...after(34, 60).map((r) => r.p2));
  const hammer = Math.max(...run.map((r) => r.p1)) - INLET;
  return { swings: crossings, sag, creep, hammer, hunting: crossings >= 4 };
}

// The words for what judge() found.
export function sayAdjust(j, set, s) {
  const out = [];
  if (j.hunting) out.push(['bad', 'Hunting', `Downstream swings round ${set} psi ${j.swings} times: the valve moves too fast for the pilot to keep up, overshoots, then chases it back. Slow the opening speed first (needle clockwise), then the closing.`]);
  if (set - j.sag > 10) out.push(['bad', 'Sags on a big draw', `Downstream drops to ${Math.round(j.sag)} psi when the big draw starts: the valve opens too slowly to keep up. Open the opening-speed needle a little.`]);
  if (j.creep - set > 12) out.push(['bad', 'Overshoots when the draw stops', `Downstream climbs to ${Math.round(j.creep)} psi when the taps shut: the valve closes too slowly. Speed up the closing (needle counterclockwise).`]);
  if (j.hammer > 20) out.push(['bad', 'Hammers', `The inlet jumps ${Math.round(j.hammer)} psi when it shuts quickly: water hammer on the street side. Slow the closing speed.`]);
  if (!out.length) out.push(['ok', 'Steady', `Holds ${set} psi through the big draw and back, without hunting or slamming. This is the setting to leave.`]);
  return out;
}
