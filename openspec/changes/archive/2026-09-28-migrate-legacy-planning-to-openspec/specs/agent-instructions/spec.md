## MODIFIED Requirements

### Requirement: Historical records are exempt

Documents that record what was true at a past date, including every archived change under
`openspec/changes/archive/`, SHALL NOT be rewritten to match current conventions, and SHALL be excluded
from the check.

#### Scenario: An archived plan names a deleted path

- **WHEN** an archived change under `openspec/changes/archive/` references a path that no longer exists
- **THEN** the check ignores it
- **AND** the text is left as written, because editing it would misrepresent the historical record
