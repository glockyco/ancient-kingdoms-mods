# Design

## Context

Labels are string literals spread over Svelte routes and components, label tables in `website/src/lib` (`skills/skill-scaling.ts`, `utils/roles.ts`, `data/*`, `constants/source-types.ts`) and names composed in code: the stat catalogue's `statFieldName`, the calculation step names in `skills/effect-calculations.ts` and `calculation/*`, and the fishing outcome names in `utils/fishing.ts`. List pages pass a `columnLabels` map to the data table and render it through `renderHeader`, while their column definitions often carry a second `header` string that nothing shows.

## Goals / Non-Goals

**Goals:**

- Every label and title follows one written rule, so a new label has one right form.
- The same value has the same words on every page.

**Non-Goals:**

- Pocket Compendium's in-game text. Its settings and panels were chosen in earlier comparisons in their own casing, and the requirement covers the website only.
- Prose, hover text, descriptions and table data cells, which stay sentence case.
- Game data: item, monster, quest and zone names keep the game's spelling, such as "Earring of Awakened light".

## Decisions

### Apple's title-style rule

Labels follow the title-style capitalization of the [Apple Style Guide](https://support.apple.com/guide/applestyleguide/c-apsgb744e4a3/web): capitalize the first and last word, nouns, pronouns, verbs, adjectives, adverbs and prepositions of five letters or more; lowercase articles, coordinating conjunctions, "as", "to" before a verb and prepositions of four letters or fewer. It is a complete published rule for interface text. Chicago lowercases every preposition, which gives "Damage before Defenses", and AP capitalizes every word of four letters, which gives "Created From". The site already writes most title-case labels the Apple way, such as "Heal on Hit", "Learned by Classes" and "Found in Chests".

### What counts as a label

A label names a value, a column, a row, a field, a section, a page, a control or a link target, and stands alone rather than inside a sentence. That covers table header cells, row header cells included, so that one table never mixes both cases. A sentence that names a label as a label, such as "The Drop Chance column is per kill", writes it in the label's form. A sentence that describes a topic in its own words, such as the link "the damage steps" inside a sentence, stays prose.

### One spelling per abbreviation

"Req.", "Rec.", "Min." and "Max." carry a period wherever a label abbreviates them, so "Max. Level" and "Max. Rank" sit side by side in the class page's tables without two forms of one abbreviation. Values such as "Lv 25" are not labels and keep their form.

### Literal edits, no runtime casing

Each label is edited where it is written. A function that title-cases strings at render time would also change game names, stat names such as "AC" and "XP", and hyphenated zone names such as "The Lone-lands". Composed names are fixed where they are composed: `statFieldName` writes its composed forms, such as "Poison Damage per Second" and "Health Regeneration, % of Maximum Hit Points per Second", in title case, while `statFieldPhraseName` keeps the lowercase forms that sentences use. Calculation step names are title case, and a formula that uses a step writes the step's name as its label does.

### Names that change words

- Stat labels come from the stat catalogue, which the `stat-vocabulary` capability already requires. A skill's buff fields "Max Health", "Max Mana", "Max Rage", "Heals Health" and "Mana/sec" become "Maximum Hit Points", "Maximum Mana", "Maximum Rage", "Heals Hit Points" and "Mana Regeneration", and a monster's or NPC's "Health", "Health Recovery" and "Accuracy Bonus" become "Hit Points", "Health Regeneration" and "Accuracy".
- "Drop Rate" on NPC, chest and resource pages becomes "Drop Chance", as on monster pages, and fishing's "Chance / Cast" becomes "Chance per Cast", as on the fishing page.
- A skill's Rank Scaling column "Knockback" becomes "Knockback Chance", the name of the field beside it.
- A skill calculator's result "Damage before defenses" becomes "Starting Damage". It is step 1 of the combat page's damage steps, before variance, the level adjustment and critical hits, which the combat page calls starting damage.
- The quest list sorts and searches adventurer quests by "Adventurer", the badge they show, instead of "Daily".
- The one-line skill summaries say "threat" instead of "aggro" on the website and in Pocket Compendium's port, whose parity test reads the website's output. Monster skills never show threat, so the mod's panels show no change.
- A page carries the name its heading shows. The Mechanics index and menu write "and" where they wrote "&", such as "Party and Loot", while group and card titles such as "Cost & Timing" keep "&". The mercenary stat page is "Mercenary Stats" everywhere, with the tab "Stats". The recipe list is "Crafting Recipes" in its title, heading, breadcrumb, footer link and Browse panel, because "ancient kingdoms crafting recipes" is one of the site's most clicked search queries. The top bar keeps short names, such as "Map", "Mods" and "Recipes", because "Crafting Recipes" wraps onto two lines there at narrow widths. The home page's section stays "Recipes", because one of its four tiles is Crafting.
- The threat a hit adds is "Threat Added" on the combat page and on skill pages.

### One definition per column label

A list page keeps each column's label in its `columnLabels` map and drops the `header` string that `renderHeader` never shows, so a label cannot drift between two definitions.

## Risks / Trade-offs

- [A label in a composed string or a component is missed] → after the edits, an audit renders every page of the prerendered site and lists each label that breaks the rule, and the list must be empty or every entry explained as game text.
- [Long title-case labels wrap earlier on phones] → screenshots of the pages with the longest labels at 390 px and 1280 px before the change is committed.
- [Tests pin the old wording] → tests that assert label text are wording tests and are deleted, while tests of values and behaviour are updated.
