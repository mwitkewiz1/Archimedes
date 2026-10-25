# app/js area note lines replaced in 2026-10

Replaced 2026-10-25 when the item-list scripts moved to the private build and Import came in:
- core/catalog-data.js is generated from his item list by a script kept off this public repo: never hand-edit it, and
  never let text from the list into it. [check tests/catalog.test.mjs] holds every row to a kind id and numbers.
- That script is private/catalog.py, in the ignored private/ folder; its README says how to rebuild.
  [check tests/private.test.mjs] fails if anything in private/ is ever tracked.
- Curve numbers typed on Our pumps live on that phone only, under 'pumpCurves' keyed by the catalog row's id, and
  win over the list's estimate. A regenerated catalog-data.js can renumber rows: keep row order stable, or those
  saved numbers land on the wrong pump.
