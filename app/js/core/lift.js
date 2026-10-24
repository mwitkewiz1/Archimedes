// lift.js — a duplex lift station run as a little machine: sewage fills the wet
// well, four floats tell the panel the level, and the panel's relays decide
// which pump runs. Pure: no DOM. ui/lift.js draws it and plays it.
//
// The ladder it follows (120 V control, L1 to L2):
//   CR1 (lead call):  OFF float ─┬ LEAD float ┬─ (CR1)
//                                └ CR1 ───────┘
//   CR2 (lag call):   OFF float ─┬ LAG float ─┬─ (CR2)
//                                └ CR2 ───────┘
//   ALT (alternator): CR1 ─ (ALT)   flips which pump leads each time CR1 lets go
//   Pump n:           HOA Hand ──────────────────────┬─ OLn ─ (Mn)
//                     HOA Auto ─┬ CR1 ─ ALT·n ───────┤
//                               └ CR2 ───────────────┘
//   Alarm:            ALARM float ─ (red light)
//                     ALARM float ─ SIL (NC) ─ (horn)
//                     ALARM float ─┬ SILENCE button ┬─ (SIL)
//                                  └ SIL ───────────┘
// Level is a percent of the well's depth; rates are percent a second.

export const FLOATS = [
  { id: 'off', at: 15, name: 'Off' },
  { id: 'lead', at: 45, name: 'Lead' },
  { id: 'lag', at: 62, name: 'Lag' },
  { id: 'alarm', at: 80, name: 'Alarm' },
];
const AT = Object.fromEntries(FLOATS.map((f) => [f.id, f.at]));

export const INFLOW = 4, STORM = 12, PUMP = 10;

export function start() {
  return settle({
    level: 8, hoa: ['auto', 'auto'], ol: [false, false], alt: 0, silence: false,
    storm: false, leadStuck: false, offStuck: false,
    cr1: false, cr2: false, sil: false, m: [false, false],
  });
}

// Which float contacts are closed: a float tips up, closing it, once the water reaches it.
export function floats(s) {
  return {
    off: s.level >= AT.off || s.offStuck,
    lead: s.level >= AT.lead && !s.leadStuck,
    lag: s.level >= AT.lag,
    alarm: s.level >= AT.alarm,
  };
}

// Read every rung once, with the relays as they stood: seal-ins hold on their own contact.
export function settle(s) {
  const f = floats(s);
  const cr1 = f.off && (f.lead || s.cr1);
  const cr2 = f.off && (f.lag || s.cr2);
  const alt = s.cr1 && !cr1 ? 1 - s.alt : s.alt;
  const call = [(cr1 && alt === 0) || cr2, (cr1 && alt === 1) || cr2];
  const m = [0, 1].map((i) => !s.ol[i] && (s.hoa[i] === 'hand' || (s.hoa[i] === 'auto' && call[i])));
  const sil = f.alarm && (s.sil || s.silence);
  return { ...s, cr1, cr2, alt, m, sil, silence: false, call, f, light: f.alarm, horn: f.alarm && !sil };
}

export function step(s, dt) {
  const inflow = s.storm ? STORM : INFLOW;
  const out = PUMP * s.m.filter(Boolean).length;
  const level = Math.min(100, Math.max(0, s.level + (inflow - out) * dt));
  return settle({ ...s, level });
}

// What the panel's front does: each returns the station after the change.
export const setHOA = (s, i, mode) => settle({ ...s, hoa: s.hoa.map((h, j) => (j === i ? mode : h)) });
export const trip = (s, i) => settle({ ...s, ol: s.ol.map((o, j) => j === i || o) });
export const reset = (s, i) => settle({ ...s, ol: s.ol.map((o, j) => j !== i && o) });
export const pressSilence = (s) => settle({ ...s, silence: true });
export const setFault = (s, name, on) => settle({ ...s, [name]: on });

const NAME = Object.fromEntries(FLOATS.map((f) => [f.id, f.name]));

