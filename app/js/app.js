// app.js — starts the app: picks the screen from the address (#/calc, #/cut, #/ohm)
// and registers the offline cache.

import { renderCalc } from './ui/calc.js';
import { renderCut } from './ui/cut.js';
import { renderHelp } from './ui/help.js';
import { renderFusion } from './ui/fusion.js';
import { renderOhm } from './ui/ohm.js';
import { renderWire } from './ui/wire.js';
import { renderSymbols } from './ui/symbols.js';
import { renderPump } from './ui/pump.js';
import { renderKinds } from './ui/kinds.js';
import { renderTrouble } from './ui/trouble.js';
import { renderCatalog } from './ui/catalog.js';
import { renderLift } from './ui/lift.js';
import { renderMotor } from './ui/motor.js';
import { renderPhase } from './ui/phase.js';

const screens = { calc: renderCalc, cut: renderCut, fusion: renderFusion, ohm: renderOhm, wire: renderWire, symbols: renderSymbols, pump: renderPump, kinds: renderKinds, trouble: renderTrouble, catalog: renderCatalog, lift: renderLift, motor: renderMotor, phase: renderPhase, help: renderHelp };

// Screens that live under another tab: the Electric and Pumps tabs' tools.
const TAB_OF = { wire: 'ohm', motor: 'ohm', phase: 'ohm', symbols: 'ohm', kinds: 'pump', trouble: 'pump', catalog: 'pump', lift: 'pump' };

function route() {
  const name = location.hash.replace(/^#\//, '') || 'calc';
  const render = screens[name] || renderCalc;
  const view = document.getElementById('view');
  view.replaceChildren();
  render(view);
  const tab = TAB_OF[name] || (name in screens ? name : 'calc');
  for (const a of document.querySelectorAll('.tabs a')) {
    a.classList.toggle('on', a.getAttribute('href') === `#/${tab}`);
  }
  window.scrollTo(0, 0);
}

addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
