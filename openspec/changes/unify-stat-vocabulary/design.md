## Context

`plan-shared-game-model` decides that every fact has one owner and that the stat vocabulary is the first shared contract. This change implements the stat part of that contract. Mechanic predicates such as stun, root and ward are the other part. They move to the effect lookups change, because those lookups are their first new consumer and the three current definitions do not disagree on any page today.

### What the game has

- 28 summed stats. Each is a sum over components that implement `ICombatBonus`, `IHealthBonus`, `IManaBonus` or `IEnergyBonus` (`server-scripts/ICombatBonus.cs:1-32`): the six attributes, maximum Health, Mana and Rage, their three regeneration rates, Attack Power, Spell Power, Armor Class, five resists, Block Chance, Accuracy, Critical Chance, Critical Resist, Haste, Spell Casting Haste, Fear Resist and Movement Speed.
- Four effects that are not summed. The engine reads them from individual buffs at hit or cast time: ward (`server-scripts/Combat.cs:1247-1293`), damage shield (`:921-1004`), heal on hit (`:895-916`) and cooldown reduction (`server-scripts/TargetBuffSkill.cs:281-303`).
- Two sets of names, read in the running game in the English locale:
  - Item tooltips. `ScriptableItem.LocalizedStatLabel` maps 28 English labels to localization keys under `item.stat.` (`server-scripts/ScriptableItem.cs:269-302`), and each key's English text equals its input, such as Hit Points, AC, Health Regen and Critical Chance. An item comparison calls a weapon's damage Base Damage and any other item's Attack Power (`server-scripts/EquipmentItem.cs:557`).
  - The character window. Its titles are bound to entries of `Localization_String_Table`, such as `defense` for Armor Class, `critical_strike` for Critical Strike, `hp_regen` for Health Regeneration and `movement_speed` for Movement Speed. The attribute titles are stored in capitals. The pool title and its regeneration title are set by code from `mana` or `rage` and from `mana_regen` or `rage_regen` (`server-scripts/UICharacterInfo.cs:259-280`). Only the HP title is fixed text in the window.
- Formats. The window shows a fraction as the value times 100 with at most two decimals and a percent sign, and pools with thousands separators (`server-scripts/UICharacterInfo.cs:253,290-312`). Item tooltips format fractions the same way (`server-scripts/EquipmentItem.cs:461-467`).

### What the repository has

- Five key vocabularies for the same stats: item keys (`damage`, `health_bonus`, `resist_fear_chance`), skill columns (`damage_bonus`, `health_max_bonus`, `fear_resist_chance_bonus`), class and pet curve columns (`base_damage_value`), calculator inputs (`maxHealth`, `magicDamage`, `website/src/lib/calculation/inputs.ts:26-113`) and pet stat ids (`website/src/lib/types/pets.ts:93-104`).
- Names typed by hand in `website/src/lib/terminology.ts:12-49`, `build-pipeline/src/compendium/denormalizers/items/tooltips.py:16-52`, `website/src/lib/skills/skill-scaling.ts:12-343`, `website/src/routes/professions/scroll_mastery/+page.server.ts:88-109`, `website/src/lib/queries/pets.server.ts:31-43`, `website/src/lib/skills/effect-calculations.ts:197-250`, `website/src/lib/utils/formatSkillEffect.ts:198-235,820-960`, `website/src/routes/monsters/+page.svelte:125-137,201-210`, `website/src/routes/npcs/[id]/+page.svelte:707-722`, `website/src/lib/components/EntityCombatSummary.svelte:155,168,183`, `website/src/lib/components/MercenaryDetail.svelte:346-353`, `website/src/routes/mechanics/mercenary-stats/+page.svelte:54-67` and the hand-written labels of `website/src/routes/skills/[id]/+page.svelte:327-1316`.
- Key lists in `website/src/lib/constants/stats.ts:5-61` and `website/src/lib/constants/items.ts:5-11`, and the item page's own percentage list (`website/src/routes/items/[id]/+page.svelte:92-118`).
- Seven percent formatters (`website/src/lib/utils/format.ts:7`, `website/src/lib/calculation/format.ts:14`, `website/src/lib/utils/formatSkillEffect.ts:259`, `website/src/lib/skills/skill-format.ts:54`, and the local ones in `routes/npcs/[id]`, `routes/professions/adventuring`, `routes/professions/fishing` and `routes/professions/treasure_hunter`) and five number formatters (`calculation/format.ts:6`, `skills/skill-format.ts:50`, `utils/formatSkillEffect.ts:254`, `routes/monsters/+page.svelte:218`, `routes/quests/[id]/+page.svelte:72`).
- The block cap and the block gain per Armor Class point copied in `website/src/lib/utils/monster-stats.ts:8-9` and `website/src/lib/calculation/combat.ts:98-100`.
- The item list prints a fraction stat raw (`website/src/routes/items/+page.svelte:400`), so 5% Critical Chance shows as 0.05.
- The `formula-presentation` spec requires the character window's names for character stats and allows the item tooltip's names in item stat lists. The site follows that rule in most places, but not everywhere.

