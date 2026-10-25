# item-acquisition Specification

## Purpose

Define acquisition methods that preserve what an action yields, costs and requires, so item pages, provider pages and interactive tools describe the same game behavior without inventing sources or personal eligibility.

## Requirements

### Requirement: Methods preserve complete action identity

Each supported acquisition method SHALL retain its kind-qualified identity, providers, grouped inputs, outputs, requirements and repeatability. Distinct definitions SHALL remain distinguishable when their output item matches. Equivalent provider memberships SHALL NOT duplicate the method's cost facts.

#### Scenario: Different ways to create one item

- **WHEN** two configured methods yield the same item with different materials or conditions
- **THEN** both methods remain available to consumers
- **AND** neither the first method nor the union of both ingredient lists replaces those alternatives

#### Scenario: Several stations offer the same definition

- **WHEN** several stations explicitly offer an identical method
- **THEN** the method retains every provider membership
- **AND** its one ingredient group remains the authority for both acquisition and material-use displays

### Requirement: Outputs preserve bundles and delivery

A method's outputs SHALL retain quantities or yield rules, conditional reward slots and their delivery destination. Inventory awards, key-ring grants, equipped creation items and placed structures SHALL NOT be presented as interchangeable inventory items. Native balances SHALL NOT require fabricated item definitions.

#### Scenario: Conditional quest rewards

- **WHEN** completion grants a shared reward and a class-selected reward
- **THEN** the outputs retain that bundle and the class condition
- **AND** consumers do not describe the two slots as mutually exclusive whole methods

#### Scenario: A purchase expands a pack

- **WHEN** the game's purchase action delivers a pack's contents immediately
- **THEN** its source shows the actual contents and quantity
- **AND** the offered pack remains inspectable without inventing a later inventory-opening step

#### Scenario: Inspect an offered asset that is not awarded

- **WHEN** a pack is an offered or recipe-definition asset but that method directly awards its contents
- **THEN** inspecting the pack retains its method providers and contents
- **AND** lack of carried-pack output does not erase those inspection relationships or fabricate inventory delivery

#### Scenario: A structure is bought through housing

- **WHEN** the action places a structure rather than awarding an inventory item
- **THEN** its source states the placement delivery and applicable housing conditions
- **AND** it does not invent a fixed public house location

#### Scenario: Standing changes without an item reward

- **WHEN** opening a chest changes faction standing even when no gold is awarded
- **THEN** those phase-bound consequences remain part of its method explanation
- **AND** they are not dropped with the failed reward roll or converted into an invented minimum-balance requirement

### Requirement: Probability identifies its event and assumptions

A displayed chance SHALL identify the event, whether it measures at least one outcome or another stated quantity, and its baseline or scenario assumptions. Eligibility and probability SHALL remain distinct. Missing character or world facts SHALL NOT be replaced with zero-valued personal inputs.

#### Scenario: Boss loot generation

- **WHEN** a boss source shows a per-kill item chance
- **THEN** it measures the stated corpse-generation outcome through the original roll process
- **AND** it does not promise that a particular party member receives the item

#### Scenario: Conditional quest or Fatecharm calculation

- **WHEN** a calculation assumes an item is currently needed or a matching Fatecharm is consumed
- **THEN** those assumptions accompany the result
- **AND** the result is not presented as proof that an unspecified character meets them

#### Scenario: Gathering requires an attempt qualification

- **WHEN** a stored primary yield is conditional on a successful attempt
- **THEN** consumers distinguish the attempt qualification, success chance and conditional yield
- **AND** an authored probability of one is not mislabeled as a guaranteed reward on every click

### Requirement: Roll processes retain their enclosing rules

Probability inputs SHALL preserve order, multiplicity, weights, gates, duplicate limits, retries, outer success and exclusive slots that affect the result. Existing shared game-rule behavior SHALL remain authoritative. Consumers SHALL NOT flatten an enclosing process into independent marginal rolls or delete gated weight before calculation contrary to the game.

#### Scenario: Repeated portable-chest outcome

- **WHEN** two ordered rows can first award the same item within one capped opening
- **THEN** both inputs remain in the calculation
- **AND** the source display gives one correctly aggregated item-per-opening probability, rounded only after aggregation

#### Scenario: A virtual distribution is resolved by a parent roll

- **WHEN** a parent loot event resolves a uniform distribution pool
- **THEN** the item's result includes that parent event and entry multiplicity
- **AND** the pool alone is not presented as a carryable chest with an unrelated per-kill chance

### Requirement: Source locations follow eligible provider context

Locations SHALL come from explicit provider memberships and the placement or event conditions that govern the output. A monster template's eligible placement SHALL NOT make every placement eligible. Recipes SHALL use actual offering stations rather than a zone/type cross join.

#### Scenario: One template occurs inside and outside a fragment dungeon

- **WHEN** the same monster template has an eligible dungeon placement and an ineligible placement elsewhere
- **THEN** fragment sources and map geometry include only the qualifying context
- **AND** ordinary template loot remains distinct from the placement-conditioned fragment event

#### Scenario: A template is used in lootless and ordinary events

- **WHEN** one template appears both in an ordinary spawn and a lootless summon or altar wave
- **THEN** the ordinary method survives
- **AND** the lootless occurrence does not gain that method by template association

#### Scenario: Two stations share a broad type

- **WHEN** only one station explicitly offers a recipe
- **THEN** only that station is listed as its provider
- **AND** a referenced home workstation is not assigned a nearby scene station's location

### Requirement: Requested quantities respect execution units

