// wire.js — copper wire size for a load: the smallest wire that both carries the
// amps safely (NEC 310.16 / 240.4(D)) and keeps voltage drop under a limit over
// the run. Covers DC, single phase and three phase. Pure: no DOM, no storage.
//
// Not covered here, and said so on screen: more than 3 current-carrying wires in
// one conduit, hot spaces (derating), aluminum, conduit fill, ground size.

// Each size: name, ohms per 1000 ft (NEC Ch. 9 Table 8, stranded uncoated copper,
// 75 °C), amps at 60 °C and 75 °C (Table 310.16, copper), and the most a breaker
// may be (240.4(D)) where the code caps small wire. 18 and 16 are fixture/control
// wire (Table 402.5), offered only on DC.
export const SIZES = [
  { name: '18 AWG', ohmsPerK: 7.95, a60: 6, a75: 6, dcOnly: true },
  { name: '16 AWG', ohmsPerK: 4.99, a60: 8, a75: 8, dcOnly: true },
  { name: '14 AWG', ohmsPerK: 3.14, a60: 15, a75: 20, cap: 15 },
  { name: '12 AWG', ohmsPerK: 1.98, a60: 20, a75: 25, cap: 20 },
  { name: '10 AWG', ohmsPerK: 1.24, a60: 30, a75: 35, cap: 30 },
  { name: '8 AWG', ohmsPerK: 0.778, a60: 40, a75: 50 },
  { name: '6 AWG', ohmsPerK: 0.491, a60: 55, a75: 65 },
  { name: '4 AWG', ohmsPerK: 0.308, a60: 70, a75: 85 },
  { name: '3 AWG', ohmsPerK: 0.245, a60: 85, a75: 100 },
  { name: '2 AWG', ohmsPerK: 0.194, a60: 95, a75: 115 },
  { name: '1 AWG', ohmsPerK: 0.154, a60: 110, a75: 130 },
  { name: '1/0', ohmsPerK: 0.122, a60: 125, a75: 150, big: true },
  { name: '2/0', ohmsPerK: 0.0967, a60: 145, a75: 175, big: true },
  { name: '3/0', ohmsPerK: 0.0766, a60: 165, a75: 200, big: true },
  { name: '4/0', ohmsPerK: 0.0608, a60: 195, a75: 230, big: true },
  { name: '250 kcmil', ohmsPerK: 0.0515, a60: 215, a75: 255, big: true },
  { name: '300 kcmil', ohmsPerK: 0.0429, a60: 240, a75: 285, big: true },
  { name: '350 kcmil', ohmsPerK: 0.0367, a60: 260, a75: 310, big: true },
  { name: '400 kcmil', ohmsPerK: 0.0321, a60: 280, a75: 335, big: true },
  { name: '500 kcmil', ohmsPerK: 0.0258, a60: 320, a75: 380, big: true },
];

export const SYSTEMS = [
  { id: 'dc12', label: '12 V DC', volts: 12, kind: 'dc' },
  { id: 'dc24', label: '24 V DC', volts: 24, kind: 'dc' },
  { id: 'ac120', label: '120 V', volts: 120, kind: '1ph' },
  { id: 'ac240', label: '240 V single phase', volts: 240, kind: '1ph' },
  { id: 'ac208', label: '208 V three phase', volts: 208, kind: '3ph' },
  { id: 'ac480', label: '480 V three phase (motor plate says 460)', volts: 480, kind: '3ph' },
  { id: 'ac575', label: '575 V three phase (600 V supply)', volts: 575, kind: '3ph' },
];

// How many wire-lengths the current runs through: out and back is 2; three
// phase shares the return among the phases, which works out to √3.
export const LOOP = { dc: 2, '1ph': 2, '3ph': Math.sqrt(3) };

// Safe amps for a size: the code's default is the 60 °C column up to 1 AWG on
// circuits of 100 A or less, 75 °C above that; small wire is capped by 240.4(D).
export function safeAmps(size) {
  const amps = size.big ? size.a75 : size.a60;
  return size.cap ? Math.min(amps, size.cap) : amps;
}

// Volts lost over a run of `feet` (one way) at `amps` on a size.
export function dropVolts(size, amps, feet, kind) {
  return LOOP[kind] * feet * amps * size.ohmsPerK / 1000;
}

// job: { system (id) or sys ({ volts, kind, label }), amps, feet (one way), continuous (bool), maxDrop (0.03) }.
// Returns { ok, size, sizeAmps, designAmps, drop, dropPct, decidedBy, smaller }
// or { ok: false, error }. decidedBy is 'amps' or 'drop': which check set the size.
// smaller says why the next size down fails.
export function pickWire(job) {
  const sys = job.sys || SYSTEMS.find((s) => s.id === job.system);
  if (!sys) return { ok: false, error: 'Pick what the circuit runs on.' };
  if (!(job.amps > 0)) return { ok: false, error: 'Type the amps the load pulls (on its nameplate).' };
  if (!(job.feet > 0)) return { ok: false, error: 'Type how far the wire runs, one way, in feet.' };
  const maxDrop = job.maxDrop || 0.03;
  const designAmps = job.continuous ? job.amps * 1.25 : job.amps;
  const sizes = SIZES.filter((s) => sys.kind === 'dc' || !s.dcOnly);

  const check = (size) => {
    const drop = dropVolts(size, job.amps, job.feet, sys.kind);
    return { size, ampsOk: safeAmps(size) >= designAmps, dropOk: drop / sys.volts <= maxDrop, drop };
  };
  const results = sizes.map(check);
  const i = results.findIndex((r) => r.ampsOk && r.dropOk);
  if (i < 0) {
    const ampsOnly = results.some((r) => r.ampsOk);
    return { ok: false, error: ampsOnly
      ? `Even 500 kcmil loses more than ${maxDrop * 100}% over ${job.feet} ft. Run a higher voltage, parallel wires, or move the supply closer.`
      : `${round(designAmps)} A is more than 500 kcmil carries. That is a feeder job for an electrician.` };
  }
  const r = results[i];
  const firstAmpsOk = results.findIndex((x) => x.ampsOk);
  const below = i > 0 ? results[i - 1] : null;
  return {
    ok: true,
    system: sys,
    size: r.size,
    sizeAmps: safeAmps(r.size),
    designAmps,
    drop: r.drop,
    dropPct: r.drop / sys.volts,
    atLoad: sys.volts - r.drop,
    decidedBy: firstAmpsOk === i ? 'amps' : 'drop',
    smaller: below && {
      size: below.size,
      why: !below.ampsOk ? 'amps' : 'drop',
      sizeAmps: safeAmps(below.size),
      dropPct: below.drop / sys.volts,
    },
  };
}

const round = (x) => Math.round(x * 10) / 10;
