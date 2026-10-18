#!/usr/bin/env node
// .claude/borg.mjs: the Borg. Finds growth in the live docs and names the home each note belongs in, so a
// separate job can assimilate it. Read-only: it never edits, stages or commits, here or in another repo.
//   node .claude/borg.mjs detect [--deep] [--json] [--root <repo path>] [--skip "<folder/> <file>"]
// --deep also asks git history which code names left the code (slower; the start digest never runs it).
// --skip adds to the card's "Borg skip:" line, for a repo whose card has none yet.
// Node 24, no dependencies, Windows and Linux. A finding is work to move, never a size rule.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Internal tuning: when a note is worth the Borg's time. Never printed as a rule.
const GROW = 2000, STALE_DAYS = 30, SPLIT_TOPICS = 5, SPLIT_SPARE = 10000, BIG_SECTION = 16000, NEAR = 0.6, WORDS = 8;
const FAR = 20, CODE_MAX = 2 << 20, IDS_PER_PASS = 150;
const SHOW = 15; // text output only: notes listed per kind per file before "… N more"
export const KINDS = ['history', 'duplicate', 'status', 'ruling', 'dead-name', 'board', 'growth', 'split'];
const HOME = {
  history: 'git (the commit says it), or _archive/ word for word with a pointer',
  duplicate: 'one home, a pointer elsewhere',
  status: 'the board, wip.md',
  ruling: 'a row in docs/decisions.md, his words',
  'dead-name': 'fix it from the code, or ask him once',
  board: 'delete it (git keeps it), or ask him once',
  growth: 'each new note to its home (the table in house.md)',
  split: 'its own docs/<topic>.md, listed in the card',
};
const CODE = /\.(?:m?js|cjs|jsx?|tsx?|py|cs|swift|kt|java|go|rs|c|cc|cpp|h|hpp|m|mm|rb|php|sh|ps1|gd|lua|html?|css|shader|hlsl)$/i;
// Text the code names live in besides code: Unity scenes and assets, settings files.
const CODE_TEXT = /\.(?:asset|unity|prefab|json|ya?ml|xml|plist|gradle|csproj|asmdef|uxml|uss|inputactions|toml|ini|cfg)$/i;
const CODE_SPECS = ['*.cs', '*.js', '*.mjs', '*.cjs', '*.ts', '*.tsx', '*.jsx', '*.py', '*.swift', '*.kt', '*.java', '*.go', '*.rs',
  '*.c', '*.cc', '*.cpp', '*.h', '*.hpp', '*.m', '*.mm', '*.rb', '*.php', '*.sh', '*.ps1', '*.gd', '*.lua', '*.html', '*.css', '*.shader', '*.hlsl'];
const EXT = /\.(?:md|txt|m?js|cjs|jsx?|tsx?|json|html?|css|ya?ml|sh|ps1|py|cs|swift|gd|csv|svg|png|jpe?g|blend|docx|xlsx|webmanifest)$/i;
// Names that look like files but no code holds: keys, certificates, build outputs, media.
const NOTCODE = /\.(?:key|pem|p12|p8|cer|crt|mobileprovision|keystore|jks|plist|asset|unity|prefab|meta|zip|log|bak|env|lock|tmp|dll|so|exe|apk|aab|ipa|pdf|mp3|wav|ogg|mp4|ttf|otf|woff2?)$/i;
const SKIP = /(?:^|\/)(?:_?archive[^/]*|node_modules|vendor|third_?party|packages|library|sandbox|scratch|te?mp|logs?|worktrees|app|\.git|\.github)(?:\/|$)/i;
const NOTDOC = /^(?:CHANGELOG|LICENSE|NOTICE|COPYING|CODE_OF_CONDUCT|SECURITY)\b/i;
const TAG = /\[(?:matthew|confirmed|lesson|claude)\b[^\]]*\]|\[check [^\]]*\]/i, ROW = /^- 20\d\d/;
const STOP = new Set(('that this with from what when where which there their they them then than have been were will ' +
  'would could should into only also each every about after before over under more most some such just your ' +
  'yours here does done make made said says call ruling owner matthew his him he the and for not but').split(' '));

