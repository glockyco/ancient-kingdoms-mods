# Commit Guide

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

## Message Structure

- Subject: imperative mood, max 80 chars
- Body: prose (not bullets), explain WHY not WHAT
- Blank line between subject and body

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
