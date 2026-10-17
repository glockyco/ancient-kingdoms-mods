## Context

The prose audit reviewed route templates, shared components, generators and repeated rendered text across the compendium. It recorded 1,067 overlapping candidates. A source-location check established where each observation originated, not whether its proposed rewrite was correct. Separate model verification failed, so implementation must evaluate the proposals against current behavior rather than treat them as an approved patch script.

The reviewed report and its raw candidates are local working material. This change records the resulting decisions and verification, not a duplicate of that report.

## Goals and non-goals

Cover all eight report sections and disposition every raw candidate as implemented, duplicated or rejected with a concrete reason. Fix the code or data responsible for misleading output. Keep game names, exact quantities, relevant exceptions and useful qualifications.

Do not redesign unrelated pages, add seasonal material to previously excluded pages, rewrite game-authored dialogue or tooltip prose, alter the save, introduce speculative game rules, or publish unverified probabilities. Do not expand this into the separate shared-game-model acquisition or read-model implementation.

## Decisions

### Explain player outcomes and choices

Remove statements about synchronization, unused calculations and ordinary stat refreshes when the surrounding text already gives the useful rule. Retain persistence, payment, interruption and timing details when they affect a decision. Keep compact table cells and summaries compact.

### Name quantities, not just stats

Keep the exported stat catalogue as the name source. Context qualifies a pool bonus or input as maximum Hit Points, maximum Mana or maximum Rage without inventing a new stat name. Percentage-of-maximum regeneration names identify both maximum and per second. Distinguish healing from maximum-pool increases and damage over time from positive regeneration.

### Use one cross-surface vocabulary

Use total veteran points as the established term, explain VT only where a reader locates that number, and preserve the game's Veteran Level wording in quotations. Prefer Merchant, Banker, Skill Master, Veteran Master, Quest Giver, Adventurer Merchant and Adventurer Taskgiver for service names, with plural forms in lists. A daily cooldown is a rule, not a second name for Adventurer quests. Use threat for the threat quantity, light one-handed weapons for the broad weapon category, rank for skill rank, yd for distance, and explicit percentage points for additive changes to chances.

Use sentence case for site-authored subheadings and controls while preserving game names and stat capitalization. Preserve meaningful uncertainty, rounding and limits. Do not mechanically expand every abbreviation or add verbs to every fragment.

### Fix producers and migrate consumers

Duration formatting retains leftover seconds. Companion and mercenary examples start from ranks permitted by their caster rather than the generic monster default. Metadata uses skill tiers and learning prerequisites rather than gathering-tier formatting or a misleading level-one gate. Source empty states include supported special acquisition paths. All surfaces use the same per-opening chest probability and guard-group conditions.

Do not fix a contradiction by suppressing a warning, changing only the sentence or hiding valid data. Source grouping may merge equivalent display rows only when zones, chances and other meaningful distinctions survive. Shared mercenary rules remain separate from class facts, and duplicated combat values have one display.

### Improve identity without opaque visible identifiers

Use family, class, zone, source or meaningful location context in titles and search results when names collide. Do not use raw IDs, arbitrary ordinals or coordinates as explanatory copy. Existing canonical routes and redactions remain unchanged. The separate detail-title change retains its full collision and length policy, including decisions not needed for this prose change. This change must not revive rejected item-category names or claim the entire title proposal is complete.

### Verify new numerical claims

A proposed probability, yield or condition must be established by code and exercised through a focused scenario. Boss equipment top-ups, chest upper bounds, city discovery and altar-only loot require explicit review. A per-roll chance is not a per-kill or per-opening chance. Permanent regression tests cover consumer-visible boundaries and wrong outcomes, not literal wording, source text, copied wiring or mock echoes.

## Implementation boundaries

Work is split by file ownership, not by where a string happens to render. The integration pass owns the shared stat and duration helpers, calculation producers, pipeline fixes, generated outputs, planning records and final verification. Page-family work owns its templates and explicitly assigned supporting files. Metadata and search own their producers, with route title adoption after integration. A candidate outside a slice's files is handed to its file's implementation slice rather than patched twice.

## Verification

Preserve a prerender baseline. Reproduce the audit's concrete wrong output before changing it using the existing evidence and focused runtime checks, without repeating already reported failures merely to confirm them. Run one integrated check pass after edits settle, including website types, lint, formatting, database tests, pipeline checks, citations and redactions, mod builds and formatter parity. Exercise the changed calculation and query paths directly. Build the site and compare meaningful rendered differences. Inspect representative overview, detail, calculator, search and map surfaces in a browser at desktop and phone widths.

Each coherent verified unit receives an atomic commit with a causal body. No pushes. Record verification and candidate dispositions in this change before archiving.
