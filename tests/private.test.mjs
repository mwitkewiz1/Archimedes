// private/ holds his own scripts that read private data. It is in .gitignore;
// this check catches the one way it could still leak: a forced add.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('nothing under private/ is tracked by git', () => {
  const tracked = execFileSync('git', ['ls-files', '--', 'private'], { encoding: 'utf8' }).trim();
  assert.equal(tracked, '', `these must never be committed:\n${tracked}`);
});

test('private/ stays in .gitignore', () => {
  assert.match(readFileSync('.gitignore', 'utf8'), /^\/private\/$/m);
});
