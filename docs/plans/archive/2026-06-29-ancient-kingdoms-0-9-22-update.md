---
title: "Ancient Kingdoms 0.9.22.2 Update Plan"
type: plan
status: implemented
created: 2026-06-29
parent:
superseded_by:
archived: 2026-06-30
---

# Ancient Kingdoms 0.9.22.2 Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Ancient Kingdoms mods, exporter, build pipeline, website, and generated compendium data for game version `0.9.22.2` without map screenshot or tile work.

**Architecture:** Treat the server-script diff as the source of truth, then update owned code only where the static compendium has hardcoded logic or data contracts that the export/rebuild cannot infer. The largest contract change is the new Critical Resist stat, which crosses DataExporter, build-pipeline schema/models/denormalizers, website item/skill display, and BetterBestiary's mirrored skill-effect formatter. Data-only balance changes are handled by the normal export and DB rebuild, with targeted checks after the export.

**Tech Stack:** C#/.NET DataExporter and MelonLoader mods, Python 3.12/uv build pipeline with SQLite, SvelteKit/Svelte 5 website, Vitest, xUnit, `build-tool`, `omp-plans`.

---

## Inputs and Constraints

- Target game version: `0.9.22.2`.
- Previous compendium version: `0.9.21.0`.
- Server scripts are available under `server-scripts-0.9.22.2/` (the seal target) and `server-scripts-0.9.22.1/`, with baseline under `server-scripts-0.9.21.0/`. The Critical Resist contract was derived from the 0.9.22.1-vs-0.9.21.0 diff.
- Hotfix `0.9.22.2`: the verified `0.9.22.2`-vs-`0.9.22.1` diff touches only `Pet.cs` and `Player.cs` — runtime mercenary AI/positioning and the Slayer gain chat-display fix. No exported-data, documented-mechanic, or Critical Resist contract impact. Task 5 export plus the snapshot/parity review stay the safety net.
- World/map changes are explicitly out of scope. Do not run `dotnet run --project build-tool export --update --screenshots`. Do not run `cd build-pipeline && uv run compendium tiles`. Do not edit `website/static/tiles/`.
- Versioned server scripts, `server-scripts/`, `exported-data/`, and `website/static/compendium.db` are generated or gitignored artifacts. Recreate them as needed, but do not force-add them.
- Update `website/src/lib/constants/version.ts` last, after data export, DB rebuild, manual content updates, mechanics snapshots, and targeted verification pass.

---

## File Structure

### DataExporter and runtime-adjacent C#

- Modify: `mods/DataExporter/Models/ItemData.cs` — add item stat field `critical_resist` to `ItemStats`.
- Modify: `mods/DataExporter/Exporters/ItemExporter.cs` — export `EquipmentItem.criticalResistBonus` and `AugmentItem.criticalResistBonus` into `stats.critical_resist`, and ensure augments initialize `itemData.stats` from their own stat fields.
- Modify: `mods/DataExporter/Models/SkillData.cs` — add `LinearStatBonusFloat critical_resist_bonus`.
- Modify: `mods/DataExporter/Exporters/SkillExporter.cs` — export `BonusSkill.criticalResistBonus`.
- Modify: `mods/DataExporter/Models/LuckTokenData.cs` — default/comment fragment drop chance as `0.05`.
- Modify: `mods/DataExporter/Exporters/LuckTokenExporter.cs` — export fatecharm fragment drop chance as `0.05f`.
- Modify: `mods/DataExporter/Exporters/NpcExporter.cs` — compute merchant role from at least one non-null sale item.
- Modify: `mods/BetterBestiary/Skills/SkillEffectInput.cs` — mirror `critical_resist_bonus`.
- Modify: `mods/BetterBestiary/Skills/SkillEffectExtractor.cs` — read `BonusSkill.criticalResistBonus`.
- Modify: `mods/BetterBestiary/Skills/SkillEffectFormatter.cs` — include Critical Resist in the same hit/chance modifier group as crit/accuracy/block/fear resist.
- Modify: `tests/DataExporter.Tests/ItemExporterSourceTests.cs` — add source-guard tests for the new exporter contracts.
- Regenerate and modify after export: `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json`.

### Build pipeline

- Modify: `build-pipeline/schema.sql` — add `skills.critical_resist_bonus TEXT` beside other stat-bonus JSON columns.
- Modify: `build-pipeline/src/compendium/models.py` — add `SkillData.critical_resist_bonus`, and set the `LuckTokenData.fragment_drop_chance` default/comment to `0.05`.
- Modify: `build-pipeline/src/compendium/denormalizers/skills/fixups.py` — include `critical_resist_bonus` in the skill bonus normalization list.
- Modify: `build-pipeline/src/compendium/denormalizers/items/calculations.py` — update item-level formula for Fear Resist and Critical Resist.
- Modify: `build-pipeline/src/compendium/denormalizers/items/tooltips.py` — add display name and placeholder replacements for `FEARRESISTBONUS` and `CRITICALRESISTBONUS`.
- Create: `build-pipeline/tests/test_item_stat_formulas.py` — cover item-level parity for Fear Resist and Critical Resist.

