// plate.js — a motor's nameplate, box by box: what each box says in plain
// words, whether the plate suits the supply it will run on, and what it hands
// Motor amps. Pure: no DOM, no storage.
//
// Volts and amps are marked the plate's way: a slash between hookups (230/460 is
// one motor wired two ways), a dash for a range one hookup covers (208-230). Amps
// follow the same marks (30-28/14), so each volts gets its own amps box here.
// A motor runs within 10% of its plate volts (NEMA MG 1, 12.44).

import { SUPPLIES, CODES, supply, sizesFor, hpValue, fullLoadAmps } from './motor.js';
import { parseValue, formatNumber } from './ohm.js';
import { frac, formatInches } from './measure.js';

// What each supply really carries: a 460 V motor runs on 480 V, and so on.
const MAINS = { 115: 120, 208: 208, 230: 240, 460: 480, 575: 600 };
export const mains = (id) => MAINS[supply(id).volts];
export const SUPPLY_CHOICES = SUPPLIES.map((s) => ({ id: s.id, label: `${MAINS[s.volts]} V, ${s.phase} phase` }));

// The volts plates are marked with, low to high. 220/380, 230/400, 380-415 and 400 come on 50 Hz motors from overseas.
export const VOLT_MARKS = ['115', '115/208-230', '115/230', '200', '208', '208-230', '208-230/460', '220/380', '220/440',
  '230', '230/400', '230/460', '380-415', '400', '460', '480', '575'];

// Every horsepower the code tables list, small to big.
export const HPS = [...new Set([...sizesFor('1ph115'), ...sizesFor('3ph460')])].sort((a, b) => hpValue(a) - hpValue(b));

// '208-230/460' → [[208, 230], [460]]: each hookup and the volts it covers.
export function hookups(mark) {
  return mark ? String(mark).split('/').map((h) => h.split('-').map(Number)) : [];
}
// Every volts a mark names: '208-230/460' → [208, 230, 460]. Each gets an amps box.
export const markVolts = (mark) => hookups(mark).flat();

const num = (t) => parseValue(t ?? '');
const round1 = (x) => formatNumber(Math.round(x * 10) / 10);
const hzOf = (p) => (p.hz === '50' ? 50 : 60);

// The hookup that suits the supply and how well: 'good' within 5% of its volts, 'edge'
// within 10% (it runs, but hot and with nothing to spare), 'low' or 'high' past that.
export function fit(mark, id) {
  const v = mains(id), all = hookups(mark);
  let best = null;
  all.forEach((h, i) => {
    const lo = Math.min(...h), hi = Math.max(...h);
    const off = v < lo ? v / lo - 1 : v > hi ? v / hi - 1 : 0;
    if (best && Math.abs(off) >= Math.abs(best.off)) return;
    const how = Math.abs(off) <= 0.05 ? 'good' : Math.abs(off) <= 0.1 ? 'edge' : off < 0 ? 'low' : 'high';
    best = { hookup: i, of: all.length, volts: h, lo, hi, off, how };
  });
  return best;
}

// The plate's amps for that hookup, at the volts nearest the supply. A blank box
// borrows the hookup's other amps; `missing` then names the volts that had none.
export function plateAmps(p, id) {
  const f = fit(p.volts, id);
  if (!f) return null;
  const v = mains(id), near = (x) => Math.abs(x - v);
  const want = f.volts.reduce((a, b) => (near(b) < near(a) ? b : a));
  const typed = f.volts.filter((x) => num(p.amps?.[x]) > 0);
  if (!typed.length) return null;
  const at = typed.reduce((a, b) => (near(b) < near(a) ? b : a));
  return { amps: num(p.amps[at]), at, missing: at === want ? null : want };
}

// The poles a speed means. A motor turns a little under its magnetic speed
// (120 × Hz ÷ poles); that shortfall is its slip.
export function speed(rpm, hz = 60) {
  const s = [2, 4, 6, 8, 10, 12].map((poles) => ({ poles, sync: (120 * hz) / poles })).filter((x) => x.sync >= rpm).pop();
  return s ? { ...s, slip: (s.sync - rpm) / s.sync } : null;
}

