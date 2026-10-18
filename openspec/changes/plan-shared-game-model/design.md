## Context

The compendium publishes what the installed build of Ancient Kingdoms contains. Its next features all read the same facts, relations, rules and character state. This design records the model they share, the decisions taken on 2026-10-16, and the order of the follow-up changes that implement it.

The original evidence came from the decompiled server code, the published database, a survey of other game wikis and tools, and Afallon Compendium. Follow-up changes own their current observations and implementation evidence. This design owns the shared direction and dependency boundaries.

Each decision has a status:

- Decided: agreed, and later changes build on it.
- Open: not decided yet.

### Why one model

The following boundaries distinguish archived foundations from work tracked by their follow-up changes.

| Area | Current boundary |
| --- | --- |
| Item sources | Acquisition owns the replacement of method-specific source projections, raw relationship JSON consumers and virtual source helpers with shared methods and queries. |
| Game rules | The shared rule boundary and the altar, primal-essence, item-level and chest corrections are implemented in the archived game-rules change. Acquisition must preserve them while replacing their input projections. |
| Stats | The exported vocabulary and formatting cutover is implemented in the archived stat-vocabulary change. It is not a remaining prerequisite to rediscover. |
| Effects | Effects retain skill identity. The NPC membership/count defect belongs to acquisition. Complete effect-applier and mechanic lookup work remains with the reference feature. |
| Character state | Remembered calculator numbers still have no character identity. The character/store change remains separate from the acquisition requirement projection. |
| Saves | The encrypted-save reader spike is complete. Production import, authored quest identity and progress/stash views remain later work. |

## Goals / Non-Goals

**Goals:**

- Reference pages with reverse lookups for stats, effects, armor sets, races and crafting stations.
- Zones on a level axis, with one remembered level and veteran point total shared by every page.
- A character planner: attributes, both specializations, veteran skills, the 16 equipment slots with augments, armor set thresholds, a sourced stat sheet, and the mercenaries with their gear and supplies.
- "Where to Get": what a plan still needs, grouped by kind of trip.
- Save import with progress views and a search across characters, banks, house chests and mercenaries.
- Sharing builds without accounts.
- One owner for every fact, rule and relation those features read.

**Non-Goals:**

- Finding items or effects by their icon, which is too niche.
- Automated patch diff pages. They have the lowest priority, because the game still adds mechanics often enough that a diff would mostly show export changes.
- A combat or damage simulator on the site. `openspec/specs/game-calculators/spec.md` forbids an unverified one, and simulation lives in the separate `ancient-kingdoms-sim` project.
- A companion mod that exports saves (D12).
- User accounts, for now (D14).

## Decisions

### D1. One owner per fact, rule and relation (Decided)

Each fact, rule and relation has exactly one owner. Pages, popups, calculators, the planner and save import read from those owners and never derive them again. The contracts D2 to D7 are those owners.

Alternative rejected: building each feature on its own copy, which is how the defects below came about.

### D2. Vocabulary (Decided)

- One stat registry covers the 28 summed stats and the effects the engine reads at hit time: ward, damage shield, heal on hit and cooldown reduction. Each entry holds an id, the character window's name and the item tooltip's name, a unit, a display precision, a clamp, and its key in every source vocabulary: item stats, skill bonus columns, class and pet curves, and calculator inputs.
- Labels come from the game's own label code where the game names a stat, and are exported rather than typed. Wording the site deliberately chooses differently, such as "light" one-handed weapons, is a recorded override.
- Mechanics are defined once from code: stun, fear, knockback, root, sleep, snare, damage over time by type, healing over time, ward, mana shield, damage shield, invisibility, illusion, blindness, cleanse by type and dispel. Silence does not exist in the game code. The definitions land with the effect lookups, their first new consumer, because the three current copies disagree on no page today.
- The registry replaces `website/src/lib/terminology.ts`, `website/src/lib/constants/stats.ts`, `STAT_DISPLAY_NAMES` in `build-pipeline/src/compendium/denormalizers/items/tooltips.py`, the per-page percentage lists, the two `SCALING_FIELDS` in `website/src/lib/skills/skill-scaling.ts` and `website/src/routes/professions/scroll_mastery/+page.server.ts`, and the local number and percent formatters. `unify-stat-vocabulary` implements it.

