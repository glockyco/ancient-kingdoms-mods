# BossSkillTracker

Client-side MelonLoader HUD for boss/elite/fabled monster skill cooldowns and estimated shared special-cast gates.

## Commands

| Purpose | Command |
|---|---|
| Logic tests | `dotnet test tests/BossSkillTracker.Tests/BossSkillTracker.Tests.csproj` |
| Build mods | `dotnet run --project build-tool build` |
| Deploy mods | `dotnet run --project build-tool deploy` |
| Final hook gate | `lefthook run pre-commit` |

Close the game before deploy when DLLs are locked. A deployed DLL does not affect an already-loaded MelonLoader session until restart.

## Boundaries

- Use `mods/BossTracker/` and `mods/BetterBestiary/` as references when needed.
- No Harmony combat detection. Combat state is read from synced game fields.
- No production global object enumeration for discovery. Use combat-gated `Physics2D.OverlapCircle` with `GameManager.monsterFilter` and a reused `Il2CppReferenceArray<Collider2D>` buffer.
- No custom shaders, AssetBundles, `BaseMeshEffect`, injected MonoBehaviours, or hidden keyboard-only controls.
- Fail fast for required runtime resources. Do not add quiet UI fallbacks that hide broken assumptions.

## Architecture

- `Model/` is Unity-free and linked into `tests/BossSkillTracker.Tests`; keep it limited to `System*` dependencies.
- `Game/` is the IL2CPP read layer: server time, local player/pet combat state, skill filtering, and bounded enemy discovery.
- `Ui/` is flat uGUI built from plain `Image`s plus TMP labels and a shared 1x1 white sprite.
- Numeric scalar tunables live in `Model/Tuning.cs`; colors live in `Ui/Theme.cs`.
- Special-gate timing is estimated from observed casts. Never present it as exact.

## Runtime invariants

- Out of combat: no discovery work.
- In combat: discovery runs at `Tuning.ScanIntervalSeconds`; per-frame rendering reads live state only from held `Monster` refs.
- Relevance requires tracked tier, alive, aggro by local player or active pet, and at least one trackable skill.
- Trackable skills are index `>= 1`, excluding passives and aura buff/debuff skills.
- Group order is stable first sighting order; rows are stable cooldown-descending order.
