import test from 'node:test';
import assert from 'node:assert/strict';
import { start, step, nextEvent, setHOA, trip, reset, pressSilence, setFault } from '../app/js/core/lift.js';

// Play the station for some seconds; note each time a pump starts.
function run(s, seconds, dt = 0.05) {
  const starts = [];
  for (let t = 0; t < seconds; t += dt) {
    const n = step(s, dt);
    for (const i of [0, 1]) if (n.m[i] && !s.m[i]) starts.push(i + 1);
    s = n;
  }
  return { s, starts };
}

test('the pumps take turns, one at a time, on a normal day', () => {
  const { s, starts } = run(start(), 60);
  assert.ok(starts.length >= 4, `only ${starts.length} starts`);
  starts.forEach((p, k) => assert.equal(p, k % 2 ? 2 : 1, `start ${k + 1} was pump ${p}`));
  assert.ok(!s.light, 'never reaches the alarm');
});

test('a lead call holds through the seal-in until the Off float drops', () => {
  let s = start();
  while (!s.m[0]) s = step(s, 0.05);
  assert.ok(s.level >= 45);
  while (s.level > 30) s = step(s, 0.05);
  assert.ok(s.m[0], 'still pumping below the Lead float');
  while (s.m[0]) s = step(s, 0.05);
  assert.ok(s.level < 15 && s.level > 13, `stopped at ${s.level}`);
  assert.equal(s.alt, 1, 'the alternator flipped');
});

test('in a storm the lag float brings on both pumps', () => {
  let s = setFault(start(), 'storm', true), together = false;
  for (let t = 0; t < 40; t += 0.05) {
    s = step(s, 0.05);
    together ||= s.m[0] && s.m[1];
    assert.ok(!s.light, 'two pumps keep up with the storm');
  }
  assert.ok(together);
});

test('a tripped lead pump: the lag pump takes over, the alarm stays quiet', () => {
  const { starts, s } = run(trip(start(), 0), 40);
  assert.ok(starts.length > 0 && starts.every((p) => p === 2));
  assert.ok(!s.light);
});

test('both tripped: alarm, then Silence quiets the horn but not the light', () => {
  let s = trip(trip(start(), 0), 1);
  s = run(s, 25).s;
  assert.ok(s.light && s.horn);
  s = pressSilence(s);
  assert.ok(s.light && !s.horn);
  s = run(s, 1).s;
  assert.ok(!s.horn, 'stays silenced');
  s = run(reset(reset(s, 0), 1), 30).s;
  assert.ok(!s.light && !s.sil, 'alarm clears and Silence lets go');
});

test('Hand runs the pump dry; Off never runs it', () => {
  let s = setHOA(start(), 0, 'hand');
  assert.ok(s.m[0]);
  const { say } = nextEvent(s);
  assert.match(say.join(' '), /dry/);
  s = setHOA(setHOA(start(), 0, 'off'), 1, 'off');
  assert.equal(run(s, 30).starts.length, 0);
});

test('an Off float stuck up runs the well dry', () => {
  let s = setFault(start(), 'offStuck', true);
  let said = '';
  for (let k = 0; k < 20 && !/dry/.test(said); k++) {
    const r = nextEvent(s);
    s = r.state;
    said = r.say.join(' ');
  }
  assert.match(said, /dry/);
});

test('every step says something', () => {
  let s = start();
  for (let k = 0; k < 15; k++) {
    const r = nextEvent(s);
    assert.ok(r.say.length && r.say.every((x) => x.length > 5));
    s = r.state;
  }
});

test('the drawn ladder agrees with the logic, rung by rung', async () => {
  const { LADDER, passes } = await import('../app/js/core/lift.js');
  const setups = [start(), trip(start(), 0), setFault(start(), 'storm', true), setFault(start(), 'leadStuck', true),
    setHOA(start(), 1, 'hand'), trip(trip(start(), 0), 1)];
  for (let s of setups) {
    for (let t = 0; t < 40; t += 0.05) {
      s = step(s, 0.05);
      if (s.light && !s.sil && t > 30) s = pressSilence(s);
      for (const r of LADDER) assert.equal(passes(r.seq, s), r.load.on(s), `${r.title} at level ${s.level.toFixed(1)}`);
    }
  }
});
