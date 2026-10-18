// calc.js — the Fractions screen: a tape-measure calculator with its own
// keypad, so the phone keyboard never covers the answer. Fractions show
// stacked, as written by hand (ui/frac.js); a computer keyboard types too.

import { el } from './el.js';
import { load, save } from './store.js';
import { evaluate } from '../core/expr.js';
import { formatInches, onTape, toNumber } from '../core/measure.js';
import { pretty, prettyTyping, fracBoxes } from './frac.js';

// Each key: label, what it adds, an optional class, and a spoken name when the
// label is a picture. Matthew's layout from the Keypad Lab: ⌫ top left, C bottom left.
const FRAC = [() => fracBoxes(), '/', 'unit', 'fraction bar'];
const AND = [() => ['3', fracBoxes()], ' ', 'unit', 'whole number and fraction'];
const KEYS = [
  ['⌫', 'back', 'fn', 'back'], ['(', '('], [')', ')'], ['in "', '"', 'unit', 'inches'], ['÷', ' ÷ ', 'op', 'divide'],
  ['7', '7'], ['8', '8'], ['9', '9'], ["ft '", "'", 'unit', 'feet'], ['×', ' × ', 'op', 'times'],
  ['4', '4'], ['5', '5'], ['6', '6'], AND, ['−', ' − ', 'op', 'minus'],
  ['1', '1'], ['2', '2'], ['3', '3'], FRAC, ['+', ' + ', 'op', 'plus'],
  ['C', 'clear', 'fn', 'clear'], ['0', '0'], ['.', '.'], ['=', 'equals', 'eq wide', 'equals'],
];

export function renderCalc(view) {
  let line = load('calcLine', '');
  let history = load('calcHistory', []);
  // The answer kept by = when it fell between 64ths: shows ≈ until the line changes.
  let roundedLine = load('calcRounded', null);
  const tapeDenom = load('tapeDenom', 16);

  const input = el('div.calc-line', { role: 'textbox', 'aria-label': 'What to work out', 'aria-readonly': 'true' });
  const answer = el('div.answer', { 'aria-live': 'polite' });
  const hist = el('ol.history');
  const histHead = el('h2.small', 'Earlier');

  function add(text) {
    line += text;
    show();
  }

  function press(what) {
    if (what === 'clear') line = '';
    else if (what === 'back') line = line.replace(/\s*[÷×−+]\s*$|.$/, '');
    else if (what === 'equals') return keep();
    else return add(what);
    show();
  }

  function keep() {
    const r = tryEval(line);
    if (!r || r.error || r.waiting) return;
    history = [{ line, text: resultText(r) }, ...history.filter((h) => h.line !== line)].slice(0, 20);
    save('calcHistory', history);
    line = r.unit === 'length' ? plainInches(r.value) : String(+toNumber(r.value).toFixed(4));
    roundedLine = r.unit === 'length' && formatInches(r.value).startsWith('≈') ? line : null;
    save('calcRounded', roundedLine);
    show();
  }

  function show() {
    save('calcLine', line);
    input.replaceChildren(...(line ? prettyTyping(line) : [el('span.muted', pretty(`5'1" − 3 1/4"`))]), el('span.caret'));
    answer.replaceChildren(...answerParts(tryEval(line), tapeDenom, line === roundedLine));
    hist.replaceChildren(...history.map((h) =>
      el('li', el('button.hist', { onclick: () => { line = h.line; show(); } },
        el('span.hist-line', pretty(h.line)), el('span.hist-ans', pretty(h.text))))));
    hist.hidden = histHead.hidden = !history.length;
  }

  const pad = el('div.keypad',
    el('div.keys', KEYS.map(([label, what, cls, name]) =>
      el(`button.key${cls ? '.' + cls.split(' ').join('.') : ''}`, { onclick: () => press(what), 'aria-label': name || label },
        typeof label === 'function' ? label() : label))),
  );

  view.append(
    el('section.calc',
      el('div.screen', input, answer),
      pad,
      histHead,
      hist,
    ),
  );
  // A computer keyboard types the same characters the keys do.
  const onKey = (e) => {
    if (!view.contains(input)) return removeEventListener('keydown', onKey);
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, select, textarea')) return;
    const k = e.key;
    if (k === 'Backspace') press('back');
    else if (k === 'Enter' || k === '=') press('equals');
    else if (k === 'Escape') press('clear');
    else if (k === '*') add(' × ');
    else if (/^[0-9.()+\-\/ '"÷×−]$/.test(k)) { line += k; show(); }
    else return;
    e.preventDefault();
  };
  addEventListener('keydown', onKey);
  show();
}

function tryEval(line) {
  if (!line.trim()) return null;
  // Half a fraction isn't a mistake yet: say what goes in the empty box.
  if (/\d\/$/.test(line)) return { waiting: 'Now the bottom number.' };
  if (/\d $/.test(line)) return { waiting: 'Now the fraction: top number, the fraction key, bottom number.' };
  if (/\d \d+$/.test(line)) return { waiting: 'Now the fraction key, then the bottom number.' };
  try { return evaluate(line); } catch (e) { return { error: e.message }; }
}

// The answer as a line you can keep typing on (57 7/8").
function plainInches(v) {
  return formatInches(v).replace(/^≈ /, '');
}

function resultText(r) {
  return r.unit === 'length' ? formatInches(r.value, { feet: true }) : String(+toNumber(r.value).toFixed(4));
}

// rounded: this line is an earlier answer already rounded to a 64th.
function answerParts(r, denom, rounded = false) {
  if (!r) return [el('div.big.muted', '0"'), el('div.note', pretty('Type a sum with the keys. Example: 5\'1" − 3 1/4" − 3/32"'))];
  if (r.error) return [el('div.big.muted', '…'), el('div.note.warn', r.error)];
  if (r.waiting) return [el('div.big.muted', '…'), el('div.note', r.waiting)];
  if (r.unit === 'count') {
    const n = toNumber(r.value);
    return [
      el('div.big', String(+n.toFixed(4))),
      el('div.note', Number.isInteger(n) ? 'A plain number (a count).' : `A plain number: ${Math.floor(n)} whole ones fit, with some left over.`),
    ];
  }
  const v = r.value;
  const parts = [el('div.big', pretty((rounded ? '≈ ' : '') + formatInches(v)))];
  if (rounded) parts.push(el('div.note', 'Rounded to the nearest 64th from your last answer.'));
  if (Math.abs(toNumber(v)) >= 12) parts.push(el('div.alt', pretty(formatInches(v, { feet: true }))));
  parts.push(el('div.alt', `${+toNumber(v).toFixed(4)}" as a decimal`));
  const t = onTape(v, denom);
  parts.push(el('div.note', t.side === 'on'
    ? pretty(`Right on a mark of your 1/${denom}" tape.`)
    : pretty(`On a 1/${denom}" tape: a hair ${t.side} ${formatInches(t.mark)}.`)));
  return parts;
}
