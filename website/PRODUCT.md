# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players of Ancient Kingdoms, a single-player-friendly IL2CPP Unity RPG. Two situations, one audience:

- **Learning reader** — reading between sessions to understand a system and decide what to invest in. This reader is the tiebreaker: when the two situations conflict, lead with the mechanic and the loop, and put exhaustive data below the fold.
- **Lookup reader** — alt-tabbed out of a running game, hunting one number, location, or link. Never make a specific fact harder to find in service of the narrative.

Both are served by the same page. Neither is a separate surface.

## Product Purpose

A fan-made compendium for Ancient Kingdoms: wiki, interactive world map, and game database. It publishes what the game actually contains, derived mechanically from the game itself rather than hand-maintained, so that players can answer questions the game does not answer in-client.

Success is a player finding a true, current, specific answer — and understanding the system it belongs to.

## Positioning

Content is machine-derived end to end: MelonLoader export mods read the live IL2CPP runtime, a Python pipeline turns that into SQLite, and the site renders from that database. Values are extracted, not transcribed. Mechanics that cannot be exported are read out of decompiled server scripts and cited to a specific file and line, and those citations are machine-checked against a lockfile so a game patch surfaces drift instead of silently rotting.

A hand-edited wiki cannot truthfully claim this, and it is why the site can be exhaustive without being wrong.

## Operating Context

- Pipeline: `Game (IL2CPP Unity) → MelonLoader export mods → exported-data/*.json → Python build-pipeline → website/static/compendium.db → SvelteKit site`.
- The site is mostly prerendered against the SQLite database at build time and deployed to Cloudflare Static Assets; the home page alone renders dynamically in a Worker for the live game version.
- The map downloads the full ~16 MB database into the browser via sql.js-fts5. Detail pages do not, and must not start.
- Each game patch triggers a re-export, a pipeline rebuild, and a re-verification of every source-cited mechanic against a new `server-scripts/` snapshot. Archived snapshots per version are kept for diffing.
- A Steam guide and a Ko-fi page exist alongside the site. They are separate channels, not owners of compendium content.

## Capabilities and Constraints

- **The compendium owns both data and mechanics explanation.** Profession and mechanics pages explain the loop, the progression, and why a system matters, in the site's own voice. Explanatory prose is in scope, not deferred to the Steam guide.
- **Every visible claim must be grounded.** Facts come from exported data, from the database, or from a cited server-script region. Content that cannot be sourced is omitted and named as unknown rather than invented or smoothed over.
- **Provenance is invisible to readers.** Derived mechanics are stated as plain fact; the `<!-- Source: File.cs:123-145 — … -->` citation stays in the HTML source. No reader-facing "datamined" badge.
- **Source-code vocabulary never reaches the page.** Internal flag names, file names, and code identifiers belong in comments and TypeScript, never in visible copy. Mechanics are described in plain English.
- **Fail fast over graceful degradation.** Missing or invalid data throws during the build rather than rendering a silent fallback.
- Stack: SvelteKit 2, Svelte 5 runes, TypeScript strict, Tailwind 4, bits-ui components, deck.gl for the map, better-sqlite3 at prerender time.
- Content families already live: items, monsters, NPCs, zones, quests, altars, classes, skills, mercenaries, summons, professions, gathering resources, crafting recipes, chests, traps, factions, treasure locations, and the interactive map.
- Deep-linking contract: `/map?entity=<id>&etype=<type>` fits the map view to that entity, so any entity with position data can be linked from anywhere.

## Brand Commitments

- Name: Ancient Kingdoms Compendium, at `ancient-kingdoms.compendiums.org`. Part of a `compendiums.org` family of sites.
- Voice: factual, specific, unembellished. No marketing register, no hype, no filler that restates what a reader can already see.
- Fan-made and unofficial. It does not present itself as an official source.

## Evidence on Hand

- `website/static/compendium.db` — 58 content tables, generated, gitignored.
- `exported-data/*.json` — raw per-entity exports including `professions.json`, `static_data.json`, `game_config.json`.
- `server-scripts/` — 379 decompiled C# files for the current version, plus ~40 archived per-version snapshots for diffing. Gitignored.
- `citations.lock.json` and `pnpm check:citations` — machine-verified provenance for every hardcoded mechanic.
- `website/static/images/` and the `visual_assets` table — exported game art. Substantially under-used by the UI today.
- `website/static/tiles/` — a generated map-tile pyramid.
- No user analytics, no telemetry, no testimonials, no usage numbers. Future work must not fabricate any.

## Product Principles

1. **Derived, not transcribed.** Prefer exported data over a hand-written value every time one exists. A hardcoded value must carry a machine-checked citation.
2. **Explain the system, then exhaust the data.** The reader who wants to understand comes first; the reader who wants one row must still find it fast.
3. **Absence is a finding.** Say a mechanic does not exist, or that a value is unknown. Never pad a page toward apparent completeness.
4. **Surface what already exists before extracting more.** The pipeline already carries data the site does not render; that gap is the cheapest available improvement.
5. **Patch-durable by construction.** Anything a game update can invalidate must be either regenerated automatically or cited so drift is detected.

## Accessibility & Inclusion

The site must remain functional without JavaScript. Detail pages prerender every row into HTML; overview pages prerender a paginated subset. Interactive enhancements are additive and marked `js-only`, and `<noscript>` CSS hides loading affordances. Any new profession-page pattern must render its facts in static HTML, with interactivity as an enhancement only.
