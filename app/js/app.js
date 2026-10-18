// app.js — starts the app: picks the screen from the address (#/calc, #/cut, #/ohm)
// and registers the offline cache.

import { renderCalc } from './ui/calc.js';
import { renderCut } from './ui/cut.js';
import { renderHelp } from './ui/help.js';
import { renderFusion } from './ui/fusion.js';
import { renderOhm } from './ui/ohm.js';
import { renderWire } from './ui/wire.js';

const screens = { calc: renderCalc, cut: renderCut, fusion: renderFusion, ohm: renderOhm, wire: renderWire, help: renderHelp };

// Screens that live under another tab: the Electric tab's tools.
const TAB_OF = { wire: 'ohm' };

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