### Website

- Modify: `website/src/lib/terminology.ts` — add `critical_resist: "Critical Resist"`.
- Modify: `website/src/lib/constants/stats.ts` — add `critical_resist` to filterable stats, under Resistances.
- Modify: `website/src/routes/items/[id]/+page.svelte` — render `critical_resist` as a percentage stat and update Radiant Aether copy.
- Modify: `website/src/lib/types/skills.ts` — add `critical_resist_bonus: LinearValue | null`.
- Modify: `website/src/lib/types/monsters.ts` — add `critical_resist_bonus` where monster skill row typing mirrors skill-bonus fields.
- Modify: `website/src/lib/skills/skillRowToEffectInput.ts` — map `critical_resist_bonus` into formatter input.
- Modify: `website/src/lib/skills/skillsListQuery.ts` — select `s.critical_resist_bonus`.
- Modify: `website/src/lib/queries/classes.server.ts` — select and type `critical_resist_bonus` for class skill views.
- Modify: `website/src/lib/queries/pets.server.ts` — select and type `critical_resist_bonus` for pet/merc skill views.
- Modify: `website/src/routes/skills/+page.server.ts` — type/select `critical_resist_bonus` for the skills index.
- Modify: `website/src/routes/skills/[id]/+page.server.ts` — parse `critical_resist_bonus` for skill details.
- Modify: `website/src/routes/skills/[id]/+page.svelte` — show Critical Resist in scaling/stat blocks and mechanics cards.
- Modify: `website/src/lib/utils/formatSkillEffect.ts` — include Critical Resist in concise skill summaries.
- Modify: `website/src/routes/mechanics/combat/+page.svelte` — document effective crit chance with target Critical Resist.
- Modify: `website/src/routes/professions/slayer/+page.server.ts` and `website/src/routes/professions/slayer/+page.svelte` — clarify account-wide Slayer progression.
- Modify: `website/src/routes/professions/scroll_mastery/+page.svelte` — split scroll-craft and scroll-use mastery gain amounts.
- Modify: `website/src/lib/special-mechanics.ts` and `website/src/lib/special-mechanics.test.ts` — update Valaark/Dragonbait mechanics.
- Modify comments only: `website/src/lib/utils/alchemy.ts` and `website/src/lib/utils/cooking.ts` — update renamed server helper names while preserving formulas.
- Modify: `website/src/lib/utils/formatSkillEffect.test.ts` — add Critical Resist summary coverage.
- Modify after snapshot refresh: `website/test-fixtures/mechanics-snapshots/`.
- Modify last: `website/src/lib/constants/version.ts` — set `COMPENDIUM_VERSION = "0.9.22.2"`.

---

## Tasks

### Task 1: DataExporter contract updates

**Files:**
- Modify: `mods/DataExporter/Models/ItemData.cs`
- Modify: `mods/DataExporter/Exporters/ItemExporter.cs`
- Modify: `mods/DataExporter/Models/SkillData.cs`
- Modify: `mods/DataExporter/Exporters/SkillExporter.cs`
- Modify: `mods/DataExporter/Models/LuckTokenData.cs`
- Modify: `mods/DataExporter/Exporters/LuckTokenExporter.cs`
- Modify: `mods/DataExporter/Exporters/NpcExporter.cs`
- Modify: `tests/DataExporter.Tests/ItemExporterSourceTests.cs`

- [ ] **Step 1: Add failing exporter source guards**

Add assertions to `tests/DataExporter.Tests/ItemExporterSourceTests.cs` that fail until these strings exist in the exporter/model source:

```csharp
Assert.Contains("public float critical_resist { get; set; }", itemDataSource);
Assert.Contains("critical_resist = equipItem.criticalResistBonus", itemExporterSource);
Assert.Contains("critical_resist = augmentItem.criticalResistBonus", itemExporterSource);
Assert.Contains("public LinearStatBonusFloat critical_resist_bonus { get; set; }", skillDataSource);
Assert.Contains("critical_resist_bonus = new LinearStatBonusFloat { base_value = bonusSkill.criticalResistBonus.baseValue, bonus_per_level = bonusSkill.criticalResistBonus.bonusPerLevel }", skillExporterSource);
Assert.Contains("fragment_drop_chance = 0.05f", luckTokenExporterSource);
Assert.Contains("saleItems.Any(item => item != null)", npcExporterSource);
```

