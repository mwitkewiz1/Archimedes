// fusion.js — what butt fusion eats, by pipe size and DR. Owns: HDPE outside
// diameters, wall thickness from DR, and turning a mark-to-mark measurement
// into a fusing loss. Pure: no DOM, no storage.
//
// HDPE is rated by DR (dimension ratio), not schedule: DR = outside diameter ÷
// wall thickness. Lower DR = thicker wall = more pressure = a bigger bead.
// The same nominal size has a different outside diameter in each sizing
// system: IPS matches steel pipe, DIPS matches ductile iron.

import { frac, fromDecimal, add, sub, mul, div, cmp, ZERO } from './measure.js';

// Outside diameters in inches, by nominal size, smallest first. Arrays, not
// objects: JS would sort keys like '2' ahead of '1/2'.
export const SYSTEMS = {
  IPS: {
    label: 'IPS (steel pipe sizes)',
    sizes: [
      ['1/2', 0.84], ['3/4', 1.05], ['1', 1.315], ['1 1/4', 1.66], ['1 1/2', 1.9], ['2', 2.375], ['3', 3.5],
      ['4', 4.5], ['5', 5.563], ['6', 6.625], ['8', 8.625], ['10', 10.75], ['12', 12.75], ['14', 14],
      ['16', 16], ['18', 18], ['20', 20], ['22', 22], ['24', 24], ['28', 28], ['30', 30], ['32', 32],
      ['36', 36],
    ],
  },
  DIPS: {
    label: 'DIPS (ductile iron sizes)',
    sizes: [
      ['3', 3.96], ['4', 4.8], ['6', 6.9], ['8', 9.05], ['10', 11.1], ['12', 13.2], ['14', 15.3],
      ['16', 17.4], ['18', 19.5], ['20', 21.6], ['24', 25.8], ['30', 32], ['36', 38.3],
    ],
  },
};

export const DRS = ['7', '9', '11', '13.5', '17', '21', '26', '32.5'];

const odOf = (system, size) => SYSTEMS[system]?.sizes.find(([s]) => s === size)?.[1];

export function pipeName({ system, size, dr }) {
  return `${size}" ${system} DR ${dr}`;
}

// The key a measured pipe is kept under on the phone.
export function pipeId({ system, size, dr }) {
  return `${system}-${size}-${dr}`.replace(/[^\w.-]+/g, '_');
}

// Wall thickness = outside diameter ÷ DR. Null if the size isn't in the table.
export function wall({ system, size, dr }) {
  const od = odOf(system, size);
  if (od == null || !dr) return null;
  return div(fromDecimal(od), fromDecimal(parseFloat(dr)));
}

export function outsideDiameter({ system, size }) {
  const od = odOf(system, size);
  return od == null ? null : fromDecimal(od);
}

// The measure-it-once method: before facing, mark each pipe `markEach` back
// from its end. After fusing, measure mark to mark across the joint. What's
// missing from 2 × markEach is what the joint ate.
export function jointLoss(markEach, across) {
  if (!markEach || !across) return { ok: false, error: 'Enter both numbers.' };
  const loss = sub(mul(frac(2), markEach), across);
  if (cmp(loss, ZERO) < 0) {
    return { ok: false, error: 'Mark to mark came out longer than the two marks added up. Check the marks: each one is measured from its own pipe end, before facing.' };
  }
  if (cmp(loss, markEach) >= 0) {
    return { ok: false, error: 'That says the joint ate more than one whole mark distance. Check the numbers.' };
  }
  return { ok: true, loss };
}

// Several measured joints → average, lowest and highest.
export function summarize(losses) {
  if (!losses.length) return null;
  let total = ZERO, low = losses[0], high = losses[0];
  for (const l of losses) {
    total = add(total, l);
    if (cmp(l, low) < 0) low = l;
    if (cmp(l, high) > 0) high = l;
  }
  return { count: losses.length, average: div(total, frac(losses.length)), low, high };
}

// Both ends are faced and melted the same, so each pipe end loses half the joint.
export const perEnd = (joint) => div(joint, frac(2));
