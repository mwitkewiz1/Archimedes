import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBackup, readBackup, mergeBackup, importSummary, backupSummary, FORMAT } from '../app/js/core/backup.js';
import { CATALOG, ourCatalog, searchCatalog, curveFrom } from '../app/js/core/catalog.js';
import { COLUMNS } from '../app/js/core/catalog-data.js';
import { pipeId } from '../app/js/core/fusion.js';

const pipe = (size, joints) => ({ id: pipeId({ system: 'IPS', size, dr: '11' }), system: 'IPS', size, dr: '11', joints });
const joint = (across, date = '2026-10-20') => ({ mark: '6', across, date });
const phone = () => ({
  pumps: null,
  curves: { 3: { shutoff: 160, flow: 280, head: 125 }, 7: { shutoff: 90, flow: 50, head: 70, file: true } },
  pipes: [pipe('4', [joint('11 3/4')]), pipe('6', [])],
});
const list = (built, rows) => ({ built, rows });
const roundTrip = (data) => readBackup(JSON.stringify(data));

test('a backup reads back the same', () => {
  const data = makeBackup({ ...phone(), pumps: list('2026-10-25 09:00', [{ id: 3, kind: 'slurry', name: 'HX-30', hp: 30 }]) }, '2026-10-25');
  assert.equal(data.app, 'archimedes');
  assert.equal(data.format, FORMAT);
  assert.equal(data.pipes.length, 1, 'a pipe with no joints is left out');
  assert.equal(data.pipes[0].id, undefined, 'the phone\'s pipe key is rebuilt on import, not carried');
  const r = roundTrip(data);
  assert.ok(r.ok);
  assert.equal(r.skipped, 0);
  assert.deepEqual(r.data, data);
  assert.equal(backupSummary(data), '2 curve numbers, 1 joint on 1 pipe, a pump list of 1');
  assert.equal(backupSummary(makeBackup({ curves: {}, pipes: [] }, '2026-10-25')), 'nothing measured or typed yet');
});

