// vtrouble.js (screen) — the valve troubleshooter: pick the valve and what
// you're seeing; get the likely causes in the order to check them, with a
// link to the Adjust screen where a needle is the cure.

import { el } from './el.js';
import { load, save } from './store.js';
import { valvesNav } from './subnav.js';
import { VALVES as KINDS } from '../core/valve.js';
import { troubleFor } from '../core/vtrouble.js';

export function renderVTrouble(view) {
  const st = { kind: '', symptom: '', ...load('vtrouble', {}) };
  if (st.kind && !KINDS.some((k) => k.id === st.kind)) st.kind = '';

  const kindSel = el('select', { id: 'v-kind', onchange: () => { st.kind = kindSel.value; show(); } },
    el('option', { value: '' }, 'Any valve'),
    KINDS.map((k) => el('option', { value: k.id, selected: k.id === st.kind }, k.name)));
  const chips = el('div.chips');
  const out = el('div.trouble-out', { 'aria-live': 'polite' });

  // Open a valve's page on Kinds.
  const toKind = (id) => { save('valveKind', id); location.hash = id === 'control' ? '#/control' : '#/valve'; };

  function show() {
    save('vtrouble', st);
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
        c.adjust && el('span.cause-links', el('a', { href: '#/adjust' }, 'Try it on Adjust'))))),
    );
  }

  view.append(el('section.trouble',
    valvesNav('vtrouble'),
    el('h1', 'Troubleshoot'),
    el('p.big-note', el('strong', 'Safety first: '), 'isolate both sides and bleed the pressure off at a cover plug or drain before loosening a tube, a cover or a packing nut. A shut valve still holds the whole line\'s pressure behind it.'),
    el('label.field', { for: 'v-kind' }, el('span.field-label', 'Which valve?'), kindSel),
    el('h2.small', 'What are you seeing?'),
    chips,
    out,
  ));
  show();
}