// What changed from a to b, in plain words, in the order it happens down the ladder.
export function explain(a, b) {
  const say = [];
  for (const id of ['off', 'lead', 'lag', 'alarm']) {
    if (a.f[id] === b.f[id]) continue;
    if (b.f[id]) {
      say.push(id === 'off' && b.offStuck && a.level < AT.off ? 'The Off float is stuck up: its contact stays closed whatever the water does.'
        : id === 'off' ? 'Water reaches the Off float and tips it up: its contact closes. Nothing starts; it only lets the pumps run once called.'
        : id === 'lead' ? 'Water reaches the Lead float: it tips up and its contact closes.'
        : id === 'lag' ? 'The water is still rising: it tips the Lag float up and its contact closes.'
        : 'High water: the Alarm float tips up.');
    } else if (id === 'off' && !b.offStuck) {
      say.push('Water drops below the Off float: it hangs down and its contact opens.');
    } else if (id === 'off') {
      say.push('The Off float is free again.');
    } else {
      say.push(`Water drops below the ${NAME[id]} float: its contact opens.` +
        (id === 'lead' && b.cr1 ? ' CR1 holds in through its own contact (the seal-in), so pumping goes on down to the Off float.' : '') +
        (id === 'lag' && b.cr2 ? ' CR2 holds in through its own contact, so both pumps keep on down to the Off float.' : ''));
    }
  }
  if (!a.cr1 && b.cr1) say.push(`CR1, the lead call relay, pulls in. The alternator points at pump ${b.alt + 1}.`);
  if (a.cr1 && !b.cr1) say.push('CR1 lets go.');
  if (!a.cr2 && b.cr2) say.push('CR2, the lag call relay, pulls in: it calls both pumps.');
  if (a.cr2 && !b.cr2) say.push('CR2 lets go.');
  if (a.alt !== b.alt) say.push(`The alternator flips: pump ${b.alt + 1} leads next time, so both pumps wear evenly.`);
  for (const i of [0, 1]) {
    const n = i + 1;
    if (!a.m[i] && b.m[i]) say.push(b.hoa[i] === 'hand' ? `Pump ${n} switched to Hand: M${n} pulls in and it runs whatever the floats say.` : `M${n}, pump ${n}'s starter, pulls in: pump ${n} runs.`);
    if (a.m[i] && !b.m[i]) say.push(b.ol[i] && !a.ol[i] ? `Pump ${n}'s overload trips: OL${n} opens, M${n} drops out and the pump stops.`
      : b.hoa[i] === 'off' ? `Pump ${n} switched to Off: M${n} drops out and the pump stops.`
      : `M${n} drops out: pump ${n} stops.`);
    const blocked = (x) => x.call[i] && x.hoa[i] === 'auto' && x.ol[i];
    if (blocked(b) && !blocked(a)) say.push(`Pump ${n} is called, but its overload is tripped: OL${n} is open, so M${n} can't pull in.`);
    if (a.ol[i] && !b.ol[i]) say.push(`Pump ${n}'s overload is reset: OL${n} closes again.`);
  }
  if (!a.light && b.light) say.push('The red alarm light comes on and the horn sounds.');
  if (a.horn && !b.horn && b.light) say.push('Horn silenced. The light stays on until the water drops.');
  if (a.light && !b.light) say.push('The alarm light goes out' + (a.sil ? ', and Silence lets go, ready for next time.' : '.'));
  const running = b.m.some(Boolean);
  if (b.level === 0 && running && !(a.level === 0 && a.m.some(Boolean))) {
    say.push('The well is dry and a pump is still running: it sucks air and the seal and motor run hot. ' +
      'That is why Hand is never left on, and why some stations add a fifth float, a low-level cutoff under the Off float.');
  }
  if (b.level === 100 && a.level < 100) say.push('The well is full: sewage backs up the inflow pipe. Get a pump running.');
  return say;
}

// Run until something changes, for Next step. Gives up after a minute of nothing.
export function nextEvent(s, dt = 0.05) {
  let cur = s;
  for (let t = 0; t < 60; t += dt) {
    const nxt = step(cur, dt);
    const say = explain(cur, nxt);
    if (say.length) return { state: nxt, say };
    cur = nxt;
  }
  return { state: cur, say: ['Nothing more happens from here: change a switch or a fault.'] };
}

// The ladder above as data, for drawing it: each rung's contacts left to right
// (par: branches side by side) and the load at its right end. Every contact
// says when it is closed; tests check each load is on exactly when its rung passes.
const c = (k, label, closed) => ({ k, label, closed });
const pumpRung = (i) => ({
  title: `Pump ${i + 1}`,
  seq: [
    { par: [
      [c('hoa', 'HAND', (s) => s.hoa[i] === 'hand')],
      [c('hoa', 'AUTO', (s) => s.hoa[i] === 'auto'), { par: [
        [c('no', 'CR1', (s) => s.cr1), c('no', `ALT·${i + 1}`, (s) => s.alt === i)],
        [c('no', 'CR2', (s) => s.cr2)],
      ] }],
    ] },
    c('nc', `OL${i + 1}`, (s) => !s.ol[i]),
  ],
  load: { k: 'coil', label: `M${i + 1}`, on: (s) => s.m[i] },
});

export const LADDER = [
  { title: 'Lead call', seq: [c('float', 'OFF', (s) => s.f.off), { par: [[c('float', 'LEAD', (s) => s.f.lead)], [c('no', 'CR1', (s) => s.cr1)]] }],
    load: { k: 'coil', label: 'CR1', on: (s) => s.cr1 } },
  { title: 'Lag call', seq: [c('float', 'OFF', (s) => s.f.off), { par: [[c('float', 'LAG', (s) => s.f.lag)], [c('no', 'CR2', (s) => s.cr2)]] }],
    load: { k: 'coil', label: 'CR2', on: (s) => s.cr2 } },
  { title: 'Alternator', seq: [c('no', 'CR1', (s) => s.cr1)], load: { k: 'coil', label: 'ALT', on: (s) => s.cr1 } },
  pumpRung(0),
  pumpRung(1),
  { title: 'Alarm light', seq: [c('float', 'ALARM', (s) => s.f.alarm)], load: { k: 'light', label: 'R', on: (s) => s.light } },
  { title: 'Alarm horn', seq: [c('float', 'ALARM', (s) => s.f.alarm), c('nc', 'SIL', (s) => !s.sil)], load: { k: 'horn', label: 'HORN', on: (s) => s.horn } },
  { title: 'Silence', seq: [c('float', 'ALARM', (s) => s.f.alarm), { par: [[c('pb', 'SILENCE', () => false)], [c('no', 'SIL', (s) => s.sil)]] }],
    load: { k: 'coil', label: 'SIL', on: (s) => s.sil } },
];

// Does power get across these contacts? Series: all closed; par: any branch.
export function passes(seq, s) {
  return seq.every((x) => (x.par ? x.par.some((b) => passes(b, s)) : x.closed(s)));
}
