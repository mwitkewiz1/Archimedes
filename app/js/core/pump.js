// pump.js — where a centrifugal pump runs: its curve (head it makes at each
// flow), the pipe's curve (head it takes to push each flow through), and the
// point where they meet. Flow in US gallons a minute (GPM), head in feet of
// water. Not lengths on a tape, so plain numbers, not fractions. Pure: no DOM.

import { SYSTEMS } from './fusion.js';

// Made-up example pumps, round numbers, nothing from a real catalog. A pump is
// its shutoff head (no flow), its best efficiency point (BEP) and its best efficiency.
export const PUMPS = [
  { id: 'sump', name: 'Example 2" sump pump', shutoff: 45, bepFlow: 60, bepHead: 32, bestEff: 0.45 },
  { id: 'trash', name: 'Example 4" trash pump', shutoff: 110, bepFlow: 300, bepHead: 85, bestEff: 0.55 },
  { id: 'dewater', name: 'Example 6" dewatering pump', shutoff: 170, bepFlow: 700, bepHead: 130, bestEff: 0.7 },
];

// Steel schedule 40 inside diameters, inches.
const STEEL_ID = { '2': 2.067, '3': 3.068, '4': 4.026, '6': 6.065, '8': 7.981, '10': 10.02, '12': 11.938 };
export const PIPE_SIZES = ['2', '3', '4', '6', '8', '10', '12'];

// Hazen-Williams roughness: higher is smoother.
export const MATERIALS = {
  hdpe: { name: 'HDPE', c: 150 },
  steel: { name: 'Steel, schedule 40', c: 120 },
  oldSteel: { name: 'Old rusty steel', c: 100 },
};

// Inside diameter in inches: HDPE IPS from its DR, steel from schedule 40.
export function insideDiameter({ material, size, dr }) {
  if (material === 'hdpe') {
    const od = SYSTEMS.IPS.sizes.find(([s]) => s === size)?.[1];
    return od == null ? null : od * (1 - 2 / parseFloat(dr));
  }
  return STEEL_ID[size] ?? null;
}

// Pump head at a flow and speed (1 = full speed). The curve is a parabola through
// shutoff and BEP; speed follows the affinity laws: flow × speed, head × speed².
export function pumpHead(pump, flow, speed = 1) {
  const k = (pump.shutoff - pump.bepHead) / pump.bepFlow ** 2;
  return speed ** 2 * pump.shutoff - k * flow ** 2;
}

// The flow where the pump makes no head at all (end of its curve).
export function maxFlow(pump, speed = 1) {
  const k = (pump.shutoff - pump.bepHead) / pump.bepFlow ** 2;
  return speed * Math.sqrt(pump.shutoff / k);
}

export function bep(pump, speed = 1) {
  return { flow: pump.bepFlow * speed, head: pump.bepHead * speed ** 2 };
}

// Efficiency: best at BEP, falling off either side (0 at no flow).
export function efficiency(pump, flow, speed = 1) {
  const x = flow / (pump.bepFlow * speed);
  return Math.max(0, pump.bestEff * (2 * x - x * x));
}

// Friction loss in feet over a pipe run (Hazen-Williams, US units):
// 0.002083 × length × (100/C)^1.85 × GPM^1.85 ÷ ID^4.8655.
export function frictionHead(flow, { length, id, c }) {
  if (flow <= 0) return 0;
  return 0.002083 * length * (100 / c) ** 1.85 * flow ** 1.85 / id ** 4.8655;
}

// What the pipe asks for at a flow: lift it up, push it through the pipe, and
// push it past a part-closed valve (loss × (open fraction)^-2 − 1, on the pipe's loss).
export function systemHead(flow, sys) {
  const pipe = frictionHead(flow, sys);
  const valve = sys.valveOpen >= 1 ? 0 : pipe * (1 / sys.valveOpen ** 2 - 1);
  return sys.lift + pipe + valve;
}

// Where pump and pipe meet. Returns { flow, head, eff, ofBep, zone } or
// { flow: 0, zone: 'deadhead' } when the lift is more than the pump can make.
export function dutyPoint(pump, sys, speed = 1) {
  if (systemHead(0, sys) >= pumpHead(pump, 0, speed)) return { flow: 0, head: pumpHead(pump, 0, speed), eff: 0, ofBep: 0, zone: 'deadhead' };
  let lo = 0, hi = maxFlow(pump, speed);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (pumpHead(pump, mid, speed) > systemHead(mid, sys)) lo = mid; else hi = mid;
  }
  const flow = (lo + hi) / 2;
  const ofBep = flow / (pump.bepFlow * speed);
  return { flow, head: pumpHead(pump, flow, speed), eff: efficiency(pump, flow, speed), ofBep, zone: zoneOf(ofBep) };
}

// The usual rule of thumb: run between 70% and 120% of BEP flow, best 80–110%.
export function zoneOf(ofBep) {
  if (ofBep < 0.7) return 'left';
  if (ofBep > 1.2) return 'right';
  if (ofBep < 0.8 || ofBep > 1.1) return 'ok';
  return 'sweet';
}

// Feet of water to PSI, and back. One foot of water is 0.433 PSI.
export const feetToPsi = (ft) => ft * 0.433;