Use separate local variables loaded from the exact source files:

```csharp
var repoRoot = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..");
var itemDataSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Models", "ItemData.cs"));
var itemExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "ItemExporter.cs"));
var skillDataSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Models", "SkillData.cs"));
var skillExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "SkillExporter.cs"));
var luckTokenExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "LuckTokenExporter.cs"));
var npcExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "NpcExporter.cs"));
```

- [ ] **Step 2: Run the failing DataExporter tests**

Run:

```bash
dotnet test tests/DataExporter.Tests/DataExporter.Tests.csproj
```

Expected before implementation: fails on the new source guards.

- [ ] **Step 3: Export Critical Resist item and augment stats**

In `mods/DataExporter/Models/ItemData.cs`, add this property to `ItemStats` next to the other combat percentage stats:

```csharp
public float critical_resist { get; set; }
```

In `mods/DataExporter/Exporters/ItemExporter.cs`, add this assignment inside the `EquipmentItem` stats initializer, next to `critical_chance` and `resist_fear_chance`:

```csharp
critical_resist = equipItem.criticalResistBonus,
```

In `PopulateAugmentFields`, initialize `itemData.stats` from the `AugmentItem` stat fields instead of relying on `PopulateEquipmentFields`. Mirror the existing equipment stat names and include the new field:

```csharp
itemData.stats = new ItemStats
{
    strength = augmentItem.strengthBonus,
    constitution = augmentItem.constitutionBonus,
    dexterity = augmentItem.dexterityBonus,
    charisma = augmentItem.charismaBonus,
    intelligence = augmentItem.intelligenceBonus,
    wisdom = augmentItem.wisdomBonus,
    health_bonus = augmentItem.healthBonus,
    hp_regen_bonus = augmentItem.hpRegenBonus,
    mana_bonus = augmentItem.manaBonus,
    mana_regen_bonus = augmentItem.manaRegenBonus,
    energy_bonus = augmentItem.energyBonus,
    damage = augmentItem.damageBonus,
    magic_damage = augmentItem.magicDamageBonus,
    defense = augmentItem.defenseBonus,
    magic_resist = augmentItem.magicResistBonus,
    poison_resist = augmentItem.poisonResistBonus,
    fire_resist = augmentItem.fireResistBonus,
    cold_resist = augmentItem.coldResistBonus,
    disease_resist = augmentItem.diseaseResistBonus,
    block_chance = augmentItem.blockChanceBonus,
    accuracy = augmentItem.accuracyBonus,
    critical_chance = augmentItem.criticalChanceBonus,
    critical_resist = augmentItem.criticalResistBonus,
    haste = augmentItem.hasteBonus,
    spell_haste = augmentItem.spellHasteBonus,
    resist_fear_chance = augmentItem.resistFearChanceBonus
};
```

Keep `augment_armor_set_name`, `augment_armor_set_item_ids`, `augment_skill_bonuses`, and `augment_is_defensive` population unchanged.

- [ ] **Step 4: Export Critical Resist skill bonuses**

In `mods/DataExporter/Models/SkillData.cs`, add this property in the `BonusSkill` stat-bonus block next to `critical_chance_bonus`:

```csharp
public LinearStatBonusFloat critical_resist_bonus { get; set; }
```

In `mods/DataExporter/Exporters/SkillExporter.cs`, add this assignment in `PopulateBonusFields`, next to `critical_chance_bonus`:

```csharp
skillData.critical_resist_bonus = new LinearStatBonusFloat { base_value = bonusSkill.criticalResistBonus.baseValue, bonus_per_level = bonusSkill.criticalResistBonus.bonusPerLevel };
```

- [ ] **Step 5: Update fatecharm fragment drop export**

In `mods/DataExporter/Exporters/LuckTokenExporter.cs`, set:

```csharp
fragment_drop_chance = 0.05f  // Hardcoded 5% in Monster.cs (Random.value > 0.95)
```

In `mods/DataExporter/Models/LuckTokenData.cs`, align any default value or comment for `fragment_drop_chance` to `0.05` and `5%`.

- [ ] **Step 6: Align merchant role export with runtime null filtering**

In `mods/DataExporter/Exporters/NpcExporter.cs`, change the merchant role condition to require at least one non-null sale item:

```csharp
is_merchant = canonical.trading != null && canonical.trading.saleItems != null && canonical.trading.saleItems.Any(item => item != null),
```

Keep the existing `items_sold` loop null guard.

- [ ] **Step 7: Run DataExporter tests to pass**

Run:

```bash
dotnet test tests/DataExporter.Tests/DataExporter.Tests.csproj
```

Expected: all tests pass.

- [ ] **Step 8: Commit exporter contract updates**

