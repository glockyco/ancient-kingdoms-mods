---
title: "BossSkillTracker Implementation Plan"
type: plan
status: active
created: 2026-06-22
parent:
superseded_by:
archived:
---

# BossSkillTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-side MelonLoader HUD that, while you (or your pet) are in combat with boss/elite/fabled monsters, shows one group per enemy listing its non-basic abilities with live cooldown bars, a current-cast highlight, and a shared "next special" gate estimate.

**Architecture:** A Unity-free logic core (relevance, cooldown math, stable cooldown-descending sort, special-gate estimator) is unit-tested in isolation. A performance-first IL2CPP read layer is **gated on the player's combat state** and, only while in combat, runs one **bounded spatial query** (`Physics2D.OverlapCircle` around the player, reusing a preallocated buffer — never `FindObjectsOfType`) at ~5 Hz to discover relevant enemies. Each discovered enemy's `Monster` reference is held by its view; **per-frame work reads live state directly off those few held refs** (alloc-free, frame-accurate). A flat runtime-uGUI layer renders one draggable, lockable, collapsible panel of stacked per-enemy groups, reconciled by `netId` in stable first-sighting order. No Harmony, no custom shaders, no AssetBundles, no injected MonoBehaviours. **All numeric constants live in `Model/Tuning.cs`; all colors in `Ui/Theme.cs`** — no magic numbers in logic or UI.

**Tech Stack:** MelonLoader, IL2CPP (`Il2Cpp.*` / Il2CppInterop), .NET 6, Unity 6000.3.x uGUI + Il2CppTMPro, Mirror (`Il2CppMirror`), xunit for the logic core.

---

## Reference Material (read before starting)

- `mods/CLAUDE.md` — IL2CPP patterns (`Il2Cpp.` prefix, `Il2CppMirror.`, `Il2CppType.Of<T>()`, `.Cast<T>()`/`.TryCast<T>()`), build/deploy commands.
- `mods/BossTracker/BossTracker.cs` — runtime `Canvas`/`Image` creation, `MelonPreferences`, client server time `NetworkTime.time + networkManager.offsetNetworkTime`, new Input System (`UnityEngine.InputSystem.Mouse.current`).
- `mods/BetterBestiary/Ui/BestiaryMonsterSprites.cs` — sprite fallback pattern; BetterBestiary borrows a `TMP_FontAsset` from a game text element.
- `server-scripts/` (gitignored — enable ignored files) — field ground truth:
  - `Monster.cs`: `isBoss/isElite/isFabled`, `portraitBoss`, `imageBossBestiary`, `aggroList` (`SyncDictionary<uint,long>`), `Networktarget`, `health`, `netId`, `nameEntity`, `skills`, `state`. `Physics2D.OverlapCircle(pos, radius, GameManager.monsterFilter, hitsBuffer)` is the game's own proximity query (monsterFilter is a `ContactFilter2D`; `hitsBuffer` is a reused `Collider2D[]`).
  - `Entity.cs`: `lastCombatTime` (SyncVar double).
  - `Player.cs`: combat state = `lastCombatTime + 3.0 > now` (`restStateTime`).
  - `Skills.cs`: `skills` (`SyncList<Skill>`), `currentSkill` (SyncVar int, -1 none).
  - `Skill.cs`: `name`, `image`, `cooldown` (total), `cooldownEnd`, `castTimeEnd`, `data`; index 0 = basic attack.
  - `PassiveSkill.cs` / `AreaBuffSkill.cs` / `AreaDebuffSkill.cs`: `isAura` — these + passives are skipped by `MonsterSkills.NextSkill`.
  - `Utils.cs`: `bossMonsterColor (231,153,51)`, `eliteMonsterColor (107,66,255)`, `fabledMonsterColor (86,219,163)`.
- Mockups (visual + behavioural target): `docs/mockups/cooldown-tracker-simple/index.html` (target), `docs/mockups/cooldown-tracker/index.html` (reference).

## Decided Mechanics

- **Combat is server-authoritative; poll synced state, no Harmony.**
- **Performance:** out of combat → zero discovery. In combat → one `OverlapCircle` (bounded by nearby colliders, not total monster count) at `Tuning.ScanIntervalSeconds`. Per-frame → live reads on the few held `Monster` refs only. No `FindObjectsOfType`, no per-frame allocations.
- **Relevance:** `monster.aggroList.ContainsKey(localPlayer.netId)` OR `...ContainsKey(pet.netId)`, tier ∈ {boss, elite, fabled}, alive, ≥1 trackable skill.
- **Trackable skill:** skill-list index ≥ 1 (0 = basic), excluding passives and aura buff/debuff skills.
- **Cooldowns** are exact/synced (`Skill.cooldownEnd`, `cooldown`); fill toward ready.
- **Gate** estimated from observed casts: window `[castEnd + Tuning.GateMin, castEnd + Tuning.GateMax]`; first `Tuning.WarmupSeconds` of combat = warmup; statuses Warmup→Unknown→Locked→Armed/Idle.
- **Rows** sorted by total cooldown descending (constant → stable order).
- **UI:** flat solid `Image`s, sharp corners, tier-colored top stripe + name, one draggable panel; on-screen controls (compact/grip/lock) at panel top-right; pointer-drag from any header (no keyboard modifier); lock disables drag + hides grip; compact collapses all groups. Controls are composed from flat tinted Images (the shared 1×1 white sprite) — no font glyphs, no baked textures.

## File Structure

```
mods/BossSkillTracker/
  BossSkillTracker.csproj
  BossSkillTrackerMod.cs        # MelonMod entry: lifecycle, combat gate, scan throttle, per-frame render
  Config.cs                     # MelonPreferences (panel pos, locked, compact)
  Model/                        # PURE C# — no UnityEngine/Il2Cpp/MelonLoader usings (compiled into tests)
    Tier.cs  GateStatus.cs  GateVm.cs
    Tuning.cs                   # ALL numeric constants (central; future-config candidates)
    CooldownMath.cs  SkillOrdering.cs  RelevanceFilter.cs  SpecialGateEstimator.cs
  Game/                         # IL2CPP read layer (in-game smoke only)
    EnemyInfo.cs                # discovery DTO (TrackedSkill, EnemyInfo, LiveSkill)
    GameAccess.cs  SkillReader.cs  EnemyDiscovery.cs
  Ui/                           # flat runtime uGUI (in-game smoke only)
    Theme.cs                    # colors + shared 1x1 white sprite
    HudFactory.cs               # Rect/Box/Bar/Icon/Label builders + TMP->Text fallback
    GateStripView.cs  RowView.cs  GroupView.cs  ControlCluster.cs  HudRoot.cs
tests/BossSkillTracker.Tests/
  BossSkillTracker.Tests.csproj  # xunit; links only Model/*.cs (Unity-free)
  CooldownMathTests.cs  SkillOrderingTests.cs  RelevanceFilterTests.cs  SpecialGateEstimatorTests.cs
```

**Decomposition rule (critical):** `Model/` MUST NOT reference `UnityEngine`/`Il2Cpp*`/`MelonLoader` — it compiles into the test project (no game refs), exactly like `tests/BetterBestiary.Tests` links pure files. `Game/` and `Ui/` may use IL2CPP and are verified only in-game.

---

## Phase 1: Scaffold

### Task 1: Mod project + entry stub

**Files:**
- Create: `mods/BossSkillTracker/BossSkillTracker.csproj`
- Create: `mods/BossSkillTracker/BossSkillTrackerMod.cs`

- [ ] **Step 1: Create the csproj** (reference set from `mods/BossTracker/BossTracker.csproj` + Physics2D module)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <AssemblyName>BossSkillTracker</AssemblyName>
    <RootNamespace>BossSkillTracker</RootNamespace>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="MelonLoader"><HintPath>$(MelonLoaderPath)\net6\MelonLoader.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="Il2CppInterop.Runtime"><HintPath>$(MelonLoaderPath)\net6\Il2CppInterop.Runtime.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="UnityEngine.CoreModule"><HintPath>$(Il2CppAssembliesPath)\UnityEngine.CoreModule.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="UnityEngine.UI"><HintPath>$(Il2CppAssembliesPath)\UnityEngine.UI.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="UnityEngine.TextRenderingModule"><HintPath>$(Il2CppAssembliesPath)\UnityEngine.TextRenderingModule.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="UnityEngine.Physics2DModule"><HintPath>$(Il2CppAssembliesPath)\UnityEngine.Physics2DModule.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="Unity.TextMeshPro"><HintPath>$(Il2CppAssembliesPath)\Unity.TextMeshPro.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="Unity.InputSystem"><HintPath>$(Il2CppAssembliesPath)\Unity.InputSystem.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="Assembly-CSharp"><HintPath>$(Il2CppAssembliesPath)\Assembly-CSharp.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="Il2Cppmscorlib"><HintPath>$(Il2CppAssembliesPath)\Il2Cppmscorlib.dll</HintPath><Private>False</Private></Reference>
    <Reference Include="Il2CppMirror"><HintPath>$(Il2CppAssembliesPath)\Il2CppMirror.dll</HintPath><Private>False</Private></Reference>
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Create the entry stub**

```csharp
using MelonLoader;
using UnityEngine.SceneManagement;

[assembly: MelonInfo(typeof(BossSkillTracker.BossSkillTrackerMod), "BossSkillTracker", "0.1.0", "AncientKingdomsMods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossSkillTracker;

public sealed class BossSkillTrackerMod : MelonMod
{
    public override void OnInitializeMelon() => LoggerInstance.Msg("BossSkillTracker initialized");

    public override void OnUpdate()
    {
        if (SceneManager.GetActiveScene().name != "World") return;
        // wired up in Phase 5
    }
}
```

