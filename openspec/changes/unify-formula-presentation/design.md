# Design

## Context

The pilot (Blood Pact, Death Bloom, Drain Soul channel) introduced `Calculation.svelte`, a calculation model in `website/src/lib/types/calculation.ts`, and builders in `website/src/lib/skills/calculations.ts`. The rest of the site still uses `FormulaDisplay.svelte` fed by `renderFormulaDisplay()` in `formula-eval.ts`, hand-written monospace blocks on the skill page mechanics card (about 60 blocks), `<pre>` blocks and formula tables on the combat page, and formula text on the experience, reputation, monster spawn, inventory, party, death, mercenary, and mercenary stats pages. A survey of every notation is in `docs/mechanics-formula-moodboard/site-survey.md` (untracked working material); the reference research is in the same folder.

## Goals / Non-Goals

**Goals:**
- One presentation for every formula: `Calculation` blocks for multi-step rules, plain sentences with a concrete number for one-factor rules, and tables only for comparing variants.
- Calculators wherever the result depends on the reader's character, using inputs the reader can read in the game.
- Each general rule stated once and linked.

**Non-Goals:**
- Target-side calculators (resistance, level difference, avoidance). The reader's side stops at the damage a skill deals before the target's defenses.
- Rewriting effect summaries in skill tables. They keep their compact form ("5% × rank") and the abbreviations the BetterBestiary tooltip shares. Only their function notation (Blood Pact and Death Bloom) becomes words, in both formatters.
- The combat planner (`website/src/lib/planner/`) is unchanged.

## Decisions

**Calculation model with inputs and an evaluator.** A builder returns steps, inputs, and an `example(values)` function. The component renders the static example from default values on the server and reruns the same function in the browser. Alternative: separate static text and calculator code; rejected because the two would drift.

**Calculator inputs are values the game shows.** Skill damage calculators take the Damage and Magic Damage the character window shows (`UICharacterInfo` prints `combat.damage` and `combat.magicDamage`), plus only the skill-specific terms the damage handler adds or subtracts (for example Dexterity for ranged and poison bonuses, or the off-hand and bow damage a Rogue or Ranger skill subtracts). The steps still explain how those character stats are composed, with a link to the combat page where that composition is stated. Alternative: rebuild the stat from Strength, weapon, and equipment inputs through the `formula-eval` expression tree; rejected because the game applies the percentage damage bonus to the whole stat before the skill subtracts weapon terms, which the tree does not model, and because readers do not know their per-slot numbers.

**`FormulaDisplay` and `renderFormulaDisplay()` are removed.** The damage section uses a builder per damage handler in `website/src/lib/skills/`. `FORMULA_EXPRS` and `evaluate()` stay only if a caller remains; otherwise they are deleted with their tests.

**Shared wording and arithmetic helpers.** Number, percent, second, and rank-scaling formatting and the float helpers live in one module under `website/src/lib/calculation/`, used by every builder. Unity arithmetic still comes from `website/src/lib/planner/engine-math.ts`, which other non-planner code already imports.

**Remembered inputs.** Inputs that describe the reader's character (maximum Health, maximum Mana, attributes, Damage, Magic Damage, spell haste, haste) persist in `localStorage` under `calculation:<key>`. Rank and situational inputs do not. One Reset clears the remembered inputs the block uses.

**General rules on the combat page.** Skill pages link to `/mechanics/combat#damage-pipeline`, `#resistance`, and `#combat-advantage` and name only the stat their damage meets. The combat page states those rules in the same calculation format.

**The skill page becomes layout plus one component per mechanic.** After the migration, the mechanics card is split into components under `website/src/lib/components/skill-mechanics/`, one per mechanic, each holding its markup, calculation, and citations. `website/src/lib/skills/mechanics-sections.ts` lists the sections in display order, each with the rule for whether a skill shows it, so that rule is TypeScript with unit tests instead of a condition inside the markup, and the card and its jump-list entry appear exactly when the list is not empty. `MechanicsCard` gives its sections the skill through a typed Svelte context rather than props: 21 of the 52 sections show fixed text, and Svelte types a component without props as accepting none, so shared props would force those sections to declare props they never read. Script logic moves into `website/src/lib/skills/`. The restructure changes no rendered text, so its acceptance check is zero mechanics snapshot differences plus identical rendered text on every prerendered skill page, except twelve skills whose Stun section or rank note a hand-kept visibility gate had hidden; deriving visibility from the list shows their card. It follows the migration instead of preceding it because the migration was already rewriting most sections, and a pure restructure is only verifiable against a settled baseline.

## Risks / Trade-offs

- [A calculator that disagrees with the game misleads more than prose] → Builders follow the cited handler line by line, use single-precision helpers, and each new builder gets a unit test of its arithmetic with a rounding edge.
- [About 600 mechanics snapshots change] → Snapshots are regenerated per concern and reviewed by sampling the word diff, as the snapshot spec requires.
- [The skill page is one 3,500-line file] → One owner edits it during the migration while other pages are converted in parallel. The restructure then splits it with a zero-difference check.

## Migration Plan

Land the shared helpers first, then the skill page, the combat page, and the remaining pages as separate commits, each with its snapshots. Deploy after the release gates pass. Rollback is a revert of the website commits; no data changes.
