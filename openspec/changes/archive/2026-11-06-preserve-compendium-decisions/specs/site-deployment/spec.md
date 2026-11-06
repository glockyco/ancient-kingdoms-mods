## ADDED Requirements

### Requirement: Deploys rely on the bounded page cache

A deploy SHALL NOT purge Cloudflare's cache. Pages SHALL stay cached for at most one minute, which is an acceptable delay for newly deployed content. The updater's stricter cache requirements remain unchanged.

#### Scenario: A page was cached immediately before deploy

- **WHEN** a deploy finishes while an old page remains cached
- **THEN** the deploy sends no purge request and the old page expires within one minute