// The letters after a frame number, longest first so JM reads as one.
const FRAME_LETTERS = [
  ['JM', 'JM: a close-coupled pump shaft. The pump\'s impeller mounts right on it.'],
  ['JP', 'JP: a close-coupled pump shaft, the longer kind.'],
  ['T', 'T: today\'s standard size for the frame (since 1964).'],
  ['U', 'U: the old size, before T frames. A U motor is bigger for its horsepower; a T motor in its place often needs an adapter base.'],
  ['C', 'C: a machined face with bolt holes, to bolt it to a pump or a gearbox.'],
  ['D', 'D: a flange to mount it by.'],
  ['S', 'S: a short shaft, for a coupling.'],
  ['H', 'H: a base with extra slots, for more than one bolt pattern.'],
  ['J', 'J: a threaded shaft, for a jet pump.'],
  ['Y', 'Y: special mounting; the maker\'s drawing has it.'],
  ['Z', 'Z: a special shaft; the maker\'s drawing has it.'],
];

// '215T' → the shaft's height and what T means. Two-digit frames (48, 56): the number ÷ 16
// inches; three-digit frames (143 and up): the first two digits ÷ 4.
export function frameInfo(text) {
  const m = /^(\d{2,3})([A-Z]*)$/.exec(String(text ?? '').toUpperCase().replace(/\s+/g, ''));
  if (!m) return null;
  const height = m[1].length === 2 ? frac(+m[1], 16) : frac(+m[1].slice(0, 2), 4);
  const letters = [];
  for (let rest = m[2]; rest;) {
    const hit = FRAME_LETTERS.find(([k]) => rest.startsWith(k));
    if (!hit) return { height, letters, unknown: rest };
    letters.push(hit[1]);
    rest = rest.slice(hit[0].length);
  }
  return { height, letters };
}

// The size Motor amps can show on this supply: the plate's, or the next one up the table lists.
function tableHp(hp, id) {
  const list = sizesFor(id);
  return list.includes(hp) ? hp : list.find((h) => hpValue(h) > hpValue(hp)) ?? null;
}

const LOW = Object.fromEntries(CODES.map(([c], i) => [c, i ? CODES[i - 1][1] + 0.01 : 0]));
const TOP = Object.fromEntries(CODES);

const INS = { A: 105, B: 130, F: 155, H: 180 };
const DES = {
  A: 'Design A: like B, but allowed a bigger starting kick. Rare now.',
  B: 'Design B: the everyday motor, with a normal starting push and kick. Most pumps and fans run on B.',
  C: 'Design C: a strong starting push for loads that start heavy, like a loaded conveyor or a crusher. Like pulling away in low gear.',
  D: 'Design D: a very strong starting push, and it lugs way down under load. For punch presses, hoists and pump jacks.',
};
const DUTY = {
  CONT: 'CONT: it can run around the clock at its rating.',
  '60 MIN': '60 MIN: at its rating it may run an hour, then it must cool off.',
  '30 MIN': '30 MIN: at its rating it may run half an hour, then it must cool off.',
  '15 MIN': '15 MIN: at its rating it may run 15 minutes, then it must cool off.',
  INT: 'INT: short runs with rests between; the maker says how short.',
};
const ENCL = {
  ODP: 'ODP, open drip-proof: vents in the ends, and drips from above are fine. Keep it out of rain, spray and dust: water gets to the windings.',
  TEFC: 'TEFC, totally enclosed fan cooled: sealed, with a fan on the back blowing over the fins. Fine outdoors. Keep the fins and the fan cover clear, or it runs hot.',
  TENV: 'TENV, totally enclosed non-ventilated: sealed, with no fan; small, or big enough to shed its heat. Fine outdoors.',
  TEAO: 'TEAO, totally enclosed air over: cooled by the air its own fan blade moves. Without that air it overheats.',
  XP: 'XP, explosion-proof: built so a spark inside can\'t light gas outside. The plate\'s Class and Group say for which places.',
  SUB: 'Submersible: sealed, and cooled by the water around it. Many can\'t run long out of the water; the maker says whether it may run dry.',
};

const F = (c) => Math.round(c * 9 / 5 + 32);