- [ ] **Step 3: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds; `BossSkillTracker.dll` produced.
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/
git commit -m "feat(boss-skill-tracker): scaffold mod project and entry stub"
```

### Task 2: xunit test project

**Files:**
- Create: `tests/BossSkillTracker.Tests/BossSkillTracker.Tests.csproj`

- [ ] **Step 1: Create the test csproj** (mirror `tests/BetterBestiary.Tests`; Model files linked per task)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <RollForward>Major</RollForward>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
  </ItemGroup>
  <ItemGroup>
    <!-- Pure Model files linked here as each is created (Tasks 3-7) -->
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Verify** — Run: `dotnet test tests/BossSkillTracker.Tests/BossSkillTracker.Tests.csproj` — Expected: builds; "No test is available".
- [ ] **Step 3: Commit**

```bash
git add tests/BossSkillTracker.Tests/
git commit -m "test(boss-skill-tracker): add xunit test project"
```

---

## Phase 2: Pure logic core (TDD)

> Files in `mods/BossSkillTracker/Model/` use ONLY `System*`. After creating each, add `<Compile Include="..\..\mods\BossSkillTracker\Model\<File>.cs" Link="Model\<File>.cs" />` to the test csproj.

### Task 3: Enums + Tuning

**Files:**
- Create: `mods/BossSkillTracker/Model/Tier.cs`, `GateStatus.cs`, `Tuning.cs`
- Modify: test csproj

- [ ] **Step 1: Create the files**

```csharp
// Tier.cs
namespace BossSkillTracker.Model;
public enum Tier { Boss, Elite, Fabled }
```
```csharp
// GateStatus.cs
namespace BossSkillTracker.Model;
public enum GateStatus { Warmup, Unknown, Locked, Armed, Idle }
```
```csharp
// Tuning.cs — every numeric constant in one place. Pure (no Unity) so logic, UI, and tests share it.
// These are the knobs a future MelonPreferences config might expose (YAGNI for now).
namespace BossSkillTracker.Model;

public static class Tuning
{
    // gate timing (seconds)
    public const double WarmupSeconds = 5.0;       // no specials in the first 5s of combat
    public const double GateMin = 5.0;             // earliest next special after a cast ends
    public const double GateMax = 9.0;             // latest next special after a cast ends
    public const double CombatGraceSeconds = 3.0;  // lastCombatTime keeps us "in combat" this long

    // discovery loop
    public const float ScanIntervalSeconds = 0.2f; // ~5 Hz enemy discovery while in combat
    public const float DiscoveryRadius = 50f;      // OverlapCircle radius around the player
    public const int OverlapBufferSize = 64;       // reused Collider2D buffer capacity

    // canvas / panel
    public const int CanvasSortingOrder = 32760;
    public const float PanelWidth = 300f;
    public const float PanelDefaultX = -16f;
    public const float PanelDefaultY = -80f;
    public const float GroupSpacing = 8f;

    // group / row layout (px)
    public const float HeaderHeight = 46f;
    public const float GateHeight = 54f;
    public const float RowHeight = 34f;
    public const float RowHeightCompact = 22f;
    public const float IconSize = 30f;
    public const float IconSizeCompact = 22f;
    public const float ControlIconSize = 16f;
    public const float Pad = 6f;

    // text sizes (pt)
    public const float NameSize = 13f;
    public const float RowNameSize = 12f;
    public const float SmallSize = 10f;
    public const float StateSize = 11f;
}
```

- [ ] **Step 2: Link all three in the test csproj**

```xml
<Compile Include="..\..\mods\BossSkillTracker\Model\Tier.cs" Link="Model\Tier.cs" />
<Compile Include="..\..\mods\BossSkillTracker\Model\GateStatus.cs" Link="Model\GateStatus.cs" />
<Compile Include="..\..\mods\BossSkillTracker\Model\Tuning.cs" Link="Model\Tuning.cs" />
```

- [ ] **Step 3: Build tests** — Run: `dotnet build tests/BossSkillTracker.Tests/BossSkillTracker.Tests.csproj` — Expected: succeeds.
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/Model/ tests/BossSkillTracker.Tests/
git commit -m "feat(boss-skill-tracker): enums + central Tuning constants"
```

### Task 4: CooldownMath

**Files:**
- Create: `mods/BossSkillTracker/Model/CooldownMath.cs`
- Create: `tests/BossSkillTracker.Tests/CooldownMathTests.cs`
- Modify: test csproj

- [ ] **Step 1: Write the failing test**

```csharp
using BossSkillTracker.Model;
using Xunit;

public class CooldownMathTests
{
    [Fact] public void Remaining_clamps_to_zero_past_end() => Assert.Equal(0.0, CooldownMath.Remaining(10, 12), 5);
    [Fact] public void Remaining_positive_before_end() => Assert.Equal(3.0, CooldownMath.Remaining(10, 7), 5);
    [Fact] public void Fill_full_when_ready() => Assert.Equal(1f, CooldownMath.Fill(10, 30f, 10));
    [Fact] public void Fill_zero_at_cast() => Assert.Equal(0f, CooldownMath.Fill(40, 30f, 10));
    [Fact] public void Fill_half_midway() => Assert.Equal(0.5f, CooldownMath.Fill(25, 30f, 10), 3);
    [Fact] public void Fill_zero_total_is_full() => Assert.Equal(1f, CooldownMath.Fill(5, 0f, 0));
    [Fact] public void IsReady_at_or_after_end() { Assert.True(CooldownMath.IsReady(10, 10)); Assert.False(CooldownMath.IsReady(10, 9)); }
}
```

- [ ] **Step 2: Link impl in csproj**

```xml
<Compile Include="..\..\mods\BossSkillTracker\Model\CooldownMath.cs" Link="Model\CooldownMath.cs" />
```

- [ ] **Step 3: Run — Expected: FAIL** (`CooldownMath` missing). Run: `dotnet test tests/BossSkillTracker.Tests/BossSkillTracker.Tests.csproj`

- [ ] **Step 4: Write the implementation**

```csharp
using System;
namespace BossSkillTracker.Model;

public static class CooldownMath
{
    public static double Remaining(double cooldownEnd, double now) => Math.Max(0.0, cooldownEnd - now);

    public static float Fill(double cooldownEnd, float total, double now)
    {
        if (total <= 0f) return 1f;
        float f = (float)(1.0 - Remaining(cooldownEnd, now) / total);
        return f < 0f ? 0f : f > 1f ? 1f : f;
    }

    public static bool IsReady(double cooldownEnd, double now) => cooldownEnd <= now;
}
```

- [ ] **Step 5: Run — Expected: PASS (7).**
- [ ] **Step 6: Commit**

```bash
git add mods/BossSkillTracker/Model/CooldownMath.cs tests/BossSkillTracker.Tests/
git commit -m "feat(boss-skill-tracker): cooldown math with tests"
```

### Task 5: SkillOrdering

**Files:**
- Create: `mods/BossSkillTracker/Model/SkillOrdering.cs`
- Create: `tests/BossSkillTracker.Tests/SkillOrderingTests.cs`
- Modify: test csproj

- [ ] **Step 1: Write the failing test**

```csharp
using BossSkillTracker.Model;
using Xunit;

public class SkillOrderingTests
{
    [Fact] public void Orders_by_cooldown_descending() // Seraphax order
        => Assert.Equal(new[] { 2, 5, 1, 0, 4, 3 }, SkillOrdering.ByCooldownDesc(new[] { 30f, 45f, 90f, 10f, 30f, 50f }));

    [Fact] public void Ties_keep_original_order()
        => Assert.Equal(new[] { 0, 1, 2 }, SkillOrdering.ByCooldownDesc(new[] { 20f, 20f, 20f }));
}
```

- [ ] **Step 2: Link impl in csproj**

```xml
<Compile Include="..\..\mods\BossSkillTracker\Model\SkillOrdering.cs" Link="Model\SkillOrdering.cs" />
```

- [ ] **Step 3: Run — Expected: FAIL.**

- [ ] **Step 4: Write the implementation**

```csharp
using System.Collections.Generic;
using System.Linq;
namespace BossSkillTracker.Model;

public static class SkillOrdering
{
    // Indices into 'cooldowns' ordered by cooldown descending. LINQ OrderByDescending is stable,
    // so equal cooldowns keep their original (ascending-index) order.
    public static int[] ByCooldownDesc(IReadOnlyList<float> cooldowns)
        => Enumerable.Range(0, cooldowns.Count).OrderByDescending(i => cooldowns[i]).ToArray();
}
```

- [ ] **Step 5: Run — Expected: PASS.**
- [ ] **Step 6: Commit**

```bash
git add mods/BossSkillTracker/Model/SkillOrdering.cs tests/BossSkillTracker.Tests/
git commit -m "feat(boss-skill-tracker): stable cooldown-descending ordering"
```

### Task 6: RelevanceFilter

**Files:**
- Create: `mods/BossSkillTracker/Model/RelevanceFilter.cs`
- Create: `tests/BossSkillTracker.Tests/RelevanceFilterTests.cs`
- Modify: test csproj

- [ ] **Step 1: Write the failing test**

