## Purpose

Recorded references from repository code to decompiled game source must stay true after the source is replaced. This capability covers how those references are verified, relocated, and re-anchored, and what a passing verification does and does not prove.

## ADDED Requirements

### Requirement: A finding states whether it blocks work

Verification SHALL report one status for each recorded reference, and the reported status SHALL determine whether the run fails.

A run SHALL fail when a reference no longer carries its recorded content, cannot be resolved, resolves to more than one region, or carries a claim that names code absent from the cited region.

A run SHALL succeed when every reference is unchanged, was found at a new position, or names a region the tool cannot judge.

The distinction is load bearing. The pre-commit gate reads the whole tree, so an operator who cannot tell an advisory finding from a blocking one treats mechanical relocation as a prerequisite for every later commit.

#### Scenario: Recorded content moved within the file

- **WHEN** a reference no longer matches its recorded position but its recorded content is found once elsewhere in the same file
- **THEN** the run reports the reference as moved and names the new position
- **AND** the run succeeds

#### Scenario: Recorded content is gone

- **WHEN** a reference no longer matches its recorded position and its recorded content is not found in the file
- **THEN** the run reports the reference as changed
- **AND** the run fails

#### Scenario: Recorded content is found more than once

- **WHEN** a reference no longer matches its recorded position and its recorded content is found in several regions
- **THEN** the run reports the reference as ambiguous
- **AND** the run fails

#### Scenario: A reference has no recorded anchor

- **WHEN** a reference is present in repository code and absent from the ledger
- **THEN** the run fails and names re-anchoring as the resolution

### Requirement: The ledger describes exactly one snapshot

The ledger SHALL record the game version of the snapshot its anchors were taken from. Every anchor in the ledger SHALL describe that one snapshot.

Re-anchoring SHALL apply to the whole ledger and SHALL require the game version of the current snapshot. Re-anchoring a subset is not supported, because a ledger that mixed two snapshots could not state which snapshot it describes.

#### Scenario: Re-anchoring records the snapshot version

- **WHEN** an operator re-anchors the ledger and supplies the game version of the current snapshot
- **THEN** the ledger records that version
- **AND** every anchor in the ledger describes the current snapshot

#### Scenario: Re-anchoring without a version

- **WHEN** an operator re-anchors the ledger and supplies no game version
- **THEN** the tool refuses and names the missing version

### Requirement: Re-anchoring refuses an anchor the tool knows is wrong

Re-anchoring SHALL refuse to run when a finding is positive evidence that the recorded anchor would name the wrong code, and SHALL name each such reference.

A reference found at another position is such a finding. Its locator still names the old position, so an anchor taken now records the region that has moved into that position.

A claim that names code absent from the cited region is such a finding. Either the anchor names the wrong region or the claim is stale, and an anchor taken now records the contradiction as verified.

A reference whose content merely differs is not such a finding. The new content may still carry the claim, so an operator who reviewed it SHALL be able to accept it.

The refusal exists because verification compares content. Once a wrong anchor is recorded, it reports as unchanged from then on and no later run can detect it.

#### Scenario: The recorded content sits at another position

- **WHEN** an operator re-anchors the ledger and a reference reports as moved
- **THEN** the tool refuses and names that reference
- **AND** the ledger is unchanged

#### Scenario: A claim names code the region lacks

- **WHEN** an operator re-anchors the ledger and a claim reports as unsupported
- **THEN** the tool refuses and names that reference
- **AND** the ledger is unchanged

#### Scenario: A reviewed change is accepted

- **WHEN** an operator re-anchors the ledger and a reference reports only as changed
- **THEN** the tool writes the ledger

#### Scenario: Nothing can be anchored for a reference

- **WHEN** a reference names a file or symbol that cannot be resolved
- **THEN** re-anchoring records no content for it
- **AND** a later verification reports it as changed rather than as verified

### Requirement: Claim support is a keyword test, not a proof

A recorded reference carries a claim in prose. Verification SHALL test whether that claim names code present in the cited region, and SHALL fail the run when the test finds the named code absent.

A passing test SHALL NOT be reported as proof that the claim describes the cited region. A claim that names no code the tool can extract cannot be disproved by this test.

#### Scenario: The claim names absent code

- **WHEN** a claim names an identifier or a value that the cited region does not contain
- **THEN** the run reports the claim as unsupported and fails

#### Scenario: The claim names no extractable code

- **WHEN** a claim contains no identifier or value the tool can extract
- **THEN** the run does not report the claim as unsupported
- **AND** the result carries no assertion that the claim describes the region

### Requirement: The recorded version identifies the snapshot, not the published data

The version in the ledger SHALL identify the decompiled snapshot the anchors describe. It SHALL NOT be required to equal the version of the data the website publishes.

The two versions differ for the length of an update. Evidence is re-anchored before the exported data is regenerated, and the published version is set last.

#### Scenario: An update is in progress

- **WHEN** the ledger records the new game version and the website still publishes data from the previous version
- **THEN** both values are correct
- **AND** no tool reports a defect for the difference
