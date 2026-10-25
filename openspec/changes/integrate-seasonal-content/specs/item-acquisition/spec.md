## ADDED Requirements

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

## MODIFIED Requirements

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
