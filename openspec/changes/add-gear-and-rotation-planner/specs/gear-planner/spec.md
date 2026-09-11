## Purpose

Defines what the planner page guarantees to a reader, including learned progression, what it renders
without JavaScript, and how it presents uncertainty. The planner is the only interactive compute-heavy
surface besides the map, so its delivery and state contracts are part of its behaviour.

## ADDED Requirements

### Requirement: Core facts render without JavaScript

The planner SHALL render its explanatory text, its default build, that build's learned-book
declaration and completeness state, that build's stat sheet, and that build's predicted result in
prerendered HTML.

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

That target deals no damage and does not move, so the default result depends only on the build and the
rotation. The default SHALL NOT require a survivability, threat, or healing assumption.

#### Scenario: A reader opens the planner

- **WHEN** the planner loads with no target selected
- **THEN** the level 55 training dummy is selected

#### Scenario: A reader selects a character level

- **WHEN** a level below 50 is selected
- **THEN** the target defaults to the training dummy nearest that level

### Requirement: The target is selectable and the result is per-target

A reader SHALL be able to select the target. The planner SHALL recompute on selection and SHALL label
which target a displayed result belongs to.

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

The planner SHALL encode the build, the character level and progression, the learned-book declaration
and completeness state, and the selected target in the page address, so a reader can share a result.

The encoding SHALL carry a version marker, so a stored link can be recognised as belonging to an
earlier model. It SHALL preserve learned-book identities without treating inventory ownership as
learned state, and SHALL refuse unknown or duplicate identities.

#### Scenario: A reader shares a link

- **WHEN** a reader copies the planner address after editing a build
- **THEN** opening that address restores the same build, level, and target

#### Scenario: A link predates a model change

- **WHEN** a link carries an earlier version marker
- **THEN** the planner states that the stored build was produced by an earlier model

### Requirement: Prediction accuracy, finite-run variance, and search gap remain separate

The planner SHALL show a prediction boundary beside a predicted figure only when current corpus and
independent validation evidence supports that boundary for the displayed build, mechanic, game-data,
and model domain. An unsupported or unverified domain SHALL have no numeric prediction boundary.

When a measured finite run is compared with a prediction, the planner SHALL show finite-run variance
under a declared sampling protocol separately from model error. Event count and duration alone SHALL
NOT establish variance; insufficient evidence SHALL remain unverified. For ranked candidates, the
planner SHALL report search-gap evidence as the distance from the returned result to a reference-search
result for the named benchmark domain. It SHALL preserve deterministic score order and SHALL NOT group
candidates or claim pairwise ranking equivalence from that gap. The planner SHALL keep model error,
finite-run variance, and search evidence separate and SHALL NOT merge them into one number. A practical
alternatives view MAY use a separately named product tolerance only with independent evidence.

The planner SHALL NOT present stat weights as its primary recommendation. If offered as advanced
detail, stat weights SHALL state that a local gradient can misrank complete builds.

#### Scenario: A supported prediction is displayed

- **WHEN** independent validation supports a prediction domain
- **THEN** the planner shows that domain and its prediction boundary beside the figure
- **AND** it does not extend the boundary to another domain

#### Scenario: An unverified domain is displayed

- **WHEN** the selected build or mechanic is outside the validated domain
- **THEN** the planner labels the prediction unverified
- **AND** it shows no numeric prediction boundary

#### Scenario: A measured result is compared

- **WHEN** a finite-run measurement and model prediction are compared
- **THEN** the planner shows finite-run variance and model error as separate quantities
- **AND** it identifies their respective derivations

#### Scenario: Ranked candidates are close

- **WHEN** candidate objective values fall inside the measured search-gap band for the same benchmark domain
- **THEN** the planner preserves their deterministic score order and reports the search evidence separately
- **AND** it does not group them or call them equivalent because of the search gap

#### Scenario: A practical alternatives tolerance is named

- **WHEN** product requirements define a named alternatives tolerance with independent evidence
- **THEN** the planner MAY label candidates within that tolerance as practical alternatives
- **AND** it keeps that tolerance separate from search-gap evidence and prediction accuracy

#### Scenario: A reader views stat weights

- **WHEN** stat weights are offered
- **THEN** they appear as advanced detail with their local-gradient limitation stated

### Requirement: The result explains itself

The planner SHALL show which parts of the build produce the result, including per-ability
contribution and buff uptime.

A recommendation SHALL state why an item was chosen, in terms of the stats and thresholds that caused it.

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


### Requirement: A reader can author a complete build

