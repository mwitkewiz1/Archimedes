# Archimedes

Field math and know-how for pipe, pumps, valves and wiring, written for someone who knows engines, not pumps or electricity.
app/ is an offline phone web app. First tool: a tape-measure fraction calculator and a cut-and-fuse planner for HDPE, with fusing loss measured by pipe size and DR.
Matthew uses it; Claude writes it. Then: electrical (diagrams, amps, volts, wire size, phases), pumps and valves.

## Rules
- Phone first, offline first: one hand, gloves, no signal. 44pt+ tap targets, no hover. [proposed 2026-10-17]
- For a beginner: plain words, a picture where a picture helps, every number shown the way a tape reads. [proposed 2026-10-17]
- Exact math: lengths are fractions (app/js/core/measure.js), never floats; round only when showing. [check tests/math.test.mjs]
- app/js/core/ stays pure (no DOM, no storage) so the node tests cover it. [proposed 2026-10-17]
- Boring tech: plain HTML, CSS and ES modules; no build step, no framework. When any file in app/ changes, bump VERSION in app/sw.js. [proposed 2026-10-17]
- A code file in app/ is at most 600 lines (tests/growth.test.mjs). Never raise the number: that is Matthew's call. [check tests/growth.test.mjs]
- Work data lives on the phones and in the private build, never in this repo: no pump list, gathered curve numbers, backups or anything else from his employer. The repo holds code, general know-how and blank templates; Backup and Import (app/js/core/backup.js) carry the data between a phone and the private build. tests/private.test.mjs keeps backups and data files out. [proposed 2026-10-25]
- Done means Matthew used it and said so. [proposed 2026-10-17]
- Checks: node --test "tests/*.test.mjs" [check 2026-10-17]
- Push: main once Checks pass, read back first and on a typed yes (docs/decisions.md, areas house and repo). The repo is public: nothing private in it. [proposed 2026-10-17]
- Named: none
- Public: yes

## Where things live
| File | Read when |
|---|---|
| wip.md | the digest shows its Next, Needs and Open; open it to work an item |
| .github/workflows/pages.yml | you change how the app goes online: every push to main runs the checks, then publishes app/ to GitHub Pages |
| private/ | never: the item-list scripts moved to the private build, which builds your data file. The folder stays ignored by git, never committed (tests/private.test.mjs) |
| docs/decisions.md | you need a past owner ruling: grep by area, never read whole |
| app/js/core/ | the math: measure.js (fractions, tape numbers), expr.js (calculator), entry.js (the calculator's line: fraction boxes and cursor), cut.js (cut-and-fuse planner), fusion.js (pipe sizes, DR, fusing loss), ohm.js (volts, amps, ohms, watts), wire.js (copper wire size: amps and voltage drop), motor.js (motor full-load amps from the code tables; breaker, overload, generator), plate.js (motor nameplate: what each box means, the plate against the supply, what it hands Motor amps), phase.js (single and three phase: waves, motor field, power; services' meter readings; imbalance and derating), symbols.js (diagram symbols: drawings, plain words, search), resistor.js (color bands both ways, series and parallel, watt size), diode.js (LED resistor, a relay coil's kick, AC into DC, meter readings), pump.js (pump curve, pipe friction, duty point), kinds.js (how each kind of pump works: steps, parts, failures), choose.js (Which pump? rules of thumb), trouble.js (troubleshooter: symptoms, causes, checks, fixes), lift.js (duplex lift station: floats, relays, alternator, alarm, and its ladder as data), catalog.js (Our pumps: names, search, estimated curves, your data file's list laid over) over catalog-data.js (generated: kind and numbers only, frozen), backup.js (the Backup and Import file: check it, merge it), valve.js (kinds of valves, which for which job), control.js (pilot-operated control valves: the jobs, the three checks), adjust.js (a pressure reducer over a minute: setpoint and speed needles), vtrouble.js (valve troubleshooter) |
| app/js/ui/ | the screens: calc.js, cut.js and fusion.js (Fusion tab: cut and fuse, fusing loss), pipes.js (measured pipes on this phone), draw.js (pipe picture), ohm.js, wire.js, motor.js, plate.js, phase.js, symbols.js, resistor.js, diode.js and diodeart.js (Electric tab tools), pump.js and curve.js (Pumps tab: pump curve), kinds.js and pumpart.js (Pumps tab: how pumps work, animated cutaways), trouble.js (Pumps tab: troubleshoot), catalog.js (Pumps tab: Our pumps), lift.js and liftart.js (Pumps tab: lift station, well, ladder and power side), valve.js and valveart.js (Valves tab: kinds, cutaways and the control valve drawing), control.js, adjust.js and vtrouble.js (Valves tab: control valves, adjust, troubleshoot), subnav.js (the tool switch on Fusion, Electric, Pumps and Valves), menu.js (the ☰ tab: every tool, Import / export, Setup), help.js (how to type numbers); helpers el.js (builds elements), frac.js (every fraction shown stacked, as hand-written) and store.js (settings on this phone) |
