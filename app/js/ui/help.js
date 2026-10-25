// help.js — how to type numbers, plus settings that belong to this phone.

import { el } from './el.js';
import { load, save } from './store.js';

export function renderHelp(view) {
  const denom = load('tapeDenom', 16);
  const pick = el('select', { id: 'tape', onchange: () => save('tapeDenom', +pick.value) },
    [8, 16, 32].map((d) => el('option', { value: d, selected: d === denom }, `1/${d}"`)));

  view.append(el('section.help',
    el('h1', 'How to type it'),
    el('ul.rules',
      el('li', 'Feet and inches: ', el('code', `5'1"`), ' or ', el('code', '5ft 1in'), '. No mark means inches.'),
      el('li', 'Fractions: ', el('code', '3 1/4'), ' or ', el('code', '3-1/4'), '. On the keypad: 3, the fraction key (empty boxes appear, the top one lit), 1, then tap the bottom box or press the fraction key again, 4. Tap any box to change it.'),
      el('li', 'A hyphen between a whole number and a fraction is a tape number: ', el('code', '3-1/4'), ' is three and a quarter, not three minus a quarter. To subtract, use the − key.'),
      el('li', 'Times and divide by a plain number for halves and copies: ', el('code', '57 7/8 ÷ 2'), '.'),
      el('li', 'A length divided by a length is how many fit: ', el('code', `61 ÷ 4 3/4"`), '.'),
      el('li', 'Answers are exact to a 64th. When they fall between tape marks, the app tells you which mark is closest and which side of it to cut.'),
    ),
    el('h2', 'Your tape'),
    el('label.field', { for: 'tape' }, el('span.field-label', 'Smallest mark on your tape'), pick),
    el('h2', 'Coming'),
    el('p.note', 'Fusion has Cut & fuse and Fusing loss. Electric has Ohm\'s law, wire size, motor amps, a nameplate reader, phases, diagram symbols, resistors and diodes. Pumps has your pumps, the pump curve, how each kind works, troubleshooting and a lift station. Valves has the kinds, control valves, adjusting a pressure reducer and troubleshooting. Next: pump curve extras (fittings and hose, two pumps together).'),
    el('p.foot', 'Archimedes · by [MW]Sense · works with no signal once opened'),
  ));
}
