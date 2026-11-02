## Context

See proposal.md for why. The requirements are in `specs/virtue-system/spec.md` and `specs/game-data-export/spec.md`.

The game holds the virtue rules in four forms, and each needs a different route into the compendium:

- Data the export can read: the rank thresholds (`VirtueRules.Thresholds`), the Humility multipliers (`VirtueRules.HumilityMultiplier`), the six Blessing skill assets with their `virtue` field and three-hour `buffTime`, the escort and return points (`VirtueEncounters.EscortPoints`, `ReturnPoints`), and the shrines in the World scene.
- Text tables: `VirtueText` holds names, titles, the effect text of each rank, the shrine name and the rank 0 label in four languages. `VirtueText.Get` follows the client's locale.
- Functions over a character or an offering: `VirtueRules.CombatPoints`, `IsEligibleMonster`, `SacrificeOfferingPoints` and `Player.AssignValorTarget`.
- Literals inside methods: the Compassion, Honor, Sacrifice, Valor and Honesty multipliers, the 5, 2, 150 and 75 points of Honor, Humility and Valor, the 15-second and 40 and 60 yd conditions, and the cooldowns. The game applies `Mathf.Max(1800f, EscortCooldownSeconds)` and `Mathf.Max(10800f, LostItemCooldownSeconds)`, so the configured fields (1,800 and 3,600 s) do not give the cooldowns players meet.

The export already captures authored placements once at World load in `ConfiguredWorldSnapshot`, and thin exporters such as `CraftingStationExporter` write them. Map-only entity families such as houses have a manifest entry, a table, a marker group and search documents, but no detail page. Character inputs that pages share are remembered under one key, such as `level`.

Another session works on Pocket Compendium in the same checkout and uses the game through HotRepl. Its feature folder holds the C# port of the skill-effect formatter.

## Goals / Non-Goals

**Goals:**

- Every virtue value a page states comes from the export or from one cited implementation in the website's rules module.
- A drift in a literal that the export cannot read fails a test instead of publishing a wrong number.
- Player-facing statements about virtue behaviour are checked in the running game before they ship.

**Non-Goals:**

- No escort position on the map: the game places the stranded adventurer at a random safe point in the dungeon.
- Lost belongings stay unpublished, as every item the game keeps out of the journal does.
- Pocket Compendium shows no virtue information.

## Decisions

### 1. A virtue exporter reads the game's tables, not the client's rendering

A new `VirtueExporter` writes `virtues.json`: per virtue its kind, English name, the game's one-line summary, Blessing skill id and per rank its points, title and effect text. It also writes the shared rank thresholds, the rank 0 label, the Humility multipliers by rank, and the escort and return points. Text comes from the English column of `VirtueText`'s table, so the client language cannot change it. Titles come from `VirtueRules.TitleEnglish`, which the game uses for English titles. A virtue without a Blessing skill or text fails the export, and so does a virtue that two Blessing skills grant.

Alternatives: a curated JSON file restates game values and drifts silently. Calling `VirtueText.Get` ties the values to the client locale. If the table is not reachable through the interop assembly, the exporter calls `Get` and the export's existing locale check guards the session, which the exporter documents.

### 2. Literals the export cannot read live once in the rules module, checked against the effect texts

`website/src/lib/calculation/virtues.ts` implements the per-rank multipliers, the combat points, Valor eligibility and the Sacrifice formula, each with its `Source:` citation. A database test compares the module's per-rank percentages with the numbers in the exported effect texts for every virtue and rank, so a patch that changes a literal and its tooltip fails the build. The pipeline does not reimplement any of them.

Alternative: parsing effect texts at runtime would publish whatever a typo in a tooltip says and still need the formulas for calculators.

### 3. Shrines are a captured placement family

`ConfiguredWorldSnapshot` captures every `VirtueShrine` in the World scene with its virtue, zone and position, and `VirtueShrineExporter` writes `virtue_shrines.json`. Identifiers use `PlacementId("shrine_{virtue}_{zone}", position)`. The shrine's name comes from the English `shrine.name` text, not from its name overlay, which the client fills in its own language.

The pipeline loads `virtues`, `virtue_ranks` and `virtue_shrines`. Shrine positions pass through the existing zone position suppression. The website registers a map-only `virtue_shrine` entity family like `house`, a `shrines` marker group in the interactables section, a popup and search documents.

### 4. The Compassion Escort is a named exclusion

