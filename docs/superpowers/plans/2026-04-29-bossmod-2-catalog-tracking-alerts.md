# BossMod Plan 2 — Catalog + Tracking + Alert Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the data layer (catalog, snapshots), the live tracking adapter that reads Mirror SyncVars from `Monster` instances, the alert engine that emits events on cast/cooldown transitions, and the persistence pipeline that writes everything to `state.json`. All pure logic is unit-tested.

**Architecture:** Two projects: `mods/BossMod.Core` is a plain net6.0 library with **no IL2CPP references** (so it's testable on the host), holding all data types, pure functions, and the alert engine. `mods/BossMod` references it and adds IL2CPP-touching adapters (`Activation`, `MonsterWatcher`) that read live `Monster` SyncVars and produce `BossState` snapshots which feed into the core's pure logic.

**Tech Stack:** C# net6.0, System.Text.Json (already shipped with net6), xunit (host-side tests).

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Out of scope:** Audio, UI windows, ImGui rendering (covered in plans 1 + 3), Config Mode (plan 4).

**Depends on:** Plan 1 (renderer) committed. The renderer is independent of this plan's work, but plan 1's `mods/BossMod` project is the consumer of `BossMod.Core`.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod.Core/BossMod.Core.csproj` | Pure library, no IL2CPP refs, net6.0 | Create |
| `mods/BossMod.Core/Catalog/Enums.cs` | `ThreatTier`, `AlertTrigger`, `BossKind`, `DebuffKind`, `DamageType` | Create |
| `mods/BossMod.Core/Catalog/SkillSnapshot.cs` | Raw skill values | Create |
| `mods/BossMod.Core/Catalog/BossSkillSnapshot.cs` | Effective values per (boss, skill) | Create |
| `mods/BossMod.Core/Catalog/SkillRecord.cs` | Skill-level catalog entry | Create |
| `mods/BossMod.Core/Catalog/BossRecord.cs` | Boss-level catalog entry | Create |
| `mods/BossMod.Core/Catalog/BossSkillRecord.cs` | Per-(boss, skill) catalog entry | Create |
| `mods/BossMod.Core/Catalog/Thresholds.cs` | Tunable thresholds for ThreatClassifier | Create |
| `mods/BossMod.Core/Catalog/SkillCatalog.cs` | In-memory dictionaries + accessors | Create |
| `mods/BossMod.Core/Effects/EffectiveValues.cs` | Pure damage / cast / cooldown formulas | Create |
| `mods/BossMod.Core/Effects/ThreatClassifier.cs` | Pure threat-tier classifier | Create |
| `mods/BossMod.Core/Effects/SettingsResolver.cs` | Resolves boss → skill → tier-default chain | Create |
| `mods/BossMod.Core/Tracking/BossState.cs` | Per-frame snapshot (cast, cooldowns, buffs, hp, position) | Create |
| `mods/BossMod.Core/Tracking/CastInfo.cs`, `SkillCooldown.cs`, `BuffSnapshot.cs` | BossState building blocks | Create |
| `mods/BossMod.Core/Alerts/AlertEvent.cs` | Resolved event payload | Create |
| `mods/BossMod.Core/Alerts/AlertEngine.cs` | Edge detection + dedup + resolution | Create |
| `mods/BossMod.Core/Persistence/StateJson.cs` | Serialize/deserialize SkillCatalog + global settings | Create |
| `mods/BossMod.Core/Persistence/Globals.cs` | Global settings (thresholds, hotkeys, mute, etc.) | Create |
| `mods/BossMod/Tracking/Activation.cs` | Engaged ∪ Proximate gate (touches IL2CPP `Monster`) | Create |
| `mods/BossMod/Tracking/MonsterWatcher.cs` | Per-frame Monster scan, BossState build, catalog harvest | Create |
| `tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj` | xunit test project | Create |
| `tests/BossMod.Core.Tests/EffectiveValuesTests.cs` | Unit tests | Create |
| `tests/BossMod.Core.Tests/ThreatClassifierTests.cs` | Unit tests | Create |
| `tests/BossMod.Core.Tests/SettingsResolverTests.cs` | Unit tests | Create |
| `tests/BossMod.Core.Tests/AlertEngineTests.cs` | Unit tests | Create |
| `tests/BossMod.Core.Tests/SkillCatalogTests.cs` | Unit tests | Create |
| `tests/BossMod.Core.Tests/StateJsonTests.cs` | Unit tests | Create |
| `mods/BossMod/BossMod.csproj` | Add `<ProjectReference>` to BossMod.Core | Modify |
| `AncientKingdomsMods.sln` | Add Core + Tests projects | Modify |

---

## Task 1: Scaffold BossMod.Core library and tests project

**Files:**
- Create: `mods/BossMod.Core/BossMod.Core.csproj`
- Create: `tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj`
- Modify: `mods/BossMod/BossMod.csproj` (add ProjectReference)
- Modify: `AncientKingdomsMods.sln`

- [ ] **Step 1: Create `mods/BossMod.Core/BossMod.Core.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <AssemblyName>BossMod.Core</AssemblyName>
    <RootNamespace>BossMod.Core</RootNamespace>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

No package references — pure library, depends only on BCL. `System.Text.Json` ships with net6.

- [ ] **Step 2: Create `tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="../../mods/BossMod.Core/BossMod.Core.csproj" />
  </ItemGroup>
</Project>
```

> Note: tests target net10 (host-side runner) but reference a net6 library. .NET allows this — net10 host loads net6 assemblies fine.

- [ ] **Step 3: Add a ProjectReference from `mods/BossMod/BossMod.csproj` to BossMod.Core**

In `mods/BossMod/BossMod.csproj`, inside the existing `<ItemGroup>` that holds `PackageReference` items, add:

```xml
    <ProjectReference Include="../BossMod.Core/BossMod.Core.csproj">
      <Private>true</Private>
    </ProjectReference>
```

Also update `ILRepack.targets` to merge `BossMod.Core.dll` into the final `BossMod.dll`. In `mods/BossMod/ILRepack.targets`, after the `<MergeAssemblies>` for System.Numerics.Vectors, add:

```xml
      <MergeAssemblies Include="$(OutputPath)BossMod.Core.dll" />
```

- [ ] **Step 4: Add both projects to the solution**

```bash
dotnet sln AncientKingdomsMods.sln add mods/BossMod.Core/BossMod.Core.csproj
dotnet sln AncientKingdomsMods.sln add tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

- [ ] **Step 5: Verify build of all three**

```bash
dotnet build mods/BossMod.Core/BossMod.Core.csproj
dotnet build tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
```

Expected: all three succeed.

- [ ] **Step 6: Commit**

```bash
git add mods/BossMod.Core/ tests/BossMod.Core.Tests/ mods/BossMod/BossMod.csproj mods/BossMod/ILRepack.targets AncientKingdomsMods.sln
git commit -m "feat(bossmod): scaffold Core library + tests project"
```

---

## Task 2: Catalog enums + snapshots + records (data shapes only)

**Files:**
- Create: `mods/BossMod.Core/Catalog/Enums.cs`
- Create: `mods/BossMod.Core/Catalog/SkillSnapshot.cs`
- Create: `mods/BossMod.Core/Catalog/BossSkillSnapshot.cs`
- Create: `mods/BossMod.Core/Catalog/SkillRecord.cs`
- Create: `mods/BossMod.Core/Catalog/BossRecord.cs`
- Create: `mods/BossMod.Core/Catalog/BossSkillRecord.cs`
- Create: `mods/BossMod.Core/Catalog/Thresholds.cs`

Pure data shapes. No tests yet — testing data shapes is busy-work; downstream tests cover semantics.

- [ ] **Step 1: `mods/BossMod.Core/Catalog/Enums.cs`**

```csharp
namespace BossMod.Core.Catalog;

public enum ThreatTier { Low, Medium, High, Critical }
public enum AlertTrigger { CastStart, CastFinish, CooldownReady }
public enum BossKind { Boss, Elite, Fabled, WorldBoss }

public enum DamageType { Normal, Magic, Fire, Cold, Poison, Disease }

[System.Flags]
public enum DebuffKind
{
    None = 0,
    Stun = 1, Fear = 2, Blindness = 4, Mezz = 8,
    Poison = 16, Disease = 32, Fire = 64, Cold = 128
}
```

- [ ] **Step 2: `mods/BossMod.Core/Catalog/SkillSnapshot.cs`**

```csharp
namespace BossMod.Core.Catalog;

/// <summary>
/// Raw values harvested from a ScriptableSkill at a given level.
/// Caster-independent; same for any boss using this skill.
/// </summary>
public sealed class SkillSnapshot
{
    public string SkillClass { get; set; } = "";
    public bool IsSpell { get; set; }
    public bool IsAura { get; set; }

    public float CastTime { get; set; }
    public float Cooldown { get; set; }
    public float CastRange { get; set; }

    public int RawDamage { get; set; }
    public int RawMagicDamage { get; set; }
    public float DamagePercent { get; set; }
    public DamageType DamageType { get; set; }

    public float? AoeRadius { get; set; }
    public float? AoeDelay { get; set; }

    public DebuffKind Debuffs { get; set; }
    public float StunChance { get; set; }
    public float StunTime { get; set; }
    public float FearChance { get; set; }
    public float FearTime { get; set; }
}
```

- [ ] **Step 3: `mods/BossMod.Core/Catalog/BossSkillSnapshot.cs`**

```csharp
using System;

namespace BossMod.Core.Catalog;

/// <summary>
/// Effective values for a specific (boss, skill) pair. Includes caster's
/// damage bonuses, haste, etc. — i.e., what *this* boss would actually do.
/// </summary>
public sealed class BossSkillSnapshot
{
    public int OutgoingDamage { get; set; }
    public int OutgoingDamageMin { get; set; }
    public int OutgoingDamageMax { get; set; }

    public int AuraDpsApprox { get; set; }

    public float CastTimeEffective { get; set; }
    public float CooldownEffective { get; set; }

    public DateTime ComputedAtUtc { get; set; }
}
```

- [ ] **Step 4: `mods/BossMod.Core/Catalog/SkillRecord.cs`**

```csharp
using System;

namespace BossMod.Core.Catalog;

public sealed class SkillRecord
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public DateTime FirstSeenUtc { get; set; }
    public string LastSeenInBoss { get; set; } = "";

    public SkillSnapshot RawSnapshot { get; set; } = new();

    // Skill-level overrides — null means "fall through to defaults"
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? Muted { get; set; }
}
```

- [ ] **Step 5: `mods/BossMod.Core/Catalog/BossSkillRecord.cs`**

```csharp
using System;

