// pipes.js — the pipes Matthew has measured fusing loss on, kept on this
// phone. Each pipe: { id, system, size, dr, joints: [{ mark, across, date }] },
// lengths kept as typed text so they read back the way he wrote them.

import { load, save } from './store.js';
import { parseMeasure } from '../core/measure.js';
import { jointLoss, summarize, perEnd, pipeName } from '../core/fusion.js';

export function loadPipes() {
  return load('pipes', []);
}

export function savePipes(pipes) {
  save('pipes', pipes);
}

const inches = (text) => parseMeasure(text || '')?.value || null;

// The loss each saved joint works out to (skips any that don't add up).
export function jointLosses(pipe) {
  return pipe.joints
    .map((j) => jointLoss(inches(j.mark), inches(j.across)))
    .filter((r) => r.ok)
    .map((r) => r.loss);
}

// { name, joint: summary or null, end: average per pipe end or null }
export function pipeLoss(pipe) {
  const joint = summarize(jointLosses(pipe));
  return { name: pipeName(pipe), joint, end: joint ? perEnd(joint.average) : null };
}

export function findOrAddPipe(pipes, { system, size, dr }) {
  let p = pipes.find((x) => x.system === system && x.size === size && x.dr === dr);
  if (!p) {
    p = { id: `${system}-${size}-${dr}`.replace(/[^\w.-]+/g, '_'), system, size, dr, joints: [] };
    pipes.push(p);
  }
  return p;
}