Commit message:

```text
feat(data-export): export critical resist and updated patch constants
```

### Task 2: Build-pipeline schema and denormalizers

**Files:**
- Modify: `build-pipeline/schema.sql`
- Modify: `build-pipeline/src/compendium/models.py`
- Modify: `build-pipeline/src/compendium/denormalizers/skills/fixups.py`
- Modify: `build-pipeline/src/compendium/denormalizers/items/calculations.py`
- Modify: `build-pipeline/src/compendium/denormalizers/items/tooltips.py`
- Create: `build-pipeline/tests/test_item_stat_formulas.py`

- [ ] **Step 1: Add failing item formula tests**

Add test coverage for the server formulas:

```python
def test_equipment_item_level_includes_fear_and_critical_resist():
    assert equipment_item_level({"resist_fear_chance": 0.10, "critical_resist": 0.10}, weapon_delay=0) == 100


def test_augment_item_level_uses_critical_resist_augment_weight():
    assert augment_item_level({"critical_resist": 0.10}) == 20
```

The first test run may fail because the helpers do not exist yet or because the current formula omits the new server terms. That failure is the expected red step.

- [ ] **Step 2: Run the failing item formula tests**

Run:

```bash
cd build-pipeline && uv run pytest tests/test_item_stat_formulas.py
```

Expected before implementation: fails because `critical_resist` is not included and Fear Resist is not included in equipment item level.

- [ ] **Step 3: Add `critical_resist_bonus` to the skills schema**

In `build-pipeline/schema.sql`, add this column next to `critical_chance_bonus`:

```sql
critical_resist_bonus TEXT,
```

- [ ] **Step 4: Add `critical_resist_bonus` to build-pipeline models**

In `build-pipeline/src/compendium/models.py`, add this field to `SkillData` next to `critical_chance_bonus`:

```python
critical_resist_bonus: SkillBonus | None = None
```

In `build-pipeline/src/compendium/models.py`, set the `LuckTokenData.fragment_drop_chance` default/comment to `0.05`.

- [ ] **Step 5: Normalize Critical Resist skill bonuses**

In `build-pipeline/src/compendium/denormalizers/skills/fixups.py`, add `critical_resist_bonus` immediately after `critical_chance_bonus` in the linear stat-bonus field list.

- [ ] **Step 6: Update item-level calculations**

In `build-pipeline/src/compendium/denormalizers/items/calculations.py`, extract the existing calculation into pure helpers with complete server formulas:

```python
def _num(stats: dict[str, object], key: str) -> float:
    value = stats.get(key, 0)
    return float(value or 0)


def _weapon_delay_bonus(weapon_delay: int | float | None) -> int:
    if not weapon_delay or weapon_delay <= 0:
        return 0
    d = -0.0365 * math.pow(float(weapon_delay) - 15, 2)
    weapon_bonus_float = 38.017 * math.exp(d) - 0.1983 * (float(weapon_delay) - 25)
    return int(weapon_bonus_float)


def equipment_item_level(stats: dict[str, object], weapon_delay: int | float | None = None) -> int:
    return round(
        _num(stats, "defense")
        + (
            _num(stats, "strength")
            + _num(stats, "constitution")
            + _num(stats, "dexterity")
            + _num(stats, "charisma")
            + _num(stats, "intelligence")
            + _num(stats, "wisdom")
        )
        * 5
        + _num(stats, "health_bonus") / 10
        + _num(stats, "hp_regen_bonus") * 10
        + _num(stats, "mana_regen_bonus") * 10
        + _num(stats, "mana_bonus") / 10
        + _num(stats, "energy_bonus") / 10
        + _num(stats, "damage") * 0.7
        + _num(stats, "magic_damage")
        + _num(stats, "magic_resist")
        + _num(stats, "poison_resist")
        + _num(stats, "fire_resist")
        + _num(stats, "cold_resist")
        + _num(stats, "disease_resist")
        + _num(stats, "block_chance") * 500
        + _num(stats, "accuracy") * 500
        + _num(stats, "critical_chance") * 500
        + _num(stats, "haste") * 500
        + _num(stats, "speed_bonus") * 100
        + _num(stats, "spell_haste") * 500
        + _num(stats, "resist_fear_chance") * 500
        + _num(stats, "critical_resist") * 500
        + _weapon_delay_bonus(weapon_delay)
    )


def augment_item_level(stats: dict[str, object]) -> int:
    return round(
        _num(stats, "defense")
        + (
            _num(stats, "strength")
            + _num(stats, "constitution")
            + _num(stats, "dexterity")
            + _num(stats, "charisma")
            + _num(stats, "intelligence")
            + _num(stats, "wisdom")
        )
        * 5
        + _num(stats, "health_bonus") / 10
        + _num(stats, "hp_regen_bonus") * 10
        + _num(stats, "mana_regen_bonus") * 10
        + _num(stats, "mana_bonus") / 10
        + _num(stats, "energy_bonus") / 10
        + _num(stats, "damage") * 0.7
        + _num(stats, "magic_damage")
        + _num(stats, "magic_resist")
        + _num(stats, "poison_resist")
        + _num(stats, "fire_resist")
        + _num(stats, "cold_resist")
        + _num(stats, "disease_resist")
        + _num(stats, "block_chance") * 200
        + _num(stats, "accuracy") * 200
        + _num(stats, "critical_chance") * 200
        + _num(stats, "haste") * 200
        + _num(stats, "spell_haste") * 200
        + _num(stats, "critical_resist") * 200
    )
```

