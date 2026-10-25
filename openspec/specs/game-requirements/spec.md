# game-requirements Specification

## Purpose

Define condition descriptions and evaluation that preserve the game's phases, alternatives and subjects while distinguishing known satisfaction, known failure and missing knowledge.

## Requirements

### Requirement: Conditions preserve composition and phase

Requirements SHALL use explicit typed predicates and authored conjunctions or alternatives. The shared reader SHALL assemble each tree from normalized typed domain facts after redaction, without a second persisted expression graph. Each root SHALL identify the phase it governs. Acceptance, fulfillment, learning, equipment use and performing an acquisition method SHALL NOT be collapsed into one undifferentiated eligibility flag. Empty conjunctions and alternatives SHALL fail validation.

#### Scenario: Any predecessor is sufficient

- **WHEN** a quest accepts any one of several completed predecessors
- **THEN** its requirement preserves that alternative
- **AND** the display and evaluation do not require completion of every predecessor

#### Scenario: Different quest phases

- **WHEN** acceptance uses progression gates and completion uses inventory or objective progress
- **THEN** each phase keeps its own requirements
- **AND** an acceptance condition does not replace fulfillment or consumption

#### Scenario: Completed one-time quest

- **WHEN** known quest history shows a one-time quest is completed
- **THEN** its acceptance requirement is unmet even when it is no longer active
- **AND** repeatable and adventurer quests retain their own cycle and current-offer conditions instead of that permanent lockout

### Requirement: Predicates retain their subject and units

A predicate SHALL identify the quantity, unit and subject the game reads. Player progression, wearer restrictions, selected item-instance state, permitted party facts and current world state SHALL remain distinct. Source-level ordering hints SHALL NOT become eligibility thresholds.

#### Scenario: Purchasing equipment for another class

- **WHEN** an item's equipment restriction differs from the purchase conditions
- **THEN** purchasing and equipping evaluate their respective subjects and phases
- **AND** the buyer is not blocked merely by a wearer restriction absent from the purchase rule

#### Scenario: Available and spent points

- **WHEN** skill learning checks available points, already-spent points and total veteran points
- **THEN** those quantities are evaluated separately
- **AND** base prerequisite ranks exclude equipment-granted ranks where the game does

#### Scenario: Profession tier is not character level

- **WHEN** a method requires a profession qualification
- **THEN** the predicate uses that profession's units and applicable rule
- **AND** it does not treat a recipe tier or source sort level as a player-level gate

#### Scenario: Quest tracking locations are not objective counters

- **WHEN** a find-NPC quest supplies map tracking locations
- **THEN** those locations remain available for navigation without requiring visits
- **AND** genuine discovery objectives retain their required progress

### Requirement: Evaluation has three-valued semantics

Evaluation SHALL return met, unmet or unknown with child outcomes sufficient to explain the result. A conjunction is unmet if any child is unmet and met only when all are met. An alternative is met if any child is met and unmet only when all are unmet. Other cases are unknown.

#### Scenario: Unknown alternative

- **WHEN** one alternative is unmet and another depends on an unknown fact
- **THEN** the combined result is unknown, not unmet

#### Scenario: Known failing conjunction

- **WHEN** a conjunction contains a known unmet condition and an unknown condition
- **THEN** the combined result is unmet
- **AND** the explanation retains the unknown child rather than fabricating its value

### Requirement: Partial collections do not prove absence

Knowledge SHALL preserve provenance and collection completeness. Known positive membership or a sufficient lower bound can prove a minimum requirement met. Missing membership or an insufficient partial count SHALL NOT prove failure unless the relevant scope is complete. Unknown facts SHALL NOT become zero, false or empty collections.

#### Scenario: Partial fragment inventory

- **WHEN** a method needs five fragments and a partial inventory establishes only three
- **THEN** possession remains unknown
- **AND** a complete inventory of three is unmet while a known lower bound of five is met

#### Scenario: Partial quest history

- **WHEN** a predecessor is absent from an incomplete imported history
- **THEN** that absence does not prove the quest was never completed

### Requirement: Possession and party scopes are explicit

Item predicates SHALL preserve inventory, equipment, key-ring and other required location scopes. Party alternatives SHALL preserve their online, distance and individual-access rules. An item known elsewhere in a stash SHALL NOT satisfy an inventory-only action.

#### Scenario: Banked component

- **WHEN** the only known component is in a bank and the method reads inventory
- **THEN** that banked component does not satisfy the inventory condition

