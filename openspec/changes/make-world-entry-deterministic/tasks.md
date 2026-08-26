## 1. Game-independent selection

- [x] 1.1 Add a selector type under `mods/HotReplCommands/World/` that decides which character to enter
      as. It takes the available names and an optional requested name, and returns either the chosen
      name or a failure carrying a stable code and a message. It references no game assembly, so the
      test project can compile it directly.
- [x] 1.2 Implement the default branch: order the available names and return the first, so one name set
      produces one answer regardless of the order the game listed them in.
- [x] 1.3 Implement the requested branch: return the held name when the requested name matches it
      ignoring letter case, because the game stores character names under a case-insensitive primary key.
      Return the held spelling rather than the requested one, so the result names what the game holds.
- [x] 1.4 Implement the failure branches: an empty name set, and a requested name absent from the set.
      The absent-name failure lists the available names in its message.
- [x] 1.5 Register the selector in the test project's compile list, following the existing entries for
      game-independent sources.

## 2. Command surface

- [x] 2.1 Add a `world.enter` arguments DTO carrying an optional character name, following the property
      attribute convention of the existing argument DTO. The name is optional, so a caller sending an
      empty object keeps the current behaviour.
- [x] 2.2 Add the selected character name to the `world.enter` result DTO.
- [x] 2.3 Change `world.enter` to accept the new arguments DTO in place of the empty one, and raise its
      catalog version, because both its argument and result schemas change.

## 3. World entry

- [x] 3.1 Change the shared world entry routine to accept an optional requested character and to report
      the character it selected, so that both `world.enter` and the export command use one path.
- [x] 3.2 Replace the fixed first-element selection with a call to the selector, and map a selector
      failure onto the existing precondition-failure shape.
- [x] 3.3 Handle an occupied world: when a local player already exists, report the held character's name.
      When a different character was requested, fail with a precondition naming the held character and
      the requested one, and do not attempt to leave the world.
- [x] 3.4 Keep `compendium.export` behaviour unchanged by requesting no specific character.

## 4. Tests

- [x] 4.1 Add selector tests, one per behaviour: default selection is stable across two differently
      ordered inputs, default selection changes when a name that sorts earlier is added, a requested
      name present in the set is returned, a requested name absent from the set fails and the message
      names the available characters, and an empty set fails.
- [x] 4.2 Update the command catalog test to assert `world.enter`'s new version, keeping the existing
      named-command assertion intact.
- [x] 4.3 Add a schema test for the new arguments DTO and the extended result DTO, following the existing
      schema test style.
- [x] 4.4 Run the `HotReplCommands` test project.

## 5. Verification against the running game

- [x] 5.1 Build the mods and deploy them.
- [x] 5.2 Enter the world twice with no requested character against an unchanged character set, and
      confirm both runs report the same name.
- [x] 5.3 Enter the world with each of several requested names in turn, confirming the reported name
      matches the request every time.
- [x] 5.4 Request an absent character and confirm the failure lists the available names.
- [x] 5.5 Request a different character while one is already in the world, and confirm the failure names
      both.
- [x] 5.6 Confirm the player save is unchanged by the verification, comparing content hashes before and
      after.

## 6. Dependent guidance and work

- [x] 6.1 Record the new argument in the command table of the HotRepl runtime inspection skill, following
      the table's existing style for a command that takes arguments.
- [x] 6.2 Re-point the combat verification harness task that implements character selection so that it
      reuses this selection instead of adding a second one.
