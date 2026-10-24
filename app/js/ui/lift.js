// lift.js (screen) — the duplex lift station: the wet well and the panel side
// by side in time. It plays the fill-and-pump cycle (or steps it), the panel
// door's switches work, and faults show how the lag pump and alarm take over.

import { el } from './el.js';
import { pumpsNav } from './subnav.js';
import { FLOATS, start, step, explain, nextEvent, setHOA, trip, reset, pressSilence, setFault, setWiring } from '../core/lift.js';
import { wellArt, ladderArt, powerArt } from './liftart.js';

const FAULTS = [
  ['storm', 'Storm: 3× the inflow'],
  ['leadStuck', 'Lead float hung up'],
  ['offStuck', 'Off float stuck up'],
];

export function renderLift(view) {
  let st = start();
  let playing = true;
  const well = wellArt(), ladder = ladderArt(), power = powerArt();
  const now = el('p.lift-now', { 'aria-live': 'polite' }, 'Sewage flows in and the water rises. All four floats hang down; nothing runs.');
  const log = el('ol.lift-log');
  const playBtn = el('button.small-btn', { onclick: () => { playing = !playing; draw(); } });

  function tell(say) {
    if (!say.length) return;
    now.textContent = say.join(' ');
    log.prepend(el('li', say.join(' ')));
    while (log.children.length > 12) log.lastChild.remove();
  }
  function act(next) { tell(explain(st, next)); st = next; draw(); }

  // The panel door: per pump, Hand-Off-Auto, its run light and overload.
  const doors = [0, 1].map((i) => {
    const hoa = ['hand', 'off', 'auto'].map((m) => el('button.seg', { onclick: () => act(setHOA(st, i, m)) }, m[0].toUpperCase() + m.slice(1)));
    const lamp = el('span.lamp.green', { 'aria-hidden': 'true' });
    const lead = el('span.lift-lead');
    const olText = el('span');
    const olBtn = el('button.small-btn', { onclick: () => act(st.ol[i] ? reset(st, i) : trip(st, i)) });
    const card = el('div.pipe-card.door',
      el('div.door-head', lamp, el('strong', `Pump ${i + 1}`), lead),
      el('div.segs', { role: 'group', 'aria-label': `Pump ${i + 1} Hand-Off-Auto` }, hoa),
      el('div.door-ol', olText, olBtn));
    return { card, hoa, lamp, lead, olText, olBtn };
  });
  const alarmLamp = el('span.lamp.red', { 'aria-hidden': 'true' });
  const alarmText = el('span');
  const silenceBtn = el('button.small-btn', { onclick: () => act(pressSilence(st)) }, 'Silence');
  const alarmRow = el('div.pipe-card.door', el('div.door-head', alarmLamp, el('strong', 'High water alarm')), el('div.door-ol', alarmText, silenceBtn));

  // Float wiring: common to normally open (pump down) or to normally closed (pump up).
  const wiring = FLOATS.map((f) => {
    const segs = [['no', 'Pump down (NO)'], ['nc', 'Pump up (NC)']].map(([k, label]) =>
      el('button.seg', { onclick: () => act(setWiring(st, f.id, k)) }, label));
    return { segs, row: el('div.wire-row', el('strong', `${f.name} float`), el('div.segs.two-segs', { role: 'group', 'aria-label': `${f.name} float wiring` }, segs)) };
  });

  const faults = FAULTS.map(([key, label]) => el('button.chip', { onclick: () => act(setFault(st, key, !st[key])) }, label));

  function draw() {
    well.update(st);
    ladder.update(st);
    power.update(st);
    playBtn.textContent = playing ? 'Pause' : 'Play';
    doors.forEach((d, i) => {
      d.hoa.forEach((b, k) => b.setAttribute('aria-pressed', String(['hand', 'off', 'auto'][k] === st.hoa[i])));
      d.lamp.classList.toggle('on', st.m[i]);
      d.lead.textContent = st.alt === i ? 'leads next' : '';
      d.olText.textContent = st.ol[i] ? 'Overload tripped' : 'Overload OK';
      d.olText.className = st.ol[i] ? 'warn' : '';
      d.olBtn.textContent = st.ol[i] ? 'Reset' : 'Trip it';
    });
    alarmLamp.classList.toggle('on', st.light);
    alarmText.textContent = !st.light ? 'Off' : st.horn ? 'Light on, horn sounding' : 'Light on, horn silenced';
    silenceBtn.disabled = !st.horn;
    wiring.forEach((w, k) => w.segs.forEach((b, j) => b.setAttribute('aria-pressed', String(['no', 'nc'][j] === st.wired[FLOATS[k].id]))));
    faults.forEach((b, k) => b.setAttribute('aria-pressed', String(!!st[FAULTS[k][0]])));
  }

  let last = null;
  function frame(t) {
    if (!view.contains(well.svg)) return; // left the screen
    if (playing && last != null) {
      const next = step(st, Math.min(0.1, (t - last) / 1000));
      tell(explain(st, next));
      st = next;
      draw();
    }
    last = t;
    requestAnimationFrame(frame);
  }

  view.append(el('section.lift',
    pumpsNav('lift'),
    el('h1', 'Lift station'),
    el('p.note', 'Sewage runs downhill into a wet well. Two pumps take turns pumping it up and out. Floats tell the panel how full the well is; relays in the panel decide which pump runs.'),
    el('p.engine-note', el('strong', 'Engine terms: '), 'The alternator here charges nothing: it is a relay that swaps which pump goes first each cycle, like rotating tires so both wear the same. ' +
      'A starter (M) is a big relay, like a starter solenoid: a small 120 V coil current switches the big motor current.'),
    el('div.lift-pin', well.svg, now),
    el('div.lift-play', playBtn,
      el('button.small-btn', { onclick: () => { playing = false; const r = nextEvent(st); tell(r.say); st = r.state; draw(); } }, 'Next step'),
      el('button.small-btn', { onclick: () => { st = start(); log.replaceChildren(); now.textContent = 'Started over: the well is nearly empty and filling.'; draw(); } }, 'Start over')),
    el('h2', 'The panel door'),
    el('p.note', 'Hand runs a pump no matter the floats. Off stops it. Auto lets the floats and relays run it. Trip an overload to see the other pump cover.'),
    el('div.doors', doors.map((d) => d.card), alarmRow),
    el('h2', 'Make trouble'),
    el('div.chips', faults),
    el('h2', 'Float wiring'),
    el('p.note', 'A float has three wires: a common, a normally open (NO) and a normally closed (NC). Use the common and one other; cap the third. ' +
      'Common to NO: the contact closes when the float tips up, for pumping a well down. Common to NC: it closes when the float hangs down, for filling a tank. ' +
      'Colors differ by maker, so meter it: with the float hanging, the pair that beeps is common and NC; tip it up and common beeps to NO. The wire in both pairs is the common.'),
    el('div.doors', wiring.map((w) => w.row)),
    el('p.note', 'Wire one backwards and play it. A backwards Lead float starts the pump at the Off float, over and over (short-cycling). A backwards Off float stops the pumps once water covers it, so the well fills to the alarm. A backwards Alarm float sounds on an empty well and stays quiet when it floods.'),
    el('h2', 'Inside the panel: the ladder'),
    el('p.note', 'Power comes in on L1 and crosses a rung to reach L2. Lit wires have power; a filled gap is a closed contact. Each rung is drawn on its own; the same relay\'s contacts show up in other rungs by name (CR1, CR2, ALT, SIL).'),
    ladder.svg,
    el('ol.steps',
      el('li.step', el('span.step-text', 'Lead call: once the Off float is up, the Lead float pulls in CR1. CR1\'s own contact holds it in (the seal-in) as the water drops back past the Lead float, until the Off float drops.')),
      el('li.step', el('span.step-text', 'Alternator: every time CR1 lets go, ALT flips, so the next lead call goes to the other pump.')),
      el('li.step', el('span.step-text', 'Lag call: if the water keeps rising to the Lag float, CR2 pulls in and calls both pumps, held the same way down to the Off float.')),
      el('li.step', el('span.step-text', 'Each pump: Hand goes straight to its starter. Auto goes through the calls. Either way the overload contact (OL) is last before the coil, so a tripped overload stops the pump in Hand too.')),
      el('li.step', el('span.step-text', 'Alarm: the Alarm float lights the red light and sounds the horn. Silence pulls in SIL, which holds itself and opens the horn\'s rung until the water drops.')),
    ),
    el('h2', 'Power side'),
    el('p.note', '480 V three phase feeds each motor through its starter\'s three big contacts (M) and its overload heaters (OL). A control transformer (CPT) makes the 120 V the ladder runs on. Breakers and the disconnect sit ahead of all of it.'),
    power.svg,
    el('details.losses', el('summary', 'What happened, newest first'), log),
  ));
  draw();
  requestAnimationFrame(frame);
}
