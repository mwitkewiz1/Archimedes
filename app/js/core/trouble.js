// trouble.js — the pump troubleshooter: what you see, the likely causes in
// the order to check them, how to check each, and the fix. Kind ids match
// core/kinds.js; a cause or symptom with no `kinds` applies to every pump.
// Pure data and a filter: no DOM.

// Groups of kind ids, so the lists below stay short.
const SURFACE = ['centrifugal', 'diesel', 'dieseldw', 'gas'];
const SELF_PRIME = ['diesel', 'dieseldw', 'gas'];
const ELECTRIC = ['submersible', 'subtrash', 'slurry', 'sewage', 'grinder', 'booster', 'turbine', 'centrifugal'];
const SUBMERSIBLE = ['submersible', 'subtrash', 'slurry', 'sewage', 'grinder'];
const ENGINE = ['diesel', 'dieseldw', 'gas'];
const CENTRIFUGAL = ['centrifugal', 'submersible', 'subtrash', 'slurry', 'turbine', 'diesel', 'dieseldw', 'gas', 'sewage', 'grinder', 'booster', 'hydraulic'];

export const SYMPTOMS = [
  {
    id: 'noprime', name: 'Won\'t prime or catch', kinds: SURFACE,
    causes: [
      { why: 'Air leak on the suction side', check: 'Every suction coupling, gasket and hose. Listen for a hiss; a cracked or kinked hose counts. One leak and it pulls air forever.', fix: 'Tighten or replace the gasket, coupling or hose.' },
      { why: 'Priming chamber or casing empty', kinds: ['diesel', 'gas', 'centrifugal'], check: 'Open the priming cap or fill port.', fix: 'Fill it with water before starting.' },
      { why: 'Vacuum system not pulling', kinds: ['dieseldw'], check: 'Vacuum pump drive belt, and the separator float valve.', fix: 'Tension or replace the belt; free or replace a stuck float valve.', part: 'dieseldw' },
      { why: 'Too much suction lift', check: 'Water level to pump centerline. Past about 25 ft at sea level (less up high) it can\'t pull.', fix: 'Move the pump closer to the water, or put a submersible in the hole.' },
      { why: 'Discharge shut, so the air can\'t get out', kinds: SELF_PRIME, check: 'Knife gate or discharge valve position.', fix: 'Open the discharge during priming.' },
      { why: 'Suction strainer plugged or out of the water', check: 'Pull the hose end and look.', fix: 'Clean it; keep it under water and up out of the mud.' },
      { why: 'Worn impeller or wear plate', kinds: SELF_PRIME, check: 'The clearance between impeller and wear plate. Self-primers lose their pull as it opens up.', fix: 'Adjust it closer or replace the wear parts.', part: 'diesel' },
    ],
  },
  {
    id: 'lowflow', name: 'Runs, but little or no flow',
    causes: [
      { why: 'A valve closed or partly closed', check: 'Every valve from suction to the end of the discharge, including the knife gate.', fix: 'Open it.' },
      { why: 'Running backwards', kinds: ELECTRIC, check: 'Three-phase only: bump it and watch the shaft or impeller turn against the arrow on the casing. Backwards it still pumps, just weakly, so it fools people.', fix: 'Lock out, then swap any two of the three motor leads (an electrician\'s job).' },
      { why: 'Oil hoses on backwards', kinds: ['hydraulic'], check: 'Pressure and return lines swapped spin the motor the wrong way.', fix: 'Swap the hoses at the couplers.' },
      { why: 'Plugged strainer, inlet or impeller', check: 'Lock out and look: rags, rocks, mud.', fix: 'Clear it. On sewage and trash pumps, keep wipes and rags out upstream.' },
      { why: 'More head than the pump makes', check: 'The lift plus pipe friction against the pump\'s curve: try it on the Pump curve.', fix: 'Shorter or bigger pipe, less lift, or a pump with more head.', curve: true },
      { why: 'Worn impeller or wear ring gap', check: 'Compare flow and head with a new pump\'s numbers; look at the clearances.', fix: 'Replace or adjust the wear parts.' },
      { why: 'Air getting into the suction', check: 'A whirlpool at the intake (water too shallow over it), or suction leaks.', fix: 'More water over the intake (submergence), seal the leaks.' },
      { why: 'Running too slow', kinds: [...ENGINE, 'booster', 'hydraulic'], check: 'Engine throttle, drive speed, or hydraulic oil flow.', fix: 'Bring it to rated speed. Half speed is half the flow.', curve: true },
    ],
  },
  {
    id: 'trips', name: 'Trips the overload, or runs hot', kinds: [...ELECTRIC, ...ENGINE],
    causes: [
      { why: 'Rock, rag or wipe jammed in the impeller', check: 'Amps climbing, then a trip. Lock out and look.', fix: 'Clear it; keep the strainer or inlet clean.' },
      { why: 'Too much flow: running off the right end of the curve', check: 'Very short discharge, a broken or disconnected pipe, a big pump on a small lift. Try it on the Pump curve.', fix: 'Throttle the discharge back toward BEP.', curve: true },
      { why: 'Lost a phase or low voltage', kinds: ELECTRIC, check: 'Volts on all three legs, and amps on all three. One leg missing and the motor hums, runs hot, trips.', fix: 'Find the blown fuse, bad contact or loose wire.' },
      { why: 'Pumping something heavier than water', kinds: CENTRIFUGAL, check: 'Thick slurry or mud.', fix: 'Expect more amps than the clean-water curve; size the motor for it.' },
      { why: 'Out of the water, no cooling', kinds: SUBMERSIBLE, check: 'Water level when it trips. A submersible\'s motor is cooled by the water around it.', fix: 'Lower the stop float or pump; keep it covered.' },
      { why: 'Bearing failing, dragging the shaft', check: 'Noise, heat at the bearing, a shaft that turns rough by hand (locked out).', fix: 'Replace the bearings, and find why: running far from BEP, or water in the oil.' },
      { why: 'Engine lugging', kinds: ENGINE, check: 'Same as an overload on an electric: too much flow, a jam, or thick mud.', fix: 'Throttle the discharge, clear it, or use a bigger unit.' },
    ],
  },
  {
    id: 'noise', name: 'Loud, rattling like gravel',
    causes: [
      { why: 'Cavitation', kinds: CENTRIFUGAL, check: 'Suction too high or too restricted, or running far right on the curve. Bubbles form at the eye and collapse, which pits the impeller.', fix: 'Less lift, bigger or shorter suction, throttle the discharge.', curve: true },
      { why: 'Debris in the casing', check: 'Lock out and look.', fix: 'Clear it.' },
      { why: 'Bearings worn', check: 'A growl that gets worse; heat at the bearing housing.', fix: 'Replace them.' },
      { why: 'Loose mount or misaligned coupling', kinds: SURFACE, check: 'Base bolts, and the coupling between engine or motor and pump.', fix: 'Tighten and realign.' },
    ],
  },
  {
    id: 'vibration', name: 'Shakes or vibrates',
    causes: [
      { why: 'Impeller out of balance', check: 'Damaged, worn on one side, or partly clogged.', fix: 'Clear or replace it.' },
      { why: 'Running far left of BEP', kinds: CENTRIFUGAL, check: 'Very little flow for the pump: valve nearly shut, or too much head. Try it on the Pump curve.', fix: 'Open up, or a smaller pump or slower speed.', curve: true },
      { why: 'Misalignment or loose base', kinds: SURFACE, check: 'Coupling alignment, base bolts, a trailer not level and blocked.', fix: 'Realign, tighten, block it.' },
      { why: 'Pipe pulling on the pump', check: 'Hose or pipe hanging off the flanges without support.', fix: 'Support the pipe so the pump carries none of its weight.' },
      { why: 'Bent shaft or worn bearings', check: 'Wobble at the shaft (locked out).', fix: 'Replace them.' },
    ],
  },
  {
    id: 'sealleak', name: 'Leaking at the shaft', kinds: [...SURFACE, 'booster', 'turbine'],
    causes: [
      { why: 'Mechanical seal run dry', check: 'Was it started dry, or lost its prime and kept running?', fix: 'Replace the seal; prime before every start.' },
      { why: 'Seal worn by grit', check: 'Sandy or dirty water.', fix: 'Replace it; a hard-face seal (silicon carbide or tungsten carbide) lasts longer in grit.' },
      { why: 'Packing needs adjusting', kinds: ['centrifugal', 'turbine'], check: 'Packing should drip a little to stay cool. Pouring is too loose; dry and hot is too tight.', fix: 'Snug the gland nuts evenly, a little at a time.' },
    ],
  },
  {
    id: 'milky', name: 'Water in the seal oil, or the moisture alarm', kinds: [...SUBMERSIBLE, 'hydraulic'],
    causes: [
      { why: 'Lower seal failing', kinds: SUBMERSIBLE, check: 'Drain a little of the seal chamber oil: milky or watery means water is getting past.', fix: 'Replace the seals now, before the upper one goes and water reaches the motor.' },
      { why: 'Moisture sensor tripped', kinds: SUBMERSIBLE, check: 'The panel\'s seal-fail light.', fix: 'Pull the pump and check the oil. Don\'t keep resetting it.' },
      { why: 'Hydraulic oil leaking into the water', kinds: ['hydraulic'], check: 'A sheen on the water; hose and coupler leaks.', fix: 'Replace the hose or coupler; clean up the oil.' },
    ],
  },
  {
    id: 'shortcycle', name: 'Starts and stops over and over', kinds: ['sewage', 'grinder', 'submersible', 'subtrash', 'slurry', 'booster'],
    causes: [
      { why: 'Check valve stuck open or leaking', check: 'Water running back into the well or tank right after the pump stops.', fix: 'Clean or replace the check valve.' },
      { why: 'Floats too close together, or tangled', kinds: ['sewage', 'grinder', 'submersible', 'subtrash', 'slurry'], check: 'Start and stop float heights; cords wrapped on each other or the pump.', fix: 'Spread them out; tie the cords so they hang free.' },
      { why: 'Pump and elbow not sealing', kinds: ['sewage'], check: 'Sewage pouring out at the base when it runs.', fix: 'Pull the pump; clean or replace the seal ring at the elbow.' },
      { why: 'Pressure tank or sensor problem', kinds: ['booster'], check: 'A waterlogged pressure tank or a bad pressure transducer makes the pressure jump.', fix: 'Set the tank\'s air charge; replace the transducer.' },
      { why: 'A leak downstream', kinds: ['booster'], check: 'Pressure falling with every tap shut.', fix: 'Find and fix the leak.' },
    ],
  },
  {
    id: 'nostart', name: 'Won\'t start',
    causes: [
      { why: 'No power, or a breaker or overload tripped', kinds: ELECTRIC, check: 'Breaker, overload reset, fuses, disconnect. If it tripped, find out why before resetting again.', fix: 'Fix the cause, then reset.' },
      { why: 'Panel switch in Off or Hand-Off-Auto set wrong', kinds: ELECTRIC, check: 'The HOA switch. In Auto it waits for the float.', fix: 'Set it where it belongs.' },
      { why: 'Float hung up or not lifting', kinds: SUBMERSIBLE, check: 'Lift it by hand (it should start); grease and rags hang them.', fix: 'Clean or free it.' },
      { why: 'Thermal or moisture sensor tripped', kinds: SUBMERSIBLE, check: 'The panel\'s alarm lights.', fix: 'Let it cool and find why it got hot; a moisture trip means pull it.' },
      { why: 'Impeller locked by a rock or seized', check: 'Locked out, try to turn the shaft or impeller.', fix: 'Clear the jam; if it\'s seized, bearings or a bad seal.' },
      { why: 'Engine won\'t fire', kinds: ENGINE, check: 'Fuel (and old gas), battery, kill switch, an auto-start panel holding it off.', fix: 'Same as any engine.' },
      { why: 'No air', kinds: ['diaphragm'], check: 'Air supply on, and enough pressure at the pump.', fix: 'Open it up; a bigger compressor.' },
    ],
  },
  {
    id: 'diaphragm', name: 'Fluid out the exhaust, or it stalls', kinds: ['diaphragm'],
    causes: [
      { why: 'A torn diaphragm', check: 'Fluid coming out the air exhaust or muffler.', fix: 'Replace both diaphragms, and check the balls and seats while it\'s open.' },
      { why: 'Air valve iced or stuck', check: 'Frost on the exhaust, or a pump that stops mid-stroke.', fix: 'Dry the air, warm it, or use an anti-icing lube.' },
      { why: 'Ball checks worn or held open', check: 'Weak suction; it strokes but moves little.', fix: 'Clean or replace the balls and seats.' },
      { why: 'Not enough air', check: 'Air pressure and volume at the pump.', fix: 'Bigger hose or compressor; shorter air line.' },
    ],
  },
  {
    id: 'grinderjam', name: 'Grinder stalls or jams', kinds: ['grinder'],
    causes: [
      { why: 'Wipes and rags wrapped on the cutter', check: 'Lock out and look at the cutter.', fix: 'Clear it; tell the owner what can\'t go down the drain.' },
      { why: 'Dull cutter', check: 'Rounded edges on the cutter and ring.', fix: 'Replace the cutter set.' },
    ],
  },
];

const fits = (kinds, kind) => !kind || !kinds || kinds.includes(kind);

// What applies to one pump kind (or every pump when kind is empty): the
// symptoms that can happen, each with only the causes that fit.
export function troubleFor(kind) {
  return SYMPTOMS
    .filter((s) => fits(s.kinds, kind))
    .map((s) => ({ ...s, causes: s.causes.filter((c) => fits(c.kinds, kind)) }))
    .filter((s) => s.causes.length);
}
