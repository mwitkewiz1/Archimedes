// control.js — pilot-operated control valves (the Cla-Val kind): one main
// valve, many jobs, each set by the pilot piped round it. For each job: what
// it does, what its pilot feels, the one thing you change on the screen, and
// where that leaves the valve. Pure: no DOM.
//
// The main valve the same in all of them: water in the cover shuts it, water
// out of the cover lets line pressure open it. Two ways of piping it:
//  - modulating (two-way pilot): a fixed restriction lets inlet water into the
//    cover all the time; the pilot bleeds it out to downstream. Pilot open more,
//    cover drains, valve opens more. It holds anywhere in between.
//  - on-off (three-way pilot): the pilot connects the cover either to the inlet
//    (fills it: shut) or to a drain or downstream (empties it: open).

// Each job's `input` is a slider ({ label, min, max, unit, start }) or a list of
// steps to walk through ({ steps: [...] }). state(x) gives:
//   open: where the main valve ends up, 0 shut to 1 wide open
//   pilot: how far the pilot is open (letting the cover drain), 0..1
//   inlet, outlet: gauge readings in psi (outlet null where it goes to a tank or drain)
//   says: what is happening, in plain words
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export const JOBS = [
  {
    id: 'prv', name: 'Pressure reducing', cla: 'Cla-Val 90-01: Hytrol main valve with a CRD pilot',
    kind: 'modulating',
    does: 'Holds the pressure downstream at a set number, say 60 psi, however hard the street side pushes and whatever the houses or the plant are using.',
    senses: 'The pilot feels the downstream pressure. A spring in it pushes it open; downstream pressure pushes it shut. Below the setting it opens and lets the cover drain; at the setting it pinches back.',
    set: 'The screw on top of the pilot: clockwise (in) raises the downstream pressure, counterclockwise (out) lowers it. A quarter turn at a time, watching the downstream gauge, with some water flowing.',
    input: { label: 'Water used downstream', min: 0, max: 100, unit: '%', start: 40 },
    state(use) {
      const u = use / 100;
      const open = u === 0 ? 0 : clamp(0.08 + u * 0.8);
      return { open, pilot: u === 0 ? 0 : clamp(0.15 + u * 0.75), inlet: 120, outlet: Math.round(60 - u * 3),
        says: u === 0 ? 'Nothing used: downstream comes up to 60 and the pilot shuts. The restriction fills the cover and the valve closes drip tight, holding 60 downstream.'
          : `Using ${use}%: downstream sags a hair below 60, the pilot opens a little, the cover bleeds down and the valve opens just enough to feed it. It droops a pound or three at full flow; that is normal.` };
    },
  },
  {
    id: 'sustain', name: 'Pressure sustaining and relief', cla: 'Cla-Val 50-01: Hytrol main valve with a CRL pilot',
    kind: 'modulating',
    does: 'Keeps the pressure upstream from going over a set number. As relief it dumps the extra to a drain. As sustaining, in line, it won\'t let the upstream side fall below the setting, so a pump\'s discharge or a high zone keeps its pressure while water goes on downstream.',
    senses: 'The pilot feels the inlet pressure. A spring holds it shut; inlet pressure over the setting pushes it open, the cover drains, the main valve opens.',
    set: 'The pilot screw: clockwise raises the setting. On relief, set it 5 to 10 psi over normal working pressure so it doesn\'t weep all day.',
    input: { label: 'Pressure coming in', min: 60, max: 140, unit: 'psi', start: 90 },
    state(p) {
      const over = p - 100;
      const open = clamp(over / 20);
      return { open, pilot: clamp(over / 15), inlet: p, outlet: null,
        says: over <= 0 ? `In at ${p}: under the 100 psi setting, the pilot stays shut, the cover stays full and the main valve shut.`
          : `In at ${p}: ${over} psi over the setting. The pilot opens, the cover drains and the valve opens ${Math.round(open * 100)}% to let the extra go, holding the inlet near 100.` };
    },
  },
  {
    id: 'pump', name: 'Pump control (booster)', cla: 'Cla-Val 60-11: Hytrol with solenoid pilot, speed controls and a limit switch',
    kind: 'on-off',
    does: 'Lets a pump start and stop against a shut valve, then opens and closes slowly, so the water never slams. It also does the check valve\'s job.',
    senses: 'A solenoid pilot, run by the pump\'s starter. A limit switch on top of the main valve\'s stem tells the starter when the valve is all the way shut.',
    set: 'Two needle valves set how fast it opens and how fast it closes. Clockwise slows it. Open and close in about the time it takes the water column to start and stop gently, often 30 to 90 seconds on a long line.',
    input: { steps: ['Pump off, valve shut', 'Start: pump runs against the shut valve', 'Valve opens slowly', 'Running, wide open', 'Stop called: pump keeps running, valve closes slowly', 'Valve shut: the limit switch stops the pump'] },
    state(k) {
      const open = [0, 0, 0.5, 1, 0.5, 0][k];
      const says = [
        'Pump off. Cover full of water from the pipe: valve shut, holding the system\'s water back like a check valve.',
        'The starter energizes the motor and the solenoid together. The pump builds pressure against the shut valve: no rush of water yet.',
        'The solenoid drains the cover through the opening-speed needle. The valve opens over many seconds and the water column gets moving gently.',
        'Wide open, pumping.',
        'Stop pressed (or the tank is full). The solenoid lets water back into the cover through the closing-speed needle. The pump keeps running while the valve slowly shuts, so the flow winds down instead of stopping dead.',
        'The valve seats, the limit switch opens and the starter drops the pump. No slam, no backspin. If power fails, a check feature in the pilot shuts the valve.',
      ][k];
      return { open, pilot: [0, 0, 1, 1, 0, 0][k], inlet: [30, 95, 85, 75, 85, 95][k], outlet: [70, 70, 72, 74, 72, 70][k], says, motor: k > 0 && k < 5 };
    },
  },
  {
    id: 'altitude', name: 'Altitude (tank fill)', cla: 'Cla-Val 210-01: Hytrol with an altitude pilot',
    kind: 'on-off',
    does: 'Fills a tank or reservoir and shuts when it is full, so it never overflows. Opens again when the level has dropped a set amount.',
    senses: 'The altitude pilot feels the tank\'s head (its depth, as pressure) through a sensing line run straight to the tank.',
    set: 'The pilot screw sets the high level; a second adjustment sets how far it drops before refilling (the differential). Set the high level a foot or two below overflow.',
    input: { steps: ['Tank low: filling', 'Rising', 'Full: valve shuts', 'Water used: level drops a little, stays shut', 'Below the differential: opens and refills'] },
    state(k) {
      const open = [1, 1, 0, 0, 1][k];
      const says = [
        'Tank low. The pilot keeps the cover drained: valve wide open, filling.',
        'Still under the high level: still wide open. It is not a throttling valve; it is open or shut.',
        'The tank\'s head reaches the pilot\'s setting. The pilot flips, fills the cover from the inlet, and the valve shuts before overflow.',
        'The level drops a little as water is used. Still inside the differential, so it stays shut: no flapping open and shut on every gallon.',
        'Below the differential. The pilot drains the cover and the valve opens fully to refill.',
      ][k];
      return { open, pilot: open, inlet: 80, outlet: null, says, tank: [0.3, 0.6, 0.95, 0.85, 0.75][k] };
    },
  },
  {
    id: 'flow', name: 'Rate of flow control', cla: 'Cla-Val 40-01: Hytrol with a differential pilot and an orifice plate',
    kind: 'modulating',
    does: 'Holds the flow to a set rate, however much the downstream side would pull: keeps a pump on its curve, or shares a source fairly between users.',
    senses: 'The pilot feels the pressure drop across an orifice plate in the line. More flow, more drop. When the drop says the flow is over the setting, the pilot lets the cover fill and the valve pinches back.',
    set: 'The pilot screw sets the flow: clockwise raises it. Check against a flow meter.',
    input: { label: 'How hard downstream pulls', min: 0, max: 200, unit: '% of setting', start: 150 },
    state(pull) {
      const flow = Math.min(pull, 100);
      const open = pull <= 100 ? clamp(0.1 + pull / 115) : clamp(0.95 - (pull - 100) / 220);
      return { open: pull === 0 ? 0 : open, pilot: pull === 0 ? 0 : open, inlet: 90, outlet: Math.round(80 - Math.min(pull, 200) / 4), flow,
        says: pull <= 100 ? `Pulling ${pull}% of the setting: under the limit, the valve opens as far as it needs to and lets it all through.`
          : `Pulling ${pull}%: more than the setting. The orifice drop rises, the pilot fills the cover and the valve throttles back to hold the flow at 100%.` };
    },
  },
  {
    id: 'check', name: 'Check (non-slam)', cla: 'Cla-Val 81-01: Hytrol with the cover piped to downstream through a check',
    kind: 'on-off',
    does: 'Lets water go one way only, and shuts with a cushion instead of a slam.',
    senses: 'No adjusting pilot: small check valves in the tubing. Forward flow drains the cover to downstream; when downstream gets higher than upstream, downstream water fills the cover and shuts it.',
    set: 'Nothing to set except, if fitted, a closing-speed needle: clockwise closes slower.',
    input: { steps: ['Forward flow', 'Flow slows', 'Downstream pushes back'] },
    state(k) {
      return { open: [1, 0.4, 0][k], pilot: [1, 0.5, 0][k], inlet: [80, 72, 50][k], outlet: [75, 70, 70][k], says: [
        'Inlet higher than outlet: the cover drains to downstream and the valve opens with the flow.',
        'Pump slowing: the valve follows it down.',
        'Outlet higher than inlet: downstream water fills the cover and the valve seats. The tubing check stops the cover draining back.',
      ][k] };
    },
  },
  {
    id: 'solenoid', name: 'Solenoid on-off', cla: 'Cla-Val 136-01: Hytrol with a three-way solenoid pilot',
    kind: 'on-off',
    does: 'Opens or shuts on an electric signal from a timer, a float switch, a PLC or a pump starter, without slamming.',
    senses: 'A small three-way solenoid valve. One way it feeds inlet water into the cover (shut); the other it vents the cover (open). Normally open or normally closed, depending which way it was ordered.',
    set: 'Opening and closing speed needles, if fitted. The solenoid itself has nothing to set; check its volts and that it clicks.',
    input: { steps: ['Solenoid off', 'Solenoid on'] },
    state(k) {
      return { open: k, pilot: k, inlet: 80, outlet: k ? 70 : 40, says: [
        'Off (on a normally closed valve): inlet water in the cover, valve shut.',
        'On: the solenoid vents the cover and the valve opens, as fast as the opening speed needle lets the cover empty.',
      ][k] };
    },
  },
  {
    id: 'surge', name: 'Surge anticipator', cla: 'Cla-Val 52-03: Hytrol with high- and low-pressure pilots, on a tee to a drain',
    kind: 'modulating',
    does: 'Protects a pump\'s discharge line from water hammer when the pump stops suddenly (power failure). It opens before the hammer comes back, not after.',
    senses: 'Two pilots feel the line pressure. When a pump stops, the line pressure drops first (the down surge); the low-pressure pilot sees it and opens the valve. The high-pressure wave comes back a second or two later and finds the valve already open to a drain.',
    set: 'The low-pressure pilot below the normal running pressure, the high-pressure pilot above it. The closing speed needle sets how slowly it closes afterwards.',
    input: { steps: ['Pump running, normal pressure', 'Power fails: pressure dips', 'The wave comes back', 'Closes slowly'] },
    state(k) {
      return { open: [0, 0.8, 1, 0.3][k], pilot: [0, 1, 1, 0.3][k], inlet: [80, 35, 130, 85][k], outlet: null, says: [
        'Running at 80 psi: between the two settings, both pilots shut, cover full, valve shut.',
        'Power cuts out. The water column keeps going and pulls the pressure down: under the low setting, so the low-pressure pilot drains the cover and the valve starts to open.',
        'The water swings back as a high-pressure wave. The valve is already open, so the wave goes out the drain instead of splitting a pipe or the pump\'s case.',
        'Pressure settles. The valve closes slowly on its closing speed needle so it doesn\'t make a hammer of its own.',
      ][k] };
    },
  },
];

export function job(id) { return JOBS.find((j) => j.id === id); }

// Where a job sits for a slider value or a step: its own state, clamped to its input.
export function jobState(j, x) {
  const v = j.input.steps ? clamp(Math.round(x), 0, j.input.steps.length - 1) : clamp(x, j.input.min, j.input.max);
  return j.state(v);
}

// The three checks Cla-Val's manuals give for any main valve, before blaming a pilot.
export const THREE_CHECKS = [
  ['Diaphragm', 'Shut the isolating valves on both sides. Shut the tubing to the cover and open a cover plug. A trickle that dies off is water in the cover; a steady stream that keeps coming is a torn diaphragm.'],
  ['Freedom of movement', 'With pressure on, open and shut the valve by letting the cover drain and fill (a spare tube or the cover plug). Watch the position indicator travel all the way, smoothly, both ways. Stuck or jerky: scale, a bent stem, or something in the seat.'],
  ['Tight sealing', 'Fill the cover so the valve is shut, shut the downstream isolating valve, and open a downstream gauge tap or drain. Water that keeps coming is getting past the seat: worn disc rubber or something under it.'],
];