The planner SHALL provide controls for class, race, level, veteran progression, explicit learned-book
declarations, all equipment slots, attribute allocation, normal and veteran skill allocation, selected
consumables and their quantities, selected ammunition and its supply, active mercenaries, owned-gear
limits, target, and evaluation scenario.

The rotation SHALL remain automatic. A reader MAY include or exclude eligible skills but SHALL NOT
need to author an action-priority language. Hypothetical book declarations are editor inputs and SHALL
not authorize mutation of an imported capture or a live character.

#### Scenario: A reader creates a build without a capture

- **WHEN** the reader selects the build and scenario inputs
- **THEN** the planner evaluates that build and shows its complete state

#### Scenario: A reader selects consumables and ammunition

- **WHEN** the reader selects a consumable or ammunition supply
- **THEN** the resulting evaluation shows that identity and quantity in the build state
- **AND** a ranged horizon that exceeds the ammunition supply is refused

#### Scenario: A reader excludes a legal skill

- **WHEN** the reader excludes that skill
- **THEN** the automatic rotation is solved without it

### Requirement: Learned-book declarations are explicit and shareable

The planner SHALL display learned-book identities and completeness separately from inventory and
allocated points. It SHALL allow a reader to declare hypothetical `learnedBookIds` explicitly. It SHALL
preserve those declarations in links, imports, and shared build state, including a complete empty
state. Missing or unread state, unknown identities, duplicate identities, missing catalog definitions,
and unclassified book effects SHALL be reported and SHALL block dependent evaluation. An editor change
SHALL NOT mutate the original capture or a live character.

#### Scenario: A reader declares a hypothetical book

- **WHEN** the reader adds a known identity to the explicit hypothetical book declaration
- **THEN** the editor includes that identity in the evaluated build state
- **AND** it does not change an imported capture or a live character

#### Scenario: A reader shares a book declaration

- **WHEN** a reader shares a link containing explicit learned-book declarations
- **THEN** opening the link restores the same identities and completeness state
- **AND** the link does not require inventory ownership to represent learned progression

#### Scenario: A book declaration is incomplete or invalid

- **WHEN** learned-book state is missing, unread, unknown, duplicated, or unclassified
- **THEN** the planner refuses the dependent evaluation
- **AND** it names the failed identity, field, or classification

### Requirement: A reader can import a local character capture

The planner SHALL import versioned character-state JSON through a local file picker. Parsing, container
integrity checks, schema checks, game-build compatibility checks, and learned-book identity checks
SHALL occur locally. The planner SHALL NOT upload the file. A checked capture adapter SHALL keep producer
provenance separate from the planner evaluator and SHALL preserve completeness markers, including the
learned-book section. It SHALL preserve the imported `learnedBookIds` as capture data; hypothetical
editor declarations SHALL be a separate layer. A read-only guarantee SHALL require independently
recorded runtime qualification of the capture producer, not a self-declared capture flag.

A partial capture MAY populate read-only editor views. If learned state cannot be read without mutation,
the planner SHALL retain that section as unread and refuse only dependent normalization or evaluation.
Evaluation or owned-gear planning SHALL be blocked when a required logical-build section, learned-book
field, definition, or classification is missing, unread, or incompatible.

#### Scenario: A valid complete capture is selected

- **WHEN** the reader selects a compatible complete capture file
- **THEN** the editor is populated with its logical build, `learnedBookIds`, owned items, controlled entities, and producer provenance
- **AND** the evaluator records its own identity separately
- **AND** the capture's learned declarations remain distinct from hypothetical editor declarations

#### Scenario: A partial capture is selected

- **WHEN** the selected file has a valid schema but a required section, including learned-book state, is marked missing
- **THEN** the planner can show the captured sections and completeness state
- **AND** it blocks only evaluations that require the missing section
- **AND** it does not substitute an empty learned-book declaration

#### Scenario: An incompatible capture is selected

- **WHEN** the selected file has an unsupported schema, failed integrity check, or incompatible game-build policy
- **THEN** the planner preserves the current build
- **AND** the import error names the failed check or incompatible identity

#### Scenario: A capture has invalid learned-book identities

- **WHEN** an otherwise readable capture contains unknown or duplicate learned-book identities
- **THEN** diagnostic inspection remains available and dependent normalization and evaluation are refused
- **AND** the planner reports the identities without silently repairing the declaration

### Requirement: Current and candidate builds are comparable

The planner SHALL compare a manually authored or imported current build with a selected candidate only
when both use the same evaluator identity, model, game-data identity including the book catalog,
scenario version, and objective mode. It SHALL show the total difference and the slot, attribute, skill,
learned-book, consumable, ammunition, and controlled-entity changes that produce it. A comparison SHALL
preserve imported learned-book declarations and SHALL not mutate the source capture or live character.

