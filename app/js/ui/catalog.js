// catalog.js (screen) — Our pumps: the pumps his work deals in, by kind and
// specs, searchable. Each opens its kind on How they work, its problems on
// Troubleshoot, and the Pump curve when the specs give enough to draw one.

import { el } from './el.js';
import { load, save } from './store.js';
import { pumpsNav } from './subnav.js';
import { KINDS } from '../core/kinds.js';
import { CATALOG, pumpName, searchCatalog, curveFrom, said } from '../core/catalog.js';
import { PIPE_SIZES } from '../core/pump.js';

const SHOW = 40; // cards at a time; the search narrows the rest

// A pump sent to the Pump curve starts on a setup that suits it, not whatever
// the sliders last held: pipe the size of its discharge, lift at 40% of its
// shutoff head, a 200 ft run, valve open, full speed.
function startOn(p, curve) {
  const size = PIPE_SIZES.find((s) => +s >= (p.discharge || 0)) || PIPE_SIZES[PIPE_SIZES.length - 1];
  return { ...load('pumpPlay', {}), pump: `cat-${p.id}`, size, lift: Math.round(curve.shutoff * 0.4), length: 200, valve: 100, speed: 100 };
}

export function renderCatalog(view) {
  const st = { q: '', kind: '', ...load('catalog', {}) };
  const counts = Object.fromEntries(KINDS.map((k) => [k.id, CATALOG.filter((p) => p.kind === k.id).length]));

  const search = el('input.measure', { type: 'search', id: 'cat-q', placeholder: 'Search: 30 hp, 460, slurry, 4"…', autocomplete: 'off',
    oninput: () => { st.q = search.value; show(); } });
  search.value = st.q;
  const kindSel = el('select', { id: 'cat-kind', onchange: () => { st.kind = kindSel.value; show(); } },
    el('option', { value: '' }, `Every kind (${CATALOG.length})`),
    KINDS.filter((k) => counts[k.id]).map((k) => el('option', { value: k.id, selected: k.id === st.kind }, `${k.name.replace(/ \(.*\)$/, '')} (${counts[k.id]})`)));
  const count = el('p.note');
  const list = el('div.parts');

  const go = (hash, key, value) => { save(key, value); location.hash = hash; };

  function card(p) {
    const specs = [
      p.rpm && `${p.rpm} RPM`,
      p.fla && `${p.fla} A full load`,
      p.flow && (p.head ? `${p.flow} GPM at ${p.head} ft` : `best at ${p.flow} GPM`),
      p.maxflow && `up to ${p.maxflow} GPM`,
      p.maxhead && `up to ${p.maxhead} ft of head`,
      p.solids && `passes ${said(p.solids)}" solids`,
    ].filter(Boolean);
    const curve = curveFrom(p);
    return el('div.part-card.cat-card',
      el('div.part-name', pumpName(p)),
      specs.length ? el('p.part-does', specs.join(' · ')) : null,
      el('span.cause-links',
        el('button.small-btn', { onclick: () => go('#/kinds', 'pumpKind', p.kind) }, 'How it works'),
        el('button.small-btn', { onclick: () => go('#/trouble', 'trouble', { kind: p.kind, symptom: '' }) }, 'Troubleshoot'),
        curve ? el('button.small-btn', { onclick: () => go('#/pump', 'pumpPlay', startOn(p, curve)) }, 'Pump curve') : null));
  }

  function show() {
    save('catalog', st);
    const found = searchCatalog(st.q, st.kind);
    count.textContent = found.length > SHOW ? `${found.length} pumps, showing the first ${SHOW}. Search to narrow it.` : `${found.length} pump${found.length === 1 ? '' : 's'}`;
    list.replaceChildren(...found.slice(0, SHOW).map(card));
  }

  view.append(el('section.catalog',
    pumpsNav('catalog'),
    el('h1', 'Our pumps'),
    el('p.note', 'The kinds and sizes we work with, by spec. Numbers are as listed; anything estimated says so. A Pump curve button means the list had enough numbers to draw one.'),
    el('div.fields',
      el('label.field', { for: 'cat-kind' }, el('span.field-label', 'Kind'), kindSel),
      el('label.field', { for: 'cat-q' }, el('span.field-label', 'Search'), search)),
    count,
    list,
  ));
  show();
}
