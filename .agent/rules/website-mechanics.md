---
description: Preserve mechanics prose and snapshot contracts when editing website mechanics routes or their formatters.
globs:
  - "website/src/routes/mechanics/**/*.svelte"
  - "website/src/lib/mechanics/**/*.ts"
  - "website/scripts/snapshot-mechanics.mjs"
---
# Website mechanics

Use one statement per visible line. Do not join user-facing clauses with semicolons.

When a mechanics card changes intentionally, run the website build and `node scripts/snapshot-mechanics.mjs --update`. Inspect the changed visible text, then run the command without `--update`. Do not update snapshots to hide an unexplained output change.