## Goals / Non-Goals

**Goals:**

- One catalogue of stats, owned by the exporter, read by the pipeline and the website.
- Every name comes from the game, or from a recorded site override with a reason.
- One stat formatter that formats like the game, and one percent and one number formatter for other values.
- Every copy listed above is deleted.
- The item list shows percentages.

**Non-Goals:**

- Mechanic predicates. They land with the effect lookups.
- Computing a character's stats. The planner does that later from this catalogue.
- Renaming calculator input keys. Their stored values move once into the character model, in the character change.
- Changing what a page shows beyond stat names and number formats.

## Decisions

### 1. The exporter owns the catalogue

A `StatCatalog` in `mods/DataExporter` declares each stat once:

- its id
- the export fields that feed it, by source: item, augment, armor set, skill, class curve and mercenary curve
- for each field, the kind of modifier: flat, percent of the stat, amount per second, or percent of the maximum per second
- its value type, display format and clamp
- the game label keys of its names

The catalogue refers to the export models' properties with `nameof`, so renaming an export key without updating the catalogue fails to compile. A test fails when a numeric stat property of the item or skill export model has no catalogue entry, or has two. A new `StatExporter` writes `stats.json`.

Clamps and display formats are code constants in the game. The catalogue is their single cited copy, as `ProgressionRows.cs` is for progression, and the citation check keeps the citations current.

Alternatives considered:

- A hand-written TypeScript registry. It would copy the names by hand, and C# and Python would keep their own lists.
- A curated JSON file. Nothing would tie it to the game fields, so a renamed field would go unnoticed.

### 2. Ids name the stat, not a bonus field

The ids are `strength`, `constitution`, `dexterity`, `intelligence`, `wisdom`, `charisma`, `health`, `mana`, `rage`, `health_regen`, `mana_regen`, `rage_regen`, `attack_power`, `spell_power`, `armor_class`, `magic_resist`, `poison_resist`, `fire_resist`, `cold_resist`, `disease_resist`, `block_chance`, `accuracy`, `critical_chance`, `critical_resist`, `haste`, `spell_haste`, `fear_resist`, `movement_speed`, `ward`, `damage_shield`, `heal_on_hit` and `cooldown_reduction`.

The character format and share links store these ids, so they stay fixed. A renamed game field changes a catalogue mapping, not an id.

### 3. Both game names, read from the game

Each stat has two names: `name`, as the character window shows it, and `item_name`, as `LocalizedStatLabel` returns it. The exporter reads both in the English locale when it runs:

- `item_name` comes from `LocalizedStatLabel`.
- `name` comes from the `Localization_String_Table` entry that the window binds to the stat's title, or that its code sets. The catalogue records that key, and the export fails when the table lacks it.
- The window spells the attribute and pool titles in capitals. The catalogue takes the label code's capitalization for them, such as Strength and Mana.
- The window's HP title is fixed text. Following the owner's decision, `health` takes the label code's Hit Points in both contexts.

Weapons name their damage Base Damage (`server-scripts/EquipmentItem.cs:557`), so the catalogue carries that as the weapon name of the item `damage` field.

A site override carries its reason in the catalogue. The four hit-time effects appear in neither window. Their names are site names, recorded as overrides with that reason.

### 4. Format like the game

The display formats follow the game's display code:

- Fractions show as the value times 100, with at most two decimals and no trailing zeros.
- Attributes, pools, Attack Power, Spell Power, Armor Class and resists show as whole numbers with thousands separators.
- Regeneration and Movement Speed show at most two decimals.

The website keeps one stat formatter, `formatStat(id, value, { signed })`. Item bonuses show a sign and totals do not.

For values that are not stats, such as drop chances and durations, one `formatPercent(value, { decimals })` and one `formatNumber(value)` replace the local copies. Each page keeps the precision it shows today by passing it, so these pages do not change. Negative values keep the true minus sign that the calculators use.