namespace BossMod.Core.Catalog;

public sealed class BossSkillRecord
{
    public BossSkillSnapshot EffectiveSnapshot { get; set; } = new();
    public ThreatTier AutoThreat { get; set; } = ThreatTier.Low;

    // Boss-level overrides — wins over SkillRecord
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? Muted { get; set; }

    public DateTime LastObservedUtc { get; set; }
}
```

- [ ] **Step 6: `mods/BossMod.Core/Catalog/BossRecord.cs`**

```csharp
using System;
using System.Collections.Generic;

namespace BossMod.Core.Catalog;

public sealed class BossRecord
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Type { get; set; } = "";          // "Undead" / "Beast" / etc
    public string Class { get; set; } = "";          // "Warrior" / "Mage" / etc
    public string ZoneBestiary { get; set; } = "";  // primary group key in Bosses tab
    public BossKind Kind { get; set; } = BossKind.Boss;
    public int LastSeenLevel { get; set; }

    public DateTime FirstSeenUtc { get; set; }
    public DateTime LastSeenUtc { get; set; }

    public Dictionary<string, BossSkillRecord> Skills { get; set; } = new();
}
```

- [ ] **Step 7: `mods/BossMod.Core/Catalog/Thresholds.cs`**

```csharp
namespace BossMod.Core.Catalog;

/// <summary>
/// Tunable thresholds for the ThreatClassifier. Editable in Settings → General.
/// Defaults are indicative; actual values tuned during plan 4 E2E pass.
/// </summary>
public sealed class Thresholds
{
    public int CriticalDamage { get; set; } = 200;
    public int HighDamage { get; set; } = 80;
    public int AuraDpsHigh { get; set; } = 30;
    public float CriticalCastTime { get; set; } = 3.0f;

    public Thresholds Clone() => new()
    {
        CriticalDamage = CriticalDamage,
        HighDamage = HighDamage,
        AuraDpsHigh = AuraDpsHigh,
        CriticalCastTime = CriticalCastTime,
    };
}
```

- [ ] **Step 8: Build and commit**

```bash
dotnet build mods/BossMod.Core/BossMod.Core.csproj
git add mods/BossMod.Core/Catalog/
git commit -m "feat(bossmod): add catalog data types"
```

Expected build: succeeds with no warnings.

---

## Task 3: EffectiveValues pure functions (TDD)

**Files:**
- Create: `tests/BossMod.Core.Tests/EffectiveValuesTests.cs`
- Create: `mods/BossMod.Core/Effects/EffectiveValues.cs`

`EffectiveValues` is the formula bank locked in the spec — outgoing damage, aura DPS, effective cast time, effective cooldown. All pure, host-testable.

- [ ] **Step 1: Write failing tests**

`tests/BossMod.Core.Tests/EffectiveValuesTests.cs`:

```csharp
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class EffectiveValuesTests
{
    [Fact]
    public void OutgoingDamage_NormalDamage_AddsCasterDamageAndSkillDamage()
    {
        // Skill: 50 raw damage, no percent multiplier
        // Caster: 30 damage (combat.damage)
        // Expected: 30 + 50 = 80
        var d = EffectiveValues.OutgoingDamage(
            skillRawDamage: 50, skillRawMagicDamage: 0, damagePercent: 0,
            damageType: DamageType.Normal,
            casterDamage: 30, casterMagicDamage: 99 /* should not be used */);
        Assert.Equal(80, d);
    }

    [Theory]
    [InlineData(DamageType.Magic)]
    [InlineData(DamageType.Fire)]
    [InlineData(DamageType.Cold)]
    [InlineData(DamageType.Disease)]
    public void OutgoingDamage_MagicLikeTypes_UseCasterMagicDamage(DamageType type)
    {
        var d = EffectiveValues.OutgoingDamage(
            skillRawDamage: 99 /* not used */, skillRawMagicDamage: 50, damagePercent: 0,
            damageType: type,
            casterDamage: 99 /* not used */, casterMagicDamage: 30);
        Assert.Equal(80, d);
    }

    [Fact]
    public void OutgoingDamage_DamagePercentApplied_MultipliesAfterAddition()
    {
        // (30 + 50) * 1.5 = 120
        var d = EffectiveValues.OutgoingDamage(
            skillRawDamage: 50, skillRawMagicDamage: 0, damagePercent: 1.5f,
            damageType: DamageType.Normal,
            casterDamage: 30, casterMagicDamage: 0);
        Assert.Equal(120, d);
    }

    [Fact]
    public void OutgoingDamage_ZeroDamagePercent_IgnoredAsNotMultiplied()
    {
        // 0 percent means "no multiplier" — server-scripts treat <=0 as unset
        var d = EffectiveValues.OutgoingDamage(
            skillRawDamage: 50, skillRawMagicDamage: 0, damagePercent: 0f,
            damageType: DamageType.Normal,
            casterDamage: 30, casterMagicDamage: 0);
        Assert.Equal(80, d);
    }

    [Fact]
    public void OutgoingDamageRange_AppliesPlusMinus10Percent()
    {
        var (min, max) = EffectiveValues.OutgoingDamageRange(100);
        Assert.Equal(90, min);
        Assert.Equal(110, max);
    }

    [Fact]
    public void CastTimeEffective_NonSpell_IgnoresSpellHaste()
    {
        var t = EffectiveValues.CastTimeEffective(rawCastTime: 2.0f, isSpell: false, spellHasteBonus: 0.5f);
        Assert.Equal(2.0f, t);
    }

    [Fact]
    public void CastTimeEffective_Spell_ReducesByHasteFraction()
    {
        // 2.0 - 2.0 * 0.25 = 1.5
        var t = EffectiveValues.CastTimeEffective(rawCastTime: 2.0f, isSpell: true, spellHasteBonus: 0.25f);
        Assert.Equal(1.5f, t, 4);
    }

    [Fact]
    public void CooldownEffective_AppliesHasteFraction()
    {
        // 10 * (1 - 0.2) = 8
        var c = EffectiveValues.CooldownEffective(rawCooldown: 10f, hasteBonus: 0.2f);
        Assert.Equal(8f, c, 4);
    }

    [Fact]
    public void AuraDpsApprox_AbsoluteHpsPlusAttributeBonus()
    {
        // |healingPerSecondBonus| = 50, attribute = 100
        // base 50 + 100 * 0.004 * 50 = 50 + 20 = 70
        var d = EffectiveValues.AuraDpsApprox(healingPerSecondBonus: -50, casterAttribute: 100);
        Assert.Equal(70, d);
    }
}
```

- [ ] **Step 2: Run tests, expect failure**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Expected: all 9 fail (`EffectiveValues` does not exist yet).

- [ ] **Step 3: Implement `EffectiveValues`**

`mods/BossMod.Core/Effects/EffectiveValues.cs`:

```csharp
using System;
using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

/// <summary>
/// Pure formulas — no side effects, deterministic, no IL2CPP types.
/// Locked against server-scripts/Combat.cs and server-scripts/Skills.cs.
/// </summary>
public static class EffectiveValues
{
    public static int OutgoingDamage(
        int skillRawDamage, int skillRawMagicDamage,
        float damagePercent, DamageType damageType,
        int casterDamage, int casterMagicDamage)
    {
        int casterBase = damageType switch
        {
            DamageType.Magic or DamageType.Fire or DamageType.Cold or DamageType.Disease
                => casterMagicDamage,
            _ => casterDamage
        };
        // The skill's "raw damage" field maps to skillRawDamage for normal-type
        // skills and skillRawMagicDamage for magic-type — but server-scripts
        // doesn't distinguish: ScriptableSkill.damage is always the additive.
        // We pass skillRawDamage as the additive regardless; skillRawMagicDamage
        // is captured separately for display but not used in this formula.
        int raw = casterBase + skillRawDamage;
        return damagePercent > 0f
            ? (int)Math.Round(raw * damagePercent)
            : raw;
    }

    public static (int Min, int Max) OutgoingDamageRange(int outgoing) =>
        ((int)Math.Round(outgoing * 0.9f), (int)Math.Round(outgoing * 1.1f));

    public static float CastTimeEffective(float rawCastTime, bool isSpell, float spellHasteBonus) =>
        isSpell ? rawCastTime - rawCastTime * spellHasteBonus : rawCastTime;

    public static float CooldownEffective(float rawCooldown, float hasteBonus) =>
        rawCooldown * (1f - hasteBonus);

