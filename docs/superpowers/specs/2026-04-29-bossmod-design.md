# BossMod Design

**Status:** Approved (brainstorming complete)
**Date:** 2026-04-29
**Owner:** mods/

## Goal

A DBM-style boss-encounter helper for Ancient Kingdoms, rendered with ImGui.NET. Surfaces boss cast bars, per-ability cooldown timers, buff/debuff trackers, and configurable audio + on-screen alerts. Auto-discovers monsters and skills as the player encounters them — no static data export. All configuration in-UI; no hand-edited TOML.

## Non-goals (v1)

Each can drop into the layered architecture later without churn:

- Threat / aggro list HUD (data is in `Monster.aggroList` but not surfaced).
- Encounter timeline / pull tracker.
- Custom enhancements to the existing `RpcSpawnWarningCircle` ground markers.
- Multi-boss "raid frame" style HUD.
- Network/party-aware alerts (broadcasting to party members).

## Architecture

### Layered, single mod

```
mods/BossMod/
├── BossMod.cs              # MelonMod entry — lifecycle, OnUpdate, OnGUI hook
├── Imgui/                  # Renderer + cimgui native loading
│   ├── ImGuiRenderer.cs    # Ported from Erenshor; CommandBuffer-based, IL2CPP-adapted
│   ├── CimguiNative.cs     # P/Invoke for ImVec2/ImVec4 entry points
│   └── resources/cimgui.dll
├── Tracking/               # Reads SyncVars, builds models. No rendering.
│   ├── MonsterWatcher.cs   # Per-frame scan of nearby Monsters
│   ├── BossState.cs        # Per-monster live snapshot
│   └── Activation.cs       # Engaged ∪ Proximate gate
├── Catalog/                # Persistent learned-skill catalog
│   ├── SkillCatalog.cs     # In-memory + state.json round-trip
│   ├── SkillRecord.cs      # Per-skill record
│   ├── BossRecord.cs       # Per-boss record (incl. per-skill overrides)
│   ├── SkillSnapshot.cs    # Raw ScriptableSkill values
│   ├── BossSkillSnapshot.cs# Effective values for a (boss, skill) pair
│   ├── EffectiveValues.cs  # Pure damage / cast-time / cooldown formulas
│   └── ThreatClassifier.cs # AutoThreat = f(BossSkillSnapshot, thresholds)
├── Alerts/                 # Pure event emitter — observes diffs, fires events
│   ├── AlertEngine.cs      # Edge detection across consecutive BossState frames
│   └── AlertEvent.cs       # Resolved (boss-skill → skill → tier-default) payload
├── Audio/
│   ├── SoundBank.cs        # Generated tones + UserData/Sounds/*.wav loader
│   └── SoundPlayer.cs      # Single hidden GameObject + AudioSource
└── Ui/                     # Pure rendering — reads BossState/Catalog, calls ImGui
    ├── CastBarWindow.cs
    ├── CooldownWindow.cs
    ├── BuffTrackerWindow.cs
    ├── AlertOverlay.cs
    ├── SettingsWindow.cs   # Tabs: Skills / Bosses / Sounds / General / Export-Import
    └── GroupableTable.cs   # Reused widget for Skills/Bosses/Sounds tabs
```

### Data flow

```
Server (Mirror)
   │ SyncVars / SyncLists
   ▼
MonsterWatcher  ──harvest──►  SkillCatalog (persisted to state.json)
   │
   │ BossState[N]
   ▼
AlertEngine     ──events──►   SoundPlayer
   │                           AlertOverlay
   │ BossState[N]
   ▼
Ui windows (CastBar, Cooldown, BuffTracker)
```

One direction. UI never writes to tracking. Catalog reads from MonsterWatcher; user edits in SettingsWindow write to Catalog only.

### Event source: SyncVar polling, no Harmony

`Skill.castTimeEnd` and `Skill.cooldownEnd` are absolute server timestamps. Sub-frame precision comes from arithmetic at render time (`end - now`), not from poll rate. New-cast / cast-finished / cooldown-ready events emerge from edge detection on consecutive frames; worst-case alert latency is one frame. Harmony adds dependencies and IL2CPP fragility for no win.

## Tracking and catalog

### MonsterWatcher

