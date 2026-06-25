---
title: "Monster Respawn Mechanics Page Specification"
type: spec
status: implemented
created: 2026-05-18
parent:
superseded_by:
archived: 2026-06-25
---

# Monster Respawn Mechanics Page Specification

**Status:** Draft for review  
**Date:** 2026-05-18  
**Proposed route:** `/mechanics/respawns`  
**Proposed title:** Monster Respawn Mechanics  
**Scope:** A source-grounded mechanics page explaining monster respawn timers, rare probability rolls, dynamic zone ticking, AOI/observer edge cases, blocked/summonable spawns, altar/event spawns, on-death placeholder spawns, and Renewal Sage caveats.

## Executive recommendation

Build a guided reference page, not a live spawn tracker.

The page should answer a player's immediate question first: **"Why isn't this monster up yet?"** Then it should progressively disclose the exact mechanics for players who want proof, edge cases, and data tables. The first screen must be practical and plain-language; implementation names like `UpdateServer_DEAD`, `respawnTimeEnd`, and `respawnSummonableReady` belong in evidence/details sections, not in the hero explanation.

Recommended one-sentence hero copy:

> A monster's listed respawn time is when it can become eligible to respawn; chance-gated rares only become eligible to roll, and the roll only happens when the game is checking that zone/monster and all gates pass.

Core UX decisions:

1. **Use "eligible to roll" consistently** for rares/probability-gated monsters. Do not say they "respawn immediately" unless the sentence also qualifies timer elapsed, zone active, the game checking that monster again, and gates passing.
2. **Show a player decision tree before code details.** Players need to know whether to wait, clear blockers, keep the zone active, use an altar item, or stop expecting Renewal Sage to force a spawn.
3. **Separate spawn families.** Regular respawn, chance-gated respawn, blocked/summonable respawn, altar/event spawn, and on-death placeholder spawn are different enough that collapsing them into one "special" explanation will create wrong play decisions.
4. **Make misconceptions visible.** The page should have direct "This does not mean..." callouts for the high-risk errors: timer equals guaranteed spawn, 96 is a respawn radius, blockers are kill counters, Renewal Sage forces a boss to appear, and inactive zones tick normally.
5. **Keep source grounding available but quiet.** Use a visible evidence/caveats card plus expandable source notes. Mirror the existing mechanics pages' precise tone and inline source-comment habit, but avoid cluttering every sentence with code references.

## Evidence base and caveat wording

Use this visible caveat near the top, below the hero/summary cards:

> These findings are based on decompiled server scripts, exported SQLite data, and serialized Unity server data. They explain the mechanics and static spawn relationships; they are not live-server spawn state and should not be treated as exact current availability.

Grounding already verified:

- `Entity.IsWorthUpdating()` gates server updates on observer count, except hidden entities still update (`server-scripts/Entity.cs:192-215`).
- `Monster.UpdateServer_DEAD()` checks elapsed respawn time, summonable readiness, probability, Halloween, and time-window gates before `Show()` + `Revive()` (`server-scripts/Monster.cs:1779-1833`).
- Failed probability rolls hide the monster and set `respawnTimeEnd = serverTime + respawnTime` (`server-scripts/Monster.cs:1784-1789`).
- Corpse cleanup hides visible dead monsters or destroys no-respawn monsters (`server-scripts/Monster.cs:1835-1849`).
- Looted corpse cleanup only runs server-side when the monster has observers and is not hidden (`server-scripts/Monster.cs:792-798`).
- `OnDeath()` sets `deathTimeEnd` and `respawnTimeEnd`, persists elite/boss respawn state, and can spawn on-death placeholders (`server-scripts/Monster.cs:2020-2090`).
- Dead monsters hidden by zone deactivation do not reset `respawnTimeEnd` (`server-scripts/Monster.cs:2579-2600`).
- Dynamic zone roots are enabled only for zones with online players (`server-scripts/ZoneInfo.cs:185-200`) and the server runs zone cleanup on a 30s default interval (`server-scripts/NetworkManagerMMO.cs:32-34`, `91-102`, `665-671`).
- `SummonMonster` checks configured placeholder instances once per second and writes `respawnSummonableReady` only when all are `DEAD` (`server-scripts/SummonMonster.cs:1-58`).
- Renewal Sage reset only zeroes `respawnTimeEnd` and persisted elite/boss dead-state values for respawning monsters in the target dungeon (`server-scripts/Player.cs:11379-11413`).
- Serialized Unity data shows `SpatialHashingInterestManagement.visRange = 96` and rebuild interval `1.0`; this is AOI/observer context, not a respawn radius.
- Exported DB snapshot: 359 monsters, 4,702 `monster_spawns`, 4,461 regular spawn rows, 231 altar rows, 9 summon/blocked rows, 1 placeholder row, and 38 elite/boss/summonable monsters with `respawn_probability < 1`.

## Personas consulted

Subagent personas represented four player types. Their recommendations converge on the same design shape: quick practical guidance first, exact mechanics second, source/data appendix last.

### Casual/new player

Primary need: understand what to do right now without reading server lifecycle terms.

Top needs:

- A plain-language answer for "timer elapsed but it is not back."
- Short definitions for `Respawn`, `Chance`, `Active`, `Blocked`, `Altar`, and `On Death` as they appear on monster/zone pages.
- A visible reminder that Renewal Sage reset is not a forced spawn.
- Mobile-friendly FAQ anchors and examples.

### Rare hunter / route planner

Primary need: decide whether a rare is worth checking, waiting on, or routing around.

Top needs:

- Probability per eligible roll, not a guarantee at timer end.
- Low-pop explanation: alive rares can persist; dead hidden rares can roll on reactivation if the timer elapsed; failed rolls delay another interval.
- A diagnostic flow for absent rares.
- Data tables for chance-gated bosses/elites/summonables and summon blockers.

### Dungeon/group leader

Primary need: coordinate parties around blockers, Renewal Sages, altar/event starts, and dungeon resets.

Top needs:

- Blocked/summonable rules framed as simultaneous placeholder state, not kill counters.
- Renewal Sage caveats before players spend currency/items.
- Party checklists: keep zone active, clear blockers together, wait for the next check/roll, verify spawn type.
- Clear distinction between normal respawns and altar/on-death/event spawns.

### Mechanics/wiki power user

Primary need: trust the page's exactness without forcing casual readers through source code.

Top needs:

- A gate table matching the server logic.
- A position/state matrix for zone active/inactive, observers, hidden/visible, alive/dead.
- Data-derived tables with filters.
- Evidence and caveats section with source filenames/line references.

## Product goals

1. **Prevent wrong player decisions.** Especially: waiting for a guaranteed rare spawn after a failed probability roll, paying a Renewal Sage expecting a forced spawn, treating blockers as kill counters, or treating AOI range as a respawn radius.
2. **Explain the actual mechanics accurately.** Cover the source-derived gate order, probability retry behavior, dynamic zone ticking, observer/AOI edge cases, blocker readiness, event/altar separation, and Renewal Sage limitations.
3. **Improve existing table comprehension.** Monster and zone pages already expose `Respawn`, `Chance`, and `Special`; this page should define those labels and provide contextual links from them.
4. **Support both fast lookup and deep reference.** The page must be useful mid-session on mobile and as a wiki/mechanics article for deeper Discord explanations.
5. **Stay honest about evidence.** The page should state what is proven from scripts/data and what is not live-state knowledge.

## Non-goals

