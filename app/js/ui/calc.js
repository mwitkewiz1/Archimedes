// calc.js — the Fractions screen: a tape-measure calculator with its own
// keypad, so the phone keyboard never covers the answer.

import { el } from './el.js';
import { load, save } from './store.js';
import { evaluate } from '../core/expr.js';
import { formatInches, onTape, toNumber } from '../core/measure.js';

const FRACTIONS = ['1/2', '1/4', '1/8', '1/16', '1/32'];
// Each key: label, what it adds, and an optional class.
const KEYS = [
  ['C', 'clear', 'fn'], ['⌫', 'back', 'fn'], ["ft '", "'", 'unit'], ['in "', '"', 'unit'], ['÷', ' ÷ ', 'op'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['a⁄b', '/', 'unit'], ['×', ' × ', 'op'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['(', '('], ['−', ' − ', 'op'],
  ['1', '1'], ['2', '2'], ['3', '3'], [')', ')'], ['+', ' + ', 'op'],
  ['0', '0'], ['.', '.'], ['and', ' ', 'unit'], ['=', 'equals', 'eq wide'],
];

export function renderCalc(view) {
  let line = load('calcLine', '');
  let history = load('calcHistory', []);
  const tapeDenom = load('tapeDenom', 16);

  const input = el('input.calc-line', {
    'aria-label': 'What to work out',
    inputmode: 'none',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: `5'1" − 3 1/4"`,
    oninput: () => { line = input.value; show(); },
  });
  const answer = el('div.answer', { 'aria-live': 'polite' });
  const hist = el('ol.history');
  const histHead = el('h2.small', 'Earlier');

  function add(text) {
    // A fraction key right after a whole number means "and": 3 then ¼ is 3 1/4.
    if (/^\d+\/\d+$/.test(text) && /\d$/.test(line)) text = ' ' + text;
    line += text;
    input.value = line;
    show();
  }

  function press(what) {
    if (what === 'clear') line = '';
    else if (what === 'back') line = line.replace(/\s*[÷×−+]\s*$|.$/, '');
    else if (what === 'equals') return keep();
    else return add(what);
    input.value = line;
    show();
  }

  function keep() {
    const r = tryEval(line);
    if (!r || r.error) return;
    history = [{ line, text: resultText(r) }, ...history.filter((h) => h.line !== line)].slice(0, 20);
    save('calcHistory', history);
    line = r.unit === 'length' ? plainInches(r.value) : String(+toNumber(r.value).toFixed(4));
    input.value = line;
    show();
  }

  function show() {
    save('calcLine', line);
    answer.replaceChildren(...answerParts(tryEval(line), tapeDenom));
    hist.replaceChildren(...history.map((h) =>
      el('li', el('button.hist', { onclick: () => { line = h.line; input.value = line; show(); } },
        el('span.hist-line', h.line), el('span.hist-ans', h.text)))));
    hist.hidden = histHead.hidden = !history.length;
  }

  const pad = el('div.keypad',
    el('div.fracs', FRACTIONS.map((f) => el('button.key.frac', { onclick: () => add(f) }, f))),
    el('div.keys', KEYS.map(([label, what, cls]) =>
      el(`button.key${cls ? '.' + cls.split(' ').join('.') : ''}`, { onclick: () => press(what), 'aria-label': label === 'a⁄b' ? 'fraction bar' : label }, label))),
  );

  view.append(
    el('section.calc',
      el('div.screen', input, answer),
      pad,
      histHead,
      hist,
    ),
  );
  input.value = line;
  show();
}

function tryEval(line) {
  if (!line.trim()) return null;
  try { return evaluate(line); } catch (e) { return { error: e.message }; }
}

// The answer as a line you can keep typing on (57 7/8").
function plainInches(v) {
  return formatInches(v).replace(/^≈ /, '');
}

function resultText(r) {
  return r.unit === 'length' ? formatInches(r.value, { feet: true }) : String(+toNumber(r.value).toFixed(4));
}

function answerParts(r, denom) {
  if (!r) return [el('div.big.muted', '0"'), el('div.note', 'Type a sum with the keys. Example: 5\'1" − 3 1/4" − 3/32"')];
  if (r.error) return [el('div.big.muted', '…'), el('div.note.warn', r.error)];
  if (r.unit === 'count') {
    const n = toNumber(r.value);
    return [
      el('div.big', String(+n.toFixed(4))),
      el('div.note', Number.isInteger(n) ? 'A plain number (a count).' : `A plain number: ${Math.floor(n)} whole ones fit, with some left over.`),
    ];
  }
  const v = r.value;
  const parts = [el('div.big', formatInches(v))];
  if (Math.abs(toNumber(v)) >= 12) parts.push(el('div.alt', formatInches(v, { feet: true })));
  parts.push(el('div.alt', `${+toNumber(v).toFixed(4)}" as a decimal`));
  const t = onTape(v, denom);
  parts.push(el('div.note', t.side === 'on'
    ? `Right on a mark of your 1/${denom}" tape.`
    : `On a 1/${denom}" tape: a hair ${t.side} ${formatInches(t.mark)}.`));
  return parts;
}
