// catalog.js — the pumps his work deals in, by kind and specs (catalog-data.js):
// plain names, search, and a pump curve where the specs give enough to draw one.
// Pure: no DOM.

import { COLUMNS, ROWS } from './catalog-data.js';
import { KINDS } from './kinds.js';

const ORDER = Object.fromEntries(KINDS.map((k, i) => [k.id, i]));
export const CATALOG = ROWS.map((row, id) => {
  const p = { id };
  COLUMNS.forEach((c, i) => { if (row[i]) p[c] = row[i]; });
  return p;
});
// The order a list shows them: kinds as How they work lists them, then by horsepower.
const shown = (list) => [...list].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (a.hp || 0) - (b.hp || 0));
const SHOWN = shown(CATALOG);

// Our pumps on this phone: the list above, with the pump list from your data
// file (core/backup.js) laid over it. A row with the same id replaces that
// pump, so curve numbers saved under its id stay on it; a new id adds a pump.
export function ourCatalog(imported) {
  if (!imported?.rows?.length) return CATALOG;
  const byId = new Map(CATALOG.map((p) => [p.id, p]));
  for (const r of imported.rows) byId.set(r.id, { ...r, imported: true });
  return [...byId.values()];
}

const KIND_NAME = Object.fromEntries(KINDS.map((k) => [k.id, k.name.replace(/ \(.*\)$/, '')]));

// Sizes and horsepower the way they're said: 1 1/4", 2/3 HP.
const SAID = [[0.25, '1/4'], [1 / 3, '1/3'], [0.5, '1/2'], [2 / 3, '2/3'], [0.75, '3/4']];
export function said(x) {
  const whole = Math.floor(x + 1e-9);
  const rest = x - whole;
  if (rest < 1e-6) return String(whole);
  const f = SAID.find(([v]) => Math.abs(v - rest) < 0.01);
  if (!f) return String(+x.toFixed(2));
  return whole ? `${whole} ${f[1]}` : f[1];
}

export function pumpName(p) {
  const bits = [KIND_NAME[p.kind]];
  if (p.hp) bits.push(`${said(p.hp)} HP`);
  if (p.volts) bits.push(`${p.volts} V${p.phase ? ` ${p.phase === 3 ? '3-phase' : '1-phase'}` : ''}`);
  if (p.discharge) bits.push(`${said(p.discharge)}" discharge`);
  return bits.join(', ');
}

// Every part of the search has to fit. Numbers are numbers, not text: "30 hp"
// is exactly 30 HP (not 230 V), "460" or "460v" a 460 V pump, '4"' a 4" discharge,
// a bare number any spec equal to it. Words match the name: "slurry", "3-phase",
// or a model name from your data file. Pass a list (ourCatalog) to search it instead.
const SPEC = [
  [/^(\d*\.?\d+)\s*hp$/, (p, n) => p.hp === n],
  [/^(\d{3})\s*v$/, (p, n) => p.volts === n],
  [/^(\d*\.?\d+)\s*(?:"|in)$/, (p, n) => p.discharge === n],
  [/^(\d*\.?\d+)\s*gpm$/, (p, n) => [p.flow, p.maxflow].includes(n)],
];
export function searchCatalog(query, kind, list) {
  const terms = String(query || '').toLowerCase().replace(/(\d)\s+(hp|v|gpm|"|in)\b/g, '$1$2').split(/\s+/).filter(Boolean);
  return (list && list !== CATALOG ? shown(list) : SHOWN).filter((p) => {
    if (kind && p.kind !== kind) return false;
    const name = `${p.name || ''} ${pumpName(p)}`.toLowerCase();
    return terms.every((t) => {
      for (const [re, fits] of SPEC) { const m = t.match(re); if (m) return fits(p, +m[1]); }
      if (/^\d*\.?\d+$/.test(t)) return [p.hp, p.volts, p.discharge, p.rpm, p.flow, p.maxflow].includes(+t);
      return name.includes(t);
    });
  });
}

// Curve numbers typed off a pump's spec sheet or nameplate: shutoff head (no
// flow), a rated flow, and the head at that flow. Returns { ok, curve } or
// { ok: false, error } in plain words.
export function checkCurveNumbers({ shutoff, flow, head }) {
  if (!(shutoff > 0) || !(flow > 0) || !(head > 0)) return { ok: false, error: 'Fill in all three numbers.' };
  if (head >= shutoff) return { ok: false, error: 'The head at a flow has to be less than the shutoff head: a pump makes its most head with nothing flowing.' };
  if (shutoff > 3000 || flow > 50000) return { ok: false, error: 'Those are bigger than any pump here. Check the units: feet of head, gallons a minute.' };
  return { ok: true, curve: { shutoff, bepFlow: flow, bepHead: head } };
}

// A curve to try on the Pump curve. Numbers on this phone (typed, or from your
// data file) win. Otherwise from what the list gives, always marked an estimate. Rated flow and head: taken
// as BEP, shutoff assumed 25% above it. Max flow and max head: the ends of the
// curve, BEP placed at 60% of max flow. Nothing to go on: null.
export function curveFrom(p, mine) {
  const yours = mine && checkCurveNumbers(mine);
  if (yours?.ok) {
    const how = mine.file ? `From the curve numbers in your data file; its best point taken at the rated flow.${mine.note ? ` ${mine.note}` : ''}` : 'From the numbers you entered off its spec sheet; its best point taken at your rated flow.';
    return { ...yours.curve, yours: true, how };
  }
  if (p.flow && p.head) {
    return { shutoff: Math.round(p.head * 1.25), bepFlow: p.flow, bepHead: p.head, how: 'Rated flow and head taken as its best point; shutoff head assumed 25% above it.' };
  }
  if (p.maxflow && p.maxhead) {
    return { shutoff: p.maxhead, bepFlow: Math.round(p.maxflow * 0.6), bepHead: Math.round(p.maxhead * 0.64), how: 'Drawn between its listed max head (no flow) and max flow (no head).' };
  }
  return null;
}