- No live spawn-state tracker.
- No exact current spawn timestamp promise.
- No player proximity/radius tracker.
- No advice that depends on live unobserved server state the website cannot know.
- No broad rewrite of all monster/zone pages as part of the first page spec.
- No simulation that implies probability guarantees. Calculators may show probabilities over eligible attempts only.

## Alternatives considered

### Option A: Static article only

A single long reference article with headings and tables.

Pros:

- Fastest to implement.
- Low maintenance.
- Matches current mechanics pages.

Cons:

- Does not meet the user's UX goal for progressive disclosure.
- Casual players will skim and still misread `Chance` and Renewal Sage behavior.
- Harder to use mid-session on mobile.

### Option B: Guided reference page with lightweight interactions — recommended

A mechanics page with summary cards, diagnostic cards, FAQ accordions, and data-driven tables/calculators.

Pros:

- Best balance between fast answers and source-grounded depth.
- Makes high-risk misconceptions impossible to miss.
- Uses static exported data; no live-state overclaim.
- Can be built incrementally without a separate backend.

Cons:

- Requires careful copy so calculators do not imply deterministic spawn predictions.
- Requires more testing than a static article.

### Option C: Live-style spawn planner/tracker

A timer planner that asks users for kill/reset times and produces countdowns/routes.

Pros:

- Useful for organized groups if framed carefully.

Cons:

- High risk of users treating estimates as live truth.
- Requires user-entered state and disclaimers everywhere.
- Could distract from the core mechanics page.

Recommendation: implement Option B now. Include static calculators and decision helpers, but explicitly call them **eligibility planners**, not trackers.

## Progressive disclosure model

