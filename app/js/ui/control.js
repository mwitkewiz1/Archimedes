// control.js (screen) — Control valves: one pilot-operated main valve (the
// Cla-Val kind), many jobs. Pick the job, move its slider or step through it,
// and watch the cover fill and drain, the valve move, the gauges answer.

import { el } from './el.js';
import { load, save } from './store.js';
import { valvesNav } from './subnav.js';
import { JOBS, job, jobState, THREE_CHECKS } from '../core/control.js';
import { mainValve } from './valveart.js';

export function renderControl(view) {
  const st = { job: 'prv', x: {}, ...load('control', {}) };
  if (!job(st.job)) st.job = 'prv';
  let shown = null, raf = 0;

  const chips = JOBS.map((j) => el('button.chip', { 'aria-pressed': String(j.id === st.job), onclick: () => { st.job = j.id; chips.forEach((c, i) => c.setAttribute('aria-pressed', String(JOBS[i].id === j.id))); shown = null; show(); } }, j.name));
  const pic = el('div.valve-pic');
  const ctl = el('div.field');
  const now = el('p.lift-now', { 'aria-live': 'polite' });
  const info = el('div');

  const value = (j) => st.x[j.id] ?? (j.input.steps ? 0 : j.input.start);

  // Move the drawn valve toward where the job says, a little each frame:
  // opening is the cover draining, closing is it filling.
  function animate(j, target) {
    cancelAnimationFrame(raf);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const d = target.open - shown.open;
      const step = still ? d : Math.sign(d) * Math.min(Math.abs(d), 0.012);
      shown = { ...target, open: shown.open + step };
      pic.replaceChildren(mainValve(shown, j.kind, Math.abs(d) > 1e-3 ? Math.sign(d) : 0));
      if (Math.abs(d) > 1e-3 && (pic.isConnected || !pic.firstChild)) raf = requestAnimationFrame(tick);
    };
    tick();
  }

  function show() {
    save('control', st);
    const j = job(st.job);
    const x = value(j);
    const target = jobState(j, x);
    if (!shown) shown = { ...target };
    if (j.input.steps) {
      ctl.replaceChildren(
        el('span.field-label', `Step ${x + 1} of ${j.input.steps.length}: ${j.input.steps[x]}`),
        el('div.segs.two-segs',
          el('button.seg', { disabled: x === 0, onclick: () => { st.x[j.id] = x - 1; show(); } }, '◀ Back'),
          el('button.seg', { onclick: () => { st.x[j.id] = (x + 1) % j.input.steps.length; show(); } }, x === j.input.steps.length - 1 ? 'Start over' : 'Next ▶')));
    } else {
      const range = el('input.range', { type: 'range', id: 'cv-x', min: j.input.min, max: j.input.max, step: 1, value: x,
        oninput: () => { st.x[j.id] = +range.value; show(); } });
      ctl.replaceChildren(el('label.field-label', { for: 'cv-x' }, `${j.input.label}: ${x} ${j.input.unit}`), range);
    }
    now.textContent = target.says;
    animate(j, target);
    info.replaceChildren(
      el('p.note', el('strong', j.cla), `. ${j.kind === 'modulating' ? 'Modulating: holds anywhere between shut and open.' : 'On-off: a three-way pilot fills or empties the cover.'}`),
      el('div.parts',
        el('div.part-card', el('div.part-name', 'What it does'), el('p.part-does', j.does)),
        el('div.part-card', el('div.part-name', 'What the pilot feels'), el('p.part-does', j.senses)),
        el('div.part-card', el('div.part-name', 'Setting it'), el('p.part-does', j.set))),
    );
  }

  view.append(el('section.control',
    valvesNav('control'),
    el('h1', 'Control valves'),
    el('p.note', 'One main valve, many jobs. Water in the cover shuts it; water out of the cover lets the line push it open. The pilot decides which. Cla-Val\'s Hytrol is the main valve under all of these.'),
    el('div.chips', chips),
    pic,
    ctl,
    now,
    info,
    el('p.engine-note', el('strong', 'Engine terms: '), 'The diaphragm and cover are a brake booster: the big diaphragm does the work, the little pilot decides which side gets the push. The restriction is a jet: it lets water into the cover slowly, so the pilot can win by letting it out faster.'),
    el('h2', 'Before you blame the pilot: three checks'),
    el('ol.steps', THREE_CHECKS.map(([name, how]) => el('li.step', el('strong.cause-why', name), el('span.step-text', how)))),
    el('p.note', 'Every tube has a job. Before loosening anything, isolate the valve, bleed the pressure off at a cover plug, and trace each tube with your finger from where it starts to where it ends.'),
  ));
  show();
}