// Every box on the plate: what it's stamped, its plain name, what it means, how it's
// filled in (pick: the choices; type: the phone keyboard), and what the value typed says.
export const BOXES = [
  { id: 'hp', stamp: 'HP', name: 'Horsepower', pick: HPS,
    says: ['What the shaft puts out at full load, like an engine\'s rated horsepower. It draws more than that from the wires; the rest is heat.',
      'Not in the list? Pick the next size up. A plate in kW (from overseas): 1 kW is 1.34 hp.'],
    about: (p) => p.hp && [`${p.hp} hp is ${round1(hpValue(p.hp) * 0.746)} kW at the shaft.`] },
  { id: 'rpm', stamp: 'RPM', name: 'Speed at full load', type: 'numeric',
    says: ['How fast the shaft turns at full load. It runs a little under its magnetic speed (that\'s slip), more as the load grows, like an engine lugging down.',
      'The speed tells the poles: about 3450 is 2 pole (3600), 1750 is 4 pole (1800), 1150 is 6 pole (1200), 870 is 8 pole (900).'],
    about: (p) => {
      const rpm = num(p.rpm), s = rpm && speed(rpm, hzOf(p));
      if (!s) return rpm ? [`Over ${(120 * hzOf(p)) / 2}: no motor like this turns that fast. Check the box.`] : null;
      return [`${rpm} RPM: a ${s.poles} pole motor, magnetic speed ${s.sync}. It slips ${round1(s.slip * 100)}% at full load.`,
        ...(rpm < 1200 ? ['Under 1200 RPM the code sizes the wire and breaker from the plate\'s amps, not the table.'] : [])];
    } },
  { id: 'frame', stamp: 'FRAME', name: 'Frame size', type: 'text',
    says: ['The size of the mounting: feet, bolt holes, shaft height and shaft size, like an engine\'s bellhousing pattern. Two motors with the same frame swap bolt for bolt.',
      'The number gives the shaft\'s height above the bottom of the feet: in a two-digit frame (48, 56) it\'s the number ÷ 16 inches; in three digits (143 and up), the first two ÷ 4.',
      'The letters after it: T today\'s standard, U the old size, C a face to bolt to, D a flange, JM and JP close-coupled pump shafts, S a short shaft, H extra base slots, J a jet-pump shaft, Y and Z special.'],
    about: (p) => {
      if (!p.frame) return null;
      const f = frameInfo(p.frame);
      if (!f) return ['Type it as the plate shows it, like 56C or 215T.'];
      return [`${p.frame.toUpperCase()}: the shaft's center is ${formatInches(f.height)} above the bottom of the feet.`, ...f.letters,
        ...(f.unknown ? [`${f.unknown}: not a letter this knows; the maker's sheet has it.`] : [])];
    } },
  { id: 'volts', stamp: 'VOLTS', name: 'Volts', pick: VOLT_MARKS,
    says: ['The volts it\'s built for. Two numbers with a slash (230/460) is one motor that can be wired two ways inside its box: for the low volts or the high. Double the volts, half the amps: same power.',
      'A dash (208-230) is a range: one hookup good anywhere from the first to the second.',
      'A motor runs within 10% of its plate volts. Past that it runs hot.'],
    about: (p) => {
      const h = hookups(p.volts);
      if (h.length === 2) return [`Wired low: ${h[0].join('-')} V. Wired high: ${h[1].join('-')} V. The plate, or the inside of the box lid, shows which leads join for each.`];
      return h.length ? [h[0].length > 1 ? `One hookup, good from ${h[0][0]} to ${h[0][1]} V.` : `One hookup, ${h[0][0]} V.`] : null;
    } },
  { id: 'amps', stamp: 'AMPS', name: 'Full-load amps (FLA)',
    says: ['What it draws at full load, at the plate\'s volts. A plate with more than one volts gives amps for each, in the same order.',
      'The overload is set from these amps; the wire and breaker come from the code table (Motor amps). Clamp it running: at or under this is fine.'],
    about: (p, id) => {
      const a = plateAmps(p, id);
      return a && [`At ${a.at} V it draws ${formatNumber(a.amps)} A at full load` +
        (a.missing ? `; at ${a.missing} V, a little ${a.missing < a.at ? 'more' : 'less'}.` : '.')];
    } },
  { id: 'hz', stamp: 'HZ', name: 'Hertz', pick: ['60', '50', '50/60'],
    says: ['How many times a second the power turns around. Ours is 60. A 50 Hz motor from overseas turns 20% fast on our 60.'],
    about: (p) => (p.hz === '50' ? ['50 Hz: here it needs a drive set to 50 Hz.']
      : p.hz === '50/60' ? ['Rated for both. On our 60 Hz, the plate\'s 60 Hz volts and amps apply.'] : null) },
  { id: 'ph', stamp: 'PH', name: 'Phase', pick: ['1', '3'],
    says: ['1 phase: two hot wires (or one and a neutral), what a house has. 3 phase: three hot wires, each a third of a turn behind the last. The Phases tool shows it.'] },
  { id: 'sf', stamp: 'SF', name: 'Service factor', type: 'decimal',
    says: ['How far past its horsepower it can work for a while: 1.15 means 15% more. A cushion, not horsepower to plan on: run there and it runs hot and wears out sooner.',
      'At 1.15 or more the overload may go to 125% of the plate amps; under that, 115%.'],
    about: (p) => {
      const sf = num(p.sf);
      if (!sf) return null;
      if (sf <= 1) return ['1.0: no cushion. The overload may go to 115% of the plate amps.'];
      return p.hp ? [`${p.hp} hp × ${formatNumber(sf)} is ${round1(hpValue(p.hp) * sf)} hp, for short stretches.`] : null;
    } },
  { id: 'sfa', stamp: 'SF A', name: 'Service factor amps', type: 'decimal',
    says: ['The amps when it\'s working into its service factor; submersible pump motors often call it MAX AMPS. Clamp it running: up to the AMPS box is fine, between AMPS and SF A it\'s working into its cushion, over SF A it\'s overloaded.'],
    about: (p, id) => {
      const sfa = num(p.sfa), a = plateAmps(p, id);
      return sfa && a ? [`Clamp it running: up to ${formatNumber(a.amps)} A is fine, ${formatNumber(a.amps)} to ${formatNumber(sfa)} A it's into its cushion, over ${formatNumber(sfa)} A it's overloaded.`] : null;
    } },
  { id: 'code', stamp: 'CODE', name: 'Code letter (kVA code)', pick: CODES.map(([c]) => c),
    says: ['How hard it kicks when it starts: the locked-rotor kVA per horsepower. Later in the alphabet, bigger kick. Like cranking amps: for a second or two it pulls many times its running amps.'],
    about: (p, id) => {
      if (!p.code) return null;
      const span = (lo, hi, f) => (lo ? `${f(lo)} to ${f(hi)}` : `up to ${f(hi)}`);
      const lines = [`Code ${p.code}: ${span(LOW[p.code], TOP[p.code], formatNumber)} kVA per hp.`];
      if (p.hp) {
        const s = supply(id), v = mains(id), k = s.phase === 3 ? Math.sqrt(3) : 1, hp = hpValue(p.hp);
        const lo = hp * LOW[p.code], hi = hp * TOP[p.code], amps = (x) => Math.round((x * 1000) / (v * k));
        lines.push(`Starting, ${p.hp} hp pulls about ${span(lo, hi, Math.round)} kVA: ${span(lo, hi, amps)} A on ${v} V, for a second or two` +
          (plateAmps(p, id) ? `, against ${formatNumber(plateAmps(p, id).amps)} A running.` : '.'));
      }
      return lines;
    } },
  { id: 'des', stamp: 'DES', name: 'Design letter (NEMA design)', pick: Object.keys(DES),
    says: ['How it acts starting and under load. B is the everyday motor, and the one for pumps.'],
    about: (p) => DES[p.des] && [DES[p.des]] },
  { id: 'ins', stamp: 'INS CL', name: 'Insulation class', pick: Object.keys(INS),
    says: ['How hot the varnish on the windings may get at the hottest spot: A 105°C, B 130°C, F 155°C, H 180°C. Rule of thumb: every 10°C over halves its life, like running an engine hot.'],
    about: (p) => INS[p.ins] && [`Class ${p.ins}: the windings may reach ${INS[p.ins]}°C (${F(INS[p.ins])}°F) at the hottest spot.`] },
  { id: 'amb', stamp: 'AMB °C', name: 'Ambient', type: 'numeric',
    says: ['The hottest air around it that its ratings hold for, almost always 40°C (104°F). Hotter air, or a motor in the sun, takes off from what it can carry.'],
    about: (p) => num(p.amb) && [`${formatNumber(num(p.amb))}°C is ${F(num(p.amb))}°F.`] },
  { id: 'duty', stamp: 'DUTY', name: 'Duty', pick: Object.keys(DUTY),
    says: ['CONT means it can run all day. A time (30 MIN) means it must rest after that long. Pumps want CONT.'],
    about: (p) => DUTY[p.duty] && [DUTY[p.duty]] },
  { id: 'encl', stamp: 'ENCL', name: 'Enclosure', pick: Object.keys(ENCL),
    says: ['How it\'s closed up and cooled, which says where it can live.'],
    about: (p) => ENCL[p.encl] && [ENCL[p.encl]] },
  { id: 'eff', stamp: 'NEMA NOM EFF %', name: 'Efficiency', type: 'decimal',
    says: ['How much of the power it draws comes out of the shaft; the rest is heat. Bigger and newer motors run higher: premium ones from about 85% at 1 hp to 95% at 100 hp.'],
    about: (p) => {
      const e = num(p.eff);
      return e > 0 && e < 100 ? [`Of every 100 watts it draws, ${formatNumber(e)} come out of the shaft and ${round1(100 - e)} become heat.`] : null;
    } },
  { id: 'pf', stamp: 'PF', name: 'Power factor', type: 'decimal',
    says: ['How much of volts × amps does real work; the rest only magnetizes the iron and goes back. 0.8 to 0.9 is usual at full load, lower when it\'s lightly loaded. It\'s why a generator is rated in kVA as well as kW.'],
    about: (p) => {
      const pf = num(p.pf);
      return pf > 0 && pf <= 1 ? [`${formatNumber(pf)}: the watts are ${Math.round(pf * 100)}% of volts × amps.`] : null;
    } },
];