```csharp
using BossSkillTracker.Model;
using Xunit;

public class RelevanceFilterTests
{
    [Theory]
    [InlineData(true,  false, false, true,  true,  3, true)]
    [InlineData(false, true,  false, true,  true,  1, true)]
    [InlineData(false, false, true,  true,  true,  2, true)]
    [InlineData(false, false, false, true,  true,  3, false)] // untracked tier
    [InlineData(true,  false, false, false, true,  3, false)] // dead
    [InlineData(true,  false, false, true,  false, 3, false)] // not engaged
    [InlineData(true,  false, false, true,  true,  0, false)] // no trackable skills
    public void ShouldTrack(bool boss, bool elite, bool fabled, bool alive, bool engaged, int skills, bool expected)
        => Assert.Equal(expected, RelevanceFilter.ShouldTrack(boss, elite, fabled, alive, engaged, skills));
}
```

- [ ] **Step 2: Link impl in csproj**

```xml
<Compile Include="..\..\mods\BossSkillTracker\Model\RelevanceFilter.cs" Link="Model\RelevanceFilter.cs" />
```

- [ ] **Step 3: Run — Expected: FAIL.**

- [ ] **Step 4: Write the implementation**

```csharp
namespace BossSkillTracker.Model;

public static class RelevanceFilter
{
    public static bool IsTrackedTier(bool isBoss, bool isElite, bool isFabled) => isBoss || isElite || isFabled;

    public static bool ShouldTrack(bool isBoss, bool isElite, bool isFabled, bool alive, bool engagedByMe, int trackableSkillCount)
        => alive && engagedByMe && trackableSkillCount > 0 && IsTrackedTier(isBoss, isElite, isFabled);
}
```

- [ ] **Step 5: Run — Expected: PASS (7).**
- [ ] **Step 6: Commit**

```bash
git add mods/BossSkillTracker/Model/RelevanceFilter.cs tests/BossSkillTracker.Tests/
git commit -m "feat(boss-skill-tracker): relevance predicate with tests"
```

### Task 7: GateVm + SpecialGateEstimator

**Files:**
- Create: `mods/BossSkillTracker/Model/GateVm.cs`, `SpecialGateEstimator.cs`
- Create: `tests/BossSkillTracker.Tests/SpecialGateEstimatorTests.cs`
- Modify: test csproj

- [ ] **Step 1: Write the failing test**

```csharp
using BossSkillTracker.Model;
using Xunit;

public class SpecialGateEstimatorTests
{
    static SpecialGateEstimator Engaged(double start)
    {
        var e = new SpecialGateEstimator();
        e.Observe(start, engaged: true, currentSkillIndex: -1, isCasting: false, currentIsSpecial: false, currentCastEnd: 0);
        return e;
    }

    [Fact] public void Warmup_in_first_window()
    {
        var e = Engaged(100); e.Observe(102, true, -1, false, false, 0);
        Assert.Equal(GateStatus.Warmup, e.Evaluate(102, true).Status);
    }

    [Fact] public void Unknown_after_warmup_until_a_special_seen()
    {
        var e = Engaged(100); e.Observe(100 + Tuning.WarmupSeconds + 1, true, -1, false, false, 0);
        Assert.Equal(GateStatus.Unknown, e.Evaluate(100 + Tuning.WarmupSeconds + 1, true).Status);
    }

    [Fact] public void Locked_then_armed_then_idle_after_a_special()
    {
        var e = Engaged(100);
        e.Observe(108.8, true, 1, isCasting: true, currentIsSpecial: true, currentCastEnd: 110); // ends t=110
        e.Observe(109.5, true, -1, false, false, 0);

        var locked = e.Evaluate(110 + Tuning.GateMin - 1, true);
        Assert.Equal(GateStatus.Locked, locked.Status);
        Assert.Equal(110 + Tuning.GateMin, locked.WindowStart, 3);
        Assert.Equal(110 + Tuning.GateMax, locked.WindowEnd, 3);

        double inWindow = 110 + Tuning.GateMin + 1;
        Assert.Equal(GateStatus.Armed, e.Evaluate(inWindow, anySpecialOffCooldown: true).Status);
        Assert.Equal(GateStatus.Idle,  e.Evaluate(inWindow, anySpecialOffCooldown: false).Status);
    }

    [Fact] public void Disengage_resets_to_unknown()
    {
        var e = Engaged(100); e.Observe(108, true, 1, true, true, 110);
        e.Observe(120, engaged: false, -1, false, false, 0);
        Assert.Equal(GateStatus.Unknown, e.Evaluate(121, true).Status);
    }
}
```

- [ ] **Step 2: Link both impls in csproj**

```xml
<Compile Include="..\..\mods\BossSkillTracker\Model\GateVm.cs" Link="Model\GateVm.cs" />
<Compile Include="..\..\mods\BossSkillTracker\Model\SpecialGateEstimator.cs" Link="Model\SpecialGateEstimator.cs" />
```

- [ ] **Step 3: Run — Expected: FAIL.**

- [ ] **Step 4: Write the implementations**

```csharp
// GateVm.cs
namespace BossSkillTracker.Model;
public readonly struct GateVm
{
    public readonly GateStatus Status;
    public readonly double WindowStart; // absolute server time of earliest special
    public readonly double WindowEnd;   // absolute server time it's due by
    public GateVm(GateStatus status, double windowStart, double windowEnd)
    { Status = status; WindowStart = windowStart; WindowEnd = windowEnd; }
}
```
```csharp
// SpecialGateEstimator.cs
namespace BossSkillTracker.Model;

/// Estimates the monster's shared special-cast gate from observed casts. The gate value is
/// server-only/unsynced; we only know the bounds [castEnd+GateMin, castEnd+GateMax].
public sealed class SpecialGateEstimator
{
    private double? _combatStart;
    private double? _lastSpecialCastEnd;

    public void Reset() { _combatStart = null; _lastSpecialCastEnd = null; }

    public void Observe(double now, bool engaged, int currentSkillIndex, bool isCasting, bool currentIsSpecial, double currentCastEnd)
    {
        if (!engaged) { Reset(); return; }
        _combatStart ??= now;
        if (isCasting && currentIsSpecial && currentSkillIndex >= 1)
            _lastSpecialCastEnd = currentCastEnd; // idempotent during a cast; advances per special
    }

    public GateVm Evaluate(double now, bool anySpecialOffCooldown)
    {
        if (_combatStart is null) return new GateVm(GateStatus.Unknown, 0, 0);
        if (now - _combatStart.Value < Tuning.WarmupSeconds) return new GateVm(GateStatus.Warmup, 0, 0);
        if (_lastSpecialCastEnd is null) return new GateVm(GateStatus.Unknown, 0, 0);

        double ws = _lastSpecialCastEnd.Value + Tuning.GateMin;
        double we = _lastSpecialCastEnd.Value + Tuning.GateMax;
        if (now < ws) return new GateVm(GateStatus.Locked, ws, we);
        return new GateVm(anySpecialOffCooldown ? GateStatus.Armed : GateStatus.Idle, ws, we);
    }
}
```

- [ ] **Step 5: Run — Expected: PASS.**
- [ ] **Step 6: Commit**

```bash
git add mods/BossSkillTracker/Model/ tests/BossSkillTracker.Tests/
git commit -m "feat(boss-skill-tracker): special-gate estimator with tests"
```

---

## Phase 3: IL2CPP read layer (in-game smoke)

> Uses `Il2Cpp.*`; not linked into tests. "Test" = build, deploy (close game first), launch, read `MelonLoader/Latest.log`.

### Task 8: Discovery DTOs

**Files:**
- Create: `mods/BossSkillTracker/Game/EnemyInfo.cs`

- [ ] **Step 1: Write the DTOs**

```csharp
using System.Collections.Generic;
using Il2Cpp;
using UnityEngine;
using BossSkillTracker.Model;

namespace BossSkillTracker.Game;

public sealed class TrackedSkill
{
    public int Index;             // index into Monster.skills.skills (>=1)
    public string Name = "";
    public Sprite? Icon;
    public float TotalCooldown;   // constant
}

public readonly struct LiveSkill
{
    public readonly double CooldownEnd;
    public readonly double CastTimeEnd;
    public LiveSkill(double cooldownEnd, double castTimeEnd) { CooldownEnd = cooldownEnd; CastTimeEnd = castTimeEnd; }
}

public sealed class EnemyInfo
{
    public uint NetId;
    public string Name = "";
    public Tier Tier;
    public Color TierColor;
    public Sprite? Portrait;
    public Monster Monster = null!;  // held for per-frame live reads
    public List<TrackedSkill> Skills = new();
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Game/EnemyInfo.cs
git commit -m "feat(boss-skill-tracker): discovery DTOs"
```

### Task 9: GameAccess

**Files:**
- Create: `mods/BossSkillTracker/Game/GameAccess.cs`

- [ ] **Step 1: Write GameAccess**

```csharp
using Il2Cpp;
using Il2CppMirror;
using UnityEngine;
using UnityEngine.SceneManagement;
using BossSkillTracker.Model;

namespace BossSkillTracker.Game;

public static class GameAccess
{
    public static bool InWorld => SceneManager.GetActiveScene().name == "World";
    public static Player? LocalPlayer => Player.localPlayer;

    public static double ServerTime
    {
        get
        {
            var nm = NetworkManager.singleton != null ? NetworkManager.singleton.TryCast<NetworkManagerMMO>() : null;
            return nm != null ? NetworkTime.time + nm.offsetNetworkTime : NetworkTime.time;
        }
    }

    public static Entity? Pet(Player lp)
    {
        // VERIFY field name at impl. uMMORPG exposes the active pet on the player; if the property
        // differs, return null here (pet aggro simply won't be considered until corrected).
        var pet = lp.activePet;
        return pet != null ? pet : null;
    }

    public static bool InCombat(Player lp, double now)
    {
        if (lp.lastCombatTime + Tuning.CombatGraceSeconds > now) return true;
        var pet = Pet(lp);
        return pet != null && pet.lastCombatTime + Tuning.CombatGraceSeconds > now;
    }

    public static Tier? TierOf(Monster m)
    {
        if (m.isBoss) return Tier.Boss;
        if (m.isFabled) return Tier.Fabled;
        if (m.isElite) return Tier.Elite;
        return null;
    }

    public static Color TierColor(Tier tier) => tier switch
    {
        Tier.Boss => Utils.bossMonsterColor,
        Tier.Fabled => Utils.fabledMonsterColor,
        Tier.Elite => Utils.eliteMonsterColor,
        _ => Color.white,
    };

    public static Sprite? Portrait(Monster m)
    {
        if (m.portraitBoss != null) return m.portraitBoss;
        if (m.imageBossBestiary != null) return m.imageBossBestiary;
        var sr = m.gameObject != null ? m.gameObject.GetComponent<SpriteRenderer>() : null;
        return sr != null ? sr.sprite : null;
    }
}
```

