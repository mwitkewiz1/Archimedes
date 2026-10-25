// menu.js — the ☰ tab: every tool, Import / export (one file with what this
// phone keeps, core/backup.js), and Setup.

import { el } from './el.js';
import { load, saveAll } from './store.js';
import { loadPipes } from './pipes.js';
import { TABS } from './subnav.js';
import { makeBackup, backupSummary, readBackup, mergeBackup, importSummary, MAX_BYTES } from '../core/backup.js';

const today = () => new Date().toLocaleDateString('en-CA');
const onPhone = () => ({ pumps: load('pumpList', null), curves: load('pumpCurves', {}), pipes: loadPipes() });

// The file goes out through the phone's share sheet (AirDrop, text, email),
// or downloads where there isn't one. Some phones only share it as text.
async function handOver(text, name) {
  for (const type of ['application/json', 'text/plain']) {
    const file = new File([text], name, { type });
    if (!navigator.canShare?.({ files: [file] })) continue;
    try { await navigator.share({ files: [file], title: name }); return 'sent'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; break; }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'saved';
}

export function renderMenu(view) {
  const msg = el('div.data-msg', { 'aria-live': 'polite' });
  const say = (lines, warn) => {
    msg.replaceChildren(...[].concat(lines).map((t) => el(warn ? 'p.note.warn' : 'p.note', t)));
    msg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  async function backUp() {
    const data = makeBackup(onPhone(), today());
    const name = `archimedes-${data.saved}.json`;
    const how = await handOver(JSON.stringify(data, null, 1), name);
    if (how === 'cancelled') return say('Not sent.');
    say(`${how === 'sent' ? 'Sent' : `Saved ${name} to your downloads`}: ${backupSummary(data)}.`);
  }

  const picker = el('input', { type: 'file', hidden: true, onchange: () => bring(picker.files[0]) });
  async function bring(file) {
    picker.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return say('That file is too big to be an Archimedes file.', true);
    const r = readBackup(await file.text());
    if (!r.ok) return say(r.error, true);
    const m = mergeBackup(onPhone(), r.data);
    if (!saveAll({ pumpList: m.pumps, pumpCurves: m.curves, pipes: m.pipes })) {
      return say('This phone wouldn\'t store it (storage full or turned off). Nothing changed.', true);
    }
    say(importSummary(m.report, r.skipped));
  }

  const denom = load('tapeDenom', 16);
  const tape = el('select', { id: 'tape', onchange: () => saveAll({ tapeDenom: +tape.value }) },
    [8, 16, 32].map((d) => el('option', { value: d, selected: d === denom }, `1/${d}"`)));

  view.append(el('section.menu',
    el('h1', 'Menu'),
    el('h2', 'Tools'),
    el('nav.menu-list', { 'aria-label': 'Tools' }, TABS.map(([id, name, tools]) =>
      el('a.menu-row', { href: `#/${id}` }, el('strong', name), el('span', tools.map(([, label]) => label).join(' · '))))),
    el('h2', 'Import / export'),
    el('p.note', 'One file with what this phone keeps: curve numbers on Our pumps, joints on Fusing loss, and a pump list from your data file. Back up to keep it safe or to send it; Import adds a file\'s numbers to this phone. What you typed here stays.'),
    el('div.two',
      el('button.primary', { onclick: backUp }, 'Back up this phone'),
      el('button.primary', { onclick: () => picker.click() }, 'Import a file')),
    picker,
    msg,
    el('h2', 'Setup'),
    el('label.field', { for: 'tape' }, el('span.field-label', 'Smallest mark on your tape'), tape),
    el('nav.menu-list', { 'aria-label': 'Help' },
      el('a.menu-row', { href: '#/help' }, el('strong', 'How to type numbers'), el('span', 'Feet and inches, fractions, the keypad'))),
    el('p.foot', 'Archimedes · by [MW]Sense · works with no signal once opened'),
  ));
}