Active only in `World` scene. Reuses `BossTracker`'s caching pattern: full `FindObjectsOfType<Monster>` only on scene change or local-player teleport (>50m delta), otherwise iterates the cached array. Each frame, for every cached `Monster` with `(isBoss || isElite) && health.current > 0`:

- Build a fresh `BossState` snapshot (cast info, cooldown values, buffs, position, hp).
- On first sight of a `Monster.name`, `BossRecord` is created in `SkillCatalog`.
- On first sight of any `ScriptableSkill` in `monster.skills.skillTemplates`, a `SkillRecord` is created.
- Per-`(boss, skill)` `BossSkillRecord` is created or refreshed: re-derive `EffectiveSnapshot` from current `monster.combat.damage / magicDamage / skills.GetSpellHasteBonus / skills.GetHasteBonus`. Recompute gated on edge changes (combat int delta, buff count delta, buff identity hash delta) — not per-frame.
- User-owned fields on `SkillRecord` and `BossSkillRecord` (`UserThreat`, `Sound`, `AlertText`, `FireOn`, `Muted`) are **never** overwritten by refresh — only `RawSnapshot` and `EffectiveSnapshot` are.

### Identity

- Skill id = `ScriptableSkill.name` (the Unity-asset name; stable, human-readable, basis of `Skill.hash`).
- Boss id = `monster.name` with `(Clone)` stripped and trimmed.

### Catalog records

```csharp
public sealed class SkillRecord                       // catalog["skills"][skill_id]
{
    public string Id;
    public string DisplayName;
    public DateTime FirstSeenUtc;
    public string LastSeenInBoss;
    public SkillSnapshot RawSnapshot;
    public ThreatTier? UserThreat;                    // skill-level override; null → fall through
    public string? Sound;
    public string? AlertText;
    public AlertTrigger? FireOn;
    public bool? Muted;
}

public sealed class BossRecord                        // catalog["bosses"][boss_id]
{
    public string Id;
    public string DisplayName;
    public string Type;                               // "Undead" / "Beast" / ... — for grouping
    public string Class;                              // "Warrior" / "Mage" / ... — for grouping
    public string ZoneBestiary;                       // primary group key in Bosses tab
    public BossKind Kind;                             // Boss | Elite | Fabled | WorldBoss
    public int LastSeenLevel;
    public DateTime FirstSeenUtc, LastSeenUtc;
    public Dictionary<string, BossSkillRecord> Skills;
}

public sealed class BossSkillRecord                   // catalog["bosses"][boss_id]["skills"][skill_id]
{
    public BossSkillSnapshot EffectiveSnapshot;
    public ThreatTier AutoThreat;                     // computed from EffectiveSnapshot + thresholds
    public ThreatTier? UserThreat;                    // boss-level override; wins over skill-level
    public string? Sound;
    public string? AlertText;
    public AlertTrigger? FireOn;
    public bool? Muted;
    public DateTime LastObservedUtc;
}

public enum ThreatTier { Low, Medium, High, Critical }
public enum AlertTrigger { CastStart, CastFinish, CooldownReady }
public enum BossKind { Boss, Elite, Fabled, WorldBoss }

[Flags] public enum DebuffKind
{
    None = 0,
    Stun = 1, Fear = 2, Blindness = 4, Mezz = 8,
    Poison = 16, Disease = 32, Fire = 64, Cold = 128
}
```

`SkillSnapshot` and `BossSkillSnapshot` are declared in **Snapshot model** below.

### Snapshot model

```csharp
public sealed class SkillSnapshot                      // raw, caster-independent
{
    public string SkillClass;                          // "AreaDamageSkill", etc.
    public bool IsSpell, IsAura;
    public float CastTime, Cooldown, CastRange;
    public int RawDamage, RawMagicDamage;              // skill.damage[level], skill.magicDamage[level]
    public float DamagePercent;                        // skill.damagePercent[level]
    public DamageType DamageType;
    public float? AoeRadius;                           // castRange for AreaDamageSkill, sizeObject for AreaObjectSpawnSkill
    public float? AoeDelay;                            // AreaObjectSpawnSkill.delayDamage
    public DebuffKind Debuffs;                         // Stun | Fear | Blindness | Mezz | Poison | Disease | Fire | Cold (bitmask)
    public float StunChance, StunTime, FearChance, FearTime;
}

public sealed class BossSkillSnapshot                  // effective for a specific boss
{
    public int OutgoingDamage;                         // pre-mitigation, includes caster bonuses
    public int OutgoingDamageMin, OutgoingDamageMax;   // ±10% variance
    public int AuraDpsApprox;                          // for aura-debuffs; 0 otherwise
    public float CastTimeEffective;                    // accounts for spell haste
    public float CooldownEffective;                    // accounts for haste
    public DateTime ComputedAtUtc;
}
```