> VERIFY at impl: `lp.activePet` (Player's current pet — fall back to `null` if the member name differs), `NetworkManagerMMO.offsetNetworkTime` (BossTracker uses it), and `Utils.*MonsterColor` accessibility (if inaccessible, hardcode `new Color32(231,153,51,255)` etc. — values are in `Utils.cs`).

- [ ] **Step 2: Temporary smoke in `OnUpdate`** (throttled), build+deploy

```csharp
private float _t;
public override void OnUpdate()
{
    if (!Game.GameAccess.InWorld) return;
    _t += Time.deltaTime; if (_t < 1f) return; _t = 0f;
    var lp = Game.GameAccess.LocalPlayer; if (lp == null) return;
    LoggerInstance.Msg($"[smoke] now={Game.GameAccess.ServerTime:F1} inCombat={Game.GameAccess.InCombat(lp, Game.GameAccess.ServerTime)} myNet={lp.netId}");
}
```

Run: `dotnet run --project build-tool build && dotnet run --project build-tool deploy`

- [ ] **Step 3: Launch, verify** `inCombat` flips true when you attack a monster and back to false ~3s after combat. Server time is plausible/non-zero.
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/Game/GameAccess.cs mods/BossSkillTracker/BossSkillTrackerMod.cs
git commit -m "feat(boss-skill-tracker): GameAccess (combat gate, server time, tier, portrait) + smoke"
```

### Task 10: SkillReader

**Files:**
- Create: `mods/BossSkillTracker/Game/SkillReader.cs`

- [ ] **Step 1: Write SkillReader**

```csharp
using System.Collections.Generic;
using Il2Cpp;

namespace BossSkillTracker.Game;

public static class SkillReader
{
    public static bool HasTrackable(Monster m)
    {
        var s = m.skills; if (s == null || s.skills == null) return false;
        for (int i = 1; i < s.skills.Count; i++)
        {
            var data = s.skills[i].data;
            if (data != null && !IsNonCastable(data)) return true;
        }
        return false;
    }

    public static void ReadTrackable(Monster m, List<TrackedSkill> into)
    {
        into.Clear();
        var s = m.skills; if (s == null || s.skills == null) return;
        for (int i = 1; i < s.skills.Count; i++)
        {
            Skill sk = s.skills[i];
            var data = sk.data;
            if (data == null || IsNonCastable(data)) continue;
            into.Add(new TrackedSkill { Index = i, Name = sk.name, Icon = sk.image, TotalCooldown = sk.cooldown });
        }
    }

    public static int CurrentSkill(Monster m) => m.skills != null ? m.skills.currentSkill : -1;
    public static bool IsCasting(Monster m) => m.state == "CASTING";

    public static LiveSkill ReadLive(Monster m, int index)
    {
        Skill sk = m.skills.skills[index];
        return new LiveSkill(sk.cooldownEnd, sk.castTimeEnd);
    }

    private static bool IsNonCastable(ScriptableSkill data)
    {
        if (data.TryCast<PassiveSkill>() != null) return true;
        var ab = data.TryCast<AreaBuffSkill>(); if (ab != null && ab.isAura) return true;
        var ad = data.TryCast<AreaDebuffSkill>(); if (ad != null && ad.isAura) return true;
        return false;
    }
}
```

> VERIFY at impl: `s.skills[i]` yields a usable `Skill` struct and `.cooldownEnd/.castTimeEnd/.image/.cooldown/.name/.data` are readable (the stock `UICastBarMonster` reads the same struct client-side). If the value-type indexer is awkward in Il2CppInterop, copy to a local (`Skill sk = s.skills[i];`) first — already done above.

- [ ] **Step 2: Extend smoke** to dump trackable skills of the first engaged tracked monster, build+deploy

```csharp
foreach (var mm in UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.Monster>())) // smoke only; replaced by OverlapCircle in Task 11
{
    var m2 = mm.Cast<Il2Cpp.Monster>();
    if (Game.GameAccess.TierOf(m2) == null || m2.health == null || m2.health.current <= 0) continue;
    if (!m2.aggroList.ContainsKey(lp.netId)) continue;
    var list = new System.Collections.Generic.List<Game.TrackedSkill>();
    Game.SkillReader.ReadTrackable(m2, list);
    LoggerInstance.Msg($"[smoke] {m2.nameEntity}: {list.Count} trackable");
    foreach (var s in list) LoggerInstance.Msg($"    [{s.Index}] {s.Name} cd={s.TotalCooldown}");
    break;
}
```

Run: `dotnet run --project build-tool build && dotnet run --project build-tool deploy`

- [ ] **Step 3: Launch, engage Seraphax (Temple of Valaark) or any boss/elite, verify** the printed skills + cooldowns match `exported-data` (Seraphax → 6 trackable: Divine Surge 30, Veil of Penance 45, Blessing of Seraphax 90, Summon Player 10, Strong Knockback 30, Fear 50; basic Dragon Claw excluded).
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/Game/SkillReader.cs mods/BossSkillTracker/BossSkillTrackerMod.cs
git commit -m "feat(boss-skill-tracker): trackable + live skill reader + smoke"
```

### Task 11: EnemyDiscovery (combat-gated OverlapCircle)

**Files:**
- Create: `mods/BossSkillTracker/Game/EnemyDiscovery.cs`

- [ ] **Step 1: Write EnemyDiscovery**

```csharp
using System.Collections.Generic;
using Il2Cpp;
using UnityEngine;
using BossSkillTracker.Model;

namespace BossSkillTracker.Game;

public sealed class EnemyDiscovery
{
    private readonly Collider2D[] _buffer = new Collider2D[Tuning.OverlapBufferSize];

    /// Fills 'into' (reused by caller) with relevant enemies. Returns false (and leaves 'into' empty)
    /// when not in combat — the expensive query is skipped entirely.
    public bool Discover(double now, List<EnemyInfo> into)
    {
        into.Clear();
        var lp = GameAccess.LocalPlayer;
        if (lp == null || !GameAccess.InCombat(lp, now)) return false;

        uint myNet = lp.netId;
        var pet = GameAccess.Pet(lp);
        uint petNet = pet != null ? pet.netId : 0u;

        // Bounded spatial query — the game's own monster ContactFilter2D + a reused buffer.
        int n = Physics2D.OverlapCircle(lp.transform.position, Tuning.DiscoveryRadius, GameManager.monsterFilter, _buffer);
        for (int i = 0; i < n; i++)
        {
            var col = _buffer[i]; if (col == null) continue;
            var m = col.GetComponentInParent<Monster>(); if (m == null) continue;

            var tier = GameAccess.TierOf(m); if (tier == null) continue;
            bool alive = m.health != null && m.health.current > 0;
            bool engaged = m.aggroList != null && (m.aggroList.ContainsKey(myNet) || (petNet != 0 && m.aggroList.ContainsKey(petNet)));
            if (!RelevanceFilter.ShouldTrack(m.isBoss, m.isElite, m.isFabled, alive, engaged, SkillReader.HasTrackable(m) ? 1 : 0))
                continue;
            if (ContainsNetId(into, m.netId)) continue; // OverlapCircle may return several colliders per monster

            var info = new EnemyInfo
            {
                NetId = m.netId, Name = m.nameEntity, Tier = tier.Value,
                TierColor = GameAccess.TierColor(tier.Value), Portrait = GameAccess.Portrait(m), Monster = m,
            };
            SkillReader.ReadTrackable(m, info.Skills);
            into.Add(info);
        }
        return true;
    }

    private static bool ContainsNetId(List<EnemyInfo> list, uint netId)
    {
        for (int i = 0; i < list.Count; i++) if (list[i].NetId == netId) return true;
        return false;
    }
}
```

> VERIFY at impl: `GameManager.monsterFilter` is a `ContactFilter2D` (it is used exactly this way in `Monster.cs`). If inaccessible, build a `ContactFilter2D` from the monster `LayerMask` instead — isolated to this one call.

- [ ] **Step 2: Replace smoke** with discovery output, build+deploy

```csharp
private readonly Game.EnemyDiscovery _disc = new();
private readonly System.Collections.Generic.List<Game.EnemyInfo> _enemies = new();
// in throttled smoke block:
if (_disc.Discover(Game.GameAccess.ServerTime, _enemies))
{
    LoggerInstance.Msg($"[smoke] relevant = {_enemies.Count}");
    foreach (var e in _enemies) LoggerInstance.Msg($"    {e.Name} ({e.Tier}) skills={e.Skills.Count}");
}
```

Run: `dotnet run --project build-tool build && dotnet run --project build-tool deploy`

