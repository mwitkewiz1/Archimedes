// Every module in app/js parses and loads, so a typo can't blank the whole app.
// app.js is left out: it starts the screens, which need a browser.
import test from 'node:test';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : n.endsWith('.js') ? [p] : [];
  });
}

for (const p of files('app/js').filter((p) => !p.endsWith('app.js'))) {
  test(`loads ${p}`, () => import(pathToFileURL(resolve(p)).href));
}
