// .claude/prove.mjs: the kit's seen-to-fail self test; `node .claude/house.mjs prove` runs it.
// It builds a temp repo with a bare remote and a copy of the kit, then plants one defect per push law and per
// Borg detector and checks that each is caught, and that clean work passes. Node 24, no dependencies.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIGEST = 3000; // the start digest's own output cap in house.mjs; never a rule
const HOOK = '#!/bin/sh\nexec node .claude/house.mjs cooler "$@"\n';
const lf = s => String(s ?? '').replace(/\r\n/g, '\n');
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + '…');
function run(cmd, args, cwd, o = {}) {
  const opt = { cwd, input: o.input, env: o.env, encoding: 'utf8', maxBuffer: 1 << 30, windowsHide: true, shell: !!o.shell };
  const r = args ? spawnSync(cmd, args, opt) : spawnSync(cmd, opt);
  return { ok: r.status === 0, code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

export function prove() {
  const t0 = Date.now(), kit = path.dirname(fileURLToPath(import.meta.url)), kitRoot = path.dirname(kit);
  const house = path.join(kit, 'house.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'house-prove-'));
  const remote = path.join(tmp, 'remote.git'), repo = path.join(tmp, 'clone'), env = { ...process.env };
  for (const k of Object.keys(env)) if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR|PREFIX)$/.test(k)) delete env[k];
  const sh = cmd => run(cmd, null, repo, { shell: true, env }), g = (...a) => run('git', a, repo, { env });
  const W = (f, s) => { fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true }); fs.writeFileSync(path.join(repo, f), s); };
  const R = f => fs.readFileSync(path.join(repo, f), 'utf8');
  const tip = () => run('git', ['--git-dir', remote, 'rev-parse', '--verify', '-q', 'main'], tmp, { env }).out.trim();
  const pad = (p, n) => { let s = '', i = 0; while (s.length < n) s += `${p} ${i++}.\n`; return s; }, crlf = s => lf(s).replace(/\n/g, '\r\n');
  const results = [];
  const record = (name, fn) => {
    g('reset', '-q', '--hard', 'origin/main'); g('clean', '-fdq');
    let res; try { res = fn(); } catch (e) { res = e.message; }
    results.push(res === true);
    console.log(`${res === true ? 'PASS' : 'FAIL'}  ${name}${res === true ? '' : ': ' + clip(norm(res), 400)}`);
  };
  const push = (name, plant, want, mark) => record(name, () => {
    plant();
    const before = tip(), r = sh('git add -A && git commit -q -m x && git push -q'), moved = tip() !== before, text = r.out + r.err;
    if (want) return (r.ok && moved) || `push was refused: ${text}`;
    return (!r.ok && !moved && text.includes(mark)) || `expected a refusal naming "${mark}", got exit ${r.code}: ${text}`;
  });
  const CARD = [
    '# Demo repo', '', 'A made-up repo for the house self test.', 'Nobody uses it.', 'Nothing in it is real.', '',
    '## Rules',
    '- Never write item.qty outside applyTxn. [confirmed 2026-10-13]',
    '- Ask before deleting a bin;', '  a bin can hold demo parts. [matthew 2026-10-13]',
    `- Checks: node -e "process.exitCode = +require('fs').existsSync('FAIL')"`, // FAIL stands in for a failing test
    '- Push: main once Checks pass [confirmed 2026-10-13]',
    '- Named: none', '',
    '## Where things live', '| File | Read when |', '|---|---|',
    '| wip.md | the digest shows its Next, Needs and Open |', '| docs/decisions.md | you need a past owner ruling |',
    '| docs/old-topic.md | never; self test |', ''].join('\n');
  const BOARD_TEXT = ['# wip.md — the board', '', 'Open work only. Done items are deleted (git keeps them).', '',
    '## Next', '**Demo job**', 'Stopped at step 2. Next: label the test bin.', '',
    '## Needs Matthew', '- N1 Keep the demo bin? — default: keep it [2026-10-13]', '',
    '## On the floor', '- Scan the demo bin → wip.md Open [2026-10-12]', '',
    '## Open', '- **Demo item** [2026-10-13] → docs/decisions.md', '  Body line.', ''].join('\n');
  try {
    run('git', ['init', '-q', '--bare', '--initial-branch=main', remote], tmp, { env });
    run('git', ['init', '-q', '--initial-branch=main', repo], tmp, { env });
    for (const [k, v] of [['user.name', 'house prove'], ['user.email', 'prove@example.invalid'], ['commit.gpgsign', 'false'],
      ['core.autocrlf', 'false'], ['core.hooksPath', '.githooks'], ['push.default', 'simple']]) g('config', k, v);
    g('remote', 'add', 'origin', remote);
    W('.claude/house.mjs', fs.readFileSync(house));
    const borgSrc = path.join(kit, 'borg.mjs');
    if (fs.existsSync(borgSrc)) W('.claude/borg.mjs', fs.readFileSync(borgSrc));
    const hookSrc = path.join(kitRoot, '.githooks', 'pre-push');
    W('.githooks/pre-push', fs.existsSync(hookSrc) ? lf(fs.readFileSync(hookSrc, 'utf8')) : HOOK);
    fs.chmodSync(path.join(repo, '.githooks', 'pre-push'), 0o755);
    W('.gitattributes', '.githooks/* text eol=lf\n');
    W('CLAUDE.md', CARD);
    W('wip.md', BOARD_TEXT);
    W('docs/decisions.md', 'Read when: you need a past owner ruling. Grep by area; never read whole.\n' +
      '- 2026-10-13 · demo · Every bin gets a label · "label every bin" · fewer lost parts · [matthew]\n');
    W('docs/old-topic.md', 'Read when: never; self test.\n\n' + pad('Shelf fact', 5000)); // here before the Borg's baseline
    W('.claude/rules/house.md', '# House rules\n\nAnswer first. Ask before deleting.\n');
    W('.claude/rules/demo.md', '---\npaths:\n  - "src/**"\n---\n# demo\n\nDon\'t: rename the demo bin;\nits labels point at it. [lesson 2026-10-13]\n');
    W('src/demo.js', 'export const demo = 1;\n');
    W('app/sw.js', "const VERSION = 'demo-v1';\n");
    const init = sh('git add -A && git commit -q -m init && git push -q -u origin main');
    console.log(`${init.ok && tip() ? 'PASS' : 'FAIL'}  first push to an empty remote passes${init.ok ? '' : ': ' + clip(norm(init.out + init.err), 400)}`);
    results.push(init.ok && !!tip());
    const ask = /^- Ask before[^\n]*\n {2}[^\n]*\n/m.exec(CARD)[0], gone = CARD.replace(ask, '');
    push('clean push passes', () => W('wip.md', R('wip.md').replace('Body line.', 'Body line, edited.')), true);
    push('B3 closed file set refuses', () => W('notes.md', 'A stray note.\n'), false, 'house: B3');
    push('B4 area note frontmatter refuses', () => W('.claude/rules/scan.md', '---\npaths: src/**\n---\n# scan\n'), false, 'house: B4');
    push('B5 protected line refuses', () => W('CLAUDE.md', gone), false, 'house: B5');
    push('B5 moving the line to _archive/ passes', () => { W('CLAUDE.md', gone); W('_archive/2026-10-moved.md', ask.replace('\n  ', ' ')); }, true);
    const demo = '.claude/rules/demo.md';
    push('B5 a wrapped lesson losing its first line refuses', () => W(demo, R(demo).replace("Don't: rename the demo bin;\n", '')), false, 'house: B5');
    push('B5 re-wrapping a lesson passes', () => W(demo, R(demo).replace(';\n', '; ')), true);
    push('CRLF copies pass', () => {
      for (const f of ['CLAUDE.md', 'wip.md', 'docs/decisions.md', '.claude/rules/demo.md', '.claude/rules/house.md']) W(f, crlf(R(f)));
    }, true);
    push('Checks failure refuses', () => W('FAIL', 'a failing test\n'), false, 'Checks failed');
    push('B6 a decoy Checks line above the real one refuses', () => {
      W('FAIL', 'a failing test\n'); W('CLAUDE.md', CARD.replace('- Checks:', '- Checks: node -e "process.exit(0)"\n- Checks:'));
    }, false, 'house: B6');
    push('moving the card to _archive/ still runs Checks', () => { W('FAIL', 'a failing test\n'); g('mv', 'CLAUDE.md', '_archive/2026-10-old-card.md'); }, false, 'Checks failed');
    record('check flags an uncommitted defect', () => {
      W('notes.md', 'A stray note.\n');
      const r = run('node', ['.claude/house.mjs', 'check'], repo, { env });
      return (r.code === 1 && r.out.includes('house: B3')) || `exit ${r.code}: ${r.out}`;
    });
    record('digest reads card and board', () => {
      const r = run('node', [path.join(repo, '.claude', 'house.mjs'), 'start'], repo, { env, input: JSON.stringify({ source: 'resume', cwd: repo }) });
      const miss = ['Demo job', 'N1 Keep the demo bin', 'On the floor: 1. Oldest: Scan the demo bin', 'App version: demo-v1', 'Open (1): Demo item',
        'Area notes: demo.', 'Findings: ', 'branch main, 0 ahead, 0 behind origin/main'].filter(x => !r.out.includes(x));
      return (r.ok && r.out.length <= DIGEST && !miss.length && !r.out.includes('Borg:')) || `missing ${miss.join(' | ')} (or a Borg line) in: ${r.out}`;
    });
    record('prompt line and meter', () => {
      const tr = path.join(tmp, 'transcript.jsonl'), use = (a, b, c) => ({ type: 'assistant', message: { usage: { input_tokens: a, cache_read_input_tokens: b, cache_creation_input_tokens: c } } });
      fs.writeFileSync(tr, [{ type: 'user', message: { content: 'hi' } }, use(10, 1000, 0), use(5, 340000, 10000), { type: 'user', message: { content: 'next' } }].map(o => JSON.stringify(o)).join('\n') + '\n');
      const a = run('node', [house, 'prompt'], tmp, { env, input: JSON.stringify({ prompt: 'fix the scan', transcript_path: tr, session_id: 'x' }) }).out;
      const b = run('node', [house, 'prompt'], tmp, { env, input: JSON.stringify({ prompt: 'More detail please' }) }).out;
      const ok = /^Chicago \w{3} \d\d:\d\d\./.test(a) && a.includes('Reply temper') && a.includes('one-line plan') && a.includes('about 350K') &&
        !/\d+ words|at most \d/.test(a) && !b.includes('Reply temper');
      return ok || `got: ${a} || ${b}`;
    });
    // The Borg: a clean fixture has no work; one planted target per detector is reported, and the digest says so.
    const borg = (cwd = repo, ...a) => { const r = run('node', [path.join(repo, '.claude', 'borg.mjs'), 'detect', '--json', ...a], cwd, { env }); return JSON.parse(r.out || '{}'); };
    record('borg: the clean fixture has nothing to assimilate (--root from outside)', () => {
      const r = borg(tmp, '--root', repo); return r.count === 0 || `count ${r.count}: ${JSON.stringify(r.findings)}`;
    });
    const old = { ...env, GIT_AUTHOR_DATE: '2025-01-02T12:00:00Z', GIT_COMMITTER_DATE: '2025-01-02T12:00:00Z' };
    const ghost = ['ghost', 'Helper'].join(''); // built here, so the kit's own code never holds the name
    const commit = msg => { g('add', '-A'); g('commit', '-q', '-m', msg); };
    const none = file => r => !r.findings.some(x => x.file === file) || `wanted no notes in ${file}, got ${JSON.stringify(r.findings)}`;
    const targets = [
      ['history: a changelog section is reported', 'docs/history-demo.md', () => W('docs/history-demo.md', 'Read when: never.\n\n## Changelog\n- ~~Bins were blue~~ now green.\n')],
      ['history: a Status section in a nested topic doc is reported', 'engines/demo/demo.md',
        () => W('engines/demo/demo.md', '# demo engine\n\n## Status\n- Build 3: the oil group.\n\n## Parts\nThe pan is cast iron.\n')],
      ['history: a date that only says who measured it, or when, is not', 'docs/prov-demo.md',
        () => W('docs/prov-demo.md', 'Read when: never.\n\nAisle 9 runs from the office wall (measured 2026-10-08, Matthew).\nBins are blue (2026-07-11).\n'), none('docs/prov-demo.md')],
      ['duplicate: a sentence in two docs is reported', 'docs/dup-b.md', () => { for (const f of ['docs/dup-a.md', 'docs/dup-b.md']) W(f, 'Read when: never.\n\nEvery demo bin keeps its label facing the walk aisle at eye height.\n'); }],
      ['status: open work in a reference doc is reported', 'docs/status-demo.md', () => W('docs/status-demo.md', 'Read when: never.\n\nThe scan fix is already shipped, and the label tool is pending.\n')],
      ['ruling: his words with no decisions row are reported', 'docs/ruling-demo.md', () => W('docs/ruling-demo.md', 'Read when: never.\n\nMatthew said "paint the floor lines yellow" after the walk.\n')],
      ['dead-name: a deleted path, and with --deep a code name that left, are reported', 'docs/dead-demo.md', () => {
        W('src/scanner.js', `export function ${ghost}() { return 1; }\n`); commit('add the scanner');
        fs.rmSync(path.join(repo, 'src/scanner.js')); commit('drop the scanner');
        W('docs/dead-demo.md', `Read when: never.\n\nThe scanner lives in \`src/scanner.js\` and calls \`${ghost}()\`.\n`);
      }, 2, ['--deep']],
      ['dead-name: a path no commit ever held (a plan) is not', 'docs/plan-demo.md',
        () => W('docs/plan-demo.md', 'Read when: never.\n\nThe label tool will live in `src/labels.js`.\n'), none('docs/plan-demo.md')],
      // v3 fixes, each seen to fail on the v2 Borg: the doc's own word that a name went; status words only as open
      // work, one note a paragraph; a strikethrough on the board is a correction, not done; his words are a ruling.
      ['dead-name: a name the doc says went (moved from, a done delete row, under an archive pointer, struck, said elsewhere) is not', 'docs/gone-demo.md', () => {
        const gone = ['a', 'b', 'c', 'd', 'e'].map(x => `src/old-${x}.js`);
        for (const f of gone) W(f, '// demo\n'); commit('add demo tools');
        for (const f of gone) fs.rmSync(path.join(repo, f)); commit('drop demo tools');
        W('docs/gone-demo.md', ['Read when: never.', '', 'This note was moved here from `src/old-a.js`.', '',
          '| Step | Done |', '|---|---|', '| Delete `src/old-b.js` | ✅ Done |', '',
          '- The old demo tools went to `_archive/tools/`:', '  - `src/old-c.js`, dormant since the first commit.', '',
          'The tool is ~~`src/old-d.js`~~ the scanner.', '', 'An agent once added `src/old-e.js` to the demo build.', '',
          'Both `src/old-e.js` copies were deleted.', ''].join('\n'));
      }, r => !r.findings.some(x => x.kind === 'dead-name') || `got ${JSON.stringify(r.findings.filter(x => x.kind === 'dead-name'))}`],
      ['status: his words, a design note, a negation and a phrase are not open work; a wrapped paragraph is one note', 'docs/status-quiet.md', () => {
        W('docs/status-quiet.md', ['Read when: never.', '', 'Owner: *"the bins stay in progress until spring"* and that is final.', '',
          'The label printer is a design, not built.', '', 'The scan fix is not built, deliberately.', '', 'No device check is pending.', '',
          'A micro-win in progress is the reward loop.', '', 'The bin move is pending a label (Matthew, 2026-10-13).', ''].join('\n'));
        W('docs/status-wrap.md', 'Read when: never.\n\nThe label tool is pending a fix, and the\nprinter is still pending review.\n');
      }, r => {
        const s = f => r.findings.filter(x => x.kind === 'status' && x.file === f).length;
        return (s('docs/status-quiet.md') === 0 && s('docs/status-wrap.md') === 1) || `got ${JSON.stringify(r.findings.filter(x => x.kind === 'status'))}`;
      }],
      ['board: a struck correction is history, not done; an item marked done but still open is not done', 'wip.md', () => {
        W('wip.md', R('wip.md') + '- **Demo shelf** [2026-10-13] → docs/decisions.md\n  It sits on ~~shelf 3~~ shelf 4.\n' +
          '- **Glass check ✅ READY FOR GLASS** [2026-10-13] → docs/decisions.md\n');
      }, r => {
        const done = r.findings.filter(x => x.kind === 'board' && /marked done/.test(x.text)), struck = r.findings.filter(x => x.kind === 'history' && x.file === 'wip.md');
        return (!done.length && struck.length === 1) || `got ${JSON.stringify(r.findings.filter(x => x.file === 'wip.md'))}`;
      }],
      ['history: a line with his words is a ruling, never history to delete', 'docs/his-demo.md', () => {
        W('docs/his-demo.md', 'Read when: never.\n\n- ~~Blue bins~~ green bins (Matthew, 2026-10-11: "paint the demo bins green").\n');
      }, r => {
        const mine = r.findings.filter(x => x.file === 'docs/his-demo.md');
        return (!mine.some(x => x.kind === 'history') && mine.some(x => x.kind === 'ruling')) || `got ${JSON.stringify(mine)}`;
      }],
      ['history: his verdicts, "the owner ruled" and his idea in quotes are his words, never history', 'docs/verdict-demo.md', () => {
        W('docs/verdict-demo.md', ['Read when: never.', '', '✅ **Owner verdicts on the carried items, 2026-09-16:** *"confirm the scan step on the demo shelf"*', '',
          '- ~~Shelf 3~~ shelf 4: the owner ruled the top shelf stays clear.', '',
          '✅ Done: his idea, *"a demo bin for every size"*, is on the floor.', ''].join('\n'));
      }, r => {
        const mine = r.findings.filter(x => x.file === 'docs/verdict-demo.md');
        return !mine.some(x => x.kind === 'history') || `got ${JSON.stringify(mine)}`;
      }],
      ['history: a check mark for emphasis, a named dated event and a "was … which now" are not; a done mark is', 'docs/hist-loud.md', () => {
        W('docs/hist-quiet.md', ['Read when: never.', '', '✅ That makes the demo fix cheap.', '',
          'The rim reads gray, the failure the 2026-08-09 playtest found.', '',
          'The carve was an invisible dimple (fixed by the ring cap, which the well now needs).', ''].join('\n'));
        W('docs/hist-loud.md', 'Read when: never.\n\n✅ Done 2026-10-01: the label tool.\n');
      }, r => (!r.findings.some(x => x.file === 'docs/hist-quiet.md') && r.findings.some(x => x.kind === 'history' && x.file === 'docs/hist-loud.md')) ||
        `got ${JSON.stringify(r.findings.filter(x => /hist-/.test(x.file)))}`],
      ['board: a done mark, and old Open items as one note; an old Needs item never', 'wip.md', () => {
        W('wip.md', R('wip.md').replace('## On the floor', '- N2 Paint the old bins? — default: no [2025-01-02]\n\n## On the floor') +
          '- **Stale demo item** [2025-01-02] → docs/decisions.md\n  Nobody touched it.\n');
        run('git', ['commit', '-q', '-am', 'old items'], repo, { env: old });
        W('wip.md', R('wip.md') + '- **Finished demo item ✅** [2026-10-13] → docs/decisions.md\n');
      }, r => {
        const b = r.findings.filter(x => x.kind === 'board');
        return (b.length === 2 && b.some(x => /Open items untouched/.test(x.text)) && b.some(x => /marked done/.test(x.text))) || `got ${JSON.stringify(b)}`;
      }],
      ['growth: counted since the last borg: commit', '.claude/rules/house.md', () => {
        g('commit', '-q', '--allow-empty', '-m', 'borg: assimilated the demo');
        W('.claude/rules/house.md', R('.claude/rules/house.md') + pad('A new house note about demo bins', 3000));
      }, r => r.findings.some(x => x.kind === 'growth' && x.text.includes('since borg: ')) || `got ${JSON.stringify(r.findings)}`],
      ['growth: with no borg: commit, counted from the Borg\'s arrival; an older 5 KB doc is not growth', 'docs/new-topic.md',
        () => W('docs/new-topic.md', 'Read when: never.\n\n' + pad('New shelf fact', 5000)),
        r => (r.findings.some(x => x.kind === 'growth' && x.file === 'docs/new-topic.md' && x.text.includes('the Borg arrived')) &&
          !r.findings.some(x => x.file === 'docs/old-topic.md')) || `got ${JSON.stringify(r.findings)}`],
      ['split: an oversized section is named', 'docs/big-section.md', () => W('docs/big-section.md', 'Read when: never.\n\n## Small\n' + pad('Demo aisle fact', 11000) + '\n## Big\n' + pad('Demo rack fact', 20000))],
    ];
    for (const [name, file, plant, want = 1, args = []] of targets) record(`borg ${name}`, () => {
      plant();
      const r = borg(repo, ...args);
      if (typeof want === 'function') return want(r);
      const k = name.split(':')[0], hit = (r.findings || []).filter(x => x.kind === k && x.file === file);
      return hit.length >= want || `wanted ${want} ${k} in ${file}, got ${JSON.stringify(r.findings)}`;
    });
    record('borg growth: with no borg: commit and no Borg in the history, a 5 KB doc is not growth', () => {
      const plain = path.join(tmp, 'plain');
      run('git', ['init', '-q', '--initial-branch=main', plain], tmp, { env });
      fs.mkdirSync(path.join(plain, 'docs')); fs.writeFileSync(path.join(plain, 'docs', 'topic.md'), 'Read when: never.\n\n' + pad('Plain fact', 5000));
      run('git', ['-c', 'user.name=p', '-c', 'user.email=p@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'empty'], plain, { env });
      const r = borg(tmp, '--root', plain);
      return (r.since === null && r.byKind?.growth === 0) || `since ${JSON.stringify(r.since)}, growth ${r.byKind?.growth}`;
    });
    record('borg ruling: with no decisions file, rulings in prose are one question, answered by any Decisions heading', () => {
      const plain = path.join(tmp, 'no-rows');
      run('git', ['init', '-q', '--initial-branch=main', plain], tmp, { env });
      fs.writeFileSync(path.join(plain, 'CLAUDE.md'), '# Plain\n\nMatthew said "paint the floor lines yellow" after the walk.\n');
      const asked = () => (borg(tmp, '--root', plain).findings || []).some(x => /rulings sit in prose/.test(x.text));
      const before = asked();
      fs.mkdirSync(path.join(plain, 'docs')); fs.writeFileSync(path.join(plain, 'docs', 'design.md'), 'Read when: never.\n\n## Locked Design Decisions\n- Bins stay blue.\n');
      const after = asked();
      return (before && !after) || `asked with no heading: ${before}; asked with "## Locked Design Decisions": ${after}`;
    });
    record('digest names the Borg when it has work', () => {
      targets[0][2]();
      const r = run('node', [path.join(repo, '.claude', 'house.mjs'), 'start'], repo, { env, input: JSON.stringify({ source: 'resume', cwd: repo }) });
      return /^Borg: \d+ notes? to assimilate \(say "assimilate"\)\.$/m.test(r.out) || `no Borg line in: ${r.out}`;
    });
    // Last, since a push that passes becomes every later case's base.
    push('a 40,000-byte doc in docs/ pushes fine', () => W('docs/big-topic.md', 'Read when: never; self test.\n' + pad('Filler line about demo shelves', 40000)), true);
    record('a leftover Budget: line never blocks; check calls it no longer used', () => {
      W('CLAUDE.md', R('CLAUDE.md').replace('- Named:', '- Budget: start 10 · doc 10 [confirmed 2026-10-13]\n- Named:'));
      const c = run('node', ['.claude/house.mjs', 'check'], repo, { env }), p = sh('git add -A && git commit -q -m x && git push -q');
      return (c.code === 0 && c.out.includes('no longer used') && p.ok) || `check exit ${c.code}: ${c.out} push: ${p.out + p.err}`;
    });
  } catch (e) { results.push(false); console.log(`FAIL  setup: ${e.message}`); }
  const pass = results.filter(Boolean).length, ok = pass === results.length;
  console.log(`prove: ${pass}/${results.length} PASS in ${((Date.now() - t0) / 1000).toFixed(1)} s.${ok ? '' : ` Kept ${tmp} for a look.`}`);
  if (ok) try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  process.exitCode = ok ? 0 : 1;
}
