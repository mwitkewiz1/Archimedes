// resistor.js — resistors: the color bands and the ohms they stand for (both
// ways), resistors in series and in parallel (with the volts, amps and watts on
// each when you know the supply), and the watt size a resistor needs.
// Ohms aren't lengths, so plain numbers, as in ohm.js. Pure: no DOM, no storage.

// Every band color: its digit, what it multiplies by (a power of ten), and the
// tolerance it means in the last band. hex is the paint on the part.
export const COLORS = [
  { id: 'black', name: 'Black', hex: '#111111', digit: 0, exp: 0 },
  { id: 'brown', name: 'Brown', hex: '#7b4a21', digit: 1, exp: 1, tol: 1 },
  { id: 'red', name: 'Red', hex: '#d32a1f', digit: 2, exp: 2, tol: 2 },
  { id: 'orange', name: 'Orange', hex: '#f08a17', digit: 3, exp: 3 },
  { id: 'yellow', name: 'Yellow', hex: '#f4d40c', digit: 4, exp: 4 },
  { id: 'green', name: 'Green', hex: '#2c9a3c', digit: 5, exp: 5, tol: 0.5 },
  { id: 'blue', name: 'Blue', hex: '#2563d8', digit: 6, exp: 6, tol: 0.25 },
  { id: 'violet', name: 'Violet', hex: '#8a3fc6', digit: 7, exp: 7, tol: 0.1 },
  { id: 'grey', name: 'Grey', hex: '#8c8c8c', digit: 8, exp: 8, tol: 0.05 },
  { id: 'white', name: 'White', hex: '#f7f7f7', digit: 9, exp: 9 },
  { id: 'gold', name: 'Gold', hex: '#c9a227', exp: -1, tol: 5 },
  { id: 'silver', name: 'Silver', hex: '#bfc3c7', exp: -2, tol: 10 },
  { id: 'none', name: 'No band', tol: 20 },
];
export const COLOR = Object.fromEntries(COLORS.map((c) => [c.id, c]));

// What each band of a 4- or 5-band part means, left to right (gold or silver at the right).
export function bandRoles(count) {
  return count === 5 ? ['digit', 'digit', 'digit', 'mult', 'tol'] : ['digit', 'digit', 'mult', 'tol'];
}

// The colors that can go in a band with this role.
export function choices(role) {
  if (role === 'digit') return COLORS.filter((c) => c.digit != null);
  if (role === 'mult') return COLORS.filter((c) => c.exp != null);
  return COLORS.filter((c) => c.tol != null);
}

// ten to a whole power, without the float dust of 0.1 * 3.
const scale = (m, exp) => (exp >= 0 ? m * 10 ** exp : m / 10 ** -exp);

// bands: color ids, left to right. Returns { ok, ohms, tol, low, high } or { ok: false, error }.
export function readBands(bands) {
  const roles = bandRoles(bands.length);
  if (bands.length !== 4 && bands.length !== 5) return { ok: false, error: 'A resistor has 4 or 5 bands.' };
  let m = 0;
  for (let k = 0; k < roles.length; k++) {
    const c = COLOR[bands[k]];
    if (!c || !choices(roles[k]).includes(c)) return { ok: false, error: `Band ${k + 1} can't be ${c ? c.name.toLowerCase() : 'that'}.` };
    if (roles[k] === 'digit') m = m * 10 + c.digit;
  }
  const exp = COLOR[bands[roles.length - 2]].exp;
  const tol = COLOR[bands[roles.length - 1]].tol;
  const ohms = scale(m, exp);
  return { ok: true, ohms, tol, low: ohms * (1 - tol / 100), high: ohms * (1 + tol / 100) };
}

// The digit and multiplier bands for some ohms, with `digits` digit bands (2 on a
// 4-band part, 3 on a 5-band). Returns { ok, bands } (no tolerance band), or
// { ok: false, error, near } when the ohms can't be made exactly.
export function bandsFor(ohms, digits) {
  if (!(ohms > 0) || !Number.isFinite(ohms)) return { ok: false, error: 'Type the ohms, more than zero.' };
  let exp = Math.floor(Math.log10(ohms)) - (digits - 1);
  let m = Math.round(scale(ohms, -exp));
  if (m >= 10 ** digits) { m = Math.round(m / 10); exp += 1; } // 999.99 rounds up a place
  if (exp < -2) return { ok: false, error: `Under ${digits === 2 ? '0.1' : '1'} Ω is too small for ${digits + 2} bands.` };
  if (exp > 9) return { ok: false, error: 'That is more ohms than color bands go to.' };
  const near = scale(m, exp);
  const bands = [...String(m).padStart(digits, '0')].map((d) => COLORS[Number(d)].id);
  bands.push(COLORS.find((c) => c.exp === exp).id);
  if (Math.abs(near - ohms) > ohms * 1e-9) return { ok: false, error: `A ${digits + 2}-band part can't be exactly that.`, near, bands };
  return { ok: true, bands };
}

// Total ohms of resistors chained one after another, and side by side.
export const series = (rs) => rs.reduce((a, r) => a + r, 0);
export const parallel = (rs) => 1 / rs.reduce((a, r) => a + 1 / r, 0);

// Each resistor's share with `volts` across the whole lot: { total, amps, each:
// [{ ohms, volts, amps, watts }] }. In series the same amps go through each and
// the volts split; side by side each gets the full volts and its own amps.
export function share(rs, how, volts) {
  const total = how === 'series' ? series(rs) : parallel(rs);
  const amps = volts / total;
  const each = rs.map((r) => {
    const v = how === 'series' ? amps * r : volts;
    const i = v / r;
    return { ohms: r, volts: v, amps: i, watts: v * i };
  });
  return { total, amps, each };
}

// Watt sizes resistors come in. label is what's printed or sold; small ones are fractions.
export const WATTS = [
  ['1/8', 0.125], ['1/4', 0.25], ['1/2', 0.5], ['1', 1], ['2', 2], ['3', 3], ['5', 5],
  ['10', 10], ['25', 25], ['50', 50], ['100', 100],
];

// About how long the body of a plain (carbon film) resistor is for its watts:
// the small ones carry no watt marking, so size is how you tell.
export const BODY = [['1/8', '1/8"'], ['1/4', '1/4"'], ['1/2', '3/8"'], ['1', '1/2"'], ['2', '5/8"']];

// The smallest size that runs at no more than half its rating: a resistor at its
// full rating runs too hot to touch. Null when even 100 W isn't enough.
export function wattSize(watts) {
  return WATTS.find(([, w]) => w >= watts * 2) || null;
}

// The watts a resistor makes from its ohms and either the volts across it or the amps through it.
export const heat = (ohms, { volts, amps }) => (volts != null ? volts * volts / ohms : amps * amps * ohms);

// Standard values (the E12 series, 10% steps): what a parts drawer has.
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

// The smallest standard value at or above some ohms.
export function nextUp(ohms) {
  let exp = Math.floor(Math.log10(ohms)) - 1;
  for (;;) {
    for (const v of E12) {
      const r = scale(v, exp);
      if (r >= ohms * (1 - 1e-9)) return r;
    }
    exp += 1;
  }
}
