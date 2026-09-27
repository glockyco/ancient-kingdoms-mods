# The Adventurer's Guide joins a skill's cast time and cooldown into one word

## Summary

A skill page in the Adventurer's Guide shows the cast time and the cooldown with no space between them, for example `0.5s cast45s cooldown`. The same skill tooltip on the skill bar shows the two values in separate columns.

## Build

- Game version 0.9.34.0
- Steam build 25548782
- `Assembly-CSharp.dll` SHA-256 `a676445a44fe01458aa611caea2a8b95ca9d79998c5fd840508084508764878a`

## Impact

The line that states how long a skill takes to cast and how long the player waits before the next cast is hard to read. A player can read `cast1m 30s` as one value.

182 of the 415 skill entries in the guide have this layout. The count comes from the English tooltip templates.

## Steps to reproduce

1. Enter the world with any character.
2. Open the Adventurer's Guide with the help button.
3. Select Classes, then Warrior, then Class skills.
4. Select Slam.
5. Read the line under the resource cost.

## Observed

| Source | Text |
|---|---|
| `Skill.ToolTip()` for Slam, rank 5 | `0.5s cast<pos=50%>45s cooldown` |
| `GameWikiContent.SkillBody(Slam, 5)` | `0.5s cast45s cooldown` |

The veteran skill Leadership shows `0.1s cast1m 30s cooldown` in the same way.

## Expected

The guide shows a separator between the two values, as the skill bar tooltip does.

## Cause

`ScriptableSkill.NormalizeCooldownColumn` replaces the spaces before `{COOLDOWN}` with a TextMesh Pro position tag, at `server-scripts/ScriptableSkill.cs:331-334`:

```csharp
return CooldownColumnSpacing.Replace(template, "<pos=50%>{COOLDOWN}");
```

`GameWikiContent.SkillBody` then removes every layout tag, `pos` included, and replaces it with nothing, at `.decompiled/steam-25548782-a676445a44fe/GameWikiContent.cs:23` and `:257`:

```csharp
private static readonly Regex LayoutTags = new Regex("</?(?:size|pos|space|align|width|margin|voffset|line-height|indent|cspace|mspace)(?:=[^>]*)?>", RegexOptions.IgnoreCase);
...
return ColumnSpaces.Replace(LayoutTags.Replace(input, ""), " ").Trim();
```

The spaces that separated the columns were already removed in the first step, so nothing separates the values after the second step.

## Suggested fix

Replace a `pos` tag with a space instead of an empty string in `SkillBody`. The existing `ColumnSpaces` pass then collapses any repeated spaces.

## Evidence

- `evidence/wiki-skill-cast-and-cooldown-joined.webp`: Slam at rank 5 in the Adventurer's Guide.

## Notes

- The guide was opened and navigated through its own methods, which are the methods its buttons call.
- The strings in the table were read from the running game with the game's own `Skill.ToolTip()` and `GameWikiContent.SkillBody()`.
- The defect is in interface logic and needs no mods to observe.
- Reproduction used a scratch database, so no player save was reached.
