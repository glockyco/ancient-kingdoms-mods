# CLAUDE.md

MelonLoader mods + Python build pipeline + SvelteKit website for Ancient Kingdoms game data.

```
Game (IL2CPP Unity) → Mods (JSON export) → Build Pipeline (SQLite) → Website (static)
```

## Task Triggers

When editing any CLAUDE.md file, follow docs/claude-md-guide.md.
When committing code, follow docs/commit-guide.md.
When exporting game data, follow docs/data-export-guide.md.
When running CLI commands, see docs/cli-overview.md.
When exploring the codebase structure, see docs/project-map.md.
When working on mods, see mods/CLAUDE.md.
When working on the website, see website/CLAUDE.md.
When working on the build pipeline, see build-pipeline/CLAUDE.md.

If you notice stale or incorrect information in any documentation, flag it to the user.

## Universal Guidelines

### Logging

- Comprehensive logging when debugging/developing
- Log: object/field found status, values before changes, success/failure
- Proactive logging saves iteration time

### Comments

- NO historical comments ("Added X", "Changed from Y")
- NO temporal language ("Previously", "Now uses")
- ONLY complex logic explanations

### Code Quality

- Simple, straightforward code
- Consistency with existing patterns is critical
- Study existing implementations before adding features

### Fail Fast

- NO silent fallbacks that hide errors (e.g., `value ?? defaultValue`)
- Throw errors immediately when data is missing or invalid
- Prefer explicit errors over graceful degradation during development
- If something should exist, assert it exists - don't silently continue

### Testing

Always test before committing:
- Website: `pnpm check && pnpm lint && pnpm build`
- Mods: `dotnet run --project build-tool build` (Windows only)

### Modern Standards

- Follow modern best practices and community standards
- Use official tooling defaults wherever possible
- No custom configuration without strong justification

## Quick Reference

```bash
# Mods (Windows only)
dotnet run --project build-tool all

# Build pipeline
cd build-pipeline && uv run compendium build

# Website
cd website && pnpm dev
cd website && pnpm check && pnpm lint && pnpm build
```

## Subprojects

| Subproject | Purpose | Docs |
|------------|---------|------|
| mods/ | MelonLoader mods (Windows) | mods/CLAUDE.md |
| build-pipeline/ | Python CLI (JSON → SQLite) | build-pipeline/CLAUDE.md |
| website/ | SvelteKit static site | website/CLAUDE.md |
