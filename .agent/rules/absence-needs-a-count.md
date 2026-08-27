---
description: Prove absence with a count before concluding a value is missing, when querying one row from the compendium database.
condition: "\\.fetchone\\(\\)|\\bLIMIT\\s+1\\b"
scope: "tool"
interruptMode: "never"
---
A single row is not evidence about the rest of the table. Read a count, or run the same query
against a case known to hold the value, before concluding that something does not exist.

## Why

- A denormalised table often holds one summary row while the detail lives in a second table.
- An empty or single-row result looks identical whether the data is absent or the query is wrong.
- A conclusion of absence tends to be acted on immediately, so the mistake propagates before
  anything contradicts it.

## Avoid

```python
row = con.execute("SELECT * FROM monsters WHERE name LIKE '%dummy%'").fetchone()
# one row -> "there is only one dummy"
```

## Use

```python
n = con.execute("SELECT COUNT(*) FROM monster_spawns WHERE monster_id='dummy'").fetchone()[0]
# and check the sibling table before concluding anything about variants
```

Ask which table owns the detail. In this repository a monster's per-spawn values live in
`monster_spawns`, not in `monsters`.

## Exceptions

Fetching one row you already know is unique, such as a lookup by primary key. The rule is about
concluding absence, not about reading a known row.

## Incident

One row in `monsters` was read as proof that the five training-dummy spawn variants did not exist,
and a correct design document was nearly rewritten to match the wrong reading.