### Effective-damage formula (locked)

`monster.combat.damage` and `monster.combat.magicDamage` already include all passive + buff bonuses (computed by `Combat.cs`). We read them directly; no manual buff summation.

```csharp
public static int OutgoingDamage(DamageSkill skill, int level, Combat casterCombat)
{
    int casterBase = skill.damageType switch
    {
        DamageType.Magic or DamageType.Fire or DamageType.Cold or DamageType.Disease
            => casterCombat.magicDamage,
        _ => casterCombat.damage
    };
    int raw = casterBase + skill.damage.Get(level);
    float pct = skill.damagePercent.Get(level);
    return pct > 0f ? Mathf.RoundToInt(raw * pct) : raw;
}
```

Variance bounds for display: `(0.9 × outgoing, 1.1 × outgoing)`. Per-victim modifiers (level diff, defense/resist mitigation) are not folded into the threat snapshot — they're victim-specific and irrelevant to "how dangerous is this skill in general".

For auras / DoT-debuffs (BuffSkill with negative `healingPerSecondBonus`):

```csharp
public static int AuraDpsApprox(BuffSkill aura, int level, int casterAttribute) =>
    Math.Abs(aura.healingPerSecondBonus.Get(level))
    + Mathf.RoundToInt(casterAttribute * 0.004f * Math.Abs(aura.healingPerSecondBonus.Get(level)));
```

(Verified against `Skills.GetHealthRecoveryBonus` lines 165–183.)

### Cast-time / cooldown effective formulas

Mirror what `UICastBarMonster.cs` and `Skills.cs` do:

```csharp
public static float CastTimeEffective(Skill s, Skills casterSkills) =>
    s.castTime - s.castTime * (s.data.isSpell ? casterSkills.GetSpellHasteBonus() : 0f);

public static float CooldownEffective(Skill s, Skills casterSkills) =>
    s.cooldown * (1f - casterSkills.GetHasteBonus());
```

These are denominators for progress bars. Numerator is always `end - serverNow`, read directly from the synced struct.

## Threat classification

`AutoThreat: ThreatTier` is computed once per `BossSkillRecord` whenever its `EffectiveSnapshot` is (re)built. Specific rule set is **deferred** — defaults will be tuned during implementation. Architecturally:

- `ThreatClassifier.Classify(BossSkillSnapshot snapshot, Thresholds thresholds) → ThreatTier`
- Pure function, no I/O, easy to unit-test.
- `Thresholds` is editable in **Settings → General** (sliders for damage cuts, cast-time cuts, etc.).
- Tier set: `Low | Medium | High | Critical`.

Indicative defaults — to be tuned during the implementation E2E pass, not locked here:

| Tier | Likely triggers (subject to tuning) |
|---|---|
| Critical | AOE damage skill with `OutgoingDamage ≥ critical_damage`, OR `CastTimeEffective ≥ 3s`, OR summons (prime interrupt targets) |
| High | AOE/target debuffs (`Stun`/`Fear`/`Blindness`), OR `OutgoingDamage ≥ high_damage`, OR `AuraDpsApprox ≥ aura_dps_high` |
| Medium | Other debuffs, single-target damage |
| Low | Buff-self, passive auras, default attacks |

Damage thresholds will be **absolute** so the same skill is classified the same on any boss using it; per-boss tuning lives in the override layer below.

## Settings inheritance chain

Three records, three nesting levels:

```
SkillRecord                bosses-agnostic; carries skill-level overrides
  └── BossRecord
        └── BossSkillRecord    boss-specific snapshot + boss-level overrides
```

Resolution at `AlertEvent` emission and at UI render time:

```
threat       = bosses[B].skills[S].UserThreat ?? skills[S].UserThreat ?? bosses[B].skills[S].AutoThreat
sound        = bosses[B].skills[S].Sound      ?? skills[S].Sound      ?? defaults[threat].Sound
alert_text   = bosses[B].skills[S].AlertText  ?? skills[S].AlertText  ?? "{DisplayName}!"
fire_on      = bosses[B].skills[S].FireOn     ?? skills[S].FireOn     ?? CastStart
muted        = bosses[B].skills[S].Muted      ?? skills[S].Muted      ?? false
```

The Settings UI shows the resolved value with a small badge ("auto" / "skill default" / "boss override") so users can see where each setting came from.

## Alert engine

Edge detection across consecutive `BossState` frames. Three triggers:

```
CastStart       prev.ActiveCast == null      AND curr.ActiveCast != null
CastFinish      prev.ActiveCast != null      AND curr.ActiveCast == null
                                             AND prev.castTimeEnd <= serverNow at transition
                (cancel-vs-finish: Skills.CancelCast sets castTimeEnd into the past;
                 deadline-not-reached → canceled → no event)
CooldownReady   prev.cooldownEnd > prev.serverNow   AND   curr.cooldownEnd <= curr.serverNow
```

### Dedup

Per `(netId, skillIdx)` the engine remembers the last `castTimeEnd` and `cooldownEnd` it fired for. New-instance detection requires a different value. Prevents flapping when SyncList values arrive across multiple frames.

### AlertEvent

```csharp
public readonly record struct AlertEvent(
    AlertTrigger Trigger,
    uint MonsterNetId,
    string BossId, string BossDisplayName,
    string SkillId, string SkillDisplayName,
    ThreatTier EffectiveThreat,
    string EffectiveSound,         // resolved from chain or threat default; never null
    string EffectiveAlertText,     // resolved or "{DisplayName}!"; may be empty if user blanked it
    bool Muted,
    double ServerTimeAtEvent
);
```

The engine resolves the inheritance chain once and stuffs the result into the event. Audio + AlertOverlay are pure consumers — they don't re-resolve.

### Coverage

Alerts fire for **all active bosses** (engaged ∪ proximate). Threat tier moderates loudness; per-skill mute is the per-user noise control. No second gate.

## Audio

### SoundBank

- **Built-in tones** generated on mod init via `AudioClip.Create(name, lengthSamples, channels, freq, false)` + `clip.SetData(float[], 0)`. No `PCMReaderCallback` — IL2CPP delegate marshaling is fragile.
  - Sample rate: 22050 Hz. Length: 200–500 ms each.
  - Defaults: `low` (440 Hz sine), `medium` (660 Hz), `high` (880 Hz), `critical` (1320 Hz triple-pulse), `chime` (sweep), `klaxon` (square wave alternating two pitches).
- **User WAVs**: scan `UserData/BossMod/Sounds/*.wav` once on startup and on a "Rescan" button in Sounds tab. Hand-parse RIFF/PCM header into a `float[]` sample buffer; `AudioClip.Create` + `SetData`. No `WWW`/`UnityWebRequest`.
- Tier defaults map: `Critical → critical`, `High → high`, `Medium → medium`, `Low → low`.

### SoundPlayer

- Single hidden `GameObject` with `AudioSource`. `Play(string clipName)` → `audioSource.PlayOneShot(clip)`.
- Master volume slider (Settings → General).
- Master mute (Settings → General checkbox; not bound to a hotkey by default — bindable).
- 200 ms anti-spam window per `(clipName)` to prevent stacking when multiple casts collide.

## UI windows

Five windows, five files. ImGui's `ini` file (forced to `UserData/BossMod/imgui.ini`) handles geometry persistence.

### CastBarWindow

- Vertical stack of bars. One bar per actively-casting active boss/elite.
- Sort: effective threat tier desc → remaining cast time asc.
- Cap at N bars (default 3, slider in Settings). Overflow → tiny `+N more casting` footer.
- Each bar: skill icon, skill name, time-remaining text, fill bar colored by effective threat tier.
- Anchored top-center by default. `NoInputs | NoTitleBar | NoBackground | NoMove | NoResize | NoScrollbar` in Normal Mode.

### CooldownWindow

