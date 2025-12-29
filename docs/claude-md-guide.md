# CLAUDE.md Style Guide

Guidelines for writing and editing CLAUDE.md files in this repository.

## Length Limits

- Root CLAUDE.md: <150 lines (ideal <100)
- Subproject CLAUDE.md: <100 lines (ideal <60)
- Brevity > completeness - focused context performs better

## What to Include

- Key commands (build, test, deploy)
- Architecture context that's expensive to rediscover
- Critical gotchas and non-obvious behavior
- Task triggers linking to relevant docs

## What NOT to Include

- Code style/formatting rules (use linters instead)
- Every possible command (use --help)
- Implementation details (discover from code)
- Planned/unimplemented features
- Historical context or changelog

## Structure Template

```markdown
# [Component Name]

[One-line description]

## Task Triggers (if subproject)

[Links to relevant docs]

## [Key Section 1]

## [Key Section 2]

## Gotchas (if any)
```

## Cross-Linking

- Use plain paths: "see docs/commit-guide.md"
- NO @ imports (forces eager loading)
- Task-triggered: "When doing X, see Y"

## Staleness Rule

If you notice stale or incorrect information in any documentation, flag it to the user immediately.
