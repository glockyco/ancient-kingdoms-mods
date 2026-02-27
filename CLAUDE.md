# CLAUDE.md

MelonLoader mods + Python build pipeline + SvelteKit website for Ancient Kingdoms game data.

```
Game (IL2CPP Unity) → Mods (JSON export) → Build Pipeline (SQLite) → Website (static)
```

## Task Triggers

**IMPORTANT: You MUST read the linked file BEFORE performing these tasks.**

| Task | Required Reading |
|------|------------------|
| Editing any CLAUDE.md | docs/claude-md-guide.md |
| Committing code | docs/commit-guide.md |
| Creating GitHub issues | docs/github-guide.md |
| Exporting game data | docs/data-export-guide.md |
| Updating server scripts | docs/server-scripts-guide.md |
| Exploring codebase structure | docs/project-map.md |
| Working on mods | mods/CLAUDE.md |
| Working on website | website/CLAUDE.md |
| Working on build pipeline | build-pipeline/CLAUDE.md |

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
- Mods: `dotnet run --project build-tool build`

### Modern Standards

- Follow modern best practices and community standards
- Use official tooling defaults wherever possible
- No custom configuration without strong justification

## Quick Reference

```bash
# First-time setup (interactive, auto-detects paths)
dotnet run --project build-tool setup

# Mods — build and deploy to game directory
dotnet run --project build-tool all

# Export game data (launches game, runs export, streams log, quits)
dotnet run --project build-tool export

# Build pipeline — load exported JSON into SQLite
cd build-pipeline && uv run compendium build

# Website
cd website && pnpm dev
cd website && pnpm check && pnpm lint && pnpm build
```

## Subprojects

| Subproject | Purpose | Docs |
|------------|---------|------|
| mods/ | MelonLoader mods (macOS via CrossOver, Windows) | mods/CLAUDE.md |
| build-pipeline/ | Python CLI (JSON → SQLite) | build-pipeline/CLAUDE.md |
| website/ | SvelteKit static site | website/CLAUDE.md |
