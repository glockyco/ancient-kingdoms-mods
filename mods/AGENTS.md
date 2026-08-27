# Mods

MelonLoader mods run in the Windows game inside CrossOver. The native build tool owns setup, build, deployment, launch, and export.

## Runtime boundaries

- Close the game before deployment. Windows locks loaded mod DLLs.
- Game wrappers use `Il2Cpp.*`. Mirror wrappers use `Il2CppMirror.*`.
- Use the new Unity Input System, not legacy input APIs.
- A mod assembly with `[HarmonyDontPatchAll]` must call `HarmonyInstance.PatchAll()` once during initialization.
- Verify patched stock behavior against `server-scripts/`. It is gitignored. Read it with ignored-file access enabled.
- Do not infer game behavior from a near-empty `Assembly-CSharp.dll` stub. Runtime wrappers come from Cpp2IL and Il2CppInterop.
- Il2CppInterop exposes a game field as a property. Reflection by field name finds nothing, so read a property first and fall back to a field.
- `GetComponents<T>()` returns every match wrapped as `T`. All six attribute components report `PlayerAttribute`, so identify one by the member that holds it rather than by its type.

Use `skill://hotrepl-runtime-inspection` for live state and typed command work. Use `skill://export-game-data` for exporter policy. Use `skill://ancient-kingdoms-save-files` for the external save format.

## Shared game patterns

- Synchronized server time is `NetworkManagerMMO.offsetNetworkTime + NetworkTime.time`. Use it for eligibility, countdowns, and state that is defined on the server clock.
- Respawn writes are different: the game compares `respawnTimeEnd` with Unity elapsed time. Backdate it with `Time.timeAsDouble - 1.0`; do not substitute synchronized server time.
- Clickable world markers use a `TextMesh` with a `BoxCollider`. Keep the collider aligned with the visible marker and use the game input filters before raycasting.
- Scene and singleton caches become invalid across scene changes. Clear held Unity references on scene transition and reacquire them before use.

## Failure policy

Fail fast for required runtime resources. A missing singleton, component, field, or authoritative value is an error unless the owning contract defines absence as valid.

A refused engine call reports nothing. An out-of-range index, a wrong entity state, and a failed cost check each return normally and change nothing, so a successful call is not evidence of an effect. Read the value, act, then read it again, and supply the reason the engine withholds.

`FieldDefaultValueHookFix` is the one sanctioned fallback. The mod hooks a broad reflection path where some requests legitimately have no `FieldInfo`. For that case only, preserve the original value and log the unsupported request. Do not generalize this exception to other mods.

## Build and smoke

Use the commands in the root `README.md`. Build through `dotnet run --project build-tool build`. Deploy only after the game exits. For a runtime change, launch the real game and exercise the affected behavior; a successful build is not runtime proof.
