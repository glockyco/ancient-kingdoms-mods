# BetterBestiary Skills Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable, native-looking "Skills" side panel to the in-game Bestiary that lists a monster's skills (icon + name, effect summary, cooldown, cast time), and rename the `BestiaryRevealer` mod to `BetterBestiary`.

**Architecture:** The effect summaries are **skill-intrinsic** (no monster scaling) and precomputed once from the website's `formatSkillEffect` TypeScript function into an embedded JSON asset the mod reads at runtime (keyed by `skill_id`). The mod is pure Unity uGUI, hooking the existing `UIBestiaryDetail.Update` Harmony postfix; icons/cooldown/cast come live from `ScriptableSkill`. A lefthook pre-commit drift guard keeps the asset in sync with the formatter.

**Tech Stack:** C# (net6, MelonLoader, IL2CPP via Il2CppInterop, Harmony), TypeScript (SvelteKit, better-sqlite3, vite-node, vitest), xUnit, lefthook.

**Spec:** `docs/superpowers/specs/2026-06-20-better-bestiary-skills-panel-design.md`

**Source-grounding (verified):**
- Mod entry/MelonInfo: `mods/BestiaryRevealer/BestiaryRevealer.cs:4`. Settings: `mods/BestiaryRevealer/BestiaryRevealerSettings.cs`. Patch hook: `mods/BestiaryRevealer/Patches/UIBestiaryDetailPatch.cs`. uGUI prefab cloning: `mods/BestiaryRevealer/Ui/BestiaryLootRenderer.cs` via `UIUtils.BalancePrefabs`.
- Game types: `UIJournal.singleton` (`panel`, `rectTransformJournal`, `monsterDetail`, `currentTab`), `UIBestiaryDetail.singleton` (`monster`, `Update`), `UIJournalSlot.button`, `Monster.skills` → `MonsterSkills : Skills`, `Skills.skillTemplates` (`ScriptableSkill[]`), `ScriptableSkill` (`nameSkill`, `image`, `cooldown`/`castTime` `LinearFloat.Get(level)`, `toolTip`), `Utils.PrettySeconds`.
- Exporter id scheme: `SanitizeId` in `mods/DataExporter/Exporters/BaseExporter.cs:48`; skill id = `SanitizeId(skill.name)` (`SkillExporter.cs:44`).
- Website formatter: `formatSkillEffect` `website/src/lib/utils/formatSkillEffect.ts` (skill-global call at `skills/+page.server.ts:337`; row→Skill mapping at `skills/+page.server.ts:239-323`).
- Build/deploy: `dotnet run --project build-tool build|deploy|launch --wait` (`mods/CLAUDE.md`).

---

## File Structure

**Create:**
- `website/src/lib/skills/skillRowToEffectInput.ts` — shared `row → Skill` mapper (single source for both loader and bake).
- `website/src/lib/skills/skillRowToEffectInput.test.ts` — mapper unit tests.
- `website/scripts/gen-skill-summaries.ts` — bake script: DB → `{ skill_id: summary }` JSON.
- `mods/BetterBestiary/Resources/skill-summaries.json` — generated, committed asset (embedded in DLL).
- `mods/BetterBestiary/Data/SkillId.cs` — IL2CPP-free copy of `SanitizeId`.
- `mods/BetterBestiary/Data/SkillSummaryStore.cs` — loads/parses the embedded asset.
- `mods/BetterBestiary/Ui/SkillsToggleButton.cs` — the bottom-right "Skills" button.
- `mods/BetterBestiary/Ui/SkillsPanel.cs` — panel GameObject: build/position/show/hide.
- `mods/BetterBestiary/Ui/SkillsPanelRenderer.cs` — populate rows for a monster.
- `tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj` — xUnit project (links IL2CPP-free mod sources).
- `tests/BetterBestiary.Tests/SkillIdTests.cs`, `tests/BetterBestiary.Tests/SkillSummaryStoreTests.cs`.

**Modify:**
- Rename `mods/BestiaryRevealer/` → `mods/BetterBestiary/` (+ csproj, namespace, MelonInfo, settings category).
- `website/src/routes/skills/+page.server.ts` — use the shared mapper.
- `website/package.json` — add `gen:skill-summaries` script + `vite-node` devDep.
- `mods/BetterBestiary/BetterBestiary.csproj` — Newtonsoft ref + EmbeddedResource.
- `mods/BetterBestiary/Patches/UIBestiaryDetailPatch.cs` — drive button + panel.
- `lefthook.yml` — drift-guard job.
- `AncientKingdomsMods.sln`, `README.md`.

---

## Phase 0 — Rename

### Task 1: Rename BestiaryRevealer → BetterBestiary

**Files:**
- Rename dir: `mods/BestiaryRevealer/` → `mods/BetterBestiary/`
- Rename: `BestiaryRevealer.csproj` → `BetterBestiary.csproj`, `BestiaryRevealer.cs` → `BetterBestiary.cs`, `BestiaryRevealerSettings.cs` → `BetterBestiarySettings.cs`
- Modify: `AncientKingdomsMods.sln`, `README.md`

- [ ] **Step 1: Move the project directory and rename type files**

```bash
cd ~/Projects/ancient-kingdoms-mods
git mv mods/BestiaryRevealer mods/BetterBestiary
git mv mods/BetterBestiary/BestiaryRevealer.csproj mods/BetterBestiary/BetterBestiary.csproj
git mv mods/BetterBestiary/BestiaryRevealer.cs mods/BetterBestiary/BetterBestiary.cs
git mv mods/BetterBestiary/BestiaryRevealerSettings.cs mods/BetterBestiary/BetterBestiarySettings.cs
```

- [ ] **Step 2: Update csproj assembly + namespace**

In `mods/BetterBestiary/BetterBestiary.csproj`, set:

```xml
    <AssemblyName>BetterBestiary</AssemblyName>
    <RootNamespace>BetterBestiary</RootNamespace>
```

- [ ] **Step 3: Rename the namespace + MelonInfo across all `.cs` files**

Every file under `mods/BetterBestiary/` uses `namespace BestiaryRevealer...` and the entry class references `BestiaryRevealer`. Update:
- `namespace BestiaryRevealer` → `namespace BetterBestiary` (and `BestiaryRevealer.Ui` → `BetterBestiary.Ui`, `BestiaryRevealer.Patches` → `BetterBestiary.Patches`).
- All `using BestiaryRevealer...`, `Ui.`, `Patches.` references remain valid after the namespace root changes.
- In `BetterBestiary.cs`, the type and MelonInfo:

```csharp
[assembly: MelonInfo(typeof(BetterBestiary.BetterBestiary), "Better Bestiary", "0.2.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace BetterBestiary;

public sealed class BetterBestiary : MelonMod
```