### D3. Relations (Decided)

Each relation is stored once, with both endpoints and the facts about the pair, and is read from either side.

- Acquisition: item, method, providers, grouped yield/cost, requirements (D4), repeatability and a typed enclosing probability process. Preserve deterministic delivery, independent rolls, uniform picks, boss loot, ordered capped chest openings and skill-dependent processes. A displayed chance names its event and assumptions.
- Places come from explicit eligible provider memberships, not a template-wide union of zones. A method is mapped only where that context produces its result.
- Usage: recipe material, quest objective, currency, key, altar activation, merge or fragment component, and augment.
- Effect application, with one applier kind per row: class, veteran, mercenary, pet, monster, aura, NPC, potion, food, relic, scroll, weapon proc, trap, dangerous ground, zone hazard and game state.
- Stat grants: every source of every stat with its amount by rank or level. Sources are items, augments, armor set thresholds, passive skills, buffs, class curves, race, class growth, books, mercenary curves and hire rolls.
- Armor set membership and spawns complete the relations.
- Raw exported relationship payloads are normalization input only. Migrated families use canonical typed relations, not public JSON columns or legacy source/usage tables.

The [acquisition design](../archive/2026-10-18-unify-acquisition-usage-requirements/design.md) defines the method anchor, typed details, grouped edges and provider memberships, implemented and archived. The physical layout of remaining effect/stat relations stays with their later first-consumer changes.

### D4. Requirements (Decided)

One typed vocabulary covers progression, identity, possession, quest/recipe knowledge, profession qualification and world conditions. It preserves phase, subject, conjunctions and alternatives. Costs reference the same input facts instead of independently repeating consumption requirements. The [requirement contract](../../specs/game-requirements/spec.md) defines partial-knowledge evaluation. The active-character feature supplies its facts later.

### D5. Rules (Decided)

- All game formulas live in one TypeScript module that runs both at prerender and in the browser. `website/src/lib/utils/fishing-source-ranges.ts` already works this way, and it is the one source model without contradictions.
- The database stores inputs and rule parameters, never results that depend on a character. Altar thresholds are data. Which tier a character gets is a rule.
- A prerendered page shows a stated baseline, as the fishing ranges do. With an active character, the same function recomputes in the browser.
- The pipeline keeps the derivations that need no character, such as zone attribution and redaction closure. Where the game computes such a fact with a function of its own, the exporter calls that function instead, as `unify-game-rules` does for primal essence and item level. No formula exists in both Python and TypeScript.
- Every formula keeps its `// Source:` citation and is confirmed in the game per D15.

### D6. Character (Decided)

One versioned shape is shared by the planner, share links, export files, save import, every calculator and the sim's inputs (D15). The shape and the link format are settled before the first feature ships, because changing them later breaks stored characters and published links.

- Build: class, race, level, total veteran points, veteran skill ranks, two specializations each with an attribute allocation, class skill ranks and an optional purchase order, the 16 equipment slots as item instances (D10), the consumables in use, and the mercenaries (D11).
- Progress: quests completed, zones discovered, books read, recipes learned, profession levels, faction standing, keys, boss and hunt kills, and owned items with their location. Preserve inventory slot or container detail when a game gate depends on it rather than only a broad ownership label.
- Every value records entered, imported, derived or unknown provenance. Collections record whether their scope is complete or partial. Unknown is never shown or computed as 0, and absence from a partial collection is not proof of failure.
- Collected marks on planned items are progress, not build, so they stay out of share links.
- The existing `calculation:<key>` values migrate once into a draft character. Calculators then read the active character and keep a manual override.

