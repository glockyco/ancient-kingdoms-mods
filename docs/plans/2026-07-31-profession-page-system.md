---
title: Profession Page System
type: spec
status: active
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Profession Page System

One content model and one visual system for all 13 profession pages, replacing three
divergent generations.

Evidence: `2026-07-31-profession-content-coverage`. Ordered work:
`2026-07-31-profession-page-migration`.

## Job and audience

A player who wants to understand whether a profession is worth their time, and a player
who wants one number. Both land on the same page. Per `website/PRODUCT.md`, the learning
reader is the tiebreaker: lead with the mechanic, put exhaustive data below the fold —
but never make a specific fact harder to find in service of the narrative.

Visitor mode is **Read**. These are explanatory pages that happen to carry large tables,
not dashboards that happen to carry prose. The current newest generation has the
polarity backwards.

## Selected direction

**Form follows the shape of the fact.** Every mechanic is rendered in the visual form its
data actually has. Variety is earned by encoding, never by decoration.

The authority is not `/mechanics/*` as a family. It is the two pages in that family that
already work this way, and they are the best pages on the site:

- `mechanics/mercenary-stats` renders each stat as an inline range bar, colour-coded by
  stat type, positioned within the range it could occupy, driven by live level and
  veteran-point controls, with impossible race and class combinations greyed to an em
  dash. It is a comparison instrument, not a table.
- `mechanics/experience` draws the level curve on a log scale with the post-40 easing
  picked out in green against a dashed counterfactual, plus a scrubber reporting what any
  level costs. It is a function drawn as a function.

`mechanics/reputation` (the eight-tier colour spectrum) and `mechanics/monster-spawns`
(the kill, corpse, respawn timeline) are the same instinct at smaller scale.

`mechanics/combat` and `mechanics/inventory` are the failure mode: excellent content, a
damage pipeline and a formula catalogue and a storage model, poured into nine identical
card-and-table blocks. Nothing in the rendering conveys that step 7 follows step 6, or
that one formula is a variant of another. The `/mechanics` index carries a banner warning
that these pages "favor precise game rules over quick-start guidance, so some sections
are dense". That banner is the site apologising for a layout problem.

The newest profession pages have the right instinct and the wrong execution. They varied
the chrome, a bordered hero and a metric strip and a numbered panel, rather than the
encoding. That is why they read as dashboard furniture: the variety sits on top of the
content instead of deriving from it, and it costs between 2.3 and 3.7 mobile screens
before the first fact.

### Choosing the form

| When the fact is a | Render it as | Not as |
| --- | --- | --- |
| Function of one variable | A curve carrying the reader's position | A five-column grid of percentages |
| Threshold or region | Shaded bands on that curve | A sentence, or nothing |
| Ordered procedure | A numbered sequence | A prose paragraph |
| Elapsed time | A timeline | Two numbers in a table |
| Value within a possible range | An inline bar | `16 to 60` |
| Distribution or drop table | Proportional bars | A percentage column |
| Geography | A map link or tile crop | A zone name in text |
| Ladder or progression | A graded spectrum | A tier column |
| Genuine comparison across items | A table | anything cleverer |

A table is the right answer surprisingly often. The rule is not "avoid tables", it is
"derive the form from the data, then commit to it".

The focal moment is the payoff line: the single sentence saying what mastery buys. On
Slayer that is ten percent less damage from bosses and elites; on Radiant Seeker it is a
chance to triple a critical hit. Neither page says it today.

The first viewport is the payoff and the mechanic, never a card wrapping the page title.

## What this is not

This is not a rebrand. The tokens in `app.css`, the dark ground, the type scale, `Card`,
`DataTable`, `PageSections` and the existing chart idiom all stay. The visual world
already exists and is good in four places. The work is to apply it consistently and to
retire the two idioms that fight it: the uniform card stack and the decorative hero.

## Verdicts on the incumbent generations

