// diode.js (screen) — the Electric tab's Diodes tool: the one-way valve and
// which end is which, LEDs and their resistor, the flyback diode on a relay
// coil, the bridge rectifier (animated), and checking a diode with a meter.

import { el } from './el.js';
import { load, save } from './store.js';
import { pretty } from './frac.js';
import { electricNav } from './subnav.js';
import { ohmsText } from './resistor.js';
import { oneWay, whichEnd, ledLegs, flyback, kickTrace, bridge } from './diodeart.js';
import { LEDS, ledResistor, dcOut, READINGS, judge, BRIDGE_CHECKS } from '../core/diode.js';
import { bandsFor, COLOR } from '../core/resistor.js';
import { parseValue, formatNumber } from '../core/ohm.js';

const SPEED = 0.4; // AC cycles a second in the drawing: slow enough to follow
const SUPPLY = 24; // the relay drawing's DC control volts

const FLY = {
  in: { on: 'Switch on: current runs down through the coil and the relay pulls in. The diode faces against the supply, so it carries nothing.',
    off: 'Switched off: the coil\'s current keeps going for a moment. The diode gives it a loop to coast round till it dies away, so the switch never sees more than 24.7 V. The relay drops out a few thousandths of a second later than it would.' },
  none: { on: 'Switch on: current runs through the coil and the relay pulls in, the same as with a diode.',
    off: 'Switched off with no diode: the coil\'s current has nowhere to go, so the volts jump to hundreds and spark across the opening contact, or punch through the transistor in a PLC output. Contacts pit, outputs die, and the spike can upset electronics nearby.' },
  backwards: { on: 'Switched on with the diode in backwards: it faces with the supply, a dead short round the coil. The fuse blows (or the output trips) and the relay never pulls in.',
    off: 'Backwards does nothing while it\'s off. Switch it on and it shorts the supply.' },
};

const RECT = {
  half: 'One diode passes only the top half of each wave. The load gets pulses with gaps: rough DC at less than half the power.',
  bridge: 'Four diodes. On the top half of the wave one pair carries the current; on the bottom half, the other pair. Either way it leaves by + and comes back by −, so both halves push the load the same way: DC, still bumping 120 times a second.',
  cap: 'A capacitor across the output fills at the top of each hump and feeds the load in between, so the bumps nearly smooth out. The diodes now carry current only for a moment at each peak.',
};

const FRESH = { back: false, supply: '24', led: 'red', mA: 10, fly: 'in', on: true, kind: 'bridge', vac: '24', fwd: 'drop', bk: 'ol' };