A deterministic acquisition expansion SHALL use actual output quantity and whole execution batches. Costs and children SHALL scale with the selected method and requested amount. Probabilistic methods SHALL state per-attempt costs and chance rather than fabricate a guaranteed total.

#### Scenario: Output is a bundle

- **WHEN** 26 arrows are requested through a method that delivers 25 per execution
- **THEN** the expansion requires two executions and their corresponding costs
- **AND** it preserves the resulting surplus instead of treating one execution as one arrow

#### Scenario: Alternative recipe and failed attempts

- **WHEN** methods have different material groups or a success roll
- **THEN** each method keeps its own quantity and cost explanation
- **AND** materials for all alternatives are not summed into one guaranteed shopping requirement

#### Scenario: Inspecting a particular recipe

- **WHEN** a reader opens an existing recipe detail page
- **THEN** ingredient expansion starts with that recipe and its declared batch size
- **AND** another method of obtaining the result is not substituted for the recipe's ingredients
- **AND** a recipe whose result expands immediately retains its ingredient tree without claiming the unexpanded result is delivered to inventory

#### Scenario: Method is not freely repeatable

- **WHEN** the selected method has a once-only or state-dependent execution limit
- **THEN** quantity expansion preserves that limit
- **AND** a larger requested amount does not imply unlimited repeated rewards or current execution availability

### Requirement: Method existence and availability remain separate

Known definitions, possible methods and current personal availability SHALL remain distinguishable. A definition without a valid acquisition root SHALL remain inspectable without being advertised as obtainable. Source-free cycles SHALL NOT create availability. Approved page publication policies SHALL apply consistently to rows, counts and summaries. A season condition SHALL be presented with the method rather than excluded.

#### Scenario: Unused class chest

- **WHEN** a known chest has configured contents but no verified source
- **THEN** its contents remain inspectable
- **AND** those definitions alone do not advertise the chest as an available source

#### Scenario: Conditional source on a restricted page

- **WHEN** a canonical method carries a condition whose presentation is excluded by the approved page scope
- **THEN** the page preserves that policy consistently
- **AND** the data is not rewritten into an unconditional method or a claim of personal availability

#### Scenario: Seasonal source

- **WHEN** a canonical method is gated by a season
- **THEN** every page, popup, count and summary that lists the method includes it and names the season
- **AND** the method is not rewritten into an unconditional method or a claim that it is available now

### Requirement: Shared consumers retain the same method facts

Forward item sources, provider outputs, summaries, graphs and source-location reads SHALL use one authoritative method representation. Results SHALL retain all alternatives before presentation grouping or limits. A missing optional display relation SHALL NOT erase a valid method or use.

#### Scenario: Prerender and browser inspect the same source

- **WHEN** both inspect the same method under the same stated inputs
- **THEN** identity, requirements, quantities, probability meaning and eligible locations agree
- **AND** neither falls back to a separate raw relationship interpretation

#### Scenario: Graph has a shared child or cycle

- **WHEN** an ingredient occurs on several branches or an expansion encounters a cycle or limit
- **THEN** each relevant edge remains represented
- **AND** stopped expansion is explicit rather than being mistaken for no known source

#### Scenario: Common altar outcomes recur across score tiers

- **WHEN** the same boss and equivalent outcomes occur across a complete set of event score tiers
- **THEN** presentation may consolidate those outcomes while retaining every canonical variant and its exact conditions
- **AND** distinct tier rewards and cross-zone variants remain distinguishable

### Requirement: Acquisition inputs are complete and attributable

Configured methods SHALL be attributable to authoritative references or a cited code rule. Required missing data, conflicting definitions and unsupported populated relationship forms SHALL fail publication rather than be guessed. A snapshot of the exporting character's access SHALL NOT determine which configured offers exist.

#### Scenario: Exporting character lacks a vendor gate

- **WHEN** a configured offer requires standing or progression the exporting character lacks
- **THEN** the offer and its conditions remain part of the configured method data
- **AND** the export does not mistake a filtered UI list for the complete catalogue

#### Scenario: Configured placement geometry is not ready

- **WHEN** early scene capture cannot resolve a placement or portal endpoint against usable configured zone geometry
- **THEN** the capture fails rather than assigning the first or an arbitrary nearest zone
- **AND** repeated equality does not authorize publication of the invalid geography or its derived redactions

#### Scenario: Required membership cannot be resolved

- **WHEN** an offered recipe or provider reference required by the contract cannot be resolved
- **THEN** publication fails with the source context
- **AND** it does not substitute every station of the same type or silently drop the method

### Requirement: Seasons are canonical method conditions

A season SHALL be a world condition of the method or provider the game gates: a seasonal shop offer, each placement of a seasonal monster and each placement of a seasonal NPC. Every consumer SHALL read a method's and an item's seasons from the shared reader. An item SHALL be seasonal only when every rooted acquisition depends on seasonal content, including through packs and other items.

#### Scenario: A Halloween drop

- **WHEN** Spook Token is dropped by Pumpkin Head
- **THEN** the drop method is gated by Halloween through the monster's placements
- **AND** item pages, popups and summaries read that season from the shared reader

#### Scenario: A quest completed at a year-round NPC

- **WHEN** a Winter Festival quest is completed at Grimnir Stonehammer
- **THEN** its completion carries no season condition of its own
- **AND** its rewards are seasonal because acceptance requires the Winter Festival

#### Scenario: A currency obtained only through a seasonal pack

- **WHEN** Winter Festival Coin is obtained only by opening a pack that Winter Festival quests reward
- **THEN** the item is seasonal for the Winter Festival
