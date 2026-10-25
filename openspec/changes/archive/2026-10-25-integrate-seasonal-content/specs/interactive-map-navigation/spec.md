## MODIFIED Requirements

### Requirement: Map popups retain location and objective details

Quest popups MUST display every required inventory item and identify discovery objectives by their place rather than their notification message. They MUST NOT list the zone-by-zone tracker marks that only guide the quest arrow. NPC popups MUST display known sub-zones. Resource drop rows MUST display exported yield ranges beside their chances. Monster, NPC and quest popups and marker tooltips MUST name the season of a seasonal entity and link to it.

#### Scenario: Delivery quest requires an additional item

- **WHEN** a quest has both gather items and secondary required items
- **THEN** its map popup displays both sets

#### Scenario: Halloween monster with a spawn window

- **WHEN** a visitor opens the popup of a Witch placement
- **THEN** the popup says the Witch appears only during Halloween
- **AND** it still states the 20:00 to 08:00 spawn window
