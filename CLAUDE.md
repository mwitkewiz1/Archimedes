# Archimedes

Field math and know-how for pipe, pumps and wiring, written for someone who knows engines, not pumps or electricity.
app/ is an offline phone web app. First tool: a tape-measure fraction calculator and a cut-and-fuse planner for HDPE, with fusing loss measured by pipe size and DR.
Matthew uses it; Claude writes it. Next: electrical (diagrams, amps, volts, wire size, phases), then pumps.

## Rules
- Phone first, offline first: one hand, gloves, no signal. 44pt+ tap targets, no hover. [proposed 2026-10-17]
- For a beginner: plain words, a picture where a picture helps, every number shown the way a tape reads. [proposed 2026-10-17]
- Exact math: lengths are fractions (app/js/core/measure.js), never floats; round only when showing. [check tests/math.test.mjs]
- app/js/core/ stays pure (no DOM, no storage) so the node tests cover it. [proposed 2026-10-17]
- Boring tech: plain HTML, CSS and ES modules; no build step, no framework. When any file in app/ changes, bump VERSION in app/sw.js. [proposed 2026-10-17]
- A code file in app/ is at most 600 lines (tests/growth.test.mjs). Never raise the number: that is Matthew's call. [check tests/growth.test.mjs]
- No day-job data: nothing from his employer goes in this repo. [proposed 2026-10-17]
- Done means Matthew used it and said so. [proposed 2026-10-17]
- Checks: node --test "tests/*.test.mjs" [check 2026-10-17]
- Push: main once Checks pass, read back first and on a typed yes (docs/decisions.md, areas house and repo). The repo is public: nothing private in it. [proposed 2026-10-17]
- Named: none

## Where things live
| File | Read when |
|---|---|
| wip.md | the digest shows its Next, Needs and Open; open it to work an item |
| .github/workflows/pages.yml | you change how the app goes online: every push to main runs the checks, then publishes app/ to GitHub Pages |
| docs/decisions.md | you need a past owner ruling: grep by area, never read whole |
| app/js/core/ | the math: measure.js (fractions, tape numbers), expr.js (calculator), entry.js (the calculator's line: fraction boxes and cursor), cut.js (cut-and-fuse planner), fusion.js (pipe sizes, DR, fusing loss), ohm.js (volts, amps, ohms, watts), wire.js (copper wire size: amps and voltage drop), symbols.js (diagram symbols: drawings, plain words, search), pump.js (pump curve, pipe friction, duty point), kinds.js (how each kind of pump works: steps, parts, failures), choose.js (Which pump? rules of thumb), trouble.js (troubleshooter: symptoms, causes, checks, fixes), catalog.js (Our pumps: names, search, estimated curves) over catalog-data.js (generated: kind and numbers only) |
| app/js/ui/ | the screens: calc.js, cut.js, fusion.js (Fusing tab), pipes.js (measured pipes on this phone), draw.js (pipe picture), ohm.js, wire.js and symbols.js (Electric tab tools), pump.js and curve.js (Pumps tab: pump curve), kinds.js and pumpart.js (Pumps tab: how pumps work, animated cutaways), trouble.js (Pumps tab: troubleshoot), catalog.js (Pumps tab: Our pumps), subnav.js (the tool switch on Electric and Pumps), help.js; helpers el.js (builds elements), frac.js (every fraction shown stacked, as hand-written) and store.js (settings on this phone) |
