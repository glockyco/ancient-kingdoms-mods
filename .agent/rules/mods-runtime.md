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

A runtime change is not verified until the game exercises it. `rule://build-is-not-runtime-proof` arrives at deploy and states what counts.

## Shared game patterns

- Synchronized server time comes from the network manager's offset added to Mirror's network time. Use it for eligibility, countdowns, and any state defined on the server clock.
- Clickable world markers use a `TextMesh` with a `BoxCollider`. Keep the collider aligned with the visible marker and use the game input filters before raycasting.
- Scene and singleton caches become invalid across scene changes. Clear held Unity references on scene transition and reacquire them before use.
- A plain server field reads as zero on a client of a remote server rather than failing. A mod that reads one must branch on `NetworkServer.active` and say which source produced the figures it shows. `.agent/skills/hotrepl-runtime-inspection/references/client-and-server.md` lists what a client receives.

## Failure policy

Fail fast for required runtime resources. A missing singleton, component, field, or authoritative value is an error unless the owning contract defines absence as valid.

A refused engine call reports nothing. An out-of-range index, a wrong entity state and a failed cost check all return normally and change nothing. A successful call is not evidence of an effect.

Read the value, act, then read it again. Give the reason the engine withholds.

Do not add a second sanctioned fallback. One exists, and `rule://mod-runtime-special-cases` states it.

A new type's placement is decided when the file is created, and `rule://mod-type-placement` arrives then.