- Sectioned list. One `CollapsingHeader` per active boss. Header: `[BossName · Lvl X · HP%]`.
- Each section: skill rows for special abilities only (idx ≥ 1), sorted by ETA asc. Off-cooldown rows show a green `READY` tag.
- Default expansion (configurable in Settings):
  - Targeted boss: expanded.
  - Other active bosses: collapsed.
- Section ordering: targeted boss first, then by distance to player.
- `NoInputs` flags as above in Normal Mode.

### BuffTrackerWindow

- "On You" pseudo-section at the top: debuffs from `Player.localPlayer.skills.buffs` whose source skill exists in `SkillCatalog` AND whose source boss is active. Always-expanded when non-empty. Visible regardless of activation, since health-relevant.
- Then sectioned list per active boss, same `CollapsingHeader` shape as Cooldown.
- Each row: buff/debuff/aura name, time-remaining bar, kind (buff blue / debuff red / aura purple).
- Same expansion defaults and `NoInputs` flags as Cooldown.

### AlertOverlay

- Stack of up to 4 simultaneous text alerts. Oldest evicted on overflow.
- Each entry tagged `(BossId, SkillId)`. Same `(BossId, SkillId)` triggered concurrently across multiple bosses → coalesces to one entry: `Inferno Blast (×3)`.
- TTL: 3 s default, 5 s for `Critical` tier.
- Render: top-center, large bold, threat-colored.
- `NoInputs | NoTitleBar | NoBackground | NoMove | NoResize | NoScrollbar` always (even in Config Mode — it's always click-through).
- Master mute affects audio only; alert text has its own setting (default: also muted by master mute, configurable).

### SettingsWindow

Five tabs:

- **Skills** — `GroupableTable<SkillRecord>`. Default group: effective threat tier. Toggle group: skill class, last-seen boss. Filter: substring match on id / display name. Click a row → side panel with full snapshot + editor (UserThreat dropdown, Sound dropdown, AlertText input, FireOn dropdown, Muted checkbox, Preview Sound button).
- **Bosses** — `GroupableTable<BossRecord>`. Default group: `ZoneBestiary`. Toggle: `Kind`, `Type`, ungrouped. Filter same. Click a row → editor showing every BossSkillRecord with the same per-row controls; boss-level override wins over skill-level.
- **Sounds** — list of available sounds (built-in + user WAVs). Each row: name, source, Preview button. Buttons: Rescan, Open Folder.
- **General** — checkboxes for window enable; thresholds sliders for ThreatClassifier; visibility radius (`proximity_radius`); `expansion_default` for collapsible sections; UI scale; master mute; alert-text-mute-on-master-mute checkbox; hotkey rebind (default: F8 = toggle Settings; nothing else bound).
- **Export / Import** — write `state.json` to a chosen path; load from one; reset to defaults. Hot-reload state.json button.

## Activation

A registered boss/elite is **active** (rendered in CastBar/Cooldown/BuffTracker AND eligible for alert firing) when **either**:

```
ENGAGED  (any of)
    monster.aggroList contains Player.localPlayer.netId
    monster.aggroList contains any party member's netId
        party member ∈ PlayerParty.party.members (string[]),
        resolved via Player.onlinePlayers[name] → .netId
    monster.aggroList contains any active mercenary's netId
        Player.localPlayer.NetworkactiveMercenary{1..4} → .netId  (skip nulls)
    monster.aggroList contains any pet/familiar owned by you or a party member
    Player.localPlayer.target == monster        // explicit targeting / scouting
OR
PROXIMATE
    Vector2.Distance(monster.position, Player.localPlayer.position) <= proximity_radius
        proximity_radius default 30 m, slider 10–80 step 5 in Settings → General
```

Plus: `monster.health.current > 0` AND scene is `World`.

Catalog discovery is **not** gated on activation. Every visible Monster contributes to the catalog as soon as it's seen; activation only filters rendering and alert firing.

## Config Mode

A boolean toggle in Settings → General. Available **only in `World` scene** (disabled with hint outside).

### Normal Mode (default)

| Window | Flags |
|---|---|
| CastBar / Cooldown / BuffTracker / Alert | `NoInputs | NoTitleBar | NoBackground | NoMove | NoResize | NoScrollbar` — fully click-through |
| Settings | normal flags |

### Config Mode

| Window | Flags |
|---|---|
| CastBar / Cooldown / BuffTracker | accept input; visible title bar + colored outline; movable + resizable |
| Alert | always click-through |
| Settings | normal |

A persistent banner appears top-center while Config Mode is active: `CONFIG MODE — drag windows to reposition · click here to exit`. Banner click + checkbox + Esc all exit.

Position/size changes during Config Mode persist via ImGui's ini handling.

## Hotkeys

| Default | Action |
|---|---|
| F8 | Toggle Settings window |

That's the entire default hotkey surface. All other actions live in Settings as buttons or checkboxes; users can rebind / add their own (master mute, individual window toggles, hot-reload state.json) via Settings → General.

## Persistence

Single `UserData/BossMod/state.json`. Schema:

```jsonc
{
  "version": 1,
  "global": {
    "thresholds": { "critical_damage": 200, "high_damage": 80, ... },
    "proximity_radius": 30,
    "ui_scale": 1.0,
    "muted": false,
    "alert_text_mute_on_master_mute": true,
    "expansion_default": "expand_targeted_only",
    "max_cast_bars": 3,
    "hotkeys": { "toggle_settings": "F8" }
  },
  "skills": {
    "<skill_id>": {
      "display_name": "...",
      "first_seen_utc": "...",
      "last_seen_in_boss": "...",
      "raw_snapshot": { ... },
      "user_threat": null | "Critical|High|Medium|Low",
      "sound": null | "<name>",
      "alert_text": null | "...",
      "fire_on": null | "CastStart|CastFinish|CooldownReady",
      "muted": null | true | false
    }
  },
  "bosses": {
    "<boss_id>": {
      "display_name": "...",
      "type": "Undead|Beast|...",
      "class": "Warrior|Mage|...",
      "zone_bestiary": "Crypt of Decay",
      "kind": "Boss|Elite|Fabled|WorldBoss",
      "last_seen_level": 10,
      "first_seen_utc": "...",
      "last_seen_utc": "...",
      "skills": {
        "<skill_id>": {
          "effective_snapshot": { ... },
          "auto_threat": "Critical|High|Medium|Low",
          "user_threat": null | "...",
          "sound": null | "...",
          "alert_text": null | "...",
          "fire_on": null | "...",
          "muted": null | true | false,
          "last_observed_utc": "..."
        }
      }
    }
  }
}
```

- Edits during play debounced flush every ~2 s of no further changes.
- Hard flush on `OnApplicationQuit` / mod teardown.
- Loaded once on mod init. No hot-reload from disk except via the explicit Settings → Export/Import button.
- Schema version field gates future migrations.
- Export = write to user-chosen path. Import = load from user-chosen path, replacing in-memory state (with confirmation).

## Performance budget

- MonsterWatcher: O(N_monsters) per frame for state read; O(N_monsters · K_skills) for cooldown reads. ~50 × 5 = 250 SyncList element reads/frame. Negligible.
- AlertEngine: O(N_monsters · K_skills) value comparisons against last-frame snapshot.
- BossSkillSnapshot recompute: edge-gated on `combat.damage` int delta, `combat.magicDamage` int delta, `skills.buffs.Count` delta, buffs identity hash delta. Few times per fight, not per-frame.
- ImGui render: ≤5 windows, ≤200 widgets total, well within frame budget given Erenshor's renderer perf characteristics.
- Aggro probes: ~50 monsters × (1 + party_size + mercenary_count) ≈ 250 dict lookups per frame. Negligible.

## ImGui rendering

Implement from scratch against MelonLoader / IL2CPP. Erenshor's `ImGuiRenderer.cs` (`~/Projects/Erenshor/src/mods/AdventureGuide/src/Rendering/ImGuiRenderer.cs`) is **not** a port target — it's a reference for known stumbling blocks and a sanity check on overall shape. We make our own architectural choices, particularly around the IL2CPP-specific concerns Erenshor's Mono environment didn't surface.

### Stumbling blocks to plan around (informed by Erenshor's experience)

- Native `cimgui.dll` loaded via embedded-resource extraction + `LoadLibrary` works under CrossOver too — it's still kernel32. Skip the rewrite if the file already exists; `LoadLibrary` on an in-use DLL increments refcount cleanly while a rewrite would fail with file-locked.
- ImGui font-atlas TTF memory must be allocated via `ImGui.MemAlloc`, not `Marshal.AllocHGlobal` — ImGui takes ownership and frees with its own allocator on context destruction.
- `ImGuiStyle.ScaleAllSizes` is **cumulative**. Keep an unscaled style baseline and re-apply from baseline on every scale change, otherwise sizes drift.
- Font atlas rebuilds (e.g. on scale change) must run on the render thread inside the OnGUI repaint event, not from arbitrary callers.
- The renderer needs a separate texture-id table for user-registered textures vs. the font atlas because UV transforms differ between them.
- ImGui's ini-path string must be pinned (`GCHandle.Alloc(..., GCHandleType.Pinned)`) for the lifetime of the context — ImGui reads the pointer each frame.
- For audio specifically: avoid `PCMReaderCallback` and other delegate-passing APIs (already locked in the Audio section). Same caution applies to any other Unity API that takes a managed delegate.

### IL2CPP / MelonLoader deltas we own

These are the actual differences from Erenshor's Mono environment that drive our implementation choices:

- All Unity types accessed as `Il2Cpp.UnityEngine.*` with explicit casts/wraps where IL2CPP requires them. P/Invoke and native loading are unchanged.
- `MelonMod.OnGUI()` is the repaint hook — no `MonoBehaviour` attachment needed for the renderer.
- Logging via `MelonLogger.Instance`.
- Cache path: `MelonUtils.UserDataDirectory + "/BossMod/cache"`.
- Input bridge written against the new InputSystem (`Mouse.current`, `Keyboard.current`) per `mods/CLAUDE.md`, not legacy `UnityEngine.Input`.
- `Assembly.GetManifestResourceStream` works identically — mod assembly is .NET, not IL2CPP.
- ILRepack merges `ImGui.NET.dll`, `System.Numerics.Vectors`, `System.Runtime.CompilerServices.Unsafe` into the single mod DLL so MelonLoader sees one assembly and avoids resolution surprises.
- `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>` in the csproj.

### Renderer architectural choices (decided during implementation)

Deferred from this spec because they're implementation details with multiple sane answers:

- Mesh batching strategy (one Mesh per ImDrawList vs. pooled vs. dynamic vertex buffer).
- Material setup — `UI/Default` is a reasonable starting shader, final choice during implementation.
- Texture registration API surface (whether and how user code can register Unity textures as ImGui texture IDs).
- CommandBuffer lifecycle (per-frame `Clear()` vs. retained).
- How input capture flags (`WantCaptureMouse`, `WantTextInput`) gate the game's own input handling — if at all needed for a HUD-only mod.

## Build / packaging

- `mods/BossMod/BossMod.csproj` based on `BossTracker.csproj`. Add NuGet refs:
  - `ImGui.NET 1.89.1`
  - `System.Numerics.Vectors 4.5.0`
  - `System.Runtime.CompilerServices.Unsafe 4.5.3`
  - `ILRepack.Lib.MSBuild.Task 2.0.34.2`
- Embedded resources: `cimgui.dll` (Windows; runs under CrossOver too).
- Build via `dotnet run --project build-tool all`. Auto-discovered.

## Testing strategy

- Unit-testable layers: `EffectiveValues` (pure), `ThreatClassifier` (pure), `AlertEngine` edge-detection (input: synthetic `BossState[before, after]`, output: `AlertEvent[]`), Settings inheritance resolver (pure).
- Integration: WAV header parser tested with crafted byte arrays.
- ImGui rendering: smoke test via HotRepl — load mod, spawn synthetic `BossState` against a stub `Monster`, assert windows draw without exceptions.
- E2E: launch game, engage a known elite, observe cast bar / cooldown / buff tracker / alerts. Iterate threshold defaults during this pass.

## Open items deferred to implementation

- Default values of `Thresholds` (critical_damage, high_damage, aura_dps_high, etc.) — tune during E2E pass.
- Specific WAV format compatibility scope (16-bit PCM mono is enough; stereo / 24-bit deferred unless trivially free).
- Whether buff-tracker "On You" filter should also match debuffs from non-active-tracked bosses (currently no — only catalog-known sources).
- Pet / familiar identification for the "owned by party member" branch of the activation rule — relies on `Pet.Networkowner`; verify the SyncVar is reachable from clients.