- [ ] **Step 3: Launch, verify relevance + performance:** engaging a boss lists exactly it; idle/exploring logs nothing (combat gate); a boss fighting only another player is absent; pulling two elites lists two. Confirm no frame hitches while roaming a dense area (no enumeration out of combat).
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/Game/EnemyDiscovery.cs mods/BossSkillTracker/BossSkillTrackerMod.cs
git commit -m "feat(boss-skill-tracker): combat-gated OverlapCircle discovery + smoke"
```

---

## Phase 4: Flat uGUI layer (in-game smoke)

### Task 12: Theme + shared white sprite

**Files:**
- Create: `mods/BossSkillTracker/Ui/Theme.cs`

- [ ] **Step 1: Write Theme** (colors only; all sizes live in `Tuning`)

```csharp
using UnityEngine;
namespace BossSkillTracker.Ui;

public static class Theme
{
    public static readonly Color Panel       = new(0.047f, 0.059f, 0.082f, 0.95f);
    public static readonly Color Header       = new(0.063f, 0.078f, 0.110f, 1f);
    public static readonly Color Line        = new(1f, 1f, 1f, 0.10f);
    public static readonly Color Track       = new(1f, 1f, 1f, 0.06f);
    public static readonly Color Steel       = new(0.435f, 0.514f, 0.596f, 1f);
    public static readonly Color Ready       = new(0.906f, 0.698f, 0.290f, 1f);
    public static readonly Color Cast        = new(1f, 0.416f, 0.302f, 1f);
    public static readonly Color CastBg      = new(0.353f, 0.122f, 0.094f, 1f);
    public static readonly Color Text        = new(0.902f, 0.922f, 0.945f, 1f);
    public static readonly Color Muted       = new(0.545f, 0.592f, 0.647f, 1f);
    public static readonly Color Dim         = new(0.22f, 0.26f, 0.30f, 1f);
    public static readonly Color WindowZone  = new(1f, 0.416f, 0.302f, 0.26f);
    public static readonly Color Marker      = Color.white;
    public static readonly Color Transparent = new(0, 0, 0, 0);

    private static Sprite? _white;
    // One 1x1 white sprite shared by every flat Image (uGUI Image needs a sprite to draw).
    public static Sprite White
    {
        get
        {
            if (_white != null) return _white;
            var tex = new Texture2D(1, 1) { name = "BST_White" };
            tex.SetPixel(0, 0, Color.white); tex.Apply();
            _white = Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 100f);
            _white.hideFlags = HideFlags.HideAndDontSave;
            Object.DontDestroyOnLoad(_white);
            return _white;
        }
    }

    public static void Dispose()
    {
        if (_white == null) return;
        Object.Destroy(_white.texture); Object.Destroy(_white); _white = null;
    }
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Ui/Theme.cs
git commit -m "feat(boss-skill-tracker): theme colors + shared white sprite"
```

### Task 13: HudFactory + Label (concrete TMP→Text fallback)

**Files:**
- Create: `mods/BossSkillTracker/Ui/HudFactory.cs`

- [ ] **Step 1: Write HudFactory** (flat builders + a `Label` that wraps TMP, or falls back to `UI.Text`)

```csharp
using Il2CppInterop.Runtime;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public enum Align { Left, Right, Center }

/// Wraps either a TMP label (preferred) or a legacy UI.Text fallback behind one interface.
public sealed class Label
{
    public readonly GameObject Go;
    private readonly TextMeshProUGUI? _tmp;
    private readonly Text? _txt;
    public Label(GameObject go, TextMeshProUGUI tmp) { Go = go; _tmp = tmp; }
    public Label(GameObject go, Text txt) { Go = go; _txt = txt; }
    public RectTransform Rect => (RectTransform)Go.transform;
    public void SetActive(bool v) { if (Go.activeSelf != v) Go.SetActive(v); }
    public string Value { set { if (_tmp != null) { if (_tmp.text != value) _tmp.text = value; } else if (_txt!.text != value) _txt.text = value; } }
    public Color Color { set { if (_tmp != null) { if (_tmp.color != value) _tmp.color = value; } else if (_txt!.color != value) _txt.color = value; } }
}

public static class HudFactory
{
    private static TMP_FontAsset? _tmpFont;
    private static bool _fontResolved;
    private static Font? _legacyFont;

    private static TMP_FontAsset? TmpFont
    {
        get
        {
            if (_fontResolved) return _tmpFont;
            _fontResolved = true;
            var all = Resources.FindObjectsOfTypeAll(Il2CppType.Of<TMP_FontAsset>());
            if (all.Length > 0) _tmpFont = all[0].Cast<TMP_FontAsset>();
            return _tmpFont;
        }
    }

    private static Font LegacyFont
        => _legacyFont ??= (Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf")
                            ?? Resources.GetBuiltinResource<Font>("Arial.ttf"));

    public static GameObject Rect(string name, Transform parent)
    {
        var go = new GameObject(name); go.transform.SetParent(parent, false); go.AddComponent<RectTransform>();
        return go;
    }

    public static Image Box(string name, Transform parent, Color color)
    {
        var go = Rect(name, parent);
        var img = go.AddComponent<Image>();
        img.sprite = Theme.White; img.type = Image.Type.Simple; img.color = color; img.raycastTarget = false;
        return img;
    }

    public static Image Bar(string name, Transform parent, Color color)
    {
        var img = Box(name, parent, color);
        img.type = Image.Type.Filled; img.fillMethod = Image.FillMethod.Horizontal;
        img.fillOrigin = (int)Image.OriginHorizontal.Left; img.fillAmount = 0f;
        return img;
    }

    public static Image Icon(string name, Transform parent, Sprite? sprite)
    {
        var go = Rect(name, parent);
        var img = go.AddComponent<Image>();
        img.sprite = sprite; img.enabled = sprite != null; img.preserveAspect = true; img.raycastTarget = false;
        return img;
    }

    public static Label Label(string name, Transform parent, float size, Color color, Align align)
    {
        var go = Rect(name, parent);
        var font = TmpFont;
        if (font != null)
        {
            var t = go.AddComponent<TextMeshProUGUI>();
            t.font = font; t.fontSize = size; t.color = color; t.raycastTarget = false;
            t.enableWordWrapping = false; t.overflowMode = TextOverflowModes.Ellipsis;
            t.alignment = align switch { Align.Right => TextAlignmentOptions.Right, Align.Center => TextAlignmentOptions.Center, _ => TextAlignmentOptions.Left };
            return new Label(go, t);
        }
        var legacy = go.AddComponent<Text>();
        legacy.font = LegacyFont; legacy.fontSize = (int)size; legacy.color = color; legacy.raycastTarget = false;
        legacy.horizontalOverflow = HorizontalWrapMode.Overflow; legacy.verticalOverflow = VerticalWrapMode.Truncate;
        legacy.alignment = align switch { Align.Right => TextAnchor.MiddleRight, Align.Center => TextAnchor.MiddleCenter, _ => TextAnchor.MiddleLeft };
        return new Label(go, legacy);
    }

    public static RectTransform Stretch(Component c, Vector2 offMin, Vector2 offMax)
    {
        var rt = (RectTransform)c.transform; rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
        rt.offsetMin = offMin; rt.offsetMax = offMax; return rt;
    }

    public static RectTransform Place(Component c, Vector2 aMin, Vector2 aMax, Vector2 offMin, Vector2 offMax)
    {
        var rt = (RectTransform)c.transform; rt.anchorMin = aMin; rt.anchorMax = aMax;
        rt.offsetMin = offMin; rt.offsetMax = offMax; return rt;
    }
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Ui/HudFactory.cs
git commit -m "feat(boss-skill-tracker): flat uGUI factory + TMP/Text label fallback"
```

### Task 14: GateStripView

**Files:**
- Create: `mods/BossSkillTracker/Ui/GateStripView.cs`

- [ ] **Step 1: Write GateStripView** (track + locked fill + window zone + two ticks + marker + status/readout; geometry from `Tuning`)

```csharp
using System;
using UnityEngine;
using UnityEngine.UI;
using BossSkillTracker.Model;

namespace BossSkillTracker.Ui;

public sealed class GateStripView
{
    public readonly GameObject Root;
    private readonly Label _status, _readout;
    private readonly RectTransform _track;
    private readonly Image _lockedFill, _windowZone, _tickMin, _tickMax, _marker;

    private static readonly float Span = (float)Tuning.GateMax;          // strip domain 0..GateMax
    private static readonly float LockFrac = (float)(Tuning.GateMin / Tuning.GateMax);

    public GateStripView(Transform parent)
    {
        Root = HudFactory.Rect("Gate", parent);
        var label = HudFactory.Label("label", Root.transform, Tuning.SmallSize, Theme.Muted, Align.Left);
        label.Value = "next special";
        HudFactory.Place(label.Go.GetComponent<RectTransform>(), new(0,1), new(0.5f,1), new(Tuning.Pad,-18), new(0,-4));

        _status = HudFactory.Label("status", Root.transform, Tuning.SmallSize, Theme.Muted, Align.Right);
        HudFactory.Place(_status.Go.GetComponent<RectTransform>(), new(0.45f,1), new(0.78f,1), new(0,-18), new(0,-4));
        _readout = HudFactory.Label("readout", Root.transform, Tuning.SmallSize, Theme.Text, Align.Right);
        HudFactory.Place(_readout.Go.GetComponent<RectTransform>(), new(0.6f,1), new(1,1), new(0,-32), new(-Tuning.Pad,-18));

        var track = HudFactory.Box("track", Root.transform, Theme.Track);
        _track = HudFactory.Place(track, new(0,1), new(1,1), new(Tuning.Pad,-48), new(-Tuning.Pad,-34));

        _lockedFill = HudFactory.Box("locked", track.transform, Theme.Steel);
        _windowZone = HudFactory.Box("window", track.transform, Theme.WindowZone);
        _tickMin = HudFactory.Box("tickMin", track.transform, Theme.Marker);
        _tickMax = HudFactory.Box("tickMax", track.transform, Theme.Marker);
        _marker  = HudFactory.Box("marker", track.transform, Theme.Marker);
    }