### D7. Read models and shared presentation (Decided)

- One query layer with an injected executor serves the prerender (better-sqlite3) and the browser (sql.js). `getItemMapBounds` in `website/src/lib/queries/map-search.ts` already takes an executor. Map popups stop deriving sources on their own.
- Shared components render relations, requirements and stats, so "Dropped by" on an item and "Drops" on a monster are the same rows through the same component. A relation table plans its columns from its rows and keeps every linked row in the prerendered HTML.
- A detail page adopts the shared components only once its own change is approved.

### D8. One SQLite database for prerender and browser (Decided)

The site keeps prerendering from `compendium.db` and shipping the same file to the browser through the sql.js worker. The planner, "Where to Get" and save import query it directly, without separate data bundles. The database retains evaluator facts, including per-rank skill requirement curves.

Alternative rejected: typed JSON documents as Afallon publishes them. Afallon needs them because it has no browser database.

### D9. Effects are buff skills (Decided)

The game identifies an active effect by the hash of its buff skill's name (`server-scripts/Buff.cs:9-37`), saves store that name in `character_buffs`, and every applier points at the skill. The buff skill's page is therefore the effect page, and it shows the casting details only when a caster exists. Stun, fear and knockback are fields of damage skills, not buffs. Root and sleep are movement speed thresholds. Each mechanic of D2 gets reverse lookups on its existing `/mechanics/combat` anchor and a filter on `/skills`. Mechanics pages are not called guides.

Alternative rejected: a separate effect kind, as Afallon has.

### D10. Items and augments as the game has them (Decided)

- An item instance is an item, an amount, a durability and at most one augment (`server-scripts/ItemSlot.cs:6-14`). Nothing about an instance is random.
- Quality tiers are separate items. There are no Normal, Blessed, Cursed or Primal variants of one item.
- Defensive augments fit armor and shields. Offensive augments fit weapons and other equipment. Ammunition takes none.
- Equipment at durability 0 stays equipped but grants nothing and does not count toward armor sets.
- Three working pieces of an armor set grant its attribute bonuses to players and mercenaries. Five grant its skill ranks to players only.

### D11. Mercenaries as the game has them (Decided)

- A player hires up to 10 mercenaries and has 1 to 4 active depending on level: 1 below level 20, 2 from 20, 3 from 30 and 4 from 40, within a party of at most 5. `website/src/lib/utils/merc-stats.ts` cites the game code for each limit.
- Mercenary skills are fixed per class and never chosen. Each rank is the smaller of the skill's maximum and floor(level / 5) + floor(total veteran points / 10), and at least 1 for Bards and Necromancers. Ranks are derived, never stored.
- The planner configures each mercenary's class, race, 16 equipment slots with augments, and four supply slots: food, utility potion, healing potion and resource potion.
- Hire rolls stay ranges until a save import provides the values the save stores (D12).

### D12. Save import reads game.dat in the browser (Decided)

