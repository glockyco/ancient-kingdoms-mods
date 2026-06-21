# BetterBestiary Skills Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable, native-looking "Skills" side panel to the in-game Bestiary that lists a monster's skills (icon + name, effect summary, cooldown, cast time), and rename the `BestiaryRevealer` mod to `BetterBestiary`.

**Architecture (amended 2026-06-20):** Effect summaries are **skill-intrinsic** (no monster scaling) and computed **at runtime** by a C# port of the website's `formatSkillEffect` (`mods/BetterBestiary/Skills/SkillEffectFormatter.cs`), fed from each live `ScriptableSkill` by `SkillEffectExtractor`. This covers monsters from unreleased/dev game versions that are in no data export — the original precompute-to-asset approach could not. The TypeScript `formatSkillEffect` stays the source of truth; a **golden parity test** over every exported skill holds the port string-identical. The mod is pure Unity uGUI, hooking the existing `UIBestiaryDetail.Update` Harmony postfix; icons/cooldown/cast come live from `ScriptableSkill`.

**Tech Stack:** C# (net6, MelonLoader, IL2CPP via Il2CppInterop, Harmony), TypeScript (SvelteKit, better-sqlite3, tsx, vitest), xUnit, lefthook.

**Spec:** `docs/superpowers/specs/2026-06-20-better-bestiary-skills-panel-design.md`

**Amendment (2026-06-20):** The original precompute pipeline (an embedded `skill-summaries.json` baked from the website) was replaced by a runtime C# port of `formatSkillEffect` validated by a golden parity corpus, so the panel also covers monsters absent from any data export. Tasks 3–7 below are recorded **as built**; Tasks 1–2 and 8–14 were unaffected. See the spec's amended *Alternatives considered* for the rationale.

**Source-grounding (verified):**
- Mod entry/MelonInfo: `mods/BestiaryRevealer/BestiaryRevealer.cs:4`. Settings: `mods/BestiaryRevealer/BestiaryRevealerSettings.cs`. Patch hook: `mods/BestiaryRevealer/Patches/UIBestiaryDetailPatch.cs`. uGUI prefab cloning: `mods/BestiaryRevealer/Ui/BestiaryLootRenderer.cs` via `UIUtils.BalancePrefabs`.
- Game types: `UIJournal.singleton` (`panel`, `rectTransformJournal`, `monsterDetail`, `currentTab`), `UIBestiaryDetail.singleton` (`monster`, `Update`), `UIJournalSlot.button`, `Monster.skills` → `MonsterSkills : Skills`, `Skills.skillTemplates` (`ScriptableSkill[]`), `ScriptableSkill` (`nameSkill`, `image`, `cooldown`/`castTime` `LinearFloat.Get(level)`, `toolTip`), `Utils.PrettySeconds`.
- Exporter id scheme: `SanitizeId` in `mods/DataExporter/Exporters/BaseExporter.cs:48`; skill id = `SanitizeId(skill.name)` (`SkillExporter.cs:44`).
- Website formatter: `formatSkillEffect` `website/src/lib/utils/formatSkillEffect.ts` (skill-global call at `skills/+page.server.ts:337`; row→Skill mapping at `skills/+page.server.ts:239-323`).
- Build/deploy: `dotnet run --project build-tool build|deploy|launch --wait` (`mods/CLAUDE.md`).

---

## File Structure

**Create:**
- `website/src/lib/skills/skillRowToEffectInput.ts` — shared `row → Skill` mapper (single source for the loader and the bake).
- `website/src/lib/skills/skillRowToEffectInput.test.ts` — mapper unit tests.
- `website/src/lib/skills/skillEffectParity.ts` — `SkillEffectParityCase` type (the corpus contract).
- `website/scripts/gen-skill-effect-parity.ts` — bake script: DB → `{ skill_id, input, expected }` parity corpus.
- `mods/BetterBestiary/Skills/LinearValue.cs`, `SkillEffectInput.cs` — the formatter DTO.
- `mods/BetterBestiary/Skills/SkillEffectFormatter.cs` — C# port of `formatSkillEffect` (runtime summaries).
- `mods/BetterBestiary/Skills/SkillEffectExtractor.cs` — live `ScriptableSkill` → `SkillEffectInput`.
- `mods/BetterBestiary/Data/SkillId.cs` — IL2CPP-free copy of `SanitizeId`.
- `mods/BetterBestiary/Ui/SkillsToggleButton.cs` — the bottom-right "Skills" button.
- `mods/BetterBestiary/Ui/SkillsPanel.cs` — panel GameObject: build/position/show/hide.
- `mods/BetterBestiary/Ui/SkillsPanelRenderer.cs` — populate rows for a monster.
- `mods/BetterBestiary/Ui/SkillsPanelController.cs` — own button + panel, drive from the detail update.
- `tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj` — xUnit project (links the IL2CPP-free mod sources).
- `tests/BetterBestiary.Tests/SkillIdTests.cs` — exporter id parity.
- `tests/BetterBestiary.Tests/SkillEffectFormatterTests.cs` + `LinearValueConverter.cs` — golden parity test over the corpus.
- `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json` — generated, committed parity corpus (one compact line per skill).

