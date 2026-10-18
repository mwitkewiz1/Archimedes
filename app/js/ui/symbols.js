// symbols.js — the Electric tab's diagram symbols: how to read a control
// (ladder) diagram, walked through on a start/stop motor rung, then every
// symbol drawn, named and explained, with search and group filters.

import { el } from './el.js';
import { load, save } from './store.js';
import { electricNav } from './subnav.js';
import { SYMBOLS, GROUPS, searchSymbols } from '../core/symbols.js';

const SVG = 'http://www.w3.org/2000/svg';
const BY_ID = Object.fromEntries(SYMBOLS.map((s) => [s.id, s]));

function svgEl(tag, attrs, text) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, x] of Object.entries(attrs)) n.setAttribute(k, x);
  if (text != null) n.textContent = text;
  return n;
}

// The shapes of one symbol into a <g>, on its 100 × 50 grid.
function shapes(sym, attrs = {}) {
  const g = svgEl('g', attrs);
  for (const [kind, ...a] of sym.draw) {
    if (kind === 'line') g.append(svgEl('line', { class: 'wire', x1: a[0], y1: a[1], x2: a[2], y2: a[3] }));
    else if (kind === 'path') g.append(svgEl('path', { class: 'wire', d: a[0] }));
    else if (kind === 'circle') g.append(svgEl('circle', { class: 'wire', cx: a[0], cy: a[1], r: a[2] }));
    else if (kind === 'dot') g.append(svgEl('circle', { class: 'dot', cx: a[0], cy: a[1], r: 3.5 }));
    else if (kind === 'text') g.append(svgEl('text', { class: 'sym-text', x: a[0], y: a[1] }, a[2]));
  }
  return g;
}

function picture(sym) {
  const svg = svgEl('svg', { viewBox: '-4 -4 108 58', class: 'sym-svg', 'aria-hidden': 'true' });
  svg.append(shapes(sym));
  return svg;
}

export function renderSymbols(view) {
  const st = { q: '', group: '', ...load('symbols', {}) };
  const list = el('div.sym-list');
  const count = el('p.note');
  const search = el('input.measure', {
    type: 'search', id: 'sym-q', placeholder: 'Search: stop, float, OL, coil…', autocomplete: 'off', spellcheck: 'false',
    oninput: () => { st.q = search.value; show(); },
  });
  search.value = st.q;
  const chips = [['', 'All'], ...GROUPS].map(([g, label]) =>
    el('button.chip', { 'aria-pressed': String(g === st.group), onclick: () => { st.group = g; show(); } }, label));

  function show() {
    save('symbols', st);
    chips.forEach((c, i) => c.setAttribute('aria-pressed', String(([['', ''], ...GROUPS][i][0]) === st.group)));
    const found = searchSymbols(st.q, st.group);
    count.textContent = found.length ? `${found.length} symbol${found.length > 1 ? 's' : ''}` : 'Nothing matches. Try fewer words.';
    list.replaceChildren(...found.map((s) => el('article.sym',
      picture(s),
      el('div',
        el('div.sym-name', s.name),
        s.tag && el('div.sym-tag', `Marked: ${s.tag}`),
        el('p.sym-says', s.says)))));
  }

  view.append(el('section.symbols',
    electricNav('symbols'),
    el('h1', 'Diagram symbols'),
    el('details.losses',
      el('summary', 'How to read a control diagram'),
      ladder(),
      el('ol.steps',
        el('li.step', el('span.step-text', 'Power comes in on the left rail (L1) and has to cross a rung to reach the right rail (L2). Each rung is one circuit; read it left to right.')),
        el('li.step', el('span.step-text', 'Everything is drawn at rest: power off, nothing pushed. So Stop is drawn closed, Start open, and the M coil is off.')),
        el('li.step', el('span.step-text', 'Push Start. Current reaches the M coil; it pulls in and closes every M contact: the big ones that feed the motor, and the small one under Start.')),
        el('li.step', el('span.step-text', 'Let go of Start. Current now goes around it through that M contact, so the motor keeps running. That is a seal-in (holding) contact.')),
        el('li.step', el('span.step-text', 'Push Stop, or the overload trips: the rung breaks, the coil drops out, every M contact opens and the motor stops, and stays stopped until someone pushes Start.')),
      ),
      el('p.note', 'A float-switch pump often has the float contact in place of Start and Stop, with no seal-in: water up, the switch closes and the pump runs; water down, it stops. ' +
        'With a Hand-Off-Auto switch, Hand goes around the float and Auto goes through it.'),
    ),
    el('label.field', { for: 'sym-q' }, search),
    el('div.chips', chips),
    count,
    list,
  ));
  show();
}

// Start/stop rung with a seal-in contact, built from the symbols themselves.
function ladder() {
  const svg = svgEl('svg', { viewBox: '0 0 350 170', class: 'pipe ladder', role: 'img',
    'aria-label': 'Ladder diagram: L1, stop button, start button with an M contact around it, M coil, overload contact, L2' });
  const Y = 70; // the rung
  const S = 0.9; // symbol size; each one's own lead wires run 45 either side of its middle
  // Place a symbol centered on x whose wire sits at `wireY` on its own grid, so it lands on y.
  const put = (id, x, y, wireY = 25) =>
    svg.append(shapes(BY_ID[id], { transform: `translate(${x - 50 * S} ${y - wireY * S}) scale(${S})` }));
  const wire = (x1, y1, x2, y2) => svg.append(svgEl('line', { class: 'wire', x1, y1, x2, y2 }));
  const label = (x, y, words, cls = 'lbl') => svg.append(svgEl('text', { class: cls, x, y, 'text-anchor': 'middle' }, words));

  wire(15, 22, 15, 165); wire(335, 22, 335, 165);
  label(15, 14, 'L1', 'dim-text'); label(335, 14, 'L2', 'dim-text');
  wire(15, Y, 20, Y);
  put('pb-nc', 62, Y, 24); label(62, Y - 22, 'STOP');
  put('pb-no', 140, Y, 34); label(140, Y - 30, 'START');
  put('coil', 214, Y);
  put('nc', 288, Y); label(288, Y + 30, 'OL');
  // Seal-in: an M contact around Start, joined where Start's wires end.
  const Y2 = 128;
  wire(95, Y, 95, Y2); wire(185, Y, 185, Y2);
  put('no', 140, Y2);
  label(140, Y2 + 30, 'M (seal-in)');
  svg.append(svgEl('circle', { class: 'dot', cx: 95, cy: Y, r: 3.5 }), svgEl('circle', { class: 'dot', cx: 185, cy: Y, r: 3.5 }));
  return svg;
}