// ---------- plumbing ----------
function run(cmd, args, cwd, o = {}) {
  const r = spawnSync(cmd, args, { cwd, input: o.input, encoding: o.raw ? undefined : 'utf8', maxBuffer: 1 << 30, windowsHide: true });
  return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' };
}
const git = (cwd, ...a) => { const r = run('git', a, cwd); return r.ok ? r.out.replace(/\s+$/, '') : null; };
const lf = s => String(s ?? '').replace(/\r\n/g, '\n');
const bytes = s => Buffer.byteLength(lf(s), 'utf8');
const clip = (s, n) => (s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + '…');
const n0 = n => n.toLocaleString('en-US');
const kb = n => `${Math.max(1, Math.round(n / 1000))} KB`;
const words = s => lf(s).toLowerCase().replace(/[`*_~>#|]/g, ' ').replace(/[^\p{L}\p{N}' ]+/gu, ' ').split(/\s+/).filter(Boolean);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const globRe = g => new RegExp('^' + g.split(/(\*\*\/?|\*)/).map(p => (p === '**/' ? '(?:.*/)?' : p === '**' ? '.*' : p === '*' ? '[^/]*' : escRe(p))).join('') + '$');

// Live = every tracked or new .md, plus CLAUDE/AGENTS .txt, outside archives, scratch, vendored code and the
// card's "Borg skip:" list (data folders, files that are his own).
export function isLive(f, skip = []) {
  if (SKIP.test(f) || NOTDOC.test(path.posix.basename(f)) || skip.some(r => r.test(f))) return false;
  return /\.md$/i.test(f) || /(?:^|\/)(?:CLAUDE|AGENTS)\.txt$/i.test(f);
}
// "Borg skip: players/ leagues/ Witkewiz.md" anywhere in the card (or --skip on the command line): folders end
// in /, globs may use *.
function skipList(read, extra = '') {
  const lists = [extra];
  for (const f of ['CLAUDE.md', 'AGENTS.md']) for (const m of lf(read(f)).matchAll(/^\s*(?:[-*]\s+)?Borg skip:\s*(.+)$/gim)) lists.push(m[1]);
  return lists.flatMap(s => s.replace(/\s*\[[^\]]*\]\s*$/, '').split(/[\s,;]+/)).map(g => g.replace(/[`'"]/g, '').replace(/^\.\//, ''))
    .filter(p => p && !/^none$/i.test(p)).map(p => globRe(p.endsWith('/') ? p + '**' : p));
}
function role(f) {
  if (f === 'wip.md') return 'board';
  if (/^(?:CLAUDE|AGENTS)\.md$/i.test(f)) return 'card';
  if (/(?:^|\/)(?:CLAUDE|AGENTS)\.txt$/i.test(f)) return 'catchall';
  if (/(?:^|\/)decisions[^/]*\.md$/i.test(f)) return 'decisions';
  if (f === '.claude/rules/house.md') return 'house';
  if (f.startsWith('.claude/rules/') || /\/(?:CLAUDE|AGENTS)\.md$/i.test(f)) return 'area';
  if (/^\.(?:claude|cursor)\/skills\//.test(f)) return 'skill';
  if (f.startsWith('wip/')) return 'brief';
  if (/^README\.md$/i.test(f)) return 'readme';
  return 'ref';
}
// Which copy of a duplicate is the home: the most specific file wins; a catch-all file never does.
const RANK = ['decisions', 'area', 'ref', 'house', 'card', 'skill', 'brief', 'board', 'readme', 'catchall'];

function tree(root) {
  const r = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root);
  const files = [...new Set(r.out.split('\0').filter(Boolean))].filter(f => fs.existsSync(path.join(root, f)));
  const cache = new Map();
  const read = f => {
    if (!cache.has(f)) { let s = null; try { s = lf(fs.readFileSync(path.join(root, f), 'utf8')); } catch {} cache.set(f, s); }
    return cache.get(f);
  };
  return { files, read };
}
function readAt(root, sha, files) {
  const map = new Map();
  if (!files.length) return map;
  const r = run('git', ['cat-file', '--batch'], root, { raw: true, input: files.map(f => `${sha}:${f}`).join('\n') + '\n' });
  const buf = r.out; let i = 0;
  for (const f of files) {
    const nl = buf.indexOf(10, i);
    if (nl < 0) break;
    const head = buf.toString('utf8', i, nl); i = nl + 1;
    if (/ missing$/.test(head)) continue;
    const size = +head.split(' ')[2];
    map.set(f, lf(buf.toString('utf8', i, i + size)));
    i += size + 1;
  }
  return map;
}

// A log section: its heading says status, history, changelog, builds or log. It is noted once, at the heading.
// The heading's numbering and emoji ("## 12. Session log") don't count.
const LOGRE = /^(?!.*\bdecision)(?:(?:Status(?!\s*(?:&|and)\s)|Change ?log|History|Updates?|Updated)\b|(?:[\w'’ -]{0,40}\s)?(?:Change ?log|History|Log|Builds|Build log)\**\s*(?:\([^)]*\))?\s*$)/i;
const LOGHEAD = { test: t => /^#{1,6}\s/.test(t) && LOGRE.test(t.replace(/^#{1,6}\s+/, '').replace(/^[^A-Za-z]+/, '')) };
// Lines of a doc, with what never counts as prose (frontmatter, fenced code), each heading's level and size,
// and for a line inside a log section, that section's heading line (log).
function lines(text) {
  const L = lf(text).split('\n'), out = [], stack = [], open = [];
  let fence = false, front = L[0] === '---';
  L.forEach((raw, i) => {
    const t = raw.trim();
    let skip = fence || front;
    if (front && i > 0 && t === '---') front = false;
    if (/^(```|~~~)/.test(t)) { fence = !fence; skip = true; }
    const h = !skip && /^(#{1,6})\s+\S/.exec(t), lv = h ? h[1].length : 0;
    if (h) {
      while (stack.length && stack.at(-1).lv >= lv) stack.pop();
      while (open.length && open.at(-1).head >= lv) open.pop().end = i;
    }
    const l = { n: i + 1, raw, t, skip, head: lv, log: stack.find(s => s.log)?.n ?? 0, start: i, end: L.length };
    if (h) { stack.push({ lv, n: i + 1, log: LOGHEAD.test(t) }); open.push(l); }
    out.push(l);
  });
  const cum = [0];
  for (const l of out) cum.push(cum.at(-1) + bytes(l.raw) + 1);
  for (const l of out) if (l.head) l.size = cum[l.end] - cum[l.start];
  return out;
}
// Paragraphs and bullets (a bullet keeps its continuation lines). Headings, tables and rules stand apart;
// lines inside a log section are left to the note at its heading.
const blocks = (L, logToo = false) => units(L).filter(u => !u.table && (logToo || !u.lines[0].log))
  .map(u => ({ n: u.lines[0].n, text: u.lines.map(l => l.t).join(' ').replace(/^(?:[-*+]|\d+\.)\s+/, '') }));
// Prose without tags (a date right after a tag belongs to it), code spans, link targets and URLs.
const bare = t => t.replace(/\[[^\]]*\](?:\([^)]*\))?(?:\s*\d{4}-\d\d-\d\d)?/g, ' ').replace(/`[^`]*`/g, ' ').replace(/https?:\/\/\S+/g, ' ');
// The same, blanked in place (every offset still points at the same character).
const blank = (s, re) => s.replace(re, m => m.replace(/[^\n]/g, ' '));
const unCode = s => blank(blank(s, /`[^`\n]*`|https?:\/\/\S+/g), /\]\([^)\n]*\)/g);
const QUOTE = /["“][^"”]{0,600}["”]/g, spans = (s, re) => [...s.matchAll(re)].map(m => [m.index, m.index + m[0].length]);
const within = (rs, i) => rs.some(([a, b]) => i >= a && i < b);
const TODAY = new Date().toISOString().slice(0, 10);
const plan = l => /^\s*[-*+] \[[ xX]\]/.test(l.raw), table = l => /^\|/.test(l.t);
const POINTER = /(?:^|[\s(`"'])_?archive\/\S/i;
// A sentence that says a name went: deleted, renamed, absorbed, moved from, left the disk, no longer, used to, was.
const GONE = /\b(?:delet(?:e[sd]?|ing)|remov(?:e[sd]?|ing)|retir(?:e[sd]?|ing)|archiv(?:e[sd]?|ing)|renam(?:e[sd]?|ing)|absorb(?:s|ed)?|dropped|superseded|replaced|gone|former(?:ly)?|previously|moved (?:here |in |out )?from|(?:merged|folded) into|left the (?:disk|repo|code|tree|project)|(?:does|did) ?n[o']t exist|no longer|(?<!\b(?:is|are|be|been|being|gets?|got|was|were)\s)used to|was|were)\b/i;
const WENT = /\b(?:deleted|removed|retired|archived|dropped|superseded|replaced|gone|no longer exists?)\b/i;
// Units: a paragraph, or a bullet with its wrapped lines; a nested bullet keeps its parent bullet as top; a table
// row stands alone. text is the raw lines joined by \n, at[k] where line k starts in it.
function units(L) {
  const out = []; let cur = null, top = null;
  for (const l of L) {
    if (!l.t || l.skip || l.head || /^-{3,}$/.test(l.t)) { cur = top = null; continue; }
    const bullet = /^(?:[-*+]|\d+\.)\s/.test(l.t), ind = l.raw.search(/\S/);
    if (table(l) || bullet || !cur || cur.table) {
      out.push(cur = { lines: [], table: table(l) });
      cur.top = bullet && ind > 0 && top ? top : cur.table ? ((top = null), cur) : (top = cur);
    }
    cur.lines.push(l);
  }
  for (const u of out) {
    let o = 0; u.at = u.lines.map(l => (o += l.raw.length + 1) - l.raw.length - 1); u.text = u.lines.map(l => l.raw).join('\n');
  }
  return out;
}
const lineAt = (u, i) => u.lines[u.at.findLastIndex(a => a <= i)];
// The sentence around offset i: ends at . ! ? before a space, at "; ", or where a nested bullet starts.
function sentence(s, i) {
  let a = 0, b = s.length;
  for (const m of s.matchAll(/[.!?](?=[*_"”')\]]*(?:\s|$))|;\s|\n(?=\s*(?:[-*+]|\d+\.)\s)/g)) {
    const e = m.index + m[0].length;
    if (e <= i) a = e; else if (m.index >= i) { b = m.index; break; }
  }
  return s.slice(a, b);
}

// ---------- detectors ----------
// A dated event is history; a date that only says who or when a fact was read (provenance) is not.
const EVENT = /(?<!\bnot (?:yet )?)\b(?:shipped|landed|deleted|archived|retired|fixed|merged|ran|found|reversed|lifted|closed|cancell?ed|corrected|carried|rewritten|started|done|finished|built|released|removed)\b/i;
const PROV = /\b(?:owner|matthew|measured|confirmed|verified|probed|read|named|mapped|checked|tested|asked|quoted|per)\b|\bcarried from\b/i;
// A correction marker. In an all-caps sentence (emphasis) it counts only after is/was/were, or before a colon, a dash
// or a date ("WAS REVERSED", "SUPERSEDED 2026-09-12"), never as a plain adjective ("A STALE ASSEMBLY").
function marker(b) {
  for (const m of b.matchAll(/\b(?:STALE|CORRECTION|CORRECTED|SUPERSEDED|OBSOLETE|DEPRECATED|RETIRED|CANCELL?ED|REVERSED|UPDATED?(?=:))\b|\b(?:is|was|were|are)\s+(?:\*\*)?(?:FALSE|WRONG)\b/g)) {
    if (m[0] === 'CORRECTION' && /\bthe(?:\s+[\w'-]+){0,3}\s+$/i.test(b.slice(0, m.index))) continue; // "THE 2026-09-09 SIMULATOR CORRECTION" names one
    const before = b.slice(0, m.index).match(/([A-Za-z]{2,})\W*$/)?.[1] ?? '', after = b.slice(m.index + m[0].length);
    const caps = w => w.length >= 2 && w === w.toUpperCase();
    if (!(caps(before) || caps(after.match(/^\W*([A-Za-z]{2,})/)?.[1] ?? '')) || /^\W{0,4}[:—–]|^[^.!?*]{0,40}?\d{4}-\d\d-\d\d/.test(after) ||
      /\b(?:is|was|were|been|are)\W*$/i.test(b.slice(0, m.index))) return m;
  }
  return /\bpreviously said\b|\b(?:was|were) wrong\b/i.exec(b);
}
// A check mark is done only where its sentence says what finished, or a date follows it ("✅ 2026-09-27"); elsewhere
// it is emphasis or a "yes" in a list. One inside a quote is someone's words.
const FINISHED = /\b(?:done|shipped|fixed|closed|met|built|merged|landed|resolved|completed?|answered|passed|implemented|installed|finished|deleted|removed|retired|superseded|released|carried out)\b/i;
function doneMark(b) {
  const q = blank(b, QUOTE);
  for (const m of q.matchAll(/✅|☑|\bDONE\b/g)) {
    const s = sentence(q, m.index);
    if (OPEN.test(s)) continue; // still open, whatever else it says
    if (m[0] === 'DONE' || FINISHED.test(s) || /^\W{0,12}\d{4}-\d\d-\d\d/.test(q.slice(m.index + m[0].length))) return m;
  }
  return null;
}
function eventDate(b, named = false) {
  for (const m of b.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    if (m[1] > TODAY) continue; // a date still ahead (an expiry, a deadline) is a fact
    const at = m.index, o = b.lastIndexOf('(', at), c = b.lastIndexOf(')', at);
    if (o > c) { // inside parentheses: that group is the clause; "(2026-07-11)" alone stamps when a fact was written
      const inner = b.slice(o + 1, (b.indexOf(')', at) + 1 || b.length + 1) - 1);
      if (!PROV.test(inner) && EVENT.test(inner)) return m;
      continue;
    }
    if (!named && /\b(?:the|a|an|its|his|that|this|each|every)\s+$/i.test(b.slice(Math.max(0, at - 8), at))) continue; // "the 2026-08-09 playtest" names one
    const cut = /[.;!?|:]\s|\s[—–]\s/g, ends = [0];
    for (const x of b.matchAll(cut)) ends.push(x.index + x[0].length);
    const from = ends.filter(e => e <= at).pop(), next = ends.find(e => e > at) ?? b.length, clause = b.slice(from, next);
    if (PROV.test(b.slice(Math.max(from, at - 24), at)) || /\bcarried (?:from|into)\b/i.test(clause)) continue;
    if (EVENT.test(clause) || /\b(?:since|until)\b/i.test(clause) && /\bnow\b/i.test(clause)) return m;
  }
  return null;
}
const HIST = [
  [x => /~~/.exec(x.b), () => 'strikethrough'],
  [x => marker(x.b), m => `a "${m[0]}" marker`],
  // A check mark on a fact someone confirmed or re-checked is provenance, and on a ruling it marks the ruling: not done marks.
  [x => !/\b(?:CONFIRMED|VERIFIED|DECIDED|APPROVED|RULED|RULING|confirmed|verified|re-?checked|decided)\b|\bowner rul(?:ing|ed)\b/i.test(x.b) &&
    !/\b(?:LOCKED|KEPT|ACCEPTED|SIGNED OFF)\b/.test(x.b) && doneMark(x.b), () => 'a done mark'],
  // A build number counts only as a log entry: "Build 5 contents", or "build 5:" starting the line.
  [x => /^(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)?(?:\*\*|__)?(?:build|release)\s+v?\d+\b(?:\*\*|__)?(?:\s+contents\b|\s*[:—–]|\s+-\s)/i.exec(x.t), m => `a log entry "${clip(m[0].trim(), 30)}"`],
  // "was X, now Y" or "was X and is now Y"; a "now" in a later clause of its own ("(fixed by Y, which now …)") is not one.
  [x => /\bwas\s[^.;:()]{1,80}?(?:[,;—–]|\bbut\b|\band\b)\s+(?:it\s+|it's\s+|this\s+|that\s+|they\s+)?(?:is\s+|are\s+)?now\b|\(was [^)]{1,60}\)|\bformerly\b/i.exec(x.b), () => 'a was/now correction'],
  [x => eventDate(blank(x.b, QUOTE)), m => `a dated event ${m[1]}`],
];
const HIST_ROLES = ['card', 'catchall', 'ref', 'area', 'house', 'skill', 'readme', 'decisions'];
// past gets every line that reads as history, his or not, so dead-name knows what is history.
function history(f, L, add, past) {
  if (!HIST_ROLES.includes(role(f))) return;
  for (const l of L) {
    if (l.skip || !l.t) continue;
    if (l.head && !l.log && LOGHEAD.test(l.t)) {
      add('history', f, l.n, `a log section, ${kb(l.size)}: "${clip(l.t, 70)}"`, HOME.history + '; open work in it to the board');
      continue;
    }
    // A pointer to the archive is what the Borg leaves behind on purpose. Tables and checklists are not noted, but
    // past still learns them, and a date that names an event ("the 2026-08-18 hex snap was inverted") is past too.
    const x = { t: l.t, b: bare(l.t) }, quiet = l.log || table(l) || plan(l) || POINTER.test(l.t) || (role(f) === 'decisions' && ROW.test(l.t));
    const m = HIST.reduce((hit, [find, say]) => hit || ((h => h && [h, say])(find(x))), null);
    if (m || eventDate(x.b, true)) past.add(f + '|' + l.n);
    // His words or attribution make the line a ruling (rulings() notes it): never history to delete.
    if (m && !quiet && !his(l.t)) add('history', f, l.n, `${m[1](m[0])}: "${clip(l.t, 70)}"`);
  }
}

// Open work only: the state words below. A design list ("not built"), shipped or done in reference, a word for a
// kind of thing ("pending orders") or a phrase ("a micro-win in progress") is not status.
const STATUS = new RegExp([
  /\b(?:is|are|stays?|remains?|still|rest|left) pending\b|(?<!\bnot )\bpending(?:[.):;,]|\s+(?:a|an|the|his|him|Matthew|owner|review|approval|device|until)\b)|\(pending\b/,
  /\b(?:still|currently|now|is|are|stays?|left) waiting\b|\bwaiting (?:on|for) (?:Matthew|him|his|the owner|owner|review|approval|permission|a |an |the )/,
  /\bnext steps?\s*(?::|—|–|\bis\b|\bare\b)/, /\bnot (?:yet )?started\b/, /\b(?:is|are|still|now|currently)\s+(?:\*\*)?in progress\b|\(in progress\b|\bstatus\W{0,4}in progress\b/,
  /\b(?:still|currently|is|are) blocked (?:on|until)\b|\bblocked on\b|\(blocked\b/, /\b(?:still|left|yet) to do\b|\bto-?do:/, /\buntested\b/,
  /\bneeds (?:his|Matthew|the owner)\b/].map(r => r.source).join('|'), 'gi');
// A sentence that is a choice, a correction, a negation or history describes the work; it is not open work.
const NOTWORK = /\b(?:deliberate(?:ly)?|declined|by choice|on purpose|by design|in fact|history|claims|cancell?ed|abandoned|still (?:calls|describes?|says))\b|\b(?:no|nothing|none|not)\b[^.;:]{0,40}\b(?:pending|waiting)\b/i;
function status(f, L, add) {
  if (!['card', 'catchall', 'ref', 'area', 'decisions'].includes(role(f))) return;
  for (const u of units(L)) {
    const l0 = u.lines[0];
    // Not a table row, a checklist item or a decisions row; never inside a quote; one note per paragraph or bullet.
    if (u.table || l0.log || plan(l0) || ROW.test(l0.t)) continue;
    const plain = blank(blank(unCode(u.text), QUOTE), /\[[^\]\n]*\]/g);
    for (const m of [...plain.matchAll(STATUS), ...plain.matchAll(/\bTODO\b/g)].sort((a, b) => a.index - b.index)) {
      const l = lineAt(u, m.index), s = sentence(u.text, m.index);
      // A line that points at the board describes it; a tag or his attribution makes the line his, not open work.
      if (l.log || /\bwip\.md\b|\bthe board\b/i.test(l.t) || his(l.t) || TAG.test(l.t) || his(s) || TAG.test(s) || NOTWORK.test(s) || marker(bare(s))) continue;
      add('status', f, l.n, `"${m[0]}": "${clip(l.t, 70)}"`);
      break;
    }
  }
}

const RULING = new RegExp([
  /\(owner(?:,|\s+(?:ruling|decision|call)\b)(?!\s*device\b)[^)]{0,80}?(?:["“]|\b(?:ruled|rules|decided|said|says|wants|chose|approved|kept|keep|call|ruling|decision)\b)/,
  /\bowner (?:ruling|decision|call)(?:\s*\(?\d{4}-\d\d-\d\d\)?)?\s*[:—]/, /\(Matthew, /,
  /\bMatthew(?:'s)? (?:said|says|ruled|rules|decided|wants|call)\b/, /\b(?:his|owner's) (?:call|ruling)\b/, /\bhe (?:said|ruled|decided|chose|picked)\b/,
  /\b(?:the )?owner (?:ruled|decided|chose|picked|wants|declined|approved|reversed)\b/, // "the owner ruled the top shelf stays clear"
  /\b(?:his|owner's|Matthew's) (?:pick|idea|requirement|verdicts?)\b[^"“\n]{0,40}?[*_(]*["“][^"”\n]{6,}/, // 'his idea, *"a bin for every size"*'
  /["“][^"”]{12,}["”],? (?:he|Matthew) (?:said|says|wrote)\b/].map(r => r.source).join('|'), 'i');
// His attribution: "(Matthew, 2026-10-11", "(owner 2026-09-25:", "(owner's call", "Owner: *"…"*", "owner ruling", "his words".
const ATTR = new RegExp([
  /\((?:Matthew|owner)(?:'s)?(?:,|:|\s+\d{4}-\d\d-\d\d|\s+(?:ruling|decision|call|said|says|asked|wants|chose|approved|declined|order(?:ed)?|rule[sd]?)\b|'s (?:call|ruling|decision|order|words)\b)/,
  /\b(?:Owner|Matthew)\b[^:"“\n.]{0,60}:[\s*_]*["“]/, /\b(?:owner|Matthew)'s\s+[*_]*["“]/, // ":[\s*_]*" takes "verdicts:** *"…"
  /\b(?:owner|Matthew|he)\b[^"“\n]{0,80}?\b(?:said|says|told|asked|wrote|answered|replied|approved|signed off|confirmed|called|ruled|decided|chose|picked|declined|agreed|ordered|corrected)\b[^"“\n]{0,60}?[*_(]*["“][^"”\n]{6,}/,
  /\b(?:owner|Matthew),?\s+\d{4}-\d\d-\d\d\b/, /\bowner rulings?\b/, /\b(?:his|Matthew's|owner's) (?:own )?(?:words|quote)\b/,
  /\b(?:his|Matthew's|owner's) (?:instruction|order|answer|reply|sign-?off)\b[\s*_(:]{0,6}["“]/, /\bverbatim\b[\s*_:,—–-]{0,8}["“]|\bowner verdicts?\b/, /\bruling\b[^"“\n]{0,80}?[—–:-]\s*[*_]*["“][^"”\n]{6,}/,
].map(r => r.source).join('|'), 'i');
// A line with his words or attribution is a ruling: its home is decisions, never history to delete, never status.
const attr = t => ATTR.test(t) || /\bOwner:\s+[a-z]/.test(t); // "Owner: match the path's own stamps" is his word, paraphrased
const his = t => RULING.test(t) || attr(t) || /\[matthew\b/i.test(t);
// A ruling in prose: the markers above, or (only where a decisions file exists) a [matthew] tag outside the card.
function rulings(f, L, rows, hasRows) {
  const r = role(f), out = [];
  if (!['card', 'catchall', 'ref', 'area'].includes(r)) return out;
  for (const b of blocks(L, true)) {
    if (!(RULING.test(b.text) || attr(b.text) || (hasRows && r !== 'card' && /\[matthew\b/i.test(b.text))) || /decisions|not his words/i.test(b.text)) continue;
    if ((r === 'card' && TAG.test(b.text)) || /\[(?:lesson|check)\b/i.test(b.text)) continue;
    const q = /["“]([^"”]{8,})["”]/.exec(b.text), qw = q ? words(q[1]).join(' ') : '';
    const sig = [...new Set(words(b.text).filter(w => w.length >= 4 && !STOP.has(w)))];
    const hit = rows.some(r => (qw && r.flat.includes(qw)) || (sig.length && sig.filter(w => r.set.has(w)).length / sig.length >= 0.5));
    if (!hit) out.push([f, b.n, `no decisions row holds: "${clip(b.text, 70)}"`]);
  }
  return out;
}

function duplicates(docs, add, size) {
  const S = [];
  for (const [f, L] of docs) if (role(f) !== 'readme') for (const b of blocks(L)) { // README is for people
    // A pointer ("Full text: _archive/...", "See X") is meant to repeat.
    if (/^Read when:/i.test(b.text) || POINTER.test(b.text)) continue;
    for (const s of b.text.split(/(?<=[.!?])\s+(?=["(\[*`]?[A-Z0-9])/)) {
      const w = words(s);
      if (w.length >= WORDS && !/^\W*see\b/i.test(s)) S.push({ f, n: b.n, s, w, key: w.join(' ') });
    }
  }
  const pairs = new Map(), grams = new Map();
  const rank = x => RANK.indexOf(role(x.f)) * 1e9 + (size.get(x.f) || 0) + x.n / 1e6;
  const pair = (a, b, why) => {
    if (a.f === b.f && Math.abs(a.n - b.n) < FAR) return; // one file: only copies far apart
    const [home, other] = rank(a) <= rank(b) ? [a, b] : [b, a];
    const k = `${other.f}|${other.n}|${home.f}`;
    if (!pairs.has(k)) pairs.set(k, { home, other, why });
  };
  const exact = new Map();
  S.forEach((x, i) => {
    if (exact.has(x.key)) pair(S[exact.get(x.key)], x, 'the same sentence'); else exact.set(x.key, i);
    for (let j = 0; j + WORDS <= x.w.length; j++) {
      const g = x.w.slice(j, j + WORDS).join(' ');
      (grams.get(g) ?? grams.set(g, new Set()).get(g)).add(i);
    }
  });
  const seen = new Set();
  for (const ids of grams.values()) {
    if (ids.size < 2 || ids.size > 30) continue;
    const a = [...ids];
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      const x = S[a[i]], y = S[a[j]], k = a[i] + ',' + a[j];
      if (x.key === y.key || seen.has(k)) continue;
      seen.add(k);
      const X = new Set(x.w), Y = new Set(y.w), inter = [...X].filter(w => Y.has(w)).length;
      if (inter / (X.size + Y.size - inter) >= NEAR) pair(x, y, 'nearly the same sentence');
    }
  }
  for (const { home, other, why } of pairs.values()) {
    const where = home.f === other.f ? `line ${home.n} of this file` : home.f;
    add('duplicate', other.f, other.n, `${why} as ${home.f}:${home.n}: "${clip(other.s, 70)}"`, `one home (${where}), a pointer here`);
  }
}

// Sibling repos (folders next to this one with a .git): a path under their name is theirs, not dead here.
function siblings(root) {
  try {
    const up = path.dirname(root), me = path.basename(root);
    return fs.readdirSync(up).filter(d => d !== me && fs.existsSync(path.join(up, d, '.git')));
  } catch { return []; }
}
// Every path some commit on some branch deleted or renamed away (one git call), with its folders and bare names.
// A path no branch ever lost is alive somewhere (another branch, a published feed) or was never this repo's.
function everLost(root) {
  const names = new Set(), r = run('git', ['log', '--all', '--diff-filter=D', '--no-renames', '--format=', '--name-only'], root);
  for (const p of r.out.split('\n')) {
    if (!p) continue;
    names.add(p); names.add(path.posix.basename(p));
    for (let d = path.posix.dirname(p); d !== '.'; d = path.posix.dirname(d)) names.add(d);
  }
  return names;
}
// Code names that sat on a removed line of a code file: they lived in the code once and left (--deep only).
function leftCode(root, toks) {
  const left = new Set();
  for (let i = 0; i < toks.length; i += IDS_PER_PASS) {
    const chunk = new Set(toks.slice(i, i + IDS_PER_PASS));
    const re = '(' + [...chunk].map(t => t.replace(/[.[\]()*+?{}|^$\\]/g, '\\$&')).join('|') + ')';
    const r = run('git', ['log', '--all', '-p', '--format=', '--no-color', '--no-ext-diff', '-G' + re, '--', ...CODE_SPECS], root);
    for (const x of r.out.split('\n')) {
      if (x[0] !== '-' || x.startsWith('---')) continue;
      for (const m of x.matchAll(/[A-Za-z_$][\w$]*/g)) if (chunk.has(m[0])) left.add(m[0]);
    }
  }
  return left;
}

function deadNames(root, t, docs, add, past, deep) {
  const files = new Set(t.files), top = new Set(t.files.filter(f => f.includes('/')).map(f => f.split('/')[0]));
  const up = path.dirname(root), sibs = siblings(root);
  // A sibling repo named on the same line that holds the path: the path is theirs.
  const theirs = (raw, p) => sibs.some(s => raw.includes(s) && fs.existsSync(path.join(up, s, p)));
  const isDir = p => { const d = p.replace(/\/?$/, '/'); return t.files.some(x => x.startsWith(d)); };
  const exists = p => files.has(p) || isDir(p) || fs.existsSync(path.join(root, p)) || (!p.includes('/') && t.files.some(x => x.endsWith('/' + p)));
  const paths = [], ids = [], said = new Set(); // said: "doc|name" for each name a doc itself says is gone
  for (const [f, L] of docs) {
    // A bullet (with its nested bullets) or paragraph holding history or an archive pointer is not a stale pointer.
    const U = units(L), hist = new Set(), ptr = new Set();
    for (const u of U) for (const l of u.lines) { if (past.has(f + '|' + l.n)) hist.add(u.top); if (POINTER.test(l.raw)) ptr.add(u.top); }
    for (const u of U) {
      const plain = unCode(u.text), struck = spans(plain, /~~[\s\S]*?~~/g), quoted = spans(plain, QUOTE);
      // Live is a name the doc treats as here today. Gone (and remembered for the whole doc): struck through, in a
      // sentence that says it went, or under an archive pointer. Neither: inside a quote (someone's words) or history.
      const take = (k, i, p, list, extra) => {
        const at = u.at[k] + i, gone = ptr.has(u.top) || within(struck, at) || GONE.test(sentence(plain, at));
        if (gone) { said.add(f + '|' + p); said.add(f + '|' + path.posix.basename(p)); }
        // A line that says something went is history around the name, even in another sentence.
        if (!gone && !hist.has(u.top) && !within(quoted, at) && !WENT.test(u.lines[k].raw)) list.push([f, u.lines[k].n, p, ...extra]);
      };
      u.lines.forEach((l, k) => {
        if (l.log) return;
        for (const m of l.raw.matchAll(/`([^`\n]+)`/g)) {
          const p = m[1].replace(/^\.\//, '').replace(/(?::\d+(?:-\d+)?|#.*)$/, '');
          if (/^[\w.@-]+(?:\/[\w.@-]*)*$/.test(p) && !/^\d|^\.\w+$/.test(p) && (EXT.test(p) || (p.includes('/') && top.has(p.split('/')[0])))) take(k, m.index, p, paths, [l.raw]);
          else if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?$/.test(m[1]) && /[a-z][A-Z]|_|\.|\(\)$/.test(m[1]) &&
            !NOTCODE.test(m[1]) && !/^(?:com|org|net|io|dev|app)\.[a-z]/i.test(m[1]) && (m[1].match(/[A-Za-z]/g) || []).length >= 3) take(k, m.index, m[1], ids, []);
        }
        for (const m of l.raw.matchAll(/\]\(([^)\s]+)\)/g)) {
          const p = m[1].replace(/#.*$/, '');
          let d = p; try { d = decodeURI(p); } catch {}
          if (p && !/^[a-z]+:/i.test(p)) take(k, m.index, path.posix.normalize(path.posix.join(path.posix.dirname(f), d)), paths, [l.raw]);
        }
        const b = blank(blank(l.raw, /\[[^\]]*\](?:\([^)]*\))?(?:\s*\d{4}-\d\d-\d\d)?/g), /`[^`]*`|https?:\/\/\S+/g);
        for (const m of b.matchAll(/(?<![\w./@<-])((?:[\w@.-]+\/)+[\w@.-]*)/g)) {
          const p = m[1].replace(/[.,;:]+$/, '');
          if (top.has(p.split('/')[0]) && !/[*{]/.test(p)) take(k, m.index, p, paths, [l.raw]);
        }
      });
    }
  }
  const told = (f, p) => said.has(f + '|' + p) || said.has(f + '|' + path.posix.basename(p));
  const dead = [], once = new Set(), placeholder = /(?:^|[-_./])(?:[A-Z]|YYYY|MM|DD|X+)(?=[-_./]|$)|-$/;
  for (const [f, n, p, raw] of paths) {
    if (exists(p) || told(f, p) || placeholder.test(p) || sibs.includes(p.split('/')[0]) || theirs(raw, p) || once.has(f + '|' + p)) continue;
    once.add(f + '|' + p); dead.push([f, n, p]);
  }
  if (dead.length) {
    // Dead means it was here once: a name this repo never held is another repo's, a secret kept out of git, or a plan.
    const held = everLost(root), was = p => held.has(p) || held.has(p.replace(/\/$/, ''));
    const ign = run('git', ['check-ignore', '--stdin'], root, { input: dead.map(d => d[2]).join('\n') + '\n' });
    const ignored = new Set(ign.out.split('\n').map(s => s.trim()));
    for (const [f, n, p] of dead) if (!ignored.has(p) && was(p)) add('dead-name', f, n, `\`${p}\` was in the repo and is gone`);
  }
  if (!ids.length) return 0;
  // Known: every part is a token in the code (or its scenes and settings), or (for names built at run time,
  // like `rod.c2_cap`) every word piece of three letters or more shows up somewhere in that text.
  const known = new Set(), text = [];
  for (const f of t.files) {
    if (!(CODE.test(f) || CODE_TEXT.test(f)) || isLive(f)) continue;
    try {
      if (fs.statSync(path.join(root, f)).size > CODE_MAX) continue;
      const s = t.read(f) || ''; text.push(s.toLowerCase());
      for (const m of s.matchAll(/[A-Za-z_$][\w$]*/g)) known.add(m[0]);
    } catch {}
  }
  if (!known.size) return 0;
  const all = text.join('\n'), unknown = [];
  for (const [f, n, id] of ids) {
    const parts = id.replace(/\(\)$/, '').split('.').filter(p => p.length >= 2);
    if (told(f, id) || parts.every(p => known.has(p))) continue;
    const pieces = parts.flatMap(p => p.toLowerCase().split(/[_\d$]+/)).filter(p => p.length >= 3);
    if (pieces.length && pieces.every(p => all.includes(p))) continue;
    if (!once.has(f + '|' + id)) { once.add(f + '|' + id); unknown.push([f, n, id, parts.filter(p => !known.has(p)).sort((a, b) => b.length - a.length)[0] || parts[0]]); }
  }
  if (!deep || !unknown.length) return unknown.length;
  const left = leftCode(root, [...new Set(unknown.map(u => u[3]))]);
  for (const [f, n, id, tok] of unknown) if (left.has(tok)) add('dead-name', f, n, `\`${id}\` left the code (git log shows it removed)`);
  return 0;
}

// The board: done marks on its items, paragraphs and table rows; a Next that stopped moving; and Open items
// untouched for a long time, as one note for the section. Needs and On the floor are his to answer.
// Only an explicit mark is done: ✅ ☑ [x] DONE "(done" "done <date>". A strikethrough is a correction (history).
const DONE = { exec: t => /✅|☑|\[[xX]\]|\bDONE\b/.exec(t) || /\(done\b|\bdone:?\s+(?:on |in )?\d{4}-\d\d-\d\d/i.exec(t) };
DONE.test = t => !!DONE.exec(t);
// Still open, whatever mark it carries.
const OPEN = /🔄|🅿|⏳|\b(?:HELD|UNGLASSED|UNTESTED|UNVERIFIED|READY FOR|ASK HIM|awaiting|waiting|pending|in progress|not yet)\b/i;
function board(root, f, L, add) {
  const items = []; let cur = null, sec = '';
  for (const l of L) {
    if (l.skip) continue;
    if (/^## /.test(l.t)) { sec = l.t.slice(3).trim(); cur = null; continue; }
    if (!l.t || l.head) { cur = null; continue; }
    // An item is a top-level bullet and everything indented under it; a paragraph runs to a blank line; a table row stands alone.
    const item = /^(?:[-*+]|\d+\.) /.test(l.raw), more = cur && !table(l) && !cur.table && (cur.item ? /^\s/.test(l.raw) : !item);
    if (more) cur.lines.push(l); else items.push(cur = { n: l.n, lines: [l], sec, item, table: table(l) });
  }
  for (const it of items) {
    const text = it.lines.map(l => l.t).join(' '), step = it.lines.findIndex((l, i) => i && /^\s*(?:[-*+]|\d+\.) /.test(l.raw));
    const head = step > 0 ? it.lines.slice(0, step) : it.lines, m = DONE.exec(head.map(l => l.t).join(' '));
    // A done item carrying his words: they go to decisions before it goes.
    if (m && !OPEN.test(text)) {
      it.done = true;
      add('board', f, it.n, `marked done ("${m[0]}"): "${clip(text, 70)}"`, his(text) ? 'his words in it to docs/decisions.md, then delete it (git keeps it)' : HOME.board);
      continue;
    }
    const s = step > 0 && it.lines.slice(step).find(l => DONE.test(l.t) && !OPEN.test(l.t));
    if (s) add('board', f, s.n, `a done step in an open item: "${clip(s.t, 70)}"`, 'delete the done step (git keeps it); the item stays');
    const x = it.lines.find(l => /~~/.test(l.t));
    if (x && !his(text)) add('history', f, x.n, `struck words on the board: "${clip(x.t, 70)}"`, 'delete the struck words (git keeps them); the item stays');
  }
  const next = L.find(l => /^## Next\s*$/.test(l.t)), open = L.find(l => /^## Open\s*$/.test(l.t));
  if (!next && !open) return;
  const when = new Map(), r = run('git', ['blame', '--line-porcelain', '--', f], root);
  if (!r.ok) return;
  let n = 0;
  for (const x of r.out.split('\n')) {
    const h = /^[0-9a-f]{40} \d+ (\d+)/.exec(x);
    if (h) n = +h[1]; else if (x.startsWith('committer-time ')) when.set(n, +x.slice(15) * 1000);
  }
  const age = ns => { const t = Math.max(...ns.map(k => when.get(k) ?? Date.now())); return { t, days: Math.floor((Date.now() - t) / 864e5) }; };
  const day = t => new Date(t).toISOString().slice(0, 10);
  if (next) {
    const end = L.find(x => x.n > next.n && /^## /.test(x.t))?.n ?? Infinity;
    const body = L.filter(l => l.n > next.n && l.n < end && l.t).map(l => l.n);
    const a = body.length ? age(body) : null;
    if (a && a.days >= STALE_DAYS) add('board', f, next.n, `Next has not moved since ${day(a.t)} (${a.days} days)`, 'rewrite it to where the work stands, or clear it');
  }
  const stale = items.filter(it => it.item && it.sec === 'Open' && !it.done).map(it => age(it.lines.map(l => l.n))).filter(a => a.days >= STALE_DAYS);
  if (open && stale.length) {
    const total = items.filter(it => it.item && it.sec === 'Open').length, oldest = Math.min(...stale.map(a => a.t));
    add('board', f, open.n, `${stale.length} of ${total} Open items untouched since ${day(oldest).slice(0, 7)} or later`,
      'ask him once, in one line, which to keep; the rest go (git keeps them)');
  }
}

// Growth: bytes added to each live doc since the last "borg:" commit, or, before the first one, since the
// commit that brought .claude/borg.mjs. With neither, nothing counts as growth yet. The board and decisions
// grow by design (open work; one row per ruling) and have notes of their own.
function baseline(root) {
  for (const x of (git(root, 'log', '-n', '5000', '--format=%H%x1f%cs%x1f%s') || '').split('\n')) {
    const [sha, date, subj] = x.split('\x1f');
    if (/^borg:/i.test(subj || '')) return { sha, short: sha.slice(0, 7), date, subject: subj, label: `borg: ${sha.slice(0, 7)} ${date}` };
  }
  const a = git(root, 'log', '-1', '--diff-filter=A', '--format=%H%x1f%cs%x1f%s', '--', '.claude/borg.mjs');
  if (!a) return null;
  const [sha, date, subj] = a.split('\x1f');
  return { sha, short: sha.slice(0, 7), date, subject: subj, arrived: true, label: `the Borg arrived, ${sha.slice(0, 7)} ${date}` };
}
function growth(root, t, docs, add, added) {
  const since = baseline(root);
  if (!since) return null;
  const then = readAt(root, since.sha, docs.map(d => d[0]));
  for (const [f] of docs) {
    const now = t.read(f) ?? '', old = new Map();
    for (const l of (then.get(f) ?? '').split('\n')) old.set(l, (old.get(l) || 0) + 1);
    let n = 0;
    for (const l of now.split('\n')) {
      if (old.get(l)) old.set(l, old.get(l) - 1); else if (l.trim()) n += bytes(l) + 1;
    }
    added[f] = n;
    if (n >= GROW && !['board', 'decisions'].includes(role(f))) {
      add('growth', f, 0, then.has(f) ? `${n0(n)} bytes added since ${since.label}; file what was added`
        : `new since ${since.label}, ${n0(n)} bytes; file what it holds`);
    }
  }
  return since;
}
// A broad file: the card or a catch-all covering many topics, or one section big enough to be a file of its own.
function split(f, L, add) {
  const r = role(f);
  if (['board', 'house', 'decisions', 'brief'].includes(r)) return;
  const b = L.reduce((s, l) => s + bytes(l.raw) + 1, 0), h2 = L.filter(l => l.head === 2), lv = h2.length >= 2 ? 2 : 3;
  // A log section is history's note; a decisions section is a rulings home the repo chose.
  const secs = L.filter(l => l.head === lv && !l.log && !LOGHEAD.test(l.t) && !/\bdecisions?\b/i.test(l.t)).sort((x, y) => y.size - x.size);
  if (r === 'card' || r === 'catchall') {
    const topics = L.filter(l => l.head === lv).length;
    if (topics >= SPLIT_TOPICS && b - b / topics >= SPLIT_SPARE) {
      add('split', f, 0, `${topics} topics in one file (${kb(b)}); the biggest, "${clip(secs[0]?.t ?? '', 50)}", is ${kb(secs[0]?.size ?? 0)}`, 'one docs/<topic>.md per topic, each listed in the card');
    }
  } else if (secs[0] && secs[0].size >= BIG_SECTION && b - secs[0].size >= SPLIT_SPARE) {
    add('split', f, secs[0].n, `"${clip(secs[0].t, 60)}" is ${kb(secs[0].size)} of the file's ${kb(b)}; it could be its own file`);
  }
}

// ---------- detect ----------
const ONE_PER_LINE = ['history', 'ruling', 'status']; // a line gets one of these, the first that applies
export function detect(root, o = {}) {
  root = path.resolve(root);
  const top = git(root, 'rev-parse', '--show-toplevel');
  if (top) root = path.resolve(top);
  const t = tree(root), out = [], flagged = new Map(), past = new Set();
  const add = (kind, file, line, text, home = HOME[kind]) => {
    const k = file + '|' + line;
    if (line && ONE_PER_LINE.includes(kind)) { if (flagged.has(k)) return; flagged.set(k, kind); }
    out.push({ kind, file, line, text, home });
  };
  const skip = skipList(t.read, o.skip), live = f => isLive(f, skip);
  const docs = t.files.filter(live).sort().map(f => [f, lines(t.read(f) ?? '')]), size = new Map(docs.map(([f]) => [f, bytes(t.read(f))]));
  const rows = docs.filter(([f]) => role(f) === 'decisions').flatMap(([f]) => lf(t.read(f)).split('\n').filter(l => ROW.test(l)))
    .map(l => { const w = words(l); return { flat: w.join(' '), set: new Set(w) }; });
  const errors = [], step = fn => { try { fn(); } catch (e) { errors.push(clip(String(e?.message ?? e), 160)); } };
  const prose = [];
  for (const [f, L] of docs) {
    step(() => history(f, L, add, past));
    // No decisions file: the rulings in prose are one question for him (where rulings live), not one note each.
    step(() => { for (const p of rulings(f, L, rows, rows.length > 0)) if (rows.length) add('ruling', ...p); else prose.push(p); });
    step(() => status(f, L, add));
    if (role(f) === 'board') step(() => board(root, f, L, add));
  }
  // A Decisions section somewhere ("## Decisions", "## Locked Design Decisions") is a home the repo chose, as split()
  // reads it: that question is answered.
  if (prose.length && !docs.some(([, L]) => L.some(l => l.head > 1 && /\bdecisions?\b/i.test(l.t)))) {
    const card = docs.find(([f]) => role(f) === 'card')?.[0] ?? docs[0][0];
    add('ruling', card, 0, `${prose.length} rulings sit in prose across ${new Set(prose.map(p => p[0])).size} docs, and no decisions file holds them`,
      'ask him once where rulings live; never create a .md he did not name');
  }
  step(() => duplicates(docs, add, size));
  let unchecked = 0;
  step(() => { unchecked = deadNames(root, t, docs, add, past, !!o.deep); });
  let since = null; const added = {};
  step(() => { since = growth(root, t, docs, add, added); });
  for (const [f, L] of docs) step(() => split(f, L, add));
  out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
  const byKind = Object.fromEntries(KINDS.map(k => [k, out.filter(x => x.kind === k).length]));
  return { root, since, deep: !!o.deep, unchecked, docs: docs.length, count: out.length, byKind, added, errors, findings: out };
}

function format(r) {
  const files = [...new Set(r.findings.map(x => x.file))];
  const since = r.since ? `growth counted since ${r.since.label}` : 'growth starts at the first "borg:" commit';
  const err = r.errors.map(e => `borg: a detector failed (${e}); tell Claude, the Borg needs a fix.`);
  const ids = r.unchecked ? [`  ${r.unchecked} code names are not in today's code; detect --deep asks git which of them left it.`] : [];
  if (!r.count) return [`borg: nothing to assimilate in ${r.docs} live docs (${since}).`, ...ids, ...err].join('\n');
  const out = [`borg: ${r.count} note${r.count === 1 ? "" : "s"} to assimilate in ${files.length} of ${r.docs} live docs (${since}).`,
    '  ' + KINDS.filter(k => r.byKind[k]).map(k => `${k} ${r.byKind[k]}`).join(' · '), ...ids, ...err];
  for (const f of files) {
    out.push('', f);
    const mine = r.findings.filter(x => x.file === f), shown = new Map();
    for (const x of mine) {
      const k = (shown.get(x.kind) || 0) + 1; shown.set(x.kind, k);
      if (k <= SHOW) out.push(`  ${x.line ? 'l' + x.line : 'file'} ${x.kind}: ${x.text} → ${x.home}`);
    }
    for (const [k, n] of shown) if (n > SHOW) out.push(`  … ${n - SHOW} more ${k} notes in this file (--json lists every one)`);
  }
  return out.join('\n');
}

function main(argv) {
  const [mode, ...rest] = argv;
  const opt = k => { const i = rest.indexOf(k); return i < 0 ? undefined : rest[i + 1] ?? ''; };
  const root = opt('--root') ?? process.cwd(), skip = opt('--skip') ?? '';
  if (mode !== 'detect' || !root || opt('--skip') === '') {
    console.error('usage: node .claude/borg.mjs detect [--deep] [--json] [--root <repo path>] [--skip "<folder/> <file>"]');
    return 2;
  }
  if (!fs.existsSync(root) || !git(root, 'rev-parse', '--show-toplevel')) { console.error(`borg: ${root} is not in a git repo.`); return 2; }
  const r = detect(root, { deep: rest.includes('--deep'), skip });
  console.log(rest.includes('--json') ? JSON.stringify(r, null, 2) : format(r));
  return 0;
}

const self = fileURLToPath(import.meta.url);
const same = (a, b) => { try { a = fs.realpathSync(a); b = fs.realpathSync(b); } catch {} return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b; };
if (import.meta.main ?? (!!process.argv[1] && same(path.resolve(process.argv[1]), self))) process.exitCode = main(process.argv.slice(2));
