---
description: This rule covers runtime constraints for mods and tests when editing matching paths.
globs:
  - "mods/**"
  - "tests/**"
---
# Mods runtime

## Runtime boundaries

- Close the game before deployment. Windows locks loaded mod DLLs.
- Game wrappers use `Il2Cpp.*`. Mirror wrappers use `Il2CppMirror.*`.
- Use the new Unity Input System, not legacy input APIs.
- A mod assembly with `[HarmonyDontPatchAll]` must call `HarmonyInstance.PatchAll()` once during initialization.
- Verify patched stock behavior against `server-scripts/`. It is gitignored. Read it with ignored-file access enabled.
- Do not infer game behavior from a near-empty `Assembly-CSharp.dll` stub. Runtime wrappers come from Cpp2IL and Il2CppInterop.
- Il2CppInterop exposes a game field as a property. Reflection by field name finds nothing, so read a property first and fall back to a field.
- `GetComponents<T>()` returns every match wrapped as `T`. All six attribute components report `PlayerAttribute`, so identify one by the member that holds it rather than by its type.

For a runtime change, launch the real game and exercise the affected behavior. A successful build is not runtime proof.

## Shared game patterns

- Synchronized server time comes from the network manager's offset added to Mirror's network time. Use it for eligibility, countdowns, and any state defined on the server clock.
- A respawn deadline is on that same server clock, backdated so the next respawn check finds the monster eligible. `mods/MonsterRespawner/MonsterRespawner.cs` owns the write. Read it rather than recalling the expression.
- Clickable world markers use a `TextMesh` with a `BoxCollider`. Keep the collider aligned with the visible marker and use the game input filters before raycasting.
- Scene and singleton caches become invalid across scene changes. Clear held Unity references on scene transition and reacquire them before use.

## Where a type belongs

A mod's own namespaces name purposes: declaring a subject, building one, reading one, and the wire
surface that exposes them. One namespace is different and holds the game's own data read as plain
values, shared by every purpose. It depends on nothing else in the mod.

Put a type with its purpose. Put it in the shared namespace only when it holds the game's own data and
more than one purpose reads it.

Do not sort a type by whether it touches the game. Most purposes touch the game, so that test sorts
nothing and leaves two answers for every type.

A single-purpose adapter returns a type its own purpose owns. Keeping such an adapter in the shared
namespace inverts the dependency. Check the direction after a move: the shared namespace must reference
nothing.

Logic that a test needs without the game must live in a file that imports no game namespace, and the
test project lists that file. A file that mixes the two cannot be tested, so split the reading of game
state from the rule applied to what was read. The rule is the part worth a test.

## Failure policy

Fail fast for required runtime resources. A missing singleton, component, field, or authoritative value is an error unless the owning contract defines absence as valid.

A refused engine call reports nothing. An out-of-range index, a wrong entity state and a failed cost check all return normally and change nothing. A successful call is not evidence of an effect.

Read the value, act, then read it again. Give the reason the engine withholds.

`FieldDefaultValueHookFix` is the one sanctioned exception, and it concerns a function pointer, not a field value. Il2CppInterop's signature scan for `Class::GetDefaultFieldValue` matches the wrong function on this build and crashes at world entry. The mod redirects the lookup to Il2CppInterop's signature-free traversal (`mods/FieldDefaultValueHookFix/FieldDefaultValueHookFix.cs`). Its failure paths leave the hook alone, so the game keeps unpatched behaviour. Do not generalize it.