### 5. The website reads a generated module

The pipeline loads `stats.json` into a `stats` table and a `stat_fields` table. A `prebuild` script writes `website/src/lib/generated/stat-vocabulary.ts` from the database: a `StatId` union, the entries, and the field map. The module is committed, as `home-counts.ts` is, so `svelte-check` and knip pass in a clean checkout. Components import it synchronously. The pipeline reads the tables.

Alternatives considered:

- Layout data on every page. It would add the catalogue to the data of every prerendered page.
- Asking sql.js in the browser. Labels would turn asynchronous in components that render synchronously.

### 6. Every copy is deleted in this change

Each consumer listed under Context switches to the catalogue or the shared formatters, and its copy is deleted in the same task. `inputs.ts` keeps its keys until the character change, and maps each input to a stat id for its label. When the change is done, no stat name or percent decision remains outside the catalogue, except in prose.

## Wording

The owner approved this section. A character context uses the window name and an item stat list uses the item name, as `formula-presentation` already requires. The last column lists the wordings that go away. Task 1.1 read these names in the running game.

The catalogue covers stat fields only. A skill's own effects keep their wording, such as the damage a scroll deals, its healing, cooldown or stun chance. The scroll mastery page's "Damage" and "Damage %" are such effects and do not change.

| Stat | Character window | Item tooltip | Wordings that change |
| --- | --- | --- | --- |
| Six attributes | Strength and so on | Same | None |
| `health` | HP, short for Hit Points | Hit Points | Health, Max Health, Maximum Health, max hp. All become Hit Points |
| `mana` | Mana | Mana | Max Mana. Becomes Mana |
| `rage` | Rage | Rage | Rage Points, Max Rage, max rage. All become Rage |
| `health_regen` | Health Regeneration | Health Regen | Health/sec, Health %/sec, hp/s |
| `mana_regen` | Mana Regeneration | Mana Regen | Mana/sec, Mana %/sec |
| `rage_regen` | Rage Regeneration | None | Rage %/sec |
| `attack_power` | Attack Power | Attack Power, Base Damage on weapons | Attack Power bonus |
| `spell_power` | Spell Power | Spell Power | None |
| `armor_class` | Armor Class | AC | None |
| Five resists | Magic Resist and so on | Same | Magic resistance, Magic resist |
| `block_chance` | Block Chance | Block Chance | Block chance, block |
| `accuracy` | Accuracy | Accuracy | None |
| `critical_chance` | Critical Strike | Critical Chance | crit |
| `critical_resist` | Critical Resist | Critical Resist | None |
| `haste` | Haste | Haste | Attack speed |
| `spell_haste` | Spell Casting Haste | Spell Casting Haste | Spell Haste, Cast speed |
| `fear_resist` | Not shown | Fear Resist | None |
| `movement_speed` | Movement Speed | None | Movement speed |

A modifier that is not a flat amount names its kind after the stat. A percent of the stat is "Attack Power %" or "Hit Points %". A percent of the maximum each second is "Health Regeneration, % of Hit Points". A page may still describe a negative Health Regeneration from a debuff as damage over time.

The pools take the game's names: Hit Points, Mana and Rage. The window abbreviates Hit Points as HP, and the game's label code writes it in full. Prose follows the same names, so "maximum Health" becomes "maximum Hit Points". The owner chose this over "Maximum Health", "Maximum Mana" and "Maximum Rage", which would have been site overrides.

## Risks / Trade-offs

- [Wording changes reach many pages] The table above is the full list, and no page changes before it is approved. A prerender comparison before and after shows that only approved wordings and formats differ.
- [The game renames a localization key] The export fails on the missing key, and the catalogue follows the window's new binding.
- [The generated module goes stale] `prebuild` regenerates it, and the game update procedure commits it with the other generated modules.
- [A field gains a second meaning in a game update] The completeness test fails when a new numeric export field has no catalogue entry.

## Migration Plan

1. Read the names in the game, and approve the wording table.
2. Add the catalogue to the exporter. Run a real export, and check that the item and skill exports are unchanged apart from the new file.
3. Load the catalogue, and generate the module.
4. Migrate consumers by page family. Each step deletes its copies and is checked in a browser.
5. Compare the prerendered pages with the previous build.

Rollback is a revert. The change adds tables and a file, and alters no stored data a reader depends on.

## Open Questions

- None.