Update the two internal references `BestiaryRevealer.LogWarning`/`LogMessage`/`IsPatchDisabled`/`ReportPatchException` callers to `BetterBestiary.` (they are in `BestiaryPageOpener.cs`, `Patches/*.cs`). Use the editor's rename, then verify with a search for the old name (Step 5).

- [ ] **Step 4: Update the settings category**

In `mods/BetterBestiary/BetterBestiarySettings.cs`, rename the class to `BetterBestiarySettings` and the category to `"BetterBestiary"` (a one-time settings reset is acceptable per spec):

```csharp
internal static class BetterBestiarySettings
{
    private static MelonPreferences_Entry<bool> _autoAddMissingBestiaryEntries;

    internal static bool AutoAddMissingBestiaryEntries =>
        _autoAddMissingBestiaryEntries != null && _autoAddMissingBestiaryEntries.Value;

    internal static void Initialize()
    {
        var category = MelonPreferences.CreateCategory("BetterBestiary");
        _autoAddMissingBestiaryEntries = category.CreateEntry(
            "AutoAddMissingBestiaryEntries",
            false,
            "Scan loaded bosses, elites, and fabled monsters and add missing Bestiary entries at runtime.");
    }
}
```

Update the call in `BetterBestiary.cs` `OnInitializeMelon`: `BetterBestiarySettings.Initialize();`.

- [ ] **Step 5: Verify no stale references remain**

Use the editor/search tool for `BestiaryRevealer` across `mods/BetterBestiary/` and `AncientKingdomsMods.sln`. Expected: zero hits except in historical docs. Update `AncientKingdomsMods.sln` to point the project entry at `mods\BetterBestiary\BetterBestiary.csproj` (and the project name `BetterBestiary`).

- [ ] **Step 6: Build to verify the rename compiles**

Run: `dotnet run --project build-tool build`
Expected: build succeeds; output DLL is `BetterBestiary.dll`.

- [ ] **Step 7: Update README mod table**

In `README.md`, rename the `BestiaryRevealer` row to `BetterBestiary` and update its summary to mention the new Skills panel:

```markdown
| `BetterBestiary`   | Reveals Bestiary monster details, lore, stats, and loot tooltips without changing discovery/kill progress. Alt-left-click a monster to open its Bestiary page. Adds a toggleable Skills side panel listing each monster's skills (icon, effect summary, cooldown, cast time). Optional scanner adds loaded missing boss/elite/fabled entries at runtime. |
```

- [ ] **Step 8: Commit**

```bash
git add -A mods/BetterBestiary AncientKingdomsMods.sln README.md
git commit -m "refactor(mods): rename BestiaryRevealer to BetterBestiary"
```

---

## Phase 1 — Website data pipeline (single source of truth)

### Task 2: Extract the shared `row → Skill` mapper

**Files:**
- Create: `website/src/lib/skills/skillRowToEffectInput.ts`
- Create: `website/src/lib/skills/skillRowToEffectInput.test.ts`
- Modify: `website/src/routes/skills/+page.server.ts:238-323`

- [ ] **Step 1: Write the failing test**

`website/src/lib/skills/skillRowToEffectInput.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { skillRowToEffectInput } from "./skillRowToEffectInput";

describe("skillRowToEffectInput", () => {
  it("coerces integer boolean columns to booleans", () => {
    const out = skillRowToEffectInput({
      id: "enrage",
      skill_type: "passive",
      is_enrage: 1,
      is_assassination_skill: 0,
    });
    expect(out.is_enrage).toBe(true);
    expect(out.is_assassination_skill).toBe(false);
  });

  it("renames pet_prefab_name to pet_name and passes raw LinearValue columns through", () => {
    const out = skillRowToEffectInput({
      id: "summon_wolf",
      skill_type: "summon",
      pet_prefab_name: "Wolf",
      damage: { base_value: 10, bonus_per_level: 2 },
    });
    expect(out.pet_name).toBe("Wolf");
    expect(out.damage).toEqual({ base_value: 10, bonus_per_level: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter website exec vitest run src/lib/skills/skillRowToEffectInput.test.ts`
Expected: FAIL — cannot find module `./skillRowToEffectInput`.

- [ ] **Step 3: Create the mapper**

`website/src/lib/skills/skillRowToEffectInput.ts` — move the exact object built at `skills/+page.server.ts:239-323` here. The input is a raw SQLite row (scalars + JSON-parsed LinearValue objects as the loader already receives them):

