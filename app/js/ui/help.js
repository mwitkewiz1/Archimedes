// help.js — how to type numbers, and what's in the app. Reached from the menu.

import { el } from './el.js';

export function renderHelp(view) {
  view.append(el('section.help',
    el('h1', 'How to type it'),
    el('ul.rules',
      el('li', 'Feet and inches: ', el('code', `5'1"`), ' or ', el('code', '5ft 1in'), '. No mark means inches.'),
      el('li', 'Fractions: ', el('code', '3 1/4'), ' or ', el('code', '3-1/4'), '. On the keypad: 3, the fraction key (empty boxes appear, the top one lit), 1, then tap the bottom box or press the fraction key again, 4. Tap any box to change it.'),
      el('li', 'A hyphen between a whole number and a fraction is a tape number: ', el('code', '3-1/4'), ' is three and a quarter, not three minus a quarter. To subtract, use the − key.'),
      el('li', 'Times and divide by a plain number for halves and copies: ', el('code', '57 7/8 ÷ 2'), '.'),
      el('li', 'A length divided by a length is how many fit: ', el('code', `61 ÷ 4 3/4"`), '.'),
      el('li', 'Answers are exact to a 64th. When they fall between tape marks, the app tells you which mark is closest and which side of it to cut. Set your tape\'s smallest mark in the menu, under Setup.'),
    ),
    el('h2', 'Coming'),
    el('p.note', 'Fusion has Cut & fuse and Fusing loss. Electric has Ohm\'s law, wire size, motor amps, a nameplate reader, phases, diagram symbols, resistors and diodes. Pumps has your pumps, the pump curve, how each kind works, troubleshooting and a lift station. Valves has the kinds, control valves, adjusting a pressure reducer and troubleshooting. Next: pump curve extras (fittings and hose, two pumps together).'),
  ));
}