**Modify:**
- Rename `mods/BestiaryRevealer/` → `mods/BetterBestiary/` (+ csproj, namespace, MelonInfo, settings category).
- `website/src/routes/skills/+page.server.ts` — use the shared mapper.
- `website/package.json` — add `gen:skill-effect-parity` script + `tsx` devDep.
- `mods/BetterBestiary/Patches/UIBestiaryDetailPatch.cs` — drive button + panel.
- `lefthook.yml` — drift-guard job for the parity corpus.
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
 * Single source for BOTH the /skills loader and the parity-corpus bake, so the
 * mod's runtime C# port stays matched to the website overview. Mirrors
 * website/src/routes/skills/+page.server.ts (boolean coercions + the
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

### Task 3: Bake script — `gen-skill-effect-parity.ts`

**As built.** `website/scripts/gen-skill-effect-parity.ts` (run via `pnpm --filter website gen:skill-effect-parity`, using `tsx`) opens `website/static/compendium.db` and, for each `skills` row, builds the formatter input with the shared `skillRowToEffectInput` mapper, computes `formatSkillEffect(input)` (no `monsterContext`), and writes a stable, sorted, one-line-per-skill parity corpus of `{ skill_id, input, expected }` to `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json`. `input` is compacted to only the fields that affect the output (null / `false` / zero-LinearValue dropped), keeping the corpus small and diff-auditable.

---

### Task 4: Parity corpus artifact

**As built.** `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json` is generated by Task 3, committed, and embedded into the test assembly. (This replaces the original plan's embedded `skill-summaries.json` mod asset, which could never describe skills missing from a data export.)

---

### Task 5: lefthook drift guard

**As built.** `lefthook.yml` job `website-skill-effect-parity-drift` re-runs the bake and fails the commit if the committed corpus differs. It globs `formatSkillEffect.ts`, `format.ts`, the shared `lib/skills/*.ts` helpers, the bake script, and the corpus. Local-only — a clean CI checkout has no `compendium.db`, mirroring how website check/test are gated by lefthook rather than CI.

---

## Phase 2 — Mod data layer

### Task 6: `SkillId` helper + test project

**As built.** `mods/BetterBestiary/Data/SkillId.cs` is a verbatim, IL2CPP-free copy of `BaseExporter.SanitizeId`, used to derive the skill id (the `HARDCODED_EFFECTS` lookup key and the corpus key). `tests/BetterBestiary.Tests/` is an xUnit project that links the IL2CPP-free mod sources (`SkillId`, `LinearValue`, `SkillEffectInput`, `SkillEffectFormatter`); `SkillIdTests` asserts id parity against known exporter ids (e.g. `Seismic Slam` → `seismic_slam`).

---

### Task 7: Runtime formatter port + extractor + parity test

**As built.** Summaries are computed at runtime, not precomputed:
- `mods/BetterBestiary/Skills/SkillEffectFormatter.cs` — C# port of `formatSkillEffect` (intrinsic / no-context branch): the seven `format*` helpers, the `HARDCODED_EFFECTS` map, and the orchestrator. Pure and headless-testable.
- `mods/BetterBestiary/Skills/{LinearValue,SkillEffectInput}.cs` — the plain DTO the formatter consumes.
- `mods/BetterBestiary/Skills/SkillEffectExtractor.cs` — builds a `SkillEffectInput` from a live `ScriptableSkill`, mirroring `DataExporter/SkillExporter`'s field reads, so unexported dev-only skills are covered.
- `tests/BetterBestiary.Tests/SkillEffectFormatterTests.cs` (+ `LinearValueConverter.cs`) — runs the port over the parity corpus and asserts string-identical output for every exported skill.

The mod embeds no asset and needs no Newtonsoft; there is no `SkillSummaryStore`.

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

**As built.** `mods/BetterBestiary/Ui/SkillsPanelRenderer.cs` builds the row template (a `HorizontalLayoutGroup` with icon + name + summary + cd + cast cells) and, per `monster.skills.skillTemplates[i]`, fills icon/name/cooldown/cast live from the `ScriptableSkill` and the summary from `SkillEffectFormatter.Format(SkillEffectExtractor.From(skill))` — wrapped per-skill in try/catch so a failure degrades that row to `"—"` with a logged warning. Index 0 is labelled `(basic attack)`; a skill with zero cooldown and cast renders `Passive`. `Utils.PrettySeconds` formats the times and `UIUtils.BalancePrefabs` balances the rows.

---

### Task 12: Wire the panel into the bestiary update

**As built.** `mods/BetterBestiary/Ui/SkillsPanelController.cs` owns the toggle button and panel (no store) and is driven from the existing `UIBestiaryDetail.Update` postfix in `mods/BetterBestiary/Patches/UIBestiaryDetailPatch.cs`: after `BestiaryDetailRenderer.Reveal`, it calls `SkillsPanelController.OnBestiaryUpdate(__instance)` inside the existing try/catch (`ReportPatchException`). The controller only acts on the Bestiary tab, respects `ShowSkillsPanelButton`, lazily creates the button/panel, toggles open/closed, and re-renders when the selected monster changes via `SkillsPanelRenderer.Populate(panel, monster)`.

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
- Pick a monster whose skills are **not in any data export** (the dev-build case): the panel still shows real effect summaries, never `—` or a crash.

- [ ] **Step 3: Tune + add the fallback icon**

Adjust the layout constants (`Width`, `Gap`, column widths, padding, colors) for readability. Add a fallback sprite when `skill.image == null` (reuse the pattern in `mods/BetterBestiary/Ui/BestiaryMonsterSprites.cs`). Rebuild/redeploy and re-verify.

- [ ] **Step 4: Commit any tuning**

```bash
git add mods/BetterBestiary/Ui
git commit -m "fix(mods): tune skills panel layout and icon fallback"
```

### Task 14: Final docs pass

- [ ] **Step 1: Verify README + spec reflect shipped behavior**

Confirm `README.md` mod table (Task 1 Step 7) is accurate. Add a one-line note to `docs/data-export-guide.md` or the `update-game-version` workflow that `pnpm --filter website gen:skill-effect-parity` must be re-run after a game data refresh (the lefthook guard enforces it on commit).

- [ ] **Step 2: Commit**

```bash
git add README.md docs/
git commit -m "docs: note skill-effect-parity regeneration in update workflow"
```

---

## Self-Review

**Spec coverage:**
- Skill-intrinsic summaries computed at runtime from live `ScriptableSkill` → Tasks 3, 7, 11. ✓
- `formatSkillEffect` single source + shared mapper → Task 2. ✓
- Lefthook drift guard (not CI) → Task 5. ✓
- No tooltips → renderer shows no hover tooltip (Task 11). ✓
- Columns Icon+Name │ Summary │ CD │ Cast; basic attack included/labeled; passive handling → Task 11. ✓
- Icon + cd + cast live from `ScriptableSkill`, base level `.Get(1)`; fallback icon → Tasks 11, 13. ✓
- Panel docks roomier side, clamped → Task 10. ✓
- Bestiary tab only → controller guards `currentTab == "Bestiary"` (Task 12). ✓
- Rename + no prefs migration → Task 1. ✓
- `SanitizeId` copied + parity test → Task 6. ✓
- Runtime formatter port + parity corpus → Tasks 3, 7. ✓
- `ShowSkillsPanelButton` setting → Task 8. ✓
- Patch-exception safety → Task 12 reuses `ReportPatchException`. ✓

**Type/name consistency:** `SkillsPanel` (`EnsureCreated`/`SetOpen`/`Reposition`/`SetTitle`/`Content`/`RowTemplate`/`MakeText`), `SkillsPanelRenderer` (`BuildRowTemplate`/`Populate`), `SkillsToggleButton` (`EnsureCreated`), `SkillsPanelController` (`OnBestiaryUpdate`), `SkillEffectFormatter.Format` / `SkillEffectExtractor.From`, `SkillId.Sanitize` — referenced consistently across Tasks 6–13.

**Known runtime-tuning points (not placeholders):** only the uGUI layout constants (sizes, spacing, colors, column widths) and the fallback icon sprite are deferred to Task 13's runtime pass. All logic, data, and controller-wiring code is complete and concrete.
