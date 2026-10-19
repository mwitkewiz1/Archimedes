---
paths:
  - "app/js/**"
---
# app/js: gotchas

- Typing rules the parser lives by (app/js/core/expr.js): a slash with no spaces is a fraction (3/32); divide is ÷ or
  " / " with spaces. A hyphen between a whole number and a fraction is a tape number (3-1/4 is three and a quarter);
  subtract is − or "- " with a space. Help screen (ui/help.js) says the same; change both together.
- The calculator line is items and a cursor (core/entry.js), saved whole under 'calcEntry'; the text form under
  'calcLine' only reads back finished fractions. Change the line through entry.js, never by string edits.
- Pipe sizes are arrays of [size, od], never objects: JS puts integer-like keys ('2', '4') ahead of '1/2', which
  scrambles the size list (core/fusion.js).
- Lengths are fractions {n, d} from core/measure.js. Don't do math on floats; format only at the end (formatInches).
- Settings on the phone sit under one localStorage key, 'archimedes' (ui/store.js). Saved state may come from an
  older version: fill new fields in on load (ui/cut.js does it for fuseFrom), never assume they exist.
- Joint dates use the phone's local day (toLocaleDateString('en-CA')), not toISOString, which is UTC and runs a day
  ahead in the evening.
- New or renamed file in app/: add it to FILES in app/sw.js and bump VERSION, or phones keep the old copy.
  [check tests/cache.test.mjs] catches a file missing from FILES; the VERSION bump is still on you.
- A tab with several tools gets a switch from ui/subnav.js and its routes in TAB_OF in app.js, so the tab stays lit.
- core/catalog-data.js is generated from his item list by private/catalog.py (ignored, never committed): never hand-edit it, and
  never let text from the list into it. [check tests/catalog.test.mjs] holds every row to a kind id and numbers.
- Every fraction shown on screen goes through pretty() in ui/frac.js, so all of them stack alike (docs/decisions.md, area
  ui). SVG text can't stack, so drawings put it in through richText() in ui/draw.js (HTML in a foreignObject). Left flat
  on purpose: dropdown options (the phone draws those) and Help's typing examples (they show what you type).
- el() skips null and false children, but the DOM's own replaceChildren() and append() print them as the word
  "null". Pass optional pieces to those as ...(cond ? [node] : []).