- `game.dat` is a SQLCipher 4 database with that version's default settings: PBKDF2-HMAC-SHA512 with 256,000 iterations, 4,096-byte pages and an HMAC-SHA512 on every page (`server-scripts/Database.cs:7,780`). The game keeps it in WAL mode.
- Players import after closing the game, because the game writes pending changes into `game.dat` when it closes the database (`server-scripts/Database.cs:836-857`).
- The key lives in code, obscured and assembled at runtime. It never appears in documentation, reports, issues or chat. The rule in the ancient-kingdoms-save-files skill against committing the key changes to match when the reader lands.
- The update workflow compares the tables and columns the reader expects with the declarations in the decompiled `Database.cs` and fails on drift, as the citation check does.
- Dates are .NET ticks of UTC time, because the game writes `DateTime.UtcNow` (`server-scripts/Database.cs:2458,2996`).
- Saves reference items, skills and monsters by name, which the game keeps unique, so the reader joins on names. Every item name stored in the spike's sample save resolves to a published item.
- Saves keep names from older game versions. The sample save holds a boss killed under an earlier spelling of its name and two ores mined under an earlier capitalization. The reader shows such entries as not found and never guesses a match.
- The game stores a quest by its authored `idQuest` field (`server-scripts/Quest.cs:33`), which the export lacks. All 120 values in the sample save equal a quest asset name under the exporter's id rule (`mods/DataExporter/GameIds.cs`), but no code ties `idQuest` to the asset name, so the export adds it.
- A mercenary row keeps the hire rolls drawn at hiring (`multiplierHealth`, `multiplierMana`, `baseCombat`), and the game adds the veteran bonus when it loads the mercenary (`server-scripts/Player.cs:10903,10922`). A save can flag more mercenaries as summoned than the level allows. The game loads the first ones up to the level's limit (`server-scripts/Player.cs:5068-5071`), and the reader derives the active set the same way.
- PlayerPrefs data (skillbars, mercenary auto-consume toggles, helm visibility), fog of war and Steam achievements are outside `game.dat` and are not imported.
- Content the compendium redacts can appear in a save. It shows as unknown and is never dropped.

Reader (Decided): the browser derives the keys and decrypts the pages with WebCrypto, checks every page's HMAC, and opens the result with the sql.js build the site already ships. A wrong key or a changed cipher setting fails the check on the first page instead of producing wrong data. The update workflow opens a local save with the reader, so such a change fails the update before it reaches players. Both readers opened a copy of the sample save in headless Chromium:

| Reader | Added download | Open and integrity check | Limits |
| --- | --- | --- | --- |
| WebCrypto and the site's sql.js | About 1.5 KB compressed, 60 lines of site code | 89 ms | The site implements the SQLCipher 4 page format itself and tests it against a database encrypted with a test key |
| SQLite3 Multiple Ciphers 2.6.1, WebAssembly build | 572 KB compressed | 240 to 270 ms | A second SQLite engine beside sql.js. It opens the save only with exclusive locking or as immutable, because its WebAssembly file system has no shared memory for WAL mode |

Alternative rejected: a companion mod that writes a snapshot. It would break with game and mod loader updates, need its own releases and install support, and reach only players who install mods.

### D13. Characters persist in the browser with backups the user owns (Decided)

- Characters, plans and imported progress persist across sessions. Losing a modified plan is not acceptable.
- Storage engine: IndexedDB for characters and imported progress, because it is asynchronous, reads one record at a time and leaves room for owned-item lists. `localStorage` stays for small interface settings. The Origin Private File System is built for large files and SQLite persistence, which nothing here needs. The Cache API holds HTTP responses.
- Tabs coordinate through the Web Locks API, which serializes writes with revisions, and BroadcastChannel, which refreshes other tabs.
- The stored format is versioned. An upgrade never drops an entry that a game patch made unresolvable. The entry stays visible and is marked as no longer found.
- Durability: every engine above is origin storage with the same eviction. Safari deletes a site's script-written storage after seven days of Safari use without interaction with the site, unless the storage is persistent. WebKit grants persistence by heuristics such as whether the site runs as a Home Screen web app. Chrome grants `navigator.storage.persist()` based on engagement, and Firefox asks the user. The site requests persistence, and backups stay in the user's hands: an export file in every browser, and on Chromium an optional linked backup file that the site rewrites after each change through the File System Access API, whose permission can persist across visits since Chrome 122. Firefox and Safari ship only the Origin Private File System, which is evictable.
- Imported progress can be read again from the save. Authored plans cannot, so backups protect plans first.

### D14. Sharing without accounts (Decided)