    /// <summary>
    /// Approximate aura/DoT-debuff DPS contribution. Mirrors the bonus formula in
    /// server-scripts/Skills.cs:GetHealthRecoveryBonus (lines 165-183).
    /// </summary>
    public static int AuraDpsApprox(int healingPerSecondBonus, int casterAttribute)
    {
        int abs = Math.Abs(healingPerSecondBonus);
        int bonus = (int)Math.Round(casterAttribute * 0.004f * abs);
        return abs + bonus;
    }
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~EffectiveValuesTests"
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add mods/BossMod.Core/Effects/EffectiveValues.cs tests/BossMod.Core.Tests/EffectiveValuesTests.cs
git commit -m "feat(bossmod): add EffectiveValues pure formulas with tests"
```

---

## Task 4: ThreatClassifier (TDD)

**Files:**
- Create: `tests/BossMod.Core.Tests/ThreatClassifierTests.cs`
- Create: `mods/BossMod.Core/Effects/ThreatClassifier.cs`

The classifier takes `(SkillSnapshot, BossSkillSnapshot, Thresholds)` and produces a `ThreatTier`. Specific rules will iterate during plan 4 E2E tuning; tests pin the architecturally-locked behavior (purity, threshold-respecting, aura support).

- [ ] **Step 1: Write failing tests**

`tests/BossMod.Core.Tests/ThreatClassifierTests.cs`:

```csharp
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class ThreatClassifierTests
{
    private static readonly Thresholds Default = new();

    private static (SkillSnapshot raw, BossSkillSnapshot eff) Make(
        string skillClass = "TargetDamageSkill",
        int outgoing = 0, int auraDps = 0, float castTime = 1.0f,
        DebuffKind debuffs = DebuffKind.None, bool isAura = false)
    {
        return (
            new SkillSnapshot
            {
                SkillClass = skillClass, CastTime = castTime,
                Debuffs = debuffs, IsAura = isAura
            },
            new BossSkillSnapshot
            {
                OutgoingDamage = outgoing, AuraDpsApprox = auraDps,
                CastTimeEffective = castTime
            });
    }

    [Fact]
    public void AreaDamage_AboveCriticalThreshold_IsCritical()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 250);
        Assert.Equal(ThreatTier.Critical, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void AreaDamage_BetweenHighAndCritical_IsHigh()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 100);
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void TargetDamage_BelowHigh_IsMedium()
    {
        var (r, e) = Make(skillClass: "TargetDamageSkill", outgoing: 50);
        Assert.Equal(ThreatTier.Medium, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void BuffSkill_NotAura_IsLow()
    {
        var (r, e) = Make(skillClass: "BuffSkill", outgoing: 0);
        Assert.Equal(ThreatTier.Low, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void LongCastTime_IsCritical()
    {
        // 4-second cast on otherwise low-damage skill still flags critical (telegraph)
        var (r, e) = Make(skillClass: "TargetDamageSkill", outgoing: 10, castTime: 4.0f);
        Assert.Equal(ThreatTier.Critical, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void StunDebuff_IsHigh()
    {
        var (r, e) = Make(skillClass: "TargetDebuffSkill", debuffs: DebuffKind.Stun);
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void AuraDpsAboveThreshold_IsHigh()
    {
        var (r, e) = Make(skillClass: "AreaBuffSkill", isAura: true, auraDps: 50);
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, Default));
    }

    [Fact]
    public void Classifier_IsPure_CallableTwiceWithSameResult()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 250);
        var a = ThreatClassifier.Classify(r, e, Default);
        var b = ThreatClassifier.Classify(r, e, Default);
        Assert.Equal(a, b);
    }

    [Fact]
    public void RaisingCriticalThreshold_DemotesPreviouslyCritical()
    {
        var (r, e) = Make(skillClass: "AreaDamageSkill", outgoing: 250);
        var stricter = new Thresholds { CriticalDamage = 500, HighDamage = 80 };
        Assert.Equal(ThreatTier.High, ThreatClassifier.Classify(r, e, stricter));
    }
}
```

- [ ] **Step 2: Run tests, expect failure**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~ThreatClassifierTests"
```

Expected: 9 fail.

- [ ] **Step 3: Implement `ThreatClassifier`**

`mods/BossMod.Core/Effects/ThreatClassifier.cs`:

```csharp
using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

/// <summary>
/// Classifies a skill into a ThreatTier based on its effective values + thresholds.
/// Pure, deterministic, no I/O. Tuning of thresholds happens via the Thresholds
/// argument; rules here are the architectural baseline locked in the spec.
/// </summary>
public static class ThreatClassifier
{
    public static ThreatTier Classify(SkillSnapshot raw, BossSkillSnapshot eff, Thresholds t)
    {
        // Critical: long-cast telegraph
        if (eff.CastTimeEffective >= t.CriticalCastTime)
            return ThreatTier.Critical;

        // Critical: heavy AOE damage
        bool isArea = raw.SkillClass is "AreaDamageSkill" or "AreaObjectSpawnSkill";
        if (isArea && eff.OutgoingDamage >= t.CriticalDamage)
            return ThreatTier.Critical;

        // High: hard CC debuffs
        if ((raw.Debuffs & (DebuffKind.Stun | DebuffKind.Fear | DebuffKind.Blindness | DebuffKind.Mezz)) != 0)
            return ThreatTier.High;

        // High: significant damage (any class)
        if (eff.OutgoingDamage >= t.HighDamage)
            return ThreatTier.High;

        // High: significant aura DPS
        if (raw.IsAura && eff.AuraDpsApprox >= t.AuraDpsHigh)
            return ThreatTier.High;

        // Medium: any debuff or single-target damage
        bool isDebuff = raw.SkillClass is "AreaDebuffSkill" or "TargetDebuffSkill";
        bool isDamage = raw.SkillClass is "AreaDamageSkill" or "TargetDamageSkill" or "TargetProjectileSkill" or "AreaObjectSpawnSkill";
        if (isDebuff || isDamage)
            return ThreatTier.Medium;

        // Low: buffs, passive auras, basics
        return ThreatTier.Low;
    }
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~ThreatClassifierTests"
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add mods/BossMod.Core/Effects/ThreatClassifier.cs tests/BossMod.Core.Tests/ThreatClassifierTests.cs
git commit -m "feat(bossmod): add ThreatClassifier with baseline rules"
```

---

## Task 5: SettingsResolver — boss → skill → tier-default chain (TDD)

**Files:**
- Create: `tests/BossMod.Core.Tests/SettingsResolverTests.cs`
- Create: `mods/BossMod.Core/Effects/SettingsResolver.cs`

Resolves the inheritance chain locked in the spec for `threat`, `sound`, `alert_text`, `fire_on`, `muted`. Defaults-for-tier come from a `TierDefaults` struct that the caller (Audio + Settings UI) supplies.

- [ ] **Step 1: Write failing tests**

`tests/BossMod.Core.Tests/SettingsResolverTests.cs`:

```csharp
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class SettingsResolverTests
{
    private static readonly TierDefaults Defaults = new()
    {
        LowSound = "low", MediumSound = "medium",
        HighSound = "high", CriticalSound = "critical"
    };

    private static (SkillRecord s, BossSkillRecord bs) Pair(
        ThreatTier auto = ThreatTier.Medium,
        ThreatTier? skillUser = null,
        ThreatTier? bossUser = null,
        string? skillSound = null, string? bossSound = null,
        string? skillText = null, string? bossText = null,
        AlertTrigger? skillFireOn = null, AlertTrigger? bossFireOn = null,
        bool? skillMuted = null, bool? bossMuted = null)
    {
        return (
            new SkillRecord
            {
                DisplayName = "TestSkill",
                UserThreat = skillUser, Sound = skillSound,
                AlertText = skillText, FireOn = skillFireOn, Muted = skillMuted,
            },
            new BossSkillRecord
            {
                AutoThreat = auto, UserThreat = bossUser, Sound = bossSound,
                AlertText = bossText, FireOn = bossFireOn, Muted = bossMuted,
            });
    }

    [Fact]
    public void Threat_BossOverrideWins()
    {
        var (s, b) = Pair(auto: ThreatTier.Low, skillUser: ThreatTier.Medium, bossUser: ThreatTier.Critical);
        Assert.Equal(ThreatTier.Critical, SettingsResolver.ResolveThreat(s, b));
    }

    [Fact]
    public void Threat_SkillOverrideWinsWhenBossIsNull()
    {
        var (s, b) = Pair(auto: ThreatTier.Low, skillUser: ThreatTier.Medium, bossUser: null);
        Assert.Equal(ThreatTier.Medium, SettingsResolver.ResolveThreat(s, b));
    }

    [Fact]
    public void Threat_AutoUsedWhenBothNull()
    {
        var (s, b) = Pair(auto: ThreatTier.High);
        Assert.Equal(ThreatTier.High, SettingsResolver.ResolveThreat(s, b));
    }

    [Fact]
    public void Sound_FallsThroughToTierDefault()
    {
        var (s, b) = Pair(auto: ThreatTier.Critical);
        Assert.Equal("critical", SettingsResolver.ResolveSound(s, b, Defaults));
    }

    [Fact]
    public void Sound_BossOverrideWins()
    {
        var (s, b) = Pair(auto: ThreatTier.Critical, skillSound: "skill_sound", bossSound: "boss_sound");
        Assert.Equal("boss_sound", SettingsResolver.ResolveSound(s, b, Defaults));
    }

    [Fact]
    public void AlertText_FallsThroughToDisplayNameWithBang()
    {
        var (s, b) = Pair();
        Assert.Equal("TestSkill!", SettingsResolver.ResolveAlertText(s, b, displayName: "TestSkill"));
    }

    [Fact]
    public void AlertText_EmptyStringPreserved_NotFallenThrough()
    {
        // User explicitly blanked the alert text — respect that.
        var (s, b) = Pair(skillText: "");
        Assert.Equal("", SettingsResolver.ResolveAlertText(s, b, displayName: "TestSkill"));
    }

    [Fact]
    public void FireOn_DefaultsToCastStart()
    {
        var (s, b) = Pair();
        Assert.Equal(AlertTrigger.CastStart, SettingsResolver.ResolveFireOn(s, b));
    }

    [Fact]
    public void Muted_DefaultsToFalse()
    {
        var (s, b) = Pair();
        Assert.False(SettingsResolver.ResolveMuted(s, b));
    }

    [Fact]
    public void Muted_BossWinsWhenSet()
    {
        var (s, b) = Pair(skillMuted: false, bossMuted: true);
        Assert.True(SettingsResolver.ResolveMuted(s, b));
    }
}
```

- [ ] **Step 2: Run, expect fail**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~SettingsResolverTests"
```

- [ ] **Step 3: Implement**

`mods/BossMod.Core/Effects/SettingsResolver.cs`:

```csharp
using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

public sealed class TierDefaults
{
    public string LowSound { get; set; } = "low";
    public string MediumSound { get; set; } = "medium";
    public string HighSound { get; set; } = "high";
    public string CriticalSound { get; set; } = "critical";

    public string SoundFor(ThreatTier tier) => tier switch
    {
        ThreatTier.Low => LowSound,
        ThreatTier.Medium => MediumSound,
        ThreatTier.High => HighSound,
        ThreatTier.Critical => CriticalSound,
        _ => LowSound,
    };
}

/// <summary>
/// Pure inheritance-chain resolver for per-skill settings.
/// Order: BossSkillRecord → SkillRecord → tier defaults / hard defaults.
/// </summary>
public static class SettingsResolver
{
    public static ThreatTier ResolveThreat(SkillRecord s, BossSkillRecord b) =>
        b.UserThreat ?? s.UserThreat ?? b.AutoThreat;

    public static string ResolveSound(SkillRecord s, BossSkillRecord b, TierDefaults defaults) =>
        b.Sound ?? s.Sound ?? defaults.SoundFor(ResolveThreat(s, b));

    public static string ResolveAlertText(SkillRecord s, BossSkillRecord b, string displayName) =>
        b.AlertText ?? s.AlertText ?? $"{displayName}!";

    public static AlertTrigger ResolveFireOn(SkillRecord s, BossSkillRecord b) =>
        b.FireOn ?? s.FireOn ?? AlertTrigger.CastStart;

    public static bool ResolveMuted(SkillRecord s, BossSkillRecord b) =>
        b.Muted ?? s.Muted ?? false;
}
```

- [ ] **Step 4: Run, expect green**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~SettingsResolverTests"
```

- [ ] **Step 5: Commit**

```bash
git add mods/BossMod.Core/Effects/SettingsResolver.cs tests/BossMod.Core.Tests/SettingsResolverTests.cs
git commit -m "feat(bossmod): add SettingsResolver inheritance chain"
```

---

## Task 6: BossState data shapes

**Files:**
- Create: `mods/BossMod.Core/Tracking/CastInfo.cs`
- Create: `mods/BossMod.Core/Tracking/SkillCooldown.cs`
- Create: `mods/BossMod.Core/Tracking/BuffSnapshot.cs`
- Create: `mods/BossMod.Core/Tracking/BossState.cs`

Plain value types describing one boss at one frame. Built by `MonsterWatcher` (Task 13), consumed by AlertEngine + UI windows.

- [ ] **Step 1: `mods/BossMod.Core/Tracking/CastInfo.cs`**

```csharp
namespace BossMod.Core.Tracking;

public readonly record struct CastInfo(
    int SkillIdx,
    string SkillId,
    string DisplayName,
    double CastTimeEnd,
    float TotalCastTime);
```

- [ ] **Step 2: `mods/BossMod.Core/Tracking/SkillCooldown.cs`**

```csharp
namespace BossMod.Core.Tracking;

public readonly record struct SkillCooldown(
    int SkillIdx,
    string SkillId,
    string DisplayName,
    double CooldownEnd,
    float TotalCooldown);
```

- [ ] **Step 3: `mods/BossMod.Core/Tracking/BuffSnapshot.cs`**

```csharp
namespace BossMod.Core.Tracking;

public readonly record struct BuffSnapshot(
    string SkillId,
    string DisplayName,
    double BuffTimeEnd,
    float TotalBuffTime,
    bool IsAura,
    bool IsDebuff);
```

- [ ] **Step 4: `mods/BossMod.Core/Tracking/BossState.cs`**

```csharp
using System.Collections.Generic;
using BossMod.Core.Catalog;

namespace BossMod.Core.Tracking;

/// <summary>
/// Snapshot of one tracked Monster at one frame. Plain data; built each frame
/// by MonsterWatcher from live SyncVars. Equality-by-value not required —
/// AlertEngine consumes pairs of (prev, curr) and diffs explicitly.
/// </summary>
public sealed class BossState
{
    public uint NetId { get; set; }
    public string BossId { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public int Level { get; set; }
    public BossKind Kind { get; set; }

    public float PositionX { get; set; }
    public float PositionY { get; set; }

    public int HealthCurrent { get; set; }
    public int HealthMax { get; set; }

    public CastInfo? ActiveCast { get; set; }
    public List<SkillCooldown> Cooldowns { get; set; } = new();
    public List<BuffSnapshot> Buffs { get; set; } = new();

    public double ServerTime { get; set; }

    public bool IsActive { get; set; }   // Engaged ∪ Proximate gate result
}
```

- [ ] **Step 5: Build and commit**

```bash
dotnet build mods/BossMod.Core/BossMod.Core.csproj
git add mods/BossMod.Core/Tracking/
git commit -m "feat(bossmod): add BossState data shapes"
```

---

## Task 7: AlertEvent

**Files:**
- Create: `mods/BossMod.Core/Alerts/AlertEvent.cs`

- [ ] **Step 1: Write the file**

```csharp
using BossMod.Core.Catalog;

namespace BossMod.Core.Alerts;

/// <summary>
/// Emitted by AlertEngine when an interesting transition occurs.
/// Resolved values (sound, text, threat) are baked in; consumers never re-resolve.
/// </summary>
public readonly record struct AlertEvent(
    AlertTrigger Trigger,
    uint MonsterNetId,
    string BossId,
    string BossDisplayName,
    string SkillId,
    string SkillDisplayName,
    ThreatTier EffectiveThreat,
    string EffectiveSound,
    string EffectiveAlertText,
    bool Muted,
    double ServerTimeAtEvent);
```

- [ ] **Step 2: Build and commit**

```bash
dotnet build mods/BossMod.Core/BossMod.Core.csproj
git add mods/BossMod.Core/Alerts/AlertEvent.cs
git commit -m "feat(bossmod): add AlertEvent record"
```

---

## Task 8: AlertEngine — edge detection + dedup + resolution (TDD)

**Files:**
- Create: `tests/BossMod.Core.Tests/AlertEngineTests.cs`
- Create: `mods/BossMod.Core/Alerts/AlertEngine.cs`

The engine consumes pairs of consecutive `BossState` snapshots per monster and emits `AlertEvent`s. Three triggers + dedup. Tests pin every transition rule from the spec.

- [ ] **Step 1: Write failing tests**

`tests/BossMod.Core.Tests/AlertEngineTests.cs`:

```csharp
using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Tracking;
using Xunit;

namespace BossMod.Core.Tests;

public class AlertEngineTests
{
    private const uint NetId = 42;
    private const string Boss = "infernal_skeleton";
    private const string Skill = "inferno_blast";

    private static SkillCatalog MakeCatalog(ThreatTier auto = ThreatTier.High)
    {
        var cat = new SkillCatalog();
        cat.Skills[Skill] = new SkillRecord { Id = Skill, DisplayName = "Inferno Blast" };
        cat.Bosses[Boss] = new BossRecord
        {
            Id = Boss, DisplayName = "Infernal Skeleton",
            Skills = { [Skill] = new BossSkillRecord { AutoThreat = auto } }
        };
        return cat;
    }

    private static BossState State(double now, CastInfo? cast = null, List<SkillCooldown>? cooldowns = null)
    {
        return new BossState
        {
            NetId = NetId, BossId = Boss, DisplayName = "Infernal Skeleton",
            ServerTime = now, ActiveCast = cast,
            Cooldowns = cooldowns ?? new List<SkillCooldown>()
        };
    }

    [Fact]
    public void CastStart_FiresOnce_WhenActiveCastTransitionsFromNull()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        var events = engine.Process(prev, curr).ToList();

        var e = Assert.Single(events);
        Assert.Equal(AlertTrigger.CastStart, e.Trigger);
        Assert.Equal(Skill, e.SkillId);
        Assert.Equal(ThreatTier.High, e.EffectiveThreat);
    }

    [Fact]
    public void CastStart_DoesNotFire_OnSubsequentFramesOfSameCast()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var s1 = State(now: 100);
        var s2 = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));
        var s3 = State(now: 100.15, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        engine.Process(s1, s2).ToList();
        var second = engine.Process(s2, s3).ToList();

        Assert.Empty(second);
    }

    [Fact]
    public void CastFinish_Fires_WhenCastEndsNaturally()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        // Cast ends at 103; current frame is at 103.1 (past the deadline)
        var prev = State(now: 102.99, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));
        var curr = State(now: 103.1, cast: null);

        var events = engine.Process(prev, curr).ToList();
        var e = Assert.Single(events);
        Assert.Equal(AlertTrigger.CastFinish, e.Trigger);
    }

    [Fact]
    public void CastFinish_DoesNotFire_WhenCastWasCanceled()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        // Skills.CancelCast sets castTimeEnd into the past; previous frame had a cast
        // with castTimeEnd in the past — that's the cancel signature.
        var prev = State(now: 102, cast: new CastInfo(1, Skill, "Inferno Blast", 100 /* deadline already past */, 3f));
        var curr = State(now: 102.1, cast: null);

        var events = engine.Process(prev, curr).ToList();
        Assert.Empty(events);
    }

    [Fact]
    public void CooldownReady_Fires_OnFirstFramePastDeadline()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var prev = State(now: 99.9, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var curr = State(now: 100.1, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });

        var events = engine.Process(prev, curr).ToList();
        var e = Assert.Single(events);
        Assert.Equal(AlertTrigger.CooldownReady, e.Trigger);
    }

    [Fact]
    public void CooldownReady_FiresOnce_PerCooldownInstance()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var s1 = State(now: 99.9, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var s2 = State(now: 100.1, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var s3 = State(now: 100.2, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });

        engine.Process(s1, s2).ToList();
        var second = engine.Process(s2, s3).ToList();

        Assert.Empty(second);
    }

    [Fact]
    public void CooldownReady_FiresAgain_AfterNewCooldownCycle()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var s1 = State(now: 99.9, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var s2 = State(now: 100.1, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        // Boss recasts, cooldown deadline moves forward
        var s3 = State(now: 110.0, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 122, 12f) });
        var s4 = State(now: 122.5, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 122, 12f) });

        engine.Process(s1, s2).ToList();
        engine.Process(s2, s3).ToList();
        var ready2 = engine.Process(s3, s4).ToList();

        var e = Assert.Single(ready2);
        Assert.Equal(AlertTrigger.CooldownReady, e.Trigger);
    }

    [Fact]
    public void Resolved_SoundAndTextAreBakedIntoEvent()
    {
        var cat = MakeCatalog();
        cat.Bosses[Boss].Skills[Skill].Sound = "klaxon";
        cat.Bosses[Boss].Skills[Skill].AlertText = "RUN";

        var engine = new AlertEngine(cat, new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        var e = Assert.Single(engine.Process(prev, curr).ToList());
        Assert.Equal("klaxon", e.EffectiveSound);
        Assert.Equal("RUN", e.EffectiveAlertText);
    }

    [Fact]
    public void UnknownSkill_DoesNotEmit()
    {
        // BossState refers to a skill not in the catalog; engine drops it silently.
        var engine = new AlertEngine(new SkillCatalog(), new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, "unknown_skill", "Unknown", 103, 3f));

        Assert.Empty(engine.Process(prev, curr).ToList());
    }

    [Fact]
    public void MutedSkill_StillEmitsEvent_WithMutedFlagTrue()
    {
        // Engine emits regardless; consumer (audio) is what mutes.
        var cat = MakeCatalog();
        cat.Skills[Skill].Muted = true;

        var engine = new AlertEngine(cat, new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        var e = Assert.Single(engine.Process(prev, curr).ToList());
        Assert.True(e.Muted);
    }
}
```

- [ ] **Step 2: Run, expect fail**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~AlertEngineTests"
```

- [ ] **Step 3: Implement `AlertEngine`**

`mods/BossMod.Core/Alerts/AlertEngine.cs`:

```csharp
using System.Collections.Generic;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Tracking;

namespace BossMod.Core.Alerts;

/// <summary>
/// Stateful: remembers per-(netId, skillIdx) the last castTimeEnd / cooldownEnd
/// it fired for, so subsequent observations of the same instance dedupe.
/// </summary>
public sealed class AlertEngine
{
    private readonly SkillCatalog _catalog;
    private readonly TierDefaults _defaults;

    private readonly Dictionary<(uint, int), double> _firedCastEnds = new();
    private readonly Dictionary<(uint, int), double> _firedCooldownEnds = new();

    public AlertEngine(SkillCatalog catalog, TierDefaults defaults)
    {
        _catalog = catalog;
        _defaults = defaults;
    }

    public IEnumerable<AlertEvent> Process(BossState prev, BossState curr)
    {
        // CastStart: prev has no cast, curr has one
        if (prev.ActiveCast == null && curr.ActiveCast is { } start)
        {
            var key = (curr.NetId, start.SkillIdx);
            if (!_firedCastEnds.TryGetValue(key, out var last) || last != start.CastTimeEnd)
            {
                _firedCastEnds[key] = start.CastTimeEnd;
                if (TryBuild(curr, start.SkillId, start.DisplayName, AlertTrigger.CastStart, out var ev))
                    yield return ev;
            }
        }

        // CastFinish: prev had a cast, curr does not — and the deadline was met
        if (prev.ActiveCast is { } finishing && curr.ActiveCast == null)
        {
            // Cancel signature: castTimeEnd in the past at the prev frame.
            // If finishing.CastTimeEnd <= prev.ServerTime → natural completion.
            // If finishing.CastTimeEnd > prev.ServerTime → canceled (deadline not met).
            if (finishing.CastTimeEnd <= prev.ServerTime)
            {
                if (TryBuild(curr, finishing.SkillId, finishing.DisplayName, AlertTrigger.CastFinish, out var ev))
                    yield return ev;
            }
        }

        // CooldownReady: per-skill index, transition from cooldownEnd > prev.ServerTime to <= curr.ServerTime
        var prevCooldowns = ToDict(prev.Cooldowns);
        foreach (var c in curr.Cooldowns)
        {
            if (!prevCooldowns.TryGetValue(c.SkillIdx, out var prevC)) continue;
            // Same instance — same cooldownEnd value. Different value = new cycle.
            if (prevC.CooldownEnd != c.CooldownEnd) continue;

            bool wasOnCd = prevC.CooldownEnd > prev.ServerTime;
            bool isReady = c.CooldownEnd <= curr.ServerTime;
            if (!wasOnCd || !isReady) continue;

            var key = (curr.NetId, c.SkillIdx);
            if (_firedCooldownEnds.TryGetValue(key, out var last) && last == c.CooldownEnd) continue;
            _firedCooldownEnds[key] = c.CooldownEnd;

            if (TryBuild(curr, c.SkillId, c.DisplayName, AlertTrigger.CooldownReady, out var ev))
                yield return ev;
        }
    }

    private static Dictionary<int, SkillCooldown> ToDict(List<SkillCooldown> cds)
    {
        var d = new Dictionary<int, SkillCooldown>(cds.Count);
        foreach (var c in cds) d[c.SkillIdx] = c;
        return d;
    }

    private bool TryBuild(BossState curr, string skillId, string skillDisplay, AlertTrigger trigger, out AlertEvent ev)
    {
        ev = default;
        if (!_catalog.Skills.TryGetValue(skillId, out var skillRec)) return false;
        if (!_catalog.Bosses.TryGetValue(curr.BossId, out var bossRec)) return false;
        if (!bossRec.Skills.TryGetValue(skillId, out var bossSkillRec)) return false;

        var threat = SettingsResolver.ResolveThreat(skillRec, bossSkillRec);
        var sound = SettingsResolver.ResolveSound(skillRec, bossSkillRec, _defaults);
        var text = SettingsResolver.ResolveAlertText(skillRec, bossSkillRec, skillDisplay);
        var muted = SettingsResolver.ResolveMuted(skillRec, bossSkillRec);

        ev = new AlertEvent(
            trigger,
            curr.NetId,
            curr.BossId, curr.DisplayName,
            skillId, skillDisplay,
            threat, sound, text, muted,
            curr.ServerTime);
        return true;
    }
}
```

> Note: `SkillCatalog` referenced here is implemented in Task 9. Build will fail until then; that's expected. Tests run after Task 9.

- [ ] **Step 4: Defer test run**

Tests for this task run after Task 9 (when `SkillCatalog` exists). For now:

```bash
dotnet build mods/BossMod.Core/BossMod.Core.csproj
```

Expected: build fails referencing `SkillCatalog` not found. That's fine — Task 9 fixes this.

- [ ] **Step 5: Don't commit yet**

Hold the commit until Task 9 lands and tests are green.

---

## Task 9: SkillCatalog in-memory ops (TDD)

**Files:**
- Create: `tests/BossMod.Core.Tests/SkillCatalogTests.cs`
- Create: `mods/BossMod.Core/Catalog/SkillCatalog.cs`

The catalog holds two top-level dictionaries (`Skills`, `Bosses`) and exposes ergonomic ops for `MonsterWatcher` to harvest entries without manual `ContainsKey` dance.

- [ ] **Step 1: Write failing tests**

`tests/BossMod.Core.Tests/SkillCatalogTests.cs`:

```csharp
using System;
using BossMod.Core.Catalog;
using Xunit;

namespace BossMod.Core.Tests;

public class SkillCatalogTests
{
    [Fact]
    public void GetOrCreateSkill_FirstSight_StampsFirstSeenAndReturns()
    {
        var cat = new SkillCatalog();
        var s = cat.GetOrCreateSkill("inferno_blast", "Inferno Blast", "infernal_skeleton");

        Assert.Equal("inferno_blast", s.Id);
        Assert.Equal("Inferno Blast", s.DisplayName);
        Assert.Equal("infernal_skeleton", s.LastSeenInBoss);
        Assert.NotEqual(default, s.FirstSeenUtc);
    }

    [Fact]
    public void GetOrCreateSkill_SecondSight_PreservesUserFields_RefreshesLastSeen()
    {
        var cat = new SkillCatalog();
        var s = cat.GetOrCreateSkill("a", "A", "boss1");
        s.UserThreat = ThreatTier.Critical;
        s.Sound = "klaxon";

        var s2 = cat.GetOrCreateSkill("a", "A renamed", "boss2");

        Assert.Same(s, s2);
        Assert.Equal("boss2", s2.LastSeenInBoss);
        Assert.Equal(ThreatTier.Critical, s2.UserThreat);
        Assert.Equal("klaxon", s2.Sound);
    }

    [Fact]
    public void GetOrCreateBoss_StampsAndReturns()
    {
        var cat = new SkillCatalog();
        var b = cat.GetOrCreateBoss("infernal_skeleton", "Infernal Skeleton",
            type: "Undead", className: "Warrior", zone: "Crypt of Decay",
            kind: BossKind.Boss, level: 10);

        Assert.Equal("infernal_skeleton", b.Id);
        Assert.Equal("Crypt of Decay", b.ZoneBestiary);
        Assert.Equal(10, b.LastSeenLevel);
    }

    [Fact]
    public void GetOrCreateBoss_Reseen_PreservesPerSkillUserFields()
    {
        var cat = new SkillCatalog();
        var b = cat.GetOrCreateBoss("b", "B", "T", "C", "Z", BossKind.Elite, 5);
        var bs = cat.GetOrCreateBossSkill(b, "skill_a");
        bs.Sound = "klaxon";
        bs.UserThreat = ThreatTier.High;

        var b2 = cat.GetOrCreateBoss("b", "B updated", "T2", "C2", "Z2", BossKind.Boss, 6);
        var bs2 = cat.GetOrCreateBossSkill(b2, "skill_a");

        Assert.Same(b, b2);
        Assert.Same(bs, bs2);
        Assert.Equal("klaxon", bs2.Sound);
        Assert.Equal(ThreatTier.High, bs2.UserThreat);
        Assert.Equal(BossKind.Boss, b2.Kind);    // metadata refreshed
        Assert.Equal(6, b2.LastSeenLevel);
    }
}
```

- [ ] **Step 2: Run, expect fail**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~SkillCatalogTests"
```

- [ ] **Step 3: Implement `SkillCatalog`**

`mods/BossMod.Core/Catalog/SkillCatalog.cs`:

```csharp
using System;
using System.Collections.Generic;

namespace BossMod.Core.Catalog;

/// <summary>
/// In-memory registry. Persistence handled by Persistence.StateJson (Task 10).
/// </summary>
public sealed class SkillCatalog
{
    public Dictionary<string, SkillRecord> Skills { get; set; } = new();
    public Dictionary<string, BossRecord> Bosses { get; set; } = new();

    public SkillRecord GetOrCreateSkill(string id, string displayName, string lastSeenInBoss)
    {
        if (!Skills.TryGetValue(id, out var rec))
        {
            rec = new SkillRecord
            {
                Id = id,
                DisplayName = displayName,
                FirstSeenUtc = DateTime.UtcNow,
                LastSeenInBoss = lastSeenInBoss,
            };
            Skills[id] = rec;
        }
        else
        {
            // Refresh display name and last-seen, never overwrite user-owned fields.
            rec.DisplayName = displayName;
            rec.LastSeenInBoss = lastSeenInBoss;
        }
        return rec;
    }

    public BossRecord GetOrCreateBoss(
        string id, string displayName,
        string type, string className, string zone,
        BossKind kind, int level)
    {
        if (!Bosses.TryGetValue(id, out var rec))
        {
            rec = new BossRecord
            {
                Id = id, DisplayName = displayName,
                Type = type, Class = className, ZoneBestiary = zone,
                Kind = kind, LastSeenLevel = level,
                FirstSeenUtc = DateTime.UtcNow,
                LastSeenUtc = DateTime.UtcNow,
            };
            Bosses[id] = rec;
        }
        else
        {
            // Refresh metadata (so e.g. zone updates when game patch changes them),
            // but keep all per-skill user overrides under .Skills.
            rec.DisplayName = displayName;
            rec.Type = type;
            rec.Class = className;
            rec.ZoneBestiary = zone;
            rec.Kind = kind;
            rec.LastSeenLevel = level;
            rec.LastSeenUtc = DateTime.UtcNow;
        }
        return rec;
    }

    public BossSkillRecord GetOrCreateBossSkill(BossRecord boss, string skillId)
    {
        if (!boss.Skills.TryGetValue(skillId, out var rec))
        {
            rec = new BossSkillRecord
            {
                LastObservedUtc = DateTime.UtcNow,
            };
            boss.Skills[skillId] = rec;
        }
        else
        {
            rec.LastObservedUtc = DateTime.UtcNow;
        }
        return rec;
    }
}
```

- [ ] **Step 4: Run all core tests, expect green**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Expected: all tests in `EffectiveValuesTests`, `ThreatClassifierTests`, `SettingsResolverTests`, `AlertEngineTests`, `SkillCatalogTests` pass.

- [ ] **Step 5: Commit AlertEngine + SkillCatalog together**

```bash
git add mods/BossMod.Core/Alerts/AlertEngine.cs mods/BossMod.Core/Catalog/SkillCatalog.cs tests/BossMod.Core.Tests/AlertEngineTests.cs tests/BossMod.Core.Tests/SkillCatalogTests.cs
git commit -m "feat(bossmod): add SkillCatalog and AlertEngine with edge-detection"
```

---

## Task 10: Globals + StateJson persistence (TDD)

**Files:**
- Create: `mods/BossMod.Core/Persistence/Globals.cs`
- Create: `tests/BossMod.Core.Tests/StateJsonTests.cs`
- Create: `mods/BossMod.Core/Persistence/StateJson.cs`

Single `state.json` file. Uses `System.Text.Json` (BCL). Schema versioned.

- [ ] **Step 1: `mods/BossMod.Core/Persistence/Globals.cs`**

```csharp
using System.Collections.Generic;
using BossMod.Core.Catalog;

namespace BossMod.Core.Persistence;

/// <summary>
/// Mod-wide settings persisted alongside the catalog.
/// </summary>
public sealed class Globals
{
    public Thresholds Thresholds { get; set; } = new();
    public float ProximityRadius { get; set; } = 30f;
    public float UiScale { get; set; } = 1.0f;
    public bool Muted { get; set; }
    public bool AlertTextMuteOnMasterMute { get; set; } = true;
    public string ExpansionDefault { get; set; } = "expand_targeted_only";
    public int MaxCastBars { get; set; } = 3;

    public Dictionary<string, string> Hotkeys { get; set; } = new()
    {
        ["toggle_settings"] = "F8"
    };

    public bool ShowCastBarWindow { get; set; } = true;
    public bool ShowCooldownWindow { get; set; } = true;
    public bool ShowBuffTrackerWindow { get; set; } = true;
    public bool ConfigMode { get; set; } = false;
}
```

- [ ] **Step 2: Write failing tests**

`tests/BossMod.Core.Tests/StateJsonTests.cs`:

```csharp
using System.IO;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using Xunit;

namespace BossMod.Core.Tests;

public class StateJsonTests
{
    [Fact]
    public void RoundTrip_PreservesCatalogAndGlobals()
    {
        var cat = new SkillCatalog();
        var s = cat.GetOrCreateSkill("inferno_blast", "Inferno Blast", "infernal_skeleton");
        s.UserThreat = ThreatTier.Critical;
        s.Sound = "klaxon";

        var b = cat.GetOrCreateBoss("infernal_skeleton", "Infernal Skeleton",
            "Undead", "Warrior", "Crypt of Decay", BossKind.Boss, 10);
        var bs = cat.GetOrCreateBossSkill(b, "inferno_blast");
        bs.AutoThreat = ThreatTier.High;
        bs.Sound = "boss_specific";

        var globals = new Globals { ProximityRadius = 45f, Muted = true };
        globals.Thresholds.CriticalDamage = 999;

        var path = Path.Combine(Path.GetTempPath(), $"bossmod-test-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, cat, globals);
            var (cat2, glob2) = StateJson.Read(path);

            Assert.Single(cat2.Skills);
            Assert.Equal("Inferno Blast", cat2.Skills["inferno_blast"].DisplayName);
            Assert.Equal(ThreatTier.Critical, cat2.Skills["inferno_blast"].UserThreat);
            Assert.Equal("klaxon", cat2.Skills["inferno_blast"].Sound);

            Assert.Single(cat2.Bosses);
            var b2 = cat2.Bosses["infernal_skeleton"];
            Assert.Equal("Crypt of Decay", b2.ZoneBestiary);
            Assert.Single(b2.Skills);
            Assert.Equal("boss_specific", b2.Skills["inferno_blast"].Sound);

            Assert.Equal(45f, glob2.ProximityRadius);
            Assert.True(glob2.Muted);
            Assert.Equal(999, glob2.Thresholds.CriticalDamage);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }

    [Fact]
    public void Read_MissingFile_ReturnsEmptyDefaults()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-missing-{System.Guid.NewGuid():N}.json");
        var (cat, glob) = StateJson.Read(path);
        Assert.Empty(cat.Skills);
        Assert.Empty(cat.Bosses);
        Assert.Equal(30f, glob.ProximityRadius);  // default
    }

    [Fact]
    public void Read_CorruptFile_ReturnsEmptyDefaultsAndDoesNotThrow()
    {
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-corrupt-{System.Guid.NewGuid():N}.json");
        File.WriteAllText(path, "{ this is not valid json");
        try
        {
            var (cat, glob) = StateJson.Read(path);
            Assert.Empty(cat.Skills);
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Write_AtomicallyReplaces_DoesNotCorruptOnPartialWrite()
    {
        // We write to a .tmp first then rename, so even if the process is killed
        // mid-write the existing file is preserved.
        var path = Path.Combine(Path.GetTempPath(), $"bossmod-atomic-{System.Guid.NewGuid():N}.json");
        try
        {
            StateJson.Write(path, new SkillCatalog(), new Globals { ProximityRadius = 10 });
            Assert.True(File.Exists(path));
            Assert.False(File.Exists(path + ".tmp"));

            StateJson.Write(path, new SkillCatalog(), new Globals { ProximityRadius = 20 });
            var (_, glob) = StateJson.Read(path);
            Assert.Equal(20f, glob.ProximityRadius);
        }
        finally { if (File.Exists(path)) File.Delete(path); }
    }
}
```

- [ ] **Step 3: Run, expect fail**

- [ ] **Step 4: Implement `StateJson`**

`mods/BossMod.Core/Persistence/StateJson.cs`:

```csharp
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using BossMod.Core.Catalog;

namespace BossMod.Core.Persistence;

public static class StateJson
{
    public const int CurrentSchemaVersion = 1;

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private sealed class FileShape
    {
        public int Version { get; set; } = CurrentSchemaVersion;
        public Globals Global { get; set; } = new();
        public System.Collections.Generic.Dictionary<string, SkillRecord> Skills { get; set; } = new();
        public System.Collections.Generic.Dictionary<string, BossRecord> Bosses { get; set; } = new();
    }

    public static void Write(string path, SkillCatalog catalog, Globals globals)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var shape = new FileShape
        {
            Global = globals,
            Skills = catalog.Skills,
            Bosses = catalog.Bosses,
        };

        // Atomic write: serialize to .tmp, fsync via FileStream.Flush(true), rename.
        var tmp = path + ".tmp";
        using (var fs = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            JsonSerializer.Serialize(fs, shape, Options);
            fs.Flush(true);
        }
        if (File.Exists(path)) File.Delete(path);
        File.Move(tmp, path);
    }

    public static (SkillCatalog Catalog, Globals Globals) Read(string path)
    {
        if (!File.Exists(path))
            return (new SkillCatalog(), new Globals());

        try
        {
            using var fs = File.OpenRead(path);
            var shape = JsonSerializer.Deserialize<FileShape>(fs, Options);
            if (shape == null) return (new SkillCatalog(), new Globals());

            // Schema version migration: v1 only for now; future migrations branch here.
            var cat = new SkillCatalog
            {
                Skills = shape.Skills ?? new(),
                Bosses = shape.Bosses ?? new(),
            };
            return (cat, shape.Global ?? new Globals());
        }
        catch (JsonException)
        {
            // Corrupt file — silently fall back to defaults. The user's tuning is lost
            // but the mod stays usable. Caller should log a warning.
            return (new SkillCatalog(), new Globals());
        }
    }
}
```

- [ ] **Step 5: Run, expect green**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add mods/BossMod.Core/Persistence/ tests/BossMod.Core.Tests/StateJsonTests.cs
git commit -m "feat(bossmod): add Globals + StateJson persistence with atomic writes"
```

---

## Task 11: Activation gate adapter (IL2CPP-touching, no host tests)

**Files:**
- Create: `mods/BossMod/Tracking/Activation.cs`

Engaged ∪ Proximate. References live `Il2Cpp.Monster`, `Il2Cpp.Player` types, so it lives in `mods/BossMod`, not Core. No host-side test possible (IL2CPP types unavailable on host); validation comes from in-game observation in plan 4.

- [ ] **Step 1: Write `Activation.cs`**

```csharp
using Il2Cpp;
using UnityEngine;

namespace BossMod.Tracking;

/// <summary>
/// Activation gate: monster surfaces in overlays + receives alerts when
/// engaged with us/party/pets/mercenaries OR within proximity radius OR
/// explicitly targeted by the local player.
/// </summary>
public static class Activation
{
    public static bool IsActive(Il2Cpp.Monster monster, Il2Cpp.Player localPlayer, float proximityRadius)
    {
        if (monster == null || localPlayer == null) return false;
        if (monster.health == null || monster.health.current <= 0) return false;

        // Explicit targeting
        if (localPlayer.Networktarget == monster) return true;

        // Aggro list contains us / party / mercs / pets
        if (monster.aggroList != null)
        {
            if (monster.aggroList.ContainsKey(localPlayer.netId)) return true;

            // Mercenaries owned by local player
            foreach (var merc in EnumerateLocalMercenaries(localPlayer))
            {
                if (merc != null && monster.aggroList.ContainsKey(merc.netId)) return true;
            }

            // Party members and their pets/mercs
            var party = localPlayer.GetComponent<Il2Cpp.PlayerParty>()?.party;
            if (party.HasValue && party.Value.members != null)
            {
                foreach (var memberName in party.Value.members)
                {
                    if (string.IsNullOrEmpty(memberName)) continue;
                    if (memberName == localPlayer.nameEntity) continue;
                    if (!Il2Cpp.Player.onlinePlayers.TryGetValue(memberName, out var member) || member == null) continue;

                    if (monster.aggroList.ContainsKey(member.netId)) return true;

                    foreach (var merc in EnumerateLocalMercenaries(member))
                        if (merc != null && monster.aggroList.ContainsKey(merc.netId)) return true;
                }
            }
        }

        // Proximity fallback
        var dx = monster.transform.position.x - localPlayer.transform.position.x;
        var dy = monster.transform.position.y - localPlayer.transform.position.y;
        return (dx * dx + dy * dy) <= proximityRadius * proximityRadius;
    }

    private static System.Collections.Generic.IEnumerable<Il2Cpp.Pet> EnumerateLocalMercenaries(Il2Cpp.Player p)
    {
        // Mercenary slots are 1..4 on Player; null entries skipped by caller.
        if (p.NetworkactiveMercenary != null) yield return p.NetworkactiveMercenary;
        if (p.NetworkactiveMercenary2 != null) yield return p.NetworkactiveMercenary2;
        if (p.NetworkactiveMercenary3 != null) yield return p.NetworkactiveMercenary3;
        if (p.NetworkactiveMercenary4 != null) yield return p.NetworkactiveMercenary4;
    }
}
```

- [ ] **Step 2: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds. If `Networktarget` / `aggroList` / etc. fail to resolve as IL2CPP types, fall back to using `monster.netId`-equivalent property names (consult `server-scripts/Monster.cs` to confirm the IL2CPP-generated property names; the brainstorming pass confirmed these match Mirror's SyncVar generated names).

- [ ] **Step 3: Commit**

```bash
git add mods/BossMod/Tracking/Activation.cs
git commit -m "feat(bossmod): add Activation gate (engaged ∪ proximate)"
```

---

## Task 12: MonsterWatcher (IL2CPP-touching adapter)

**Files:**
- Create: `mods/BossMod/Tracking/MonsterWatcher.cs`

Per-frame scan of `Il2Cpp.Monster` instances; builds `BossState` snapshots; harvests catalog entries on first sight; classifies via `ThreatClassifier`. Bridges live SyncVars to the pure Core layer.

The watcher does **not** itself drive alerts — `BossMod.cs` (in plan 4) wires the watcher's output into `AlertEngine.Process` with the previous frame's state.

- [ ] **Step 1: Write `MonsterWatcher.cs`**

```csharp
using System.Collections.Generic;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Tracking;
using Il2Cpp;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace BossMod.Tracking;

/// <summary>
/// Scans the World scene for Monster instances every frame.
/// Produces per-monster BossState snapshots and harvests catalog entries
/// for any unseen ScriptableSkill or Boss.
/// </summary>
public sealed class MonsterWatcher
{
    private readonly MelonLogger.Instance _log;
    private readonly SkillCatalog _catalog;
    private readonly Persistence.Globals _globals; // alias of BossMod.Core.Persistence.Globals

    private Il2CppSystem.Object[]? _cachedMonsters;
    private string _lastSceneName = "";
    private Vector3 _lastPlayerPosition = Vector3.zero;
    private const float TeleportThreshold = 50f;

    public IReadOnlyList<BossState> CurrentSnapshots => _currentSnapshots;
    private readonly List<BossState> _currentSnapshots = new();

    public MonsterWatcher(MelonLogger.Instance log, SkillCatalog catalog, Persistence.Globals globals)
    {
        _log = log;
        _catalog = catalog;
        _globals = globals;
    }

    /// <summary>Call from MelonMod.OnUpdate. No-ops outside the World scene.</summary>
    public void Tick()
    {
        var sceneName = SceneManager.GetActiveScene().name;
        if (sceneName != "World")
        {
            if (_lastSceneName == "World") { _cachedMonsters = null; _currentSnapshots.Clear(); }
            _lastSceneName = sceneName;
            return;
        }

        var localPlayer = Il2Cpp.Player.localPlayer;
        if (localPlayer == null) return;

        // Refresh cache on scene change or teleport
        var pos = localPlayer.transform.position;
        bool teleported = Vector3.Distance(pos, _lastPlayerPosition) > TeleportThreshold;
        if (_cachedMonsters == null || sceneName != _lastSceneName || teleported)
        {
            _cachedMonsters = Object.FindObjectsOfType(Il2CppType.Of<Il2Cpp.Monster>());
            _lastSceneName = sceneName;
            _lastPlayerPosition = pos;
        }

        var serverTime = ComputeServerTime();
        _currentSnapshots.Clear();

        foreach (var obj in _cachedMonsters!)
        {
            var monster = obj.Cast<Il2Cpp.Monster>();
            if (monster == null || (!monster.isBoss && !monster.isElite)) continue;
            if (monster.health == null || monster.health.current <= 0) continue;

            HarvestCatalog(monster);

            var state = BuildState(monster, serverTime);
            state.IsActive = Activation.IsActive(monster, localPlayer, _globals.ProximityRadius);
            _currentSnapshots.Add(state);
        }
    }

    private void HarvestCatalog(Il2Cpp.Monster monster)
    {
        var bossId = SanitizeName(monster.name);
        var displayName = bossId;
        var kind = monster.isFabled ? BossKind.Fabled
                 : monster.isBoss ? BossKind.Boss
                 : BossKind.Elite;

        var bossRec = _catalog.GetOrCreateBoss(
            bossId, monster.nameEntity ?? displayName,
            monster.typeMonster ?? "", monster.classMonster ?? "",
            monster.zoneMonster ?? "", kind,
            monster.level?.current ?? 1);

        if (monster.skills?.skillTemplates == null) return;
        for (int i = 0; i < monster.skills.skillTemplates.Length; i++)
        {
            var sk = monster.skills.skillTemplates[i];
            if (sk == null || string.IsNullOrEmpty(sk.name)) continue;

            var skillId = sk.name;
            var skillDisplay = string.IsNullOrEmpty(sk.nameSkill) ? skillId : sk.nameSkill;
            var skillRec = _catalog.GetOrCreateSkill(skillId, skillDisplay, bossId);

            // Refresh raw snapshot from current ScriptableSkill data.
            skillRec.RawSnapshot = SkillSnapshotBuilder.Build(sk);

            // Per-(boss, skill) effective snapshot — recomputed only when the
            // boss's combat damage / haste / buffs delta. For now refresh each
            // catalog harvest (cheap; few bosses per scene).
            var bossSkillRec = _catalog.GetOrCreateBossSkill(bossRec, skillId);
            bossSkillRec.EffectiveSnapshot = EffectiveSnapshotBuilder.Build(sk, monster);
            bossSkillRec.AutoThreat = ThreatClassifier.Classify(
                skillRec.RawSnapshot, bossSkillRec.EffectiveSnapshot, _globals.Thresholds);
        }
    }

    private static BossState BuildState(Il2Cpp.Monster monster, double serverTime)
    {
        var s = new BossState
        {
            NetId = monster.netId,
            BossId = SanitizeName(monster.name),
            DisplayName = monster.nameEntity ?? monster.name,
            Level = monster.level?.current ?? 1,
            Kind = monster.isFabled ? BossKind.Fabled : monster.isBoss ? BossKind.Boss : BossKind.Elite,
            PositionX = monster.transform.position.x,
            PositionY = monster.transform.position.y,
            HealthCurrent = monster.health?.current ?? 0,
            HealthMax = monster.health?.max ?? 0,
            ServerTime = serverTime,
        };

        // Active cast — only when state == "CASTING" and currentSkill > 0
        if (monster.state == "CASTING" && monster.skills != null && monster.skills.currentSkill > 0)
        {
            var idx = monster.skills.currentSkill;
            if (idx < monster.skills.skills.Count)
            {
                var skill = monster.skills.skills[idx];
                var data = skill.data;
                if (data != null)
                {
                    var effectiveCast = EffectiveValues.CastTimeEffective(
                        skill.castTime, data.isSpell, monster.skills.GetSpellHasteBonus());
                    s.ActiveCast = new CastInfo(
                        SkillIdx: idx,
                        SkillId: data.name,
                        DisplayName: string.IsNullOrEmpty(data.nameSkill) ? data.name : data.nameSkill,
                        CastTimeEnd: skill.castTimeEnd,
                        TotalCastTime: effectiveCast);
                }
            }
        }

        // Cooldowns — every special skill (idx >= 1)
        if (monster.skills != null)
        {
            for (int i = 1; i < monster.skills.skills.Count; i++)
            {
                var sk = monster.skills.skills[i];
                var d = sk.data;
                if (d == null) continue;
                var effectiveCd = EffectiveValues.CooldownEffective(sk.cooldown, monster.skills.GetHasteBonus());
                s.Cooldowns.Add(new SkillCooldown(
                    SkillIdx: i,
                    SkillId: d.name,
                    DisplayName: string.IsNullOrEmpty(d.nameSkill) ? d.name : d.nameSkill,
                    CooldownEnd: sk.cooldownEnd,
                    TotalCooldown: effectiveCd));
            }

            for (int i = 0; i < monster.skills.buffs.Count; i++)
            {
                var b = monster.skills.buffs[i];
                var d = b.data;
                if (d == null) continue;
                s.Buffs.Add(new BuffSnapshot(
                    SkillId: d.name,
                    DisplayName: string.IsNullOrEmpty(d.nameSkill) ? d.name : d.nameSkill,
                    BuffTimeEnd: b.buffTimeEnd,
                    TotalBuffTime: b.buffTime,
                    IsAura: d.isAura,
                    IsDebuff: d is Il2Cpp.AreaDebuffSkill or Il2Cpp.TargetDebuffSkill));
            }
        }

        return s;
    }

    private static double ComputeServerTime()
    {
        var nm = Object.FindObjectOfType(Il2CppType.Of<Il2Cpp.NetworkManagerMMO>())?.Cast<Il2Cpp.NetworkManagerMMO>();
        if (nm == null) return 0;
        return Il2CppMirror.NetworkTime.time + nm.offsetNetworkTime;
    }

    private static string SanitizeName(string raw) => raw.Replace("(Clone)", "").Trim();
}
```

- [ ] **Step 2: Add `mods/BossMod/Tracking/SkillSnapshotBuilder.cs`**

IL2CPP adapter that pulls fields out of `Il2Cpp.ScriptableSkill` into the pure `SkillSnapshot`. Stub for now — populated with concrete field reads during plan 4 verification.

```csharp
using BossMod.Core.Catalog;
using Il2Cpp;

namespace BossMod.Tracking;

internal static class SkillSnapshotBuilder
{
    public static SkillSnapshot Build(Il2Cpp.ScriptableSkill data)
    {
        var snap = new SkillSnapshot
        {
            SkillClass = data.GetType().Name,
            IsSpell = data.isSpell,
            CastTime = data.castTime?.baseValue ?? 0f,
            Cooldown = data.cooldown?.baseValue ?? 0f,
            CastRange = data.castRange?.baseValue ?? 0f,
        };

        switch (data)
        {
            case Il2Cpp.AreaDamageSkill area:
                snap.RawDamage = area.damage?.baseValue ?? 0;
                snap.DamagePercent = area.damagePercent?.baseValue ?? 0f;
                snap.DamageType = MapDamageType(area.damageType);
                snap.AoeRadius = area.castRange?.baseValue ?? 0f;
                snap.StunChance = area.stunChance?.baseValue ?? 0f;
                snap.StunTime = area.stunTime?.baseValue ?? 0f;
                snap.FearChance = area.fearChance?.baseValue ?? 0f;
                snap.FearTime = area.fearTime?.baseValue ?? 0f;
                if (snap.StunChance > 0 && snap.StunTime > 0) snap.Debuffs |= DebuffKind.Stun;
                if (snap.FearChance > 0 && snap.FearTime > 0) snap.Debuffs |= DebuffKind.Fear;
                break;

            case Il2Cpp.AreaObjectSpawnSkill aos:
                snap.RawDamage = aos.damage?.baseValue ?? 0;
                snap.DamageType = MapDamageType(aos.damageType);
                snap.AoeRadius = aos.sizeObject;
                snap.AoeDelay = aos.delayDamage;
                break;

            case Il2Cpp.TargetDamageSkill td:
                snap.RawDamage = td.damage?.baseValue ?? 0;
                snap.DamagePercent = td.damagePercent?.baseValue ?? 0f;
                snap.DamageType = MapDamageType(td.damageType);
                break;

            case Il2Cpp.BuffSkill bf:
                snap.IsAura = bf.isAura;
                if (bf.isPoisonDebuff) snap.Debuffs |= DebuffKind.Poison;
                if (bf.isDiseaseDebuff) snap.Debuffs |= DebuffKind.Disease;
                if (bf.isFireDebuff) snap.Debuffs |= DebuffKind.Fire;
                if (bf.isColdDebuff) snap.Debuffs |= DebuffKind.Cold;
                if (bf.isBlindness) snap.Debuffs |= DebuffKind.Blindness;
                break;
        }

        return snap;
    }

    private static DamageType MapDamageType(Il2Cpp.DamageType dt) => dt switch
    {
        Il2Cpp.DamageType.Magic => DamageType.Magic,
        Il2Cpp.DamageType.Fire => DamageType.Fire,
        Il2Cpp.DamageType.Cold => DamageType.Cold,
        Il2Cpp.DamageType.Poison => DamageType.Poison,
        Il2Cpp.DamageType.Disease => DamageType.Disease,
        _ => DamageType.Normal,
    };
}
```

- [ ] **Step 3: Add `mods/BossMod/Tracking/EffectiveSnapshotBuilder.cs`**

```csharp
using System;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Il2Cpp;

namespace BossMod.Tracking;

internal static class EffectiveSnapshotBuilder
{
    public static BossSkillSnapshot Build(Il2Cpp.ScriptableSkill data, Il2Cpp.Monster monster)
    {
        int casterDmg = monster.combat?.damage ?? 0;
        int casterMag = monster.combat?.magicDamage ?? 0;

        int outgoing = 0;
        int auraDps = 0;
        var damageType = DamageType.Normal;

        if (data is Il2Cpp.AreaDamageSkill ad)
        {
            damageType = MapDamageType(ad.damageType);
            outgoing = EffectiveValues.OutgoingDamage(
                ad.damage?.baseValue ?? 0, 0, ad.damagePercent?.baseValue ?? 0f,
                damageType, casterDmg, casterMag);
        }
        else if (data is Il2Cpp.TargetDamageSkill td)
        {
            damageType = MapDamageType(td.damageType);
            outgoing = EffectiveValues.OutgoingDamage(
                td.damage?.baseValue ?? 0, 0, td.damagePercent?.baseValue ?? 0f,
                damageType, casterDmg, casterMag);
        }
        else if (data is Il2Cpp.AreaObjectSpawnSkill aos)
        {
            damageType = MapDamageType(aos.damageType);
            outgoing = EffectiveValues.OutgoingDamage(
                aos.damage?.baseValue ?? 0, 0, 0, damageType, casterDmg, casterMag);
        }
        else if (data is Il2Cpp.BuffSkill bf && bf.isAura)
        {
            int hps = bf.healingPerSecondBonus?.baseValue ?? 0;
            int casterAttribute = monster.combat?.magicDamage ?? 0;
            auraDps = EffectiveValues.AuraDpsApprox(hps, casterAttribute);
        }

        var (min, max) = EffectiveValues.OutgoingDamageRange(outgoing);
        var castTime = EffectiveValues.CastTimeEffective(
            data.castTime?.baseValue ?? 0f,
            data.isSpell,
            monster.skills?.GetSpellHasteBonus() ?? 0f);
        var cooldown = EffectiveValues.CooldownEffective(
            data.cooldown?.baseValue ?? 0f,
            monster.skills?.GetHasteBonus() ?? 0f);

        return new BossSkillSnapshot
        {
            OutgoingDamage = outgoing,
            OutgoingDamageMin = min,
            OutgoingDamageMax = max,
            AuraDpsApprox = auraDps,
            CastTimeEffective = castTime,
            CooldownEffective = cooldown,
            ComputedAtUtc = DateTime.UtcNow,
        };
    }

    private static DamageType MapDamageType(Il2Cpp.DamageType dt) => dt switch
    {
        Il2Cpp.DamageType.Magic => DamageType.Magic,
        Il2Cpp.DamageType.Fire => DamageType.Fire,
        Il2Cpp.DamageType.Cold => DamageType.Cold,
        Il2Cpp.DamageType.Poison => DamageType.Poison,
        Il2Cpp.DamageType.Disease => DamageType.Disease,
        _ => DamageType.Normal,
    };
}
```

- [ ] **Step 4: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds. If `Il2CppMirror.NetworkTime` is unresolved, add a `<Reference>` for `Il2CppMirror.dll` in `BossMod.csproj` (it's already there from plan 1's `BossTracker`-based template).

- [ ] **Step 5: Commit**

```bash
git add mods/BossMod/Tracking/MonsterWatcher.cs mods/BossMod/Tracking/SkillSnapshotBuilder.cs mods/BossMod/Tracking/EffectiveSnapshotBuilder.cs
git commit -m "feat(bossmod): add MonsterWatcher with catalog harvest + state snapshots"
```

---

## Definition of done

- `BossMod.Core` builds clean as a pure C# library, zero IL2CPP refs.
- All Core unit tests pass: `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj` is green.
- `BossMod` (mod) builds with `BossMod.Core` referenced and ILRepacked into the final `BossMod.dll`.
- `state.json` round-trips deterministically through `StateJson.Read/Write`, with atomic file replacement.
- AlertEngine fires the right events on the right transitions and dedupes correctly.
- MonsterWatcher exists with the IL2CPP plumbing in place; runtime verification of the IL2CPP type access happens in plan 4 (when the watcher is wired into `BossMod.OnUpdate`).

## Open items deferred to plan 4

- Verifying `Il2Cpp.AreaDebuffSkill`, `Il2Cpp.TargetDebuffSkill`, etc. resolve correctly (no host-side test possible).
- Verifying that `monster.skills.skills[i].data` cast to `Il2Cpp.AreaDamageSkill` works in IL2CPP — the C# `is` pattern may need replacement with `TryCast<>`.
- Tuning `Thresholds` defaults from observed in-game damage numbers.
- Wiring `MonsterWatcher` + `AlertEngine` into the mod entry (plan 4 task 1).
