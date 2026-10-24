// vtrouble.js — the valve troubleshooter: what you see, the likely causes in
// the order to check them, how to check each, and the fix. Kind ids match
// core/valve.js. Pure data and a filter: no DOM.

const TURN = ['gate', 'butterfly', 'ball', 'plug', 'knife'];
const CHECKS = ['swing', 'wafer', 'ballcheck'];

export const SYMPTOMS = [
  {
    id: 'wontopen', name: 'Won\'t open', kinds: ['control'],
    causes: [
      { why: 'An isolating valve on the tubing is shut', check: 'Every small ball or needle valve on the pilot tubing. They get shut for work and left that way.', fix: 'Open them.' },
      { why: 'The pilot is set too low (or too high on a sustaining valve)', check: 'Pilot screw against the gauges. On a reducer, below the downstream pressure it stays shut; on a sustaining or relief valve, above the inlet pressure it stays shut.', fix: 'Turn the screw toward the pressure you need, a quarter turn at a time.' },
      { why: 'The pilot or its outlet tubing is plugged', check: 'Isolate, bleed off, crack the tube nut downstream of the pilot. No water when the pilot should be open: plugged.', fix: 'Clean the pilot and blow out the tubing.' },
      { why: 'Solenoid not getting power, or burned out', check: 'Volts at the coil; a click when it is switched; a screwdriver tip on the coil feels the magnet.', fix: 'Fix the wiring or replace the coil.' },
      { why: 'Main valve stuck shut', check: 'The freedom of movement check: drain the cover and watch the position indicator.', fix: 'Take the cover off and free the stem: scale, a bent stem, or a rock in the seat.' },
      { why: 'Not enough pressure to open it', check: 'Inlet gauge. A diaphragm valve needs a few psi more on the inlet than the outlet to lift (5 psi is a fair guess, check the maker\'s data).', fix: 'Nothing wrong with the valve: the system needs the pressure.' },
    ],
  },
  {
    id: 'wontclose', name: 'Won\'t close, or stays wide open', kinds: ['control'],
    causes: [
      { why: 'Strainer or restriction plugged', check: 'The strainer on the inlet tubing (often a Cla-Val X43) and the fixed restriction after it. Plugged, no water can get into the cover.', fix: 'Clean the strainer screen and the restriction\'s tiny hole. Never drill it bigger.' },
      { why: 'Torn diaphragm', check: 'The diaphragm check: isolate, open a cover plug. Water that keeps coming is passing a tear.', fix: 'Replace the diaphragm (a kit).' },
      { why: 'Pilot stuck open or set too high', check: 'Turn the reducing pilot\'s screw out (lower). If nothing changes, the pilot is stuck.', fix: 'Clean or rebuild the pilot; set it again.' },
      { why: 'Something under the disc', check: 'The tight sealing check: cover full, downstream isolated, does downstream pressure keep rising?', fix: 'Take the cover off, clear it, and look at the disc rubber.' },
    ],
  },
  {
    id: 'hunts', name: 'Hunts: gauge swings, valve thumps', kinds: ['control'],
    causes: [
      { why: 'Opening speed too fast', check: 'The opening speed needle (a CV flow control on a Cla-Val). Wide open, the valve overshoots, then chases back.', fix: 'Turn it clockwise a little at a time until the gauge settles. Try it on the Adjust screen.', adjust: true },
      { why: 'Air in the cover or the tubing', check: 'Crack the highest tube nut or the cover\'s bleed plug with pressure on.', fix: 'Bleed until clear water comes, then snug it.' },
      { why: 'Valve too big for the flow', check: 'It barely cracks open most of the day. Down near the seat, a tiny move is a big change.', fix: 'A smaller valve beside it for low flow (a low-flow bypass), or a throttling trim for the main valve.' },
      { why: 'The pilot fighting another valve', check: 'Two reducers or a reducer and a pump control on the same zone with close settings.', fix: 'Spread the settings apart by several psi.' },
    ],
  },
  {
    id: 'slams', name: 'Slams shut, or the pipe bangs when it closes', kinds: ['control', ...CHECKS],
    causes: [
      { why: 'Closing too fast', kinds: ['control'], check: 'The closing speed needle, if it has one.', fix: 'Turn it clockwise to close slower.', adjust: true },
      { why: 'A check valve shutting late', kinds: CHECKS, check: 'When the pump stops, the water turns round before the check shuts, then the check bangs on moving water. Worst on tall lifts and long lines.', fix: 'A spring or lever-and-weight check, or a wafer (non-slam) check on clean water. A pump control valve that closes before the pump stops cures it.' },
      { why: 'Lever and weight set wrong', kinds: ['swing'], check: 'Weight too far out holds it open.', fix: 'Move the weight in so the clapper shuts sooner.' },
    ],
  },
  {
    id: 'leaksby', name: 'Leaks by when shut', kinds: ['control', ...TURN, ...CHECKS],
    causes: [
      { why: 'Something holding it off the seat', check: 'Rocks, scale, rags, a weld bead from new pipe. Open and shut it fully once or twice: the water can flush it.', fix: 'If that fails, isolate and open it up.' },
      { why: 'Disc or seat rubber worn or cut', check: 'Look at it. Throttling a gate or ball valve cuts the seat; a control valve nearly shut for months cuts its disc.', fix: 'New disc rubber, seat ring or valve.' },
      { why: 'Not fully shut', kinds: ['gate', 'butterfly', 'plug'], check: 'Count the turns against what it took last time; on a butterfly or plug, the stop on the gearbox may be set short.', fix: 'Shut it fully; reset the gearbox stop.' },
      { why: 'Cover not filling all the way', kinds: ['control'], check: 'Strainer and restriction (see Won\'t close).', fix: 'Clean them.' },
    ],
  },
  {
    id: 'lowflow', name: 'Chatters or buzzes at low flow', kinds: ['control', 'wafer', 'ballcheck', 'butterfly'],
    causes: [
      { why: 'Valve too big for the flow', check: 'Just cracked open most of the time.', fix: 'A smaller valve beside it for low flow, or a throttling trim. A smaller check valve on a pump that runs slow.' },
      { why: 'Too little flow to hold a check open', kinds: ['wafer', 'ballcheck'], check: 'Plates or ball flutter between open and shut.', fix: 'A check sized for the real flow, not the pipe.' },
      { why: 'Throttled nearly shut', kinds: ['butterfly'], check: 'Under about a third open the water screams through the gap.', fix: 'Throttle between a third and three quarters open, or use a smaller valve.' },
      { why: 'Cavitation: a gravel-in-the-pipe sound', kinds: ['control', 'butterfly'], check: 'A big drop across the valve: roughly, outlet less than a third of inlet.', fix: 'Take the drop in two steps (two valves), or an anti-cavitation trim.' },
    ],
  },
  {
    id: 'creeps', name: 'Downstream creeps high with no water used', kinds: ['control'],
    causes: [
      { why: 'Leaking by the seat', check: 'The tight sealing check.', fix: 'Clear or replace the disc rubber.' },
      { why: 'Pilot not shutting tight', check: 'With the main valve shut, does water still come out of the pilot\'s outlet tube?', fix: 'Rebuild the pilot.' },
      { why: 'Nothing wrong: water warming in a dead-end line', check: 'Pressure creeps a few psi on a warm day with nothing flowing.', fix: 'A small relief valve downstream.' },
    ],
  },
  {
    id: 'stuck', name: 'Hard to turn or won\'t move', kinds: TURN,
    causes: [
      { why: 'Not worked in years', check: 'Scale, sewage grease or rust on the stem and seat.', fix: 'Work it a little each way, back and forth, never forcing. Exercise it once a year from then on.' },
      { why: 'Turning the wrong way', check: 'Some open right (OR on the nut or lid). A gate already fully open feels stuck.', fix: 'Try the other way, gently.' },
      { why: 'Packing too tight', check: 'Stiff even with the pressure off.', fix: 'Back the packing nut off a little.' },
      { why: 'Gearbox stripped', kinds: ['butterfly', 'plug'], check: 'The wheel turns but the pointer doesn\'t.', fix: 'Repair or replace the gear operator.' },
    ],
  },
  {
    id: 'backspin', name: 'Pump spins backwards or the well drains back when stopped', kinds: CHECKS,
    causes: [
      { why: 'Check valve held open', check: 'Rags or rocks under the clapper or ball; a lever that won\'t drop.', fix: 'Isolate, open the cover and clear it.' },
      { why: 'Clapper or ball worn', check: 'Torn rubber face, worn hinge pin, ball worn smaller.', fix: 'Replace the parts.' },
      { why: 'Spring broken', kinds: ['wafer'], check: 'It still shuts, late and with a bang.', fix: 'Replace the check.' },
    ],
  },
  {
    id: 'airvalve', name: 'Air valve spits water or leaks', kinds: ['air'],
    causes: [
      { why: 'Float stuck or waterlogged', check: 'Isolate it and take the cap off.', fix: 'Clean or replace the float.' },
      { why: 'Grease or scale on the seat', check: 'Sewage lines especially.', fix: 'Flush it; sewage air valves have a backflush hookup.' },
      { why: 'Wrong kind for the line', check: 'A clean-water valve on sewage, or an air release on a line that needs an air-vacuum valve.', fix: 'Swap it for the right kind.' },
    ],
  },
];

// The symptoms for a kind of valve ('' for any), with only that kind's causes.
export function troubleFor(kind) {
  const fits = (x) => !kind || !x.kinds || x.kinds.includes(kind);
  return SYMPTOMS.filter(fits).map((s) => ({ ...s, causes: s.causes.filter(fits) })).filter((s) => s.causes.length);
}