| Device | Where | Verdict | Reason |
| --- | --- | --- | --- |
| Bordered hero panel | 4 newest | **Discard** | A bordered card wrapping the page title. Costs 638–722px of an 844px mobile viewport before any content. The page is already the card. |
| Metric-card strip | 4 newest | **Revise into `PageSections`** | It reports section counts without linking to sections — a table of contents that forgot to be clickable. Replaced by the existing jump list it should have been. |
| "How It Works" | 4 newest | **Keep content, discard name and panel** | The content is the best writing on the site (fishing's tier timings and roll order are excellent). The generic heading and bordered panel demote it to chrome. Promote it, name it for the mechanic. |
| Numbered step rows | 4 newest | **Keep** | Ordered procedure genuinely helps for multi-step loops (cast, dig, queue). Restrict to professions with a real sequence. |
| Split loader + test | fishing | **Keep, extend** | `fishing-page-data.server.ts` plus its test is the right architecture for data-heavy pages. Adopt wherever a loader exceeds ~150 lines. |
| Anchored sections | scroll_mastery, fishing | **Keep** | Stable anchors are a prerequisite for the jump list. |
| Interactive calculators | 8 pages | **Keep, re-encode** | The most valuable thing these pages do, and the closest existing relative of the two exemplar mechanics pages. The inputs stay; the five-column percentage grid becomes a curve. |
| Uniform card stack | `mechanics/combat`, `mechanics/inventory` | **Discard** | Nine identical card-and-table blocks in a row. The container carries no information, so the reader gets no signal about which section matters or how one relates to the next. |
| Range bars | `mechanics/mercenary-stats` | **Adopt** | The best encoding on the site and currently used by exactly one page. Generalise as `RangeBar`. |
| Curve with reader position | `mechanics/experience` | **Adopt** | Proves the pattern works in this codebase and this palette. Becomes `MasteryCurve`. |
| Timeline bar | `mechanics/monster-spawns` | **Adopt** | Correct encoding for every respawn and cooldown claim across the gathering professions. |
| Graded spectrum | `mechanics/reputation` | **Adopt where a ladder exists** | Fits count-based completion and tier progression. |
| Un-carded plain header | 9 older | **Keep as the base** | Cheapest correct header. Extend rather than replace. |
| Obtainability trees | alchemy, cooking, lore, scroll | **Keep** | Real recursive provenance, already shared. |
| Tier matrix via inline `grid-template-columns` | 4 middle | **Discard** | Fixed `repeat(5, 1fr)` cannot collapse; a primary cause of mobile overflow. |
| `whitespace-nowrap` + `overflow-x-auto` tables | most | **Revise** | Produces 1638 overflowing elements on slayer. Adopt the house `DataTable` or a responsive pattern. |
| Bordered panel per section | fishing | **Discard** | Making every section equally emphatic means none is. Reserve borders for calculators. |
| Quest-line module | alchemy | **Keep and generalise** | The best module the middle generation produced, and the newest pages dropped it. |

The through-line: the newest generation's *content* work was right and its *framing* work
was wrong. It added explanation the older pages lacked, then buried it in dashboard
furniture that cost four to seven times the time-to-first-fact on mobile. The four
adoptions above are the corrective: they are already built, already in this palette, and
each is currently used by exactly one page.

## Content model

Four required modules, in this order, then optional modules. A module is omitted when the
profession genuinely lacks it — never stubbed, never padded.

### Required

1. **Identity** — name, category, one-sentence purpose from `professions.description`,
   the **payoff line**: what mastery buys, in plain language, or an explicit "tracks
   completion only; no gameplay bonus" for lore keeping and exploring — and the
   achievement that the mastery cap unlocks. `ProfessionHeader` renders that achievement
   line for every profession, so its place and wording cannot drift page by page.
2. **The loop** — how you actually do this, in prose or numbered steps. Required tool or
   station, where you start, what a single action looks like, what can go wrong.
   Absence is stated: "No tool required" is a fact worth printing when the neighbouring
   profession needs a pickaxe.
3. **Progression** — how mastery advances: the two-stage roll in plain terms, the
   "too simple" thresholds, the cap, and the race starting bonus. These facts attach to
   the mechanic they describe — the roll beside the calculator, the cap beside the
   formula — and never form a trailing section of their own. A standalone progression
   section restates the loop and the calculator, which is how the first migration wave
   grew duplicate content on every page.
4. **The inventory** — the exhaustive list of whatever this profession acts on: nodes,
   recipes, targets, triggers, books, dig sites. One canonical row per thing, with a map
   action wherever coordinates exist.

### Optional

Attach only with evidence.

- **Calculator** — where a success or reward formula exists (10 of 13).
- **Locations** — stations and tables, with map links.
- **Quest line** — where an authored chain exists (alchemy today; check others).
- **Outputs and what they do** — effects for potions, foods, scrolls; consumers for
  gathered materials.
- **Inputs and where they come from** — the cross-profession dependency, currently
  invisible everywhere.
- **Related professions** — explicit bidirectional links. Fishing feeds cooking and
  alchemy; herbalism and mining feed alchemy, cooking and crafting.
- **Completion checklist** — count-based professions only, with the canonical
  denominator and its source.
- **Edge cases** — version caveats, known oddities, items that behave unlike their
  neighbours (Dragonbait Stew, the Red Scabbard route).

## Reading order and prominence

Fixed order: identity → payoff → loop → progression → calculator → inventory → outputs →
locations → quests → related → edge cases.

A fact earns first-viewport placement when it satisfies **all three**:

1. It changes whether the reader invests in this profession at all.
2. It is not derivable from the page title.
3. It is true for the whole profession, not one row.

By that test: the payoff line qualifies everywhere. Counts do not — "23 fishing spots"
fails test 1. The achievement name fails test 1. Max level fails test 2 for float
professions, since all 13 are 100. The `/ 46` denominator qualifies for count-based
professions because completion is the entire point.

Everything failing the test moves into its own section or the section index.

## Header system

One header for both sparse and dense pages. Ordinary flow, no bordered wrapper.

```
Breadcrumb
[icon] H1 name          ·  category badge
one-sentence purpose
payoff line
[ jump list — PageSections, when the page has 4+ sections ]
```

Target cost: under 320px at 390px width, versus the current 638–722px. The jump list
replaces the metric strip and does the job the metric strip was reaching for. Pages with
three or fewer sections omit it and lose nothing.

Icons stay Lucide via the existing `getProfessionIcon` map. There is no profession art:
`visual_assets` has no profession domain and `icon_path` points at sprite names with no
files.

## Section patterns

Each pattern names the encoding first and the container second. A `Card.Root` with
`bg-muted/30` is the default container, but a section that has an encoding uses it
instead of leaning on the card to do the visual work.

- **Mechanics explanation** — prose first, then the encoding, then the exact formula.
  Formulas render as readable expressions with named terms, never code identifiers.
  Source citations stay in HTML comments.
- **Progression** — no section of its own. The two-stage roll and the starting bonus sit
  under the calculator that shows them, and the cap sits with the formula that applies
  it. The "too simple" thresholds render as shaded regions on the success curve rather
  than as a sentence, so a reader sees at a glance where a tier stops paying.
- **Calculator** — the signature moment of a profession page, following
  `mechanics/experience`. A curve of success against mastery for each tier, the reader's
  slider position marked on it, and the no-gain regions shaded. Derived numbers sit
  beside the curve, not instead of it. This replaces the five-column percentage grid on
  every gathering and crafting page. It is the one place a border is justified, being an
  interactive surface distinct from the reading flow, and it must render a static default
  state without JS.
- **Locations** — compact table of zone, sub-zone, map link. Never a card grid.
- **Quests** — the alchemy chain generalised, rendered as a sequence: step, quest link,
  objective, level, rewards.
- **Resources and recipes** — one row per thing, expandable for obtainability, tier as a
  leading column, sortable and filterable above roughly 20 rows. Yield and drop rates
  render as proportional bars in the mercenary-stats idiom, not as bare percentages.
- **Long tables (100+ rows)** — the house `DataTable`, following the monster overview:
  fixed column widths, one line per cell with truncation and a `title`, and the shared
  `monster-table` respawn columns where the rows are monsters. Equal row heights keep the
  pagination controls still between pages. Slayer's 143 rows and exploring's 46 need
  filtering, not scrolling. Prerender all rows for no-JS, enhance on hydration.
- **Timings and cooldowns** — a timeline in the `monster-spawns` idiom. Radiant Seeker's
  100 to 3600 second window and every gathering respawn are ranges on a scale, not two
  numbers in a cell.
- **Rewards and outcomes** — probability tables state whether a number is a configured
  rate or a simulated per-open estimate. Never present the two as one quantity.

## Density and disclosure

- **Desktop** — target under 4 screens for the densest page. Fishing's 7.6 is failure.
- **Mobile** — target under 6 screens. Fishing's 12.5 and slayer's 8.9 are failures.
- **First fact within one mobile viewport.** Currently 2.3 to 3.7 screens on the newest
  pages.
- **Vary the rhythm.** No page runs more than three consecutive sections in the same
  container treatment at the same density. A dense table earns a quiet explanatory
  passage after it. This is the rule `mechanics/combat` breaks nine times in a row, and
  it is what makes an information page tiring rather than merely long.
- **An encoding is not decoration and does not count against the budget.** A curve that
  replaces a five-column grid usually costs less vertical space than the grid did, and
  the shortest page is not the goal: the goal is that every screen earns its scroll.
- **Progressive disclosure** — exhaustive lists collapse past a threshold, secondary
  outcomes such as fishing trash and non-relic chest rewards live behind a disclosure,
  and per-row detail expands rather than adding columns.
- **Zero horizontal overflow at 390px.** Tables reflow, stack, or scroll inside a single
  bounded container, not the 54 independent scrollers lore keeping produces today.
- **No-JS** — every fact renders in static HTML. Filters, sorts, calculators and
  disclosures are enhancements. Charts render server-side as inline SVG so the encoding
  survives without JavaScript; interactivity layers on top.

## Component boundaries

Extract only where 3+ pages share a real contract.

| Component | Contract | Call sites |
| --- | --- | --- |
| `ProfessionHeader` | profession row + payoff line + achievement + optional jump list | 13 |
| `MasteryCurve` | tier success functions + reader position + shaded no-gain regions | 10 |
| `LocationTable` | rows of zone / sub-zone / coordinates | 5 |
| `ResourceTable` | tier, entity link, per-tier derived values as bars, map link | 5 |
| `RecipeTable` | tier, output, materials, success, obtainability | 4 |
| `RelatedProfessions` | typed links with the reason for the link | 13 |
| `RangeBar` | value or range within its possible range, colour by role | 6 |
| `Timeline` | ordered durations on one scale | 4 |

Reuse unchanged: `Seo`, `Breadcrumb`, `PageSections`, `ItemLink`, `MapLink`,
`MechanicsLink`, `ObtainabilityTree`, `QuestTypeBadge`, `QuestFlagBadges`, `DataTable`,
`Card`, `Input`.

Do **not** extract a `MetricStrip`, a `HeroPanel`, or a generic `HowItWorks` — those are
the devices being retired.

Server side: one shared `professions.ts` query module owning the profession row and the
mechanics record, replacing 13 locally redeclared interfaces. Loaders above ~150 lines
split into `<profession>-page-data.server.ts` with a test, following fishing.

## Where the mechanics record lives

The progression module and the payoff line both need a machine-readable mechanics record
per profession: payoff effect, action source, proc-chance formula, increment formula,
effortless thresholds, success-tier table, cap.

That record lives in **`lib/data/professions/mechanics.ts`**, not in the database.

The reason is correctness, not convenience. `uv run compendium citations check` reports
all 436 targets verified while the herbalism formula is wrong, because the checker hashes
the cited region's bytes and cannot tell that the region drifted onto a neighbouring
function. A TypeScript record with `// Source:` comments sits inside that checker;
`static_data.json` does not, and it is already stale in four places. Routing formulas
through the JSON would reproduce the failure mode that produced the bug.

The empirical record agrees. Every profession whose formulas live in a shared module 
(`lib/utils/alchemy.ts`, `cooking.ts`, `fishing.ts`, `treasureHunter.js`) matches the
server exactly. Both professions whose formulas are inline and duplicated 
(herbalism, mining) have drifted.

These values are consumed by client-side calculators, so they must exist as TypeScript
regardless; a database round-trip would add a pipeline stage and a serialization format
for no consumer.

**Every citation in that record uses symbol form** — `Utils.cs:GetSuccessProbHerbalism`,
never `Utils.cs:491-501`. A line range slid onto the wrong function once already; a
symbol reference cannot.

A `profession_mechanics` table remains the better data model if the mechanics ever need
to be queried or joined. Nothing needs that today. Should it be added, it must ship with
a parity test asserting the table matches the cited formulas, or it is a weaker guarantee
than the record it replaces.

## Data prerequisites

- **Count denominators** must resolve to 46 and 17 before any completion UI ships.
  `professions.tracking_denominator` is stale at 45 and 13.
- `static_data.json` is **not** a valid source for any published value. Re-verify each
  entry against `server-scripts/` before relying on it.

## Correctness fixes folded into this work

These are defects, not enhancements, and ship regardless of the redesign. Four in total:

- Herbalism tier 3 and 4 success formulas understate the game (`skill × 95` and
  `skill × 85` where the server gives `skill` and `skill × 0.95`).
- The `/gather-items/[id]` calculator disagrees with `/professions/mining` on tiers 1, 3
  and 4. One of them is wrong; the server is authoritative.
- Slayer never selects `is_fabled`, so 9 fabled bosses render as ordinary bosses.
- The "too simple" boundary renders as `>=` on gathering pages; the server uses `>`.

## Scope and boundaries

**In scope**: all 13 profession routes and `/professions`; the shared component and query
layer; the profession-mechanics data record; the defects above. Also `mechanics/combat`
and `mechanics/inventory`, which are the same card-stack failure and share the components
built here, and the `/mechanics` index banner apologising for their density.

**Untouched**: route paths, the map, `/gather-items`, `/recipes`, `/items`, `/skills`,
the four mechanics pages that already encode well, and every existing factual value that
is already correct. Existing
calculators keep their formulas except where listed as defects. Existing links,
obtainability trees and map deep links are preserved.

**Anti-goals**: no per-player progress tracking — the site is static and has no player
state. No fabricated lore for the 19 blank plant descriptions. No invented trainers,
unlock quests or tutorials; the audit found none for any profession. No forcing every
module onto every page. No section-count parity between professions.

## Validation set

Four professions validate both the content model and the design system before the
remaining nine migrate. They were chosen to span every axis on which the pages differ.

| Profession | Validates |
| --- | --- |
| **radiant_seeker** | Sparsest data, richest hidden mechanic. Proves the model carries a page with one inventory row, and that the payoff line does the work the tables cannot. Currently the worst coverage failure. |
| **mining** | The mid-size template: calculator, tool requirement, tier matrix, resource table, map links, downstream consumers. Proves the gathering pattern and the shared calculator. |
| **slayer** | 143 rows and the worst mobile overflow. Proves the long-table pattern, the `DataTable` adoption, and carries a real defect fix. |
| **fishing** | The densest page. Proves the system *reduces* an over-built page, not only enriches thin ones — the hardest direction and the one most likely to expose a flaw in the density rules. |

If these four hold, the remaining nine are mechanical. `herbalism` and `radiant_seeker`
share a template with `mining`; `hunter` with `slayer`; `cooking`, `alchemy` and
`scroll_mastery` with each other; `exploring` and `lore_keeping` share the count-based
model; `adventuring` and `treasure_hunter` are single instances that reuse the quest and
reward patterns.

## Acceptance

- Every page states its payoff line above the fold, or explicitly states there is none.
- Every page's progression section is generated from shared data, not hand-written.
- No page exceeds 6 mobile screens or 4 desktop screens.
- First data fact within one mobile viewport on every page.
- Zero horizontal overflow at 390px on every page.
- Every fact renders without JavaScript.
- Every mechanical claim carries a machine-checked citation; `pnpm check:citations`
  passes.
- No fabricated content. Facts the audit marked unknown remain absent.
- The five listed defects are fixed and the corrected values match current
  `server-scripts/`.