Update `_calculate_item_levels()` to select `item_type` along with `id`, `stats`, and `weapon_delay`, then call `augment_item_level(stats)` when `item_type == "augment"`, and call `equipment_item_level(stats, weapon_delay)` otherwise.

- [ ] **Step 7: Update tooltip placeholder replacement**

In `build-pipeline/src/compendium/denormalizers/items/tooltips.py`, add display and replacement support:

```python
STAT_DISPLAY_NAMES["critical_resist"] = "Critical Resist"
```

Add replacements:

```python
"FEARRESISTBONUS": (
    f"{abs(stats['resist_fear_chance'] * 100):.2f}".rstrip("0").rstrip(".")
    if stats.get("resist_fear_chance")
    else "0"
),
"CRITICALRESISTBONUS": (
    f"{abs(stats['critical_resist'] * 100):.2f}".rstrip("0").rstrip(".")
    if stats.get("critical_resist")
    else "0"
),
```

- [ ] **Step 8: Run build-pipeline targeted tests**

Run:

```bash
cd build-pipeline && uv run pytest tests/test_item_stat_formulas.py tests/test_item_source_entries.py
```

Expected: all selected tests pass.

- [ ] **Step 9: Commit build-pipeline contract updates**

Commit message:

```text
feat(build): add critical resist data support
```

### Task 3: Website and BetterBestiary Critical Resist display

**Files:**
- Modify: `website/src/lib/terminology.ts`
- Modify: `website/src/lib/constants/stats.ts`
- Modify: `website/src/routes/items/[id]/+page.svelte`
- Modify: `website/src/lib/types/skills.ts`
- Modify: `website/src/lib/types/monsters.ts`
- Modify: `website/src/lib/skills/skillRowToEffectInput.ts`
- Modify: `website/src/lib/skills/skillsListQuery.ts`
- Modify: `website/src/lib/queries/classes.server.ts`
- Modify: `website/src/lib/queries/pets.server.ts`
- Modify: `website/src/routes/skills/+page.server.ts`
- Modify: `website/src/routes/skills/[id]/+page.server.ts`
- Modify: `website/src/routes/skills/[id]/+page.svelte`
- Modify: `website/src/lib/utils/formatSkillEffect.ts`
- Modify: `website/src/lib/utils/formatSkillEffect.test.ts`
- Modify: `mods/BetterBestiary/Skills/SkillEffectInput.cs`
- Modify: `mods/BetterBestiary/Skills/SkillEffectExtractor.cs`
- Modify: `mods/BetterBestiary/Skills/SkillEffectFormatter.cs`

- [ ] **Step 1: Add failing website formatter test**

In `website/src/lib/utils/formatSkillEffect.test.ts`, add:

```ts
it("formats critical resist bonuses", () => {
  expect(
    formatSkillEffect({
      skill_type: "target_buff",
      critical_resist_bonus: { base_value: 0.05, bonus_per_level: 0.01 },
      duration_base: 60,
    } as Skill),
  ).toBe("+5% (+1%/lvl) critical resist, 1m");
});
```

- [ ] **Step 2: Run the failing website formatter test**

Run:

```bash
pnpm --filter website test -- src/lib/utils/formatSkillEffect.test.ts
```

Expected before implementation: fails because `critical_resist_bonus` is ignored or missing from the formatter type.

- [ ] **Step 3: Add item stat terminology and filters**

In `website/src/lib/terminology.ts`, add:

```ts
critical_resist: "Critical Resist",
```

In `website/src/lib/constants/stats.ts`, add `"critical_resist"` to the `resistances.stats` array.

In `website/src/routes/items/[id]/+page.svelte`, add `"critical_resist"` to the `percentageStats` set.

- [ ] **Step 4: Add skill field plumbing**

Mirror the existing `critical_chance_bonus` pattern for `critical_resist_bonus` in every skill query/type file:

```ts
critical_resist_bonus: LinearValue | null;
```

