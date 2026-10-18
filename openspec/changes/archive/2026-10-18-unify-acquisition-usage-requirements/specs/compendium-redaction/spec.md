## ADDED Requirements

### Requirement: Redaction does not weaken action requirements

Removing a referenced cost, component or condition SHALL NOT make a retained action free, unconditional or easier. Valid alternatives SHALL survive independently. A retained public entity with withheld eligibility information SHALL preserve a nonidentifying unknown condition rather than a dangling reference or an empty true requirement.

#### Scenario: Required component is removed

- **WHEN** a method requires several components together and one component is redacted
- **THEN** the remaining components do not become a complete cheaper method
- **AND** no removed component identity or generated name survives

#### Scenario: One alternative survives

- **WHEN** an action has independent alternatives and one is removed
- **THEN** a valid surviving alternative retains its original costs and conditions
- **AND** removal does not convert the whole condition into unrestricted access

#### Scenario: Public boundary retains a withheld requirement

- **WHEN** an otherwise public entity must remain under the boundary-reference rules but a required target is withheld
- **THEN** its eligibility remains explicitly unknown without disclosing the target
- **AND** the absent target is not interpreted as no requirement

### Requirement: Redaction preserves public probability meaning

A redacted acquisition projection SHALL preserve the probability semantics of retained public outcomes without exposing removed identities. It SHALL NOT silently renormalize weights, retry behavior or duplicate limits and continue claiming the old event's exact probability. An unprovable projection SHALL stop publication.

#### Scenario: Hidden pool member affects a public outcome

- **WHEN** a removed identity contributed weight or state to the same process as a retained outcome
- **THEN** a nonidentifying representation preserves the retained outcome's process semantics
- **AND** it does not publish a newly renormalized chance as though nothing changed

#### Scenario: Required semantics cannot be retained safely

- **WHEN** the build cannot preserve both the public probability meaning and the identity redaction
- **THEN** publication fails with the affected model's context
- **AND** no guessed probability or unredacted pool is published

### Requirement: Method visibility follows surviving roots and geometry policy

Acquisition normalization SHALL preserve the existing reachability and geometry policies across method, output, input and provider references. A cost reference or source-free cycle SHALL NOT create an acquisition root. Position suppression SHALL keep permitted non-geometric method facts without recreating locations through nested sources.

#### Scenario: Container cycle has no real source

- **WHEN** known definitions refer to each other but no surviving provider establishes an acquisition root
- **THEN** their contents may remain inspectable under the existing unconnected-content rule
- **AND** the cycle alone does not advertise an available source

#### Scenario: Method uses a suppressed provider

- **WHEN** a published method's provider lies in a position-suppressed zone
- **THEN** its permitted non-geometric facts survive
- **AND** direct or nested source inspection publishes no suppressed geometry
