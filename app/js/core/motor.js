// motor.js — a pump motor's amps from its horsepower, volts and phase, by the
// code tables, and what that sizes: wire, the breaker's most, the overload
// setting and a generator to start it. Pure: no DOM, no storage.
//
// Full-load amps are the NEC's (Table 430.248, single phase; Table 430.250, three
// phase induction motors), which wire and breakers are sized from (430.6(A)(1)).
// Overloads are set from the nameplate's own amps instead (430.32).

// Each supply: what it is called (the motor's volts, then the supply's in brackets), the motor's volts (the column in the table) and phase.
export const SUPPLIES = [
  { id: '1ph115', label: '115 V, 1 phase', volts: 115, phase: 1 },
  { id: '1ph230', label: '230 V, 1 phase (240 V)', volts: 230, phase: 1 },
  { id: '3ph208', label: '208 V, 3 phase', volts: 208, phase: 3 },
  { id: '3ph230', label: '230 V, 3 phase (240 V)', volts: 230, phase: 3 },
  { id: '3ph460', label: '460 V, 3 phase (480 V)', volts: 460, phase: 3 },
  { id: '3ph575', label: '575 V, 3 phase (600 V)', volts: 575, phase: 3 },
];

// Horsepower as text (it is how the plate reads), then amps at 115, 208, 230 V.
const ONE = [
  ['1/6', 4.4, 2.4, 2.2], ['1/4', 5.8, 3.2, 2.9], ['1/3', 7.2, 4.0, 3.6], ['1/2', 9.8, 5.4, 4.9],
  ['3/4', 13.8, 7.6, 6.9], ['1', 16, 8.8, 8.0], ['1-1/2', 20, 11.0, 10], ['2', 24, 13.2, 12],
  ['3', 34, 18.7, 17], ['5', 56, 30.8, 28], ['7-1/2', 80, 44, 40], ['10', 100, 55, 50],
];
// Horsepower, then amps at 208, 230, 460, 575 V (null: not made at that voltage).
const THREE = [
  ['1/2', 2.4, 2.2, 1.1, 0.9], ['3/4', 3.5, 3.2, 1.6, 1.3], ['1', 4.6, 4.2, 2.1, 1.7],
  ['1-1/2', 6.6, 6.0, 3.0, 2.4], ['2', 7.5, 6.8, 3.4, 2.7], ['3', 10.6, 9.6, 4.8, 3.9],
  ['5', 16.7, 15.2, 7.6, 6.1], ['7-1/2', 24.2, 22, 11, 9], ['10', 30.8, 28, 14, 11],
  ['15', 46.2, 42, 21, 17], ['20', 59.4, 54, 27, 22], ['25', 74.8, 68, 34, 27],
  ['30', 88, 80, 40, 32], ['40', 114, 104, 52, 41], ['50', 143, 130, 65, 52],
  ['60', 169, 154, 77, 62], ['75', 211, 192, 96, 77], ['100', 273, 248, 124, 99],
  ['125', 343, 312, 156, 125], ['150', 396, 360, 180, 144], ['200', 528, 480, 240, 192],
  ['250', null, null, 302, 242], ['300', null, null, 361, 289], ['350', null, null, 414, 336],
  ['400', null, null, 477, 382], ['450', null, null, 515, 412], ['500', null, null, 590, 472],
];
const COL = { 1: { 115: 1, 208: 2, 230: 3 }, 3: { 208: 1, 230: 2, 460: 3, 575: 4 } };

// '7-1/2' → 7.5
export function hpValue(hp) {
  const m = /^(\d+)(?:-(\d+)\/(\d+))?$|^(\d+)\/(\d+)$/.exec(hp);
  if (!m) return NaN;
  return m[4] ? m[4] / m[5] : +m[1] + (m[2] ? m[2] / m[3] : 0);
}

export function supply(id) { return SUPPLIES.find((s) => s.id === id); }

// The horsepowers the table lists for a supply.
export function sizesFor(id) {
  const s = supply(id);
  const rows = s.phase === 1 ? ONE : THREE;
  return rows.filter((r) => r[COL[s.phase][s.volts]] != null).map((r) => r[0]);
}

// Full-load amps from the table, or null when it lists no such motor.
export function fullLoadAmps(hp, id) {
  const s = supply(id);
  if (!s) return null;
  const row = (s.phase === 1 ? ONE : THREE).find((r) => r[0] === hp);
  return row ? row[COL[s.phase][s.volts]] ?? null : null;
}

// Standard breaker and fuse sizes (240.6(A)), up to 1200 A.
export const STANDARD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250,
  300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200];

// The biggest inverse-time breaker allowed: 250% of full-load amps (Table 430.52);
// when that lands between sizes the next size up is allowed (430.52(C)(1) Ex. 1).
export function maxBreaker(fla) {
  const limit = fla * 2.5;
  return { limit, size: STANDARD.find((a) => a >= limit - 1e-9) ?? null };
}

// Overload trip setting from the nameplate amps: 125% with a service factor of
// 1.15 or more, else 115% (430.32(A)(1)).
export function overload(nameplateAmps, serviceFactor) {
  return nameplateAmps * (serviceFactor >= 1.15 ? 1.25 : 1.15);
}

// NEMA code letters: locked-rotor kVA per horsepower, the top of each band (Table 430.7(B)).
export const CODES = [
  ['A', 3.14], ['B', 3.54], ['C', 3.99], ['D', 4.49], ['E', 4.99], ['F', 5.59], ['G', 6.29], ['H', 7.09],
  ['J', 7.99], ['K', 8.99], ['L', 9.99], ['M', 11.19], ['N', 12.49], ['P', 13.99], ['R', 15.99], ['S', 17.99],
  ['T', 19.99], ['U', 22.39], ['V', 25],
];

// Generator rules of thumb. Across the line: the generator must carry the motor
// running with 25% spare, and take its starting kick with the voltage dipping no
// more than about 30%: kVA ≥ starting kVA × X''d × (1 − dip) / dip, with X''d (how
// stiff a typical alternator is) about 0.2. On a drive (VFD) there is no kick, but
// the drive's choppy current wants about twice the motor's running kW.
// Generators are rated in kW at 0.8 power factor.
const DIP = 0.3, XD = 0.2, PF = 0.8, EFF = 0.9;

export function generator({ hp, fla, volts, phase, code, start }) {
  const runKVA = volts * fla * (phase === 3 ? Math.sqrt(3) : 1) / 1000;
  const runKW = hpValue(hp) * 0.746 / EFF;
  if (start === 'vfd') return { runKW, kw: Math.ceil(2 * runKW), startKVA: null, by: 'drive' };
  const perHp = (CODES.find((c) => c[0] === code) || CODES[6])[1];
  const startKVA = hpValue(hp) * perHp;
  const forStart = startKVA * XD * (1 - DIP) / DIP;
  const forRun = runKVA * 1.25;
  return { runKW, startKVA, startAmps: startKVA * 1000 / (volts * (phase === 3 ? Math.sqrt(3) : 1)),
    kw: Math.ceil(Math.max(forStart, forRun) * PF), by: forStart >= forRun ? 'start' : 'run' };
}
