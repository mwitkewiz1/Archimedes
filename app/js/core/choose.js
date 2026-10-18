// choose.js — "Which pump?": from the job, how far down the water is,
// whether there's power at the hole and how big the job is, to the kind of
// pump (an id in core/kinds.js) and why. Rules of thumb, not a sizing tool:
// the Pump curve checks whether a given pump can do it. Pure: no DOM.

export const QUESTIONS = [
  { key: 'water', label: 'What\'s the job?', options: [
    ['clear', 'Drain water: mostly water, a little grit'],
    ['trash', 'Drain water with rocks, sticks, debris'],
    ['slurry', 'Mud and sand, thick'],
    ['sewage', 'Sewage or wastewater'],
    ['thick', 'Sludge or chemicals, or it may run dry'],
    ['boost', 'More pressure in a clean-water line'],
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
    ['small', 'Small: a building, a trench, a few hours'],
    ['big', 'Big: a site, a pit, a town, days'],
  ] },
];

// Returns { kind, why, also } where also is a second choice or null.
export function choosePump({ water, depth, power, size }) {
  const deep = depth === 'deep';
  const noPower = power === 'no';
  if (water === 'boost') {
    return { kind: 'booster', why: 'Raising pressure in a clean-water line is a booster\'s job: stacked stages, usually on a drive that holds the pressure steady.', also: null };
  }
  if (water === 'sewage') {
    return size === 'small'
      ? { kind: 'grinder', why: 'Small sewage flow, often through small pipe a long way or uphill: a grinder chops it fine and pushes it hard.', also: 'sewage' }
      : { kind: 'sewage', why: 'A lift station: non-clog pumps on guide rails, usually two taking turns, run by a panel.', also: null };
  }
  if (water === 'thick') {
    return { kind: 'diaphragm', why: 'Sludge, chemicals or a job that may run dry: an air diaphragm pump handles all three. It needs a compressor.', also: null };
  }
  if (water === 'slurry') {
    return noPower
      ? { kind: 'slurry', why: 'Slurry wants an electric slurry pump, so bring a generator. Pumps on top of the ground choke on thick mud and wear out fast.', also: 'diesel' }
      : { kind: 'slurry', why: 'Mud and sand need an agitator to stir solids up and hard parts that wear slowly.', also: null };
  }
  // Too deep to pull from the top: the pump has to go in the hole.
  if (deep) {
    const kind = water === 'trash' ? 'subtrash' : 'submersible';
    return noPower
      ? { kind, why: 'Past about 20-25 ft no pump on top of the ground can pull water up, so it goes in the hole: bring a generator.', also: 'hydraulic' }
      : { kind, why: 'Past about 20-25 ft no pump on top of the ground can pull water up, so it goes in the hole.', also: null };
  }
  if (water === 'trash') {
    if (size === 'small') return { kind: 'gas', why: 'Small job with debris: a gas trash pump carries in by hand. Get the trash model, not the clear-water one.', also: noPower ? null : 'subtrash' };
    return noPower
      ? { kind: 'diesel', why: 'Big job with debris and no power: a diesel trash pump on the edge, with its open impeller.', also: 'hydraulic' }
      : { kind: 'subtrash', why: 'Big job with debris and power at the hole: an electric trash pump in the water passes the junk and needs no priming.', also: 'diesel' };
  }
  if (size === 'small') return { kind: 'gas', why: 'Small job, mostly water: a gas pump is the easy carry-in answer.', also: noPower ? null : 'submersible' };
  return noPower
    ? { kind: 'dieseldw', why: 'Big job, mostly water, no power: a vacuum-assisted diesel dewatering pump primes itself and runs for days.', also: null }
    : { kind: 'submersible', why: 'Big job, mostly water, power at the hole: an electric dewatering pump runs quiet with no fuel to haul.', also: 'dieseldw' };
}