`redactions.toml` names `compassion_escort` under `[entities.exclude]` with its reason. Nothing in its exported row distinguishes it from NPCs published without a placement, so no rule over the data could select it.

### 5. The Virtues page reads shared data and the rules module

`/mechanics/virtues` opens with one sentence and Getting started, four numbered steps that say what a new player does: choose a virtue, receive its blessing at a shrine, do its deeds and rise in rank. The six virtues follow as tiles with the game's blessing icons that work as tabs, with the chosen virtue below. A virtue shows a card per shrine with a map of its surroundings and a link to the live map, a card per way to earn points with numbered steps, notes and the points, a box of rules for the whole virtue where it has them, and a row of six rank cards with title, effect and points. Valor adds its quarries as portrait cards for a level the reader enters on the page, and Compassion lists each dungeon's stranded adventurer with level and Health. The Sacrifice calculator takes gold and up to three item levels. The hash names the virtue, so `#valor` opens the Valor tab, and `#shrines` and `#ranks-and-titles` lead to the steps Receive its blessing and Rise in rank. `coverage.ts` maps the eight Virtues guide articles to these anchors.

The shrine maps are 240 by 135 yd crops of the stitched world screenshot, written by the pipeline with the zone thumbnails' crop function, so they are north-up and blank redacted zones like the map tiles. Hand-laid tiles are stored flipped for the map renderer and drew upside down.

### 5a. Other pages show what a virtue gives there

A monster page shows "Honor" with its points among the combat stats, computed by the rules module from the spawn's level and Health with no level bonus, the label linking to the Honor section. An equipment page shows "Sacrifice Value" in points for items an offering takes. A dungeon page shows a Stranded Adventurer section with where the adventurer appears, their level and Health, and the escort rules. The level and Health follow `VirtueEscortStats.TryForDungeon`: the median level and the median Health ×1.5 of the dungeon's ordinary monsters, which the website computes from the database.

The shrine marker is the temple glyph in pink, a color no marker that is on by default uses, and the group is on by default. Its popup shows the zone and the blessing's strongest effect, and "View Details" opens the virtue's tab.

### 6. Blessing skill pages render the rank table

A Blessing skill page shows a "Granted by" card, like a season's Double XP buff: the shrine, the three hours online, and a table of rank, points, title and effect from the export, with a link to the virtue's section. It hides the skill rank and the link about learning ranks. `formatSkillEffect` gains one summary per Blessing in its fixed table, without numbers, because the numbers live in the rank table. The Pocket Compendium port gains the same entries, and the parity corpus is regenerated.

### 7. Pages name a blessing through one helper, and calculators offer it on their own page

A helper returns a virtue's name and section link, so every page names a blessing the same way. A calculation that a blessing changes offers that blessing and its rank as a choice under its "Use your numbers", closed until opened and kept on that page only, because inputs shared across pages were not wanted. The reputation calculations apply Honesty this way, and the healing and lifetap calculations apply Compassion. Heal on hit has no calculator, so it names Compassion in a sentence. Calculators that read Armor Class, resistances, maximum Health, Accuracy or Critical Resist take no virtue input, because the character window already shows those values with the blessing. Valor is named in text only, because calculators do not model the target and Valor applies only against elites and bosses.

### 8. Behaviour is observed before the copy ships

A scratch session through HotRepl checks each shrine against the export, activates each blessing, and reads the effect on the values the character window shows, the duration and the refusals. The observations are recorded in the change folder. Wording and layout go through comparisons in Plannotator before they ship.

## Risks / Trade-offs

- [The other session holds the game] → Check for a running instance before launching, use a separate `HOTREPL_PORT` when one runs, and keep to the scratch database.
- [The interop assembly may not expose `VirtueText`'s private table] → Fall back to `VirtueText.Get` under the export's locale check, as decision 1 states.
- [A literal changes without its tooltip] → The comparison test cannot see it. The citation check flags the changed region at the next update, as it does for every cited formula.
- [A shrine stands in Temple of Valaark] → Its position is suppressed like every position there, and its popup still names the virtue.
- [The Pocket Compendium port sits in another session's folder] → The change touches only the fixed effect table of the port and regenerates the corpus.

## Migration Plan

1. Export with the new exporters and build the database.
2. Land the page, map, skill page and modifier changes with their tests.
3. Commit the redaction ledger, regenerate the home counts and set `COMPENDIUM_VERSION` to 0.10.2.1.
4. Run the release checks and look at the site in a browser before a deploy, which waits for an explicit request.
