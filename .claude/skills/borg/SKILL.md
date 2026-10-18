---
name: borg
description: Assimilate the docs' growth in this repo. Use when Matthew says "assimilate", "borg" or /borg; as the night job when night mode is on and he named no other job; or in a session where he names no job and the digest shows Borg work. Never inside another job, never after a wrap. Moves each note to its one home, keeps every fact, runs the checks, commits "borg: ...", and replies in the house temper.
---

# borg: assimilate growth

Docs grow while work happens; that is fine. This job puts the growth where it belongs.
It is its own job, never run inside another. Every fact stays; only its place changes.

1. **Find the work.** `node .claude/borg.mjs detect --deep`. Each note names a file, a line and
   its home. Nothing found: say so in a line and stop. Check `git status` too: a file another
   session has uncommitted changes in is theirs; leave it.

2. **Take one bite at a time.** Biggest file first, one file or one kind of note per pass, one
   commit each. Whatever is left waits for the next run.

3. **Move each note to its home**, per the table in house.md. The kinds the table doesn't name:
   - history (a log section, a done mark, a dated event, a was/now line, struck words): delete
     the marker, the date or the struck words, never the fact it sits on, since git keeps them;
     if it's worth keeping, move it word for word to `_archive/YYYY-MM-<topic>.md` and leave a
     pointer;
   - a line with his words or attribution is a ruling, never history: it goes to a decisions
     row word for word;
   - the board: a done item goes (his words in it go to decisions first); a done step inside
     an open item goes and the item stays;
   - a duplicate: keep the copy in its home, a pointer everywhere else;
   - a dead name: check the code and `git log`, then fix it, or ask him once;
   - a split: the named section or topic becomes its own docs/ file, listed in the card's
     "Where things live".
   Never touch a file the card lists under `Borg skip:`.

4. **Keep every fact.** Never delete a live fact. Never change what a [matthew] or [confirmed]
   line means; protected lines move word for word and never vanish.

5. **Ask only what only he can rule on** (a ruling, a feel call, dropping his item). Each
   question answerable fast, with your default; it goes in the board's Needs Matthew. A note
   about many board items is one question, never one per item. Decide everything else yourself.

6. **Check.** Run the card's `Checks:` command, then `node .claude/house.mjs check`. Fix what
   this job caused. Run detect again to see what's left.

7. **Commit by filename.** Subject starts `borg: assimilated <what>`, then a `Why:` line and
   the attribution line the session gives you. If nothing needed moving, still mark the review:
   `git commit --allow-empty` with the subject `borg: reviewed growth, nothing to move` and a
   `Why:` line, so growth counts from here. Push as the card's `Push:` line says; night mode
   follows house.md and never pushes main.

8. **Reply in the temper** (house.md): what moved where, and anything that needs him.
