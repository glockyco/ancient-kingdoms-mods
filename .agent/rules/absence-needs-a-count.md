---
description: Read a count before concluding that a value is absent, when querying the compendium database.
condition: "\\.fetchone\\(\\)|\\bLIMIT\\s+1\\b"
scope: "tool"
interruptMode: "never"
---
One row is not evidence about the rest of the table. Read a count, or run the same query against a case
known to hold the value.

## Why

An empty result looks the same whether the data is absent or the query is wrong. A denormalised table
often holds one summary row while the detail lives in a second table.

## Use

Ask which table owns the detail. Here a monster's per-spawn values live in `monster_spawns`, not in
`monsters`.

## Exceptions

A lookup by primary key. The rule is about concluding absence.

## Incident

One row in `monsters` was read as proof that five training-dummy spawns did not exist. A correct design
document was nearly rewritten to match the wrong reading.
