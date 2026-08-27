## Context

See `proposal.md` for motivation.

The rule lives in the character creator. `UICharacterEditor` holds one method per race, and each one
sets the interactable state of all six class buttons (`UICharacterEditor.cs:921-1483`). Nothing else in
the game holds it. `Database.CharacterCreate` takes a class name and a race name as independent strings
and cross-checks neither (`Database.cs:2956-3080`), and no runtime structure lists the races a class
allows.

The curated table also carried a second error of a different kind. It listed `dark_alliance` as a race.
That identifier is a faction, shared by Dark Elf and Fire Goblin. The website worked around it by
translating `dark_alliance` to the display name `Dark Elf`, with a comment calling the source data
mislabelled.

## Goals / Non-Goals

**Goals**

- A curated value that restates a game rule has one command that proves it still matches.
- A failure names both sides of each disagreement, so the correction is mechanical.
- The build keeps working in a checkout with no decompiled snapshot.

**Non-Goals**

- Generating the curated value. See the first decision.
- Extending the check to curated prose. Prose already has the citation gate.
- Checking every curated value in one pass. The mechanism takes one value at a time, and the first is
  the class and race pairing.

## Decisions

### The data stays curated and gains a check, rather than becoming generated

Generating the pairing from the creator would remove the possibility of drift entirely, which is the
better shape wherever it is available. It is not available here. The decompiled snapshot is gitignored,
so a build in a fresh checkout has nothing to read. A generated table would leave the compendium with no
races at all, and the failure would appear as missing content on a class page rather than as a build
error.

The curated file therefore remains the input the build reads, and the check is a separate command that
runs where the snapshot exists. The cost is that a disagreement is found when someone runs the check
rather than when the rule changes. The per-version procedure is where that happens, which is also where
the citation gate already reports a moved region.

Alternative considered: commit the snapshot. Rejected for the reason the decompiled source capability
already records, which is that the snapshot is derived from a copyrighted assembly.

### The rule is read by parsing the creator, not by exporting it at runtime

An exporter could read the button states by driving each race method in the running game, which is what
the harness does for a different purpose. That would produce the pairing without parsing source.

It was rejected because it makes a data correctness check depend on a game session. The current check
runs in a second, in a unit test, and in a pre-commit hook. A runtime export would need the game, a
scratch database, and a world, and it would move a fast check into the slowest tool available.

Parsing has a real weakness: it depends on the shape of the code and not only on its behaviour. That is
what the source citation is for. The reader's cited region is recorded, so a game update that changes
the shape is reported rather than silently producing a wrong answer. The check also fails when it finds
no rule at all, so an empty parse cannot read as agreement.

### The comparison is exact in both directions

An omission and an addition are both defects, and they mislead a reader differently. A missing race
hides a combination the game allows. An extra race sends a player to create a character the game
refuses. Both were present, so both directions are checked.

### A subject the game does not define is a failure

A curated entry naming a class the creator has no method for is reported rather than skipped. A skip
would let a renamed class silently lose its check while continuing to publish.

## Risks / Trade-offs

- A parse depends on code shape → the cited region is recorded, and an empty parse fails rather than
  reporting agreement.
- The check runs on demand rather than continuously → it is part of the per-version procedure, which is
  when the rule can change.
- A checkout without a snapshot cannot verify the value → the check says so, and the build is unaffected
  by design.
- One curated value is checked while others are not → the capability states the contract, so the second
  value to need it follows the first rather than inventing another mechanism.

## Open Questions

None.