    public void Update(GateVm gate, double now)
    {
        bool win = gate.Status is GateStatus.Locked or GateStatus.Armed or GateStatus.Idle;
        _windowZone.gameObject.SetActive(win); _tickMin.gameObject.SetActive(win);
        _tickMax.gameObject.SetActive(win); _marker.gameObject.SetActive(win);

        float w = _track.rect.width;
        if (win)
        {
            PlaceX(_windowZone, w * LockFrac, w * (1f - LockFrac));
            PlaceX(_tickMin, w * LockFrac - 1f, 2f);
            PlaceX(_tickMax, w - 2f, 2f);
        }

        switch (gate.Status)
        {
            case GateStatus.Warmup:  _status.Value = "WARMUP";  _readout.Value = "basics only"; WidthFrac(_lockedFill, 0f); break;
            case GateStatus.Unknown: _status.Value = "—";       _readout.Value = "no special seen"; WidthFrac(_lockedFill, 0f); break;
            default:
                double e = now - (gate.WindowStart - Tuning.GateMin); // seconds since castEnd
                WidthFrac(_lockedFill, Mathf.Clamp01((float)(Math.Min(e, Tuning.GateMin) / Span)));
                PlaceX(_marker, w * Mathf.Clamp01((float)(e / Span)) - 1f, 2f);
                if (gate.Status == GateStatus.Locked) { _status.Value = "LOCKED"; _readout.Value = $"in {gate.WindowStart - now:0.#}-{gate.WindowEnd - now:0.#}s"; }
                else if (gate.Status == GateStatus.Armed) { _status.Value = "ARMED"; _readout.Value = now < gate.WindowEnd ? $"<= {gate.WindowEnd - now:0.#}s" : "any moment"; }
                else { _status.Value = "IDLE"; _readout.Value = "no skill ready"; }
                break;
        }
    }

    private static void WidthFrac(Image img, float frac)
    {
        var rt = (RectTransform)img.transform;
        rt.anchorMin = new(0,0); rt.anchorMax = new(frac,1); rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
    }
    private static void PlaceX(Image img, float x, float width)
    {
        var rt = (RectTransform)img.transform;
        rt.anchorMin = new(0,0); rt.anchorMax = new(0,1); rt.offsetMin = new(x,0); rt.offsetMax = new(x+width,0);
    }
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Ui/GateStripView.cs
git commit -m "feat(boss-skill-tracker): flat gate strip view"
```

### Task 15: RowView

**Files:**
- Create: `mods/BossSkillTracker/Ui/RowView.cs`

- [ ] **Step 1: Write RowView** (icon + name + cd bar + state; compact resizes via `Tuning`)

```csharp
using UnityEngine;
using UnityEngine.UI;
using BossSkillTracker.Game;
using BossSkillTracker.Model;

namespace BossSkillTracker.Ui;

public sealed class RowView
{
    public readonly GameObject Root;
    public int SkillIndex { get; private set; }
    private float _totalCooldown;
    private readonly Image _bg, _icon, _cdFill;
    private readonly Label _name, _state;

    public RowView(Transform parent)
    {
        Root = HudFactory.Rect("Row", parent);
        _bg = HudFactory.Box("bg", Root.transform, Theme.Transparent);
        HudFactory.Stretch(_bg, Vector2.zero, Vector2.zero);

        _icon = HudFactory.Icon("icon", Root.transform, null);
        _name = HudFactory.Label("name", Root.transform, Tuning.RowNameSize, Theme.Text, Align.Left);
        var track = HudFactory.Box("cdtrack", Root.transform, Theme.Track);
        _cdFill = HudFactory.Bar("cdfill", track.transform, Theme.Steel);
        HudFactory.Stretch(_cdFill, Vector2.zero, Vector2.zero);
        _state = HudFactory.Label("state", Root.transform, Tuning.StateSize, Theme.Text, Align.Right);
        // positions are applied in Layout() so compact can re-place them
    }

    public void Bind(TrackedSkill s)
    {
        SkillIndex = s.Index; _totalCooldown = s.TotalCooldown;
        _icon.sprite = s.Icon; _icon.enabled = s.Icon != null;
        _name.Value = s.Name;
    }

    public void Layout(bool compact)
    {
        float icon = compact ? Tuning.IconSizeCompact : Tuning.IconSize;
        HudFactory.Place(_icon, new(0,0.5f), new(0,0.5f), new(Tuning.Pad, -icon/2), new(Tuning.Pad + icon, icon/2));
        _name.SetActive(!compact);
        _state.SetActive(!compact);
        float left = Tuning.Pad + icon + 6f;
        if (compact)
        {
            HudFactory.Place((Image)_cdFill.transform.parent.GetComponent<Image>(), new(0,0.5f), new(1,0.5f), new(left,-3), new(-Tuning.Pad,3));
        }
        else
        {
            HudFactory.Place(_name.Go.GetComponent<RectTransform>(), new(0,0.5f), new(1,1), new(left,-2), new(-46,-2));
            HudFactory.Place((Image)_cdFill.transform.parent.GetComponent<Image>(), new(0,0), new(1,0.5f), new(left,Tuning.Pad), new(-46,12));
            HudFactory.Place(_state.Go.GetComponent<RectTransform>(), new(1,0.5f), new(1,0.5f), new(-44,-9), new(-Tuning.Pad,9));
        }
    }

    public void Update(LiveSkill live, bool casting, double now)
    {
        bool ready = CooldownMath.IsReady(live.CooldownEnd, now);
        _bg.color = casting ? Theme.CastBg : Theme.Transparent;
        var fill = casting ? Theme.Cast : ready ? Theme.Ready : Theme.Steel;
        if (_cdFill.color != fill) _cdFill.color = fill;
        float amt = casting ? 1f : CooldownMath.Fill(live.CooldownEnd, _totalCooldown, now);
        if (!Mathf.Approximately(_cdFill.fillAmount, amt)) _cdFill.fillAmount = amt;
        _name.Color = casting ? Theme.Cast : Theme.Text;
        _state.Value = casting ? "cast" : ready ? "ready" : $"{CooldownMath.Remaining(live.CooldownEnd, now):0.#}s";
        _state.Color = casting || ready ? Theme.Ready : Theme.Text;
    }
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Ui/RowView.cs
git commit -m "feat(boss-skill-tracker): ability row view with real compact layout"
```

### Task 16: GroupView (live reads + estimator + real compact)

**Files:**
- Create: `mods/BossSkillTracker/Ui/GroupView.cs`

- [ ] **Step 1: Write GroupView**

```csharp
using System.Collections.Generic;
using UnityEngine;
using BossSkillTracker.Game;
using BossSkillTracker.Model;

namespace BossSkillTracker.Ui;

public sealed class GroupView
{
    public readonly uint NetId;
    public readonly GameObject Root;
    public RectTransform HeaderRect { get; }

    private readonly Monster _monster;
    private readonly Image _portrait;
    private readonly Label _name;
    private readonly GateStripView _gate;
    private readonly Transform _rowsParent;
    private readonly List<RowView> _rows = new();
    private readonly SpecialGateEstimator _estimator = new();

    public GroupView(Transform parent, EnemyInfo info)
    {
        NetId = info.NetId; _monster = info.Monster;
        Root = HudFactory.Rect($"Group_{info.NetId}", parent);
        var bg = HudFactory.Box("bg", Root.transform, Theme.Panel);
        HudFactory.Stretch(bg, Vector2.zero, Vector2.zero);

        var header = HudFactory.Box("header", Root.transform, Theme.Header);
        HeaderRect = HudFactory.Place(header, new(0,1), new(1,1), new(0,-Tuning.HeaderHeight), new(0,0));
        var stripe = HudFactory.Box("stripe", Root.transform, info.TierColor);
        HudFactory.Place(stripe, new(0,1), new(1,1), new(0,-2), new(0,0));

        _portrait = HudFactory.Icon("portrait", header.transform, info.Portrait);
        HudFactory.Place(_portrait, new(0,0.5f), new(0,0.5f), new(Tuning.Pad,-16), new(Tuning.Pad+32,16));
        _name = HudFactory.Label("name", header.transform, Tuning.NameSize, info.TierColor, Align.Left);
        HudFactory.Place(_name.Go.GetComponent<RectTransform>(), new(0,0), new(1,1), new(Tuning.Pad+38,0), new(-72,0));

        _gate = new GateStripView(Root.transform);
        HudFactory.Place(_gate.Root.GetComponent<RectTransform>(), new(0,1), new(1,1),
            new(0, -(Tuning.HeaderHeight + Tuning.GateHeight)), new(0, -Tuning.HeaderHeight));

        _rowsParent = HudFactory.Rect("rows", Root.transform).transform;
        HudFactory.Place(_rowsParent.GetComponent<RectTransform>(), new(0,0), new(1,1), Vector2.zero, new(0, -(Tuning.HeaderHeight + Tuning.GateHeight)));

        // rows sorted once by total cooldown (descending), stable
        var order = SkillOrdering.ByCooldownDesc(info.Skills.ConvertAll(s => s.TotalCooldown));
        foreach (var idx in order)
        {
            var row = new RowView(_rowsParent);
            row.Bind(info.Skills[idx]);
            _rows.Add(row);
        }
    }

