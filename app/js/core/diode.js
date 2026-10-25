// diode.js — diodes: the resistor an LED needs, the kick a relay coil gives
// when it's switched off (with and without its flyback diode), turning AC into
// DC (one diode, a bridge, a bridge with a capacitor), and reading a diode on a
// meter. Plain numbers, as in ohm.js. Pure: no DOM, no storage.

import { nextUp, wattSize } from './resistor.js';

export const DROP = 0.7; // volts a plain silicon diode costs, forward: its cracking pressure

// Typical volts an LED takes, by color. The pack or data sheet wins if you have it.
export const LEDS = [
  { id: 'red', name: 'Red', vf: 2.0 },
  { id: 'yellow', name: 'Yellow', vf: 2.1 },
  { id: 'green', name: 'Green', vf: 2.2 },
  { id: 'white', name: 'Blue or white', vf: 3.2 },
];

// The resistor to put in line with an LED: { ok, ohms (worked out), pick (a
// standard value at or above), mA (what flows with pick), watts, size } or { ok: false, error }.
export function ledResistor(supply, vf, mA) {
  if (!(supply > 0)) return { ok: false, error: 'Type the supply volts.' };
  if (supply <= vf) return { ok: false, error: `The LED needs about ${vf} V to light; the supply has to be more than that.` };
  const ohms = (supply - vf) / (mA / 1000);
  const pick = nextUp(ohms);
  const amps = (supply - vf) / pick;
  const watts = amps * amps * pick;
  return { ok: true, ohms, pick, mA: amps * 1000, watts, size: wattSize(watts) };
}

// Volts across a relay's switch (contact or PLC output) at time t, in
// thousandths of a second; it opens at 0. mode: 'in' (flyback diode across the
// coil), 'none' (no diode), 'backwards' (diode in the wrong way round).
// The coil's current keeps going for a moment after the switch opens, the way a
// column of water keeps going when a valve slams: with nowhere to go, it jumps
// the volts until it sparks across the opening contact.
const KICK = 25; // the spike, as times the supply: hundreds of volts on a 24 V coil
export function switchVolts(mode, supply, t) {
  if (mode === 'backwards' || t < 0) return 0; // closed: no volts across a closed switch
  if (mode === 'in') return t < 2 ? supply + DROP : supply; // the coil's current coasts round the diode, then dies
  return supply + supply * KICK * Math.exp(-t / 0.15);
}

// What switching it off does: the highest volts across the switch, and whether
// it's a dead short instead (a backwards diode shorts the supply when the switch closes).
export function kick(mode, supply) {
  if (mode === 'backwards') return { short: true, peak: 0 };
  return { short: false, peak: switchVolts(mode, supply, 0) };
}

// AC into DC, for the drawing. t in cycles. kind: 'half' (one diode), 'bridge'
// (four), 'cap' (bridge with a capacitor across the load). Volts as a share of
// the AC's peak, diode drops left out. path: which diodes carry the current, 'a'
// on the AC's top half, 'b' on its bottom half, null when none do.
const TAU = 2.5; // how slowly the capacitor drains between humps, in cycles
export function rectify(kind, t) {
  const vin = Math.sin(2 * Math.PI * t);
  if (kind === 'half') return { vin, out: Math.max(vin, 0), path: vin > 0 ? 'a' : null };
  const hump = Math.abs(vin);
  const side = vin >= 0 ? 'a' : 'b';
  if (kind === 'bridge') return { vin, out: hump, path: side };
  // The capacitor fills to the top of each hump, then carries the load, sagging, till the next hump catches it.
  const lastPeak = Math.floor((t - 0.25) * 2) / 2 + 0.25;
  const held = Math.exp(-(t - lastPeak) / TAU);
  return { vin, out: Math.max(hump, held), path: hump >= held ? side : null };
}

// The DC you get from some AC volts (what a meter reads on AC). avg is what a
// DC meter reads with no capacitor; peak is what it reads with one (lightly loaded).
export function dcOut(vac, kind) {
  const drops = kind === 'half' ? DROP : 2 * DROP;
  const peak = Math.max(0, vac * Math.SQRT2 - drops);
  return { peak, avg: kind === 'half' ? peak / Math.PI : (2 * peak) / Math.PI };
}

// A diode on the meter's diode setting: what each reading looks like.
export const READINGS = [
  ['zero', '0 or beeps'],
  ['drop', '0.2 to 0.9'],
  ['led', '1.5 to 3'],
  ['ol', 'OL'],
];

// fwd: red lead on the plain end, black on the stripe. back: the leads swapped.
// Returns { say: 'good' | 'bad' | 'check', title, why }.
export function judge(fwd, back) {
  const flows = (r) => r !== 'ol';
  if (flows(fwd) && !flows(back)) {
    if (fwd === 'zero') return { say: 'check', title: 'Check it again', why: 'Near zero one way is too low for a diode. Make sure the meter is on the diode setting, then lift one leg out of the circuit: something across it may be reading instead.' };
    if (fwd === 'led') return { say: 'good', title: 'Good, if it\'s an LED', why: 'An LED reads 1.5 to 3 one way and may glow faintly. A plain diode that reads this high is bad.' };
    return { say: 'good', title: 'Good', why: 'One way it passes, the other it blocks. A plain silicon diode reads about 0.5 to 0.7; a low-loss (Schottky) one 0.15 to 0.4.' };
  }
  if (!flows(fwd) && flows(back)) {
    if (back === 'zero') return { say: 'check', title: 'Check it again', why: 'Near zero one way is too low for a diode. Make sure the meter is on the diode setting, then lift one leg out of the circuit: something across it may be reading instead.' };
    return { say: 'check', title: 'Good, but the other way round', why: 'It passes with the red lead on the stripe, so the stripe end is really the + end: the marking is worn or wrong, or it\'s in the board backwards.' };
  }
  if (!flows(fwd)) return { say: 'bad', title: 'Open', why: 'It blocks both ways, like a check valve stuck shut. Replace it. (One exception: an LED your meter can\'t push hard enough to light reads OL both ways. Try it on another meter.)' };
  if (fwd === 'zero' && back === 'zero') return { say: 'bad', title: 'Shorted', why: 'It passes both ways, like a check valve with no flapper. Replace it. In a circuit, lift one leg first: a coil across it reads low too.' };
  return { say: 'bad', title: 'Leaky', why: 'It passes backwards too, like a check valve that won\'t seat. Replace it. In a circuit, lift one leg first: other parts across it can fake this.' };
}

// Checking a bridge rectifier on the diode setting: where each lead goes and what it should read.
// The legs are marked ~ ~ (AC in), + and − (DC out).
// Each ~ to + or − is one diode; − to + is two in a row, so it reads about double.
export const BRIDGE_CHECKS = [
  ['Red on −, black on each ~', '0.4 to 0.7'],
  ['Red on each ~, black on +', '0.4 to 0.7'],
  ['Red on +, black on each ~', 'OL'],
  ['Red on each ~, black on −', 'OL'],
  ['Red on −, black on +', '0.8 to 1.2'],
  ['Red on +, black on −', 'OL'],
  ['Across the two ~, either way', 'OL'],
];
