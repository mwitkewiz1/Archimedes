---
name: handoff
description: Hand off this job in this repo. The same job as wrap, under its other name. Use when Matthew types /handoff or says "handoff" or "hand it off". Follows the wrap skill's steps exactly (.claude/skills/wrap/SKILL.md): files new notes, rewrites your Next block so a fresh session can pick up, runs the card's Checks:, commits and pushes as the card's Push: says, and replies in the house temper.
---

# handoff: the wrap job under its other name

"wrap" and "handoff" mean the same job (house.md, Ending a job). Read `.claude/skills/wrap/SKILL.md`
and follow it step by step, now. There is no second version of the steps; this file only gives the job its own command.

Its step 3 is what makes it a handoff: your `## Next` block in `wip.md` says where the job stopped and the
next step, so a fresh session can pick up from there.
