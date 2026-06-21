# BetterBestiary — Monster Skills Side Panel (Design)

- **Date:** 2026-06-20
- **Status:** Approved for planning
- **Mod:** `BestiaryRevealer` → renamed `BetterBestiary`

## Summary

Add a toggleable **Skills side panel** to the in-game Bestiary. When a monster's Bestiary detail page is open, a new **"Skills"** button in the detail panel's bottom-right toggles a separate window docked beside the Bestiary window. The window shows a table of the monster's skills: **icon + name**, an **effect summary**, **cooldown**, and **cast time**.

The effect summaries are **precomputed** from the website's existing `formatSkillEffect` TypeScript function and bundled with the mod. They show **skill-intrinsic values** — the skill's own numbers, with **no monster/caster scaling applied** (first-draft scope). `formatSkillEffect` stays the **single source of truth** and is not reimplemented in C# — see [Alternatives considered](#alternatives-considered). Icons, cooldown, and cast time are read live from the game. **No hover tooltips** — the game has no monster-safe skill tooltip (its damage/heal tooltips inject the *local player's* stats), so a tooltip would show misleading numbers; the skill's own values are already in the Summary column.

The work is folded into the existing `BestiaryRevealer` mod, which is renamed to `BetterBestiary`.

## Goals

- Show, per Bestiary monster, a native-looking side panel listing its skills with: icon + name, effect summary, cooldown, cast time.
- Reuse the website's `formatSkillEffect` as the only source of effect-summary logic (no duplicated formatter in C#).
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
Build-time (TypeScript = single source of truth)
  compendium.db ──> website/scripts/gen-skill-summaries.ts
                      for each skill row:
                        formatSkillEffect(rowToSkill(row))   // shared mapper; no monsterContext
                    ──> mods/BetterBestiary/Resources/skill-summaries.json
                        { skill_id: summary }

Build ─> csproj embeds skill-summaries.json as an EmbeddedResource in the DLL

