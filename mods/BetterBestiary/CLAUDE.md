# BetterBestiary

Improves the in-game Bestiary with world monster selection, complete detail data, loot rendering, fallback images, and a runtime skill panel.

## Usage

- **Alt+Click** a monster in the World scene to open its Bestiary detail page.
- Open a Bestiary detail page to see the patched monster fields, loot slots, and fallback portrait when the game has no Bestiary image.
- Use the **Skills** button on the detail panel to open the skill summary side panel.

## Entry Point and Configuration

`BetterBestiary` is a MelonLoader mod. `OnInitializeMelon` creates the `BetterBestiary` preference category, logs initialization, and calls `HarmonyInstance.PatchAll()`. `OnUpdate` checks the new Input System for Alt+Click selection.

The assembly uses `[HarmonyDontPatchAll]`, so the explicit `PatchAll()` call is required.

| Preference | Default | Behaviour |
|------------|---------|-----------|
| `AutoAddMissingBestiaryEntries` | `false` | On `UIJournal.OpenBestiary`, when the active scene is `World`, scan `Resources.FindObjectsOfTypeAll<Monster>()` and add missing boss, elite, and fabled monsters. Forgotten Altar event monsters are excluded from this scan. |
| `ShowSkillsPanelButton` | `true` | Show the runtime **Skills** button and side panel on Bestiary detail pages. |

The auto-add scan deduplicates by `nameEntity`, sorts additions by name, and completes one successful scan for the lifetime of the mod. It retries when no Monster objects are available. Alt+Click also adds a selected boss, elite, or fabled monster to `GameManager.elitesBosses` when that entry is missing, independent of the auto-add preference.

## Harmony Patches

| Target | Patch | Effect |
|--------|-------|--------|
| `UIJournal.OpenBestiary` | Prefix | Runs the optional loaded-monster auto-add scan before the Bestiary opens. |
| `UIJournal.Update` | Postfix | Applies fallback grid icons to entries whose `portraitBoss` is null. Errors are logged without interrupting the journal update. |
| `UIBestiaryDetail.Update` | Postfix | Rewrites the detail fields and loot display, then updates the Skills button and panel. The first render exception disables this render patch for later updates and logs a warning. |

## World Selection and Detail UI

`BestiaryAltClickHandler` accepts a left click while either Alt key is held, only when a local player is active and the pointer is not over UI. It converts the mouse position through the main camera, with the map camera as a fallback, checks the game click filters, and chooses the hit Monster with the highest sorting order. `BestiaryPageOpener` assigns that Monster to the detail view, opens the Bestiary tab, refreshes the selected grid frame, applies grid icon fallbacks, and reveals the detail content.

`BestiaryDetailRenderer` fills the name, category color, level, lore, health, armor, elemental resistances, type, class, and zone. Zone text prefers `zoneMonster` and falls back to `ZoneInfo.zones[idZone]`. Health above 10,000 is displayed in thousands with a `K` suffix. Portrait selection prefers `imageBossBestiary`, then the Monster root `SpriteRenderer`, then a generated gray blank sprite.

`BestiaryLootRenderer` fills the twelve native loot slots from `dropChances`. It skips potions and quest-only items, and filters out low-quality items unless they are keys, equipment, or scrolls. For an elite Forgotten Altar event Monster with a quality-one equipment drop, it also looks up Magic, Epic, Legendary, and Mythic variants in `GameManager.cacheItems`. Each visible item gets its quality background, icon, and tooltip with full durability text.

## Skills Panel

The Skills button and side panel are native uGUI objects created at runtime under the journal panel. The button is anchored at the detail panel's bottom-right. The side panel docks to the right of the journal and lists each `skillTemplate` with its icon, name, intrinsic effect summary, cooldown, and cast time. Skills with zero cast time and cooldown are labelled `Passive`.

`SkillEffectExtractor` reads live `ScriptableSkill` fields into the same shape used by the website skill formatter. `SkillEffectFormatter` is the C# port of the website's `formatSkillEffect`. The panel calls it with `monsterContext: true`, which includes monster-specific formatting such as the enrage threshold. The extractor sanitizes skill IDs with the same rules as `DataExporter` so hardcoded effects use the same keys.

## Website Parity Fixture

The C# formatter has a cross-package parity contract with the website. `website/scripts/gen-skill-effect-parity.ts` reuses the website's `SKILLS_LIST_QUERY`, `skillRowToEffectInput`, and `formatSkillEffect` without monster context to generate the sorted fixture at `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json`.

Regenerate it with:

```text
pnpm --filter website gen:skill-effect-parity
```

The generator needs `website/static/compendium.db`. The `website-skill-effect-parity-drift` pre-commit job in `lefthook.yml` watches the formatter inputs, the generator, and the fixture. It reruns the generator and fails when `git diff --exit-code` finds a fixture change. `tests/BetterBestiary.Tests/SkillEffectFormatterTests.cs` embeds the same fixture and compares every case with the C# formatter, so changes to the TypeScript source require regenerating the fixture and porting the formatter change together.

## Project Layout

```text
BetterBestiary.cs             # MelonLoader entry point
BetterBestiarySettings.cs     # MelonPreferences entries
Patches/                       # Harmony hooks for journal and detail updates
Ui/                            # Detail, loot, icon, and Skills panel rendering
Skills/                        # Live skill extraction and website-parity formatting
Data/                          # Shared skill ID normalization
```
