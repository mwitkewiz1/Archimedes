// catalog.js (screen) — Our pumps: the pumps his work deals in, by kind and
// specs, searchable. Each opens its kind on How they work, its problems on
// Troubleshoot, and the Pump curve when the specs give enough to draw one.

import { el } from './el.js';
import { load, save } from './store.js';
import { pumpsNav } from './subnav.js';
import { KINDS } from '../core/kinds.js';
import { CATALOG, pumpName, searchCatalog, curveFrom, checkCurveNumbers, said } from '../core/catalog.js';
import { PIPE_SIZES, MATERIALS, insideDiameter, frictionHead } from '../core/pump.js';

const SHOW = 40; // cards at a time; the search narrows the rest

// A pump sent to the Pump curve starts on a setup that suits it, not whatever
// the sliders last held: pipe the size of its discharge (or, not listed, the
// smallest that keeps the water under about 10 ft/s at its best flow:
// velocity = 0.408 × GPM ÷ ID²), a 200 ft run, valve open, full speed.
function startOn(p, curve) {
  const fits = (s) => (p.discharge ? +s >= p.discharge : 0.408 * curve.bepFlow / (+s) ** 2 <= 10);
  const size = PIPE_SIZES.find(fits) || PIPE_SIZES[PIPE_SIZES.length - 1];
  // Lift chosen so the pipe's curve passes through the pump's best point: it opens in the sweet spot.
  const prev = load('pumpPlay', {});
  const pipe = { material: prev.material || 'hdpe', size, dr: prev.dr || '11' };
  const friction = frictionHead(curve.bepFlow, { length: 200, id: insideDiameter(pipe), c: MATERIALS[pipe.material].c });
  const lift = Math.max(0, Math.min(200, Math.round(curve.bepHead - friction)));
  return { ...prev, ...pipe, pump: `cat-${p.id}`, lift, length: 200, valve: 100, speed: 100 };
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
    const mine = load('pumpCurves', {})[p.id];
    const curve = curveFrom(p, mine);
    const form = el('div.curve-form');
    form.hidden = true;
    const node = el('div.part-card.cat-card',
      el('div.part-name', pumpName(p)),
      specs.length ? el('p.part-does', specs.join(' · ')) : null,
      mine ? el('p.part-fails', `Your curve numbers: shutoff ${mine.shutoff} ft, ${mine.flow} GPM at ${mine.head} ft.`) : null,
      el('span.cause-links',
        el('button.small-btn', { onclick: () => go('#/kinds', 'pumpKind', p.kind) }, 'How it works'),
        el('button.small-btn', { onclick: () => go('#/trouble', 'trouble', { kind: p.kind, symptom: '' }) }, 'Troubleshoot'),
        curve ? el('button.small-btn', { onclick: () => go('#/pump', 'pumpPlay', startOn(p, curve)) }, 'Pump curve') : null,
        el('button.small-btn', { onclick: () => { form.hidden = !form.hidden; if (!form.hidden) fillForm(); } }, mine ? 'Change curve numbers' : 'Add curve numbers')),
      form);

    // Three numbers off the spec sheet or nameplate, saved on this phone only.
    function fillForm() {
      const box = (id, label, value) => {
        const input = el('input.measure', { id: `cn-${p.id}-${id}`, inputmode: 'decimal', autocomplete: 'off' });
        input.value = value ?? '';
        return [input, el('label.field', { for: input.id }, el('span.field-label', label), input)];
      };
      const [shutoff, shutoffRow] = box('s', 'Shutoff head, ft (no flow)', mine?.shutoff);
      const [flow, flowRow] = box('f', 'A rated flow, GPM', mine?.flow ?? p.flow);
      const [head, headRow] = box('h', 'Head at that flow, ft', mine?.head ?? p.head);
      const msg = el('p.note', 'From the pump\'s spec sheet or curve. Saved on this phone; it doesn\'t change the list for anyone else.');
      const keep = () => {
        const n = { shutoff: +shutoff.value, flow: +flow.value, head: +head.value };
        const r = checkCurveNumbers(n);
        if (!r.ok) { msg.textContent = r.error; msg.classList.add('warn'); return; }
        const all = load('pumpCurves', {});
        all[p.id] = n;
        save('pumpCurves', all);
        node.replaceWith(card(p));
      };
      const drop = () => {
        const all = load('pumpCurves', {});
        delete all[p.id];
        save('pumpCurves', all);
        node.replaceWith(card(p));
      };
      form.replaceChildren(el('div.fields', shutoffRow, flowRow, headRow), msg,
        el('span.cause-links', el('button.primary.short', { onclick: keep }, 'Save curve numbers'),
          mine ? el('button.small-btn', { onclick: drop }, 'Remove mine') : null));
    }
    return node;
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
    el('p.note', 'The kinds and sizes we work with, by spec. Numbers are as listed; anything estimated says so. A pump gets a Pump curve button when the list had enough numbers, or when you add its curve numbers.'),
    el('div.fields',
      el('label.field', { for: 'cat-kind' }, el('span.field-label', 'Kind'), kindSel),
      el('label.field', { for: 'cat-q' }, el('span.field-label', 'Search'), search)),
    count,
    list,
  ));
  show();
}
