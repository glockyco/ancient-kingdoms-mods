---
name: creating-issues
description: Create GitHub issues for development tasks. Use when adding new issues or planning work.
---

# Creating Issues

Development issues follow a consistent structure for clarity and trackability.

## Structure

### Summary
One sentence describing what this issue accomplishes.

### Context
Why this work is needed:
- Problem being solved or goal being achieved
- Dependencies on other issues (link with #number)
- Relevant background

### Tasks
Checklist of concrete work items:

```markdown
- [ ] First task
- [ ] Second task
```

### Acceptance Criteria
Observable outcomes that indicate completion. Focus on "what" not "how".

### Planned Commits
Document atomic commits that will implement this issue:

```markdown
1. `type(scope): short description`
   - What this commit includes
```

### Notes (optional)
Constraints, related issues, or technical details.

## Labels

**Component labels:**
- `website` - SvelteKit website
- `build-pipeline` - Python CLI and SQLite
- `mods` - MelonLoader mods
- `schema` - Database schema changes
- `skills` - Agent skills and documentation

**Priority labels:**
- `P0-critical` - Blocking, must do first
- `P1-high` - Important for milestone
- `P2-medium` - Should do
- `P3-low` - Nice to have

## GitHub CLI

```bash
gh issue create \
  --title "Issue title" \
  --label "website" --label "P1-high" \
  --milestone "Item Sources Refactoring" \
  --body "$(cat <<'EOF'
## Summary
...
EOF
)"
```

## Example

```markdown
## Summary

Add zone filter to items overview page.

## Context

Users need to filter items by the zone where they can be obtained. This enables
"what can I get in this zone?" queries. Depends on #12 for zone utilities.

## Tasks

- [ ] Update +page.server.ts to load zone data
- [ ] Add zone filter column definition
- [ ] Add DataTableFacetedFilter for zones

## Acceptance Criteria

- Zone filter appears in toolbar
- Selecting zones filters items to those obtainable in selected zones
- Multiple zone selection uses OR logic

## Planned Commits

1. `feat(website): add zone filter to items overview page`
   - Load zone data in server
   - Add filter column and UI component
```
