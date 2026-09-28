## ADDED Requirements

### Requirement: A normal build does not need decompiled source for verification data

A compendium build SHALL complete without a local decompiled snapshot. It SHALL NOT generate combat-verification-only planner payloads. Source-specific verification remains a separate explicit operation.

#### Scenario: Building without a decompiled snapshot

- **WHEN** valid export and curated inputs exist but `server-scripts/SNAPSHOT.toml` is absent
- **THEN** the build succeeds and publishes the normal compendium artifacts
- **AND** it does not create a planner verification payload

#### Scenario: A previous verification payload exists

- **WHEN** a normal build runs with stale verification-only payload files present
- **THEN** it does not publish those files as a result of the build
