## Context

Seasonal facts reach the compendium in three unrelated shapes: `monsters.is_halloween`, `npcs.is_christmas_npc`, and `acquisition_vendor_details.season` with a `'none'` sentinel. Only the vendor detail carries a season through the acquisition model, and as a detail field rather than a condition. Consumers interpret it independently. The map, map popups and NPC pages drop seasonal offers, the item list zone filter and meta descriptions ignore them, and the item page labels them. Drops of Pumpkin Head and Witch and the rewards of Santa Claus's quests carry no season at all. The season key domain is written in four places (`schema.sql`, `acquisition.py`, `assemble.ts`, `seasonal-events.ts`), and the Double XP buff skills are hard-coded on the website because the export omits `GameManager.HalloweenBuff` and `ChristmasBuff`.

The game gates seasonal content in five places: the date flags in `EnviromentSystem.CheckSpecialEvents`, the buff grant in `Player.Start`, `Monster.isHalloween`, `Npc.isChristmasNPC`, and `NpcTrading.VisibleSaleItemsFor`. Everything else seasonal is derived from these. Thirty items are obtainable only through seasonal content. No item mixes seasonal and year-round sources today.

The earlier exclusion policy lives in archived designs (`2026-10-17-clarify-compendium-prose/design.md:11,69` and `2026-10-18-unify-acquisition-usage-requirements/design.md:38,78,80,221`) and in the item-acquisition scenario "Conditional source on a restricted page". This change reverses that policy as the owner directed.

## Goals / Non-Goals

**Goals:**

- One canonical season fact per gated entity or offer, carried from the export to every consumer.
- One reader that answers "which seasons gate this method or item", used by pages, lists, popups, the map, search and metadata.
- Delete every per-consumer season filter rather than adding exceptions.

**Non-Goals:**

- A live "running now" indicator. A browser clock cannot prove a world gate (game-requirements, "World conditions are not saved progress").
- Hiding seasonal content by date.
- A separate seasonal marker group or sidebar toggle. Seasonal entities keep their classification group, like time-window and rare spawns.
- Modelling the 20:00 to 08:00 spawn window as a condition. It stays a monster field, as today.

## Decisions

### 1. Seasons are exported data with foreign keys

The exporter writes `season` on monsters (`"halloween"` when `isHalloween`) and NPCs (`"christmas"` when `isChristmasNPC`), or null. Game config replaces `seasonal_items` with `seasons: [{id, buff_skill_id, shop_item_ids}]` read from `GameManager`, and fails on a missing list or buff. The pipeline publishes a `seasons` table and makes `monsters.season`, `npcs.season` and `acquisition_vendor_details.season` nullable foreign keys to it. Null means year-round. The `'none'` sentinel and both booleans are removed.

Alternatives: deriving the columns in the pipeline from the existing booleans keeps a hand-maintained buff link, and the owner chose the export. A `'none'` sentinel avoids touching call sites but keeps a CHECK list as a second key domain. Null with a foreign key gives referential integrity and matches the website's existing `Season | null` shape.

Season dates are constants in `CheckSpecialEvents`, not exportable data. They stay in `website/src/lib/data/seasonal-events.ts` as UTC date windows beside the display name and anchor, cited to the game code, and the displayed dates are derived from the windows. A database test asserts that its keys equal the `seasons` table.

### 2. A season is a `season_active` world condition

The shared reader adds a typed predicate `{ kind: "season_active", season }` with subject `current_world`. It attaches where the game enforces the season:

| Fact | Requirement root |
| --- | --- |
| Seasonal vendor offer | method root, purchase phase |
| Placement of a seasonal monster | provider root, beside the summon-trigger roots in `assemble.ts` |
| Placement of a seasonal NPC | provider root |

Completion of a Winter Festival quest at Grimnir Stonehammer gets no season root, because the game does not gate completion. Its seasonal dependency comes through `quest_state active`, whose only route is acceptance from Santa.

Evaluation reads the supplied UTC time and the windows from decision 1, with the Winter Festival wrapping the year. A missing time is unknown. The description names the season and its dates.

Alternative: an `acquisition_methods.season` column. It is simpler SQL, but it copies provider facts onto methods, wrongly marks Grimnir's completion as seasonal, and creates a condition channel outside the typed requirement system that game-requirements requires.

### 3. One projection reads method and item seasons

`projectMethodSeasons(model, method)` returns the seasons that gate a method: season predicates in its own roots, provider roots when every provider carries the same season, and for `quest_complete` the seasons of the quest's acceptance methods. `projectItemSources` exposes the item's seasons. Every consumer reads these and nothing else: item sources, usages, summaries, obtainability, meta descriptions, map locations and popups, NPC pages, lists, search documents and the Seasonal Events page. `mapMethodIsVisible`, the NPC page filter and the raw SQL in `seasonal-events.server.ts` are deleted.

### 4. Item seasons are derived in the pipeline

