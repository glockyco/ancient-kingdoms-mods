---
description: Read the engine's own combination of a monster stat when querying the monsters table, before using a scalar column.
condition: "(?i)from\\s+monsters\\b"
scope: "tool"
interruptMode: "never"
---
Read the curve columns with the spawn's own values, and read the engine for how it combines them.

## The trap

A scalar column on `monsters` is sampled at one level with one spawn's values, so reusing it for
another spawn is wrong twice over. The curve alone is not the answer either, because a stat can take a
term from a different stat. Spawn variants differ in level, health, defense and each resistance, and
those values live in `monster_spawns`.

## Authorities

| Claim | Owner |
|---|---|
| how the engine combines a combat stat | `server-scripts/Combat.cs:blockChance` and its siblings |
| block chance, as the website computes it | `website/src/lib/utils/monster-stats.ts` |

Read the owner rather than recalling the formula, and check whether an owner already exists before
computing a stat again.

## Exceptions

Reporting the canonical row as the prefab defines it, rather than a spawn. Say which spawn a figure
describes.

## Incident

A published block chance used a base curve without the term the engine adds, understating the level 55
training dummy by a factor of 2.6. That dummy is the gear planner's default target, so the error would
have reached every ranking it published.
