# Proposal

## Why

The site states game formulas in at least five notations: single-letter variables ("Health cost C"), code names (`finalHeal`, `songPower`), function syntax (`clamp(… × 0.0005, 0, 0.9)`), decimal coefficients beside percentages, and prose, mostly in small monospace text. Readers have to translate each one, and the copies of general combat rules on every damage skill page have drifted from the combat page (the resist chance there omits the ±10 percentage point cap on the level term). A pilot on three Necromancer blocks showed a worded, worked, and rerunnable format that comparable wikis use.

## What Changes

- Every formula on the site becomes a calculation: named steps in words with real stat names, percentages for coefficients, ranks for skill levels, rounding stated where it happens, and a worked example computed with the game's arithmetic.
- Examples that depend on the reader's character offer "Use your numbers": editable inputs that rerun the example, with character stats remembered across pages. Calculators cover the reader's side only; nothing models a target.
- Skill pages keep only what is specific to the skill. The general damage pipeline, resistance, and combat advantage rules are stated once on the combat page and linked from skill pages.
- The damage formula display (`FormulaDisplay`) is replaced by the same calculation format, including a calculator for the damage a skill deals before the target's defenses.
- The skill page is split into layout plus one component per mechanic, chosen by a tested section list, with no change to its rendered text.
- **BREAKING** for readers of the old notation: monospace formula blocks, letters, and code names disappear from the skill pages and the mechanics pages.

## Capabilities

### New Capabilities

- `formula-presentation`: How the site presents a game formula: worded steps, units, rounding, worked examples, reader inputs, and where a general rule is stated.

### Modified Capabilities

- `skill-mechanics-card`: The card names the stat and avoidance mechanic a skill's damage meets and links to the combat page for the formulas, instead of repeating them. Leadership's attribute contribution is worded instead of written as code.

## Impact

`website/src/routes/skills/[id]/+page.svelte` (split into components under `website/src/lib/components/skill-mechanics/`), `website/src/lib/components/Calculation.svelte` and `FormulaDisplay.svelte`, `website/src/lib/utils/formula-eval.ts`, skill calculation builders under `website/src/lib/skills/` and shared helpers under `website/src/lib/calculation/`, the mechanics pages under `website/src/routes/mechanics/`, the mercenary pages, and the mechanics snapshots. The Blood Pact and Death Bloom effect summaries change in both the website formatter and the BetterBestiary tooltip formatter, which must stay in parity. No exported data or pipeline changes.