    public float Height(bool compact)
    {
        float rowH = compact ? Tuning.RowHeightCompact : Tuning.RowHeight;
        return Tuning.HeaderHeight + Tuning.GateHeight + _rows.Count * rowH + Tuning.Pad;
    }

    public void Layout(bool compact)
    {
        float rowH = compact ? Tuning.RowHeightCompact : Tuning.RowHeight;
        for (int i = 0; i < _rows.Count; i++)
        {
            HudFactory.Place(_rows[i].Root.GetComponent<RectTransform>(), new(0,1), new(1,1),
                new(Tuning.Pad, -((i + 1) * rowH)), new(-Tuning.Pad, -(i * rowH)));
            _rows[i].Layout(compact);
        }
    }

    public void UpdateLive(double now, bool compact)
    {
        if (_monster == null) return; // despawned; next discovery drops this group

        int cur = SkillReader.CurrentSkill(_monster);
        bool casting = SkillReader.IsCasting(_monster);
        int skillCount = _monster.skills != null && _monster.skills.skills != null ? _monster.skills.skills.Count : 0;
        bool currentIsSpecial = cur >= 1 && cur < skillCount;
        double castEnd = currentIsSpecial ? SkillReader.ReadLive(_monster, cur).CastTimeEnd : 0;

        bool anyReady = false;
        foreach (var row in _rows)
        {
            var live = SkillReader.ReadLive(_monster, row.SkillIndex);
            if (CooldownMath.IsReady(live.CooldownEnd, now)) anyReady = true;
            row.Update(live, casting && cur == row.SkillIndex, now);
        }

        _estimator.Observe(now, engaged: true, cur, casting, currentIsSpecial, castEnd);
        _gate.Update(_estimator.Evaluate(now, anyReady), now);
    }

    public void Destroy() => Object.Destroy(Root);
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Ui/GroupView.cs
git commit -m "feat(boss-skill-tracker): group view (live reads, estimator, compact)"
```

### Task 17: ControlCluster (flat-image compact/grip/lock)

**Files:**
- Create: `mods/BossSkillTracker/Ui/ControlCluster.cs`

- [ ] **Step 1: Write ControlCluster** (controls composed from flat tinted Images — no glyphs/baking)

```csharp
using UnityEngine;
using UnityEngine.UI;
using BossSkillTracker.Model;

namespace BossSkillTracker.Ui;

// Panel-level controls at the top-right: [compact] [grip] [lock].
// Built from flat Images: grip = 6 dots; compact = 3 bars (expanded) / 1 bar (compact);
// lock = filled box (locked) / outline box (unlocked).
public sealed class ControlCluster
{
    public readonly RectTransform CompactRect, LockRect;
    private readonly GameObject[] _compactBars; // [0] always shown; [1],[2] only when expanded
    private readonly Image _lockFill;           // shown when locked
    private readonly GameObject _grip;

    public ControlCluster(Transform parent)
    {
        float s = Tuning.ControlIconSize, gap = 4f;
        // lock (rightmost)
        var lockBox = HudFactory.Box("lock", parent, Theme.Muted);
        LockRect = HudFactory.Place(lockBox, new(1,1), new(1,1), new(-s, -s - Tuning.Pad), new(0, -Tuning.Pad));
        var lockInner = HudFactory.Box("lockInner", lockBox.transform, Theme.Header); // outline look (unlocked)
        HudFactory.Stretch(lockInner, new(2,2), new(-2,-2));
        _lockFill = HudFactory.Box("lockFill", lockBox.transform, Theme.Ready);        // filled (locked)
        HudFactory.Stretch(_lockFill, new(3,3), new(-3,-3));

        // grip (6 dots) — visual drag affordance, not a click target
        _grip = HudFactory.Rect("grip", parent);
        var gripRt = HudFactory.Place(_grip.GetComponent<RectTransform>(), new(1,1), new(1,1), new(-2*s - gap, -s - Tuning.Pad), new(-s - gap, -Tuning.Pad));
        for (int c = 0; c < 2; c++)
            for (int r = 0; r < 3; r++)
            {
                var dot = HudFactory.Box("dot", _grip.transform, Theme.Muted);
                HudFactory.Place(dot, new(0,1), new(0,1), new(3 + c*6, -(3 + r*5) - 2), new(3 + c*6 + 2, -(3 + r*5)));
            }

        // compact (3 bars)
        var compact = HudFactory.Rect("compact", parent);
        CompactRect = HudFactory.Place(compact.GetComponent<RectTransform>(), new(1,1), new(1,1), new(-3*s - 2*gap, -s - Tuning.Pad), new(-2*s - 2*gap, -Tuning.Pad));
        _compactBars = new GameObject[3];
        for (int i = 0; i < 3; i++)
        {
            var bar = HudFactory.Box($"bar{i}", compact.transform, Theme.Muted);
            HudFactory.Place(bar, new(0,1), new(1,1), new(3, -(4 + i*5) - 2), new(-3, -(4 + i*5)));
            _compactBars[i] = bar.gameObject;
        }
    }

    public void SetLocked(bool locked)
    {
        _lockFill.gameObject.SetActive(locked);
        _grip.SetActive(!locked);
    }

    public void SetCompact(bool compact)
    {
        _compactBars[1].SetActive(!compact);
        _compactBars[2].SetActive(!compact);
    }
}
```

- [ ] **Step 2: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 3: Commit**

```bash
git add mods/BossSkillTracker/Ui/ControlCluster.cs
git commit -m "feat(boss-skill-tracker): flat-image control cluster (compact/grip/lock)"
```

### Task 18: Config + HudRoot (canvas, stable reconcile, pointer drag, click hit-testing, persist)

**Files:**
- Create: `mods/BossSkillTracker/Config.cs`
- Create: `mods/BossSkillTracker/Ui/HudRoot.cs`

- [ ] **Step 1: Write Config** (defaults from `Tuning`)

```csharp
using MelonLoader;
using BossSkillTracker.Model;

namespace BossSkillTracker;

public sealed class Config
{
    private readonly MelonPreferences_Category _cat;
    public readonly MelonPreferences_Entry<float> PanelX, PanelY;
    public readonly MelonPreferences_Entry<bool> Locked, Compact;

    public Config()
    {
        _cat = MelonPreferences.CreateCategory("BossSkillTracker");
        PanelX  = _cat.CreateEntry("PanelX", Tuning.PanelDefaultX, "Panel X");
        PanelY  = _cat.CreateEntry("PanelY", Tuning.PanelDefaultY, "Panel Y");
        Locked  = _cat.CreateEntry("Locked", false, "Lock position");
        Compact = _cat.CreateEntry("Compact", false, "Compact mode");
    }

