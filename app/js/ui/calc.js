// calc.js — the Fractions screen: a tape-measure calculator with its own
// keypad, so the phone keyboard never covers the answer. Fractions show
// stacked, as written by hand (ui/frac.js). One fraction key opens empty
// boxes; tap a box to fill it (core/entry.js). A computer keyboard types too.

import { el } from './el.js';
import { load, save } from './store.js';
import { evaluate } from '../core/expr.js';
import { formatInches, onTape, toNumber } from '../core/measure.js';
import { pretty, fracBoxes } from './frac.js';
import { parseLine, toText, unfinished, typeText, typeDigit, fractionKey, slash, tapBox, back, EMPTY } from '../core/entry.js';

// Each key: label, what it adds, an optional class, and a spoken name when the
// label is a picture. Matthew's layout from the Keypad Lab: ⌫ top left, C bottom
// left; the one fraction key is tall, filling the two spots the old fraction keys had.
const FRAC = [() => fracBoxes(), 'frac', 'unit tall', 'fraction'];
const KEYS = [
  ['⌫', 'back', 'fn', 'back'], ['(', '('], [')', ')'], ['in "', '"', 'unit', 'inches'], ['÷', ' ÷ ', 'op', 'divide'],
  ['7', '7'], ['8', '8'], ['9', '9'], ["ft '", "'", 'unit', 'feet'], ['×', ' × ', 'op', 'times'],
  ['4', '4'], ['5', '5'], ['6', '6'], FRAC, ['−', ' − ', 'op', 'minus'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', ' + ', 'op', 'plus'],
  ['C', 'clear', 'fn', 'clear'], ['0', '0'], ['.', '.'], ['=', 'equals', 'eq wide', 'equals'],
];

export function renderCalc(view) {
  // The line with its boxes and cursor, so a half-typed fraction comes back as
  // boxes; older saves only have the text.
  const saved = load('calcEntry', null);
  let st = saved && Array.isArray(saved.items) ? saved : parseLine(load('calcLine', ''));
  let history = load('calcHistory', []);
  // The answer kept by = when it fell between 64ths: shows ≈ until the line changes.
  let roundedLine = load('calcRounded', null);
  const tapeDenom = load('tapeDenom', 16);

  const input = el('div.calc-line', { role: 'textbox', 'aria-label': 'What to work out', 'aria-readonly': 'true' });
  const answer = el('div.answer', { 'aria-live': 'polite' });
  const hist = el('ol.history');
  const histHead = el('h2.small', 'Earlier');

  function press(what) {
    if (what === 'clear') st = EMPTY;
    else if (what === 'back') st = back(st);
    else if (what === 'equals') return keep();
    else if (what === 'frac') st = fractionKey(st);
    else if (/^\d$/.test(what)) st = typeDigit(st, what);
    else st = typeText(st, what);
    show();
  }

  function keep() {
    const line = toText(st);
    const r = tryEval(st);
    if (!r || r.error || r.waiting) return;
    history = [{ line, text: resultText(r) }, ...history.filter((h) => h.line !== line)].slice(0, 20);
    save('calcHistory', history);
    const kept = r.unit === 'length' ? plainInches(r.value) : String(+toNumber(r.value).toFixed(4));
    st = parseLine(kept);
    roundedLine = r.unit === 'length' && formatInches(r.value).startsWith('≈') ? kept : null;
    save('calcRounded', roundedLine);
    show();
  }

  // A fraction on the line: two boxes you can tap; the one being typed in is lit.
  function fracEdit(it, i) {
    const box = (b) => {
      const on = st.cur && st.cur.i === i && st.cur.box === b;
      return el(`span.fr-${b}.fr-tap${on ? '.on' : ''}`, {
        role: 'button', 'aria-label': b === 'n' ? 'top number' : 'bottom number',
        onpointerdown: (e) => { e.preventDefault(); st = tapBox(st, i, b); show(); },
      }, it[b] || (on ? null : el('span.fr-box')), on ? el('span.caret') : null);
    };
    return el('span.fr.edit', box('n'), box('d'));
  }

  function show() {
    const line = toText(st);
    save('calcLine', line);
    save('calcEntry', st);
    input.replaceChildren(
      ...(st.items.length ? st.items.flatMap((it, i) => (it.t === 'text' ? pretty(it.s) : [fracEdit(it, i)])) : [el('span.muted', pretty(`5'1" − 3 1/4"`))]),
      ...(st.cur ? [] : [el('span.caret')]));
    answer.replaceChildren(...answerParts(tryEval(st), tapeDenom, line === roundedLine));
    hist.replaceChildren(...history.map((h) =>
      el('li', el('button.hist', { onclick: () => { st = parseLine(h.line); show(); } },
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
    else if (k === '*') { st = typeText(st, ' × '); show(); }
    else if (k === '/') { st = slash(st); show(); }
    else if (/^\d$/.test(k)) { st = typeDigit(st, k); show(); }
    else if (/^[.()+\- '"÷×−]$/.test(k)) { st = typeText(st, k); show(); }
    else return;
    e.preventDefault();
  };
  addEventListener('keydown', onKey);
  show();
}

function tryEval(st) {
  const line = toText(st);
  if (!line.trim()) return null;
  // Half a fraction isn't a mistake yet: say what goes in the empty box.
  const gap = unfinished(st);
  if (gap === 'n') return { waiting: 'Type the top number of the fraction.' };
  if (gap === 'd') return { waiting: 'Now the bottom number: tap the bottom box, or press the fraction key again.' };
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
