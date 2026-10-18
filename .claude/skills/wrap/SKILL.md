---
name: wrap
description: Close out a job in this repo. Use when Matthew says wrap, handoff, /wrap, or "update the .md files and commit", when a job ends, or when the prompt line says context is too big. Files new notes to their homes, rewrites your Next block, deletes done items, runs the card's Checks:, commits with a Why: line, pushes as the card's Push: says, and replies in the house temper.
---

# wrap: close out this job

Run before the job's last commit. Stop at the first real problem and tell Matthew in plain words.
Big growth is the Borg's job (skill borg), not this one; never trim to make room.

1. **See what changed.** `git status` and `git diff --stat`. Only this job's files are yours;
   another session may be mid-work. Never stage logs, scratch, builds, secrets or private data.

2. **File each new note per the table in house.md**, in this commit. Replace, don't append.
   Protected lines move; they never vanish.

3. **Rewrite your own `## Next` block** in `wip.md`: bold title, where it stopped and the next
   step. Leave other jobs' blocks alone. Job finished: delete your block.

4. **Delete done items.** Finished Open items go (git keeps them). A Needs item he answered
   leaves once his answer is filed as a rule or row. An On the floor item leaves only on his
   words. New open work goes in Open, dated, with its home; a long brief goes in `wip/<slug>.md`.

5. **Run the card's `Checks:` command** on its own, after the doc edits. A failure means fix
   the cause. Never skip, silence or loosen a check. Then `node .claude/house.mjs check` and fix
   what your job touched.

6. **Commit by filename** (`git add <file>...`, never `-A`). Message: what changed in plain
   words, a `Why:` line, then the attribution line the session gives you. Unrelated work gets
   its own commit.

7. **Push as the card's `Push:` line says.** `git fetch` first; if the branch moved, merge,
   rerun Checks, then push. The Cooler (the pre-push check) names any fix; do it, never `--no-verify`.
   Confirm `git ls-remote origin <branch>` matches. If `Push:` says wait, don't push; say so.
   Night mode: never push main.

8. **Reply in the temper** (house.md). Lead with what's done, sized to the job. Then only what
   needs him, each question with your default. No recap, no file list. Night mode: the last
   reply is the ANSWER FIRST lines of wip/nightagent-N.md.

If the prompt line said the context is too big, wrap now and tell him to start a fresh session.
