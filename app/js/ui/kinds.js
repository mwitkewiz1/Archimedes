// kinds.js (screen) — How pumps work: pick a kind, see it cut away and
// running, then how water gets through it, each part and how it fails.

import { el } from './el.js';
import { load, save } from './store.js';
import { pumpsNav } from './subnav.js';
import { KINDS } from '../core/kinds.js';
import { drawKind } from './pumpart.js';

export function renderKinds(view) {
  let current = load('pumpKind', KINDS[0].id);
  if (!KINDS.some((k) => k.id === current)) current = KINDS[0].id;

  const body = el('div.kind-body');
  const chips = KINDS.map((k) => el('button.chip', { 'aria-pressed': String(k.id === current), onclick: () => pick(k.id) }, k.name.replace(/ \(.*\)$/, '')));

  function pick(id) {
    current = id;
    save('pumpKind', id);
    chips.forEach((c, i) => c.setAttribute('aria-pressed', String(KINDS[i].id === id)));
    show();
  }

  function show() {
    const k = KINDS.find((x) => x.id === current);
    body.replaceChildren(
      el('h2.kind-name', k.name),
      el('p.note', k.where),
      drawKind(k),
      el('p.engine-note', el('strong', 'Engine terms: '), k.engine),
      el('h2', 'How water gets through it'),
      el('ol.steps', k.how.map((h) => el('li.step', el('span.step-text', h)))),
      el('h2', 'The parts'),
      el('div.parts', k.parts.map(([name, does, fails]) => el('div.part-card',
        el('div.part-name', name),
        el('p.part-does', does),
        el('p.part-fails', el('strong', 'Fails: '), fails)))),
      el('p.big-note', el('strong', 'Watch for: '), k.watch),
    );
  }

  view.append(el('section.kinds',
    pumpsNav('kinds'),
    el('h1', 'How pumps work'),
    el('div.chips', chips),
    body,
  ));
  show();
}
