# site-deployment Specification

## Purpose
Defines how a deploy produces the published website, and which build failures stop publication before any file is uploaded.

## Requirements

### Requirement: A deploy publishes a site built in the same run

`pnpm cf-deploy` SHALL run the production website build before it uploads any file. A failed build SHALL stop the command before the upload.

Rationale: the command uploaded the build output that was already on disk. A deploy after a source or data change could therefore publish a stale site.

#### Scenario: The build succeeds

- **WHEN** a maintainer runs `pnpm cf-deploy` and the production build succeeds
- **THEN** the command uploads the output of that build

#### Scenario: The build fails

- **WHEN** the production build fails during `pnpm cf-deploy`
- **THEN** the command stops and uploads no files

### Requirement: A broken internal link fails the build

During prerendering, an internal link whose target returns an HTTP error status SHALL fail the production build. The error SHALL name the status, the target path, and the page that links to the target.

Rationale: an exemption for three route prefixes stayed in the configuration after those routes shipped. The build therefore could not report a broken link under those prefixes.

#### Scenario: A page links to a missing page

- **WHEN** a prerendered page links to a path that returns HTTP 404
- **THEN** the build fails with an error such as `404 /missing (linked from /altars)`

#### Scenario: Every internal link resolves

- **WHEN** every crawled internal link returns a success status
- **THEN** the build prerenders every page and succeeds