Raw game mode and a named known-defect-normalized mode SHALL remain distinct. A normalized comparison
requires evidence for the named defect. A comparison SHALL NOT mix modes or silently normalize raw output.

#### Scenario: A reader selects an optimized build

- **WHEN** the selected candidate differs from the current build under the same evaluation tuple
- **THEN** the planner shows each change and its contribution before the reader applies it

#### Scenario: A candidate changes learned books

- **WHEN** the selected candidate declares a different learned-book set
- **THEN** the planner shows that progression change separately from allocated points
- **AND** it does not modify the imported capture or live character

#### Scenario: The scenarios or evaluator differ

- **WHEN** the current and candidate figures use different scenarios, evaluator identities, model versions, or game-data identities
- **THEN** the planner refuses the numerical comparison until one tuple is selected

#### Scenario: The objective modes differ

- **WHEN** one figure uses raw game mode and the other uses known-defect-normalized mode
- **THEN** the planner refuses the numerical comparison
- **AND** it does not hide the raw result

### Requirement: Recommendations use intended behaviour

A recommendation SHALL NOT gain a ranking advantage from a known game defect. Where a defect changes
the recommendation, the planner SHALL use an evidenced named normalization or withhold that
recommendation. Raw results unaffected by known defects MAY support recommendations. Raw diagnostic
output SHALL remain available without recommending defect exploitation.
A known-defect-normalized result MAY support a recommendation only when the defect is named and its
supporting evidence is recorded. The planner SHALL label the objective mode beside every recommendation
and diagnostic.

#### Scenario: A known defect changes raw ranking

- **WHEN** raw game mode ranks a defect-exploiting build above an intended-behaviour build
- **THEN** the planner may show that raw ordering as a diagnostic
- **AND** it does not recommend the defect-exploiting build

#### Scenario: A normalized recommendation is supported

- **WHEN** a named known defect has supporting evidence and normalized mode is selected for evaluation
- **THEN** the planner labels the normalized objective and may recommend its result
- **AND** it retains the raw result separately

#### Scenario: No defect evidence exists

- **WHEN** a normalized result has no named supporting defect evidence
- **THEN** the planner refuses to use it for recommendation
- **AND** it retains any raw diagnostic with that diagnostic's own verification status

### Requirement: Unsupported effects block a best-build claim

The planner SHALL NOT label a result best-in-slot when an admitted candidate, learned-book gain, or
equipped effect is unsupported by the model. It SHALL name every blocking effect and the affected build
or item. Missing required book definitions or effect classifications SHALL block publication and the
affected result rather than silently treating the gain as zero.

#### Scenario: An imported item has an unknown proc

- **WHEN** the model has no handler or exclusion rule for that proc
- **THEN** optimization is unavailable for that search domain
- **AND** the proc is shown as the reason

### Requirement: Planner performance is measured and gated

Before release, the planner SHALL record representative and worst-case search latency, peak worker
memory, first-progress latency, cancellation acknowledgement, maximum permalink length, and
main-thread responsiveness on a named browser and hardware profile. The release SHALL set and enforce
budgets from those measurements.

#### Scenario: A search exceeds a release budget

- **WHEN** the benchmark exceeds any recorded budget
- **THEN** the release check fails and names the metric

#### Scenario: A reader cancels a search

- **WHEN** cancellation is requested
- **THEN** the worker acknowledges cancellation within the recorded budget
- **AND** the last complete result remains displayed

### Requirement: Serialized, capture, evaluator, model, and data versions remain distinct

The planner SHALL distinguish serialized-schema, capture-schema, evaluator, model, and game-data
identities where applicable. A capture identifies its producer; the consuming evaluation supplies its
own evaluator identity. A shared link without a capture SHALL NOT require capture-only metadata. An unknown serialized or capture schema SHALL be refused. An evaluator or
model-version difference SHALL produce a warning or make results not comparable according to the
comparison policy. A game-data mismatch SHALL follow an explicit compatibility policy. Capture producer
identity SHALL remain distinct from evaluator identity.

#### Scenario: An old model link is opened

- **WHEN** its serialized schema remains supported but its model marker differs
- **THEN** the build and scenario are restored
- **AND** the planner warns that recomputation can change the result

#### Scenario: An unknown capture schema is imported

- **WHEN** the planner cannot interpret the capture schema
- **THEN** it refuses the state instead of dropping unknown fields
- **AND** it names the producer schema as unsupported

#### Scenario: An evaluator identity differs

- **WHEN** two displayed results use different evaluator identities
- **THEN** the planner marks them not comparable until one evaluator is selected