- One format (D6) and three transports: a link with the build encoded after `#` when it fits, a short link for larger builds, and an export file for backup and moving. Link sizes are measured before the format is fixed (Open).
- Short links: an endpoint on the existing Cloudflare Worker stores schema-valid builds in D1, keyed by a hash of the canonical build, and returns `/b/<id>`. Shared builds never change, so nobody needs ownership or edit rights. D1 is chosen over Workers KV and R2 because the controls below need exact counts and cleanup queries: KV is eventually consistent, and R2 lifecycle rules only delete by age. The D1 free tier allows 100,000 rows written per day and 5 GB of storage.
- Abuse controls, which bound the worst case by design:
  - The Worker decodes with the same code as the site, rejects unknown ids, out-of-range values and unknown fields, and caps the size. Free text is limited to a short character name. Only builds can be stored.
  - Identical builds map to the same row, so repeating a build costs nothing. Ids are long hashes and cannot be enumerated.
  - A per-client burst limit uses the Workers rate limiting binding, which counts per Cloudflare location over 10 or 60 seconds.
  - A global daily cap on new rows is enforced in D1. Once it is reached, Share falls back to encoded links and export files until the next day. Daily growth can never exceed the cap times the size limit.
  - A scheduled job deletes builds nobody opened within 30 days, so a bot that only writes leaves nothing behind. Short links are for sharing, not for backups.
  - Share pages are marked `noindex` and cached as immutable, so crawlers only read.
  - Cloudflare Turnstile on Share is switched on if bots get through.
- Syncing between devices waits, and there are no accounts for now. If syncing is ever needed, it can work without accounts: the browser encrypts the characters before uploading them and keeps the key after `#`, so the server holds only ciphertext, as Excalidraw does for shared drawings. Steam login only becomes worthwhile for identity features such as public profiles (Open).

### D15. Every finding is confirmed in the game (Decided)

- Code reading yields hypotheses about game behavior. A finding changes the site only after the game confirms it, by the cheapest reliable method: a HotRepl runtime read for configured values, an experiment on the headless server of `ancient-kingdoms-sim` for behavior and odds, or an observation in the game for behavior only the client shows.
- Each change lists the facts it publishes and how each was confirmed.
- The planner's stat sheet is compared automatically with the sim's headless server for generated characters. Damage simulation stays out of the compendium.
- Findings about this repository, such as duplicated code or unread tables, are checked again when the change that acts on them starts.
- Suspected defects in the game itself go through the game-defect-reports skill.
- Behavior checks depend on the sim's next milestone, a scripted player with events and loot logging. Configured values can be read with HotRepl now.

### D16. How the work proceeds (Decided)

- Each contract lands together with its first real consumer, and that change deletes the copies it replaces. The retired combat engine shows the alternative: shared infrastructure that produced nothing publishable and cost work on every game update.
- What is expensive to change later is decided first: identity and join keys, relation semantics, the character shape, the link format and the meaning of unknown. Page layouts, planner views and tool interactions stay open.
- Plans change as understanding grows. A revision updates this design, or the follow-up change that owns the decision, in the same commit as the work that motivates it.
- Each change leaves the project in a better state than it found it.

### D17. Working files live in .local/ (Decided, done)

Research, captures, mood boards, scratch and save copies live in the gitignored `.local/` folder, laid out as `CONTRIBUTING.md` describes. Tracked files never link into it. Committed in `11d13b80`.

### D18. What transfers from Afallon Compendium (Decided)

Afallon informs this design but is not a template.

| Topic | Afallon | Here | Reason |
| --- | --- | --- | --- |
| Data delivery | Typed JSON documents, no browser database | One SQLite file for prerender and browser (D8) | No separate data bundles are needed |
| Effects | A separate effect kind | Buff skill pages plus mechanic lookups (D9) | The game, saves and appliers identify effects by skill |
| Save import | Plain JSON saves parsed in the browser | An encrypted SQLite save read in the browser (D12) | Ancient Kingdoms saves are SQLCipher databases |
| Party | Named adventurers from a fixed roster | Generated mercenaries with fixed skills (D11) | Mercenaries come from hire rolls |
| "Where to Get" order | Grouped by kind of trip, not by level | Grouped by kind of trip, ordered by level where known | Most places here have level ranges |
| Planner data | A separate planner payload | No payload. Evaluator facts stay in the database (D8) | The browser already has the database |

