## Why

Some published values are neither exported from the game nor derived from an export. They are written
by hand, and some of them restate a rule the game enforces. Nothing checked them, so two of them were
wrong for as long as they have existed.

`exported-data/classes.json` lists the races each class accepts. The game holds that rule in its
character creator, one block per race, enabling or disabling each class button. The curated table said
an Elf cannot be a Ranger and that a Dark Elf can be a Druid. The game says the opposite in both cases,
so two class pages told a reader the wrong thing. A reader following the site would have created a
character the game refuses, or missed a combination the game allows.

The defect was found by reading the creator for another purpose, not by any check. That is the gap: a
curated value that restates a game rule has no owner and no gate, and a game update can change the rule
without anything noticing.

## What Changes

- Introduce a capability for curated values that restate a game rule: how such a value is checked
  against the game's own definitions, what a disagreement means, and where the check may run.
- The check is a reader plus a command. It reads the rule from the local decompiled snapshot, compares
  it against the published value, and fails while naming both sides of each disagreement.
- The check stays out of the build. The decompiled snapshot is gitignored, so a checkout without one
  would otherwise produce a compendium with no races at all.
- The reader carries a source citation, so a game update that moves the region is reported by the
  existing citation gate rather than silently believed.
- Record the check in the per-version update procedure and in the exporter policy, so the next patch
  runs it and a reader knows the file is curated rather than exported.

## Capabilities

### New Capabilities

- `curated-data-parity`: how a published value written by hand is checked against the game's own
  definitions, so a curated restatement of a game rule cannot drift from the rule it restates.

### Modified Capabilities

None. `game-data-export` owns what an exporter reads from the running game and what absence means
there, and this value is not exported. `compendium-build` owns reproducibility and the separation
between reading data and publishing it, and a parity check changes neither. `source-citations` owns
whether a recorded reference still resolves and still carries its claim, which this check depends on
without changing.

## Impact

- **Added:** `build-pipeline/src/compendium/class_races.py` reads the pairing from the character
  creator and compares it against the published table. `build-pipeline/src/compendium/commands/class_races.py`
  exposes it as `compendium classes check-races`. `build-pipeline/tests/test_class_races.py` covers the
  reader and the comparison with hermetic sources.
- **Changed:** `exported-data/classes.json` now agrees with the creator for all six classes.
  `website/src/lib/utils/classes.ts` no longer translates a faction identifier into a race name.
- **Changed:** `citations.lock.json` gains the anchor for the creator region the reader depends on.
- **Changed:** `.agent/skills/update-game-version/SKILL.md` and
  `.agent/skills/export-game-data/SKILL.md` record the check and the curated file it guards.
- **Readers:** two class pages now list the races the game allows. Ranger gains Elf. Druid loses
  Dark Elf.
- **Unchanged:** the database schema, the published class page layout, and every other exported table.
