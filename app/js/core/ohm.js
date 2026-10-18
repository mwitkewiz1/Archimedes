// ohm.js — Ohm's law and power: volts, amps, ohms, watts; any two give the
// other two. Owns reading what a person types (12, 1.5k, 500m, 1,500 W) and
// writing numbers back plainly (4 significant figures, kΩ / mA when it helps).
// Not lengths, so plain numbers, not fractions: R and P alone need a square root.
// Pure: no DOM, no storage.

export const QUANTS = {
  V: { name: 'Volts', unit: 'V' },
  I: { name: 'Amps', unit: 'A' },
  R: { name: 'Ohms', unit: 'Ω' },
  P: { name: 'Watts', unit: 'W' },
};
export const ORDER = ['V', 'I', 'R', 'P'];

// For each pair you know: how to get each of the other two. `work` shows the
// formula with the numbers in it.
const RULES = {
  VI: { R: ['Volts ÷ Amps', (v) => v.V / v.I, (f) => `${f.V} ÷ ${f.I}`],
        P: ['Volts × Amps', (v) => v.V * v.I, (f) => `${f.V} × ${f.I}`] },
  VR: { I: ['Volts ÷ Ohms', (v) => v.V / v.R, (f) => `${f.V} ÷ ${f.R}`],
        P: ['Volts × Volts ÷ Ohms', (v) => v.V * v.V / v.R, (f) => `${f.V} × ${f.V} ÷ ${f.R}`] },
  VP: { I: ['Watts ÷ Volts', (v) => v.P / v.V, (f) => `${f.P} ÷ ${f.V}`],
        R: ['Volts × Volts ÷ Watts', (v) => v.V * v.V / v.P, (f) => `${f.V} × ${f.V} ÷ ${f.P}`] },
  IR: { V: ['Amps × Ohms', (v) => v.I * v.R, (f) => `${f.I} × ${f.R}`],
        P: ['Amps × Amps × Ohms', (v) => v.I * v.I * v.R, (f) => `${f.I} × ${f.I} × ${f.R}`] },
  IP: { V: ['Watts ÷ Amps', (v) => v.P / v.I, (f) => `${f.P} ÷ ${f.I}`],
        R: ['Watts ÷ (Amps × Amps)', (v) => v.P / (v.I * v.I), (f) => `${f.P} ÷ (${f.I} × ${f.I})`] },
  RP: { V: ['√(Watts × Ohms)', (v) => Math.sqrt(v.P * v.R), (f) => `√(${f.P} × ${f.R})`],
        I: ['√(Watts ÷ Ohms)', (v) => Math.sqrt(v.P / v.R), (f) => `√(${f.P} ÷ ${f.R})`] },
};

const ZERO_SAYS = {
  V: 'Volts of zero means no push, so nothing flows. Type the voltage of the supply.',
  I: 'Amps of zero means nothing is flowing, so there is nothing to work out.',
  R: 'Ohms of zero is a dead short: the amps would be limitless and the breaker trips. Type the load\'s resistance.',
  P: 'Watts of zero means the load does no work. Type its rated watts.',
};

// given: two of {V, I, R, P} as numbers. Returns { ok, values, steps } where
// steps say how each missing number was found, or { ok: false, error }.
export function solve(given) {
  const keys = ORDER.filter((k) => given[k] != null);
  if (keys.length !== 2) return { ok: false, error: 'Fill in any two; the other two work themselves out.' };
  for (const k of keys) {
    const x = given[k];
    if (!Number.isFinite(x)) return { ok: false, error: `${QUANTS[k].name}: that isn't a number.` };
    if (x < 0) return { ok: false, error: `${QUANTS[k].name}: use the size without a minus sign.` };
    if (x === 0) return { ok: false, error: ZERO_SAYS[k] };
  }
  const rule = RULES[keys.join('')];
  const values = { [keys[0]]: given[keys[0]], [keys[1]]: given[keys[1]] };
  const shown = { [keys[0]]: formatNumber(given[keys[0]]), [keys[1]]: formatNumber(given[keys[1]]) };
  const steps = [];
  for (const k of ORDER) {
    if (!rule[k]) continue;
    const [formula, calc, work] = rule[k];
    values[k] = calc(values);
    steps.push({ key: k, formula: `${QUANTS[k].name} = ${formula}`, work: work(shown) });
  }
  return { ok: true, values, steps };
}

// Reads 12, 0.5, .5, 1,500, 1.5k, 2M, 500m, with an optional unit
// (V, A, Ω, ohm, ohms, W, watts…). m is milli, M is mega. Null when it isn't a number.
export function parseValue(text) {
  const s = String(text).trim().replace(/,/g, '')
    .replace(/\s*(volts?|amps?|ohms?|watts?|[VAΩW])$/i, '');
  const m = s.match(/^(\d+(?:\.\d*)?|\.\d+)\s*([kKMm]?)$/);
  if (!m) return null;
  const scale = { '': 1, k: 1e3, K: 1e3, M: 1e6, m: 1e-3 }[m[2]];
  return parseFloat(m[1]) * scale;
}

// 4 significant figures, no trailing zeros, commas in thousands: 1,500 · 0.05 · 3.464
export function formatNumber(x) {
  if (x === 0) return '0';
  const r = Number(x.toPrecision(4));
  return r.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

// The same number with a prefix when that reads easier: 0.05 A → 50 mA,
// 12,000 Ω → 12 kΩ. Null when the plain number already reads fine.
export function withPrefix(x, unit) {
  if (x >= 1e6) return `${formatNumber(x / 1e6)} M${unit}`;
  if (x >= 1e3) return `${formatNumber(x / 1e3)} k${unit}`;
  if (x < 1 && x >= 1e-3) return `${formatNumber(x * 1e3)} m${unit}`;
  return null;
}
