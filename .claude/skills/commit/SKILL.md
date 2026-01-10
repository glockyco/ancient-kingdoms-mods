---
name: commit
description: Guidelines for creating conventional commits in this repository
---

## Format

Conventional Commits: `type(scope): description`

## Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change (no feature/fix)
- `perf`: Performance improvement
- `docs`: Documentation
- `style`: Formatting (not CSS)
- `test`: Tests
- `chore`: Build, tooling, deps

## Scopes

Use the subproject or component name:
- `website`, `mods`, `build-pipeline`
- `map`, `skills`, `monsters`, etc.

## Message Structure

- **Subject**: imperative mood, max 80 chars
- **Body**: prose (not bullets), explain WHY not WHAT
- **Blank line** between subject and body

## Example

```
feat(website): add service worker for offline caching

The map tiles and database were being re-fetched on every page load,
causing slow initial renders. Adding a service worker caches these
assets after first load, enabling offline access and faster subsequent
visits.
```

## Atomic Commits

- One logical change per commit
- Each commit should build and pass tests independently
- Update related docs in same commit as code

## Before Committing

Always run validation for the affected subproject:
- Website: `cd website && pnpm check && pnpm lint && pnpm build`
- Mods: `dotnet run --project build-tool build` (Windows only)

**Note**: The website has pre-commit hooks that automatically run ESLint --fix, Prettier --write, and pnpm check. If these hooks modify files, stage the changes and amend the commit.

## Important

- NEVER push without explicit user request
- Group related changes (code + docs) in same commit
- If unsure about scope, ask the user
