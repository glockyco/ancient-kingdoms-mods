## Why

Four build and deploy guarantees shipped on 2026-09-28 without a specification. AGENTS.md requires OpenSpec for permanent behavior, so these guarantees need a verified baseline before later changes modify them.

## What Changes

- Specify that `pnpm cf-deploy` runs the production website build before it uploads, and that a failed build stops the deploy.
- Specify that prerendering fails the build when an internal link returns an HTTP error. The error names the status, the path, and the linking page.
- Specify that `compendium build` fails when a required export file is absent, and that the error names the file.
- Specify that a failed `compendium build` keeps the published database, images, and planner payload.
- This change makes no code changes. Commits 4343b078, 44dcf759, and 6647c1ee shipped the behavior.

## Capabilities

### New Capabilities

- `site-deployment`: How a deploy produces the published website, and which build failures stop publication.

### Modified Capabilities

- `compendium-build`: Add the missing-export failure and the guarantee that a failed build keeps the published outputs.

## Impact

This documentation-only change describes the `cf-deploy` script in `website/package.json`, SvelteKit's default prerender error handling in `website/svelte.config.js`, `build-pipeline/src/compendium/commands/build.py`, and `build-pipeline/src/compendium/loaders/core.py`. It does not specify that the build requires the decompiled snapshot, because `decouple-build-from-decompiled-snapshot` removes that dependency.
