# item-usage Specification

## Purpose

Define reverse item uses that preserve the action, objective, scope and cost of the original relationship, so readers can distinguish what an item is for from what an action consumes.

## Requirements

### Requirement: Reverse uses read the same relationship

A reverse use SHALL come from the same authoritative input, objective or requirement relationship as its forward view. It SHALL retain method/provider context, quantity, purpose and conditions. Consumers SHALL NOT independently reconstruct a currency price or deduplicate distinct gated offers solely by product ID.

#### Scenario: A token buys one product from different offers

- **WHEN** offers for the same product have different providers or requirements
- **THEN** reverse token usage preserves those distinctions
- **AND** the forward purchase and reverse cost show the same amount and resource

#### Scenario: Fragment conversion

- **WHEN** matching fragments combine into a Fatecharm
- **THEN** result sources and fragment uses describe one transformation with its whole required quantity
- **AND** neither depends on a separate presentation-only special case

### Requirement: Consumption follows its phase and branch

Item use SHALL distinguish consumed, retained and modified inputs, their possession scope and the event at which consumption occurs. An eligibility reference SHALL NOT charge an input a second time. Alternative branches SHALL retain their own costs and success behavior.

#### Scenario: Portal key and chest key

- **WHEN** one key is a retained key-ring access condition and another is a consumed inventory input
- **THEN** their uses state those different roles
- **AND** they are not both described as inventory items consumed on interaction

#### Scenario: Lockpicking alternative

- **WHEN** chest opening permits a key or learned Lockpicking with lockpicks
- **THEN** the alternatives retain their separate requirements and consumption events
- **AND** a failed lockpick attempt is not described as a successful key opening

#### Scenario: Recipe failure

- **WHEN** the game consumes a recipe's materials before rolling success
- **THEN** its use and cost views retain that attempt cost
- **AND** they do not imply that failure preserves the ingredients

### Requirement: Quest uses retain objective meaning

Quest item relationships SHALL distinguish acquisition counters, inventory fulfillment, secondary possession alternatives, equipped objectives and successful-brew counters. Acceptance, fulfillment and completion consumption SHALL remain separate. Zero-amount requirements that require and consume nothing SHALL NOT become positive uses.

A detailed objective SHALL subsume its same-quest, same-phase generic condition in reverse uses, retaining the complete requirement expression.

#### Scenario: An objective also appears in the fulfillment condition

- **WHEN** an item has both a detailed quest objective and its corresponding fulfillment condition
- **THEN** the reverse view presents one objective with its complete quantities, alternatives and conjunctions
- **AND** completion consumption and requirements at other phases remain distinct

#### Scenario: An item must be gathered while the quest is active

- **WHEN** fulfillment reads an acquisition counter
- **THEN** the reverse use identifies that progress event
- **AND** previously owning the item is not presented as satisfying an unstarted counter

#### Scenario: A quest requires worn pieces together

- **WHEN** completion checks two equipped pieces
- **THEN** both pieces retain the equipped scope and conjunction
- **AND** inventory possession or choosing either piece is not substituted

#### Scenario: Brewing objective

- **WHEN** a quest counts successful brewing of a potion
- **THEN** the potion's reverse objective link is present
- **AND** it does not claim that buying or handing in the potion satisfies that counter

#### Scenario: A secondary amount is zero

- **WHEN** the authored amount requires and removes no item
- **THEN** no positive possession or consumption requirement is published for it

### Requirement: Grouped uses preserve the whole action

Merge components, service batches, recipe materials and activation inputs SHALL retain their common method and grouping. Initiating a method through any equivalent component SHALL NOT create independent recipes or imply that one component alone is sufficient.

#### Scenario: Three-component merge

- **WHEN** any of three components initiates the same all-components merge
- **THEN** each reverse link identifies that common method
- **AND** every forward view requires the complete group once

#### Scenario: Batch blessing

- **WHEN** the normal service converts all matching carried items
- **THEN** its use identifies the batch and corresponding resource cost
- **AND** a per-unit estimate is not presented as a selectable single-item operation

#### Scenario: One ingredient serves different professions

- **WHEN** an item is used in recipes from multiple professions
- **THEN** profession-specific groups contain only matching recipes
- **AND** a mixed-role entity group is not labeled using only its first role

### Requirement: Compatibility is distinct from possession and creation

Augment-related use SHALL follow actual category and target-instance rules. Armor-set bonus metadata SHALL NOT be presented as a socketable augment. A compatible target is not proof that the character owns an eligible instance, and extracting an existing augment SHALL be identified as recovery rather than new creation.

#### Scenario: Offensive augment supports accessory equipment

- **WHEN** the game permits an offensive augment on eligible non-weapon equipment
- **THEN** its compatibility description does not restrict it to weapons
- **AND** defensive affinity, ammunition exclusion and other applicable target rules remain distinct

#### Scenario: Armor-set metadata

- **WHEN** an augment-kind record represents an armor-set bonus rather than an ordinary augment
- **THEN** it retains its set relationship
- **AND** it is not counted or offered as a socketable augment

### Requirement: Optional location data does not erase a use

A valid use SHALL remain visible when optional destination geometry or presentation metadata is unavailable or withheld. It SHALL disclose no removed destination identity and SHALL NOT imply that every use is a physical source location.

#### Scenario: Portal destination is redacted

- **WHEN** a public portal retains a key requirement but its destination is withheld
- **THEN** the key's portal use remains inspectable
- **AND** the missing destination join neither hides the use nor reconstructs its name from an identifier

#### Scenario: Inventory transformation has no map point

- **WHEN** an item participates in a merge or fragment conversion without a placed provider
- **THEN** the reverse use remains present
- **AND** it does not manufacture a location action
