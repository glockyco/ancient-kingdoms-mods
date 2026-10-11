# Tasks

## 1. Shared calculation foundation

- [x] 1.1 Move number, percent, second, and rank-scaling formatting and the rank evaluation helper into a shared module under `website/src/lib/calculation/`, used by the pilot builders; verify `svelte-check` and that the three pilot pages render unchanged text.
- [x] 1.2 Let `Calculation.svelte` render steps without an example and accept remembered inputs for character stats (Damage, Magic Damage, attributes, haste); verify on the dev server that a block without inputs shows no button and a remembered value carries to another page.

## 2. Skill page mechanics card

- [x] 2.1 Replace `FormulaDisplay` and `renderFormulaDisplay()` with damage builders per damage handler: steps in words, the rank multiplier, and a calculator whose inputs are the character window's Damage or Magic Damage plus the handler's skill-specific terms; delete the component and dead code; verify each builder with a unit test that includes a rounding edge, and check a magic, a melee, a ranged, a Rogue poison, and a magic-weapon skill page.
- [x] 2.2 Replace the damage pipeline list, damage reduction, resist and block chance formulas, and the moving-target and backstab rows with a sentence naming the stat the skill's damage meets and links to the combat page sections; verify on Fireball and a physical skill.
- [x] 2.3 Convert healing, lifetap, aggro, execute, buff and debuff scaling, Bard song, charm, Final Cadence, timing, scroll, mercenary and familiar rank, and crowd-control blocks to calculations or sentences per the spec; verify no monospace formula, single-letter variable, code name, or function notation remains on the card (grep plus a rendered-text scan of all skill pages).
- [x] 2.4 Regenerate the mechanics snapshots and review a sample of the word diff; verify `node scripts/snapshot-mechanics.mjs` reports all snapshots matching.

## 3. Combat page

- [x] 3.1 Convert the combat page's formula boxes and formula tables (damage formulas, pipeline, resistance and mitigation, healing, buff scaling, debuffs, timing, special mechanics) to calculations, sentences, or tables of worded formulas, keeping the anchors skill pages link to; verify on the dev server at 1440 and 390 pixels wide and that each linked anchor exists.

## 4. Other mechanics pages

- [x] 4.1 Convert formula text on the experience, reputation, monster spawn, inventory, party, death, character, and Bard mechanics pages; verify no monospace formula or code notation remains (grep plus rendered-text scan).
- [x] 4.2 Convert the mercenary hire price, stat, and veteran formulas on `/mercenaries`, `/mercenaries/[id]`, and `/mechanics/mercenary-stats`; verify the existing mercenary calculator still produces the same numbers.

## 5. Skill page structure

- [x] 5.1 Move the skill page's script logic (rank table, cost and timing, tooltip and header helpers) into modules under `website/src/lib/skills/` with unit tests for the rules they decide; verify zero mechanics snapshot differences and identical rendered text on every prerendered skill page.
- [ ] 5.2 Split the mechanics card into one component per mechanic under `website/src/lib/components/skill-mechanics/`, each holding its markup, calculation, and citations, rendered from an ordered section list that `skillMechanics.ts` derives with unit-tested applicability rules; verify zero mechanics snapshot differences and identical rendered text on every prerendered skill page.

## 6. Release

- [ ] 6.1 Sync the citation ledger, run the release gates (`pnpm check`, `pnpm lint`, website tests, pytest, citations, redactions, `pnpm build`, snapshot check), and scan every prerendered page for monospace formulas, single-letter variables, and function notation; verify all pass.
- [ ] 6.2 Sync the `formula-presentation` and `skill-mechanics-card` specs into `openspec/specs/` and archive the change.
