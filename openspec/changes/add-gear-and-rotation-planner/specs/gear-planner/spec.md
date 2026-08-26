## Purpose

Defines what the planner page guarantees to a reader, including what it renders without JavaScript
and how it presents uncertainty. The planner is the only interactive compute-heavy surface besides the
map, so its delivery and state contracts are part of its behaviour.

## ADDED Requirements

### Requirement: Core facts render without JavaScript

The planner SHALL render its explanatory text, its default build, that build's stat sheet, and that
build's predicted result in prerendered HTML.

Item selection, optimization, and comparison are additive enhancements. They SHALL NOT be the only
path to a core fact.

#### Scenario: A reader has JavaScript disabled

- **WHEN** the planner page loads without JavaScript
- **THEN** the default build, its stats, its target, and its predicted result are readable
- **AND** loading affordances for interactive controls are hidden

#### Scenario: An enhancement is added

- **WHEN** a new interactive control is added
- **THEN** the facts it exposes remain available in the prerendered output

### Requirement: The default target is the endgame training dummy

The planner SHALL default to the level 55 training dummy in Northern Wastes.

That target deals no damage and does not move, so the default result depends only on the build and
the rotation. The default SHALL NOT require a survivability, threat, or healing assumption.

#### Scenario: A reader opens the planner

- **WHEN** the planner loads with no target selected
- **THEN** the level 55 training dummy is selected

#### Scenario: A reader selects a character level

- **WHEN** a level below 50 is selected
- **THEN** the target defaults to the training dummy nearest that level

### Requirement: The target is selectable and the result is per-target

A reader SHALL be able to select the target. The planner SHALL recompute on selection and SHALL
label which target a displayed result belongs to.

The planner SHALL NOT present a result as applying to all targets, because the best build differs by
target.

#### Scenario: A reader changes target

- **WHEN** the selected target changes
- **THEN** the displayed result and the recommended build are recomputed
- **AND** the result is labelled with the new target

#### Scenario: A recommendation changes with target

- **WHEN** a stat is capped against one target and not against another
- **THEN** the recommendation differs between them
- **AND** the planner explains which cap caused the difference

### Requirement: A target that cannot exercise a modelled mechanic says so

Where the selected target cannot exercise a mechanic the build relies on, the planner SHALL say so
alongside the figure.

A target that deals no damage cannot trigger anything that a build gains from being attacked. A target
whose mitigation sits far below the point where it saturates gains little from a debuff that removes
mitigation, while a tougher target gains much more. In both cases the figure is correct for that target
and understates the build elsewhere, so the reader is told rather than left to discover it.

#### Scenario: The build depends on being attacked

- **WHEN** a build gains from incoming damage and the selected target deals none
- **THEN** the planner states that the figure omits that gain

#### Scenario: The build maintains a debuff against a soft target

- **WHEN** a build maintains a mitigation debuff and the selected target is far below the mitigation
  ceiling
- **THEN** the planner states that the debuff is worth more against a tougher target

#### Scenario: The target exercises everything the build uses

- **WHEN** the selected target can exercise every mechanic the build relies on
- **THEN** no such statement is shown

### Requirement: A build is shareable by link

The planner SHALL encode the build, the character level and progression, and the selected target in
the page address, so a reader can share a result.

The encoding SHALL carry a version marker, so a stored link can be recognised as belonging to an
earlier model.

#### Scenario: A reader shares a link

- **WHEN** a reader copies the planner address after editing a build
- **THEN** opening that address restores the same build, level, and target

#### Scenario: A link predates a model change

- **WHEN** a link carries an earlier version marker
- **THEN** the planner states that the stored build was produced by an earlier model

### Requirement: Uncertainty is presented, not hidden

The planner SHALL show the error boundary alongside a predicted figure, and SHALL group results that
fall within it.

The planner SHALL NOT present stat weights as its primary recommendation, because a single local
gradient misranks builds.

#### Scenario: A ranked list is displayed

- **WHEN** the planner shows more than one candidate build
- **THEN** candidates within the error boundary are grouped as equivalent

#### Scenario: A reader wants stat weights

- **WHEN** stat weights are offered at all
- **THEN** they appear as advanced detail with their limitation stated

### Requirement: The result explains itself

The planner SHALL show which parts of the build produce the result, including per-ability
contribution and buff uptime.

A recommendation SHALL state why an item was chosen, in terms of the stats and thresholds that
caused it.

#### Scenario: A reader inspects a result

- **WHEN** a reader opens the breakdown for a predicted figure
- **THEN** per-ability contribution and buff uptime are shown

#### Scenario: An unmodelled effect exists on an item

- **WHEN** an equipped item carries an effect the model does not evaluate
- **THEN** the planner marks that effect as unmodelled rather than omitting it silently

### Requirement: Compute does not block the interface

Search and evaluation SHALL run off the main thread. The planner SHALL report progress for a search
that does not complete immediately, and SHALL allow it to be cancelled.

#### Scenario: A search runs

- **WHEN** an optimization is requested
- **THEN** the interface remains responsive
- **AND** progress is visible

#### Scenario: A reader cancels

- **WHEN** a reader cancels a running search
- **THEN** the search stops and the previous result remains displayed
