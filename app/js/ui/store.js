// store.js — small per-phone settings (last kerf, fuse loss, calculator
// history). Browser storage can be missing or blocked; every call survives that.

const KEY = 'archimedes';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function load(name, fallback) {
  const v = readAll()[name];
  return v === undefined ? fallback : v;
}

export function save(name, value) {
  try {
    const all = readAll();
    all[name] = value;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage off: the app still works, it just forgets */ }
}