```ts
import type { Skill } from "$lib/utils/formatSkillEffect";

/** Raw `skills` row as returned by the loader's SELECT (SQLite scalars + parsed LinearValue objects). */
export type SkillEffectRow = Record<string, unknown>;

/**
 * Build the `formatSkillEffect` input from a raw `skills` DB row.
 * Single source for BOTH the /skills loader and the mod's bake script, so the
 * mod's precomputed summaries can never diverge from the website overview.
 * Mirrors website/src/routes/skills/+page.server.ts (boolean coercions + the
 * pet_prefab_name -> pet_name rename).
 */
export function skillRowToEffectInput(row: SkillEffectRow): Skill {
  const r = row as Record<string, never>;
  return {
    id: r.id,
    skill_type: r.skill_type,
    damage_type: r.damage_type,
    max_level: r.max_level,
    damage: r.damage,
    damage_percent: r.damage_percent,
    lifetap_percent: r.lifetap_percent,
    knockback_chance: r.knockback_chance,
    stun_chance: r.stun_chance,
    stun_time: r.stun_time,
    fear_chance: r.fear_chance,
    fear_time: r.fear_time,
    aggro: r.aggro,
    is_assassination_skill: Boolean(r.is_assassination_skill),
    is_manaburn_skill: Boolean(r.is_manaburn_skill),
    break_armor_prob: r.break_armor_prob,
    heals_health: r.heals_health,
    heals_mana: r.heals_mana,
    is_resurrect_skill: Boolean(r.is_resurrect_skill),
    is_balance_health: Boolean(r.is_balance_health),
    health_max_bonus: r.health_max_bonus,
    health_max_percent_bonus: r.health_max_percent_bonus,
    mana_max_bonus: r.mana_max_bonus,
    mana_max_percent_bonus: r.mana_max_percent_bonus,
    energy_max_bonus: r.energy_max_bonus,
    defense_bonus: r.defense_bonus,
    ward_bonus: r.ward_bonus,
    magic_resist_bonus: r.magic_resist_bonus,
    poison_resist_bonus: r.poison_resist_bonus,
    fire_resist_bonus: r.fire_resist_bonus,
    cold_resist_bonus: r.cold_resist_bonus,
    disease_resist_bonus: r.disease_resist_bonus,
    damage_bonus: r.damage_bonus,
    damage_percent_bonus: r.damage_percent_bonus,
    magic_damage_bonus: r.magic_damage_bonus,
    magic_damage_percent_bonus: r.magic_damage_percent_bonus,
    haste_bonus: r.haste_bonus,
    spell_haste_bonus: r.spell_haste_bonus,
    speed_bonus: r.speed_bonus,
    critical_chance_bonus: r.critical_chance_bonus,
    accuracy_bonus: r.accuracy_bonus,
    block_chance_bonus: r.block_chance_bonus,
    fear_resist_chance_bonus: r.fear_resist_chance_bonus,
    damage_shield: r.damage_shield,
    cooldown_reduction_percent: r.cooldown_reduction_percent,
    heal_on_hit_percent: r.heal_on_hit_percent,
    healing_per_second_bonus: r.healing_per_second_bonus,
    health_percent_per_second_bonus: r.health_percent_per_second_bonus,
    mana_per_second_bonus: r.mana_per_second_bonus,
    mana_percent_per_second_bonus: r.mana_percent_per_second_bonus,
    energy_per_second_bonus: r.energy_per_second_bonus,
    energy_percent_per_second_bonus: r.energy_percent_per_second_bonus,
    strength_bonus: r.strength_bonus,
    intelligence_bonus: r.intelligence_bonus,
    dexterity_bonus: r.dexterity_bonus,
    constitution_bonus: r.constitution_bonus,
    wisdom_bonus: r.wisdom_bonus,
    charisma_bonus: r.charisma_bonus,
    duration_base: r.duration_base,
    is_invisibility: Boolean(r.is_invisibility),
    is_mana_shield: Boolean(r.is_mana_shield),
    is_cleanse: Boolean(r.is_cleanse),
    is_dispel: Boolean(r.is_dispel),
    is_teleport: Boolean(r.is_teleport),
    is_blindness: Boolean(r.is_blindness),
    is_enrage: Boolean(r.is_enrage),
    is_poison_debuff: Boolean(r.is_poison_debuff),
    is_disease_debuff: Boolean(r.is_disease_debuff),
    is_fire_debuff: Boolean(r.is_fire_debuff),
    is_cold_debuff: Boolean(r.is_cold_debuff),
    is_magic_debuff: Boolean(r.is_magic_debuff),
    is_melee_debuff: Boolean(r.is_melee_debuff),
    prob_ignore_cleanse: r.prob_ignore_cleanse,
    summoned_monster_id: r.summoned_monster_id,
    summoned_monster_name: r.summoned_monster_name,
    summoned_monster_level: r.summoned_monster_level,
    summon_count_per_cast: r.summon_count_per_cast,
    max_active_summons: r.max_active_summons,
    pet_name: r.pet_prefab_name,
    is_familiar: Boolean(r.is_familiar),
    affects_random_target: Boolean(r.affects_random_target),
    area_object_size: r.area_object_size,
    area_objects_to_spawn: r.area_objects_to_spawn,
  };
}
```

> Note: `as Record<string, never>` lets the property reads satisfy `Skill`'s union field types without per-field casts; the loader already treated these as "raw DB values" (`skills/+page.server.ts:238`). If `pnpm --filter website check` flags a field, cast that single field (e.g. `r.max_level as number`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter website exec vitest run src/lib/skills/skillRowToEffectInput.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactor the loader to use the mapper**

In `website/src/routes/skills/+page.server.ts`, replace the inline `skillForEffect` object (lines 238–323, the block from the `// Pass raw DB values…` comment through the closing `};`) with:

```ts
    const skillForEffect = skillRowToEffectInput(row);
```

Add the import near the other `$lib` imports at the top:

```ts
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";
```

- [ ] **Step 6: Verify types + existing tests still pass**

Run: `pnpm --filter website check`
Expected: 0 errors.
Run: `pnpm --filter website exec vitest run src/lib/utils/formatSkillEffect.test.ts src/lib/skills/skillRowToEffectInput.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add website/src/lib/skills/skillRowToEffectInput.ts website/src/lib/skills/skillRowToEffectInput.test.ts website/src/routes/skills/+page.server.ts
git commit -m "refactor(site): extract shared skill row-to-effect mapper"
```

---

### Task 3: Bake script — `gen-skill-summaries.ts`

**Files:**
- Create: `website/scripts/gen-skill-summaries.ts`
- Modify: `website/package.json` (add `vite-node` devDep + `gen:skill-summaries` script)

- [ ] **Step 1: Add the runner dependency and script**

In `website/package.json` add to `devDependencies`: `"vite-node": "^4.1.9"` (match the vitest major), and to `scripts`:

```json
    "gen:skill-summaries": "vite-node scripts/gen-skill-summaries.ts"
```

Run: `pnpm install`
Expected: lockfile updates; `vite-node` installed.

- [ ] **Step 2: Write the bake script**