    public void Save() => _cat.SaveToFile();
}
```

- [ ] **Step 2: Write HudRoot** (own Canvas; stable first-sighting reconcile; pointer-event header drag + click hit-testing — no EventSystem, no keyboard modifier; persist)

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.InputSystem;
using BossSkillTracker.Game;
using BossSkillTracker.Model;

namespace BossSkillTracker.Ui;

public sealed class HudRoot
{
    private readonly Config _cfg;
    private GameObject? _canvasGo;
    private Canvas? _canvas;
    private RectTransform? _panel;
    private ControlCluster? _controls;
    private readonly Dictionary<uint, GroupView> _groups = new();
    private readonly List<uint> _order = new();     // stable first-sighting order
    private bool _dragging;
    private Vector2 _grab;

    public HudRoot(Config cfg) => _cfg = cfg;

    private void EnsureCanvas()
    {
        if (_canvasGo != null) return;
        _canvasGo = new GameObject("BST_Canvas");
        Object.DontDestroyOnLoad(_canvasGo);
        _canvas = _canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        _canvas.sortingOrder = Tuning.CanvasSortingOrder;
        var scaler = _canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);

        var panelGo = HudFactory.Rect("BST_Panel", _canvasGo.transform);
        _panel = (RectTransform)panelGo.transform;
        _panel.anchorMin = new(1,0); _panel.anchorMax = new(1,0); _panel.pivot = new(1,0);
        _panel.anchoredPosition = new(_cfg.PanelX.Value, _cfg.PanelY.Value);
        _panel.sizeDelta = new(Tuning.PanelWidth, 0);

        _controls = new ControlCluster(_panel);
        _controls.SetLocked(_cfg.Locked.Value);
        _controls.SetCompact(_cfg.Compact.Value);
    }

    public void Reconcile(List<EnemyInfo> infos)
    {
        EnsureCanvas();
        var seen = new HashSet<uint>();
        foreach (var e in infos)
        {
            seen.Add(e.NetId);
            if (_groups.ContainsKey(e.NetId)) continue;
            var g = new GroupView(_panel!.transform, e);
            g.Layout(_cfg.Compact.Value);
            _groups[e.NetId] = g; _order.Add(e.NetId);   // append = stable order
        }
        for (int i = _order.Count - 1; i >= 0; i--)
        {
            var id = _order[i];
            if (seen.Contains(id)) continue;
            _groups[id].Destroy(); _groups.Remove(id); _order.RemoveAt(i);
        }
    }

    public void RenderTick(double now)
    {
        if (_panel == null) return;
        bool compact = _cfg.Compact.Value;
        float y = 0f;
        foreach (var id in _order)
        {
            var g = _groups[id];
            g.UpdateLive(now, compact);
            float h = g.Height(compact);
            var rt = g.Root.GetComponent<RectTransform>();
            rt.anchorMin = new(0,1); rt.anchorMax = new(1,1); rt.pivot = new(0.5f,1);
            rt.anchoredPosition = new(0, -y); rt.sizeDelta = new(0, h);
            y += h + Tuning.GroupSpacing;
        }
        _panel.sizeDelta = new(Tuning.PanelWidth, y);
        HandleInput();
    }

    private void HandleInput()
    {
        var mouse = Mouse.current; if (mouse == null || _panel == null || _canvas == null) return;
        Vector2 p = mouse.position.ReadValue();

        if (mouse.leftButton.wasPressedThisFrame)
        {
            // 1) control buttons (compact/lock) take priority
            if (Hit(_controls!.CompactRect, p)) { ToggleCompact(); return; }
            if (Hit(_controls!.LockRect, p)) { ToggleLock(); return; }
            // 2) drag from any group header (grip lives here too), unless locked
            if (!_cfg.Locked.Value)
                foreach (var id in _order)
                    if (Hit(_groups[id].HeaderRect, p)) { _dragging = true; _grab = p; break; }
        }
        if (_dragging && mouse.leftButton.isPressed)
        {
            float sf = _canvas.scaleFactor <= 0 ? 1f : _canvas.scaleFactor;
            _panel.anchoredPosition += (p - _grab) / sf; _grab = p;
        }
        if (_dragging && mouse.leftButton.wasReleasedThisFrame)
        {
            _dragging = false;
            _cfg.PanelX.Value = _panel.anchoredPosition.x; _cfg.PanelY.Value = _panel.anchoredPosition.y; _cfg.Save();
        }
    }

    private static bool Hit(RectTransform rt, Vector2 screenPoint)
        => RectTransformUtility.RectangleContainsScreenPoint(rt, screenPoint, null);

    private void ToggleCompact()
    {
        _cfg.Compact.Value = !_cfg.Compact.Value; _cfg.Save();
        _controls!.SetCompact(_cfg.Compact.Value);
        foreach (var id in _order) _groups[id].Layout(_cfg.Compact.Value);
    }

    private void ToggleLock()
    {
        _cfg.Locked.Value = !_cfg.Locked.Value; _cfg.Save();
        _controls!.SetLocked(_cfg.Locked.Value);
        if (_cfg.Locked.Value) _dragging = false;
    }

    public void SetVisible(bool v) { if (_canvasGo != null && _canvasGo.activeSelf != v) _canvasGo.SetActive(v); }

    public void Dispose()
    {
        foreach (var g in _groups.Values) g.Destroy();
        _groups.Clear(); _order.Clear();
        if (_canvasGo != null) Object.Destroy(_canvasGo);
        _canvasGo = null; _panel = null; _canvas = null; _controls = null;
        Theme.Dispose();
    }
}
```

- [ ] **Step 3: Build** — Run: `dotnet run --project build-tool build` — Expected: succeeds.
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/Config.cs mods/BossSkillTracker/Ui/HudRoot.cs
git commit -m "feat(boss-skill-tracker): config + HUD root (canvas, stable reconcile, pointer drag, controls)"
```

---

## Phase 5: Integration & end-to-end

### Task 19: Wire the loop

**Files:**
- Modify: `mods/BossSkillTracker/BossSkillTrackerMod.cs`

- [ ] **Step 1: Replace the entry with the real loop** (remove all temporary smoke logs)

```csharp
using System.Collections.Generic;
using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;
using BossSkillTracker.Game;
using BossSkillTracker.Model;
using BossSkillTracker.Ui;

[assembly: MelonInfo(typeof(BossSkillTracker.BossSkillTrackerMod), "BossSkillTracker", "0.1.0", "AncientKingdomsMods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossSkillTracker;

public sealed class BossSkillTrackerMod : MelonMod
{
    private Config _cfg = null!;
    private HudRoot _hud = null!;
    private EnemyDiscovery _discovery = null!;
    private readonly List<EnemyInfo> _enemies = new();
    private float _scanTimer;

    public override void OnInitializeMelon()
    {
        _cfg = new Config();
        _hud = new HudRoot(_cfg);
        _discovery = new EnemyDiscovery();
        LoggerInstance.Msg("BossSkillTracker initialized");
    }

    public override void OnUpdate()
    {
        if (!GameAccess.InWorld || GameAccess.LocalPlayer == null) { _hud.SetVisible(false); return; }
        double now = GameAccess.ServerTime;

        _scanTimer += Time.deltaTime;
        if (_scanTimer >= Tuning.ScanIntervalSeconds)
        {
            _scanTimer = 0f;
            bool inCombat = _discovery.Discover(now, _enemies); // false + empty when out of combat
            _hud.Reconcile(_enemies);
            _hud.SetVisible(inCombat && _enemies.Count > 0);
        }

        _hud.RenderTick(now);
    }

    public override void OnDeinitializeMelon() => _hud?.Dispose();

    public override void OnSceneWasUnloaded(int buildIndex, string sceneName)
    {
        if (sceneName == "World") _hud?.SetVisible(false);
    }
}
```

- [ ] **Step 2: Build + deploy** — Run: `dotnet run --project build-tool build && dotnet run --project build-tool deploy` (close game first)

- [ ] **Step 3: End-to-end acceptance walk-through** (see Acceptance Criteria). Verify on Seraphax (Temple of Valaark): group appears on aggro; rows sorted longest-cd first; cd bars + `ready`/`Ns`; CASTING flashes (including the 0.1 s Summon — confirms per-frame reads); gate cycles WARMUP→LOCKED→ARMED/IDLE with ticks + marker; pull a second elite → second group stacks in stable order, kill one → it disappears; **drag the panel by a header**, restart → position persists; click **compact** and **lock** buttons; out of combat → HUD hides; no exceptions in `MelonLoader/Latest.log`; no stutter roaming a dense zone (no out-of-combat enumeration).
- [ ] **Step 4: Commit**

```bash
git add mods/BossSkillTracker/BossSkillTrackerMod.cs
git commit -m "feat(boss-skill-tracker): wire combat-gated scan + per-frame render loop"
```

---

## Phase 6: Cleanup (gated on the end-to-end walk-through passing)

### Task 20: Gates, docs, final sweep

**Files:**
- Create: `mods/BossSkillTracker/CLAUDE.md`

- [ ] **Step 1: Run the logic suite** — Run: `dotnet test tests/BossSkillTracker.Tests/BossSkillTracker.Tests.csproj` — Expected: all green.
- [ ] **Step 2: Run repo gates** — Run: `lefthook run pre-commit` — fix any issues in files this plan created.
- [ ] **Step 3: Write `mods/BossSkillTracker/CLAUDE.md`** — purpose; the Model(Unity-free, tested)/Game/Ui split; the perf rules (combat-gate, OverlapCircle not FindObjectsOfType, per-frame live reads on held refs, all numbers in `Tuning`); the gate-estimator caveat (window estimated from observed casts).
- [ ] **Step 4: Final sweep** — grep the mod for `[smoke]` and `FindObjectsOfType`; remove any stray smoke logs. Run: `dotnet run --project build-tool build` — Expected: succeeds; neither token remains in committed code.
- [ ] **Step 5: Commit**

```bash
git add mods/BossSkillTracker/CLAUDE.md
git commit -m "docs(boss-skill-tracker): module guide + final cleanup"
```

---

## Self-Review (completed during authoring)

- **Spec coverage:** perf hot path (combat gate in `GameAccess.InCombat` + `EnemyDiscovery` OverlapCircle, Task 9/11), relevance incl. pet (RelevanceFilter + EnemyDiscovery, Task 6/11), per-skill cooldowns (CooldownMath + RowView), gate estimator (Task 7 + GateStripView), trackable filter (SkillReader), cooldown-desc sort (SkillOrdering + GroupView), tier color (GameAccess/Theme/GroupView), portrait chain (GameAccess), stable multi-group reconcile (HudRoot `_order`), on-screen drag + lock + compact (HudRoot + ControlCluster), real compact (RowView/GroupView Layout), no-magic-numbers (Tuning + Theme), scene gate + throttle + per-frame render (Mod), teardown/sprite lifetime (HudRoot/Theme). Every acceptance criterion maps to Task 19's walk-through.
- **Type consistency:** `EnemyInfo`/`TrackedSkill`/`LiveSkill` are produced by SkillReader/EnemyDiscovery and consumed by GroupView/RowView with matching members; `SpecialGateEstimator.Observe/Evaluate` signatures match between tests (Task 7) and `GroupView.UpdateLive` (Task 16); `GateVm.WindowStart/WindowEnd` used consistently in GateStripView; `Tuning.*` names referenced identically across logic, UI, and tests; `ControlCluster.CompactRect/LockRect` + `SetLocked/SetCompact` match HudRoot usage.
- **Corner-fix audit (vs the prior plan):** (1) drag = on-screen pointer-event header drag, not a keyboard modifier; (2) on-screen compact/grip/lock cluster with real handlers (no dead mount, no key shortcuts); (3) per-frame live reads split from 5 Hz discovery (catches the 0.1 s Summon cast); (4) real compact (re-layout + height); (5) stable first-sighting order via `_order`; (6) pet aggro in InCombat + relevance. Concrete TMP→`UI.Text` fallback in HudFactory. All present.
- **Verify-at-impl (flagged inline, each with a fallback):** `Skill` struct member access (Task 10), `lp.activePet` / `offsetNetworkTime` / `Utils.*` (Task 9), `GameManager.monsterFilter` as `ContactFilter2D` (Task 11), TMP font availability (Task 13). None are blockers.
- **Deferred (out of scope, per design):** likelihood pips, gradient/feather/glow visuals, party-member aggro, `TargetRpcBossEliteApproach` instant trigger, MelonPreferences exposure of `Tuning` knobs (YAGNI).