#### Scenario: Party portal key

- **WHEN** one portal allows a permitted party member's key and another requires each entrant's own key
- **THEN** their predicates and explanations remain distinct
- **AND** nearby-loot distance rules are not automatically imposed on party-key sharing

#### Scenario: Base inventory restriction

- **WHEN** an effect requires an item in the base inventory slots
- **THEN** a known item in a backpack does not satisfy it
- **AND** a broad ownership list without sufficient location detail does not prove that restriction met

### Requirement: World conditions are not saved progress

Current-instance and time-dependent predicates SHALL use appropriately scoped world observations or explicit scenarios. Historical kills, an unrelated instance or missing current time SHALL NOT prove a live gate. The game's clock domain, endpoint inclusivity and wrapping windows SHALL be preserved.

#### Scenario: Historical boss kill

- **WHEN** a character has killed a boss before but the gate reads a referenced monster's current state
- **THEN** the historical record does not satisfy that gate

#### Scenario: Summon group has not rearmed

- **WHEN** a summon needs a fresh guard-alive then group-cleared transition after its death
- **THEN** a stored all-dead group or historical kill total alone is insufficient

#### Scenario: Daily quest offer is unknown

- **WHEN** eligibility also depends on the current daily offer order
- **THEN** an unordered quest catalogue or browser-local date does not invent the current offered quest

### Requirement: Definitions and evaluator capabilities are validated

Published condition kinds and parameters SHALL have complete supported meanings. Required missing definitions, unknown kinds and invalid compositions SHALL fail validation, not become an empty true requirement. A withheld condition is explicit policy-limited knowledge, not an unsupported-rule fallback.

#### Scenario: Unsupported condition kind

- **WHEN** input contains a populated requirement kind with no implementation
- **THEN** publication fails with its source context
- **AND** the condition is neither omitted nor reported as met or ordinary missing character knowledge

#### Scenario: Empty restriction and missing export

- **WHEN** an authored empty class restriction means unrestricted
- **THEN** it is represented as no such restriction
- **AND** an absent required export field or redaction-emptied alternative is not silently given that meaning

### Requirement: Current consumers do not invent a character

Requirements SHALL remain readable without a character. Evaluation SHALL consume only explicit facts supplied by a current consumer or the agreed character projection. Static baseline calculations SHALL name their assumptions and SHALL NOT imply personal inventory, faction, quest, party or world knowledge.

#### Scenario: Static source page

- **WHEN** no active character is supplied
- **THEN** the page shows factual conditions and any stated probability baseline
- **AND** it does not show an unmet badge or a reachable-source filter based on a fabricated empty character

#### Scenario: Existing profession inputs

- **WHEN** a calculator supplies its selected tool and skill values
- **THEN** the corresponding qualification uses the shared predicate and existing raw success rule
- **AND** that result does not assert that all inventory, world and action conditions are satisfied

### Requirement: Descriptions retain decision-relevant mechanics

A requirement explanation SHALL preserve the quantities, scopes, alternatives and timing needed to understand the action. It SHALL distinguish eligibility from random success and actual costs. It SHALL NOT substitute implementation vocabulary or generic statements for useful local conditions.

#### Scenario: Attemptable action can fail

- **WHEN** a method's modeled requirements are met but success is probabilistic
- **THEN** the qualification and success chance are presented separately
- **AND** met requirements are not described as guaranteed output

#### Scenario: Recipe knowledge differs by profession

- **WHEN** an Alchemy recipe requires learning before it can be attempted
- **THEN** the method retains that knowledge condition
- **AND** Crafting, Cooking and Scribing do not inherit it
- **AND** Scribing qualification and random success use Alchemy's raw success rule, not a Scroll Mastery threshold
- **AND** a zero-tier recipe whose raw success is already certain does not acquire an unknown profession-skill gate

### Requirement: Season conditions follow the game's date windows

A season condition SHALL hold when the supplied current UTC date lies inside the season's window, both endpoints included, and a window that crosses the year boundary SHALL wrap. Without a supplied current time the condition SHALL be unknown. A static page SHALL describe the window rather than evaluate it.

#### Scenario: New year during the Winter Festival

- **WHEN** the supplied current time is January 3 UTC
- **THEN** the Winter Festival condition holds

#### Scenario: Static item page

- **WHEN** a prerendered page shows a seasonal source without a supplied current time
- **THEN** it names the season and its dates
- **AND** it does not state that the source is available or unavailable now