test('anything that isn\'t ours is refused in plain words', () => {
  assert.match(readBackup('not json').error, /isn't an Archimedes file/);
  assert.match(readBackup('{"app":"other","format":1}').error, /isn't an Archimedes file/);
  assert.match(readBackup('[1,2]').error, /isn't an Archimedes file/);
  assert.match(readBackup('null').error, /isn't an Archimedes file/);
  assert.match(readBackup(JSON.stringify({ app: 'archimedes', format: FORMAT + 1 })).error, /newer Archimedes/);
  assert.match(readBackup('x'.repeat(2_000_001)).error, /too big/);
});

test('only what the app knows gets through; the rest is dropped and counted', () => {
  const r = roundTrip({
    app: 'archimedes', format: 1, saved: '2026-10-25',
    pumps: list('2026-10-25', [
      { id: 1, kind: 'slurry', hp: 30, price: 4100, vendor: 'Someone', qty: 2 }, // extra fields dropped, pump kept
      { id: 2, kind: 'rocket', hp: 5 }, // unknown kind
      { id: 3, kind: 'grinder', hp: '5' }, // text where a number goes
      { id: -1, kind: 'grinder' },
      { id: 4, kind: 'gas', name: ' Model\u0007 A\n\n  two ' + 'x'.repeat(80) },
    ]),
    curves: { 1: { shutoff: 100, flow: 300, head: 120 }, x: { shutoff: 100, flow: 50, head: 60 }, 2: { shutoff: 100, flow: 50, head: 60, note: 'hi' } },
    pipes: [
      { system: 'IPS', size: '5/8', dr: '11', joints: [joint('11')] }, // no such size
      { system: 'IPS', size: '4', dr: '11', joints: [joint('11'), { mark: '6', across: '11', date: 'Tuesday' }, { mark: 'six', across: '11', date: '2026-10-20' }] },
      null,
    ],
  });
  assert.ok(r.ok);
  assert.deepEqual(r.data.pumps.rows[0], { id: 1, kind: 'slurry', hp: 30 });
  assert.equal(r.data.pumps.rows.length, 2);
  assert.equal(r.data.pumps.rows[1].name.length, 60, 'names are capped');
  assert.match(r.data.pumps.rows[1].name, /^Model A two x+$/, 'control characters and runs of space go');
  assert.deepEqual(Object.keys(r.data.curves), ['2']);
  assert.deepEqual(r.data.curves[2], { shutoff: 100, flow: 50, head: 60 });
  assert.equal(r.data.pipes.length, 1);
  assert.equal(r.data.pipes[0].joints.length, 1);
  assert.equal(r.skipped, 3 + 2 + 2 + 2);
  for (const row of r.data.pumps.rows) {
    for (const k of Object.keys(row)) assert.ok(['id', 'name', ...COLUMNS].includes(k), `unexpected field ${k}`);
  }
});

test('import: what you typed on this phone stays; numbers from a file update', () => {
  const file = roundTrip(makeBackup({
    curves: { 3: { shutoff: 150, flow: 280, head: 120 }, 7: { shutoff: 95, flow: 50, head: 72 }, 9: { shutoff: 40, flow: 10, head: 30 } },
    pipes: [pipe('4', [joint('11 3/4'), joint('11 5/8', '2026-10-22')]), pipe('8', [joint('11 1/2')])],
  }, '2026-10-25')).data;
  const before = phone();
  const m = mergeBackup(before, file);
  assert.deepEqual(m.curves[3], { shutoff: 160, flow: 280, head: 125 }, 'typed here: kept');
  assert.deepEqual(m.curves[7], { shutoff: 95, flow: 50, head: 72, file: true }, 'from an earlier file: updated');
  assert.deepEqual(m.curves[9], { shutoff: 40, flow: 10, head: 30, file: true }, 'new: added, marked from a file');
  assert.deepEqual(m.report, { pumps: 0, olderPumps: false, added: 1, updated: 1, kept: 1, joints: 2 });
  assert.equal(m.pipes.find((p) => p.size === '4').joints.length, 2, 'the same joint isn\'t added twice');
  assert.equal(m.pipes.find((p) => p.size === '8').id, 'IPS-8-11', 'a new pipe gets the key Fusing loss uses');
  assert.deepEqual(before, phone(), 'the phone\'s data isn\'t changed in place');
  assert.deepEqual(importSummary(m.report), [
    'Curve numbers: 1 added, 1 updated.',
    'Kept 1 you typed on this phone where the file has different numbers.',
    'Fusing loss: 2 joints added.',
  ]);
  const again = mergeBackup(m, file);
  assert.deepEqual(importSummary(again.report), ['Kept 1 you typed on this phone where the file has different numbers.'], 'the same file twice adds nothing');
  assert.deepEqual(importSummary(mergeBackup(again, { pumps: null, curves: {}, pipes: [] }).report), ['Nothing new: this phone already has everything in the file.']);
});

test('import: the newer pump list wins', () => {
  const older = list('2026-10-20 08:00', [{ id: 0, kind: 'gas' }]);
  const newer = list('2026-10-25 14:30', [{ id: 0, kind: 'gas' }, { id: 500, kind: 'slurry' }]);
  const base = { pumps: null, curves: {}, pipes: [] };
  const a = mergeBackup(base, { pumps: newer, curves: {}, pipes: [] });
  assert.equal(a.pumps, newer);
  assert.equal(a.report.pumps, 2);
  const b = mergeBackup({ ...base, pumps: newer }, { pumps: older, curves: {}, pipes: [] });
  assert.equal(b.pumps, newer);
  assert.deepEqual(importSummary(b.report, 1), ['Our pumps: kept this phone\'s list; the file\'s is older.', 'Skipped 1 entry that didn\'t read right.']);
});

test('saves from before backups: curve numbers with no mark count as typed', () => {
  const old = { pumps: null, curves: { 5: { shutoff: 100, flow: 40, head: 80 } }, pipes: [] };
  const m = mergeBackup(old, { pumps: null, curves: { 5: { shutoff: 110, flow: 40, head: 85 } }, pipes: [] });
  assert.deepEqual(m.curves[5], old.curves[5]);
  assert.equal(m.report.kept, 1);
});

test('Our pumps: your data file\'s list lies over the public one by id', () => {
  assert.equal(ourCatalog(null), CATALOG);
  const ours = ourCatalog(list('2026-10-25', [{ id: 0, kind: 'slurry', name: 'HX-30', hp: 30 }, { id: 9000, kind: 'grinder', name: 'G2', hp: 2 }]));
  assert.equal(ours.length, CATALOG.length + 1);
  assert.equal(ours.find((p) => p.id === 0).name, 'HX-30', 'same id replaces that pump');
  assert.ok(ours.find((p) => p.id === 9000), 'a new id adds one');
  assert.deepEqual(searchCatalog('hx-30', '', ours).map((p) => p.id), [0], 'a model name is searchable');
  assert.ok(searchCatalog('grinder', '', ours).some((p) => p.id === 9000));
  assert.equal(searchCatalog('hx-30').length, 0, 'the public list alone has no names');
  assert.equal(curveFrom(ours[0], { shutoff: 90, flow: 50, head: 70, file: true }).how.includes('data file'), true);
});
