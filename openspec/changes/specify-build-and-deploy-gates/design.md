## Context

See proposal.md for motivation. The behavior already runs. On 2026-09-28, a probe link to a missing page on `/altars` failed the production build with `404 /this-page-does-not-exist-probe (linked from /altars)`. The same build without the probe prerendered 3,683 pages. `build-pipeline/tests/test_build_atomicity.py` covers the missing-export, failed-stage, failed-replacement, and successful-replacement cases.

## Goals / Non-Goals

**Goals:**

- Record the four guarantees as testable requirements, so that a later change modifies a stated contract.

**Non-Goals:**

- The decompiled-snapshot preflight of `compendium build`. The `decouple-build-from-decompiled-snapshot` change removes that dependency, so a requirement for it would be obsolete.
- The export directory's own atomicity. The `harden-export-sessions` change owns it.
- The failure rules of `compendium tiles` and `compendium stats`. They are command-line details that the repository-wide fail-fast rule already covers.

## Decisions

- **Put deploy guarantees in a new `site-deployment` capability.** No main spec owns the website build or deploy. `page-metadata` describes the IndexNow ping after a deploy, but a broken link is not metadata. Extending `page-metadata` would mix two subjects.
- **State the link failure as behavior, not configuration.** The requirement names what the build does, not the SvelteKit option. The site uses the framework default, so a future framework change that keeps the behavior needs no spec change.
- **Add the pipeline guarantees to `compendium-build`.** That capability already defines what the build guarantees about its published artifacts.

## Risks / Trade-offs

- [A process that stops during the replacement can leave outputs from two builds] → The requirement covers a failed replacement step, not a killed process. A versioned consumer is necessary for crash safety, and no current change plans one.
- [`pnpm cf-deploy` needs the local database to build] → The requirement applies to the machine that deploys. CI does not deploy.
