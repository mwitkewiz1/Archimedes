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

// True when it stuck; false when storage is off or full.
export function save(name, value) {
  return saveAll({ [name]: value });
}

// Several at once, in one write: all of them stick or none do.
export function saveAll(values) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), ...values }));
    return true;
  } catch { return false; /* storage off: the app still works, it just forgets */ }
}