export function renderDiode(view) {
  const st = { ...FRESH, ...load('diode', {}) };
  // A row of buttons setting st[key]; cls sets the columns (three without it).
  const segs = (list, key, after, cls) => {
    const btns = list.map(([k, label]) => el('button.seg', { onclick: () => { st[key] = k; after(); } }, label));
    const wrap = el(cls ? `div.segs.${cls}` : 'div.segs', { role: 'group' }, btns);
    wrap.sync = () => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(list[i][0] === st[key])));
    return wrap;
  };

  // One way.
  const wayArt = el('div');
  const wayBtn = el('button.chip', { onclick: () => { st.back = !st.back; drawWay(); } }, 'Turn the diode round');
  const waySay = el('p.lift-now', { 'aria-live': 'polite' });
  function drawWay() {
    save('diode', st);
    wayBtn.setAttribute('aria-pressed', String(st.back));
    wayArt.replaceChildren(oneWay(st.back));
    waySay.textContent = st.back
      ? 'Turned round, it blocks: nothing flows, the lamp is dark, and the battery\'s full 12 V sits across the diode. Push hard enough backwards (past its volts rating) and it breaks down for good.'
      : 'The arrow points with the flow, so it passes. Getting through costs about 0.7 V, so the lamp gets 11.3 of the 12.';
  }

  // LEDs.
  const supply = el('input.measure', { id: 'd-supply', inputmode: 'decimal', autocomplete: 'off', oninput: () => { st.supply = supply.value; drawLed(); } });
  supply.value = st.supply;
  const ledSeg = segs(LEDS.map((l) => [l.id, l.name]), 'led', () => drawLed(), 'four-segs');
  const mASeg = segs([[5, '5 mA, dim'], [10, '10 mA'], [20, '20 mA, full']], 'mA', () => drawLed());
  const ledOut = el('div.cut-out', { 'aria-live': 'polite' });
  function drawLed() {
    save('diode', st);
    ledSeg.sync(); mASeg.sync();
    const led = LEDS.find((l) => l.id === st.led) || LEDS[0];
    const r = ledResistor(parseValue(st.supply), led.vf, st.mA);
    if (!r.ok) { ledOut.replaceChildren(el('p.note', r.error)); return; }
    const b = bandsFor(r.pick, 2);
    ledOut.replaceChildren(
      el('div.joint-result',
        el('div.note', `(${formatNumber(parseValue(st.supply))} − ${led.vf}) V ÷ ${st.mA / 1000} A = ${ohmsText(r.ohms)}. Next size up:`),
        el('div.big', ohmsText(r.pick)),
        b.ok && el('div.note', `Bands: ${b.bands.map((c) => COLOR[c].name.toLowerCase()).join(', ')}, then gold.`)),
      el('p', `That lets ${formatNumber(r.mA)} mA through and makes ${formatNumber(r.watts)} W of heat: `,
        r.size ? ['a ', el('strong', ...pretty(`${r.size[0]} W`)), ' resistor or bigger.'] : 'more than a resistor should carry; use a lower supply.'));
  }

  // Flyback.
  let after = false, timer = 0;
  const flyArt = el('div');
  const traceArt = el('div');
  const flySay = el('p.lift-now', { 'aria-live': 'polite' });
  const flySeg = segs([['in', 'Diode in'], ['none', 'No diode'], ['backwards', 'Backwards']], 'fly', () => { after = false; drawFly(); });
  const onSeg = segs([[true, 'Switch on'], [false, 'Switch off']], 'on', () => {
    clearTimeout(timer);
    after = !st.on;
    if (after) timer = setTimeout(() => { after = false; if (view.contains(flyArt)) drawFly(); }, 1800);
    drawFly();
  }, 'two-segs');
  function drawFly() {
    save('diode', st);
    flySeg.sync(); onSeg.sync();
    flyArt.replaceChildren(flyback(st.fly, st.on, after));
    traceArt.replaceChildren(kickTrace(st.fly, SUPPLY));
    flySay.textContent = FLY[st.fly][st.on ? 'on' : 'off'];
  }

  // Bridge.
  const art = bridge();
  const kindSeg = segs([['half', 'One diode'], ['bridge', 'Bridge'], ['cap', 'Bridge + capacitor']], 'kind', () => drawBridge());
  const rectSay = el('p.lift-now', { 'aria-live': 'polite' });
  const vac = el('input.measure', { id: 'd-vac', inputmode: 'decimal', autocomplete: 'off', oninput: () => { st.vac = vac.value; drawBridge(); } });
  vac.value = st.vac;
  const dcAns = el('div', { 'aria-live': 'polite' });
  function drawBridge() {
    save('diode', st);
    kindSeg.sync();
    rectSay.textContent = RECT[st.kind];
    const v = parseValue(st.vac);
    if (!(v > 0)) { dcAns.replaceChildren(el('p.note', 'Type the AC volts going in.')); return; }
    const d = dcOut(v, st.kind === 'half' ? 'half' : 'bridge');
    dcAns.replaceChildren(el('div.read-table',
      el('div.read-row', el('span', 'No capacitor'), el('strong', `${formatNumber(Math.round(d.avg * 10) / 10)} V DC`)),
      el('div.read-row', el('span', 'With a capacitor, light load'), el('strong', `${formatNumber(Math.round(d.peak * 10) / 10)} V DC`))),
      el('p.note', `With a capacitor it reads about 1.4 times the AC (${formatNumber(v)} × 1.414, less ${st.kind === 'half' ? '0.7 V for the diode' : '1.4 V for two diodes'}), and sags under load.`));
  }
  let last = null, t = 0;
  function frame(now) {
    if (!view.contains(art.svg)) return; // left the screen
    // Reduced motion: hold one still frame, on the top half of the wave.
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt = last == null || still ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    t = t ? t + dt * SPEED : 1.3;
    art.update(st.kind, t);
    requestAnimationFrame(frame);
  }

  // Meter check.
  const fwdSeg = segs(READINGS, 'fwd', () => drawJudge(), 'four-segs');
  const bkSeg = segs(READINGS, 'bk', () => drawJudge(), 'four-segs');
  const verdict = el('div.verdict', { 'aria-live': 'polite' });
  function drawJudge() {
    save('diode', st);
    fwdSeg.sync(); bkSeg.sync();
    const v = judge(st.fwd, st.bk);
    verdict.replaceChildren(el({ good: 'div.pcheck', bad: 'div.pcheck.pc-bad', check: 'div.pcheck.pc-watch' }[v.say], el('strong', v.title), el('p.part-does', v.why)));
  }

  const jump = (label, target) => el('button.chip', { onclick: () => target.scrollIntoView({ behavior: 'smooth' }) }, label);
  const hWay = el('h2', 'A one-way valve'), hLed = el('h2', 'LEDs'), hFly = el('h2', 'Flyback diode on a relay coil');
  const hBridge = el('h2', 'Bridge rectifier: AC into DC'), hTest = el('h2', 'Checking one with a meter');

  view.append(el('section.diode',
    electricNav('diode'),
    el('h1', 'Diodes'),
    el('p.note', 'A diode lets current through one way and blocks it the other.'),
    el('div.chips', jump('One way', hWay), jump('LEDs', hLed), jump('Flyback', hFly), jump('Bridge', hBridge), jump('Meter check', hTest)),

    hWay,
    wayArt,
    el('div.chips', wayBtn),
    waySay,
    el('p.engine-note', el('strong', 'Engine terms: '), 'A diode is a check valve, or the reed valve on a two-stroke\'s intake: it opens one way and slams shut the other. ' +
      'It takes a little push to crack open (about 0.7 V, its cracking pressure), and like any check valve it has a limit backwards before it blows through.'),
    el('h2.small', 'Which end is which'),
    whichEnd(),
    el('ul.rules',
      el('li', 'The stripe on the part is the bar on the symbol: the − end (cathode). Current goes in the plain end and out the stripe.'),
      el('li', 'On a diagram the arrow points the way current passes, from + toward −.'),
      el('li', 'Two numbers matter on a part: its amps, and its volts backwards (PIV). A replacement needs at least both.'),
    ),

    hLed,
    el('p', 'An LED is a diode that glows. It takes about 2 V (red) to 3 V (blue or white), and it must have a resistor in line, or it pulls all it can and burns out in a blink. LED pilot lights for a panel have the resistor built in.'),
    ledLegs(),
    el('label.field', { for: 'd-supply' }, el('span.field-label', 'Supply volts (DC)'), supply),
    el('p.field-label', 'LED color'), ledSeg,
    el('p.field-label', 'How bright'), mASeg,
    ledOut,

    hFly,
    el('p.note', 'A relay or contactor coil on DC (24 V control, a PLC output) has a diode across it, stripe to +. Pick a setup and switch it off.'),
    flySeg,
    flyArt,
    onSeg,
    flySay,
    el('h2.small', 'Volts across the switch as it opens'),
    traceArt,
    el('p.engine-note', el('strong', 'Engine terms: '), 'It\'s the ignition coil trick: the points open, the coil\'s field collapses, and its volts jump to thousands to fire the plug. In a relay that spark is the enemy. ' +
      'It\'s water hammer too: slam a valve on a moving column of water and the pressure spikes. The diode is a bypass that lets the flow coast round and die quietly.'),
    el('ul.rules',
      el('li', 'Only on DC coils. An AC coil can\'t have one (it would short every other half-wave); it gets a snubber (a resistor and capacitor) or a varistor (MOV) clipped across instead.'),
      el('li', 'Many relay sockets and DC solenoid valve plugs have the diode built in and are marked + and −: the + wire has to go to +, or it\'s a backwards diode.'),
      el('li', 'Shorted diode: the relay never pulls in and the fuse or output trips. Open diode: it all still works, but contacts and outputs wear out early.'),
    ),

    hBridge,
    kindSeg,
    art.svg,
    rectSay,
    el('p.engine-note', el('strong', 'Pump terms: '), 'An air double-diaphragm pump does the same with four check balls: the diaphragms go back and forth, but the balls steer every stroke out the discharge. ' +
      'Your engine\'s alternator does it too: it makes AC, and six diodes inside (a three-phase bridge) turn it into DC for the battery. A bad one there is the battery that won\'t stay charged.'),
    el('h2.small', 'What will it read?'),
    el('label.field', { for: 'd-vac' }, el('span.field-label', 'AC volts in'), vac),
    dcAns,
    el('p.note', 'You find bridges in battery chargers, DC control supplies, motor brake rectifiers and the rectifier plugs on DC solenoid valves. The legs are marked ~ ~ for AC in, + and − for DC out.'),

    hTest,
    el('ol.steps',
      el('li.step', el('span.step-text', 'Power off and locked out. Let capacitors drain, and check with the meter on volts that it\'s dead.')),
      el('li.step', el('span.step-text', 'Turn the meter to the diode setting (the diode symbol on the dial).')),
      el('li.step', el('span.step-text', 'Red lead on the plain end, black on the stripe; read it. Then swap the leads and read again.')),
      el('li.step', el('span.step-text', 'Pick what each reading showed, below.')),
    ),
    el('p.field-label', 'Red on the plain end, black on the stripe'), fwdSeg,
    el('p.field-label', 'Leads swapped'), bkSeg,
    verdict,
    el('p.note', 'In a circuit, parts across the diode (a relay coil, a resistor) can fake a low reading. Unsolder or unclip one leg to be sure.'),
    el('h2.small', 'Checking a bridge'),
    el('div.read-table', BRIDGE_CHECKS.map(([where, read]) => el('div.read-row', el('span', where), el('strong', read)))),
    el('p.note', 'Each ~ to + or − goes through one diode; − to + goes through two in a row, so it reads about double. ' +
      'A pair reading near 0 both ways is a shorted diode; a pair reading OL where it should read is an open one. Either way, replace the whole bridge.'),
  ));
  drawWay(); drawLed(); drawFly(); drawBridge(); drawJudge();
  requestAnimationFrame(frame);
}
