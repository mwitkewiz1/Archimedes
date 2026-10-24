// symbols.js — the symbols on US (NEMA/ANSI) wiring and control diagrams: each
// one's name, the letters printed beside it, what it does in plain words, and
// how to draw it. Drawings are lists of shapes on a 100 × 50 grid, wires at y 25
// unless said otherwise; ui/symbols.js turns them into SVG. Pure: no DOM.
//
// Shapes: ['line', x1, y1, x2, y2] · ['path', d] · ['circle', cx, cy, r]
// · ['dot', cx, cy] (filled) · ['text', x, y, words].

export const GROUPS = [
  ['wires', 'Wires and power'],
  ['protect', 'Protection'],
  ['switch', 'Switches'],
  ['relay', 'Relays and starters'],
  ['load', 'Loads and parts'],
];

const W = (a, b) => [['line', 0, 25, a, 25], ['line', b, 25, 100, 25]]; // lead-in wires

export const SYMBOLS = [
  // Wires and power
  { id: 'cross', group: 'wires', name: 'Wires crossing, not joined', tag: '',
    says: 'Two wires pass over each other with no connection. Some drawings show a little hop; some just cross with no dot.',
    draw: [['path', 'M0 25 H42 A8 8 0 0 1 58 25 H100'], ['line', 50, 0, 50, 50]] },
  { id: 'join', group: 'wires', name: 'Wires joined', tag: '',
    says: 'A dot where wires meet means they are connected. No dot, no connection.',
    draw: [['line', 0, 25, 100, 25], ['line', 50, 0, 50, 50], ['dot', 50, 25]] },
  { id: 'ground', group: 'wires', name: 'Ground', tag: 'GND',
    says: 'Connection to earth, through the green or bare wire. It gives a fault somewhere safe to go so the breaker trips instead of you.',
    draw: [['line', 50, 2, 50, 25], ['line', 30, 25, 70, 25], ['line', 37, 32, 63, 32], ['line', 44, 39, 56, 39]] },
  { id: 'battery', group: 'wires', name: 'Battery (DC)', tag: 'BAT',
    says: 'Long plate is +, short plate is −. Several pairs in a row means several cells in series.',
    draw: [...W(44, 56), ['line', 44, 8, 44, 42], ['line', 56, 16, 56, 34], ['line', 57, 16, 57, 34], ['text', 36, 12, '+']] },
  { id: 'ac', group: 'wires', name: 'AC supply', tag: 'L1 L2 L3',
    says: 'Alternating current: the push swings back and forth, 60 full cycles a second (60 Hz). Incoming lines are marked L1, L2 (and L3 on three phase).',
    draw: [...W(36, 64), ['circle', 50, 25, 14], ['path', 'M40 25 q5 -10 10 0 t10 0']] },
  { id: 'transformer', group: 'wires', name: 'Transformer', tag: 'T, CPT',
    says: 'Two coils on an iron core change voltage, for example 480 V down to 120 V for the control circuit (a control power transformer, CPT).',
    draw: [['line', 15, 8, 40, 8], ['line', 15, 40, 40, 40], ['line', 60, 8, 85, 8], ['line', 60, 40, 85, 40],
      ['path', 'M40 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8'],
      ['path', 'M60 8 a4 4 0 0 1 0 8 a4 4 0 0 1 0 8 a4 4 0 0 1 0 8 a4 4 0 0 1 0 8'],
      ['line', 48, 6, 48, 42], ['line', 52, 6, 52, 42]] },

  // Protection
  { id: 'fuse', group: 'protect', name: 'Fuse', tag: 'F, FU',
    says: 'A thin link that melts when too many amps flow, opening the circuit for good. Replace it with the same rating.',
    draw: [['line', 0, 25, 100, 25], ['path', 'M35 19 H65 V31 H35 Z']] },
  { id: 'breaker', group: 'protect', name: 'Circuit breaker', tag: 'CB',
    says: 'Opens on too many amps like a fuse, but you reset it instead of replacing it. Also works as an off switch.',
    draw: [...W(32, 68), ['circle', 35, 30, 3], ['circle', 65, 30, 3], ['path', 'M33 26 Q50 8 67 26']] },
  { id: 'disconnect', group: 'protect', name: 'Disconnect switch', tag: 'DS, DISC',
    says: 'The handle that cuts all power to the equipment. Lock it off before you work on anything past it.',
    draw: [...W(32, 68), ['circle', 35, 25, 3], ['circle', 65, 25, 3], ['line', 37, 23, 62, 8]] },
  { id: 'ol-heater', group: 'protect', name: 'Overload heater', tag: 'OL',
    says: 'Sits in each motor wire and warms up with the amps. Too warm for too long and it trips the overload contact. Drawn as a hook or squiggle; makers differ.',
    draw: [...W(32, 68), ['path', 'M32 25 Q38 8 46 18 Q50 24 46 28 Q42 32 46 36 Q54 42 60 30 Q63 25 68 25']] },
  { id: 'ol-contact', group: 'protect', name: 'Overload contact', tag: 'OL',
    says: 'A normally closed contact in the control circuit. When the overload heaters trip, it opens and the motor starter drops out. Usually reset by a button on the overload.',
    draw: [...W(40, 60), ['line', 40, 13, 40, 37], ['line', 60, 13, 60, 37], ['line', 34, 40, 66, 10], ['text', 43, 48, 'OL']] },

  // Switches
  { id: 'pb-no', group: 'switch', name: 'Pushbutton, normally open (start)', tag: 'PB',
    says: 'Closes only while you hold it in. Start buttons are this kind.',
    draw: [['line', 0, 34, 27, 34], ['line', 73, 34, 100, 34], ['circle', 30, 34, 3], ['circle', 70, 34, 3],
      ['line', 24, 22, 76, 22], ['line', 50, 22, 50, 8], ['line', 43, 8, 57, 8]] },
  { id: 'pb-nc', group: 'switch', name: 'Pushbutton, normally closed (stop)', tag: 'PB',
    says: 'Connected until you push it, then it breaks the circuit. Stop buttons are this kind, so a cut wire also stops the motor.',
    draw: [['line', 0, 24, 27, 24], ['line', 73, 24, 100, 24], ['circle', 30, 24, 3], ['circle', 70, 24, 3],
      ['line', 24, 29, 76, 29], ['line', 50, 29, 50, 8], ['line', 43, 8, 57, 8]] },
  { id: 'float', group: 'switch', name: 'Float switch', tag: 'FS, LS (level switch)',
    says: 'The ball is the float. Water lifts it and the switch closes (or opens) at a set level. It is what turns a sump or dewatering pump on and off. ' +
      'A 3-wire float has a common, a normally open and a normally closed wire: common to NO closes when it tips up (pump down), common to NC closes when it hangs (pump up, filling). ' +
      'Colors differ by maker; meter it: hanging, common beeps to NC; tipped up, common beeps to NO.',
    draw: [['line', 0, 25, 27, 25], ['line', 73, 25, 100, 25], ['circle', 30, 25, 3], ['circle', 70, 25, 3],
      ['line', 32, 23, 66, 12], ['line', 49, 18, 49, 34], ['circle', 49, 40, 6]] },
  { id: 'pressure', group: 'switch', name: 'Pressure switch', tag: 'PS',
    says: 'Opens or closes at a set pressure: stops a pump when the tank is full, or shuts it down on low suction pressure. The half-circle is the diaphragm.',
    draw: [['line', 0, 25, 27, 25], ['line', 73, 25, 100, 25], ['circle', 30, 25, 3], ['circle', 70, 25, 3],
      ['line', 32, 23, 66, 12], ['line', 49, 18, 49, 34], ['path', 'M41 42 A8 8 0 0 1 57 42 Z']] },
  { id: 'hoa', group: 'switch', name: 'Selector switch, Hand-Off-Auto', tag: 'HOA, SS',
    says: 'Three positions. Hand runs the pump now. Off stops it. Auto lets the float or pressure switch decide. On diagrams it shows as contacts with a chart of which ones close in which position.',
    draw: [['line', 0, 25, 30, 25], ['circle', 33, 25, 3], ['circle', 67, 10, 3], ['circle', 67, 25, 3], ['circle', 67, 40, 3],
      ['line', 35, 24, 63, 11], ['text', 74, 13, 'H'], ['text', 74, 29, 'O'], ['text', 74, 44, 'A']] },

  // Relays and starters
  { id: 'coil', group: 'relay', name: 'Coil', tag: 'M, CR',
    says: 'An electromagnet. When current reaches it, it pulls in and flips every contact with the same letters. M is a motor starter, CR a control relay.',
    draw: [...W(38, 62), ['circle', 50, 25, 12], ['text', 44, 30, 'M']] },
  { id: 'no', group: 'relay', name: 'Contact, normally open', tag: 'M, CR',
    says: 'Open while its coil is off; closes when the coil pulls in. The letters beside it name its coil.',
    draw: [...W(40, 60), ['line', 40, 13, 40, 37], ['line', 60, 13, 60, 37]] },
  { id: 'nc', group: 'relay', name: 'Contact, normally closed', tag: 'M, CR',
    says: 'Closed while its coil is off; opens when the coil pulls in. The slash means closed at rest.',
    draw: [...W(40, 60), ['line', 40, 13, 40, 37], ['line', 60, 13, 60, 37], ['line', 34, 40, 66, 10]] },
  { id: 'timer-no', group: 'relay', name: 'Timer contact, on-delay', tag: 'TR, TD',
    says: 'Closes a set time after its timer coil turns on: wait 10 seconds, then start the next pump. The little arc marks it as timed; how it is drawn varies a bit by maker.',
    draw: [...W(40, 60), ['line', 40, 13, 40, 37], ['line', 60, 13, 60, 37], ['line', 50, 37, 50, 46], ['path', 'M42 50 Q50 38 58 50']] },

  // Loads and parts
  { id: 'motor', group: 'load', name: 'Motor', tag: 'MTR, T1 T2 T3',
    says: 'A circle with M. A three phase motor has three leads, marked T1, T2, T3 at the starter.',
    draw: [...W(36, 64), ['circle', 50, 25, 14], ['text', 44, 30, 'M']] },
  { id: 'light', group: 'load', name: 'Pilot light', tag: 'LT, R, G, A',
    says: 'A panel light. The letter is its color: R red, G green, A amber. Which color means running depends on the shop; check the panel legend.',
    draw: [...W(38, 62), ['circle', 50, 25, 12], ['text', 45, 30, 'R'],
      ['line', 39, 14, 34, 9], ['line', 61, 14, 66, 9], ['line', 39, 36, 34, 41], ['line', 61, 36, 66, 41]] },
  { id: 'resistor', group: 'load', name: 'Resistor', tag: 'R',
    says: 'Resists flow on purpose, to limit amps or drop volts. Its ohms are printed beside it.',
    draw: [['path', 'M0 25 H29 l3 -8 l6 16 l6 -16 l6 16 l6 -16 l6 16 l6 -16 l3 8 H100']] },
  { id: 'capacitor', group: 'load', name: 'Capacitor', tag: 'C',
    says: 'Two plates that store a charge. Single phase motors use one to start. It can stay charged after power is off: treat it as live.',
    draw: [...W(46, 54), ['line', 46, 10, 46, 40], ['line', 54, 10, 54, 40]] },
  { id: 'diode', group: 'load', name: 'Diode', tag: 'D',
    says: 'A one-way valve for current: it flows in the direction of the arrow, never back. The bar end is marked on the part too.',
    draw: [...W(40, 60), ['path', 'M40 13 L40 37 L60 25 Z'], ['line', 60, 13, 60, 37]] },
];

// Words to type into search beyond the name and tag.
const EXTRA = {
  ground: 'earth green bare', ac: 'line power supply phase', fuse: 'blow', breaker: 'trip',
  disconnect: 'lockout lock out loto', 'ol-heater': 'thermal overload', 'ol-contact': 'overload trip reset',
  'pb-no': 'start button', 'pb-nc': 'stop button', float: 'level sump dewatering', pressure: 'pump tank',
  hoa: 'hand off auto', coil: 'starter contactor relay magnet', no: 'open', nc: 'closed', 'timer-no': 'delay time',
  motor: 'pump', light: 'lamp indicator', diode: 'rectifier',
};

// Symbols whose name, letters, words or plain-words line hold every word typed;
// those matching on name, letters or search words come first.
export function searchSymbols(query, group) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text) => words.every((w) => text.toLowerCase().includes(w));
  const found = SYMBOLS.filter((s) => (!group || s.group === group) && has(`${s.name} ${s.tag} ${EXTRA[s.id] || ''} ${s.says}`));
  const strong = found.filter((s) => has(`${s.name} ${s.tag} ${EXTRA[s.id] || ''}`));
  return [...strong, ...found.filter((s) => !strong.includes(s))];
}
