// trouble.js (screen) — the pump troubleshooter: pick the pump and what
// you're seeing; get the likely causes in the order to check them, with
// links to the pump's parts and to the Pump curve.

import { el } from './el.js';
import { load, save } from './store.js';
import { pumpsNav } from './subnav.js';
import { KINDS } from '../core/kinds.js';
import { troubleFor } from '../core/trouble.js';

export function renderTrouble(view) {
  const st = { kind: '', symptom: '', ...load('trouble', {}) };
  if (st.kind && !KINDS.some((k) => k.id === st.kind)) st.kind = '';

  const kindSel = el('select', { id: 't-kind', onchange: () => { st.kind = kindSel.value; show(); } },
    el('option', { value: '' }, 'Any pump'),
    KINDS.map((k) => el('option', { value: k.id, selected: k.id === st.kind }, k.name)));
  const chips = el('div.chips');
  const out = el('div.trouble-out', { 'aria-live': 'polite' });

  // Open a pump's page on How they work.
  const toKind = (id) => { save('pumpKind', id); location.hash = '#/kinds'; };

  function show() {
    save('trouble', st);
    const list = troubleFor(st.kind);
    if (!list.some((s) => s.id === st.symptom)) st.symptom = list[0]?.id || '';
    chips.replaceChildren(...list.map((s) => el('button.chip', { 'aria-pressed': String(s.id === st.symptom),
      onclick: () => { st.symptom = s.id; show(); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, s.name)));
    const s = list.find((x) => x.id === st.symptom);
    if (!s) { out.replaceChildren(); return; }
    const short = (id) => KINDS.find((k) => k.id === id).name.replace(/ \(.*\)$/, '');
    out.replaceChildren(
      el('h2', s.name),
      el('p.note', 'Most likely first. Check each before moving to the next.'),
      ...(st.kind ? [el('button.small-btn', { onclick: () => toKind(st.kind) }, `How the ${short(st.kind).toLowerCase()} works, part by part`)] : []),
      el('ol.steps', s.causes.map((c) => el('li.step.cause',
        el('strong.cause-why', c.why),
        el('span.step-text', el('span.cause-tag', 'Check: '), c.check),
        el('span.step-text', el('span.cause-tag', 'Fix: '), c.fix),
        (c.curve || (c.part && c.part !== st.kind)) && el('span.cause-links',
          c.curve ? el('a', { href: '#/pump' }, 'Try it on the Pump curve') : null,
          c.part && c.part !== st.kind ? el('button.small-btn', { onclick: () => toKind(c.part) }, `Parts: ${short(c.part)}`) : null)))),
    );
  }

  view.append(el('section.trouble',
    pumpsNav('trouble'),
    el('h1', 'Troubleshoot'),
    el('p.big-note', el('strong', 'Safety first: '), 'lock out and tag out before reaching into any pump or panel. A wet well is a confined space with deadly gas. A capacitor can hold a charge with the power off.'),
    el('label.field', { for: 't-kind' }, el('span.field-label', 'Which pump?'), kindSel),
    el('h2.small', 'What are you seeing?'),
    chips,
    out,
  ));
  show();
}