// A box's meaning, then what the value typed says about this motor on this supply.
export function explain(boxId, p, id) {
  const b = BOXES.find((x) => x.id === boxId);
  return b ? [...b.says, ...((b.about && b.about(p, id)) || [])] : [];
}

function voltsSay(f, v) {
  const plate = f.lo === f.hi ? `${f.lo} V` : `${f.lo} to ${f.hi} V`;
  const wire = f.of > 1 ? ` Wire it for ${f.volts.join('-')} V, the ${f.hookup ? 'high' : 'low'} hookup.` : '';
  const pct = Math.round(Math.abs(f.off) * 100);
  if (f.how === 'good') return ['ok', `A ${plate} motor on a ${v} V supply: a normal match.${wire}`];
  if (f.how === 'edge') return ['watch', f.off < 0
    ? `${v} V is ${pct}% under the plate's ${f.lo} V. It runs, but hot and with nothing to spare: a long run or a generator's sag puts it under.${v === 208 ? ' A plate marked 200 or 208-230 V is the one for 208.' : ''}${wire}`
    : `${v} V is ${pct}% over the plate's ${f.hi} V. It runs, but near the top of what it takes; if the supply runs high, it overheats.${wire}`];
  return ['bad', f.off < 0
    ? `${v} V is ${pct}% under anything on the plate. It can't make its power and overheats, if it starts at all. This motor isn't for this supply.`
    : `${v} V is ${pct}% over anything on the plate. Too many volts: it draws big amps, runs hot and the windings fail. This motor isn't for this supply.`];
}

