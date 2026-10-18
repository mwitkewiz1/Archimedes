// choose.js — "Which pump?": from what's in the water, how far down it is,
// whether there's power at the hole and how big the job is, to the kind of
// pump (an id in core/kinds.js) and why. Rules of thumb, not a sizing tool:
// the Pump curve checks whether a given pump can do it. Pure: no DOM.

export const QUESTIONS = [
  { key: 'water', label: 'What\'s in the water?', options: [
    ['clear', 'Mostly water, a little grit'],
    ['trash', 'Rocks, sticks, debris'],
    ['slurry', 'Mud and sand, thick'],
  ] },
  { key: 'depth', label: 'How far down is the water from where a pump would sit?', options: [
    ['shallow', 'Less than 20 ft'],
    ['deep', '20 ft or more'],
  ] },
  { key: 'power', label: 'Power at the hole?', options: [
    ['yes', 'Yes, or a generator'],
    ['no', 'No power'],
  ] },
  { key: 'size', label: 'How big is the job?', options: [
    ['small', 'Small: a basement, a trench, a few hours'],
    ['big', 'Big: a site, a pit, days'],
  ] },
];

// Returns { kind, why, also } where also is a second choice or null.
export function choosePump({ water, depth, power, size }) {
  const deep = depth === 'deep';
  if (water === 'slurry') {
    return power === 'yes'
      ? { kind: 'slurry', why: 'Mud and sand need an agitator to stir solids up and hard parts that wear slowly.', also: null }
      : { kind: 'slurry', why: 'Slurry wants an electric slurry pump, so bring a generator. Pumps on top of the ground choke on thick mud and wear out fast.', also: 'diesel' };
  }
  // Too deep to pull from the top: the pump has to go in the hole.
  if (deep) {
    const kind = water === 'trash' ? 'subtrash' : 'submersible';
    return { kind, why: `Past about 20-25 ft no pump on top of the ground can pull water up, so it goes in the hole${power === 'yes' ? '' : ': bring a generator'}.`, also: null };
  }
  if (water === 'trash') {
    if (size === 'small') return { kind: 'gas', why: 'Small job with debris: a gas trash pump carries in by hand. Get the trash model, not the clear-water one.', also: power === 'yes' ? 'subtrash' : null };
    return power === 'yes'
      ? { kind: 'subtrash', why: 'Big job with debris and power at the hole: an electric trash pump in the water passes the junk and needs no priming.', also: 'diesel' }
      : { kind: 'diesel', why: 'Big job with debris and no power: a diesel trash pump on the edge, with its open impeller.', also: null };
  }
  if (size === 'small') return { kind: 'gas', why: 'Small job, mostly water: a gas pump is the easy carry-in answer.', also: power === 'yes' ? 'submersible' : null };
  return power === 'yes'
    ? { kind: 'submersible', why: 'Big job, mostly water, power at the hole: an electric dewatering pump runs quiet with no fuel to haul.', also: 'dieseldw' }
    : { kind: 'dieseldw', why: 'Big job, mostly water, no power: a vacuum-assisted diesel dewatering pump primes itself and runs for days.', also: null };
}
