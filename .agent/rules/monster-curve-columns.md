---
description: Read curve columns with the spawn's own values when querying monster stats, before using a denormalised scalar.
condition: "(?i)from\\s+monsters\\b"
scope: "tool"
interruptMode: "never"
---
A scalar column on `monsters` is sampled at one level with one spawn's values. Where `_base` and
`_per_level` columns sit beside it, read those and combine them with the spawn's own level and
defense.

## Why

- A monster's spawn variants differ in level, health, defense and resistance, and those per-spawn
  values live in `monster_spawns`.
- A scalar already folds in terms that vary per spawn, so reusing it for another spawn is wrong twice
  over.
- Some engine stats add a term from another stat, so the curve alone is not the answer either.

## Avoid

```python
con.execute("SELECT block_chance FROM monsters WHERE id='dummy'")   # 0.084, the level 50 spawn
```

## Use

Combine the curve with the spawn, then add whatever the engine adds:

```python
# block chance = clamp(base + per_level * (level - 1) + defense * 0.0001, 0, 0.8)
```

`website/src/lib/utils/monster-stats.ts` owns this one for the website. Check whether an owner
already exists before computing a stat again.

## Exceptions

Reporting the canonical row itself, as the prefab defines it, rather than a spawn. Say which spawn a
figure describes.

## Incident

A published block chance used the base curve without the defense term, understating the level 55
training dummy by a factor of 2.6. The dummy is the gear planner's default target, so the error
would have reached every ranking it published.