Select this DB column wherever skill rows select `critical_chance_bonus`:

```sql
s.critical_resist_bonus,
```

Parse it on skill detail pages:

```ts
critical_resist_bonus: parseLinear(skillRaw.critical_resist_bonus),
```

Map it into formatter input:

```ts
critical_resist_bonus: r.critical_resist_bonus,
```

- [ ] **Step 5: Render Critical Resist in skill UI**

In `website/src/routes/skills/[id]/+page.svelte`, add `critical_resist_bonus` to:

- the list of fields that make a skill show bonus/stat sections
- the scaling/stat column list with label `Critical Resist`, percentage formatting, and no suffix
- the detail stat block beside Critical Chance/Accuracy/Block/Fear Resist
- the mechanics-card condition and explanatory text.

The mechanics text must state:

```text
Critical Resist is a defensive percentage. It reduces incoming critical chance multiplicatively: effective crit chance = (attacker crit chance + skill crit bonus) × (1 − target Critical Resist). Dexterity gives 0.05 percentage points of Critical Resist per positive Dexterity point, and equipment, augments, passive skills, and buffs can add more. Total Critical Resist is capped at 100%.
```

- [ ] **Step 6: Format Critical Resist summaries**

In `website/src/lib/utils/formatSkillEffect.ts`, add `critical_resist_bonus` to the `Skill` input type and format it in the hit/chance modifier block:

```ts
const criticalResistBonus = parseLinearValue(skill.critical_resist_bonus);
if (criticalResistBonus && criticalResistBonus.base_value !== 0) {
  const sign = criticalResistBonus.base_value > 0 ? "+" : "";
  parts.push(
    `${sign}${formatLinearPercent(criticalResistBonus, monsterContext)} critical resist`,
  );
}
```

- [ ] **Step 7: Mirror the formatter in BetterBestiary**

In `mods/BetterBestiary/Skills/SkillEffectInput.cs`, add:

```csharp
public LinearValue critical_resist_bonus { get; set; }
```

In `mods/BetterBestiary/Skills/SkillEffectExtractor.cs`, set it from `BonusSkill`:

```csharp
input.critical_resist_bonus = new LinearValue(bonusSkill.criticalResistBonus.baseValue, bonusSkill.criticalResistBonus.bonusPerLevel);
```

In `mods/BetterBestiary/Skills/SkillEffectFormatter.cs`, add it to the hit/chance block:

```csharp
AddSignedPercent(parts, ParseLinearValue(skill.critical_resist_bonus), "critical resist", true);
```

- [ ] **Step 8: Run targeted formatter tests**

Run:

```bash
pnpm --filter website test -- src/lib/utils/formatSkillEffect.test.ts
```

Expected: test passes.

- [ ] **Step 9: Run BetterBestiary tests**

Run:

```bash
dotnet test tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj
```

Expected before export/parity regeneration: formatter source tests should compile. Parity failures are resolved in Task 6 after fresh exported data and parity corpus regeneration.

- [ ] **Step 10: Commit Critical Resist UI plumbing**

Commit message:

```text
feat(website): display critical resist stat bonuses
```

### Task 4: Manual mechanics copy and comments

**Files:**
- Modify: `website/src/routes/items/[id]/+page.svelte`
- Modify: `website/src/routes/mechanics/combat/+page.svelte`
- Modify: `website/src/routes/skills/[id]/+page.svelte`
- Modify: `website/src/routes/professions/slayer/+page.server.ts`
- Modify: `website/src/routes/professions/slayer/+page.svelte`
- Modify: `website/src/routes/professions/scroll_mastery/+page.svelte`
- Modify: `website/src/lib/special-mechanics.ts`
- Modify: `website/src/lib/special-mechanics.test.ts`
- Modify: `website/src/lib/utils/alchemy.ts`
- Modify: `website/src/lib/utils/cooking.ts`

- [ ] **Step 1: Update Radiant Aether item mechanics**

In the `radiant_aether` section of `website/src/routes/items/[id]/+page.svelte`, the existing summary is correct for solo play (the per-player area chance is still 15% solo). Only the group case changed in 0.9.22, so keep the existing wording and append one sentence for the new group cap:

```text
Keep in inventory. Has a 15% chance to activate when you land a critical hit with an ability, take lethal damage, or are hit by an AoE attack. Consumes 1 when triggered. In a group, an AoE instead shares a 25% chance across party members carrying it (at most 10% each), and the first trigger blocks the attack for the whole party.
```

Keep the existing critical-hit and lethal-damage descriptions, with the crit outcome still `×3 total`.

- [ ] **Step 2: Update combat Critical Resist docs**

In `website/src/routes/mechanics/combat/+page.svelte`, update the critical-hit section with:

```text
Critical hits deal ×1.5 damage. The effective critical-hit chance is (attacker Critical Chance + skill critical bonus) × (1 − target Critical Resist), capped at 100% Critical Resist.
```

Remove any wording that implies Warrior/Rogue targets have a hardcoded Steadfast Guard critical-chance reduction independent of the new stat.

- [ ] **Step 3: Update skill-page combat math copy**

In `website/src/routes/skills/[id]/+page.svelte`, mirror the Critical Resist formula where critical-hit mechanics are described:

```text
effective crit chance = (attacker crit chance + skill crit bonus) × (1 − target Critical Resist)
```

Keep the existing Radiant Aether non-follow-up ability critical note.

- [ ] **Step 4: Update Slayer account-wide wording**

In `website/src/routes/professions/slayer/+page.server.ts`, keep:

```ts
const skillGainPerKill = 0.02;
```

In `website/src/routes/professions/slayer/+page.svelte`, add account-wide copy near the header stats:

```text
Progression is shared across every character on the same account. Each boss or elite contributes at most 50 total account kills, and each counted kill adds 0.02 percentage points.
```

Leave the Slayer damage-reduction formula on the combat and skills pages unchanged. The level it already shows is the account value, so no `account` qualifier is needed there.

- [ ] **Step 5: Split Scroll Mastery gain amounts**

In `website/src/routes/professions/scroll_mastery/+page.svelte`, keep the existing gain chance formula and replace the single gain amount range with two ranges:

```ts
const CRAFT_MASTERY_GAIN_MIN = 0.05;
const CRAFT_MASTERY_GAIN_MAX = 0.09;
const USE_MASTERY_GAIN_MIN = 0.10;
const USE_MASTERY_GAIN_MAX = 0.19;
```

Update copy to state:

```text
Crafting a scroll and using a scroll share the same chance to gain mastery, but the amount differs. Crafting grants 0.05%–0.09%, and using a scroll grants 0.10%–0.19%.
```

Update the calculator card so it displays both ranges, not one shared range.

- [ ] **Step 6: Update Valaark and Dragonbait mechanics**

In `website/src/lib/special-mechanics.ts`, change only the vulnerable resistance value from `500` to `100`:

```text
During that window, one random damage resistance drops to 100 while the others stay at 2000.
```

Leave the usage, `60-299 seconds` duration, and already-vulnerable no-consume lines unchanged.

In `website/src/lib/special-mechanics.test.ts`, update the expected resistance value from `500` to `100`.

- [ ] **Step 7: Update renamed alchemy/cooking helper comments**

In `website/src/lib/utils/alchemy.ts`, update comments from `GetSuccessChanceProb` to `GetSuccessProbAlchemy` and keep the numeric formula unchanged.

In `website/src/lib/utils/cooking.ts`, update comments from `GetSuccessChanceProbCooking` to `GetSuccessProbCooking` and keep the numeric formula unchanged.

- [ ] **Step 8: Run targeted website copy tests**

Run:

