// kinds.js — how each kind of pump works, in plain words for someone who
// knows engines: where it's used, how water gets through it, what each part
// does and how it fails. ui/pumpart.js draws each one; the ids match.
// Pure data: no DOM.

export const KINDS = [
  {
    id: 'centrifugal',
    name: 'Centrifugal pump',
    where: 'The basic idea under almost every pump on this tab. On a skid or a base, fed from a tank or a flooded suction.',
    engine: 'Your engine\'s water pump is one. So is the compressor side of a turbo, pumping air instead of water.',
    how: [
      'Water comes in the middle of the spinning impeller (the eye).',
      'The vanes fling it outward, fast.',
      'The volute, the snail-shell casing, gets wider as it goes round. That slows the water down and turns its speed into pressure.',
      'It leaves through the discharge at the top.',
    ],
    parts: [
      ['Impeller', 'The spinning wheel with curved vanes. Its size and speed set the head.', 'Wears or clogs: less flow and head. A rock jammed in it trips the motor overload.'],
      ['Volute (casing)', 'Collects the water and turns speed into pressure.', 'Erodes from grit, cracks if it freezes full of water.'],
      ['Mechanical seal', 'Keeps water from leaking out where the shaft goes through the casing. Two flat faces rub on a film of water.', 'Run dry, the faces burn up in minutes and it leaks.'],
      ['Wear ring', 'A tight gap that stops water sneaking from the outlet side back to the eye.', 'The gap wears open: the pump loses head without anything looking wrong.'],
      ['Bearings', 'Hold the shaft true.', 'Running far from BEP pushes the shaft sideways; bearings and seal go early.'],
    ],
    watch: 'It can\'t suck air. The casing has to be full of water (primed) before it will pump.',
  },
  {
    id: 'submersible',
    name: 'Submersible dewatering pump',
    where: 'Dropped into a sump, pit or trench on a cable and a hose. The whole thing sits under water.',
    engine: 'Think of it as a sealed motor and pump in one can: the water around it is the cooling system.',
    how: [
      'Water comes in through the strainer at the bottom.',
      'The impeller pushes it up through the passage around the motor.',
      'That water cools the motor on its way past.',
      'It leaves through the hose fitting on top.',
    ],
    parts: [
      ['Motor', 'Sealed electric motor inside the top of the can.', 'Overheats if it runs dry or out of water for long: no water, no cooling.'],
      ['Double seal with oil chamber', 'Two seals with oil between them. The lower one keeps grit out; the upper one is the backup that keeps water out of the motor.', 'When the lower one goes, water gets in the oil. Checking the oil for milky water warns you before the motor floods.'],
      ['Strainer', 'Keeps rocks bigger than the pump can pass out of the impeller.', 'Packs with mud: flow drops and the motor runs hot.'],
      ['Thermal and moisture sensors', 'Shut the motor off if it gets too hot or water gets inside.', 'They trip for a reason; resetting over and over cooks the motor.'],
      ['Cable', 'Power in, and the sensor wires back to the panel.', 'Never lift the pump by it. A nicked jacket wicks water into the motor.'],
    ],
    watch: 'It pushes rather than pulls, so it needs no priming. Keep it under water and off the bottom muck.',
  },
  {
    id: 'slurry',
    name: 'Slurry pump with agitator',
    where: 'A submersible built for mud, sand and grit: settling ponds, sumps full of solids.',
    engine: 'Same idea as a submersible, built like a bulldozer: hard parts that wear slowly, turning slower.',
    how: [
      'The agitator, a little stirrer on the bottom of the shaft, spins with the impeller.',
      'It kicks settled sand and mud back up into the water.',
      'The impeller can then pick the solids up while they\'re floating instead of choking on a packed bed.',
      'Thick mixture goes up and out the top like any submersible.',
    ],
    parts: [
      ['Agitator', 'Stirs up settled solids under the pump.', 'Wears down; once it\'s gone the pump sinks into the mud and plugs.'],
      ['Hardened impeller', 'High-chrome iron or rubber-lined, so sand wears it slowly.', 'Still wears: flow and head drop over time.'],
      ['Wear plate', 'A replaceable plate the impeller spins close to.', 'The gap opens as it wears. Many can be adjusted closer before they need replacing.'],
      ['Motor and seals', 'Like a submersible, sealed and cooled by the water around it.', 'Seals see grit all day, so the oil check matters more here.'],
    ],
    watch: 'Slurry is heavier than water. The pump makes less head and pulls more amps than its clean-water curve says.',
  },
  {
    id: 'turbine',
    name: 'Vertical turbine pump',
    where: 'Deep wells and deep wet wells: the motor stays dry on top, the pump end hangs far down in the water.',
    engine: 'Stages work like compound turbos in series: each one adds its boost on top of the last. Each impeller adds its own head.',
    how: [
      'The motor sits on top at the surface.',
      'A long lineshaft runs down the column pipe to the pump end, the bowls.',
      'Each bowl has an impeller. Water goes up through one, then the next, gaining head at each stage.',
      'It rises up the column pipe and out the discharge head at the top.',
    ],
    parts: [
      ['Bowls (stages)', 'Stacked impellers in their own casings. More stages, more head.', 'Sand wears them; a worn stage stops adding its share.'],
      ['Lineshaft and bearings', 'Turn the impellers from the motor far above, with bearings every few feet.', 'Out-of-line or dry bearings: vibration that you feel at the top.'],
      ['Column pipe', 'Carries the water up and holds the bowls.', 'Leaking joints lose flow you never see.'],
      ['Suction bell and strainer', 'The intake at the very bottom.', 'Water level too close to it pulls in air: vortex, noise, lost flow.'],
    ],
    watch: 'It needs enough water above the intake (submergence), or it sucks air down in a whirlpool.',
  },
  {
    id: 'diesel',
    name: 'Diesel trash pump (self-priming)',
    where: 'On a trailer or skid at the edge of the hole, a suction hose down into the water. No power needed on site.',
    engine: 'The engine turns the pump shaft directly. Throttle is pump speed: less throttle walks down the curve exactly like the speed slider on the Pump curve.',
    how: [
      'The priming chamber, a big casing around the impeller, stays full of water between runs.',
      'On start, the impeller churns that water and pulls the air out of the suction hose a bit at a time.',
      'Once the air is out, water from the hole follows and it pumps like any centrifugal.',
      'A check valve on the suction keeps the chamber from draining back when it stops.',
    ],
    parts: [
      ['Priming chamber', 'Holds the water the pump needs to pull air out of the suction hose.', 'Empty chamber: it spins and never catches. Fill it before the first start.'],
      ['Suction hose and check valve', 'The pull side. It has to be airtight.', 'One leaky coupling and it never primes: it just keeps pulling air.'],
      ['Open (trash) impeller', 'Fewer, thicker vanes so rocks and sticks pass.', 'Wears against the wear plate; flow drops.'],
      ['Engine', 'Diesel, sized to the pump\'s horsepower.', 'Run far right on the curve (too much flow) and it lugs, the same as the motor overload tripping on an electric pump.'],
    ],
    watch: 'It can only lift water so far: about 25 feet is the practical limit at sea level (air pressure pushes the water up the hose; 34 feet is the theory). Deeper, put a submersible in the hole.',
  },
];
