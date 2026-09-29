## ADDED Requirements

### Requirement: A missing export stops the build

`compendium build` SHALL fail when an export file that it requires is absent. The error SHALL name the missing file.

Rationale: loaders returned early when their export file was absent. A partial export therefore produced a database that silently lacked whole entity types.

#### Scenario: A required export file is absent

- **WHEN** the export directory lacks a file that the build requires
- **THEN** the build fails and the error names the missing file
- **AND** the published outputs are unchanged

### Requirement: A failed build keeps the published outputs

`compendium build` SHALL write the database, the published images, and the planner payload to a staging location. It SHALL replace the published copies only after every build stage succeeds. When a replacement step fails, the build SHALL restore each published output that it already replaced, and then fail.

Rationale: the build deleted the published database and planner payload before it started. A failed build therefore left the website without data.

#### Scenario: A build stage fails

- **WHEN** a load, denormalization, verification, or planner payload stage fails
- **THEN** the published database, images, and planner payload are unchanged

#### Scenario: A replacement step fails

- **WHEN** replacing one published output fails after the build replaced other outputs
- **THEN** the build restores the previous copies of the replaced outputs and fails

#### Scenario: The build succeeds

- **WHEN** every build stage succeeds
- **THEN** the build replaces the database, the images, and the planner payload with the complete new set
