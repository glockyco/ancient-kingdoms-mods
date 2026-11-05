# Tasks

## 1. Shared names

- [x] 1.1 Write the composed forms of `statFieldName` in title case and keep `statFieldPhraseName` in sentence case, and verify with a throwaway script that the Rank Scaling names of a damage-over-time debuff and a percent regeneration buff read "Poison Damage per Second" and "Health Regeneration, % of Maximum Hit Points per Second"
- [x] 1.2 Title-case the label tables and composed names in `website/src/lib` (`skills/skill-scaling.ts`, `skills/effect-calculations.ts`, `calculation/*`, `utils/fishing.ts`, `utils/roles.ts`, `data/*`, `constants/source-types.ts`, `search/lists.ts`), write formulas that use a step with the step's label, rename "Knockback" to "Knockback Chance", and verify `pnpm --filter website test` passes after wording assertions are deleted
- [x] 1.3 Change "aggro" to "threat" in the skill summaries of `formatSkillEffect.ts` and `SkillEffectFormatter.cs`, regenerate the parity corpus with `pnpm --filter website gen:skill-effect-parity`, and verify `dotnet test tests/PocketCompendium.Tests` passes

## 2. Entity pages

- [x] 2.1 Title-case every label, title and row header on the entity detail pages under `website/src/routes/*/[id]`, give the skill page's buff fields the stat catalogue's names, change "Drop Rate" to "Drop Chance" and "Chance / Cast" to "Chance per Cast", apply the level short forms, and verify with `pnpm --filter website check`

## 3. Guide pages

- [x] 3.1 Title-case every label, title, heading and row header on `website/src/routes/mechanics/**` and `website/src/routes/professions/**`, including the section names in `website/src/lib/data/combat-outline.ts` and `mechanics-sections.ts`, and verify with `pnpm --filter website check`

## 4. List pages and shared components

- [x] 4.1 Title-case the labels of the list pages, keep each column label only in the page's `columnLabels` map, apply the level short forms, and verify the column menu and headers in the browser on the quest and monster lists
- [x] 4.2 Title-case the labels, titles, buttons and chips in `website/src/lib/components/**` and on the home, mods and about pages, and verify with `pnpm --filter website check`

## 5. Integration

- [x] 5.1 Render every prerendered page and list each label that breaks the title-style rule or a concept written two ways, and verify that every remaining entry is game text, a value or prose
- [x] 5.2 Take screenshots at 390 px and 1280 px of the skill, item, quest list, inventory and fishing pages, and verify that no label wraps or cuts badly
- [x] 5.3 Run `pnpm check`, `pnpm lint`, `pnpm --filter website format:check`, `pnpm --filter website test` and `pnpm --filter website exec vite build`, and verify all pass

## Workflow follow-up

- Archive the change once it is deployed.
