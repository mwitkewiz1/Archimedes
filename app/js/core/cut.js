// cut.js — the cut-and-fuse planner for pipe. Owns: where to mark when the saw
// eats a kerf and fusing eats a little of each end. Pure: no DOM.
//
// Three jobs:
//   oneEnd   — cut one end off and fuse that end to the next pipe
//   bothEnds — trim both ends evenly, both ends get fused
//   cutOut   — shorten a run in place: cut a section out, fuse the two ends back
//
// fuse is what ONE pipe end loses when it is faced and fused (his own number).
// A joint has two ends, so cutOut loses fuse twice.
// The saw is always run on the scrap side of the mark, so the kerf comes out of
// the scrap and never out of the pipe you keep.

import { frac, add, sub, mul, div, cmp, ZERO, formatInches } from './measure.js';

const TWO = frac(2);

export const JOBS = {
  oneEnd: 'Cut one end, fuse it',
  bothEnds: 'Trim both ends evenly',
  cutOut: 'Cut a piece out, fuse it back',
};

// input: { job, pipe, finished, takeOff, kerf, fuse } — all rationals (inches).
// Give finished OR takeOff; the other is worked out from pipe.
// Returns { ok, error, numbers, steps, parts } — parts left to right, for the drawing.
export function planCut(input) {
  const { job, pipe, kerf = ZERO, fuse = ZERO } = input;
  let { finished, takeOff } = input;
  if (job !== 'cutOut' && !pipe) return fail('Enter how long the pipe is now.');
  if (!finished && !takeOff) return fail(job === 'cutOut' ? 'Enter how much shorter the run needs to be.' : 'Enter how long it needs to end up, or how much to take off.');
  if (pipe) {
    if (!finished) finished = sub(pipe, takeOff);
    if (!takeOff) takeOff = sub(pipe, finished);
  }
  if (cmp(takeOff, ZERO) <= 0) return fail('The pipe is already that short or shorter. Nothing to cut.');

  if (job === 'oneEnd') {
    const mark = add(finished, fuse);
    const scrap = sub(sub(pipe, mark), kerf);
    if (cmp(scrap, ZERO) < 0) return fail(tooLittle(sub(pipe, mark), kerf));
    return {
      ok: true,
      numbers: { pipe, finished, takeOff, mark, scrap, kerf, fuse },
      steps: [
        { k: 'hook', text: 'Hook your tape on the end you are keeping.' },
        { k: 'mark', text: 'Mark at', value: mark },
        { k: 'saw', text: 'Saw on the scrap side of the mark. The blade eats', value: kerf },
        { k: 'fuse', text: 'Face and fuse the cut end. It loses', value: fuse },
        { k: 'done', text: 'You end up at', value: finished },
      ],
      parts: [
        { kind: 'keep', len: finished },
        { kind: 'fuse', len: fuse },
        { kind: 'kerf', len: kerf },
        { kind: 'scrap', len: scrap },
      ],
    };
  }

  if (job === 'bothEnds') {
    const offEach = div(sub(pipe, add(finished, mul(TWO, fuse))), TWO);
    const scrapEach = sub(offEach, kerf);
    if (cmp(scrapEach, ZERO) < 0) return fail(tooLittle(offEach, kerf, true));
    return {
      ok: true,
      numbers: { pipe, finished, takeOff, offEach, scrapEach, kerf, fuse, between: add(finished, mul(TWO, fuse)) },
      steps: [
        { k: 'mark', text: 'From each end, mark in', value: offEach },
        { k: 'check', text: 'Check: the two marks should be this far apart', value: add(finished, mul(TWO, fuse)) },
        { k: 'saw', text: 'Saw each end on the scrap side of its mark. The blade eats', value: kerf },
        { k: 'fuse', text: 'Face and fuse both ends. Each loses', value: fuse },
        { k: 'done', text: 'You end up at', value: finished },
      ],
      parts: [
        { kind: 'scrap', len: scrapEach },
        { kind: 'kerf', len: kerf },
        { kind: 'fuse', len: fuse },
        { kind: 'keep', len: finished },
        { kind: 'fuse', len: fuse },
        { kind: 'kerf', len: kerf },
        { kind: 'scrap', len: scrapEach },
      ],
    };
  }

  if (job === 'cutOut') {
    const joint = mul(TWO, fuse);
    const gap = sub(takeOff, joint);
    const scrap = sub(gap, mul(TWO, kerf));
    if (cmp(gap, ZERO) <= 0) return fail('Fusing the joint alone takes that much off. Face the ends and fuse; no saw cut needed.');
    if (cmp(scrap, ZERO) < 0) return fail(tooLittle(gap, mul(TWO, kerf)));
    return {
      ok: true,
      numbers: { pipe, finished, takeOff, gap, scrap, joint, kerf, fuse },
      steps: [
        { k: 'mark', text: 'Mark two lines this far apart (outside edge to outside edge)', value: gap },
        { k: 'saw', text: 'Saw on the inside of each line, so the blade only eats the piece coming out. Each cut eats', value: kerf },
        { k: 'fuse', text: 'Face and fuse the two ends together. The joint loses', value: joint },
        { k: 'done', text: 'The run ends up shorter by', value: takeOff },
      ],
      parts: [
        { kind: 'keep', len: null },
        { kind: 'fuse', len: fuse },
        { kind: 'kerf', len: kerf },
        { kind: 'scrap', len: scrap },
        { kind: 'kerf', len: kerf },
        { kind: 'fuse', len: fuse },
        { kind: 'keep', len: null },
      ],
    };
  }
  return fail('Pick a job.');
}

function fail(error) {
  return { ok: false, error };
}

function tooLittle(room, kerf, each) {
  return `There's only ${fmt(room)}${each ? ' to come off each end' : ' to cut away'}, less than the saw blade (${fmt(kerf)}). Face it off instead of sawing.`;
}

const fmt = (a) => formatInches(a);
