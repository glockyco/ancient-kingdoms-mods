# Proposal

## Why

The website's labels follow no single rule. About 290 multi-word labels use title case and about 220 use sentence case, both cases sit side by side in one table or card, such as "Skill damage" beside "Mana Cost" in a skill's Rank Scaling table, and 19 concepts are written in both cases, such as "Rage Cost" and "Rage cost". Some concepts also carry different words on one page, such as "Max Health" in a skill's buff fields beside "Maximum Hit Points" in its Rank Scaling table, or different short forms, such as "Req Lvl", "Req. Level" and "Recommended level". A reader who compares two pages cannot tell whether two labels mean the same value.

## What Changes

- Every visible label and title on the website uses title-style capitalization: table column headers, field labels, card and section titles, headings, standalone link labels, buttons, tabs, toggles, filter titles and options, chips, calculation step names and calculator inputs. Game terms keep their own spelling, such as XP and AC.
- Level labels use one short form each: "Req. Level", "Rec. Level", "Min. Level" and "Max. Level".
- A concept has one name across the site: skill buff fields take the stat catalogue's names, "Drop Rate" becomes "Drop Chance", the skill summaries' "aggro" becomes "threat" on the website and in Pocket Compendium's port of the summaries, and "Knockback" in a skill's Rank Scaling table becomes "Knockback Chance".
- Text that names a label quotes it exactly, such as "The Drop Chance column is per kill".
- A table column's label is defined once. List pages that show a label map keep no second, unused header text.
- Running prose, quoted game text, item and entity names, and Pocket Compendium's in-game labels keep their current casing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reader-facing-copy`: adds the title-style capitalization rule for labels and titles, one short form per level label, and a scenario that one concept keeps one name in labels on the same page.

## Impact

- Svelte routes and components under `website/src/routes` and `website/src/lib/components`, label tables in `website/src/lib` (`skills/skill-scaling.ts`, `stats.ts`, `data/*`, `utils/roles.ts`, `calculation/*`, `skills/effect-calculations.ts`) and the list pages' label maps.
- `website/src/lib/utils/formatSkillEffect.ts`, `mods/PocketCompendium/Features/BestiaryPages/Skills/SkillEffectFormatter.cs` and the generated `tests/PocketCompendium.Tests/Fixtures/skill-effect-parity.json` for "threat".
- Website tests that assert label text.