// The plate against the supply. Each finding: 'ok', 'watch', 'bad' or 'note', and what to know.
export function check(p, id) {
  const out = [], s = supply(id), v = mains(id);
  const say = (level, text) => out.push({ level, text });
  const ph = num(p.ph);
  if (ph && ph !== s.phase) say(ph === 3 ? 'bad' : 'watch', ph === 3
    ? 'A 3 phase motor won\'t start on single phase: it hums and cooks. It needs a 3 phase supply, or a drive (VFD) made to run one off single phase.'
    : 'The plate says 1 phase and the supply is 3 phase. A single-phase motor runs across two of the legs: pick the single-phase supply it\'s really wired to.');
  if (p.hz === '50') say('bad', 'A 50 Hz motor turns 20% faster on our 60 Hz. A pump on it wants about 1.7 times the power (power goes with speed cubed), so it overloads. Run it from a drive set to 50 Hz, or change the motor.');
  const f = fit(p.volts, id);
  if (f) say(...voltsSay(f, v));

  const a = plateAmps(p, id), rpm = num(p.rpm), slow = rpm > 0 && rpm < 1200;
  if (a?.missing) say('note', `The plate gives no amps at ${a.missing} V, so its ${a.at} V amps are used. At ${a.missing} V it draws a little ${a.missing < a.at ? 'more' : 'less'}.`);
  const hp = p.hp && tableHp(p.hp, id);
  if (p.hp && !hp) say('note', `The code table lists no ${p.hp} hp ${s.phase} phase motor at ${s.volts} V.`);
  if (hp && hp !== p.hp) say('note', `The code table has no ${p.hp} hp ${s.phase} phase motor; Motor amps uses ${hp} hp, the next size up.`);
  if (hp && a && (f.how === 'good' || f.how === 'edge') && (!ph || ph === s.phase)) {
    const t = fullLoadAmps(hp, id), r = a.amps / t, A = formatNumber(a.amps), T = formatNumber(t);
    if (r > 1.1) say(slow ? 'ok' : 'watch', slow ? `${A} A on the plate, more than the code table's ${T} A for ${hp} hp: usual for a slow motor.`
      : `${A} A on the plate is more than the code table's ${T} A for ${hp} hp. Likely a slow motor (type its RPM), a submersible pump motor (they draw more; size its wire from the maker's sheet), a rewound motor, or a box misread.`);
    else if (r < 0.6) say('watch', `${A} A on the plate is far under the code table's ${T} A for ${hp} hp. Check the HP box, and that these are the amps for the hookup you'll use.`);
    else say('ok', `${A} A on the plate against the code table's ${T} A for ${hp} hp: normal. The table is on the safe side, so plates read about the same or under it.`);
  }

  if (rpm) {
    const sp = speed(rpm, hzOf(p));
    if (!sp) say('bad', `No ${hzOf(p)} Hz motor like this turns over ${(120 * hzOf(p)) / 2} RPM: check the RPM box.`);
    else if (sp.slip > 0.15) say('watch', `${rpm} RPM is far under ${sp.sync}, the nearest magnetic speed: check the RPM box.`);
    if (slow) say('note', 'Under 1200 RPM the code sizes the wire and breaker from the plate\'s amps, not the table (NEC 430.6). Motor amps does that once it has the RPM.');
  }
  const sf = num(p.sf), sfa = num(p.sfa), amb = num(p.amb);
  if (sf && sf < 1) say('watch', `A service factor under 1.0 isn't a thing: check the SF box.`);
  if (sfa && a && sfa < a.amps) say('watch', 'SF A is under the full-load amps: one of the two boxes is misread.');
  if (p.duty && p.duty !== 'CONT') say('watch', `Duty ${p.duty}: it must rest between runs. A pump that runs for hours wants CONT.`);
  if (amb && amb < 40) say('watch', `Rated for air no hotter than ${formatNumber(amb)}°C (${F(amb)}°F); most motors take 40°C (104°F). In a hot pump house or in the sun it runs past its limit.`);
  return out;
}

// What the plate hands Motor amps, or why it can't.
export function toMotor(p, id) {
  const s = supply(id), ph = num(p.ph);
  if (!p.hp || !p.volts) return { why: 'Fill in HP and VOLTS first.' };
  if (ph && ph !== s.phase) return { why: 'The plate\'s phase and the supply\'s must match.' };
  if (p.hz === '50') return { why: 'A 50 Hz motor overloads on our 60 Hz; it needs a drive.' };
  const how = fit(p.volts, id).how;
  if (how === 'low' || how === 'high') return { why: 'This motor isn\'t for this supply.' };
  const hp = tableHp(p.hp, id);
  if (!hp) return { why: `The code table lists no ${p.hp} hp motor on this supply.` };
  const a = plateAmps(p, id), sf = num(p.sf), rpm = num(p.rpm);
  return { motor: { supply: id, hp, plate: a ? String(a.amps) : '', sf: sf >= 1.15 ? 1.15 : 1, rpm: rpm ? String(rpm) : '',
    ...(p.code ? { code: p.code } : {}) } };
}