An item is seasonal when every rooted acquisition depends on seasonal content, including through inputs. Winter Festival Coin is seasonal only because its pack is a Winter Festival quest reward. The website loads a single item's methods and cannot see transitive inputs. So the pipeline computes item seasons in the existing reachability fixed point beside `rooted` and `source_level_hint`, and publishes `item_seasons(item_id, season_id)`. A method inherits the seasons of a seasonal-only input item. An item's seasons are the union over its rooted award methods when every one of them is seasonal, and empty otherwise. The website loads the rows for requested items. A model test checks that the TypeScript projection agrees on direct cases.

Alternative: recursive loading in the website. It keeps one implementation but enlarges item-page graphs, and the item overview has a recorded load-time regression.

### 5. Presentation shares one season label

A `SeasonLabel` component renders the season's icon and name and links to its section. Detail pages put it in the header badge row and in source rows. Lists use it in the name cell and offer a Season facet. The map uses it in tooltips, popup callouts and source rows. The component owns each season's icon and tone, so Ghost for Halloween and Snowflake for the Winter Festival are not chosen per page. The season module stays free of components, because Node scripts import it through the acquisition model. The item source summary keeps a `seasonal` type for shop offers, labelled "Seasonal shop", and other rows carry their seasons.

### 6. The map presents seasonal content as row data

`MonsterMapEntity` and `NpcMapEntity` gain `season`. Popups add a seasonal callout before the spawn-window callout, matching the time-window, rare and summon callouts. Item popups gain a "Seasonal shop" list grouped by season with price and merchants, and an "Opened from" list for packs. Dropped-by and quest-reward rows carry season labels. Repair-merchant popups list seasonal stock per season, and their sale rows read item-currency prices, which also fixes the gold-only pricing that shows 0 for token-priced offers. No marker group or registry partition changes, which keeps this change independent of `complete-map-registry-ownership`.

### 7. Zone statistics exclude seasonal spawns

`zones/levels.py` excludes monsters with a season from `level_min`, `level_max` and `level_median`. Zone pages keep seasonal monsters and NPCs in their tables with a season label, and add a "Seasonal events" section beside "Regional events". The Lone-lands median returns from 21 to 19. Through `source_level_hint`, source levels and sitemap hashes may change. This is expected and is reviewed in the data diff.

### 8. The Seasonal Events page is rebuilt from player questions

Order: two season summary cards side by side (icon, dates, what changes), Double XP, Halloween, Winter Festival, Fireworks, Currencies. Layout rules:

- Use a table only when rows are compared across columns. The dates become summary cards. The Halloween hunt table lists zones by level with Pumpkin Head and Witch spawn counts, so shared facts (season, hours, drops) are stated once above it instead of repeated per row.
- Show items as tiles with icon, name, effect and price, in a responsive grid. Avoid wide two-column tables that leave the price far from its item.
- Show each shared fact once. Fireworks get one card for both seasons.
- Link a name only where the target adds something. Show prices as amount plus currency icon, not a repeated underlined link.
- Keep text at 14 px or more and use the `ui` table, card and badge primitives, following `consolidate-website-design-system`.
- Check light and dark mode at 1440×900 and 390×844 without horizontal scrolling for the summary, tiles and quest cards.

Copy follows the reader-facing-copy requirements in this change. Concretely, the page says "30 real minutes in every hour" for the 20:00 to 08:00 window, "about 5 kills per Spook Token", "Eating another treat ends the first", and "Festival Tokens work in both events". It says nothing about server checks or stock lists.

### 9. NPC pages show quests completed there

Grimnir Stonehammer completes A Wish for the Winter Heart, and the NPC page loader already returns `questsCompletedHere` without rendering it. Rendering it fixes the turn-ins hidden on 23 NPCs, and seasonal integration depends on it.

## Risks / Trade-offs

- [The export needs the game running] → Follow the export-game-data skill and promote the session atomically. The schema cutover lands in the same commit as the database rebuilt from that session.
- [Search ranking shifts when seasonal keywords are added] → Add judged cases for halloween, christmas, winter festival, santa, spook token and festival token, and keep the held-out pass count.
- [Map popup work overlaps `complete-map-registry-ownership`] → Seasonal data stays in rows and callouts. No registry fields or dispatch change.
- [Item list payload grows] → Seasons are one small field per item. The first-page rendering decisions for the item overview stay intact and are checked in the browser.
- [A Winter Festival quest accepted in season may be completable at Grimnir after it ends] → Copy does not claim either way unless verified at runtime with HotRepl.

## Migration Plan

1. Land exporter changes and run a fresh export of the current build.
2. Land the schema, pipeline and website cutover together, rebuilding `website/data/compendium.db` from the new session.
3. Review the data diff (zone medians, source level hints, sitemap hashes) before publishing.

Rollback is a revert of these commits. The previous export session remains available for promotion.
