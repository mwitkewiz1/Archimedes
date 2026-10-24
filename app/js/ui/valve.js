// valve.js (screen) — the Valves tab's kinds: pick a valve, work it in the
// cutaway (open and shut it, or run the water forward and back), then how it
// works, its parts, what it is good for and what not to do.

import { el } from './el.js';
import { load, save } from './store.js';
import { valvesNav } from './subnav.js';
import { VALVES, JOB_GUIDE, valve } from '../core/valve.js';
import { drawValve } from './valveart.js';

const BUTTONS = {
  turn: [['Shut', 0], ['Half', 0.5], ['Open', 1]],
  flow: [['Pump stopped', 0], ['Pumping', 1]],
  air: [['Full of water', 0], ['Air gathers', 1]],
};

export function renderValve(view) {
  let current = load('valveKind', VALVES[0].id);
  if (!valve(current)) current = VALVES[0].id;
  let pos = 1, target = 1, raf = 0;

  const body = el('div.kind-body');
  const pic = el('div.valve-pic');
  const btns = el('div.segs');
  const chips = VALVES.map((v) => el('button.chip', { 'aria-pressed': String(v.id === current), onclick: () => pick(v.id) }, v.name.replace(/ \(.*\)$/, '')));

  function draw() { pic.replaceChildren(drawValve(current, pos)); }
  // Ease the picture to where the button says; stop when the screen is gone.
  function move() {
    if (!pic.isConnected) return;
    const step = Math.sign(target - pos) * Math.min(Math.abs(target - pos), 0.04);
    pos += step;
    draw();
    if (Math.abs(target - pos) > 1e-3) raf = requestAnimationFrame(move);
  }
  function go(t) {
    target = t;
    [...btns.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.t === t)));
    cancelAnimationFrame(raf);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { pos = t; draw(); } else move();
  }

  function pick(id) {
    current = id;
    save('valveKind', id);
    chips.forEach((c, i) => c.setAttribute('aria-pressed', String(VALVES[i].id === id)));
    show();
  }

  function show() {
    const v = valve(current);
    cancelAnimationFrame(raf);
    pos = target = 1;
    btns.replaceChildren(...(BUTTONS[v.moves] || []).map(([name, t]) =>
      el('button.seg', { dataset: { t }, 'aria-pressed': String(t === 1), onclick: () => go(t) }, name)));
    btns.className = `segs ${btns.children.length === 2 ? 'two-segs' : ''}`;
    draw();
    body.replaceChildren(
      el('h2.kind-name', v.name),
      el('p.note', v.where),
      pic,
      ...(v.moves === 'pilot' ? [el('a.small-btn', { href: '#/control' }, 'Run one in Control valves')] : [btns]),
      el('p.engine-note', el('strong', 'Engine terms: '), v.engine),
      el('h2', 'How it works'),
      el('ol.steps', v.how.map((h) => el('li.step', el('span.step-text', h)))),
      el('h2', 'The parts'),
      el('div.parts', v.parts.map(([name, does, fails]) => el('div.part-card',
        el('div.part-name', name),
        el('p.part-does', does),
        el('p.part-fails', el('strong', 'Fails: '), fails)))),
      el('ul.rules', el('li', el('strong', 'Good for: '), v.good), el('li', el('strong', 'Don\'t: '), v.dont)),
      el('p.big-note', el('strong', 'Watch for: '), v.watch),
    );
  }

  const guide = el('details.losses.chooser',
    el('summary', 'Which valve for the job?'),
    el('ul.rules.valve-guide', JOB_GUIDE.map(([job, says, ids]) => el('li',
      el('strong', job), ': ', says, ' ',
      ...ids.map((id) => el('button.small-btn', { onclick: () => { pick(id); body.scrollIntoView({ behavior: 'smooth' }); } }, valve(id).name.replace(/ \(.*\)$/, '')))))),
  );

  view.append(el('section.valves',
    valvesNav('valve'),
    el('h1', 'Valves'),
    guide,
    el('div.chips', chips),
    body,
  ));
  show();
}