Adopted as they are: relation tables that plan their columns from their rows, unknown values never shown as zero, every chance naming its roll, several characters with isolated previews and serialized cross-tab writes, versioned compressed share links, and an export file whose import is previewed before it applies.

## Findings and current disposition

The foundational altar, primal-essence, item-level and chest corrections are implemented in the [game-rules archive](../archive/2026-10-17-unify-game-rules/design.md). The vocabulary cutover is implemented in the [stat-vocabulary archive](../archive/2026-10-17-unify-stat-vocabulary/design.md). The [prose cleanup](../archive/2026-10-17-clarify-compendium-prose/design.md) also implemented theoretical boss per-kill odds, zero-amount quest filtering and several special-source displays.

The [acquisition implementation checkpoint](../archive/2026-10-18-unify-acquisition-usage-requirements/design.md#implementation-checkpoint) records its source-bound evidence. Its native, analytic, pipeline, presentation and built publication gates are accepted, and the change is archived. Later milestones consume this boundary rather than repeat exporter repairs.

| Area | Acquisition ownership and later boundary |
| --- | --- |
| NPC casters | Ordered skill membership and distinct count/context consumers use the canonical relation. Full effect-applier migration remains later. |
| Fragment loot | Captured placement context and event overrides determine eligible sources. |
| Fatecharm conversion and services | Shared grouped methods and costs replace virtual definitions. Do not add duplicate result/quantity exports. |
| Boss loot | Existing mathematics consumes original pools, eligible placements and explicit assumptions. |
| Recipes and stations | Complete variants and exact world/home memberships supply current consumers, including selected-definition ingredient expansion. Independent profession presentation and new station reference routes remain later. |
| Vendor access | Canonical offers combine existing item thresholds, provider access and costs. Do not recreate raw sale-list readers. |
| Radiant Spark | Canonical inputs feed the existing skill-dependent rule. Do not restore a guaranteed raw source row. |

Suspected defects in the game itself, for the game-defect-reports skill:

- A mercenary's food slot accepts drinks, but the eating check looks only for the Food category, so a drink may be consumed on every check (`server-scripts/Pet.cs:2103-2109`).
- A mercenary skips a utility potion whose buff has no category whenever it already has any uncategorized buff, such as Rest (`server-scripts/Pet.cs:2125`).
- Reloading a mercenary adds its equipment's attributes without its augments' attributes and without checking durability (`server-scripts/Player.cs:10945-10963` against `server-scripts/MercenaryEquipment.cs:175-194`). Whether a later recalculation corrects this is unknown.
- Primal essence for an item bought with tokens is computed from its price in tokens, so 40 armor set pieces that vendors buy for 1,000 to 2,500 gold give 1 primal essence each (`server-scripts/UINpcTrading.cs:580` against `server-scripts/ScriptableItem.cs:398-405`). The game's own functions confirm the value of 1 in the running game.

## Export gaps

The [acquisition design's input section](../archive/2026-10-18-unify-acquisition-usage-requirements/design.md#7-export-only-missing-authoritative-inputs) records the implemented additions. It separates captured placement context, exact world/home membership, base item restrictions and referenced gate targets from fields that were already exported. Later changes consume these inputs rather than repeat their capture work.

Later changes retain their own input work:

- Character/stat-sheet work verifies remaining base-resource, movement and mercenary prefab inputs against the current export before adding fields.
- Effect-reference work owns the remaining hazard, reduced-effect and game-state application parameters.
- Save import owns the authored `idQuest` addition and the save-to-compendium mapping.
- Progression facts are already consumed by the Experience page. Keep the cited progression producer rather than restoring a page-local copy. Compare player and mercenary growth methods before merging them.

## In-flight changes

| Change | Decision |
| --- | --- |
| `simplify-pipeline-loader-registration` | Archived prerequisite. New relation datasets use its catalog. |
| `harden-export-sessions` | Archived prerequisite. Added fields use complete immutable sessions. |
| `prune-unread-database-data` | Retains the independent dead-column audit and progression data. Acquisition owns the semantic sitemap cutover and private one-time date reconciliation, without a shipped old-schema bridge. |
| `unify-acquisition-usage-requirements` | Archived D3/D4 cutover, with its built publication pair, production preview and live-site comparison accepted. |
| `consolidate-server-read-models` | Superseded and not independently executable. Transfer its remaining altar domain projections and route/import-boundary checks into the later D7 change before removing it. Acquisition does not complete that transfer. |
| `add-security-headers` | Allow WebAssembly through `'wasm-unsafe-eval'` in every policy that governs a context compiling it. A policy with `default-src` or `script-src` blocks WebAssembly without it, and a worker takes its policy from its own script response, not from the page |
| `consolidate-website-design-system` | Independent readability, contrast, tokens and primitive work precedes new pages. It does not block the approved existing-route acquisition correction and must consume the new boundary. |
| `complete-profession-page-system` | Consume acquisition's canonical yields, selected-definition ingredient expansion and exact world/home providers. Denominator repair is implemented. Acquisition's shared-consumer readability repairs do not accept this change's independent completeness, layout, metadata, navigation or no-JavaScript criteria. |

The other in-flight changes are independent of this plan.

## Order of work

Each step ships something visible and depends only on the steps it names:

1. Pipeline preparation is implemented and archived: loader registration and immutable export sessions.
2. Stat vocabulary and game rules are implemented and archived. The prose audit is also complete. Preserve their behavior in later cutovers.
3. [Acquisition, usage and requirements](../archive/2026-10-18-unify-acquisition-usage-requirements/proposal.md), the D3/D4 slice, is implemented and archived.
4. Shared read models (D7), after step 3. Visible: popups and pages agree.
5. Character model, store and share links (D6, D13, D14), after step 2. Visible: one active character in the header that every calculator uses.
6. Reference kinds: stats, effects with the mechanic definitions of D2, armor sets, races and crafting stations (D9), after steps 3 and 5.
7. Zones by level, after step 5.
8. Character planner with build, stat sheet and mercenaries (D10, D11, D15), after steps 5 and 6.
9. "Where to Get", after steps 4 and 8.
10. Save import with progress views and stash search (D12), after step 5.

## Risks / Trade-offs

- [Shared foundations that ship nothing] D16 ties each contract to its first consumer.
- [Behavior checks wait on the sim] Configured values are read with HotRepl meanwhile, and no change publishes a behavior claim before its check.
- [Browser storage eviction] D13 keeps backups in the user's hands.
- [Short link abuse and cost] D14 bounds the worst case with validation, a global cap and cleanup.
- [The save key is public in code] Accepted, because the game ships it. It stays out of documents and plain-text searches.
- [The save schema drifts with game updates] The update workflow check of D12 fails on drift.
- [Ids change between game patches] Stored characters and links keep unresolved entries visible (D13) until a mapping exists.

## Open Questions

- Are compendium ids stable across game patches? Exports are gitignored, so there is no history. Keep the previous export at each update and compare before links and stored characters depend on ids.
- How large is a full build with 10 geared mercenaries once encoded, and which builds fit a link?
- Does the game still count progress that a save stores under a name an update changed? A runtime check settles whether the import should match such entries.
- Do the player and mercenary class growth methods in `Player.cs` agree for every class?
- Can a Rogue with a two-handed main hand weapon equip an off-hand weapon (`server-scripts/EquipmentItem.cs:130-141`)? A runtime check settles it before the planner allows or blocks it.
- Which retention period and daily cap suit short links, once real usage is known?
- Should Safari users who rely on the planner be pointed at adding the site as a web app, which WebKit favors for persistent storage?