Runtime (C# mod)
  postfix UIBestiaryDetail.Update
    ├─ ensure "Skills" toggle button exists (bottom-right of detail panel)
    └─ if panel open: populate rows for UIBestiaryDetail.monster
         per skillTemplates[i]:
           skillId = SkillId.Sanitize(skillTemplates[i].name)
           icon    = ScriptableSkill.image          (fallback sprite if null)
           name    = ScriptableSkill.nameSkill
           summary = SkillSummaryStore[ skillId ]   (fallback "—")
           cooldown= ScriptableSkill.cooldown.Get(1) → PrettySeconds  ("Passive" for passives)
           cast    = ScriptableSkill.castTime.Get(1)  → PrettySeconds
```

### Alternatives considered

The effect-summary logic lives in exactly one place — `formatSkillEffect` (TypeScript). The mod consumes the **skill-intrinsic** variant (no `monsterContext`); the website additionally uses the monster-context variant on its monster page. Two alternatives for relocating the formatter were rejected:

- **Generate summaries in the DataExporter (C#); website + mod consume them.** Appealing in principle: derived data computed at the source, the exporter already holds typed skill fields, and mod + exporter are both C#. Rejected because (1) it requires porting ~880 lines of mature, **tested** TS (`formatSkillEffect` + `HARDCODED_EFFECTS` + `formatSkillEffect.test.ts`) to C#, with real regression risk; (2) the website's monster page still computes summaries **interactively at runtime** (`displayDamage`/`displayMagicDamage` are `$derived` from a spawn-variant `<select>`, `monsters/[id]/+page.svelte` lines 108–113, 191–205, 284–286), so the TS formatter must stay regardless — adding a C# copy is the double-maintenance we explicitly reject.
- **Port the formatter to the build-pipeline (Python) denormalizer.** Same single-source appeal, but a *third*-language port that still cannot serve the website's runtime interactivity. Strictly worse than keeping TS.

**Chosen:** keep `formatSkillEffect` in TS as the sole implementation; a small build-time bake script invokes its no-context variant to emit `{ skill_id: summary }` for the mod, while the website keeps calling it at runtime (skill-global on `/skills`, monster-context on the monster page). A **lefthook pre-commit drift check** re-runs the bake and fails on drift, so the mod artifact cannot silently diverge from the formatter. (It runs locally — CI has no `compendium.db`, mirroring how the repo already gates website check/test via lefthook rather than CI.)

### Build-time: summary generator
- New script `website/scripts/gen-skill-summaries.ts`, run via a `package.json` script (e.g. `gen:skill-summaries`).
- Opens `website/static/compendium.db` (better-sqlite3, already a dependency).
- For each row in the `skills` table, build the `formatSkillEffect` input via the **same `row → Skill` mapping the website uses** — `skills/+page.server.ts:239–323` coerces ~20 booleans (`Boolean(row.is_*)`), renames `pet_prefab_name`→`pet_name`, and maps summon/duration fields; passing a raw DB row would drift. Then call `formatSkillEffect(input)` with **no** `monsterContext`. Output matches the website's `/skills` overview (`skills/+page.server.ts:337`).
- **Extract that `row → Skill` mapping into a shared helper** (e.g. `website/src/lib/skills/skillRowToEffectInput.ts`) imported by both the `/skills` loader and this bake script, so the two cannot diverge (the drift check then enforces it).
- Emits `mods/BetterBestiary/Resources/skill-summaries.json`:
  ```json
  {
    "golem_strike": "",
    "seismic_slam": "300 dmg, stun 2s",
    "frost_nova": "180 cold dmg, -50 speed, 6s"
  }
  ```
- The committed JSON is the build artifact bridging the TS formatter and the mod. Regenerated whenever game data or `formatSkillEffect` changes (wired into the `update-game-version` workflow). A **lefthook pre-commit drift check** re-runs the bake and fails if the committed JSON differs — guaranteeing the mod can never silently drift from the website formatter. (Local, not GitHub CI: a clean CI checkout has no `compendium.db`.)

### Runtime: mod components
- `SkillSummaryStore` — loads the embedded `skill-summaries.json` once; lookup by `skillId` → summary string. Missing entries return `null`.
- `SkillId` — verbatim copy of `SanitizeId` with a parity unit test asserting it matches known exporter ids. (Skill templates are ScriptableObject assets, so no `(Clone)` handling is needed.)
- `SkillsPanelController` — owns the panel GameObject: creates it lazily, positions it beside `UIJournal.rectTransformJournal`, shows/hides on toggle, `SetAsLastSibling()` for z-order.
- `SkillsPanelRenderer` — populates rows via `UIUtils.BalancePrefabs(rowPrefab, count, container)`; fills icon/name/summary/cooldown/cast per row.
- `SkillsToggleButton` — creates the bottom-right button (cloned from `UIJournalSlot.button` visual) parented to the detail panel; `onClick` flips the controller's open state.
- `BetterBestiarySettings` — `MelonPreferences` category `"BetterBestiary"` (a fresh category; the old `"BestiaryRevealer"` prefs are not migrated — a one-time reset is acceptable), keeping `AutoAddMissingBestiaryEntries` and adding `ShowSkillsPanelButton` (default `true`) to allow disabling the feature.
- Wiring: extend the existing `UIBestiaryDetail.Update` postfix to (a) ensure the button exists and (b) refresh the panel when open. Reuse `ReportPatchException` for safety.

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

- Skill id = `SkillId.Sanitize(skillTemplate.name)`, matching the exporter's `skill_id` (`SkillExporter.cs:44`). The asset is keyed solely by this id.
- No monster identity is needed (summaries are skill-global); the panel title uses the live `monster.nameEntity`.
- `SanitizeId` is copied verbatim into `SkillId`, with a parity unit test for known names (e.g. `"Seismic Slam"` → `seismic_slam`).

## Edge cases

- **Skill not in asset** (data drift / new game version before regen): show icon/name/CD/cast from runtime, summary = `"—"`. Never crash.
- **`ScriptableSkill.image` null:** fallback sprite.
- **Passive skills:** no meaningful cooldown/cast → render `Passive` (or `—`).
- **Long skill lists:** the panel list is scrollable.
- **Window re-centered / re-opened:** reposition each open and while open.
- **Patch errors:** wrapped in try/catch; reuse `ReportPatchException` so a failure disables the panel rather than breaking the Bestiary.
- **Localization/rich text:** summaries are plain text from `formatSkillEffect`; strip/convert any residual Unity rich-text consistently with existing renderers.

## Testing / verification

- **Unit:** `SkillId` parity test asserting it matches known exporter ids (e.g. `Seismic Slam` → `seismic_slam`).
- **Generator:** assert every `skills` row yields a summary string and the JSON parses; spot-check a known skill's output equals the website's `/skills` overview row.
- **Runtime smoke (build-tool):** build + deploy + launch; open the Bestiary, toggle Skills for a known boss; verify each row (icon/name/summary/CD/cast), that summaries match that skill's row on the website `/skills` page, placement on a wide and a narrow resolution, correct basic-attack and passive rendering, and that a skill missing from the asset degrades to `"—"`.
- **Artifact regen:** running the bake script yields no diff against the committed `skill-summaries.json` (the lefthook drift guard).

## Future work

- Hunting tab (`UIHuntingDetail`) support.
- Optional **monster/caster scaling** of summaries (as the website monster page does interactively) — would require per-monster precompute or the damage formula in C#.
- Optional cost (mana/rage) column.

## Open questions

- None blocking. Asset delivery is **embedded resource** (versioned with the DLL); a loose file under `Mods/` is a documented fallback if regen-without-recompile becomes desirable.