```bash
pnpm --filter website test -- src/lib/special-mechanics.test.ts src/lib/utils/alchemy.test.ts src/lib/utils/cooking.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 9: Commit manual mechanics updates**

Commit message:

```text
docs(website): update 0.9.22 mechanics copy
```

### Task 5: Build, deploy, export, and rebuild data with no map work

**Files generated, not committed:**
- `server-scripts/`
- `server-scripts-0.9.22.2/`
- `exported-data/`
- `website/static/compendium.db`

- [ ] **Step 1: Build mods against the updated game assemblies**

Run:

```bash
dotnet run --project build-tool build
```

Expected: succeeds. If it fails on renamed/removed Il2Cpp members, patch the owning mod/exporter source rather than suppressing the failure.

- [ ] **Step 2: Deploy mods**

Run:

```bash
dotnet run --project build-tool deploy
```

Expected: succeeds and removes stale deployed copies as part of normal build-tool behavior.

- [ ] **Step 3: Export fresh data without screenshots**

Run exactly:

```bash
dotnet run --project build-tool export --update
```

Do not add `--screenshots`.

Expected: Steam update reports success for app `2241380`, export writes fresh JSON under `exported-data/`, and the game exits after export.

If MelonLoader fails with a missing Unity dependency zip after the engine update, manually place the required `UnityDependencies_<unity-version>.zip` under the game install's `MelonLoader/Dependencies/Il2CppAssemblyGenerator/` using the upstream `Managed.zip` asset, then rerun the same export command.

- [ ] **Step 4: Rebuild the compendium DB**

Run:

```bash
cd build-pipeline && uv run compendium build
```

Expected: succeeds and writes `website/static/compendium.db`.

- [ ] **Step 5: Verify exported patch data**

Run targeted SQLite/read checks against the rebuilt DB or exported JSON to confirm:

- `luck_tokens.fragment_drop_chance` is `0.05`.
- Fatecharm fragment requirements are `5` where the exported fragment item says `amountNeeded = 5`.
- `items.stats` contains `critical_resist` for any equipment item with a nonzero game value.
- `items.stats` contains `critical_resist` for any augment with a nonzero game value, including augments whose stats are populated through `PopulateAugmentFields`.
- `skills.critical_resist_bonus` is populated for any skill with a nonzero game value.
- Valaark's loot and skills reflect the fresh export.
- King Thrym's Ice Lance damage/cooldown, Holy Wrath cast time, Steadfast Guard max level, healing-potion materials, Draconium Mold drop rates, Rusty Hammer vendor source, and mercenary base health reflect the fresh export.

Use direct DB queries or targeted page reads, and do not infer these values from the changelog.

- [ ] **Step 6: Commit code changes that were required for export/rebuild**

Commit message:

```text
chore(data): rebuild compendium for game 0.9.22.2
```

Do not include gitignored generated source folders, `exported-data/`, or `website/static/compendium.db` unless the repository intentionally tracks a generated artifact and it appears as a normal tracked-file modification.

### Task 6: Mechanics snapshots, parity fixtures, version seal, and final verification

**Files:**
- Regenerate and modify after review: `website/test-fixtures/mechanics-snapshots/`
- Regenerate and modify after review: `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json`
- Modify last: `website/src/lib/constants/version.ts`

- [ ] **Step 1: Generate the website build and inspect mechanics snapshot drift**

Run:

```bash
cd website && pnpm build && node scripts/snapshot-mechanics.mjs
```

Expected: build succeeds. Every snapshot diff must correspond to one of these intentional changes: Critical Resist skill display, Scroll Mastery copy, Radiant Aether copy, Valaark/Dragonbait copy, Slayer account wording, or exported game data changes visible in the server-script diff.

- [ ] **Step 2: Accept justified mechanics snapshots**

Run:

```bash
cd website && node scripts/snapshot-mechanics.mjs --update
```

Expected: snapshot fixtures update only for justified diffs.

- [ ] **Step 3: Regenerate BetterBestiary formatter parity corpus**

Run:

```bash
pnpm --filter website gen:skill-effect-parity
```

Expected: `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json` reflects the freshly exported skill data and website formatter output.

- [ ] **Step 4: Run targeted verification suite**

Run:

```bash
dotnet test tests/DataExporter.Tests/DataExporter.Tests.csproj
dotnet test tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj
cd build-pipeline && uv run pytest tests/test_item_stat_formulas.py tests/test_item_source_entries.py
pnpm --filter website test -- src/lib/utils/formatSkillEffect.test.ts src/lib/special-mechanics.test.ts src/lib/utils/alchemy.test.ts src/lib/utils/cooking.test.ts
pnpm --filter website check
```

Expected: all commands pass.

- [ ] **Step 5: Update the compendium version seal**

In `website/src/lib/constants/version.ts`, set:

```ts
export const COMPENDIUM_VERSION = "0.9.22.2";
```

- [ ] **Step 6: Run final website build after the version seal**

Run:

```bash
pnpm --filter website build
```

Expected: build succeeds and home page renders `Updated for v0.9.22.2`.

- [ ] **Step 7: Commit snapshots, parity fixtures, and version seal**

Commit message:

```text
chore(website): seal compendium version 0.9.22.2
```

---

## Completion Criteria

- Critical Resist is exported for items/augments and skills, stored in the rebuilt DB, rendered as a percentage item stat, filterable, and included in skill summaries/detail pages.
- Equipment item levels include Fear Resist and Critical Resist at `×500`, and augment item levels include Critical Resist at `×200`.
- Radiant Aether copy documents solo/group area activation correctly and does not imply a flat 15% per affected player in groups.
- Slayer copy says progression is account-wide, with a per-boss/elite 50-kill account cap and unchanged `0.02` percentage-point gain per counted kill.
- Scroll Mastery copy separates craft gain amount (`0.05%–0.09%`) from scroll-use gain amount (`0.10%–0.19%`) while keeping the chance formula unchanged.
- Valaark/Dragonbait copy says inventory or skillbar use and the vulnerability target resistance value is `100`.
- Luck-token/fatecharm export uses `fragment_drop_chance = 0.05`, and Fatecharm fragments require `5` after fresh export.
- `dotnet run --project build-tool export --update` was run without `--screenshots`, and `compendium tiles` was not run.
- Mechanics snapshots and BetterBestiary parity fixtures are refreshed only after review.
- `website/src/lib/constants/version.ts` is updated to `0.9.22.2` last.
