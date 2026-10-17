## Context

The prose audit reviewed route templates, shared components, generators and repeated rendered text across the compendium. It recorded 1,067 overlapping candidates. A source-location check established where each observation originated, not whether its proposed rewrite was correct. Separate model verification failed, so implementation must evaluate the proposals against current behavior rather than treat them as an approved patch script.

The reviewed report and its raw candidates are local working material. This change records the resulting decisions and verification, not a duplicate of that report.

## Goals and non-goals

Cover all eight report sections and disposition every raw candidate as implemented, duplicated or rejected with a concrete reason. Fix the code or data responsible for misleading output. Keep game names, exact quantities, relevant exceptions and useful qualifications.

Do not redesign unrelated pages, add seasonal material to previously excluded pages, rewrite game-authored dialogue or tooltip prose, alter the save, introduce speculative game rules, or publish unverified probabilities. Do not expand this into the separate shared-game-model acquisition or read-model implementation.

## Decisions

### Explain player outcomes and choices

Remove statements about synchronization, unused calculations and ordinary stat refreshes when the surrounding text already gives the useful rule. Retain persistence, payment, interruption and timing details when they affect a decision. Keep compact table cells and summaries compact.

Precision is not exhaustive narration, and brevity is not vagueness. Keep the rates, caps, scaling and interactions needed to understand the effect on the page. For example, a resistance card must say how much resistance changes the chance, and a layered cleanse must explain its guaranteed removal and independent extra-layer chances. Do not replace those answers with "can prevent" or "higher Accuracy helps". Remove jargon such as "positive threat", conditions already resolved by the rendered branch, repeated examples and code execution narration. Use links for deeper derivations, not as a substitute for the useful local rule.

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

Literal mechanics-card snapshots are removed rather than re-pinned to new prose. Their whole-text comparison rejects editorial changes without establishing whether a quantity, condition or transition changed. Numeric and eligibility regressions, direct producer scenarios, game observations and browser inspection provide the relevant evidence instead.

## Implementation boundaries

Work is split by file ownership, not by where a string happens to render. The integration pass owns the shared stat and duration helpers, calculation producers, pipeline fixes, generated outputs, planning records and final verification. Page-family work owns its templates and explicitly assigned supporting files. Metadata and search own their producers, with route title adoption after integration. A candidate outside a slice's files is handed to its file's implementation slice rather than patched twice.

## Verification

Preserve a prerender baseline. Reproduce the audit's concrete wrong output before changing it using the existing evidence and focused runtime checks, without repeating already reported failures merely to confirm them. Run one integrated check pass after edits settle, including website types, lint, formatting, database tests, pipeline checks, citations and redactions, mod builds and formatter parity. Exercise the changed calculation and query paths directly. Build the site and compare meaningful rendered differences. Inspect representative overview, detail, calculator, search and map surfaces in a browser at desktop and phone widths.

Each coherent verified unit receives an atomic commit with a causal body. No pushes. Record verification and candidate dispositions in this change before archiving.

## Outcomes

The candidate ledger covers all 1,067 observations: 982 implemented, 69 duplicate and 16 rejected, with no missing or conflicting dispositions. These are overlapping observations, not a count of distinct defects.

The editorial review retained local resistance rates, final caps, Accuracy's additive effect, guaranteed and independent cleanse-layer removal, skill resource trades, song comparisons and progression rates. It removed reload narration, resolved source predicates, repeated worked examples and ordinary healing-cap qualifications. Death Bloom retains its rank- and Intelligence-scaled benefit, not just its health cost. Shared links provide further derivations.

### Rejected suggestions