`website/scripts/gen-skill-summaries.ts`. It uses `$lib` imports (resolved by vite-node via the project's vite config), reads the prebuilt DB, and writes a **stable** (sorted-key, trailing-newline) JSON so the drift guard diffs cleanly:

```ts
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(here, "../static/compendium.db");
const OUT_PATH = resolve(here, "../../mods/BetterBestiary/Resources/skill-summaries.json");

const LINEAR_COLUMNS = new Set([
  "damage", "damage_percent", "lifetap_percent", "knockback_chance", "stun_chance",
  "stun_time", "fear_chance", "fear_time", "aggro", "break_armor_prob", "heals_health",
  "heals_mana", "health_max_bonus", "health_max_percent_bonus", "mana_max_bonus",
  "mana_max_percent_bonus", "energy_max_bonus", "defense_bonus", "ward_bonus",
  "magic_resist_bonus", "poison_resist_bonus", "fire_resist_bonus", "cold_resist_bonus",
  "disease_resist_bonus", "damage_bonus", "damage_percent_bonus", "magic_damage_bonus",
  "magic_damage_percent_bonus", "haste_bonus", "spell_haste_bonus", "speed_bonus",
  "critical_chance_bonus", "accuracy_bonus", "block_chance_bonus", "fear_resist_chance_bonus",
  "damage_shield", "cooldown_reduction_percent", "heal_on_hit_percent", "healing_per_second_bonus",
  "health_percent_per_second_bonus", "mana_per_second_bonus", "mana_percent_per_second_bonus",
  "energy_per_second_bonus", "energy_percent_per_second_bonus", "strength_bonus",
  "intelligence_bonus", "dexterity_bonus", "constitution_bonus", "wisdom_bonus", "charisma_bonus",
  "prob_ignore_cleanse",
]);

// The /skills loader parses LinearValue columns from JSON TEXT into objects before
// formatSkillEffect sees them; do the same here so output matches the website exactly.
function parseLinearColumns(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const col of LINEAR_COLUMNS) {
    const v = out[col];
    if (typeof v === "string") {
      try {
        out[col] = JSON.parse(v);
      } catch {
        // leave as-is; formatSkillEffect tolerates string | LinearValue | null
      }
    }
  }
  return out;
}

const db = new Database(DB_PATH, { readonly: true });
const rows = db.prepare("SELECT * FROM skills").all() as Record<string, unknown>[];

const summaries: Record<string, string> = {};
for (const row of rows) {
  const id = String(row.id);
  const input = skillRowToEffectInput(parseLinearColumns(row));
  summaries[id] = formatSkillEffect(input); // no monsterContext -> skill-intrinsic
}
db.close();

// Stable, sorted output for clean drift diffs.
const sorted: Record<string, string> = {};
for (const key of Object.keys(summaries).sort()) sorted[key] = summaries[key];
writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
console.log(`Wrote ${Object.keys(sorted).length} skill summaries to ${OUT_PATH}`);
```

> The loader reads LinearValue columns parsed from the DB; confirm how `skills/+page.server.ts` obtains `row` (the SELECT and any JSON parsing). If it relies on a DB view or parses differently, mirror that here. The `parseLinearColumns` set above covers the LinearValue columns referenced by the mapper.

- [ ] **Step 3: Verify the DB exists, then run the bake**

The script needs the built DB. If `website/static/compendium.db` is absent, build it first:

Run: `cd build-pipeline && uv run compendium build && cd ..`
Then: `pnpm --filter website gen:skill-summaries`
Expected: `Wrote N skill summaries to .../mods/BetterBestiary/Resources/skill-summaries.json` (N ≈ the number of `skills` rows).

- [ ] **Step 4: Sanity-check output against the website**

Open `mods/BetterBestiary/Resources/skill-summaries.json` and pick a known damage skill id; compare its summary string to that skill's row on the website `/skills` page (run `pnpm --filter website dev` if needed). They must match character-for-character.

- [ ] **Step 5: Commit the script (asset committed in Task 4)**

```bash
git add website/package.json website/scripts/gen-skill-summaries.ts pnpm-lock.yaml
git commit -m "feat(site): add skill-summaries bake script"
```

---

### Task 4: Commit the generated asset

**Files:**
- Create: `mods/BetterBestiary/Resources/skill-summaries.json` (generated in Task 3)

- [ ] **Step 1: Confirm the asset is well-formed**

Verify the file parses and is non-empty (e.g. open it; it is a flat `{ "<skill_id>": "<summary>" }` object, keys sorted).

- [ ] **Step 2: Commit the asset**

```bash
git add mods/BetterBestiary/Resources/skill-summaries.json
git commit -m "chore(mods): add generated skill summaries asset"
```

---

### Task 5: lefthook drift guard

**Files:**
- Modify: `lefthook.yml`

- [ ] **Step 1: Add the drift-guard job**

In `lefthook.yml`, under `pre-commit.jobs`, add (after `website-test`):

```yaml
    - name: website-skill-summaries-drift
      glob:
        - "website/src/lib/utils/formatSkillEffect.ts"
        - "website/src/lib/skills/*.ts"
        - "website/scripts/gen-skill-summaries.ts"
        - "mods/BetterBestiary/Resources/skill-summaries.json"
      run: pnpm --filter website gen:skill-summaries && git diff --exit-code -- mods/BetterBestiary/Resources/skill-summaries.json
```

This re-bakes when the formatter, mapper, bake script, or asset change, and fails if the committed asset is stale (the dev then re-runs the bake and stages it). It runs locally because a clean CI checkout has no `compendium.db` (same reason website check/test are lefthook-only).

- [ ] **Step 2: Verify the guard passes on a clean asset**

Run: `pnpm exec lefthook run pre-commit` (or stage `formatSkillEffect.ts` and attempt a no-op commit).
Expected: `website-skill-summaries-drift` runs and passes (no diff) when the asset is current.

- [ ] **Step 3: Commit**

```bash
git add lefthook.yml
git commit -m "ci(hooks): guard skill-summaries asset against formatter drift"
```

---

## Phase 2 — Mod data layer

### Task 6: `SkillId` helper + test project

**Files:**
- Create: `mods/BetterBestiary/Data/SkillId.cs`
- Create: `tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj`
- Create: `tests/BetterBestiary.Tests/SkillIdTests.cs`
- Modify: `AncientKingdomsMods.sln` (add test project)

- [ ] **Step 1: Create the IL2CPP-free id helper**

`mods/BetterBestiary/Data/SkillId.cs` — a verbatim copy of `BaseExporter.SanitizeId` (`mods/DataExporter/Exporters/BaseExporter.cs:48`) so runtime ids match exported ids. No IL2CPP/Unity dependency (unit-testable):

```csharp
using System.Text.RegularExpressions;

namespace BetterBestiary.Data;

/// <summary>
/// Mirrors DataExporter BaseExporter.SanitizeId so the mod derives the SAME
/// skill id the exporter wrote into skill-summaries.json. Keep in sync; the
/// parity test in tests/BetterBestiary.Tests/SkillIdTests.cs enforces this.
/// </summary>
internal static class SkillId
{
    public static string Sanitize(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var sanitized = input.ToLowerInvariant().Replace(" ", "_");
        sanitized = Regex.Replace(sanitized, @"[^a-z0-9_\-]", "");
        return sanitized;
    }
}
```

- [ ] **Step 2: Create the test project**

`tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj` (mirrors `tests/DataExporter.Tests/DataExporter.Tests.csproj`, linking the IL2CPP-free sources):

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <RollForward>Major</RollForward>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>

  <ItemGroup>
    <Compile Include="..\..\mods\BetterBestiary\Data\SkillId.cs" Link="Data\SkillId.cs" />
    <Compile Include="..\..\mods\BetterBestiary\Data\SkillSummaryStore.cs" Link="Data\SkillSummaryStore.cs" />
  </ItemGroup>
</Project>
```

> `SkillSummaryStore.cs` is created in Task 7; if running tests before then, comment out that `<Compile>` line until it exists.

- [ ] **Step 3: Write the parity test**

`tests/BetterBestiary.Tests/SkillIdTests.cs`:

```csharp
using BetterBestiary.Data;
using Xunit;

namespace BetterBestiary.Tests;

public class SkillIdTests
{
    [Theory]
    [InlineData("Seismic Slam", "seismic_slam")]
    [InlineData("Frost Nova", "frost_nova")]
    [InlineData("Fire-Ball!", "fire-ball")]
    [InlineData("A B  C", "a_b__c")]
    public void Sanitize_MatchesExporterScheme(string input, string expected)
        => Assert.Equal(expected, SkillId.Sanitize(input));

    [Fact]
    public void Sanitize_PassesThroughNullOrEmpty()
    {
        Assert.Equal("", SkillId.Sanitize(""));
        Assert.Null(SkillId.Sanitize(null!));
    }
}
```

- [ ] **Step 4: Run the test**

Run: `dotnet test tests/BetterBestiary.Tests`
Expected: PASS (parity cases). If `SkillSummaryStore.cs` is not yet present, keep its `<Compile>` line commented (Step 2 note).

- [ ] **Step 5: Add test project to the solution and commit**

```bash
dotnet sln AncientKingdomsMods.sln add tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj
git add mods/BetterBestiary/Data/SkillId.cs tests/BetterBestiary.Tests AncientKingdomsMods.sln
git commit -m "feat(mods): add SkillId helper with exporter-parity test"
```

---

### Task 7: Embed the asset + `SkillSummaryStore`

**Files:**
- Modify: `mods/BetterBestiary/BetterBestiary.csproj`
- Create: `mods/BetterBestiary/Data/SkillSummaryStore.cs`
- Create: `tests/BetterBestiary.Tests/SkillSummaryStoreTests.cs`

- [ ] **Step 1: Embed the asset + add Newtonsoft**

In `mods/BetterBestiary/BetterBestiary.csproj`, inside the `<ItemGroup>`, add:

```xml
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <EmbeddedResource Include="Resources\skill-summaries.json">
      <LogicalName>skill-summaries.json</LogicalName>
    </EmbeddedResource>
```

- [ ] **Step 2: Write the store with a testable `Parse`**

`mods/BetterBestiary/Data/SkillSummaryStore.cs` — IL2CPP-free (uses Newtonsoft only), so it is unit-testable:

```csharp
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using Newtonsoft.Json;

namespace BetterBestiary.Data;

/// <summary>
/// Loads the embedded skill-summaries.json (skill_id -> skill-intrinsic effect
/// string, baked from the website's formatSkillEffect). Lookup is by SkillId.
/// </summary>
internal sealed class SkillSummaryStore
{
    private readonly Dictionary<string, string> _byId;

    private SkillSummaryStore(Dictionary<string, string> byId) => _byId = byId;

    /// <summary>Returns the summary for a skill id, or null if absent.</summary>
    public string? Get(string skillId)
        => skillId != null && _byId.TryGetValue(skillId, out var s) ? s : null;

    public int Count => _byId.Count;

    public static SkillSummaryStore Parse(string json)
    {
        var map = JsonConvert.DeserializeObject<Dictionary<string, string>>(json)
                  ?? new Dictionary<string, string>();
        return new SkillSummaryStore(map);
    }

    public static SkillSummaryStore LoadEmbedded()
    {
        var asm = Assembly.GetExecutingAssembly();
        using var stream = asm.GetManifestResourceStream("skill-summaries.json");
        if (stream == null)
            return new SkillSummaryStore(new Dictionary<string, string>());
        using var reader = new StreamReader(stream);
        return Parse(reader.ReadToEnd());
    }
}
```

- [ ] **Step 3: Write the store test**

`tests/BetterBestiary.Tests/SkillSummaryStoreTests.cs`:

```csharp
using BetterBestiary.Data;
using Xunit;

namespace BetterBestiary.Tests;

public class SkillSummaryStoreTests
{
    [Fact]
    public void Get_ReturnsSummaryForKnownId()
    {
        var store = SkillSummaryStore.Parse("{\"seismic_slam\":\"300 dmg, stun 2s\"}");
        Assert.Equal("300 dmg, stun 2s", store.Get("seismic_slam"));
        Assert.Equal(1, store.Count);
    }

    [Fact]
    public void Get_ReturnsNullForMissingId()
    {
        var store = SkillSummaryStore.Parse("{}");
        Assert.Null(store.Get("nope"));
    }
}
```

- [ ] **Step 4: Run tests (uncomment the store `<Compile>` line from Task 6 Step 2)**

Run: `dotnet test tests/BetterBestiary.Tests`
Expected: PASS (SkillId + SkillSummaryStore).

- [ ] **Step 5: Build the mod to confirm the resource embeds**

Run: `dotnet run --project build-tool build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add mods/BetterBestiary/BetterBestiary.csproj mods/BetterBestiary/Data/SkillSummaryStore.cs tests/BetterBestiary.Tests/SkillSummaryStoreTests.cs
git commit -m "feat(mods): embed + load skill summaries asset"
```

---

### Task 8: Feature toggle setting

**Files:**
- Modify: `mods/BetterBestiary/BetterBestiarySettings.cs`

- [ ] **Step 1: Add the `ShowSkillsPanelButton` entry**

In `BetterBestiarySettings`, add alongside the existing entry:

```csharp
    private static MelonPreferences_Entry<bool> _showSkillsPanelButton;

    internal static bool ShowSkillsPanelButton =>
        _showSkillsPanelButton == null || _showSkillsPanelButton.Value;
```

And in `Initialize()`:

```csharp
        _showSkillsPanelButton = category.CreateEntry(
            "ShowSkillsPanelButton",
            true,
            "Show the Skills button + side panel on the Bestiary detail page.");
```

- [ ] **Step 2: Build + commit**

Run: `dotnet run --project build-tool build` (expect success)

```bash
git add mods/BetterBestiary/BetterBestiarySettings.cs
git commit -m "feat(mods): add ShowSkillsPanelButton setting"
```

---

## Phase 3 — Mod UI (native uGUI)

> These tasks construct uGUI at runtime against IL2CPP types. They compile against the referenced Unity assemblies; **layout constants (sizes/spacing/gap/width) are initial values tuned in Task 13's runtime pass.** Use Unity layout groups (auto-layout) so tuning is minimal. Verify each task by building (`dotnet run --project build-tool build`); visual correctness is verified at runtime in Task 13.

### Task 9: `SkillsToggleButton`

**Files:**
- Create: `mods/BetterBestiary/Ui/SkillsToggleButton.cs`

- [ ] **Step 1: Implement the toggle button**

Clones the visual of an existing journal button (`UIJournalSlot.button`, found via `UIJournal.singleton.slotPrefab`) and parents it to the Bestiary detail panel, bottom-right. Calls back on click.

```csharp
using System;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace BetterBestiary.Ui;

internal sealed class SkillsToggleButton
{
    private GameObject _go;
    private readonly Action _onClick;

    public SkillsToggleButton(Action onClick) => _onClick = onClick;

    public bool Exists => _go != null;

    /// <summary>Create the button under the bestiary detail panel if not present.</summary>
    public void EnsureCreated(UIJournal journal)
    {
        if (_go != null || journal == null || journal.monsterDetail == null || journal.slotPrefab == null)
            return;

        // Clone an existing button for a native look, then restyle as a labeled action button.
        var template = journal.slotPrefab.button;
        if (template == null)
            return;

        _go = Object.Instantiate(template.gameObject, journal.monsterDetail.transform);
        _go.name = "BetterBestiary_SkillsButton";

        var rect = _go.GetComponent<RectTransform>();
        // Bottom-right of the detail panel. Tuned in Task 13.
        rect.anchorMin = new Vector2(1f, 0f);
        rect.anchorMax = new Vector2(1f, 0f);
        rect.pivot = new Vector2(1f, 0f);
        rect.anchoredPosition = new Vector2(-16f, 16f);
        rect.sizeDelta = new Vector2(120f, 36f);

        // Label it "Skills".
        var label = _go.GetComponentInChildren<TextMeshProUGUI>(true);
        if (label != null)
        {
            label.text = "Skills";
            label.gameObject.SetActive(true);
        }

        var button = _go.GetComponent<Button>();
        if (button != null)
        {
            button.onClick.RemoveAllListeners();
            button.onClick.AddListener((UnityEngine.Events.UnityAction)(() => _onClick()));
        }

        _go.SetActive(true);
    }

    public void SetVisible(bool visible)
    {
        if (_go != null)
            _go.SetActive(visible);
    }
}
```

> If `UIJournalSlot.button` is too list-slot-shaped to restyle cleanly, the Task 13 pass may instead build a plain button: `new GameObject` + `Image` + `Button` + child `TextMeshProUGUI`. Keep the public surface (`EnsureCreated`/`SetVisible`) identical.

- [ ] **Step 2: Build + commit**

Run: `dotnet run --project build-tool build` (expect success)

```bash
git add mods/BetterBestiary/Ui/SkillsToggleButton.cs
git commit -m "feat(mods): add Skills toggle button"
```

---

### Task 10: `SkillsPanel` (container, position, show/hide)

**Files:**
- Create: `mods/BetterBestiary/Ui/SkillsPanel.cs`

- [ ] **Step 1: Implement the panel container**

Builds a panel as a sibling of `rectTransformJournal` (same parent → same coordinate space), positioned on the side of the window with more room, clamped on-screen. Provides a `content` transform for rows and a `rowTemplate` for `UIUtils.BalancePrefabs`.

```csharp
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace BetterBestiary.Ui;

internal sealed class SkillsPanel
{
    private const float Gap = 12f;
    private const float Width = 460f;

    private GameObject _root;
    private RectTransform _rect;
    private TextMeshProUGUI _title;
    public Transform Content { get; private set; }
    public GameObject RowTemplate { get; private set; }

    public bool IsOpen => _root != null && _root.activeSelf;

    public void EnsureCreated()
    {
        var journal = UIJournal.singleton;
        if (_root != null || journal == null || journal.rectTransformJournal == null)
            return;

        var parent = journal.rectTransformJournal.parent;
        _root = new GameObject("BetterBestiary_SkillsPanel", new[]
        {
            Il2CppInterop.Runtime.Il2CppType.Of<RectTransform>(),
            Il2CppInterop.Runtime.Il2CppType.Of<Image>(),
            Il2CppInterop.Runtime.Il2CppType.Of<VerticalLayoutGroup>(),
        });
        _rect = _root.GetComponent<RectTransform>();
        _rect.SetParent(parent, false);

        var bg = _root.GetComponent<Image>();
        bg.color = new Color(0.06f, 0.06f, 0.08f, 0.95f);

        var layout = _root.GetComponent<VerticalLayoutGroup>();
        layout.childControlWidth = true;
        layout.childControlHeight = false;
        layout.childForceExpandWidth = true;
        layout.padding = new RectOffset(10, 10, 10, 10);
        layout.spacing = 6f;

        // Title
        _title = MakeText(_root.transform, "Skills", 20, FontStyles.Bold);

        // Scroll area + content
        var scrollGo = new GameObject("Scroll", new[]
        {
            Il2CppInterop.Runtime.Il2CppType.Of<RectTransform>(),
            Il2CppInterop.Runtime.Il2CppType.Of<Image>(),
            Il2CppInterop.Runtime.Il2CppType.Of<ScrollRect>(),
            Il2CppInterop.Runtime.Il2CppType.Of<RectMask2D>(),
        });
        scrollGo.transform.SetParent(_root.transform, false);
        var scrollLe = scrollGo.AddComponent<LayoutElement>();
        scrollLe.flexibleHeight = 1f;
        scrollLe.minHeight = 200f;

        var contentGo = new GameObject("Content", new[]
        {
            Il2CppInterop.Runtime.Il2CppType.Of<RectTransform>(),
            Il2CppInterop.Runtime.Il2CppType.Of<VerticalLayoutGroup>(),
            Il2CppInterop.Runtime.Il2CppType.Of<ContentSizeFitter>(),
        });
        contentGo.transform.SetParent(scrollGo.transform, false);
        var contentLayout = contentGo.GetComponent<VerticalLayoutGroup>();
        contentLayout.childControlWidth = true;
        contentLayout.childControlHeight = false;
        contentLayout.childForceExpandWidth = true;
        contentLayout.spacing = 4f;
        var fitter = contentGo.GetComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        var scroll = scrollGo.GetComponent<ScrollRect>();
        scroll.content = contentGo.GetComponent<RectTransform>();
        scroll.horizontal = false;
        scroll.viewport = scrollGo.GetComponent<RectTransform>();
        Content = contentGo.transform;

        RowTemplate = SkillsPanelRenderer.BuildRowTemplate(_root.transform);
        RowTemplate.SetActive(false);

        _root.SetActive(false);
    }

    public void SetTitle(string monsterName) { if (_title != null) _title.text = "Skills — " + monsterName; }

    public void Toggle() => SetOpen(!IsOpen);

    public void SetOpen(bool open)
    {
        EnsureCreated();
        if (_root == null) return;
        _root.SetActive(open);
        if (open) Reposition();
    }

    /// <summary>Dock to the side of the journal window with more room; clamp on-screen.</summary>
    public void Reposition()
    {
        var journal = UIJournal.singleton;
        if (_rect == null || journal == null || journal.rectTransformJournal == null) return;
        var win = journal.rectTransformJournal;

        // Match the window's vertical placement and height.
        _rect.anchorMin = win.anchorMin;
        _rect.anchorMax = win.anchorMax;
        _rect.pivot = win.pivot;
        _rect.sizeDelta = new Vector2(Width, win.rect.height);

        var corners = new Il2CppStructArray<Vector3>(4);
        win.GetWorldCorners(corners);
        float winLeftPx = RectTransformUtility.WorldToScreenPoint(null, corners[0]).x;
        float winRightPx = RectTransformUtility.WorldToScreenPoint(null, corners[2]).x;
        bool placeRight = (Screen.width - winRightPx) >= winLeftPx; // more room on the right?

        float dir = placeRight ? 1f : -1f;
        var pos = win.anchoredPosition;
        pos.x += dir * (win.rect.width + Gap);
        _rect.anchoredPosition = pos;

        // Clamp fully on-screen.
        var selfCorners = new Il2CppStructArray<Vector3>(4);
        _rect.GetWorldCorners(selfCorners);
        float leftPx = RectTransformUtility.WorldToScreenPoint(null, selfCorners[0]).x;
        float rightPx = RectTransformUtility.WorldToScreenPoint(null, selfCorners[2]).x;
        float scale = _rect.lossyScale.x <= 0f ? 1f : _rect.lossyScale.x;
        if (rightPx > Screen.width) _rect.anchoredPosition += new Vector2(-(rightPx - Screen.width) / scale, 0f);
        else if (leftPx < 0f) _rect.anchoredPosition += new Vector2(-leftPx / scale, 0f);

        _rect.SetAsLastSibling();
    }

    internal static TextMeshProUGUI MakeText(Transform parent, string text, float size, FontStyles style)
    {
        var go = new GameObject("Text", new[] { Il2CppInterop.Runtime.Il2CppType.Of<RectTransform>() });
        go.transform.SetParent(parent, false);
        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = size;
        tmp.fontStyle = style;
        tmp.color = Color.white;
        return tmp;
    }
}
```

> Uses `Il2CppInterop.Runtime.Il2CppType.Of<T>()` for `new GameObject(name, Il2CppType[])` and `Il2CppStructArray<Vector3>` for `GetWorldCorners` (IL2CPP idioms). If `RectTransformUtility.WorldToScreenPoint(null, …)` misbehaves under the active Canvas render mode, Task 13 swaps to the journal's Canvas camera. Width/Gap/colors are tuned in Task 13.

- [ ] **Step 2: Build + commit**

Run: `dotnet run --project build-tool build` (expect success — note `SkillsPanelRenderer.BuildRowTemplate` is added in Task 11; temporarily stub it returning `new GameObject()` to compile, or implement Task 11 first).

```bash
git add mods/BetterBestiary/Ui/SkillsPanel.cs
git commit -m "feat(mods): add Skills panel container with placement"
```

---

### Task 11: `SkillsPanelRenderer` (rows)

**Files:**
- Create: `mods/BetterBestiary/Ui/SkillsPanelRenderer.cs`

- [ ] **Step 1: Implement the row template + per-monster population**

Reads `monster.skills.skillTemplates`, derives `skill_id` via `SkillId.Sanitize`, looks up the summary, and fills icon/name/summary/cooldown/cast. Index 0 is labeled `(basic attack)`; passives show `Passive`.

```csharp
using System.Globalization;
using BetterBestiary.Data;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BetterBestiary.Ui;

internal static class SkillsPanelRenderer
{
    // Column widths (px) — tuned in Task 13.
    private const float IconW = 40f, NameW = 150f, CdW = 64f, CastW = 64f;

    public static GameObject BuildRowTemplate(Transform parent)
    {
        var row = new GameObject("SkillRowTemplate", new[]
        {
            Il2CppInterop.Runtime.Il2CppType.Of<RectTransform>(),
            Il2CppInterop.Runtime.Il2CppType.Of<HorizontalLayoutGroup>(),
        });
        row.transform.SetParent(parent, false);
        var hl = row.GetComponent<HorizontalLayoutGroup>();
        hl.childControlWidth = true;
        hl.childControlHeight = true;
        hl.childForceExpandHeight = false;
        hl.spacing = 8f;

        AddIcon(row.transform, IconW);
        AddCell(row.transform, "Name", NameW, TextAlignmentOptions.Left);
        AddCell(row.transform, "Summary", 0f, TextAlignmentOptions.Left, flexible: true);
        AddCell(row.transform, "Cd", CdW, TextAlignmentOptions.Right);
        AddCell(row.transform, "Cast", CastW, TextAlignmentOptions.Right);
        return row;
    }

    public static void Populate(SkillsPanel panel, Monster monster, SkillSummaryStore store)
    {
        var skills = monster?.skills;
        var templates = skills != null ? skills.skillTemplates : null;
        int count = templates != null ? templates.Length : 0;

        UIUtils.BalancePrefabs(panel.RowTemplate, count, panel.Content);

        for (int i = 0; i < count; i++)
        {
            var skill = templates[i];
            var rowTf = panel.Content.GetChild(i);
            rowTf.gameObject.SetActive(skill != null);
            if (skill == null) continue;

            var icon = rowTf.GetChild(0).GetComponent<Image>();
            var name = rowTf.GetChild(1).GetComponent<TextMeshProUGUI>();
            var summary = rowTf.GetChild(2).GetComponent<TextMeshProUGUI>();
            var cd = rowTf.GetChild(3).GetComponent<TextMeshProUGUI>();
            var cast = rowTf.GetChild(4).GetComponent<TextMeshProUGUI>();

            icon.sprite = skill.image;             // fallback handled by Task 13 if null
            icon.enabled = skill.image != null;
            name.text = i == 0 ? skill.nameSkill + "\n<size=70%>(basic attack)</size>" : skill.nameSkill;

            var id = SkillId.Sanitize(skill.name);
            summary.text = store.Get(id) ?? "—";

            bool passive = IsPassive(skill);
            cd.text = passive ? "Passive" : Pretty(skill.cooldown.Get(1));
            cast.text = passive ? "" : Pretty(skill.castTime.Get(1));
        }
    }

    private static bool IsPassive(ScriptableSkill skill)
        => skill.castTime.Get(1) <= 0f && skill.cooldown.Get(1) <= 0f;

    private static string Pretty(float seconds)
        => seconds <= 0f ? "—" : Utils.PrettySeconds(seconds);

    private static void AddIcon(Transform parent, float width)
    {
        var go = new GameObject("Icon", new[]
        {
            Il2CppInterop.Runtime.Il2CppType.Of<RectTransform>(),
            Il2CppInterop.Runtime.Il2CppType.Of<Image>(),
        });
        go.transform.SetParent(parent, false);
        var le = go.AddComponent<LayoutElement>();
        le.preferredWidth = width; le.preferredHeight = width;
    }

    private static void AddCell(Transform parent, string name, float width, TextAlignmentOptions align, bool flexible = false)
    {
        var tmp = SkillsPanel.MakeText(parent, "", 16, FontStyles.Normal);
        tmp.gameObject.name = name;
        tmp.alignment = align;
        tmp.textWrappingMode = TextWrappingModes.Normal;
        var le = tmp.gameObject.AddComponent<LayoutElement>();
        if (flexible) le.flexibleWidth = 1f; else le.preferredWidth = width;
    }
}
```

> `Utils.PrettySeconds` is the game's formatter (used by `ScriptableSkill.ToolTip`). `IsPassive` keys off zero cd+cast; refine in Task 13 if a non-passive skill has both zero. Fallback icon sprite (when `skill.image == null`) is wired in Task 13 (mirror `BestiaryMonsterSprites`).

- [ ] **Step 2: Build + commit**

Run: `dotnet run --project build-tool build` (expect success; remove any temporary `BuildRowTemplate` stub from Task 10)

```bash
git add mods/BetterBestiary/Ui/SkillsPanelRenderer.cs mods/BetterBestiary/Ui/SkillsPanel.cs
git commit -m "feat(mods): render monster skill rows"
```

---

### Task 12: Wire the panel into the bestiary update

**Files:**
- Modify: `mods/BetterBestiary/Patches/UIBestiaryDetailPatch.cs`
- Create: `mods/BetterBestiary/Ui/SkillsPanelController.cs`

- [ ] **Step 1: Add a controller that owns the button + panel + store**

`mods/BetterBestiary/Ui/SkillsPanelController.cs`:

```csharp
using BetterBestiary.Data;
using Il2Cpp;

namespace BetterBestiary.Ui;

internal static class SkillsPanelController
{
    private static SkillSummaryStore _store;
    private static SkillsPanel _panel;
    private static SkillsToggleButton _button;
    private static Monster _current;
    private static Monster _rendered;

    public static void OnBestiaryUpdate(UIBestiaryDetail detail)
    {
        if (!BetterBestiarySettings.ShowSkillsPanelButton) return;
        var journal = UIJournal.singleton;
        if (detail == null || detail.monster == null || journal == null ||
            journal.panel == null || !journal.panel.activeSelf || journal.currentTab != "Bestiary")
            return;

        _store ??= SkillSummaryStore.LoadEmbedded();
        _panel ??= new SkillsPanel();
        _button ??= new SkillsToggleButton(TogglePanel);

        _current = detail.monster;
        _button.EnsureCreated(journal);

        // While open, keep the panel in sync with the selected monster.
        if (_panel.IsOpen && _current != _rendered)
            RenderCurrent();
    }

    private static void TogglePanel()
    {
        _panel.SetOpen(!_panel.IsOpen);
        if (_panel.IsOpen)
            RenderCurrent();
    }

    private static void RenderCurrent()
    {
        if (_current == null) return;
        _panel.SetTitle(_current.nameEntity);
        SkillsPanelRenderer.Populate(_panel, _current, _store);
        _rendered = _current;
    }
}
```

- [ ] **Step 2: Drive it from the existing postfix**

In `mods/BetterBestiary/Patches/UIBestiaryDetailPatch.cs`, add the controller call after the existing reveal (keep the try/catch + `ReportPatchException`):

```csharp
        try
        {
            Ui.BestiaryDetailRenderer.Reveal(__instance);
            Ui.SkillsPanelController.OnBestiaryUpdate(__instance);
        }
        catch (System.Exception ex)
        {
            BetterBestiary.ReportPatchException(ex);
        }
```

- [ ] **Step 3: Build + commit**

Run: `dotnet run --project build-tool build` (expect success)

```bash
git add mods/BetterBestiary/Ui/SkillsPanelController.cs mods/BetterBestiary/Patches/UIBestiaryDetailPatch.cs
git commit -m "feat(mods): wire skills panel into bestiary update"
```

---

## Phase 4 — Verification & docs

### Task 13: Runtime smoke + visual tuning

**Files:** (tuning only — `Ui/*.cs` constants, fallback icon)

- [ ] **Step 1: Deploy and launch**

```bash
dotnet run --project build-tool build && dotnet run --project build-tool deploy && dotnet run --project build-tool launch --wait
```

- [ ] **Step 2: Manual checklist (open Bestiary in-game)**
- The "Skills" button appears bottom-right of the Bestiary detail page.
- Clicking it toggles the panel; it docks to the side with more room and stays fully on-screen (test by moving the game window / changing resolution to a narrow size).
- Rows show icon, name, summary, cooldown, cast for a known boss; cross-check 2–3 summaries against that monster's skills on the website `/skills` page (must match — skill-intrinsic).
- Row 0 is labeled `(basic attack)`; a passive shows `Passive` and no cast.
- Switch monsters (click another in the list): the panel re-populates and the title updates.
- Pick a monster/skill **absent** from the asset (or temporarily remove one key): that row shows `—` for summary, never crashes.

- [ ] **Step 3: Tune + add the fallback icon**

Adjust the layout constants (`Width`, `Gap`, column widths, padding, colors) for readability. Add a fallback sprite when `skill.image == null` (reuse the pattern in `mods/BetterBestiary/Ui/BestiaryMonsterSprites.cs`). Rebuild/redeploy and re-verify.

- [ ] **Step 4: Commit any tuning**

```bash
git add mods/BetterBestiary/Ui
git commit -m "fix(mods): tune skills panel layout and icon fallback"
```

### Task 14: Final docs pass

- [ ] **Step 1: Verify README + spec reflect shipped behavior**

Confirm `README.md` mod table (Task 1 Step 7) is accurate. Add a one-line note to `docs/data-export-guide.md` or the `update-game-version` workflow that `pnpm --filter website gen:skill-summaries` must be re-run after a game data refresh (the lefthook guard enforces it on commit).

- [ ] **Step 2: Commit**

```bash
git add README.md docs/
git commit -m "docs: note skill-summaries regeneration in update workflow"
```

---

## Self-Review

**Spec coverage:**
- Skill-intrinsic summaries, skill-global asset, joined by `skill_id` → Tasks 2–4, 6, 11. ✓
- `formatSkillEffect` single source + shared mapper → Task 2. ✓
- Lefthook drift guard (not CI) → Task 5. ✓
- No tooltips → renderer shows no hover tooltip (Task 11). ✓
- Columns Icon+Name │ Summary │ CD │ Cast; basic attack included/labeled; passive handling → Task 11. ✓
- Icon + cd + cast live from `ScriptableSkill`, base level `.Get(1)`; fallback icon → Tasks 11, 13. ✓
- Panel docks roomier side, clamped → Task 10. ✓
- Bestiary tab only → controller guards `currentTab == "Bestiary"` (Task 12). ✓
- Rename + no prefs migration → Task 1. ✓
- `SanitizeId` copied + parity test → Task 6. ✓
- Embedded asset → Task 7. ✓
- `ShowSkillsPanelButton` setting → Task 8. ✓
- Patch-exception safety → Task 12 reuses `ReportPatchException`. ✓

**Type/name consistency:** `SkillsPanel` (`EnsureCreated`/`SetOpen`/`Toggle`/`Reposition`/`Content`/`RowTemplate`/`MakeText`), `SkillsPanelRenderer` (`BuildRowTemplate`/`Populate`), `SkillsToggleButton` (`EnsureCreated`/`SetVisible`), `SkillSummaryStore` (`Parse`/`LoadEmbedded`/`Get`/`Count`), `SkillId.Sanitize` — referenced consistently across Tasks 6–13.

**Known runtime-tuning points (not placeholders):** only the uGUI layout constants (sizes, spacing, colors, column widths) and the fallback icon sprite are deferred to Task 13's runtime pass. All logic, data, and controller-wiring code is complete and concrete.
