# Spec Delta

## Purpose

Describe Chambers of Chaos runs, their entry, trials, scaling and rewards without confusing generated encounters with authored world content.

## ADDED Requirements

### Requirement: Chambers coverage precedes the game-version publication

The compendium SHALL publish a Chambers of Chaos rules page and the zone 26 page before advertising coverage of game 0.10.4.0. Mechanics navigation, site search and zone lists SHALL discover them by the game's zone name.

#### Scenario: Publishing the updated compendium

- **WHEN** the site publishes coverage of 0.10.4.0
- **THEN** the rules page and `/zones/chambers_of_chaos` exist and are discoverable
- **AND** each page links to the other

### Requirement: Entry rules explain eligibility and consumption

The rules page SHALL cover level 40 entry through Mordrath, solo and out-of-combat requirements, one entry item consumed on entering the first chamber, suspended mercenaries, permitted pets and the return point. Excluded items SHALL use existing redacted placeholders without names, icons or links. The keeper's page SHALL explain its service and link to these rules.

#### Scenario: Preparing a first run

- **WHEN** a player reads the entry section
- **THEN** it identifies the keeper and entry requirements, with "Redacted item" for the excluded entry item and no link or icon identifying it
- **AND** it distinguishes companions that enter from mercenaries restored after the run

#### Scenario: Entry is refused before the first chamber

- **WHEN** the entry checks fail before the seal is removed
- **THEN** the explanation does not claim the entry item was spent and does not disclose its excluded identity

### Requirement: Trial coverage distinguishes objectives from solutions

The rules page SHALL explain the three-chamber sequence, the first two trials' random selection, the final Guardian, the shared 20-minute timer and each trial's completion condition. It SHALL cover Battle's hunt variant, Waves' conversion and delays, clue carriers, wrong-answer penalties, Runes' reread point and Manuscript's one-time clue without disclosing gated puzzle content.

#### Scenario: A combat chamber has too many enemies to clear

- **WHEN** the Battle or Guardian population exceeds the clear-target limit
- **THEN** the explanation distinguishes the selected monster hunt from killing the whole population

#### Scenario: Planning around trial variation

- **WHEN** a player reads the trial sequence
- **THEN** it permits repeated kinds in the first two chambers and identifies the final Guardian as fixed
- **AND** it explains the population-dependent Waves-to-Battle conversion

#### Scenario: Encountering a puzzle trial with publication closed

- **WHEN** a player opens a Riddle, Runes or Manuscript explanation
- **THEN** the objective, clue interaction and penalty are explained
- **AND** no question, answer choice, story or solution sequence is supplied

### Requirement: Run outcomes explain losses and exceptional rewards

The rules page SHALL cover timeout, death, Hardcore death, disconnect, logout and exit, including entry-item loss, no corpse and return to the entrance point. It SHALL distinguish owner-only tower kill experience and completion experience from ordinary kill credit, gold and loot. Guardian rewards SHALL use the existing redacted-item placeholder, and the page SHALL explain that guardian loot must be collected before the exit works.

#### Scenario: A run fails after entry

- **WHEN** the player dies, times out or disconnects during a paid run
- **THEN** the page explains the applicable return and loss rules without promising an entry-item refund or naming the excluded item
- **AND** Hardcore death is not described as an ordinary respawn

#### Scenario: Finishing the Guardian trial

- **WHEN** the player reads the reward and exit explanation
- **THEN** it distinguishes the redacted guardian-corpse reward from directly awarded completion experience without disclosing the excluded reward's identity
- **AND** it says to take the guardian's loot before using the exit

### Requirement: Scaling views retain the character snapshot and enemy variation

Scaling visualizations SHALL use entry level, total veteran points, chamber and ordinary-versus-guardian context. They SHALL show weighted enemy-level variation, rounded Health and Power, and reward quantity bands without presenting one random result as a guarantee. Excluded rewards SHALL use redacted placeholders. Health targets and Power SHALL NOT be mislabeled as observed final health or damage taken.

#### Scenario: Comparing veteran progression

- **WHEN** the reader changes total veteran points from 0 to 100 at the same entry level
- **THEN** enemy level range, Health, Power and the applicable redacted-reward quantity band update from the same rule data
- **AND** the guardian's range remains distinct from ordinary enemies

#### Scenario: The character levels during a run

- **WHEN** the page explains completion experience
- **THEN** it uses level at the guardian's death rather than claiming that every reward uses entry level

### Requirement: The zone page represents a procedural place

The Chambers zone page SHALL show real run artwork, entry through the keeper, entry cost, guardian reward, configured monster pool and encounter groups. Excluded entry and reward items SHALL use existing redacted placeholders. The page SHALL link to detailed rules without fabricating world bounds, authored spawns, a world-map destination or fixed enemy counts. The keeper's actual world placement SHALL remain independently usable.

#### Scenario: Opening a zone without world geometry

- **WHEN** the Chambers zone page is rendered
- **THEN** its overview remains useful without an embedded world map or empty authored-spawn table
- **AND** its keeper link uses the keeper's exported location, not a guessed floor or tower coordinate

### Requirement: Pool membership does not replace world monster facts

Every configured pool monster SHALL note that it also appears in the Chambers and link to tower scaling. Existing world stats, drops and authored placements SHALL remain world-context facts. Tower membership SHALL NOT make those drops or placements apply to a Chambers run.

#### Scenario: Inspecting one of the nine pool monsters

- **WHEN** the reader opens Skeleton, Orc Scout, Teleri Scholar, Fire Spirit, Construct, Ghost, Slime, Skeleton Archer or Orc Fighter
- **THEN** its page includes its Chambers membership and a scaling link
- **AND** its normal stats and loot are not relabeled as tower values

### Requirement: Player-facing rules are verified in the running game

Published behavior claims SHALL be checked in a recorded run of the covered game build before the Chambers pages ship. Export and calculation checks SHALL complement, not replace, entry, trial, reward, failure and exit observations.

#### Scenario: Source research is complete but no run was observed

- **WHEN** only decompiled code or asset research supports the proposed behavior text
- **THEN** the change is not treated as ready for publication
- **AND** the missing runtime observations remain a release gate

### Requirement: Existing rules and skill text retain Chambers exceptions

Related death, experience, party and skill explanations SHALL describe Chambers exceptions consistently and link to the Chambers rules in their page context. This includes remains and respawn, binding and Gate Scroll, Veteran Awareness minimap marks, party invitations and kill experience. Shared effect text SHALL retain parity between website and Pocket Compendium.

#### Scenario: Reading general death or binding rules

- **WHEN** a reader opens death rules or a binding skill's explanation
- **THEN** it distinguishes the Chambers return-to-entry rule and absence of remains from normal bind-point respawn
- **AND** it does not imply Gate Scroll bypasses the tower travel restriction

#### Scenario: Reading Veteran Awareness

- **WHEN** its effect text is shown on the website or in Pocket Compendium
- **THEN** it includes the Chambers as well as Temple of Valaark among the minimap-mark exceptions

#### Scenario: Reading party and experience rules

- **WHEN** a reader opens the related general rules
- **THEN** invitations and acceptance involving a Chambers player are described as refused
- **AND** tower kill experience is triple dungeon-balanced experience with Double XP but without normal event or regional bonuses