Modern UX guidance supports showing the most important information first and revealing advanced detail only when users ask for it. NN/g describes progressive disclosure as initially showing only key options and offering specialized options on request, improving learnability, efficiency, and error rate when the split is done well ([NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Documentation IA guidance also emphasizes organizing docs around user workflows, clear labels, headings, and cross-references ([GitBook: documentation IA](https://gitbook.com/docs/guides/docs-best-practices/documentation-structure-tips)). Diátaxis is useful framing here: this page is mostly **explanation + reference**, with a small **how-to diagnostic** layer ([Diátaxis](https://diataxis.fr/)).

For DX, the spec and implementation plan should also treat diagrams as maintainable documentation, not decorative assets. Google’s technical writing guidance recommends writing the caption/takeaway first, constraining each illustration to one focused idea, and splitting complex diagrams into smaller subsystem views ([Google Tech Writing: Illustrating](https://developers.google.com/tech-writing/two/illustrations)). C4 guidance supports progressive zoom levels and using only diagrams that add value, rather than forcing every abstraction level ([C4 model diagrams](https://c4model.com/diagrams)). Mermaid is useful precedent for diagrams-as-code because it creates diagrams from text/code and explicitly targets documentation that can keep up with development ([Mermaid intro](https://mermaid.js.org/intro/)). For this repo, ASCII sketches in Markdown are the safest baseline: they are diffable in PRs, readable in terminals, and easy for implementation agents to preserve.

Apply that as follows:

### Layer 1: first-screen quick answers

Visible without interaction:

- One-sentence respawn model.
- Source/evidence caveat.
- Six quick cards:
  1. **Timer**: first possible eligibility, not a guarantee.
  2. **Chance**: per eligible roll; failed rolls wait another timer.
  3. **Zone**: inactive zones freeze monster ticking.
  4. **Corpse/AOI**: hidden dead monsters and visible corpses behave differently.
  5. **Blocked**: specific placeholders must be dead simultaneously.
  6. **Renewal Sage**: resets timers, does not force spawns.

### Layer 2: common situations

Visible as cards or accordions immediately below the first screen:

- "The timer elapsed but the rare is not up."
- "The rare was alive after nobody visited the zone."
- "We killed the blockers but the summoned boss did not appear."
- "We paid Renewal Sage and nothing spawned."
- "The corpse disappeared / did not disappear."
- "The map/AOI range says 96 — what does that mean?"

Each should have:

- **Short answer** in one or two sentences.
- **What to check next** as bullets.
- Link to the deeper section.

### Layer 3: exact mechanics

Structured sections with gate tables, flows, source notes, and examples.

- Core respawn flow.
- Probability/rare behavior.
- Zone activity and AOI/observer behavior.
- Blocked/summonable spawns.
- Renewal Sage.
- Special spawn taxonomy.

### Layer 4: data/reference appendix

Data tables and evidence that power users can inspect:

- Spawn type counts.
- Respawn probability distribution.
- Probability-gated boss/elite/summonable monsters.
- Summon trigger/blocker table.
- Time-window monsters.
- No-respawn special monsters.
- Source/evidence matrix.

Keep the page to two disclosure levels per section: visible summary plus expandable/details. Avoid nested accordions inside accordions.

## Visual/DX sketch deck

The spec should include visual-ish sketches for two audiences:

- **Players/design reviewers:** understand the page flow and mental model before UI code exists.
- **Implementers/reviewers:** see data flow, component boundaries, and state logic in a diffable format.

Each sketch needs a short caption stating the takeaway. Do not use large diagrams that require more explanation than the surrounding paragraph. If a diagram grows past one focused idea, split it.

### Sketch 1 — page information architecture

Caption: the page starts with play decisions and progressively reveals mechanics, data, and evidence.

```text
/mechanics/respawns
┌─────────────────────────────────────────────────────────────┐
│ H1 + one-sentence model                                      │
│ "Respawn time = eligibility; chance mobs roll when gates pass"│
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ Quick answer cards                                           │
│ Timer │ Chance │ Zone │ Corpse/AOI │ Blocked │ Renewal Sage │
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ "Why isn't it up?" diagnostic                                │
│ player situation -> likely mechanic -> next checks           │
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ Mechanics detail cards                                       │
│ core flow -> rare chance -> zones/AOI -> blockers -> sages   │
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ Data tables + FAQ + evidence                                 │
│ exact rows, common misconceptions, source caveats            │
└─────────────────────────────────────────────────────────────┘
```

### Sketch 2 — first viewport wireframe

Caption: the first screen should make the safe mental model unavoidable before offering deeper controls.

```text
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home / Mechanics / Monster Respawns              │
│                                                              │
│ Monster Respawn Mechanics                                    │
│ Respawn time is eligibility. Chance mobs roll when gates pass │
│                                                              │
│ Note: decompiled scripts + exported data; not live state     │
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│ │ Timer    │ │ Chance   │ │ Zone     │                       │
│ │ earliest │ │ per roll │ │ must tick│                       │
│ └──────────┘ └──────────┘ └──────────┘                       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│ │ Corpse   │ │ Blocked  │ │ Renewal  │                       │
│ │ hidden!= │ │ not kill │ │ no force │                       │
│ │ visible  │ │ counter  │ │ spawn    │                       │
│ └──────────┘ └──────────┘ └──────────┘                       │
│                                                              │
│ [Why isn't it up?] [Rare chance] [Blocked] [Renewal Sage]     │
└──────────────────────────────────────────────────────────────┘
```

### Sketch 3 — developer data flow

Caption: static DB data and pure client helpers should stay separate so the page is testable and does not imply live state.

```text
website/static/compendium.db
   │
   │ read-only SQL at prerender
   v
+page.server.ts
   ├─ spawnTypeCounts
   ├─ probabilityDistribution
   ├─ probabilityGatedMonsters
   ├─ summonTriggerSummaries
   ├─ timeWindowMonsters
   └─ curatedExamples
        │
        v
+page.svelte
   ├─ QuickAnswerCards      (static copy + links)
   ├─ Troubleshooter        (pure local state)
   ├─ EligibleRollCalculator(pure math helper)
   ├─ GateExplorer          (pure state helper)
   ├─ BlockedSpawnChecklist (server-loaded relationships)
   └─ DataTables            (server-loaded rows)
        │
        v
Tests
   ├─ discoverability links
   ├─ calculator math
   └─ gate output labels
```


## Page structure

### Route and metadata

- Route: `website/src/routes/mechanics/respawns/+page.svelte`
- Server data: `website/src/routes/mechanics/respawns/+page.server.ts`
- Page title: `Monster Respawn Mechanics - Ancient Kingdoms`
- SEO description: `How monster respawn timers, rare spawn chance, dynamic zones, blocked spawns, altar spawns, on-death placeholders, and Renewal Sages work in Ancient Kingdoms.`
- FAQ entries must render as real heading+answer HTML with stable IDs for snippets and Discord links. If the site's SEO stack supports structured data, emit `BreadcrumbList` and `FAQPage` JSON-LD from the same visible on-page copy only.
- Mechanics index card title: `Monster Respawns`
- Mechanics index card description: `Timers, rare rolls, blockers, zone activity, altar spawns, and Renewal Sages`

### Top navigation anchors

Use a compact section nav like existing mechanics pages, but do not let navigation displace the first-screen mental model. On small screens, render the hero sentence, evidence alert, and quick-answer cards before any jump navigation. If a jump nav appears near the top on mobile, collapse it into a compact `Jump to section` control placed after the quick-answer block.

- `#quick-answer` — Quick Answer
- `#reading-current-tables` — Reading Current Tables
- `#why-not-up` — Why Isn't It Up?
- `#core-flow` — Core Respawn Flow
- `#rare-chance` — Rare Chance
- `#zones-aoi` — Zones & AOI
- `#blocked-summonable` — Blocked Spawns
- `#renewal-sage` — Renewal Sage
- `#special-spawns` — Special Spawn Types
- `#data-tables` — Data Tables
- `#faq` — FAQ
- `#evidence` — Evidence

### Section 1: Quick Answer

Purpose: give the player a truthful mental model before detail.

Content:

```text
Respawn time is an eligibility timer, not always a spawn timestamp.

For a normal respawning monster, the server can bring it back only after the monster is dead, respawn is enabled, its timer has elapsed, the game is checking that zone/monster again, and special gates pass. For rares with Chance below 100%, timer elapsed means eligible to roll. If that roll fails, the monster stays hidden and waits another respawn interval before trying again.
```

Include six quick cards:

| Card | Player-facing copy |
| --- | --- |
| Timer | `Respawn 30m` means the monster cannot return before its respawn timer has elapsed. Corpse visibility/cleanup can delay when the server gets to check that dead monster, but corpse time is not a second full respawn timer added afterward. |
| Chance | `Chance 25%` means 25% per eligible respawn attempt. A failed attempt schedules another full respawn interval. |
| Zone active | If nobody is in the zone, the game may stop checking dead monsters there. Returning players can cause elapsed timers to be processed once the zone is active again. |
| Hidden vs corpse | A corpse still visible on someone's screen can behave differently from one that has already disappeared. Hidden dead monsters can keep updating without observers while their zone is active; visible unobserved corpses can stall. |
| Blocked | Blocked/summonable spawns require configured placeholder instances to be dead at the same time. This is not a cumulative kill counter. |
| Renewal Sage | Renewal resets `respawnTimeEnd` for matching respawning dungeon monsters and clears persisted elite/boss dead-state entries; it does not force a spawn or bypass chance/blockers. |


### Reading Current Tables

Purpose: define the labels players already see before sending them into deeper mechanics. Inbound links from monster and zone pages should target `#reading-current-tables` when the user is trying to understand table columns.

Required definitions:

- `Respawn`: the monster's normal respawn interval. `Respawn -` means no normal respawn path is shown for that row/monster.
- `Chance`: chance per eligible respawn attempt. `Chance -` usually means no reduced chance is shown, i.e. 100% for a respawning monster; if `Respawn` is also `-`, read it as no normal respawn rather than guaranteed return.
- `Special`: extra spawn family or gate. `Blocked` means placeholder instances must all be dead simultaneously; `Altar` means event/altar wave; `On Death` means spawned by a source monster death.
- Time-window text such as `20:00-8:00`: an in-game spawn window. This is not the same thing as an **active zone** in this guide.
- `Active zone` in this guide: players are present in the dynamic zone so monster update logic can run.

### Section 2: Why Isn't It Up?

Purpose: primary UX path for casual players, rare hunters, and dungeon leaders.

Design: a diagnostic card group or simple decision tree. V1 should only ask for observable player facts or static table facts: spawn label (`Blocked`, `Altar`, `On Death`), whether the table shows `Respawn -`, whether `Chance` is below 100%, whether a time-window/event label applies, whether players left the zone empty, and whether Renewal Sage was used. If the UI asks about kill time, dead/alive state, or timer elapsed for a specific monster, it must first require selecting an exact monster and must label the answer as player-entered context, not live state.

Decision flow:

1. **What spawn family does the table show?**
   - If `Altar`: check activation item/event flow, not normal respawn.
   - If `On Death`: check source monster death/probability.
   - If `Blocked`: check blockers before chance/time-window rolls; blocked summonables do not roll chance until all required placeholder instances are `DEAD` simultaneously.
   - If blank/regular/chance: continue.
2. **Does the table show `Respawn -`?**
   - No normal respawn path is shown; check special spawn source or event context.
3. **Was the zone empty or inactive?**
   - If nobody is in the dynamic zone, monster ticking is frozen. If a dead monster's zone unloads, its corpse is hidden and its death/corpse timer is reset, but its respawn timer is not.
4. **Does the monster have a time-window or event gate?**
   - If outside the active window/event, a successful normal respawn check still cannot show it.
5. **Is it chance-gated?**
   - If yes, timer elapsed only allows a roll after earlier gates pass; failed rolls wait another interval.
6. **Was Renewal Sage used?**
   - It may make the monster eligible sooner once the zone/monster is checked again, but all other gates still apply.

Recommended output labels:

- `Not ticking: zone inactive`
- `Waiting: respawn timer not elapsed`
- `Eligible to roll: chance gate remains`
- `Roll failed: next eligible attempt after another respawn timer`
- `Blocked: placeholders alive or not all dead simultaneously`
- `Gated: outside time/event window`
- `Special spawn: use altar/event or on-death source path`
- `Could appear if all gates pass; this page cannot know live state`

### Section 3: Core Respawn Flow

Purpose: exact mechanic without source-code intimidation.

Show a simple flow:

```text
Death -> corpse/loot window -> hidden dead state -> respawn timer elapsed -> gates checked -> Show + Revive or stay hidden/dead
```

Required gate table:

| Gate | Meaning | Player-facing implication |
| --- | --- | --- |
| `state == DEAD` | Respawn logic is in the dead-state path. | Live monsters do not run dead respawn checks. |
| `respawn == true` | The monster is allowed to respawn. | No-respawn/event monsters may not return normally. |
| `serverTime >= respawnTimeEnd` | The respawn eligibility timer elapsed. | Timer elapsed starts eligibility; it does not guarantee success. |
| `!isSummonable || respawnSummonableReady` | Summon blockers are satisfied. | Blocked bosses wait until placeholders are dead simultaneously. |
| `Random.value <= probabilityRespawn` | Chance roll passed. | Low-chance rares can fail and wait another interval. |
| Halloween/time window allowed | Event/time gates pass. | Some monsters only appear during time/event windows. |
| Zone/entity update path runs | The Unity object/server update is executing. | Inactive zones and visible unobserved corpses can delay checks. |

Copy rule:

- Use `eligible to respawn` for guaranteed `probabilityRespawn = 1` monsters.
- Use `eligible to roll` for `probabilityRespawn < 1` monsters.

ASCII state sketch for the spec and implementation plan:

```text
Caption: timer elapsed is one gate in the DEAD-state path, not the whole respawn.

        alive monster
             │
             │ OnDeath()
             v
┌──────────────────────────────┐
│ visible corpse / loot window │
│ deathTimeEnd + respawnTimeEnd│
└──────────────┬───────────────┘
               │ cleanup/hide can run only if update path runs
               v
┌──────────────────────────────┐
│ hidden DEAD monster          │
│ timer may already be elapsed │
└──────────────┬───────────────┘
               │ server update tick
               v
┌──────────────────────────────┐
│ gates checked                │
│ timer + blockers + chance +  │
│ time/event + zone/entity     │
└───────┬────────────────┬─────┘
        │ pass           │ fail
        v                v
┌──────────────┐   ┌──────────────────────────────┐
│ Show+Revive  │   │ stay DEAD/hidden             │
│ -> alive     │   │ chance fail: wait full timer │
└──────────────┘   └──────────────────────────────┘
```

### Section 4: Rare Chance and Low-Pop Zones

Purpose: separate rare-frequency behavior from generic respawn.

Must explain:

- `respawn_probability` is a probability per eligible attempt.
- A failed roll calls `Hide()` and schedules `respawnTimeEnd = now + respawnTime`.
- The page must never imply "not up now" means no roll happened; failed rolls are unobservable from static data.
- Low-pop zones can make rares seem more common because alive rares persist and dead hidden rares can process elapsed timers when the zone is active again.
- Low-pop zones can also delay attempts because inactive zone roots freeze monster ticking.
- Zone deactivation has a special dead-monster side effect: if a monster is already `DEAD` when its zone root disables, the server warps it home, hides it, and resets `deathTimeEnd` to current server time. It does **not** reset `respawnTimeEnd`.

Recommended copy:

```text
Low-pop behavior is not a guaranteed reactivation spawn. If the rare was already alive, it can remain alive through quiet periods. If it was dead and hidden, and its timer elapsed while the zone was inactive, it can become eligible to roll when the zone becomes active again. If that roll fails, the next attempt waits another full respawn interval. If the zone unloaded while the monster was dead, the corpse is hidden/reset, but the respawn timer is not reset.
```

ASCII retry timeline:

```text
Caption: a failed rare roll schedules another full respawn interval.

death/cleanup done
      │
      v
hidden DEAD ── wait respawn_time ──► eligible roll #1
                                        │
                         ┌──────────────┴──────────────┐
                         │ roll passes                  │ roll fails
                         v                              v
                    Show + Revive                 Hide; stay DEAD
                                                       │
                                                       v
                                  wait respawn_time again
                                                       │
                                                       v
                                                eligible roll #2
```

Chance calculator requirements:

- Input: `respawn_probability` and number of eligible attempts.
- Output: `P(at least one success) = 1 - (1 - p)^attempts`.
- Label: `Math over eligible rolls only — not a live spawn prediction.`
- Input/domain rules: attempts must be an integer `>= 0`; probability must be constrained to `0–100%`; `0 attempts` returns `0%`; `100%` returns certainty on the first eligible attempt; `0%` is either disallowed or rendered as `no success possible`.
- Show examples:
  - 20% chance after 1/3/5 eligible rolls: 20%, 48.8%, 67.2%.
  - 50% chance after 1/2/3 eligible rolls: 50%, 75%, 87.5%.
- Do not compute exact real-time chance unless the user separately supplies active/inactive intervals; even then label as planner math.

### Section 5: Zones, AOI, and Corpse Cleanup

Purpose: explain the two often-confused update gates.

#### Zone activation

Required points:

- Dynamic zones are active when online players are in that zone.
- `ClearDynamicZones()` disables full zone roots without online players.
- Inactive zone roots stop Unity `Update()` from running for child monsters.
- Portal/death-respawn/resurrection paths can activate destination zones immediately; periodic cleanup runs around every 30s by default.
- Inactive zone means monster ticking is frozen; it does not mean timers are reset.
- If a dead monster's zone unloads, its corpse is hidden and its death/corpse timer is reset to now, but its respawn timer is not reset.

Player copy:

```text
Being away from a zone does not make its monsters keep thinking in the background. If the zone root is inactive, monster update logic does not run. When players return and the zone becomes active, hidden dead monsters whose timers elapsed can be processed then. For already-dead monsters, unloading the zone hides the corpse and resets the corpse timer, but does not reset the respawn timer.
```

ASCII zone/AOI update sketch:

```text
Caption: zone activation and observer/AOI are separate gates.

                    Is the zone root active?
                         │
            ┌────────────┴────────────┐
            │ no                      │ yes
            v                         v
   ┌─────────────────┐        Is entity worth updating?
   │ no Unity Update │             │
   │ no respawn roll │   ┌─────────┴─────────┐
   └─────────────────┘   │ observers > 0     │ hidden
                         v                   v
                 ┌──────────────┐    ┌────────────────────┐
                 │ UpdateServer │    │ UpdateServer       │
                 │ runs         │    │ runs without AOI   │
                 └──────┬───────┘    └─────────┬──────────┘
                        │                      │
                        v                      v
               visible corpse can      hidden DEAD can check
               clean up / wait / roll  elapsed respawn gates

Visible + unobserved + active zone:
   observers = 0 and hidden = false -> UpdateServer skipped
```

#### AOI/observers

Required points:

- AOI `visRange = 96`, rebuild `1.0`, affects which clients observe entities.
- It is not a respawn radius.
- `Entity.IsWorthUpdating()` runs `UpdateServer()` when the entity has observers, or when it is hidden.
- A visible unobserved corpse can stall dead-state cleanup/respawn checks.
- A hidden dead monster can still update without observers while its zone is active.

Decision table:

| Zone active | Observed | Hidden | State | Expected behavior |
| --- | --- | --- | --- | --- |
| No | Any | Any | Any | Zone root inactive; monster update does not tick. |
| Yes | No | No | Alive | Live AI/update skipped while unobserved. |
| Yes | No | No | Dead visible corpse | Dead-state logic can stall until observed or hidden. |
| Yes | No | Yes | Dead hidden | Dead-state logic can run and process elapsed respawn gates. |
| Yes | Yes | Any | Dead | Dead-state logic runs; may clean corpse, wait, or respawn/roll. |
| Yes | Yes | Any | Alive | Live AI/state machine runs. |

Keep this section after the simple rare explanation. It is important but too subtle for the hero.

### Section 6: Blocked / Summonable Spawns

Purpose: correct the kill-counter misconception.

Required points:

- The game has `SummonMonster` trigger components that reference specific placeholder `Monster` instances.
- Every second, the trigger checks those placeholders.
- If any placeholder state is not `DEAD`, the summoned monster/NPC is not ready.
- It writes a cached readiness flag (`respawnSummonableReady`) to the summon entity.
- This is simultaneous state, not a cumulative kill counter.
- Blocker respawn timers are shorter than summoned monster timers for all 9 monster summon triggers in the current data snapshot.

Recommended player copy:

```text
"Blocked" means the summoned monster's respawn gate waits for specific placeholder spawn instances to all be DEAD at the same time. Killing the same monster type somewhere else does not count, and kills are not accumulated like quest progress.
```

ASCII blocker sketch:

```text
Caption: blocked spawns depend on simultaneous DEAD state of specific instances.

SummonMonster trigger: Angry Librarian

specific placeholder instances in scene:
   [Ebon Sage spawn A] state DEAD? ─┐
   [Ebon Sage spawn B] state DEAD? ─┤
   [Ebon Sage spawn C] state DEAD? ─┤
   [Ebon Sage spawn D] state DEAD? ─┤── all DEAD at same 1s check?
   [Ebon Sage spawn E] state DEAD? ─┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ yes                         │ no
                              v                             v
                 respawnSummonableReady = true  respawnSummonableReady = false
                              │
                              v
             summoned monster still needs its own timer/chance gates
```

Data table columns:

| Column | Example |
| --- | --- |
| Summoned monster | Angry Librarian |
| Zone | Vault of the Vanished |
| Required blockers | 5× Ebon Sage |
| Blocker respawn | 6m |
| Summon respawn | 20m |
| Summon chance | 50% per eligible roll |
| Links | summoned monster, blocker monster, zone/map |

Current monster summon examples:

- Ancient Elemental — Sunken Temple — 8 blockers — 7,200s summon respawn — 100% chance.
- Angry Librarian — Vault of the Vanished — 5 blockers — 1,200s summon respawn — 50% chance.
- Frenzied Troll — Trolls Cave — 5 blockers — 600s summon respawn — 100% chance.
- Giant Worm — Despair — 11 blockers — 1,800s summon respawn — 100% chance.
- Grimble Stonegear — The Lone-lands — 8 blockers — 1,200s summon respawn — 100% chance.
- Hrimthur — Everfrost — 8 blockers — 1,200s summon respawn — 75% chance.
- Large Shade Beast — Vault of the Vanished — 7 blockers — 600s summon respawn — 100% chance.
- The Archon — Lost Archives — 8 blockers — 1,200s summon respawn — 100% chance.
- Zarothak the Tormentor — Krom Razz — 1 blocker — 18,000s summon respawn — 100% chance.

Include a caveat that the exported relationship is static; it does not prove the current live blockers are dead/alive.

### Section 7: Renewal Sage

Purpose: prevent expensive misinterpretation.

Required prominent caveat:

> Renewal Sage resets timers; it does not force monsters to appear.

Exact behavior to explain:

- The reset refuses to run if an online player is still inside the target dungeon.
- It checks all monsters, including inactive ones.
- For monsters matching `monster.idZone == idDungeon && monster.respawn`, it sets `respawnTimeEnd = 0`.
- For bosses/elites, it also writes persisted state to `0`.
- It subtracts the required cost from the player if allowed.
- It does not change `state`, `health.current`, hidden/visible status, `respawnSummonableReady`, blocker states, time/event gates, or probability.

Recommended copy:

```text
After a Renewal Sage reset, a dead respawnable monster may be eligible sooner once the zone/monster is checked again. A chance-gated rare can still fail its roll. A blocked/summonable monster still needs its placeholders dead at the same time. A live monster is not killed and respawned by the reset.
```

ASCII Renewal Sage effects sketch:

```text
Caption: Renewal Sage changes `respawnTimeEnd` and persisted elite/boss dead-state entries, not the whole spawn situation.

Renewal Sage command
      │
      ├─ refuses if any online player is inside target dungeon
      │
      v
for each respawning monster in dungeon:
      │
      ├─ set respawnTimeEnd = 0
      └─ if boss/elite: persisted dead-state value = 0

Does NOT change:
      ├─ live/dead state
      ├─ health.current
      ├─ hidden/visible status
      ├─ probabilityRespawn roll
      ├─ blocker placeholder states
      ├─ cached respawnSummonableReady timing
      └─ time/Halloween/event gates
```

Cross-link requirement:

- Any NPC/monster/zone UI that says "Resets all spawns" should link to this section and, ideally, tighten copy to "resets respawn timers" in implementation.

### Section 8: Special Spawn Types

Purpose: teach players how to read `Special` labels and avoid merging mechanics.

Summary cards:

| Type | Current label | What it means | What to do |
| --- | --- | --- | --- |
| Regular | blank | Normal scene monster respawn path. | Use respawn time/chance/zone rules. |
| Time window | `20:00-8:00` style | Respawn gate also checks in-game time window. | Check active time; wrapped windows cross midnight. |
| Halloween/event gate | not always visible as a label | `isHalloween` monsters require Halloween event active. | Treat as event-gated. |
| Blocked/summonable | `Blocked` | Specific placeholders must be dead simultaneously. | Clear/check the listed blockers. |
| Altar/event | `Altar` | Instantiated by event/altar scripts and waves. | Use activation item/event flow, not normal respawn assumptions. |
| On death placeholder | `On Death` | Spawned by source monster death with source probability. | Kill source monster; chance may apply; result may not respawn normally. |
| No respawn | `-` in respawn columns | `does_respawn = 0`. | Do not expect normal respawn. |

Current examples to use:

- Chance-gated rare: `/monsters/cryonexus`, `/monsters/velkrax`, `/monsters/hrimthur`, `/monsters/angry_librarian`.
- Blocked/summonable: `/monsters/angry_librarian` in `/zones/vault_of_the_vanished`, `/monsters/hrimthur` in `/zones/everfrost`.
- On-death placeholder: `/monsters/large_shade_beast` → `/monsters/keeper_remnant`.
- Renewal Sage example: `/npcs/nivara_embermoon` for `/zones/vault_of_the_vanished`.
- Time-window examples: Pumpkin Head/Witch, Spirit of the Forest, Urzak the Untamed.

### Section 9: Data Tables

Purpose: make the page useful as reference and Discord evidence.

Data should be loaded from `website/static/compendium.db` via a dedicated server-side loader and generated at prerender/build time. Snapshot numbers in this spec are review context, not values to hardcode into page copy or tests. The rendered page should show provenance near snapshot tables: generated from `compendium.db` for the current game data build/date; counts may change after patches.

Required tables:

#### Spawn type summary

Columns:

- Spawn type.
- Spawn rows.
- Distinct monsters.
- Definition.
- Link/filter to details.

Current snapshot:

| Spawn type | Spawn rows | Distinct monsters |
| --- | ---: | ---: |
| Regular | 4,461 | 337 |
| Altar | 231 | 29 |
| Summon/blocked | 9 | 9 |
| Placeholder/on-death | 1 | 1 |

Distinct monster counts are per spawn family and are not additive. One monster can appear in multiple families, such as regular + altar; per-monster UI should allow multiple badges rather than forcing one exclusive category.

#### Respawn probability distribution

Columns:

- Probability.
- Monster count.
- Boss count.
- Elite count.
- Summonable count.

Current snapshot:

| Probability | Monsters | Bosses | Elites | Summonable |
| --- | ---: | ---: | ---: | ---: |
| 20% | 5 | 0 | 5 | 0 |
| 25% | 5 | 1 | 4 | 0 |
| 40% | 3 | 0 | 1 | 0 |
| 50% | 16 | 3 | 13 | 1 |
| 60% | 4 | 0 | 4 | 0 |
| 70% | 1 | 0 | 1 | 0 |
| 75% | 6 | 0 | 6 | 1 |
| 100% | 309 | 69 | 25 | 7 |

#### Probability-gated bosses/elites/summonables

Columns:

- Monster.
- Level.
- Boss/elite/summonable badges.
- Zone(s).
- Respawn time.
- Chance per eligible roll.
- Special type/time window if any.

Default filter:

- `does_respawn = 1`
- `respawn_probability < 1`
- `is_boss OR is_elite OR is_summonable`

Current count: 38.

All displayed counts must be derived from build-time SQL queries; do not hardcode snapshot totals in page copy or tests.

#### Summon trigger/blocker table

Columns:

- Summoned monster/NPC.
- Zone.
- Blocker monster name(s).
- Required specific blocker count.
- Blocker respawn.
- Summoned respawn.
- Summoned chance.
- Links.

Include the 1 NPC trigger separately or label entity type; the primary player-facing table can default to monster triggers and expose the NPC trigger in details.

Blocker counts must be derived from `summon_trigger_placeholders` rows joined through `spawn_id -> monster_spawns -> monsters`. Do not derive required blockers from distinct blocker names or denormalized `source_summon_kill_count` fields, because the mechanic is about specific placeholder instances.

#### Time-window monsters

Columns:

- Monster.
- Boss/elite/event badges.
- Respawn time.
- Chance.
- Active window.
- Halloween/event flag.

Current list:

- Pumpkin Head — 300s, 100%, 20→8, Halloween.
- Witch — 300s, 100%, 20→8, Halloween.
- Spirit of the Forest — boss, 7,200s, 100%, 20→8.
- Urzak the Untamed — boss, 7,200s, 100%, 8→22.

#### No-respawn special monsters

Show all bosses/elites/event monsters with `does_respawn = 0`, plus any extra examples from an explicit stable-ID allowlist. Purpose is to explain why some monsters have `Respawn -` without relying on an undefined `notable` category.

Columns:

- Monster.
- Boss/elite/event badges.
- Spawn type/source if known.
- Link.

## Interactive elements

Interactive widgets should be specified with lightweight ASCII wireframes before implementation. The goal is not pixel-perfect UI; it is to make state, labels, and disclaimers reviewable before Svelte code exists.

```text
Caption: all widgets return guidance, never live state.

┌──────────────────── Why isn't it up? ────────────────────┐
│ What kind of spawn? [ rare/chance v ]                     │
│ Timer elapsed?      [ yes / no / unknown ]                │
│ Zone active?        [ yes / no / unknown ]                │
│ Blockers clear?     [ n/a / yes / no / unknown ]          │
│                                                            │
│ Likely mechanic: eligible roll, not guaranteed spawn       │
│ Next checks: keep zone active, verify blockers/time window │
│                                                            │
│ Note: mechanics guidance, not live server state.           │
└────────────────────────────────────────────────────────────┘

┌──────────── Eligible roll math ────────────┐
│ Chance per eligible roll: [ 25% ]           │
│ Eligible attempts:        [  3  ]           │
│                                            │
│ At least one success: 57.8%                │
│ Failed roll: wait another respawn interval │
│                                            │
│ Not a real-time spawn prediction.          │
└────────────────────────────────────────────┘

┌──────────── Gate explorer ────────────┐
│ Zone active?        [yes]             │
│ Observers           [0]               │
│ Hidden?             [yes]             │
│ State               [DEAD]            │
│ Timer elapsed?      [yes]             │
│ Chance roll         [fails]           │
│ Corpse cleanup due? [n/a]             │
│                                      │
│ Output: UpdateServer runs; respawn    │
│ check runs; roll fails; stay hidden   │
│ DEAD and wait another respawn timer.  │
└──────────────────────────────────────┘
```

### 1. Why Isn't It Up? troubleshooter

Required behavior:

- User selects broad case: `normal`, `rare/chance`, `blocked`, `renewal sage`, `altar/event`, `on death`, `not sure`.
- User answers a few visible yes/no/unknown questions.
- Output is a cautious explanation and next checks.

Example output:

```text
Likely explanation: eligible roll, not guaranteed spawn.
The listed timer can make this rare eligible to roll, but its Chance is below 100%. If the roll fails, the server hides it and waits another respawn interval before the next eligible roll. This page cannot tell whether the live roll passed or failed.
```

Guardrail:

- Every output must include `This is mechanics guidance, not live state.`

### 2. Eligible-roll calculator

Inputs:

- Chance per eligible roll.
- Number of eligible attempts.
- Optional respawn interval for explanatory wait labels.

Outputs:

- Probability of at least one success across N eligible attempts.
- Reminder that failed attempts wait another respawn interval.
- Optional advanced-only detail: expected attempts (`1 / p`) may be shown only behind an `Advanced math` disclosure with the warning `Long-run average only — not a cap, deadline, or guarantee for a single camp.`

Guardrails:

- Never label output as spawn chance by a real clock time unless active/inactive windows are explicitly modeled.
- Always say `eligible attempts`, not `minutes` or `guaranteed by`.
- Attempts must be an integer `>= 0`; probability must be constrained to `0–100%`; `0 attempts` returns `0%`; `100%` returns certainty on the first eligible attempt; `0%` is either disallowed or rendered as `no success possible` without an expected-attempt estimate.

### 3. Respawn gate explorer

Inputs/toggles:

- Zone active.
- Observers: 0 or 1+.
- Hidden.
- State: alive/dead.
- Respawn timer elapsed.
- Corpse cleanup due / loot window expired.
- Probability roll passes/fails.
- Summonable ready.
- Time/event window allows.

Output:

- Whether Unity/monster update ticks.
- Whether `UpdateServer` runs.
- Whether dead-state respawn check runs.
- Outcome label.

This can be derived from the same state matrix as `build-pipeline/src/compendium/analysis/monster_respawn_flow.py`, but the website should not import Python. The implementation can mirror the small logic in TypeScript.

### 4. Blocked spawn checklist

Inputs:

- Select a summon/blocked monster from exported data.

Output:

- Required blocker monster(s) and count.
- Zone/sub-zone.
- Summoned respawn time and chance.
- Caveat that blockers are specific spawn instances and live state is unknown.

Optional UI:

- Local-only checkboxes for party coordination. They must not imply site knows live blocker state.

### 5. Data table filters

Filters:

- Boss.
- Elite.
- Summonable.
- Chance below 100%.
- Spawn type.
- Time window.
- Zone.

## Cross-linking plan

### Inbound links to add

1. `website/src/routes/mechanics/+page.svelte`
   - Add card for `/mechanics/respawns`.
   - Update `/mechanics` SEO description and summary copy to mention respawn mechanics so hub snippets and AI retrieval reflect the new page.

2. `website/src/routes/monsters/[id]/+page.svelte`
   - Near `Spawns` heading: link `How respawns work` to `/mechanics/respawns#quick-answer`.
   - Near `Respawn`/`Chance`/`Special` labels or table help: link to `/mechanics/respawns#reading-current-tables`, `/mechanics/respawns#core-flow`, and `/mechanics/respawns#rare-chance` as appropriate.
   - In blocked cards: link to `/mechanics/respawns#blocked-summonable`.
   - In altar cards: link to `/mechanics/respawns#special-spawns`.
   - In on-death placeholder cards: link to `/mechanics/respawns#special-spawns`.
   - In Renewal Sage cards: link to `/mechanics/respawns#renewal-sage` with copy like `What reset does and does not do`.

3. `website/src/routes/zones/[id]/+page.svelte`
   - Add column/help link for respawn columns to `/mechanics/respawns#reading-current-tables`.
   - Near renewal sage/dungeon reset surfaces, link to `/mechanics/respawns#renewal-sage`.
   - Near altar/event surfaces, link to `/mechanics/respawns#special-spawns`.

4. `website/src/routes/npcs/[id]/+page.svelte`
   - Renewal Sage role description should link to `/mechanics/respawns#renewal-sage`.
   - Copy should be tightened from "Resets all spawns" to "Resets respawn timers" if implementation scope includes this related fix.

5. `website/src/lib/components/map/EntityPopup.svelte`
   - Renewal Sage popup reset text should link to `/mechanics/respawns#renewal-sage` if map popups support links in that area.

6. Shared respawn table headers
   - Add an opt-in, touch-friendly help link/button for `Respawn`, `Chance`, and `Special` via a parent-provided help config or header renderer. Keep generic table primitives route-agnostic; do not hardcode `/mechanics/respawns` inside low-level formatting utilities. Prefer header help over per-cell help unless a page explicitly needs both.

### Outbound links from the respawn page

- `/monsters` and `/zones` for lookup.
- Specific examples:
  - `/monsters/cryonexus` and `/zones/northern_wastes` for chance-gated rare behavior.
  - `/monsters/velkrax` and `/zones/temple_of_valaark` for chance-gated boss behavior.
  - `/monsters/angry_librarian` and `/zones/vault_of_the_vanished` for blocked + chance behavior.
  - `/monsters/hrimthur` and `/zones/everfrost` for blocked + 75% chance behavior.
  - `/monsters/large_shade_beast` and `/monsters/keeper_remnant` for on-death placeholder behavior.
  - `/npcs/nivara_embermoon` and `/zones/vault_of_the_vanished` for Renewal Sage behavior.
- `/mechanics/experience#kill-xp` only where relevant to kill/camping decisions.
- `/mechanics/combat` only if discussing death/combat state context; avoid unnecessary tangents.

### Link text rules

Use expectation-setting labels:

- Good: `Why chance is per eligible roll`
- Good: `What Renewal Sage reset does and does not do`
- Good: `How blocked respawns work`
- Bad: `Secret rare mechanics`
- Bad: `Force respawn bosses`
- Bad: `Respawn radius`

## FAQ and common misconceptions

The FAQ should be anchor-linked from the section nav and support direct Discord linking.

### Does `Respawn 30m` mean it appears exactly 30 minutes after death?

No. It means the monster cannot return before its respawn timer has elapsed. Corpse visibility/cleanup can delay when the server gets to check that dead monster, but corpse time is not a second full respawn timer added afterward. The zone/monster still needs to be checked and all gates must pass. If `Chance` is below 100%, it only becomes eligible to roll.

### What does `Chance 25%` mean?

It is the chance per eligible respawn attempt. If the roll fails, the monster remains hidden/dead and schedules the next eligible attempt after another respawn interval.

### Do rares always spawn when someone enters a quiet zone?

No. Alive rares can persist through quiet periods. Dead hidden rares can become eligible to roll when the zone reactivates if their timer elapsed while inactive. Failed rolls still delay another interval.

### Do inactive zones pause timers or reset timers?

Inactive zones freeze monster ticking. They do not reset `respawnTimeEnd`. If a dead monster's zone unloads, the corpse is hidden and its death/corpse timer is reset to now, but the respawn timer is not reset. When the zone becomes active again, hidden dead monsters can process elapsed timers and gates.

### Do I need to stand within 96 units for respawn?

No. `96` is the AOI/visibility range found in serialized Unity data. It affects observation/interest management, not a respawn radius.

### Can leaving AOI stall a corpse?

It can. Visible unobserved corpses may not run dead-state logic because visible unobserved entities fail the update-worthiness gate. Hidden dead monsters are different: they can still update without observers while the zone is active.

### What does `Blocked` mean?

The summoned monster waits for configured placeholder spawn instances to all be dead at the same time. It is not a quest-style kill counter, and killing the same monster type elsewhere does not count.

### Why did we kill all blockers and the boss still did not appear?

Possible reasons: not all configured placeholder instances were dead simultaneously, the summoned monster's own timer had not elapsed, its chance roll failed after blockers were clear, the zone/monster was not being checked, or another gate such as a time/event gate blocked it.

### Does Renewal Sage force the boss to spawn?

No. Renewal Sage resets `respawnTimeEnd` for matching respawning monsters in the target dungeon and clears persisted elite/boss dead-state entries. It does not kill live monsters, revive dead monsters immediately, bypass chance, clear blockers, change hidden/visible state, or force cached summon readiness to update instantly.

### Does Renewal Sage work while players are inside the dungeon?

The command refuses the reset if any online player is still inside the target dungeon.

### Are altar/event spawns normal respawns?

No. Altar/event monsters are instantiated by event scripts and waves. They should be read as activation/event mechanics, not normal scene monster respawns.

### Are on-death placeholder spawns blocked/summonable spawns?

No. On-death placeholders are direct spawns from a source monster death path, with their own source probability. The current notable example is Large Shade Beast spawning Keeper Remnant.

### Why did a boss survive server quiet time?

If it was alive before the zone became inactive, it can remain alive through that inactive period. Inactive zone periods do not automatically despawn alive rares.

### Can the page tell me whether a rare is currently alive?

No. The page uses static exported data and script-derived mechanics. It cannot know current live state, current blocker state, or whether a probability roll passed.

## Content tone and terminology

Use:

- `eligible to roll`
- `chance per eligible attempt`
- `active zone` / `inactive zone`
- `hidden dead monster`
- `visible corpse`
- `blocked by placeholder instances`
- `resets respawn timers`
- `mechanics guidance, not live state`

Avoid:

- `respawns immediately`
- `guaranteed after X minutes` for chance-gated monsters
- `kill counter` for blocked spawns
- `spawn exploit`
- `respawn radius`
- `Renewal Sage respawns the dungeon`
- `every visit triggers a fresh respawn cycle`

## Visual and component design

Follow current mechanics page conventions:

- Container max width: match `max-w-4xl` unless the data tables need `max-w-5xl`.
- Use `Breadcrumb`, `Seo`, `Card`, `Alert`, existing table styles, and existing `DataTable` when sortable/filterable data is needed.
- Use muted explanatory text and concise card headers like Combat/Experience pages.
- Keep the first viewport free of large tables and dense jump-link blocks.
- On mobile, prioritize the hero sentence, evidence alert, quick cards, and diagnostic flow before data tables; place jump navigation after the quick cards or collapse it behind a `Jump to section` control.
- Interactive disclosure must be semantic and keyboard accessible. Use native `<details>/<summary>` or a button+region pattern with visible focus and correct `aria-expanded`/`aria-controls`; card-shaped UI remains presentational unless it contains a real link or button.
- ASCII sketches are planning artifacts. The shipped page should translate them into semantic prose, lists, steps, or cards; if any diagram remains visible, it needs an adjacent plain-language takeaway and must not be required for understanding.
- Data tables wider than four columns must have a small-screen presentation: stacked record cards, expandable row details, or a compact summary with drill-in. Filters must sit above results and work in both desktop and mobile layouts.

Recommended visual hierarchy:

1. H1 + hero explanation.
2. Warning/caveat alert.
3. Six quick answer cards in a responsive grid.
4. Diagnostic flow card.
5. Mechanics cards.
6. Data tables.
7. FAQ.
8. Evidence/caveats.

Icons can use lucide equivalents:

- Timer/Clock for respawn time.
- Percent for chance.
- Map/MapPin for zone activity.
- Eye/EyeOff for AOI/observers.
- Lock/Unlock or Blocks for blocked spawns.
- RefreshCw for Renewal Sage.
- Flame/Sparkles for event/altar.

## Evidence section

Anchor: `#evidence`.

Purpose: give power users and Discord explainers source confidence without forcing casual readers through code names.

Requirements:

- Include the visible caveat from the top of the page again in shorter form: `Mechanics guidance from decompiled scripts/exported data; not live state.`
- List the source families: decompiled server scripts, exported SQLite data, serialized Unity server data.
- Link or name the key source files/methods for each surprising rule: `Entity.IsWorthUpdating`, `Monster.UpdateServer_DEAD`, `Monster.OnDisable`, `SummonMonster.Update`, and `Player.CmdResetDungeon`.
- Keep code snippets short and expandable; the page should not become a source dump.


## Data and implementation boundaries

The spec is for a page, but it must still give implementers a clear map of data responsibilities, pure helper boundaries, and test seams:


```text
Caption: keep DB reads, deterministic mechanics helpers, and Svelte presentation separable.

routes/mechanics/respawns/
  +page.server.ts
    └─ open/close DB only; returns loadRespawnMechanicsData(db)

  +page.svelte
    ├─ page layout and section composition
    ├─ quick-answer cards
    ├─ diagnostic widget shell
    └─ data table rendering

lib/server/respawn-mechanics.ts
  ├─ loadRespawnMechanicsData(db): RespawnMechanicsPageData
  ├─ one named query/mapper per dataset
  ├─ curated stable-ID example validation
  └─ explicit row/result types

lib/respawn-mechanics/
  calculations.ts
    ├─ cumulativeEligibleRollChance(p, attempts)
    └─ optional advancedExpectedEligibleAttempts(p)

  gate-explorer.ts
    ├─ evaluateRespawnGate(input)
    └─ formatGateOutcome(decision)

  types.ts
    └─ shared page/widget row types if generated route types get noisy

Tests
  routes/mechanics/discoverability.test.ts
  lib/server/respawn-mechanics.test.ts
  lib/respawn-mechanics/calculations.test.ts
  lib/respawn-mechanics/gate-explorer.test.ts
```

### Server load data

`lib/server/respawn-mechanics.ts` should provide:

- Spawn type counts from `monster_spawns`.
- Respawn probability distribution from `monsters`.
- Probability-gated boss/elite/summonable monsters with zones.
- Summon trigger/blocker summary from `summon_triggers`, `summon_trigger_placeholders`, `monster_spawns`, `monsters`, and `zones`.
- Time-window monsters.
- No-respawn special monsters from deterministic criteria.
- Curated examples loaded by stable IDs and validated in the server loader; do not hardcode example links in the Svelte component.
- Renewal Sage examples loaded by stable IDs if used.

### Static client logic

Safe for client-side TypeScript:

- Eligible-roll probability formula.
- Gate explorer state labels.
- Troubleshooter outputs.

Do not fetch live state or imply live state.

## Acceptance criteria for the eventual page

The implementation is acceptable only if all of these are true:

1. Page is reachable at `/mechanics/respawns` and linked from `/mechanics`.
2. First screen says respawn timers are eligibility, not guaranteed spawn timestamps.
3. Every chance-gated explanation uses `eligible to roll` or equivalent wording.
4. Failed probability roll behavior is explicitly stated: hide + next attempt after another respawn interval.
5. Low-pop zone behavior has its own section and does not say rares always spawn on return.
6. Blocked/summonable spawns are explained as simultaneous placeholder state, not kill counters.
7. Renewal Sage section says what it changes and what it does not change.
8. AOI section explicitly says `96` is not a respawn radius.
9. Altar/event and on-death placeholder spawns are separated from normal respawns.
10. FAQ covers timer guarantee, chance, inactive zones, AOI/radius, blockers, Renewal Sage, altar/event, on-death placeholders, and live-state limitations.
11. Monster and zone pages have at least one contextual inbound link to the new mechanics page, with table-label links targeting `#reading-current-tables`.
12. Data tables are generated from SQLite data through the dedicated server loader, not stale hand-entered values.
13. The required v1 troubleshooter includes the `mechanics guidance, not live state` disclaimer. Secondary tools, if shipped, include the same disclaimer and stay below the quick-answer content.
14. ASCII sketches remain planning artifacts or are translated into semantic cards/flows while preserving their captions/takeaways. Any visible diagram has adjacent plain-language text and is not required for understanding.
15. Data tables wider than four columns have a mobile-friendly presentation.
16. Page passes Svelte type checking and the mechanics discoverability test is updated for the new page.

## Verification plan for implementation

- Add or update a mechanics discoverability test to assert:
  - Mechanics index links to `/mechanics/respawns`.
  - Monster page source links to `/mechanics/respawns` from the Spawns/respawn context.
  - Zone page source links to `/mechanics/respawns` from respawn context.
  - At least one Renewal Sage surface links to `/mechanics/respawns#renewal-sage`.
- Add render-level tests for visible links/anchors, mandatory disclaimer text, and accessible disclosure controls.
- Add table-driven helper tests covering zone inactive freeze, visible-unobserved corpse stall, observed corpse cleanup before respawn, hidden-unobserved dead respawn checks, failed probability rolls, blocked summon readiness, and time/event gates.
- Add a `troubleshooter` test covering unknown answers and the mandatory `mechanics guidance, not live state` disclaimer.
- Add a server-load/query-contract test that asserts curated example IDs resolve, required datasets expose stable fields/order, blocker counts come from `summon_trigger_placeholders`, the placeholder/on-death row is preserved, and the NPC summon trigger is labeled separately.
- Run `pnpm --dir website run check` after implementation.
- If touching build-pipeline analysis, run targeted Python tests for respawn flow analysis.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Page becomes too dense. | First screen quick cards; exact mechanics and evidence lower on the page; no nested accordions. |
| Calculator read as guarantee. | Label everything as `eligible rolls only`; no deterministic spawn timestamp promises. |
| Renewal Sage copy causes currency mistakes. | Prominent `does not force spawn` callout near every Renewal Sage mention. |
| AOI `96` becomes mythologized. | Mention only in AOI misconception section; explicitly not a respawn radius. |
| Static data mistaken for live state. | Top caveat and repeated disclaimers in interactive outputs. |
| Existing `Chance` column remains ambiguous. | Add contextual links/tooltips and define `Chance` as per eligible roll. |
| Spawn row counts become stale. | Generate tables from DB at prerender time. |
| Source-derived edge cases overfit player behavior. | Keep corpse/AOI cleanup in advanced/common-situation sections, not hero. |
| Visual sketches drift from implementation. | Keep sketches text-based, captioned, and close to the relevant section; implementation review must preserve the takeaway even if the final UI uses cards instead of ASCII. |

## Implementation planning decisions

These decisions should be treated as defaults for the implementation plan:

1. **Stage interactions deliberately:** v1 must ship the `Why isn't it up?` troubleshooter because it supports the primary player task. The eligible-roll calculator, gate explorer, and blocked-spawn checklist remain specified as secondary tools and should ship lower on the page only if they do not make the first release tool-first or compromise mobile clarity.
2. **Use normal anchors for cross-links:** prefer `<a href="/mechanics/respawns#...">` for anchored links. `MechanicsLink` can stay unchanged unless implementation finds repeated anchor boilerplate worth centralizing.
3. **Make respawn column help opt-in and route-agnostic:** parent pages should pass help href/config into a shared header renderer. Low-level table utilities should not hardcode `/mechanics/respawns`.
4. **Use server-loaded curated examples by stable IDs:** define a short stable-ID list in the respawn page server loader and verify each ID exists, so examples stay linkable while still failing loudly if data changes.
5. **Split cross-surface copy into a clean v1 boundary:** v1 requires the new page, mechanics index link/metadata, at least one monster-page link, one zone-page link, one Renewal Sage link surface, and opt-in shared table help if it stays route-agnostic. Broader NPC/map copy tightening should be planned as a separate task unless it is trivial in the same implementation pass.
