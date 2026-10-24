// fusion.js (screen) — Fusing loss, on the Fusion tab: how to measure what a joint eats, a
// form to record it by pipe size and DR, and the list of pipes measured so far.

import { el } from './el.js';
import { fuseNav } from './subnav.js';
import { pretty } from './frac.js';
import { load, save } from './store.js';
import { loadPipes, savePipes, pipeLoss, findOrAddPipe } from './pipes.js';
import { parseMeasure, formatInches, toNumber } from '../core/measure.js';
import { SYSTEMS, DRS, wall, outsideDiameter, jointLoss, perEnd, pipeName } from '../core/fusion.js';

export function renderFusion(view) {
  const form = load('fusionForm', { system: 'IPS', size: '4', dr: '11', mark: '6', across: '' });
  const pipes = loadPipes();

  const sysSel = select('f-sys', Object.entries(SYSTEMS).map(([k, s]) => [k, s.label]), form.system);
  const sizeSel = select('f-size', [], form.size);
  const drSel = select('f-dr', DRS.map((d) => [d, `DR ${d}`]), form.dr);
  const pipeInfo = el('p.pipe-info');
  const mark = measureInput('f-mark', form.mark, '6');
  const across = measureInput('f-across', form.across, '11 3/4');
  const result = el('div.joint-result', { 'aria-live': 'polite' });
  const saveBtn = el('button.primary', { onclick: record }, 'Save this joint');
  const list = el('div.pipe-list');

  function fillSizes() {
    const sizes = SYSTEMS[form.system].sizes.map(([s]) => s);
    if (!sizes.includes(form.size)) form.size = sizes[0];
    sizeSel.replaceChildren(...sizes.map((s) => el('option', { value: s, selected: s === form.size }, `${s}"`)));
  }

  function update() {
    save('fusionForm', form);
    const w = wall(form);
    const od = outsideDiameter(form);
    pipeInfo.replaceChildren(...(w
      ? pretty(`Outside ${toNumber(od).toFixed(3)}". Wall about ${toNumber(w).toFixed(3)}" (${formatInches(w)}). DR ${form.dr} means the outside is ${form.dr} times the wall.`)
      : []));
    const r = jointLoss(parseMeasure(form.mark)?.value, parseMeasure(form.across)?.value);
    saveBtn.disabled = !r.ok;
    saveBtn.textContent = `Save to ${pipeName(form)}`;
    if (!form.across.trim()) result.replaceChildren(el('p.note', 'Enter mark to mark after fusing.'));
    else if (!r.ok) result.replaceChildren(el('p.note.warn', r.error));
    else result.replaceChildren(
      el('div.big-mid', pretty(`This joint ate ${formatInches(r.loss)}`)),
      el('p.note', pretty(`That's ${formatInches(perEnd(r.loss))} from each pipe.`)),
    );
  }

  function record() {
    const r = jointLoss(parseMeasure(form.mark)?.value, parseMeasure(form.across)?.value);
    if (!r.ok) return;
    const p = findOrAddPipe(pipes, form);
    p.joints.push({ mark: form.mark.trim(), across: form.across.trim(), date: new Date().toLocaleDateString('en-CA') });
    savePipes(pipes);
    form.across = '';
    across.value = '';
    update();
    showList();
  }

  function showList() {
    const measured = pipes.filter((p) => p.joints.length);
    if (!measured.length) {
      list.replaceChildren(el('p.note', 'No pipes measured yet. Until a pipe is here, Cut & fuse will ask you for the number instead of guessing.'));
      return;
    }
    list.replaceChildren(...measured.map((p) => {
      const l = pipeLoss(p);
      return el('div.pipe-card',
        el('div.pipe-name', l.name),
        l.joint
          ? el('div.pipe-loss', el('strong', pretty(formatInches(l.end))), ' each end · ', pretty(formatInches(l.joint.average)), ' a joint')
          : el('div.pipe-loss.warn', 'These numbers don\'t add up; check them.'),
        el('div.note', l.joint && l.joint.count > 1
          ? pretty(`From ${l.joint.count} joints, ${formatInches(l.joint.low)} to ${formatInches(l.joint.high)}.`)
          : 'From 1 joint. Two or three more make it a number you can trust.'),
        el('ul.joints', p.joints.map((j, i) => el('li',
          el('span', pretty(`${j.date}: marks ${j.mark}" back, ${j.across}" across`)),
          el('button.small-btn', {
            'aria-label': `Remove the ${j.date} joint`,
            onclick: () => {
              if (!confirm(`Remove the ${j.date} joint from ${l.name}?`)) return;
              p.joints.splice(i, 1);
              savePipes(pipes);
              showList();
            },
          }, 'Remove')))),
      );
    }));
  }

  sysSel.onchange = () => { form.system = sysSel.value; fillSizes(); update(); };
  sizeSel.onchange = () => { form.size = sizeSel.value; update(); };
  drSel.onchange = () => { form.dr = drSel.value; update(); };
  mark.oninput = () => { form.mark = mark.value; update(); };
  across.oninput = () => { form.across = across.value; update(); };

  view.append(el('section.fusion',
    fuseNav('fusion'),
    el('h1', 'Fusing loss'),
    el('p.note', 'Facing and fusing eat a little off each pipe end. It grows with wall thickness, so it changes with pipe size and DR, and with how long the facer runs. Measure it once for each pipe you fuse.'),
    el('h2', 'Measure it once'),
    measureDrawing(),
    el('ol.steps',
      el('li.step', el('span.step-text', 'Before facing, mark each pipe the same distance back from its end. 6" is easy.')),
      el('li.step', el('span.step-text', 'Face and fuse like normal. Let it cool.')),
      el('li.step', el('span.step-text', 'Measure mark to mark across the joint.')),
      el('li.step', el('span.step-text', 'Enter it below. Whatever is short of the two marks added up is what the joint ate.')),
    ),
    el('h2', 'This joint'),
    el('div.fields',
      el('label.field', { for: 'f-sys' }, el('span.field-label', 'Sizing'), sysSel),
      el('div.two',
        el('label.field', { for: 'f-size' }, el('span.field-label', 'Size'), sizeSel),
        el('label.field', { for: 'f-dr' }, el('span.field-label', 'DR'), drSel)),
      pipeInfo,
      el('label.field', { for: 'f-mark' }, el('span.field-label', 'Marks were this far back, each pipe'), mark),
      el('label.field', { for: 'f-across' }, el('span.field-label', 'Mark to mark after fusing'), across),
    ),
    result,
    saveBtn,
    el('h2', 'Your pipes'),
    list,
  ));
  fillSizes();
  update();
  showList();
}