| Candidates | Reason |
| --- | --- |
| Chrome-7, MechanicsWorld-5, ZonesQuests-38 | Title case conflicts with the sentence-case convention. |
| MechanicsWorld-6 | Context belongs in search results, not repeated page names in section labels. |
| MonstersNpcs-3 | Seasonal information is outside the approved scope. |
| MonstersNpcs-77 | Have correctly describes possession objectives whose items may be retained. Inventory and equipment conditions were clarified instead of renaming the type. |
| ProfessionsA-29 | The existing Mining rule correctly distinguishes ore, gems and repeatable failed nodes. |
| ProfessionsA-50 | The eligibility and cooldown rules were already present. The final explanation preserves eligibility-based queue skipping. |
| ProfessionsB-10, ProfessionsB-56 | One inconsistent game label does not justify a broad profession rename. |
| ProfessionsB-58 | The Hunting drop bonus applies only to non-boss journal creatures. |
| ProfessionsB-63 | Slayer metadata already has a data-driven target count. |
| SkillPages-39 | Already-spent points and cost per rank are different requirements. |
| SkillSummaries-45 | Compact fragments do not need blanket capitalization. |
| SkillSummaries-46 | Repeating "lasts" before every duration adds no useful information. |
| ZonesQuests-32 | Signed chest reputation amounts remain useful for scanning and sorting. The opening event and Forsaken gain were corrected. |

### Correctness boundaries

- Boss item chances use the original loot pool, quest gates, random outcomes and equipment top-ups. Display expansion is not treated as independent extra loot rolls. Combat summons and pre-final altar-only waves do not become ordinary loot sources.
- Ordinary non-boss drops are quest-gated only when the item is quest-only. Bosses use the combined quest flags.
- Respawn descriptions include corpse time, respect non-respawning monsters and do not promise fixed intervals for conditional spawns.
- Zero-amount quest requirements are omitted. Inventory possession and required equipped items remain distinct.
- Percentage-of-maximum regeneration identifies the resource and per-second unit. Typed damage over time and self-drain do not appear as positive regeneration.
- Search results keep the name visible and put long location context below it. Titles use meaningful family, class, zone or source context without claiming global uniqueness.

### Runtime evidence

The fresh export session `20261017T082356Z-44b3c261` completed all 33 exporters without errors against game 0.9.36.1. It used a confirmed scratch database. The player database hash was unchanged after the game exited, with no save sidecars. BetterBestiary's Pyroth skills were inspected in the running game.

Direct producer checks preserved fractional respawn boundaries, full leftover seconds, maximum-pool labels and signed reputation ranges. Wolf Claw Attack uses rank 1 and produces 205 damage from 200 Attack Power. Pyroth's Cowl of the Starbound Sage chance is approximately 16.06% per kill. The hypothetical Fatecharm calculation is approximately 27.09%, but the overworld source does not expose an ineligible Fatecharm option. Five city discovery areas grant 10 XP. Adventuring skill gain uses the game's float32 multiplication.

### Verification results

| Check | Result |
| --- | --- |
| Website | 712 tests in 97 files passed. Type checking reported zero errors and warnings. Lint, formatting and knip passed. |
| Pipeline | 505 tests passed. Ruff, mypy and vulture passed. |
| Mods | All 12 mods built without warnings or errors. DataExporter, HotRepl, BossSkillTracker, BuildTool and BetterBestiary tests passed. |
| Formatter parity | All 782 generated cases matched the C# formatter. The final compact-summary changes have no links among the published monster skills. |
| Provenance | All 1,527 citation targets verified. All 503 recorded redactions matched recomputation. Documentation checks found no problems. |
| Prerender | All 3,756 routes remain, with none added or removed. Visible-text and metadata comparisons covered the complete baseline and final trees. |
| Browser | 57 representative pages checked at 1440px and 390px, with no final document overflow or error pages. |

The browser checks included the resistance and layered-cleanse cards, threat examples, resource-trade summaries, all mercenary classes, profession progression, recovery and spawn rules. Dispel and Dispel Magic show their resistance rule once while retaining the separate buff-removal probabilities. Narrow-screen boss annotations wrap without widening the page.

Live map popups showed the same 16.1% Cowl chance on Pyroth and the item source, and the ordinary Teleri Elder drop showed 30.0% without a false quest gate. Search kept Rat's name visible above its long location context on a phone-width screen. The home page retained 25 zone links. Calculator checks preserved saved maximum-resource inputs and updated results, and clearing stat filters preserved unrelated item filters.

The only README additions were local audit-retention notes and temporary implementation ownership instructions. No product README changed. The temporary scripts and prerender baseline are removed after their conclusions are recorded here.
