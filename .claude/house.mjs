#!/usr/bin/env node
// .claude/house.mjs: the house kit. Modes: start | prompt | cooler (the pre-push check; gate is its old name) | check | prove (the self test: .claude/prove.mjs).
// Node 24, no dependencies, Windows and Linux. Text is read CRLF->LF. No size blocks anything: growth is the
// Borg's work (.claude/borg.mjs, its own job); the digest only says when it has some.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const KIT = 'house v3';
const DIGEST = 3000, NEXT = 1500, METER = 300000; // the digest's own output caps and the context meter; never rules
const PROSE = /\.(md|txt|markdown|rst)$/i;
const TEXT = /\.(md|txt|markdown|rst|js|mjs|cjs|json|html?|css|ya?ml|sh|csv|svg|xml|webmanifest)$|(^|\/)[^./]+$/i;
const DEC = /^docs\/decisions[^/]*\.md$/i, ROW = /^- 20\d\d/;
const TAG = /\[(matthew|confirmed|lesson)|\[check /, TAGEND = /\[(?:matthew|confirmed|lesson|check)\b[^\]]*\]\s*$/;
const BREAK = /^(?:[-*+] |\d+\. |#|\||---|```)/; // lines that never start or join a plain paragraph
const KEBAB = '[a-z0-9]+(?:-[a-z0-9]+)*';
const ALLOWED = new RegExp(`^(?:CLAUDE\\.md|README\\.md|wip\\.md|wip/${KEBAB}\\.md|docs/${KEBAB}\\.md|_archive/.+` +
  `|\\.claude/rules/${KEBAB}\\.md|\\.claude/skills/${KEBAB}/SKILL\\.md)$`);
const BOARD = ['Next', 'Needs Matthew', 'On the floor', 'Open'];
const MODES = { start, prompt, cooler: gate, gate, check, prove };

const lf = s => String(s ?? '').replace(/\r\n/g, '\n');
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const clip = (s, n) => (s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + '…'), esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyOf = s => norm(s.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')), show = f => `house: ${f.law}: ${f.file}: ${f.what} → ${f.fix}`;

// ---------- process helpers ----------
function run(cmd, args, cwd, o = {}) {
  const opt = { cwd, input: o.input, timeout: o.timeout, env: o.env, encoding: o.raw ? undefined : 'utf8',
    maxBuffer: 1 << 30, windowsHide: true, shell: !!o.shell };
  const r = args ? spawnSync(cmd, args, opt) : spawnSync(cmd, opt);
  return { ok: r.status === 0, code: r.status, out: r.stdout ?? '', err: r.stderr ?? '', timedOut: r.error?.code === 'ETIMEDOUT' };
}
function git(cwd, ...a) { const r = run('git', a, cwd); return r.ok ? r.out.replace(/\s+$/, '') : null; }

function readStdin() {
  try { if (process.stdin.isTTY) return ''; } catch { return ''; }
  const chunks = [], buf = Buffer.alloc(65536), until = Date.now() + 5000;
  for (let n = 1; n;) {
    try { n = fs.readSync(0, buf, 0, buf.length, null); } catch (e) { if (e.code === 'EAGAIN' && Date.now() < until) continue; break; }
    if (n) chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks).toString('utf8');
}
function json(s) { try { return JSON.parse(s.replace(/^\uFEFF/, '')) || {}; } catch { return {}; } }

function chicago(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { day: p.weekday, date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, hour: +p.hour };
}

// ---------- trees: a file list plus an LF reader ----------
function workTree(root) {
  const r = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root);
  const files = [...new Set(r.out.split('\0').filter(Boolean))].filter(f => fs.existsSync(path.join(root, f)));
  const cache = new Map(), load = f => { try { return lf(fs.readFileSync(path.join(root, f), 'utf8')); } catch { return null; } };
  return { files, read: f => (cache.has(f) ? cache.get(f) : cache.set(f, load(f)).get(f)) };
}
function commitTree(root, sha) {
  const ls = run('git', ['ls-tree', '-r', '-z', '--name-only', sha], root);
  const files = ls.ok ? ls.out.split('\0').filter(Boolean) : [];
  const want = files.filter(f => TEXT.test(f) && !f.includes('\n')), map = new Map();
  if (want.length) {
    const r = run('git', ['cat-file', '--batch'], root, { raw: true, input: want.map(f => `${sha}:${f}`).join('\n') + '\n' });
    const buf = r.out; let i = 0;
    for (const f of want) {
      const nl = buf.indexOf(10, i);
      if (nl < 0) break;
      const head = buf.toString('utf8', i, nl); i = nl + 1;
      if (/ missing$/.test(head)) continue;
      const [, type, size] = head.split(' ').slice(-3);
      if (type === 'blob') map.set(f, lf(buf.toString('utf8', i, i + +size)));
      i += +size + 1;
    }
  }
  return { files, read: f => map.get(f) ?? null };
}

// ---------- parsing ----------
// Logical units: a bullet plus its deeper-indented continuation lines is one unit. So is a plain paragraph,
// up to a blank line, a BREAK line, or a line ending in a tag. Headings, tables and numbered lines stand alone.
function units(text) {
  const L = lf(text).split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const ind = L[i].search(/\S/);
    if (ind < 0) continue;
    const u = { line: i + 1, indent: ind, text: L[i].trim() };
    if (/^[-*+] /.test(u.text)) {
      while (i + 1 < L.length && L[i + 1].search(/\S/) >= ind + 2 && !/^\s*[-*+] /.test(L[i + 1])) u.text += ' ' + L[++i].trim();
    } else if (!BREAK.test(u.text)) {
      while (i + 1 < L.length && !TAGEND.test(u.text) && L[i + 1].trim() && !BREAK.test(L[i + 1].trim())) u.text += ' ' + L[++i].trim();
    }
    out.push(u);
  }
  return out;
}
const items = lines => units((lines || []).join('\n')).filter(u => u.indent === 0 && /^- /.test(u.text));
function sections(text) {
  const m = new Map(); let cur = null;
  for (const l of lf(text).split('\n')) {
    const h = /^## (.+?)\s*$/.exec(l);
    if (h) m.set(cur = h[1], []); else if (/^# /.test(l)) cur = null; else if (cur) m.get(cur).push(l);
  }
  return m;
}
function globRe(g) {
  let r = ''; const seen = new Set();
  for (let i = 0; i < g.length; i++) {
    const ch = g[i], j = ch === '{' ? g.indexOf('}', i) : ch === '<' ? g.indexOf('>', i) : -1;
    if (ch === '*' && g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; r += '(?:.*/)?'; } else r += '.*'; }
    else if (ch === '*') r += '[^/]*';
    else if (ch === '?') r += '[^/]';
    else if (ch === '{' && j > i) { r += '(?:' + g.slice(i + 1, j).split(',').map(esc).join('|') + ')'; i = j; }
    else if (ch === '<' && j > i) {
      const n = 'p' + g.slice(i + 1, j).replace(/\W/g, '_');
      r += seen.has(n) ? `\\k<${n}>` : `(?<${n}>[^/]+)`; seen.add(n); i = j;
    } else r += esc(ch);
  }
  return new RegExp('^' + r + '$');
}
// Strict area-note frontmatter (contract §4). Returns the globs, or null when it is not strict.
function scope(text) {
  const m = /^---\npaths:\n((?: {2}- "[^"\n]+"\n)+)---(?:\n|$)/.exec(text ?? '');
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : null;
}
// Script lines. A "- Budget:" line (house v1) is no longer used: it is ignored, and check reports it once.
function card(text) {
  const c = { checks: null, push: null, named: null, oldBudget: false, globs: [], count: {} };
  for (const u of units(text ?? '')) {
    const m = /^- (Checks|Push|Budget|Named): (.*)$/.exec(u.text);
    if (!m) continue;
    if (m[1] === 'Budget') { c.oldBudget = true; continue; }
    const v = m[2].replace(/(?:\s*\[(?:matthew|confirmed|check|lesson|claude)\b[^\]]*\])+\s*$/, '').trim();
    c.count[m[1]] = (c.count[m[1]] || 0) + 1;
    c[m[1].toLowerCase()] ??= v;
  }
  if (c.named && !/^none$/i.test(c.named)) {
    c.globs = c.named.split(/[,;]/).map(x => x.trim().split(/\s+/)[0].replace(/[`'"]/g, '')).filter(Boolean).map(globRe);
  }
  return c;
}

// ---------- laws ----------
function laws(t, root, reported = false) {
  const out = [], cardText = t.read('CLAUDE.md'), c = card(cardText);
  const named = f => c.globs.some(r => r.test(f));
  const add = (law, file, what, fix, block, key) => out.push({ law, file, what, fix, block, key: key ?? `${law}|${file}` });
  const rules = t.files.filter(f => /^\.claude\/rules\/.+\.md$/i.test(f));
  // A second script line would let a decoy above the real one win (card() keeps the first), so it blocks.
  for (const [k, n] of Object.entries(c.count)) if (n > 1) add('B6 one script line each', 'CLAUDE.md', `${n} "- ${k}:" lines`, 'keep one', true, `B6|${k}`);
  for (const f of t.files.filter(f => PROSE.test(f))) {
    if (!ALLOWED.test(f) && !named(f)) add('B3 closed file set', f, 'prose file outside the closed set',
      'move reference to docs/<topic>.md, a brief to wip/<slug>.md, old text to _archive/, or delete it', true);
  }
  for (const f of rules) if (f !== '.claude/rules/house.md' && !scope(t.read(f))) {
    add('B4 area note frontmatter', f, 'no strict paths: frontmatter, so it loads at every start',
      'begin with ---, paths:, one `  - "glob"` line per glob, ---', true);
  }
  if (reported) reportedLaws(t, root, c, rules, add);
  return out;
}

// B5: a protected unit at base must still exist, whitespace-normalized, in some tracked file at local.
function lost(base, local) {
  const keep = new Map();
  for (const f of base.files.filter(f => PROSE.test(f))) {
    const dec = DEC.test(f);
    for (const u of units(base.read(f) ?? '')) if (TAG.test(u.text) || (dec && ROW.test(u.text))) {
      const k = keyOf(u.text); if (k && !keep.has(k)) keep.set(k, f);
    }
  }
  if (!keep.size) return [];
  const have = new Set();
  for (const f of local.files) if (TEXT.test(f)) for (const u of units(local.read(f) ?? '')) have.add(keyOf(u.text));
  return [...keep].filter(([k]) => !have.has(k)).map(([k, f]) => ({ law: 'B5 protected line', file: f,
    what: `"${clip(k, 90)}" is gone`, fix: 'restore it, or move it whole (tag included) to its new home or _archive/',
    block: true, key: 'B5|' + k }));
}

// Reported, never blocking. History markers, dead names and long decision rows went to the Borg (borg.mjs);
// what is left here is the shape of the card and the board, and code no area note covers.
function reportedLaws(t, root, c, rules, add) {
  // R3 card shape and board shape: headings and line formats only
  const ct = t.read('CLAUDE.md'), bad = [];
  if (ct == null) bad.push(['CLAUDE.md', 'no card', 'write the card: title, a few lines, ## Rules, ## Where things live']);
  else {
    const s = sections(ct), where = (s.get('Where things live') || []).join('\n');
    if (!/^# \S/.test(ct)) bad.push(['CLAUDE.md', 'line 1 is not a # title', 'start with "# <repo name>"']);
    for (const h of ['Rules', 'Where things live']) if (!s.has(h)) bad.push(['CLAUDE.md', `no ## ${h}`, 'add the heading']);
    for (const k of ['Checks', 'Push', 'Named']) if (c[k.toLowerCase()] == null) bad.push(['CLAUDE.md', `no "- ${k}:" line`, 'add it under ## Rules']);
    if (c.oldBudget) bad.push(['CLAUDE.md', 'the "- Budget:" line is no longer used (no size blocks anything)', 'remove it; it is a protected line, so move it whole to _archive/']);
    const loose = items(s.get('Rules')).filter(u => !/^- (?:Named|Budget|Borg skip): /.test(u.text) &&
      !/\[(?:matthew|confirmed) \d{4}-\d{2}-\d{2}\]|\[check tests\/[^\]]+\]/.test(u.text));
    if (loose.length) bad.push(['CLAUDE.md', `${plural(loose.length, 'rule')} without a tag, first "${clip(loose[0].text, 50)}"`, 'tag it [matthew date], [confirmed date] or [check tests/<file>]']);
    for (const f of t.files) if (/^docs\/[^/]+\.md$/.test(f) && !where.includes(f)) bad.push(['CLAUDE.md', `${f} is not in Where things live`, 'add one row for it']);
    if (t.files.some(f => f.startsWith('wip/')) && !where.includes('wip/')) bad.push(['CLAUDE.md', 'wip/ is not in Where things live', 'add one row for the family']);
    if (/\.claude\/rules\/(?!house\.md)/.test(where)) bad.push(['CLAUDE.md', 'lists an area note', 'drop the row; area notes load by themselves']);
  }
  const bt = t.read('wip.md');
  if (bt != null) {
    const s = sections(bt);
    for (const h of BOARD) if (!s.has(h)) bad.push(['wip.md', `no "## ${h}" heading`, 'add it; headings are exact']);
    const odd = items(s.get('Needs Matthew')).find(u => !/^- N\d+ .*default:/i.test(u.text));
    if (odd) bad.push(['wip.md', `Needs item without an N<number> or a default: "${clip(odd.text, 50)}"`, 'shape: - N1 <question> — default: <what happens> [date]']);
    const oddOpen = items(s.get('Open')).find(u => !/^- \*\*.+?\*\* \[\d{4}-\d{2}-\d{2}\] → \S/.test(u.text));
    if (oddOpen) bad.push(['wip.md', `Open item off shape: "${clip(oddOpen.text, 50)}"`, 'shape: - **title** [date] → home']);
    // Done marks on the board are the Borg's (board notes); these two are computed facts written by hand.
    const marks = [[/^\W*(?:last )?updated\b.{0,12}\d/i, 'an "Updated <date>" line'], [/\bapp (?:version )?v?\d+\b|\b[a-z]+-v\d+\b/i, 'an app-version line']];
    for (const [re, what] of marks) {
      const i = lf(bt).split('\n').findIndex(l => re.test(l));
      if (i >= 0) bad.push(['wip.md', `${what} at line ${i + 1}`, 'delete it; the digest computes the date and the version']);
    }
  }
  for (const [f, what, fix] of bad) add(f === 'wip.md' ? 'R3 board shape' : 'R3 card shape', f, what, fix, false, `R3|${f}|${what}`);
  // R4 app/js files no area note covers
  const globs = rules.filter(f => f !== '.claude/rules/house.md').flatMap(f => scope(t.read(f)) || []).map(globRe);
  const un = t.files.filter(f => /^app\/js\/.+\.js$/.test(f) && !globs.some(r => r.test(f)));
  if (un.length) add('R4 uncovered code', 'app/js', `${plural(un.length, 'file')} no area note covers: ${clip(un.join(', '), 160)}`, 'add the path to the nearest .claude/rules/<area>.md', false, 'R4');
}

function findings(root) {
  const W = workTree(root), head = git(root, 'rev-parse', '--verify', '-q', 'HEAD');
  const all = [...laws(W, root, true), ...(head ? lost(commitTree(root, head), W) : [])];
  return { W, all: all.sort((a, b) => (b.block - a.block) || a.law.localeCompare(b.law)) };
}

// ---------- start: SessionStart digest ----------
async function start() {
  try {
    const inp = json(readStdin()), cwd = typeof inp.cwd === 'string' && inp.cwd ? inp.cwd : process.cwd();
    const root = git(cwd, 'rev-parse', '--show-toplevel') || git(process.cwd(), 'rev-parse', '--show-toplevel');
    if (!root) { process.stdout.write(`house: ${cwd} is not in a git repo; no digest.\n`); return; }
    const notes = [];
    const dirs = (git(root, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir') || '').split('\n');
    const linked = dirs.length === 2 && path.resolve(dirs[0]) !== path.resolve(dirs[1]);
    const source = inp.source ?? (Object.keys(inp).length ? '' : 'startup');
    if (source === 'startup') try { pull(root, dirs, linked, notes); } catch (e) { notes.push(`pull: ${e.message}`); }
    // After the pull, so the session whose pull first brings .githooks/ turns the Cooler on.
    try { hooksPath(root, dirs, linked, notes); } catch (e) { notes.push(`hooksPath: ${e.message}`); }
    process.stdout.write(digest(root, notes, await borgWork(root)) + '\n');
  } catch (e) {
    process.stdout.write(`house: digest failed: ${e.message}\n`);
  }
  process.exitCode = 0;
}
// The Borg's note count for the digest. Fail soft: a missing or broken borg.mjs never breaks start.
async function borgWork(root) {
  try {
    const r = (await import(new URL('./borg.mjs', import.meta.url))).detect(root);
    return r.errors?.length ? `${plural(r.count, 'note')} to assimilate; a detector failed (${clip(r.errors[0], 100)})` : r.count;
  } catch (e) { return e?.code === 'ERR_MODULE_NOT_FOUND' ? 0 : `detect failed (${clip(norm(e?.message ?? e), 100)})`; }
}
function hooksPath(root, dirs, linked, notes) {
  if (!fs.existsSync(path.join(root, '.githooks'))) return;
  if (git(root, 'config', '--get', 'core.hooksPath') === '.githooks') return;
  // A linked worktree shares its config with the main checkout; set it only once the main checkout has .githooks/ too.
  const main = linked && path.basename(dirs[1]) === '.git' ? path.dirname(dirs[1]) : root;
  if (linked && !fs.existsSync(path.join(main, '.githooks'))) {
    notes.push('The Cooler (pre-push check) is off here: core.hooksPath is shared with the main checkout, which has no .githooks/ yet.');
  } else if (git(root, 'config', 'core.hooksPath', '.githooks') !== null) notes.push('Set core.hooksPath to .githooks (the Cooler is on).');
}
function sync(root) {
  const up = git(root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  const [ahead, behind] = up ? (git(root, 'rev-list', '--left-right', '--count', 'HEAD...@{u}') || '0 0').split(/\s+/).map(Number) : [0, 0];
  const dirty = (git(root, 'status', '--porcelain') || '').split('\n').filter(Boolean).length;
  return { up, ahead, behind, dirty };
}
function pull(root, dirs, linked, notes) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  const f = run('git', ['fetch', '--quiet'], root, { timeout: 8000, env });
  if (!f.ok) { notes.push(f.timedOut ? 'git fetch timed out (8 s); ahead/behind may be stale.' : `git fetch failed: ${clip(norm(f.err), 120)}`); return; }
  const s = sync(root);
  if (!s.up || !s.behind || s.ahead) return;
  const why = s.dirty ? 'uncommitted changes' : linked ? 'linked worktree' : fs.existsSync(path.join(dirs[0] || '', 'index.lock')) ? 'index.lock present' : '';
  if (why) { notes.push(`${plural(s.behind, 'commit')} behind ${s.up}; not pulled (${why}).`); return; }
  const m = run('git', ['merge', '--ff-only', '--quiet', '@{u}'], root, { env });
  notes.push(m.ok ? `Pulled ${plural(s.behind, 'commit')} from ${s.up} (fast-forward).` : `Fast-forward from ${s.up} failed: ${clip(norm(m.err), 120)}`);
}
function digest(root, notes, borg = 0) {
  const parts = [], P = (text, cap, shrink = 0) => parts.push({ text: clip(text, cap), shrink });
  const safe = (name, fn) => { try { fn(); } catch (e) { P(`${name}: unreadable (${clip(e.message, 80)}).`, 120); } };
  let W = null, s = new Map();
  safe('Header', () => {
    const c = chicago(), st = sync(root), branch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD') || '?';
    const ab = st.up ? `${st.ahead} ahead, ${st.behind} behind ${st.up}` : 'no upstream';
    P(`${path.basename(root)} · ${c.day} ${c.date} ${c.hm} Chicago · branch ${branch}, ${ab} · ${plural(st.dirty, 'uncommitted file')} · ${KIT}.` +
      (notes.length ? '\n' + notes.join('\n') : ''), 600);
  });
  safe('Findings', () => {
    const r = findings(root), nb = r.all.filter(f => f.block).length; W = r.W;
    P(r.all.length ? `Findings: ${r.all.length} (${nb} blocking). Worst: ${show(r.all[0])}` : 'Findings: none.', Infinity);
  });
  if (typeof borg === 'string') P(`Borg: ${borg}.`, 160);
  else if (borg > 0) P(`Borg: ${plural(borg, 'note')} to assimilate (say "assimilate").`, 120);
  W ??= workTree(root);
  const bt = W.read('wip.md');
  if (bt == null) P('Board: no wip.md.', 40); else s = sections(bt);
  if (bt != null && !BOARD.every(h => s.has(h))) P(`Board headings missing: ${BOARD.filter(h => !s.has(h)).join(', ')}.`, 120);
  safe('Needs', () => {
    const n = items(s.get('Needs Matthew'));
    P(n.length ? 'Needs Matthew:\n' + n.map(u => clip(u.text, 200)).join('\n') : 'Needs Matthew: none.', 1030, 2);
  });
  safe('On the floor', () => {
    const f = items(s.get('On the floor')), d = u => (/\[(\d{4}-\d{2}-\d{2})\]/.exec(u.text) || [])[1] || '9999';
    const old = [...f].sort((a, b) => d(a).localeCompare(d(b)))[0];
    P(f.length ? `On the floor: ${f.length}. Oldest: ${old.text.replace(/^- /, '')}` : 'On the floor: none.', 300, 3);
  });
  safe('Next', () => {
    const n = (s.get('Next') || []).join('\n').trim();
    P(n ? 'Next:\n' + clip(n, NEXT) : 'Next: empty.', NEXT + 6, 4);
  });
  safe('Commits', () => {
    const log = git(root, 'log', '-5', '--format=%s');
    P(log ? 'Last commits:\n' + log.split('\n').map(x => '- ' + x).join('\n') : 'Last commits: none.', 500, 5);
  });
  safe('Version', () => {
    const v = /const VERSION\s*=\s*['"`]([^'"`]+)/.exec(W.read('app/sw.js') || '');
    if (v) P(`App version: ${v[1]}.`, 80);
  });
  safe('Open', () => {
    const o = items(s.get('Open')).map(u => (/\*\*(.+?)\*\*/.exec(u.text) || [, clip(u.text.slice(2), 60)])[1]);
    let line = '', i = 0;
    for (; i < o.length && (line + o[i]).length < 420; i++) line += (i ? '; ' : '') + o[i];
    P(o.length ? `Open (${o.length}): ${line}${i < o.length ? ` +${o.length - i} more` : ''}.` : 'Open: none.', 500, 6);
  });
  safe('Area notes', () => {
    const a = W.files.filter(f => /^\.claude\/rules\/.+\.md$/.test(f) && f !== '.claude/rules/house.md').map(f => path.basename(f, '.md'));
    P(`Area notes: ${a.length ? a.join(', ') : 'none'}.`, 300, 1);
  });
  let over = parts.reduce((n, p) => n + p.text.length + 1, 0) - DIGEST; // +1 per part for its newline
  for (const p of [...parts].filter(p => p.shrink).sort((a, b) => b.shrink - a.shrink)) {
    if (over <= 0) break;
    const keep = Math.max(40, p.text.length - over);
    if (keep < p.text.length) { over -= p.text.length - keep; p.text = clip(p.text, keep); }
  }
  return parts.map(p => p.text).join('\n');
}

// ---------- prompt: UserPromptSubmit line ----------
function prompt() {
  try {
    const inp = json(readStdin()), c = chicago();
    let s = `Chicago ${c.day} ${c.hm}.`;
    if (!/^\s*(more|why|explain|recap)\b/i.test(String(inp.prompt ?? ''))) {
      s += " Reply temper for Matthew: answer first, sized to what he asked; leave out what he doesn't need to act on." +
        ' On a long job: a one-line plan before starting and a one-line note at each break; read any message he sends mid-run.';
    }
    if (c.hour >= 23 || c.hour < 5) s += ' Night mode applies (house.md).';
    const used = meter(inp.transcript_path);
    if (used > METER) s += ` Context is about ${Math.round(used / 1000)}K tokens: finish the current step, run wrap, and tell Matthew to start a fresh session.`;
    process.stdout.write(s + '\n');
  } catch {}
  process.exitCode = 0;
}
function meter(p) {
  if (!p || typeof p !== 'string') return 0;
  let fd;
  try {
    fd = fs.openSync(p, 'r');
    const size = fs.fstatSync(fd).size;
    for (let n = 256 * 1024; ; n *= 4) {
      const len = Math.min(n, size), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      const lines = buf.toString('utf8').split('\n');
      if (len < size) lines.shift();
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].includes('"usage"')) continue;
        let o; try { o = JSON.parse(lines[i]); } catch { continue; }
        const u = o?.type === 'assistant' && !o.isSidechain && o.message?.usage;
        const sum = u ? (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) : 0;
        if (sum) return sum;
      }
      if (len >= size || n >= 16 * 1024 * 1024) return 0;
    }
  } catch { return 0; } finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
}

// ---------- the Cooler: git pre-push (Matthew's name for the doorman) ----------
function gate() {
  const root = git(process.cwd(), 'rev-parse', '--show-toplevel') || process.cwd(), remote = process.argv[3] || 'origin';
  const say = s => process.stderr.write(s + '\n'), trees = new Map(), tree = sha => trees.get(sha) ?? trees.set(sha, commitTree(root, sha)).get(sha);
  const refs = readStdin().split('\n').map(l => l.trim().split(/\s+/)).filter(a => a.length >= 4 && !/^0+$/.test(a[1]));
  if (!refs.length) return;
  // No Checks line in the pushed card (deleted, or the card moved away)? Run the base card's, so Checks can't be switched off.
  const own = card(tree(refs[0][1]).read('CLAUDE.md')).checks;
  const checks = own ?? card(tree(baseOf(root, refs[0][1], refs[0][3], remote)).read('CLAUDE.md')).checks;
  let block = !checks;
  if (!own && checks) say('the Cooler: checks: CLAUDE.md: the pushed card has no "- Checks:" line, so the base card\'s ran');
  if (checks) {
    const t0 = Date.now(), r = run(checks, null, root, { shell: true, timeout: 15 * 60 * 1000 });
    if (r.ok) say(`the Cooler: checks passed in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${checks}`);
    else {
      block = true;
      say(lf(r.out + r.err).trimEnd().split('\n').slice(-30).join('\n'));
      say(`the Cooler: checks: CLAUDE.md: Checks ${r.timedOut ? 'timed out' : `failed (exit ${r.code})`}: ${checks} → fix what failed; never narrow Checks:`);
    }
  } else say('the Cooler: checks: CLAUDE.md: no "- Checks:" line here or at the base, so nothing ran → add one to the card');
  const seen = new Set();
  for (const [, sha, , rsha] of refs) {
    const base = baseOf(root, sha, rsha, remote), L = tree(sha), B = tree(base);
    const had = new Set(laws(B, root).map(f => f.key));
    for (const f of [...laws(L, root).filter(f => !had.has(f.key)), ...lost(B, L)]) {
      if (seen.has(f.key)) continue;
      seen.add(f.key); say(show(f)); block = true;
    }
  }
  if (block) say('the Cooler: push refused. Fix the lines above, commit, push again.');
  process.exitCode = block ? 1 : 0;
}
function baseOf(root, sha, rsha, remote) {
  if (!/^0+$/.test(rsha) && run('git', ['cat-file', '-e', `${rsha}^{commit}`], root).ok) return rsha;
  for (const r of [`refs/remotes/${remote}/HEAD`, 'refs/remotes/origin/HEAD']) {
    const b = git(root, 'merge-base', sha, r); if (b) return b;
  }
  return run('git', ['hash-object', '-t', 'tree', '--stdin'], root, { input: '' }).out.trim();
}

// ---------- check: every law on the working tree ----------
function check() {
  const root = git(process.cwd(), 'rev-parse', '--show-toplevel');
  if (!root) { console.log('house: not in a git repo.'); process.exitCode = 1; return; }
  const { all } = findings(root), nb = all.filter(f => f.block).length;
  for (const f of all) console.log(show(f));
  console.log(all.length ? `house check: ${plural(all.length, 'finding')}, ${nb} blocking.` : 'house check: clean.');
  process.exitCode = nb ? 1 : 0;
}

// ---------- prove: the seen-to-fail self test lives in its own file ----------
async function prove() { (await import(new URL('./prove.mjs', import.meta.url))).prove(); }

// ---------- main ----------
const mode = process.argv[2];
if (!MODES[mode]) { console.error('usage: node .claude/house.mjs start|prompt|cooler|check|prove'); process.exitCode = 2; }
else {
  try { await MODES[mode](); } catch (e) {
    if (mode === 'start' || mode === 'prompt') { process.stdout.write(`house: ${mode} error: ${e.message}\n`); process.exitCode = 0; }
    else { console.error(`house: ${mode} crashed: ${e.stack}`); process.exitCode = 1; }
  }
}
