import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VALVES, JOB_GUIDE, valve } from '../app/js/core/valve.js';
import { JOBS, jobState } from '../app/js/core/control.js';
import { simulate, judge, sayAdjust } from '../app/js/core/adjust.js';
import { SYMPTOMS, troubleFor } from '../app/js/core/vtrouble.js';

test('every valve kind has a drawing, and the guide names only real kinds', () => {
  const art = readFileSync(new URL('../app/js/ui/valveart.js', import.meta.url), 'utf8');
  for (const v of VALVES) {
    assert.ok(v.id === 'control' || new RegExp(`\\n  ${v.id}\\(svg, p\\)`).test(art), `drawing for ${v.id}`);
    assert.ok(['turn', 'flow', 'air', 'pilot'].includes(v.moves), `${v.id} moves`);
  }
  for (const [, , ids] of JOB_GUIDE) for (const id of ids) assert.ok(valve(id), id);
});

test('control valve jobs: water in the cover shuts it, and every step lands open or shut sensibly', () => {
  for (const j of JOBS) {
    const xs = j.input.steps ? j.input.steps.map((_, k) => k) : [j.input.min, j.input.start, j.input.max];
    for (const x of xs) {
      const s = jobState(j, x);
      assert.ok(s.open >= 0 && s.open <= 1, `${j.id} at ${x}`);
      assert.ok(typeof s.says === 'string' && s.says.length > 10);
    }
  }
  const prv = JOBS.find((j) => j.id === 'prv');
  assert.equal(jobState(prv, 0).open, 0, 'no use downstream: a reducer shuts');
  assert.ok(jobState(prv, 100).open > jobState(prv, 20).open, 'more use, more open');
  const relief = JOBS.find((j) => j.id === 'sustain');
  assert.equal(jobState(relief, 90).open, 0, 'under the setting: shut');
  assert.ok(jobState(relief, 120).open > 0, 'over it: opens');
  const pump = JOBS.find((j) => j.id === 'pump');
  const steps = pump.input.steps.map((_, k) => jobState(pump, k));
  assert.equal(steps[1].open, 0, 'the pump starts against a shut valve');
  assert.equal(steps.at(-1).open, 0, 'and stops only once it is shut again');
  assert.ok(steps.at(-2).motor, 'still running while it closes');
});

test('adjust: middle needles hold steady; each extreme shows its own fault', () => {
  const names = (o) => sayAdjust(judge(simulate(o), o.set ?? 60), o.set ?? 60).map(([, n]) => n.split(' ')[0]);
  assert.deepEqual(names({ open: 3, close: 3 }), ['Steady']);
  assert.ok(names({ open: 5, close: 3 }).includes('Hunting'));
  assert.ok(names({ open: 1, close: 3 }).includes('Sags'));
  assert.ok(names({ open: 3, close: 1 }).includes('Overshoots'));
  assert.ok(names({ open: 3, close: 5 }).includes('Hammers'));
});

test('valve troubleshooter: kinds are real, filtering keeps only fitting causes', () => {
  const ids = new Set(VALVES.map((v) => v.id));
  for (const s of SYMPTOMS) {
    for (const k of s.kinds || []) assert.ok(ids.has(k), `${s.id}: ${k}`);
    for (const c of s.causes) for (const k of c.kinds || []) assert.ok(ids.has(k), `${s.id} cause: ${k}`);
  }
  for (const v of VALVES) assert.ok(troubleFor(v.id).length > 0, `something to check for ${v.id}`);
  assert.ok(troubleFor('gate').every((s) => s.causes.every((c) => !c.kinds || c.kinds.includes('gate'))));
});
