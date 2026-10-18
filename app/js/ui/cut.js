// cut.js — the Cut & fuse screen: pick the job, type the lengths the way
// you'd say them, get a picture and numbered steps with tape numbers.

import { el } from './el.js';
import { load, save } from './store.js';
import { drawPipe } from './draw.js';
import { parseMeasure, formatInches, onTape, toNumber } from '../core/measure.js';
import { planCut, JOBS } from '../core/cut.js';

const FIELDS = {
  pipe: { label: 'Pipe is now', hint: `5'1"` },
  finished: { label: 'Needs to end up', hint: `4' 9 3/4"` },
  takeOff: { label: 'Or: take off', hint: '3 1/4' },
  kerf: { label: 'Saw blade eats', hint: '3/32' },
  fuse: { label: 'Fusing eats, each end', hint: '1/8' },
};

const JOB_FIELDS = {
  oneEnd: ['pipe', 'finished', 'takeOff'],
  bothEnds: ['pipe', 'finished', 'takeOff'],
  cutOut: ['takeOff'],
};

export function renderCut(view) {
  const state = load('cut', { job: 'oneEnd', pipe: '', finished: '', takeOff: '', kerf: '3/32', fuse: '1/8' });
  const tapeDenom = load('tapeDenom', 16);
  const out = el('div.cut-out', { 'aria-live': 'polite' });
  const inputs = {};

  const jobs = el('div.jobs', { role: 'radiogroup', 'aria-label': 'Job' },
    Object.entries(JOBS).map(([key, label]) =>
      el('button.job', { role: 'radio', dataset: { job: key }, onclick: () => { state.job = key; update(); } },
        jobIcon(key), el('span', label))));

  const fieldRows = Object.entries(FIELDS).map(([key, f]) => {
    const echo = el('div.echo');
    const input = el('input.measure', {
      id: `f-${key}`, inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      placeholder: f.hint,
      oninput: () => {
        state[key] = input.value;
        // End-up and take-off say the same thing; typing one clears the other.
        if (key === 'finished' && input.value) { state.takeOff = ''; inputs.takeOff.input.value = ''; }
        if (key === 'takeOff' && input.value) { state.finished = ''; inputs.finished.input.value = ''; }
        update();
      },
    });
    input.value = state[key] || '';
    const row = el('label.field', { for: `f-${key}` }, el('span.field-label', f.label), input, echo);
    inputs[key] = { input, echo, row };
    return row;
  });

  view.append(el('section.cut',
    el('h1', 'Cut & fuse'),
    jobs,
    el('div.fields', fieldRows.slice(0, 3)),
    el('details.losses', { open: !state.kerf || !state.fuse },
      el('summary', 'Saw and fusing losses'),
      el('div.fields', fieldRows.slice(3)),
      el('p.note', 'Your own numbers: what your saw blade takes, and what one pipe end loses when it is faced and fused. A joint has two ends.')),
    out,
  ));

  function value(key) {
    const m = parseMeasure(state[key] || '');
    return m ? m.value : null;
  }

  function update() {
    save('cut', state);
    for (const b of jobs.children) b.setAttribute('aria-checked', String(b.dataset.job === state.job));
    const shown = new Set([...JOB_FIELDS[state.job], 'kerf', 'fuse']);
    for (const [key, { echo, row }] of Object.entries(inputs)) {
      row.hidden = !shown.has(key);
      const raw = (state[key] || '').trim();
      const m = parseMeasure(raw);
      echo.textContent = !raw ? '' : m ? `= ${formatInches(m.value, { feet: true })}` : "can't read that";
      echo.classList.toggle('warn', !!raw && !m);
    }
    inputs.takeOff.row.querySelector('.field-label').textContent = state.job === 'cutOut' ? 'Run needs to be shorter by' : FIELDS.takeOff.label;

    const inPlace = state.job === 'cutOut'; // hidden fields don't count
    const plan = planCut({
      job: state.job,
      pipe: inPlace ? null : value('pipe'), finished: inPlace ? null : value('finished'), takeOff: value('takeOff'),
      kerf: value('kerf') || undefined, fuse: value('fuse') || undefined,
    });
    if (!plan.ok) { out.replaceChildren(el('p.note.big-note', plan.error)); return; }
    out.replaceChildren(
      drawPipe({ parts: plan.parts, ...drawingMarks(state.job, plan.numbers), openEnds: state.job === 'cutOut' }),
      el('ol.steps', plan.steps.map((s) => el(`li.step.${s.k}`,
        el('span.step-text', s.text), s.value ? el('strong.step-val', formatInches(s.value)) : null,
        s.value && toNumber(s.value) >= 12 ? el('span.step-feet', `That's ${formatInches(s.value, { feet: true })}.`) : null,
        s.k === 'mark' || s.k === 'check' ? tapeNote(s.value, tapeDenom) : null))),
      plan.numbers.scrap ? el('p.note', `Scrap left over: ${formatInches(plan.numbers.scrap)}.`)
        : plan.numbers.scrapEach ? el('p.note', `Scrap off each end: ${formatInches(plan.numbers.scrapEach)}.`) : null,
    );
  }

  update();
}

function drawingMarks(job, n) {
  if (job === 'oneEnd') return { marks: [2], dims: [{ a: 0, b: 2, text: formatInches(n.mark) }] };
  if (job === 'bothEnds') return { marks: [2, 5], dims: [{ a: 2, b: 5, text: formatInches(n.between) }, { a: 0, b: 2, text: formatInches(n.offEach) }] };
  return { marks: [2, 5], dims: [{ a: 2, b: 5, text: formatInches(n.gap) }] };
}

function tapeNote(v, denom) {
  const t = onTape(v, denom);
  if (t.side === 'on') return null;
  return el('span.tape-note', `On a 1/${denom}" tape: a hair ${t.side} ${formatInches(t.mark)}.`);
}

// Little pictures on the job buttons: a pipe with what gets cut.
function jobIcon(job) {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 60 20');
  s.setAttribute('class', 'job-icon');
  s.setAttribute('aria-hidden', 'true');
  const rect = (x, w, cls) => {
    const r = document.createElementNS(NS, 'rect');
    for (const [k, v] of Object.entries({ x, y: 4, width: w, height: 12, class: cls })) r.setAttribute(k, v);
    s.append(r);
  };
  if (job === 'oneEnd') { rect(2, 44, 'keep'); rect(47, 11, 'scrap'); }
  if (job === 'bothEnds') { rect(2, 9, 'scrap'); rect(12, 36, 'keep'); rect(49, 9, 'scrap'); }
  if (job === 'cutOut') { rect(2, 22, 'keep'); rect(25, 10, 'scrap'); rect(36, 22, 'keep'); }
  return s;
}
