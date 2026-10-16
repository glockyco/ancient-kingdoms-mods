## MODIFIED Requirements

### Requirement: A failed build keeps the published outputs

`compendium build` SHALL write the database and the published images to a staging location. It SHALL replace the published copies only after every build stage succeeds. When a replacement step fails, the build SHALL restore each published output that it already replaced, and then fail.

Rationale: the build deleted the published database before it started. A failed build therefore left the website without data.

#### Scenario: A build stage fails

- **WHEN** a load, denormalization, or verification stage fails
- **THEN** the published database and images are unchanged

#### Scenario: A replacement step fails

- **WHEN** replacing one published output fails after the build replaced other outputs
- **THEN** the build restores the previous copies of the replaced outputs and fails

#### Scenario: The build succeeds

- **WHEN** every build stage succeeds
- **THEN** the build replaces the database and the images with the complete new set
