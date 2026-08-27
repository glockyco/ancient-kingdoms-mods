---
description: Read the engine's own combination of a monster stat when querying the monsters table, before using a scalar column.
condition: "(?i)from\\s+monsters\\b"
scope: "tool"
interruptMode: "never"
---
Read the curve columns with the spawn's own values. Read the engine for how it combines them.

## Why

A scalar column on `monsters` is sampled at one level with one spawn's values. The curve alone is also
incomplete, because a stat can take a term from another stat. Spawn variants differ in level, health,
defense and each resistance, and those values live in `monster_spawns`.

## Use

| Claim | Owner |
|---|---|
| how the engine combines a combat stat | `server-scripts/Combat.cs:blockChance` and its siblings |
| block chance, as the website computes it | `website/src/lib/utils/monster-stats.ts` |

Check whether an owner exists before computing a stat again.

## Exceptions

Reporting the canonical row as the prefab defines it. Say which spawn a figure describes.

## Incident

A published block chance used a base curve without the term the engine adds. It understated the level 55
training dummy by a factor of 2.6, which is the gear planner's default target.