function select(id, options, value) {
  return el('select', { id }, options.map(([v, label]) => el('option', { value: v, selected: v === value }, label)));
}

function measureInput(id, value, hint) {
  const i = el('input.measure', { id, inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: hint });
  i.value = value || '';
  return i;
}

// Two pipes with a mark 6" back on each, then fused, with mark-to-mark shown.
function measureDrawing() {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  const add = (tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text) n.textContent = text;
    s.append(n);
  };
  s.setAttribute('viewBox', '0 0 340 150');
  s.setAttribute('class', 'pipe');
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', 'Before: two pipes, each marked 6 inches back from its end. After: fused, measure mark to mark.');
  add('text', { x: 10, y: 18, class: 'lbl' }, 'Before');
  add('rect', { x: 10, y: 28, width: 150, height: 24, class: 'part keep' });
  add('rect', { x: 180, y: 28, width: 150, height: 24, class: 'part keep' });
  for (const x of [100, 240]) add('line', { x1: x, y1: 22, x2: x, y2: 58, class: 'mark' });
  add('text', { x: 130, y: 70, class: 'dim-text', 'text-anchor': 'middle' }, '6"');
  add('text', { x: 210, y: 70, class: 'dim-text', 'text-anchor': 'middle' }, '6"');
  add('text', { x: 10, y: 96, class: 'lbl' }, 'After');
  add('rect', { x: 18, y: 104, width: 304, height: 24, class: 'part keep' });
  add('rect', { x: 166, y: 101, width: 8, height: 30, class: 'part fuse' });
  for (const x of [106, 234]) add('line', { x1: x, y1: 98, x2: x, y2: 134, class: 'mark' });
  add('line', { x1: 106, y1: 143, x2: 234, y2: 143, class: 'dim' });
  add('text', { x: 170, y: 140, class: 'lbl', 'text-anchor': 'middle' }, 'measure this');
  return s;
}
