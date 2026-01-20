---
name: writing-skills
description: Create new agent skills for this project. Use when adding reusable guidance for recurring tasks.
---

# Writing Skills

Skills provide reusable instructions that agents can load on-demand.

## When to Create a Skill

Create when:
- A task recurs and benefits from consistent approach
- Patterns are non-obvious or easy to forget
- A process has multiple steps in specific order
- Project-specific conventions need enforcement

Avoid for:
- One-off tasks
- Information that belongs in regular docs
- Simple facts without guidance

## File Structure

```
.claude/skills/<skill-name>/SKILL.md
```

Directory name must exactly match the `name` in frontmatter.

## Frontmatter

```yaml
---
name: my-skill-name
description: Brief description. Use when [trigger conditions].
---
```

**Name rules:** 1-64 chars, lowercase alphanumeric with single hyphens, must match directory.

**Description rules:** Include "Use when..." to help agent know when to load it.

## Content Principles

Include **project-specific, non-obvious, arbitrary decisions** - things an agent
can't derive from first principles or by reading existing code.

**Include:**
- Architectural decisions
- Arbitrary conventions
- Project-specific constraints
- Multi-step processes with non-obvious order
- Checklists for tasks easy to partially complete

**Exclude:**
- General programming knowledge
- Patterns discoverable from existing code
- Reference material for external docs
- Syntax examples for standard features

**Test:** Before adding content, ask "Could an experienced developer figure
this out by reading the codebase?" If yes, don't include it.

## Content Guidelines

- Focus on actionable guidance
- Include code examples only for project-specific patterns
- Keep concise (50-100 lines ideal, 150 max)
- Use imperative mood ("Add the hook" not "You should add")

## Checklist

Before committing:

- [ ] Directory name matches frontmatter `name`
- [ ] Description includes "Use when..." trigger
- [ ] Content is actionable, not just informational
- [ ] Length is appropriate
- [ ] No duplicate information from existing docs
