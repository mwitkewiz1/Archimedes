// backup.js — the one file a phone backs up to and imports from: curve numbers
// for Our pumps, the joints measured on Fusing loss, and a pump list from your
// data file. Checks a file before anything in it is trusted, and merges it into
// what the phone already has. Pure: no DOM, no storage.
//
// The file:
// { app: 'archimedes', format: 1, saved: 'YYYY-MM-DD',
//   pumps: { built: 'YYYY-MM-DD HH:MM', rows: [{ id, kind, name?, hp, volts, ... }] } or null,
//   curves: { '<pump id>': { shutoff, flow, head, file?, note? } },
//   pipes: [{ system, size, dr, joints: [{ mark, across, date }] }] }
// A curve marked file: true came from a file; unmarked, someone typed it.
// A pump row's id is its row on Our pumps: the same id replaces that pump, a new one adds a pump.

import { COLUMNS } from './catalog-data.js';
import { KINDS } from './kinds.js';
import { checkCurveNumbers } from './catalog.js';
import { SYSTEMS, DRS, pipeId } from './fusion.js';
import { parseMeasure } from './measure.js';

export const FORMAT = 1;
export const MAX_BYTES = 2_000_000;

const NOT_OURS = 'That isn\'t an Archimedes file. Pick the .json file a backup or your data file made.';
const KIND_IDS = new Set(KINDS.map((k) => k.id));
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STAMP = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;

// Everything this phone keeps, as the file. Pipes with no joints are left out.
export function makeBackup({ pumps, curves, pipes }, saved) {
  return {
    app: 'archimedes',
    format: FORMAT,
    saved,
    pumps: pumps?.rows?.length ? pumps : null,
    curves: curves || {},
    pipes: (pipes || []).filter((p) => p.joints?.length)
      .map(({ system, size, dr, joints }) => ({ system, size, dr, joints: joints.map(({ mark, across, date }) => ({ mark, across, date })) })),
  };
}

// What a backup holds, in a line: "3 curve numbers, 12 joints on 2 pipes, a pump list of 240".
export function backupSummary(data) {
  const curves = Object.keys(data.curves).length;
  const joints = data.pipes.reduce((n, p) => n + p.joints.length, 0);
  const bits = [
    curves && `${curves} curve number${curves === 1 ? '' : 's'}`,
    joints && `${joints} joint${joints === 1 ? '' : 's'} on ${data.pipes.length} pipe${data.pipes.length === 1 ? '' : 's'}`,
    data.pumps && `a pump list of ${data.pumps.rows.length}`,
  ].filter(Boolean);
  return bits.length ? bits.join(', ') : 'nothing measured or typed yet';
}

// The file's text to { ok: true, data, skipped } or { ok: false, error } in plain words.
// Only what the app knows goes through: anything else is dropped and counted in skipped.
export function readBackup(text) {
  if (typeof text !== 'string' || text.length > MAX_BYTES) return { ok: false, error: 'That file is too big to be an Archimedes file.' };
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: NOT_OURS }; }
  if (!raw || typeof raw !== 'object' || raw.app !== 'archimedes' || !Number.isInteger(raw.format) || raw.format < 1) return { ok: false, error: NOT_OURS };
  if (raw.format > FORMAT) return { ok: false, error: 'This file is from a newer Archimedes. Open the app once with signal so it updates, then import again.' };

  let skipped = 0;
  const drop = () => { skipped++; return null; };

  let pumps = null;
  if (raw.pumps != null) {
    const rows = Array.isArray(raw.pumps.rows) ? raw.pumps.rows.map((r) => readPump(r) || drop()).filter(Boolean) : [];
    if (STAMP.test(raw.pumps.built) && rows.length) pumps = { built: raw.pumps.built, rows };
    else drop();
  }

  const curves = {};
  for (const [id, c] of Object.entries(raw.curves && typeof raw.curves === 'object' ? raw.curves : {})) {
    const n = c && { shutoff: c.shutoff, flow: c.flow, head: c.head };
    if (!/^\d{1,5}$/.test(id) || !n || !checkCurveNumbers(n).ok) { drop(); continue; }
    const note = typeof c.note === 'string' ? oneLine(c.note, NOTE) : '';
    curves[id] = { ...n, ...(c.file === true ? { file: true } : {}), ...(note ? { note } : {}) };
  }

  const pipes = [];
  for (const p of Array.isArray(raw.pipes) ? raw.pipes : []) {
    const sizes = SYSTEMS[p?.system]?.sizes.map(([s]) => s) || [];
    if (!p || !sizes.includes(p.size) || !DRS.includes(p.dr) || !Array.isArray(p.joints)) { drop(); continue; }
    const joints = p.joints.map((j) => readJoint(j) || drop()).filter(Boolean);
    if (joints.length) pipes.push({ system: p.system, size: p.size, dr: p.dr, joints });
  }

  return { ok: true, data: { app: 'archimedes', format: FORMAT, saved: DAY.test(raw.saved) ? raw.saved : '', pumps, curves, pipes }, skipped };
}

