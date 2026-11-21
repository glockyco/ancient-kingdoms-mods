# Spec Delta

## ADDED Requirements

### Requirement: Chambers entry preserves the seal consumption phase

The private entry relationship SHALL retain one Seal of Chaos consumed at first-chamber entry and share that phase with the guardian reward model. Published entry and reward explanations SHALL use the existing redacted-item placeholder, retaining consumption facts without revealing the excluded item. Later chambers and guardian looting SHALL NOT charge a second entry item.

#### Scenario: Reading the Chambers entry cost

- **WHEN** the reader opens the keeper or Chambers rules page
- **THEN** it states first-chamber consumption with "Redacted item" and no excluded name, icon, identifier or link
- **AND** no dedicated page or reverse-use page for the excluded item is published
- **AND** a refused entry before that phase does not imply the entry item was spent

### Requirement: Upgrade inputs expose the same grouped transformation

Catalyst and predecessor-augment reverse uses SHALL come from the canonical upgrade method. Each SHALL retain both consumed items, their amounts, the next-quality output and target-instance conditions. The catalyst SHALL list every valid transition without implying one catalyst upgrades a whole chain or equipped augment.

#### Scenario: Inspecting either upgrade input

- **WHEN** the reader opens Chaos Catalyst or an upgradable augment
- **THEN** its reverse use shows the same one-catalyst plus one-augment transformation as the output's source
- **AND** the result links to the exact exported next-quality augment

#### Scenario: Several steps to Legendary

- **WHEN** a reader expands several quality steps
- **THEN** each execution consumes its own catalyst and predecessor augment
- **AND** alternative target transitions are not summed into one mandatory batch

#### Scenario: No valid next-quality link

- **WHEN** an augment has no valid exported upgrade link
- **THEN** it has no upgrade reverse use
- **AND** compatibility with equipment does not manufacture an upgrade relationship
