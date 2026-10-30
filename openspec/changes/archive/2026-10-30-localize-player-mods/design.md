# Design

## Context

BetterBestiary's Harmony prefix skips `UIBestiaryDetail.Update` and a postfix draws the page instead. Vanilla applies all of the page's localization inside that update: `Entity.LocalizedName`, `EntityNameLocalization.LocalizeReferences` on lore, `ScriptableItem.LocalizedDurabilityPercent`, and `EntityNameLocalization.ApplyFont` on the name and lore labels. The game selects the language only on the title screen. Its translation helpers key their caches by locale, and vanilla re-applies text and fonts every frame.

The game's monster names come from a separate entity-name catalog, and items, skills, zones, classes and UI labels come from `Localization_String_Table`. Monster types, most monster classes, sub-zone names, lore prose and durations have no translation, and vanilla shows them in English.

The loot area is a 400 x 128 `GridLayoutGroup` with six 56 px columns, spacing 8 x 4, and twelve serialized slots. Each slot's children are fixed-size and centered. Twenty-two bosses and four other monsters list 13 to 17 drops.

## Goals / Non-Goals

**Goals:**

- Match or exceed vanilla localization on every surface the mods draw.
- Keep the mods working in host and client mode, and across every monster page.

**Non-Goals:**

- Translating BetterBestiary's skill effect summaries, or adding translations the game lacks. The summaries stay byte-identical to the website formatter, which the parity test enforces.
- Translating the mods' own labels that have no game key, such as BossTracker's section headers and BossSkillTracker's gate states.

## Decisions

### One shared localization helper, linked as source

`mods/Shared/GameText.cs` wraps the game helpers: monster and skill names, string-table terms with fallbacks, class and zone lookups, and font application. The three mods compile it by link, following the existing `DataExporter` links, because each mod ships as one self-contained DLL. A shared DLL would add a second download.

### Apply text and fonts every frame, as vanilla does

The page postfix already runs every frame, so it sets localized text and calls `ApplyFont` on the labels it writes. A change of language between sessions then needs no event handling. Mod-created TMP labels get `UITutorial.ApplyLocalizedFont` with a Latin font that the helper picks once. When a label's current font is the game's CJK font, the helper uses `TMP_Settings.defaultFontAsset` as the Latin font, as `UIWiki` does. Otherwise a label created in a Chinese session would keep the CJK font as its "original".

### Zones by name, not by id

`Monster.zoneMonster` is free text, and `Monster.idZone` disagrees with it on some monsters (Everfrost monsters with id 0). The helper matches `zoneMonster` against the game's zone names, ignoring case and a leading "The", and translates the matched zone. Sub-zone names such as Orc Village stay English. An empty `zoneMonster` falls back to `idZone`, as the mod did before. The matcher is plain C# and unit-tested.

### Classes through the game's class keys

`item.class.<class>` covers six player classes cleanly. The flat `<class>` keys add Bard and Necromancer. The Japanese flat `warrior` entry carries furigana, so the item key wins when both exist. Other monster classes stay English.

### Loot layout picks the largest icon that fits

A pure function picks the largest cell size from 56 px down to 32 px for which all drops fit the 400 x 128 area, keeping the game's spacing. At 12 drops or fewer the result is the vanilla layout. Children are scaled by cell/56, because their sizes are fixed. Extra slots are clones of the last serialized slot, created once under the same grid and hidden when unused. When the game draws a page, the extra slots are hidden and the vanilla layout is restored. The function is unit-tested at its boundaries.

Alternatives: a scroll view (hides drops behind a scroll, and gamepad focus must scroll it), or a third row of 56 px icons (overflows the area into the lore).

### Gamepad focus through added Selectables

Each loot slot and the Skills button get a `Selectable` with no transition and explicit navigation. A prefix on `UIJournal.RefreshGamepadNavigation` skips the method while one of the mod's selectables holds focus. Otherwise the method moves focus back to a grid slot every frame. A postfix links the grid's right edge to the first loot slot, and links the loot rows, the Skills button and the current grid entry to each other. The page update polls the focused object, calls `UIShowToolTip.ShowToolTip` when a loot slot gains focus and `ForceDisableTooltip` when it loses it, as `UINpcTradingSlot` does. `GameManager.KeepGamepadMenuSelection` and `UIMenuFocusOutline` already accept any selectable under the Journal panel, so focus and outline need no further patching.

Alternative: cycling loot with a spare button while focus stays on the grid. Every gamepad button is taken in the Journal, and the tooltip would anchor to the grid slot.

### Failure isolation per monster

A failed render adds the monster's name to a set and logs the exception once. The prefix runs the vanilla update for monsters in the set. The postfix hides the mod's additions for them and draws every other monster as before. This replaces the session-wide switch.

### Remove the auto-add setting and the grid fallback

`GameManager.elitesBosses` is a serialized list. In the current version it holds every unique monster in the scene and every loaded unique prefab. A runtime scan found none missing, and none without a portrait, so the auto-add scan, Alt+Click's list insertion and the grid icon fallback change nothing. Alt+Click still opens any monster's page without adding it to the list.

### BossTracker moves to TMP and avoids the hover panel

Legacy `UI.Text` with the built-in Arial font cannot use the game's font helpers, so the tracker label becomes a `TextMeshProUGUI`. The game's monster hover panel sits in the bottom-right corner, inside the tracker's default rectangle. The default anchor moves above it. A saved position equal to the old default is treated as unmoved, so existing players get the new default, and a position the player dragged is kept.

### Build commit in the log

The SDK already writes `version+commit` into `AssemblyInformationalVersion`. Each mod logs it at initialization. Each published mod's `MelonInfo` version is bumped once with this change.

## Risks / Trade-offs

- [The game's CJK fonts may lack some symbols the mods use, such as ★ ◆ ☠ ▼ or the em dash] → Check in Chinese and Japanese screenshots, and replace any symbol that renders as a missing glyph.
- [Il2CppInterop cannot add an unregistered MonoBehaviour] → The design adds only built-in Unity components and polls focus from the existing postfix.
- [A future game version could rename or remove `RefreshGamepadNavigation`] → Harmony then fails to patch at load and logs it. Mouse behavior does not depend on that patch.
- [Shrunken icons at 13 to 17 drops are smaller than vanilla] → The smallest size actually used is 40 px, which stays legible next to the 48 px vanilla item art.
