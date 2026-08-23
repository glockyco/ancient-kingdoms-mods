# Fix the stat name shown for physical damage

## Why

Every skill page with a Physical damage type shows a mitigation formula naming a stat that does
not exist in the game:

```
Mitigation: −ceil(dmg × clamp(target.physicalResist × 0.0005, 0, 0.9))
```

The game uses `defense`. `server-scripts/Combat.cs:680-682` reads
`Mathf.Clamp((float)combat.defense * 0.0005f, 0f, 0.9f)` for `DamageType.Normal`, and the property
is declared `public int defense` at `Combat.cs:160-170`. A search of the current server scripts and
all three archived versions (0.9.27.2, 0.9.28.0, 0.9.28.1) finds no `physicalResist` or
`physical_resist` anywhere. The database agrees: `monsters`, `npcs`, `pets`, and `monster_spawns`
all carry a `defense` column and no physical-resist column.

The name is fabricated by string concatenation.
`website/src/routes/skills/[id]/+page.svelte:2013-2018` renders
`target.${resistType === "melee" ? "defense" : `${resistType}Resist`}`, so any `resistType` other
than the literal `"melee"` gets `Resist` appended to it.

Commit `5c2763d9` (2026-08-14, *fix: expose skill damage source types*) normalised the exported
enum `DamageType.Normal` to the string `Physical` and changed the page's mapping from
`if (dt === "Normal") return "melee"` to `if (dt === "Physical") return "physical"`. The template
was not changed with it, so the branch that produced `defense` stopped matching.

A second regression rides on the same mapping. `Combat.cs:502` routes `DamageType.Normal` to
`GetProbResistMeleeDamage`, which returns `blockChance + levelDiff − casterAccuracy`
(`Combat.cs:1310-1314`) and never reads a resist stat. Because the page branches on
`resistType === "melee"` at `:2032` and `:2036`, physical skills now render a **Resist Chance**
heading with `target.physicalResist × 0.0005` where they should render **Block/Miss Chance** with
the block formula.

The committed fixtures were right the whole time and caught both defects.
`website/test-fixtures/mechanics-snapshots/ambush.txt` records
`Mitigation: −ceil(dmg × clamp(target.defense × 0.0005, 0, 0.9))` followed by
`Block/Miss Chance`. 105 of 538 snapshots have been failing since the rename, and accepting them
with `--update` would have written the fabricated stat into the baseline.

## What Changes

- **Map each damage type to a stat name explicitly.** Replace the
  `${resistType}Resist` concatenation with a total lookup mirroring `Combat.cs:680-697`. Physical
  resolves to `defense`; the five elemental types keep their existing, correct names. A stat name
  is never assembled from a fragment again, so a future damage-type rename cannot silently invent
  another one.
- **Route physical damage to the block path.** Select the resist-chance branch from the damage
  type's game-side resist method rather than from a string comparison against `"melee"`, matching
  `Combat.cs:501-508`.
- **Correct the citations.** `website/CLAUDE.md` claims Physical maps to Defense on the authority
  of `server-scripts/Combat.cs:480-487` and `:1245-1274`. Neither region supports it: `:480-487` is
  an invulnerability gate, and `:1245-1274` is RPC serialization. The real evidence is
  `Combat.cs:680-697`. The table also says "Physical (melee debuff)", understating the stat, since
  `Combat.cs:681` applies Defense to all physical damage rather than only to debuffs.
- **Record that Markdown citations are unverified.** The citation checker tracks `.cs` targets
  cited from source files only; `citations.lock.json` contains no entry for `Combat.cs:480-487`
  despite `website/CLAUDE.md` having cited it. So this citation was never wrong-but-green, it was
  never checked. That gap belongs to the agent-docs check being added separately, and is noted
  there.
- **No snapshot update.** The fix must restore all 105 snapshots to their committed text exactly.
  That is the acceptance test.

## Capabilities

### New Capabilities

- `skill-mechanics-card`: The mechanics card rendered on each skill page. Covers the requirement
  that every stat, formula, and constant it displays corresponds to the game's own implementation,
  and that the damage type determines both the mitigation stat and the avoidance formula.

### Modified Capabilities

None.

## Impact

- **Code:** `website/src/routes/skills/[id]/+page.svelte` — the damage-type mapping and the two
  render sites that consume it.
- **Content:** 105 of 538 skill pages regain the correct stat name; physical skills regain the
  Block/Miss Chance heading and formula.
- **Docs:** `website/CLAUDE.md` damage-type table citations, and `citations.lock.json`.
- **Tests:** no new fixtures. `node scripts/snapshot-mechanics.mjs` must report zero changed.
- **Not changed:** `mods/BetterBestiary/Skills/SkillEffectExtractor.cs` keeps exporting `Physical`.
  The exported vocabulary is fine; only the website's use of it was wrong.
- **Player-facing naming is out of scope.** The game shows this stat as `AC` in inspection and
  equipment text (`Monster.cs:3632`, `Pet.cs:3608`, `EquipmentItem.cs:551,555`), while the
  character sheet binds it through a `defenseText` field whose label lives in a Unity asset rather
  than in source. The mechanics card deliberately prints internal names, matching `target.magicResist`
  and the rest, so it prints `defense`. Whether the card should switch to player-facing labels is a
  separate question.
