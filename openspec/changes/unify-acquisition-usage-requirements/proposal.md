## Why

Item sources, costs, uses and eligibility are still reconstructed differently by detail pages, source graphs and map popups. A shared representation is needed to correct the remaining gaps and support the agreed character model without giving each future feature another interpretation of the game.

## What Changes

- Represent acquisition as methods with grouped inputs, outputs, probability inputs, requirements and explicit provider memberships. Derive forward sources and reverse uses from the same facts.
- Preserve distinct recipes, offers, quest phases, tool conditions, inventory locations and consumption events. A component is not an alternative method, a quest progress counter is not an inventory cost, and a virtual distribution pool is not an awarded inventory item.
- Export exact recipe-to-station membership and any remaining authoritative fields the migrated consumers require. Normalize existing vendor gates, fragment conversions and skill requirement curves instead of requesting duplicate exports.
- Keep the existing boss, chest, altar and profession rule implementations. Migrate their inputs and callers without reimplementing the formulas or undoing the correctness fixes from the prose audit.
- Provide typed requirement descriptions and three-valued evaluation over explicitly known facts. Current pages remain usable without a character. Existing calculator inputs are not treated as a complete character or inventory.
- Migrate acquisition and usage readers, summaries, source geometry and existing relation displays together. Map item popups gain the pack and random-source coverage from the superseded standalone proposal, without promising a location for a virtual source.
- Normalize NPC skill membership and correct its existing caster-context consumers. The complete effect-applier catalogue remains part of the later effect-reference change.
- BREAKING: remove replaced published source/usage projections, raw relationship JSON consumers and obsolete helper APIs after every affected caller is migrated. No compatibility aliases or parallel source-calculation path remain.
- Remove IndexNow completely and retain ordinary sitemap crawling. Cut over semantic sitemap fingerprints and reconcile dates once outside production, with no shipped old-schema adapter, bridge CLI or notification replacement.

## Capabilities

### New Capabilities

- `item-acquisition`: complete, conditional acquisition methods, grouped outcomes and costs, truthful probabilities, provider locations and shared forward queries.
- `item-usage`: reverse uses derived from the same method inputs and objective relationships, preserving purpose, scope, quantity and consumption timing.
- `game-requirements`: typed condition composition, phase and subject scope, consistent descriptions, and honest evaluation with partial character, party or world knowledge.
- `map-item-popup-sources`: complete item-source inspection on the map, including physical providers, containers and virtual distribution sources.

### Modified Capabilities

- `compendium-redaction`: preserve eligibility semantics and valid alternatives when relational data is redacted, without leaking removed identities or turning a required cost into a free action.
- `skill-mechanics-card`: determine NPC caster contexts from explicit skill membership rather than an object-to-identifier comparison.
- `page-metadata`: remove the IndexNow requirement while retaining ordinary crawling and honest sitemap dates.
- `formula-presentation`: align formula detail and example defaults with the player-facing copy contract.

## Impact

The change spans DataExporter models and registered outputs, pipeline schema/loading/normalization/redaction, shared TypeScript rule inputs and query assembly, source/usage graph types, and the existing page and map consumers listed in the design's page-change matrix. It absorbs the standalone pack/random popup proposal and coordinates station membership with the profession-page change.

This is the acquisition and requirement slice of [the shared-model roadmap](../plan-shared-game-model/design.md), not the complete read-model refactor. It does not add the active-character store, planner, accounts, share endpoints, save import, new reference routes, routing changes or a general page redesign. Implementation waits for review of this proposal's page changes.