// Text from a file as one short line: control characters and runs of space go.
const oneLine = (t, max) => t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function readPump(r) {
  if (!r || typeof r !== 'object' || !Number.isInteger(r.id) || r.id < 0 || r.id > 99999 || !KIND_IDS.has(r.kind)) return null;
  const p = { id: r.id, kind: r.kind };
  if (typeof r.name === 'string') {
    const name = oneLine(r.name, 60);
    if (name) p.name = name;
  }
  for (const c of COLUMNS.slice(1)) {
    const v = r[c];
    if (v == null || v === 0) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100000) return null;
    p[c] = v;
  }
  return p;
}

function readJoint(j) {
  const ok = (t) => typeof t === 'string' && t.length <= 24 && parseMeasure(t);
  if (!j || !ok(j.mark) || !ok(j.across) || !DAY.test(j.date)) return null;
  return { mark: j.mark, across: j.across, date: j.date };
}

// A curve's note: one short line a data file carries with its numbers, such as that the maker's run high.
const NOTE = 200;
const same = (a, b) => a.shutoff === b.shutoff && a.flow === b.flow && a.head === b.head;
const sameJoint = (a, b) => a.mark === b.mark && a.across === b.across && a.date === b.date;

// A checked file merged into what the phone has (neither is changed):
// - Pump list: the newer build wins; the same build, the file's.
// - Curve numbers: ones typed on this phone stay; ones that came from a file update to the new file's.
// - Joints: added where the phone doesn't have that same joint already.
// Returns { pumps, curves, pipes, report }.
export function mergeBackup(phone, file) {
  const report = { pumps: 0, olderPumps: false, added: 0, updated: 0, kept: 0, joints: 0 };

  let pumps = phone.pumps || null;
  if (file.pumps) {
    if (!pumps || file.pumps.built >= pumps.built) { pumps = file.pumps; report.pumps = pumps.rows.length; }
    else report.olderPumps = true;
  }

  const curves = { ...phone.curves };
  for (const [id, c] of Object.entries(file.curves)) {
    const have = curves[id];
    const n = { shutoff: c.shutoff, flow: c.flow, head: c.head, file: true, ...(c.note ? { note: c.note } : {}) };
    if (!have) { curves[id] = n; report.added++; }
    else if (same(have, n) && (!have.file || (have.note || '') === (n.note || ''))) continue;
    else if (have.file) { curves[id] = n; report.updated++; }
    else report.kept++;
  }

  const pipes = phone.pipes.map((p) => ({ ...p, joints: [...p.joints] }));
  for (const fp of file.pipes) {
    let p = pipes.find((x) => x.system === fp.system && x.size === fp.size && x.dr === fp.dr);
    if (!p) { p = { id: pipeId(fp), system: fp.system, size: fp.size, dr: fp.dr, joints: [] }; pipes.push(p); }
    for (const j of fp.joints) {
      if (p.joints.some((h) => sameJoint(h, j))) continue;
      p.joints.push({ ...j });
      report.joints++;
    }
  }

  return { pumps, curves, pipes, report };
}

// What an import did, in plain lines.
export function importSummary(report, skipped = 0) {
  const lines = [];
  if (report.pumps) lines.push(`Our pumps: a list of ${report.pumps} from the file.`);
  if (report.olderPumps) lines.push('Our pumps: kept this phone\'s list; the file\'s is older.');
  const curves = [report.added && `${report.added} added`, report.updated && `${report.updated} updated`].filter(Boolean);
  if (curves.length) lines.push(`Curve numbers: ${curves.join(', ')}.`);
  if (report.kept) lines.push(`Kept ${report.kept} you typed on this phone where the file has different numbers.`);
  if (report.joints) lines.push(`Fusing loss: ${report.joints} joint${report.joints === 1 ? '' : 's'} added.`);
  if (!lines.length) lines.push('Nothing new: this phone already has everything in the file.');
  if (skipped) lines.push(`Skipped ${skipped} entr${skipped === 1 ? 'y' : 'ies'} that didn't read right.`);
  return lines;
}
