// valve.js — the kinds of valves on pipe and pump jobs: how each works, its
// parts, what it is good for and what not to do with it; and which kind for
// which job. Ids match the drawings in ui/valveart.js. Pure data: no DOM.
//
// moves: 'turn' (a handle or wheel works it: the picture has Open and Shut),
// 'flow' (the water works it: the picture has Forward and Backward), 'air'
// (air in the line works it: Full of water, Air gathers), or
// 'pilot' (it works itself: the Control valves tool shows it).

export const VALVES = [
  {
    id: 'gate', name: 'Gate valve', moves: 'turn',
    where: 'Water mains, hydrant leads, pump suction and discharge. The most common shutoff in the ground.',
    how: [
      'Turning the wheel or nut screws a wedge (the gate) up out of the water\'s way, or down across it.',
      'Open, the gate is clear up in the bonnet: the water goes straight through with almost no loss.',
      'Shut, the wedge presses into two seats, one each side, and seals.',
    ],
    parts: [
      ['Wedge (gate)', 'The plate that slides across the pipe. Solid wedge, or rubber-coated (resilient seat) on newer water valves.', 'Wears or tears if left part open; rocks and scale in the seat keep it from sealing.'],
      ['Stem', 'Threaded rod that lifts the wedge. Rising stem: you see it come up as it opens. Non-rising: the wedge climbs the stem inside, so count turns.', 'Strips or snaps when forced against a stuck wedge.'],
      ['Packing or O-rings', 'Seal the stem where it leaves the bonnet.', 'Weeps at the stem; snug the packing nut a little, don\'t crank it.'],
    ],
    good: 'Full open or full shut on clean water. Little loss when open.',
    dont: 'Don\'t throttle with it: part open, the wedge flutters in the stream and the water cuts the seats. Don\'t force it with a cheater bar.',
    engine: 'Like a guillotine throttle plate: it slides across instead of tipping, so it is either out of the way or in it.',
    watch: 'Count the turns and write them down: it takes about 3 turns per inch of size plus a few (a 6" is about 20). Most open turning left (counterclockwise), but some cities open right: look for OL or OR on the nut or the valve box lid. Close it slowly on a big line, or the water hammers.',
  },
  {
    id: 'butterfly', name: 'Butterfly valve', moves: 'turn',
    where: 'Big water lines, plant piping, pump stations. Short and light for its size.',
    how: [
      'A round disc sits in the middle of the pipe on a shaft.',
      'A quarter turn (90°) spins the disc from edge-on to the water (open) to flat across it (shut).',
      'Shut, the disc\'s rim presses into a rubber seat liner all the way round.',
    ],
    parts: [
      ['Disc', 'The plate that turns. It stays in the water even open, so it costs a little flow.', 'Rubs the seat through and the edge wears; rags hang on it in dirty water.'],
      ['Seat liner', 'The rubber ring it seals against.', 'Torn or swollen: leaks by, or the valve gets too stiff to turn.'],
      ['Gear operator', 'A handwheel through a worm gear on bigger ones, so it can\'t snap shut.', 'Stripped gear: the wheel spins and nothing moves. A stop screw sets where it ends: set wrong, it never fully shuts.'],
    ],
    good: 'Shutoff on big clean lines; some throttling in the middle of its travel.',
    dont: 'Don\'t slam a lever one shut on a running line. Not for solids: rags wrap the disc. A pig or a camera can\'t pass it.',
    engine: 'It is the throttle plate in a carb throat: a disc on a shaft, a quarter turn from shut to wide open.',
    watch: 'Throttle it between about a third and three quarters open; nearly shut, the water screams through the gap and eats the seat.',
  },
  {
    id: 'ball', name: 'Ball valve', moves: 'turn',
    where: 'Small lines, gauges, drains, sample taps, hose and fuel lines.',
    how: [
      'A ball with a hole bored through it sits between two seats.',
      'A quarter turn lines the hole up with the pipe (open) or turns it crossways (shut).',
      'Handle in line with the pipe: open. Handle across the pipe: shut.',
    ],
    parts: [
      ['Ball', 'Full port: the hole is the pipe\'s size. Reduced port: one size smaller, so it costs some flow.', 'Scored by grit: leaks shut.'],
      ['Seats', 'Plastic (PTFE) rings either side of the ball.', 'Cut when it is left part open in fast water.'],
      ['Stem seal', 'Packing nut under the handle.', 'Weeps; snug the nut a little.'],
    ],
    good: 'Quick, tight shutoff. You can see at a glance if it is open.',
    dont: 'Don\'t leave it part open for long: the stream cuts the seats. On a long line, close it slowly anyway: a quarter turn is fast enough to hammer.',
    engine: 'A fuel shutoff petcock, bigger.',
    watch: 'Water trapped in a shut ball can freeze and split the body: leave it half open over winter once drained.',
  },
  {
    id: 'plug', name: 'Plug valve', moves: 'turn',
    where: 'Sewage and lift stations: the shutoff after the check valve on each pump. Also gas lines (straight plug).',
    how: [
      'A plug with a port through it turns a quarter turn in the body, like a ball valve.',
      'The sewage kind is eccentric: the plug is a half cylinder that swings up out of the flow, then presses sideways into its seat as it shuts.',
      'Open, the plug is out of the stream with nothing for rags to catch on.',
    ],
    parts: [
      ['Plug', 'Rubber-faced on sewage valves.', 'Face torn: leaks by. Grease (sewage fat) can glue it in place if it never moves.'],
      ['Seat', 'One seat on one side of the body. Which end it is on matters: follow the arrow or SEAT mark the maker cast on the body.', 'Grit wears it; a seat on the wrong end leaks under back pressure.'],
      ['Gear operator', 'A handwheel or 2" operating nut through a worm gear, with a position pointer.', 'Wheel spins, plug doesn\'t: stripped gear.'],
    ],
    good: 'Sewage and dirty water: shutoff and some throttling, and it passes solids.',
    dont: 'Don\'t mount a sewage plug valve with the plug shaft straight up in a horizontal line: grit settles in the bottom of the body. Shaft level, plug opening upward, is the usual way.',
    engine: 'A quarter-turn tap, like a ball valve, but built to shrug off rags and grit.',
    watch: 'Work it shut and open once a year or so. A valve that never moves sticks just when you need it.',
  },
  {
    id: 'knife', name: 'Knife gate', moves: 'turn',
    where: 'Slurry, sludge, mud and trash pump lines.',
    how: [
      'A thin, sharp-edged blade slides straight down across the pipe.',
      'It slices through solids that would jam a wedge gate.',
      'Open, the blade is up out of the way and the bore is clear.',
    ],
    parts: [
      ['Blade', 'Flat steel plate with a beveled edge.', 'Bent or eaten by grit; then it won\'t seal.'],
      ['Seat or sleeves', 'Metal seat, or rubber sleeves that the blade pinches between.', 'Rubber sleeves wear out first: leaks by.'],
      ['Packing', 'Seals round the blade where it leaves the body.', 'Leaks slurry out the top; repack it.'],
    ],
    good: 'Isolating thick, dirty lines.',
    dont: 'Don\'t expect it to seal tight on clean water under high pressure. Don\'t throttle with it.',
    engine: 'A guillotine: thin, sharp, and only for open or shut.',
    watch: 'On a self-primer, open it before priming so air can get out.',
  },
  {
    id: 'swing', name: 'Swing check', moves: 'flow',
    where: 'Pump discharges, water and sewage. Lift stations usually have one per pump.',
    how: [
      'A disc (the clapper) hangs from a hinge at the top of the body.',
      'Water flowing forward swings it up and out of the way.',
      'When the pump stops and the water starts back, gravity and the backflow swing it down onto the seat.',
    ],
    parts: [
      ['Clapper (disc)', 'Rubber-faced metal disc on an arm.', 'Face torn: leaks back. Rags under it: stays partly open.'],
      ['Hinge pin', 'Through the top of the body.', 'Wears oval; the clapper then sits crooked and leaks.'],
      ['Lever and weight, or spring', 'Outside on the shaft: helps it shut before the water turns round, and shows you whether it is open.', 'Set wrong: slams, or chatters half open.'],
    ],
    good: 'Low loss; passes solids. A lever outside shows it is working.',
    dont: 'Don\'t put it in a line where the water flows down, and keep the hinge on top: it must be able to fall shut.',
    engine: 'A reed valve: it opens one way with the flow and slaps shut when the flow turns round.',
    watch: 'Slam is the big one. When a pump stops into a tall column, the water reverses in a second; the clapper is still open, then bangs shut against moving water. A lever and weight or spring shuts it sooner.',
  },
  {
    id: 'wafer', name: 'Wafer check (dual plate)', moves: 'flow',
    where: 'Clean water pump discharges where there is little room: booster and well pumps, plant piping.',
    how: [
      'Two half-moon plates fold on a pin down the middle of a thin ring that sits between two flanges.',
      'Forward flow folds the plates open like a book.',
      'Springs fold them shut as soon as the flow slows, before it can turn round: no slam.',
    ],
    parts: [
      ['Plates', 'Two halves of the disc.', 'Flutter and wear the pin when the flow is too low to hold them open.'],
      ['Springs', 'Snap the plates shut early.', 'Break: then it slams like a swing check.'],
      ['Center pin and stop', 'The hinge, and a post that stops the plates opening too far.', 'Rags hang on them: never for sewage.'],
    ],
    good: 'Short, light, non-slam. Clean water.',
    dont: 'Not for sewage or solids: the center pin catches rags. Not right off a pump elbow: give it a few pipe sizes of straight pipe or the plates flutter.',
    engine: 'Two spring-loaded flaps: think of a butterfly valve that only opens one way and springs shut.',
    watch: 'Its plates swing out past the ring when open: check they clear the pipe next to it, especially lined or plastic pipe with a smaller bore.',
  },
  {
    id: 'ballcheck', name: 'Ball check', moves: 'flow',
    where: 'Small sewage and grinder pump discharges, lift stations.',
    how: [
      'A rubber-covered ball sits on a round seat.',
      'Forward flow lifts the ball up and over into a side pocket, clear of the stream.',
      'When the flow stops, the ball rolls back down onto the seat.',
    ],
    parts: [
      ['Ball', 'Rubber-coated, sometimes hollow or weighted for the job.', 'Worn smaller: no longer seals. Wrong weight: chatters.'],
      ['Seat', 'Round ring the ball drops onto.', 'Grit holds the ball off it.'],
      ['Body', 'Has a pocket for the ball and a cover to get it out.', 'Rarely fails.'],
    ],
    good: 'Sewage: no hinge or pin to catch rags.',
    dont: 'Mount it the way the arrow says; most can go horizontal or flow-up, never flow-down.',
    engine: 'The check ball in a fuel pump or a hydraulic line, big.',
    watch: 'Can be noisy as the ball bounces at low flow; that is normal if it seals when stopped.',
  },
  {
    id: 'air', name: 'Air release and air-vac valve', moves: 'air',
    where: 'High points on long lines, and on well and booster pump discharges.',
    how: [
      'A float sits in a small chamber at the top of the pipe.',
      'Air gathers at high points and pushes the water down; the float drops and opens a small hole, the air leaks out, water comes back up, the float shuts it.',
      'An air-vacuum (combination) valve also has a big hole: it blows air out fast when the line fills, and lets air in when it drains so the pipe can\'t suck flat.',
    ],
    parts: [
      ['Float', 'Rides on the water; drops when air takes its place.', 'Sticks or waterlogs: then it spits water or never lets air go.'],
      ['Orifice', 'The hole the air leaves by. Small for running air, large for filling and draining.', 'Plugged with scale or grease; sewage ones need flushing.'],
      ['Isolation valve', 'Under it, so it can come off with the line live.', 'Left shut: the valve does nothing.'],
    ],
    good: 'Keeps air from choking a line and stops a draining pipe collapsing.',
    dont: 'Don\'t use a clean-water one on sewage: grease jams it. Sewage air valves are taller and flushable.',
    engine: 'A float bowl and needle in a carb, upside down: the float lets air out instead of letting fuel in.',
    watch: 'A line that pumps less than it used to, or bangs on startup, may have air piled up at a high point with a dead air valve.',
  },
  {
    id: 'control', name: 'Control valve (pilot operated)', moves: 'pilot',
    where: 'Pressure reducing stations, pump discharges, tank fills. Cla-Val is the name most people know them by.',
    how: [
      'A globe-shaped main valve with a rubber diaphragm on top of its stem, and a cover over the diaphragm.',
      'Water let into the cover pushes the diaphragm down and shuts the valve. Water let out of the cover lets line pressure push it open.',
      'A small pilot valve, piped round the outside in copper or stainless tube, decides how much water is in the cover. The pilot is what makes it a pressure reducer, a sustaining valve, a tank fill or a pump check.',
    ],
    parts: [
      ['Main valve', 'The globe body, seat, disc and stem. On a Cla-Val this is the Hytrol (100-01; the 600 series, 100-20, is the reduced-port version).', 'Disc rubber wears or gets cut: leaks by.'],
      ['Diaphragm', 'Rubber sheet the cover water pushes on. It has more area than the seat, so the same pressure on top beats the pressure underneath.', 'Torn: water passes the cover and the valve won\'t shut.'],
      ['Pilot and tubing', 'The small valve and lines that run it, with a strainer, a fixed restriction and speed needles.', 'Plugged strainer or tubing: the valve sticks open or shut.'],
    ],
    good: 'Holding a pressure, a level, a flow, or opening and shutting slowly so nothing hammers.',
    dont: 'Don\'t start turning screws first. Find which tube or pilot is doing what, gauge it, then adjust one thing a little at a time.',
    engine: 'A vacuum-operated power brake booster or a wastegate actuator: a diaphragm moves the big part, and a small valve decides which side gets the push.',
    watch: 'The Control valves, Adjust and Troubleshoot tools here show one working.',
  },
];

// Which valve for which job: rules of thumb.
export const JOB_GUIDE = [
  ['Shut off clean water', 'Gate (small to medium) or butterfly (big).', ['gate', 'butterfly']],
  ['Shut off sewage or dirty water', 'Plug valve.', ['plug']],
  ['Shut off slurry or sludge', 'Knife gate.', ['knife']],
  ['Throttle (cut the flow back)', 'Butterfly or plug part open; a control valve to hold a pressure or flow. Not a gate or ball.', ['butterfly', 'plug', 'control']],
  ['Stop backflow, clean water, short space', 'Wafer check.', ['wafer']],
  ['Stop backflow, sewage', 'Swing check with a lever, or a ball check.', ['swing', 'ballcheck']],
  ['A small line, a gauge, a drain', 'Ball valve.', ['ball']],
  ['Air at a high point', 'Air release or air-vac valve.', ['air']],
  ['Lower or hold a pressure, fill a tank, open a pump slowly', 'Pilot-operated control valve.', ['control']],
];

export function valve(id) { return VALVES.find((v) => v.id === id); }
