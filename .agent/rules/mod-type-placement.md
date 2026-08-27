---
description: Place a new mod type by the purpose that owns it when adding a file under a mod.
condition: ".*"
scope: "tool:write(mods/**)"
interruptMode: "never"
---
Put a type with the purpose that owns it. A mod's namespaces name purposes: declaring a subject,
building one, reading one, and the wire surface that exposes them.

One namespace is different. It holds the game's own data as plain values, shared by every purpose, and
it depends on nothing else in the mod.

## Why

Do not sort a type by whether it touches the game. Most purposes touch the game, so that test sorts
nothing and leaves two answers for every type.

A single-purpose adapter returns a type its own purpose owns. Keeping such an adapter in the shared
namespace inverts the dependency.

## Use

Put a type in the shared namespace only when it holds the game's own data and more than one purpose
reads it. Check the direction after a move: the shared namespace must reference nothing.

Logic a test needs without the game goes in a file that imports no game namespace, and the test project
lists that file. A file that mixes the two cannot be tested. Split the reading of game state from the
rule applied to what was read, because the rule is the part worth a test.

## Exceptions

None. A type whose purpose is unclear has an unclear purpose, which is the finding, not a reason to put
it in the shared namespace.

## Incident

A namespace named for a layer collected types by reuse count. Four game-coupled files already sat
outside it, so the name sorted nothing. A single-purpose adapter inside it forced the shared namespace
to depend on the layer above. Commit `0a03eebe` moved twelve types and deleted the wrapper.
