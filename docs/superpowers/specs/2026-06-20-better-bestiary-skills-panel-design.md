# BetterBestiary — Monster Skills Side Panel (Design)

- **Date:** 2026-06-20
- **Status:** Approved; **amended 2026-06-20** — effect summaries are computed at runtime (C# port of `formatSkillEffect`) so monsters from unreleased/dev game versions (absent from every export) are covered; the precompute-to-asset bridge is dropped.
- **Mod:** `BestiaryRevealer` → renamed `BetterBestiary`

## Summary

Add a toggleable **Skills side panel** to the in-game Bestiary. When a monster's Bestiary detail page is open, a new **"Skills"** button in the detail panel's bottom-right toggles a separate window docked beside the Bestiary window. The window shows a table of the monster's skills: **icon + name**, an **effect summary**, **cooldown**, and **cast time**.

The effect summaries are computed **at runtime** by a C# port of the website's `formatSkillEffect`, fed from each skill's **live `ScriptableSkill` fields**. This is required: the mod must work on **unreleased/dev game versions** whose monsters and skills appear in **no data export**, and a precomputed asset can only ever contain skills that existed at bake time. Summaries show **skill-intrinsic values** — the skill's own numbers, with **no monster/caster scaling** (first-draft scope). The TypeScript `formatSkillEffect` stays the **single source of truth for the website**; the C# port is held string-identical to it by a **golden parity test** over every exported skill (see [Alternatives considered](#alternatives-considered)). Icons, cooldown, and cast time are read live from the game. **No hover tooltips** — the game's native `ScriptableSkill.ToolTip` injects the *local player's* stats (`DamageSkill` adds `GetWeaponDamage()` + `health.max/3`; `HealSkill` adds a `wisdom` bonus), so it is neither monster-correct nor skill-intrinsic; the skill's own values are already in the Summary column.

The work is folded into the existing `BestiaryRevealer` mod, which is renamed to `BetterBestiary`.

## Goals

- Show, per Bestiary monster, a native-looking side panel listing its skills with: icon + name, effect summary, cooldown, cast time.
- Keep the website's `formatSkillEffect` as the single **source of truth**; the mod runs a C# port held string-identical to it by a **golden parity test** over every exported skill (no silent divergence).
- Match the look and patching style of the existing mod (native Unity uGUI, Harmony postfix on `UIBestiaryDetail.Update`).
- Include the monster's basic (auto) attack as the first row, clearly labeled.
- Rename the mod to `BetterBestiary`. A one-time reset of the mod's MelonPreferences on upgrade is acceptable (no migration required).

## Non-goals (explicitly out of scope)

- **Hunting tab** (regular creatures via `UIHuntingDetail`). Bestiary tab only (bosses/elites/fabled) for v1; Hunting is a clean follow-up.
- **Monster/caster scaling.** The panel shows **skill-intrinsic** values (`formatSkillEffect` with no `monsterContext`): the skill's own numbers, not adjusted for a specific monster's combat stats or level. (The website monster page *does* apply monster scaling interactively; the mod intentionally does not, for the first draft.)
- **Hover tooltips** of any kind.
- **ImGui** or any non-native rendering.

## Background (grounded in source)

### Existing mod architecture
- `BestiaryRevealer` is pure Unity uGUI. It Harmony-postfixes native UI `Update` methods and writes into existing fields; it clones game prefabs via `UIUtils.BalancePrefabs` (e.g. loot slots in `Ui/BestiaryLootRenderer.cs`).
- Hook point already in use: `Patches/UIBestiaryDetailPatch.cs` postfixes `UIBestiaryDetail.Update`, calling `Ui.BestiaryDetailRenderer.Reveal`.
- Failure containment pattern: `BestiaryRevealer.ReportPatchException` disables the render patch after a first error.
- Settings pattern: `BestiaryRevealerSettings` uses a `MelonPreferences` category `"BestiaryRevealer"` with entry `AutoAddMissingBestiaryEntries`.

### Bestiary window (server-scripts)
- `UIJournal` (singleton): `panel` (GameObject root), `rectTransformJournal` (RectTransform — the window rect to anchor a sibling panel to), `monsterDetail` (GameObject hosting the detail), `currentTab` (`"Bestiary"`), `OpenBestiary()`.
- `UIBestiaryDetail` (singleton): `monster` (the live `Monster` shown), display fields (`imageBoss`, `nameBoss`, loot slots `loot0..11`, …). **No Button fields** — the Skills toggle must be created.
- `UIJournalSlot`: has a `button` (Button) — usable as a visual clone source for the new toggle button.

### Skill data path (server-scripts)
- `Monster.skills` → a `MonsterSkills : Skills` component.
- `Skills.skillTemplates` (`ScriptableSkill[]`) — present client-side on the scene instance; this is the authoritative, always-available skill list. (`Skills.skills` is a server-populated `SyncList<Skill>`; `skillTemplates` is preferred because it does not depend on spawn/sync state.)
- `ScriptableSkill`: `nameSkill` (display name), `image` (icon `Sprite`), `cooldown`/`castTime`/`castRange` (`LinearFloat`, `.Get(level)`), `manaCosts`/`energyCosts` (`LinearInt`), `toolTip` (raw template).
- Skill ordering: per `MonsterSkills.NextSkill()` and the exporter comment, `skillTemplates[0]` is the **default/basic attack**; `[1+]` are specials.

### Identity / exporter id scheme (mods/DataExporter)
- Skill id = `SanitizeId(skill.name)` (`SkillExporter.cs:44`), where `skill.name` is the `ScriptableSkill`'s Unity object name.
- Monster id = `SanitizeId(monster.name)` (`MonsterExporter.cs:65`); templates and live spawns group under the same sanitized name.
- Monster→skill ids = `MonsterExporter.cs:231-241` iterates `canonical.skills.skillTemplates` and emits `SanitizeId(skillTemplate.name)` **in order** (so index = `skill_index`).
- `SanitizeId` (`BaseExporter.cs:48`): `lowercase` → spaces to `_` → strip chars outside `[a-z0-9_-]`. It is `protected static`, so it cannot be called from the mod directly.

### Effect summary source (website)
- `formatSkillEffect(skill, monsterContext?)` (`website/src/lib/utils/formatSkillEffect.ts`) builds the concise effect string. With a `monsterContext` of `{ damage, magicDamage }`, damage/heal/CC/enrage values become **monster-specific**.
- The monster page calls it with `{ damage: displayDamage, magicDamage: displayMagicDamage }` (`monsters/[id]/+page.svelte:284`), `$derived` from an **interactive** spawn-variant selector (lines 108–113, 191–205) — runtime interactivity that keeps the formatter in TS. The mod instead calls `formatSkillEffect(skill)` with **no** `monsterContext` (skill-intrinsic), identical to the website's `/skills` overview (`skills/+page.server.ts:337`).

## Architecture

```
Build-time (TypeScript = website source of truth + parity oracle)
  compendium.db ──> website/scripts/gen-skill-effect-parity.ts
                      for each skill row:
                        input   = skillRowToEffectInput(row)   // shared mapper
                        summary = formatSkillEffect(input)      // no monsterContext
                    ──> tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json
                        [ { skill_id, input, expected } ]       // golden corpus (test-only)

Runtime (C# mod — works for ANY skill, incl. unexported dev-only)
  postfix UIBestiaryDetail.Update
    ├─ ensure "Skills" toggle button exists (bottom-right of detail panel)
    └─ if panel open: populate rows for UIBestiaryDetail.monster
         per skillTemplates[i]:
           input   = SkillEffectExtractor.From(skillTemplates[i])  // live ScriptableSkill -> DTO
           summary = SkillEffectFormatter.Format(input)            // C# port (intrinsic)
           icon    = ScriptableSkill.image            (fallback sprite if null)
           name    = ScriptableSkill.nameSkill
           cooldown= ScriptableSkill.cooldown.Get(1)  -> PrettySeconds ("Passive" for passives)
           cast    = ScriptableSkill.castTime.Get(1)  -> PrettySeconds

Parity test (C#, headless)
  for each { input, expected } in skill-effect-parity.json:
    assert SkillEffectFormatter.Format(input) == expected         // fails loud on drift
```

### Alternatives considered

The original design **precomputed** summaries into an embedded JSON asset, on the assumption that the mod only needs skills present in a data export. That assumption is now void: the mod must serve **unreleased/dev game versions** whose monsters/skills are in **no export**, so summaries must be computed **at runtime** from the live skill object. Given that, the formatter must exist in the mod's process. Options:

- **C# port of `formatSkillEffect` (chosen).** ~450 lines of pure, mechanical branching (seven `format*` helpers + a ~60-entry `HARDCODED_EFFECTS` map + orchestrator). The risky half — reading the skill's fields off the live IL2CPP object — already exists in `DataExporter/SkillExporter.cs` and is reused. Drift from the TS source is contained by a **golden parity test** over every exported skill: the bake emits `{ input, expected }` pairs and the C# test asserts identical output, so a TS change that isn't ported fails the build loud. No new runtime dependencies; fails like normal code.
- **Embed a JS engine (e.g. Jint) and run the bundled `formatSkillEffect.ts`.** Zero formatter drift, but adds a JS interpreter running under MelonLoader/IL2CPP/Wine — an extra runtime moving part with opaque failure modes (a quirk yields a subtly-wrong string, not a loud failure). Rejected for that reason.
- **Native `ScriptableSkill.ToolTip`.** Rejected: player-scaled, not skill-intrinsic, and absent on some skills (see Summary).
- **Precompute-to-asset (the prior design).** Rejected: structurally cannot cover unexported dev-only skills — the exact case this feature exists for.

The website still calls `formatSkillEffect` at runtime (skill-global on `/skills`, monster-context on the monster page), so it remains the source of truth; the C# port is a faithful, parity-tested mirror, not a second source.

### Build-time: golden parity corpus (TypeScript = source of truth + oracle)
- `website/scripts/gen-skill-effect-parity.ts` opens `website/static/compendium.db` (better-sqlite3) and, for each `skills` row, builds the formatter input via the shared `skillRowToEffectInput` mapper (the same mapping the `/skills` loader uses), calls `formatSkillEffect(input)` with **no** `monsterContext`, and emits a parity corpus:
  ```json
  [
    {
      "skill_id": "seismic_slam",
      "input": { "skill_type": "target_damage", "damage": { "base_value": 300, "bonus_per_level": 0 }, "stun_chance": { "base_value": 1, "bonus_per_level": 0 }, "stun_time": { "base_value": 2, "bonus_per_level": 0 } },
      "expected": "300 dmg, 100% stun (2s)"
    }
  ]
  ```
- Written to `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json` — a **test fixture**, not a shipped asset (the DLL embeds nothing). Regenerated whenever game data or `formatSkillEffect` changes (wired into `update-game-version`). A **lefthook pre-commit drift check** re-runs the bake and fails on any diff. (Local, not CI: a clean CI checkout has no `compendium.db`.)
- `input` is exactly the post-mapper `Skill` object serialized, so the C# DTO deserializes it directly and the parity test compares like-for-like.

### Runtime: mod components
- `SkillEffectInput` — a plain C# DTO mirroring the `formatSkillEffect` `Skill` fields used by the no-context path (LinearValue as `{ base_value, bonus_per_level }`; the booleans/strings/numbers). Same field set as `skillRowToEffectInput`, matching its omissions (e.g. `is_double_exp_spell`) so output matches the website.
- `SkillEffectFormatter` — the **C# port** of `formatSkillEffect` (intrinsic/no-context branch only): the seven `format*` helpers, the `HARDCODED_EFFECTS` map, and the orchestrator. Pure and headless-testable; held identical to TS by the parity test. JS number semantics are matched (`toLocaleString` grouping, `formatPercent` rounding) — any mismatch fails parity.
- `SkillEffectExtractor` — builds a `SkillEffectInput` from a live `ScriptableSkill`, mirroring `DataExporter/SkillExporter` (`DetermineSkillType` + the `Populate*` reads) plus the loader's post-transforms (`summoned_monster_name` from the live summoned monster, `pet_name` from prefab, `id = SkillId.Sanitize(name)`, `damage_type` string). This is what makes **unexported dev-only skills** work. Per-skill extraction failures are caught, logged, and degrade that row to `"—"`.
- `SkillId` — verbatim copy of `SanitizeId` (parity unit test); used for the `HARDCODED_EFFECTS` lookup key and the corpus key.
- `SkillsPanelController` / `SkillsPanelRenderer` / `SkillsToggleButton` — own/position the panel, populate rows via `UIUtils.BalancePrefabs`, and create the toggle button (unchanged from the original design). The renderer now calls `SkillEffectFormatter.Format(SkillEffectExtractor.From(skillTemplate))` instead of an asset lookup.
- `BetterBestiarySettings` — `MelonPreferences` category `"BetterBestiary"`; `AutoAddMissingBestiaryEntries` + `ShowSkillsPanelButton` (default `true`).
- Wiring: extend the existing `UIBestiaryDetail.Update` postfix; reuse `ReportPatchException` for safety.

### Panel placement
- Read `rectTransformJournal` via `GetWorldCorners` → screen rect.
- Compute free space left of the window vs right of the window against `Screen.width`; dock the panel to the **roomier** side, vertically aligned to the window top.
- **Clamp** the panel fully on-screen (if neither side fully fits at low resolution, overlap the window edge rather than going off-screen). Matches companion-panel UX guidance (dock beside primary; never off-screen).
- Recompute on each open (and while open, since the window can be re-centered).

## UI / wireframe

```
┌───────────────────────── Bestiary window (UIJournal) ─────────────────────────┐
│ [Bestiary] [Herbalism] [Fishing] ...                                          │
│ ┌─────┐   ┌──────────┐   Ancient Golem                         Level 42       │
│ │list │   │ portrait │   HP 120K  Armor 80  M.Res 40  F.Res 25  ...           │
│ │ ▓▓◀─┼── │          │   Type Construct   Class Bruiser   Zone Deepforge      │
│ │ ▓▓  │   │          │   "Lore text wrapping across the panel..."            │
│ │ ▓▓  │   └──────────┘   Loot [▣][▣][▣][▣][▣][▣][▣][▣]                        │
│ │     │                                              ┌──────────────┐          │
│ │     │                                              │  ⚔  Skills    │ ◀─ new   │
│ └─────┘                                              └──────────────┘          │
└────────────────────────────────────────────────────────────────────────────────┘
        docks to the side with more room  ▼ (clamped on-screen)
   ┌──────────── Skills — Ancient Golem ─────────────┐
   │  Skill              Effect            CD    Cast │
   │ ───────────────────────────────────────────────  │
   │ [⚔] Strike          —                 —     —    │  ← skillTemplates[0] "(basic attack)"
   │     (basic attack)                              │
   │ [✷] Seismic Slam    300 dmg, stun 2s  8s   1.5s │
   │ [❄] Frost Nova      180 cold, -50 spd 12s   1s  │
   │      6s                                          │
   │ [✚] Enrage          +33% dmg <25% hp  Passive   │  ← passive: no CD/cast
   └──────────────────────────────────────────────────┘
    values are skill-intrinsic (no monster scaling) · no hover tooltip
```

### Visual notes (impeccable)
- Readability first: high-contrast row text over the panel background; numeric columns right-aligned and monospaced-by-tabular for scanning; name in column 1 (icon-only identity is an anti-pattern).
- Distinct treatment for the basic-attack row (subtle `(basic attack)` sub-label) and passives (`Passive` in the CD/Cast cells).
- Fallback icon sprite when `ScriptableSkill.image` is null (mirror `BestiaryMonsterSprites` fallback handling).
- Empty state: if a monster has no skills, hide the panel / show "No skills".

## Rename: BestiaryRevealer → BetterBestiary

- Rename: project folder `mods/BetterBestiary/`, `BetterBestiary.csproj`, root namespace, `MelonInfo` display name (`"Better Bestiary"`), assembly name; update `AncientKingdomsMods.sln`, `README.md`, and any references. The build tool auto-discovers projects in `mods/`, so no manual registration.
- **MelonPreferences:** the category id changes from `"BestiaryRevealer"` to `"BetterBestiary"`. **No migration** — a one-time reset of the mod's preferences on upgrade is acceptable (explicit design decision); entries are recreated with defaults under the new category.

## Identity & joining (robustness)

- Skill id = `SkillId.Sanitize(skillTemplate.name)`, matching the exporter's `skill_id` (`SkillExporter.cs:44`); it is the `HARDCODED_EFFECTS` lookup key and the parity-corpus key.
- No monster identity is needed (summaries are skill-global); the panel title uses the live `monster.nameEntity`.
- `SanitizeId` is copied verbatim into `SkillId`, with a parity unit test for known names (e.g. `"Seismic Slam"` → `seismic_slam`).

## Edge cases

- **Effect not modeled / empty summary:** if the formatter returns an empty string, render `"—"`. Extraction or formatter exceptions are caught per-skill, logged, and degrade that row to `"—"` — never crash the panel. There is no "missing asset" case: summaries are computed live, so new/dev-only skills are covered.
- **`ScriptableSkill.image` null:** fallback sprite.
- **Passive skills:** no meaningful cooldown/cast → render `Passive` (or `—`).
- **Long skill lists:** the panel list is scrollable.
- **Window re-centered / re-opened:** reposition each open and while open.
- **Patch errors:** wrapped in try/catch; reuse `ReportPatchException` so a failure disables the panel rather than breaking the Bestiary.
- **Localization/rich text:** summaries are plain text from `formatSkillEffect`; strip/convert any residual Unity rich-text consistently with existing renderers.

## Testing / verification

- **Unit:** `SkillId` parity test (`Seismic Slam` -> `seismic_slam`).
- **Formatter parity (primary):** for every `{ input, expected }` in `skill-effect-parity.json`, assert `SkillEffectFormatter.Format(input) == expected`. The cross-language source-of-truth guard — covers all exported skills headlessly; any drift from the TS formatter fails loud.
- **Generator:** the bake emits one corpus entry per `skills` row and the JSON parses.
- **Runtime smoke (build-tool):** build + deploy + launch; open the Bestiary, toggle Skills for a known boss; verify each row (icon/name/summary/CD/cast), summaries match that skill's `/skills` row, placement at wide and narrow resolution, basic-attack and passive rendering. Dev-version coverage is verified by the tester on a dev build.
- **Artifact regen:** running the bake yields no diff against the committed `skill-effect-parity.json` (lefthook drift guard).

## Future work

- Hunting tab (`UIHuntingDetail`) support.
- Optional **monster/caster scaling** of summaries (as the website monster page does interactively) — would require per-monster precompute or the damage formula in C#.
- Optional cost (mana/rage) column.

## Open questions

- None blocking. Summaries are computed at runtime in the mod; the parity corpus is a committed **test fixture**, not a shipped asset.
