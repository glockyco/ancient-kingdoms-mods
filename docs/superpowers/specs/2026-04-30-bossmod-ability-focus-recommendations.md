# BossMod Ability-Focus Recommendations

**Status:** Draft for discussion
**Date:** 2026-04-30
**Scope:** Refocus BossMod v1 on boss ability tracking: cast bars and cooldown/ability readiness. Remove buffs, sounds, and alerting from the v1 implementation until the ability baseline is reliable.

## Executive recommendation

Use a clean cutover to an ability-first BossMod v1:

1. **Keep** ImGui.NET, Settings, cast bars, cooldown/ability tracking, discovery, activation, state persistence, import/export, and threat classification where it directly helps ability prioritization.
2. **Remove** BuffTracker, player/boss buff extraction, sounds, SoundBank/SoundPlayer, sound settings, AlertOverlay, AlertEngine, alert settings, and audio helper tests/code. Do not hide these behind flags; delete the v1-inactive representation so the codebase has one truthful shape.
3. **Rename and reshape** the runtime cooldown surface into **Boss Abilities**. It should show every live skill index, with index 0/default attack first, then special abilities, then passive/aura/not-rolled effects in a low-emphasis group.
4. **Show chance carefully:** split timing probability from ability-pick probability. A header-level **Next special window** can estimate whether the hidden 5-9s random special gate is likely open; row-level **Roll chance** means `P(skill | boss is choosing a special now)`.
5. **Simplify Settings:** the Bosses tab should list one row per boss. The selected boss details pane should show all abilities for that boss, default attack first, with the v1-surviving config settings inline or expandable per row.
6. **Polish readability deliberately:** use Roboto Regular, rebuild the atlas at exact UI scale, and ship Compact/Expanded density modes so the same ability model works during combat and review.

This gives the mod a smaller, more reliable promise: "What abilities does this boss have, what is ready, what can be rolled next, and what is being cast now?"

## Server mechanics findings

### Skill list and index 0

Observed in `server-scripts/MonsterSkills.cs` and `server-scripts/Monster.cs`:

- `MonsterSkills.OnStartServer()` copies `skillTemplates` into the runtime `skills` SyncList in order (`MonsterSkills.cs:15-21`). Runtime index equals template order.
- `MonsterSkills.NextSkill()` only iterates `for (int i = 1; i < skills.Count; i++)` when choosing special skills (`MonsterSkills.cs:37`).
- `NextSkill()` returns `0` when the special gate is closed or there are no non-auto candidates (`MonsterSkills.cs:27-31`, `MonsterSkills.cs:157-160`).
- Monster state code assigns `currentSkill = EventStartUsingSpecialSkill() ? NextSkill() : 0` in normal attack flows (`Monster.cs:1162-1165`, `Monster.cs:1480-1483`).
- Slot 0 is also used as the baseline attack range for chase/reposition behavior (`Monster.cs:1449` and related flow).

Conclusion: index 0 should be modeled explicitly as the default/fallback attack ability. The UI can label it "Default" or "Auto" but should avoid pretending it participates in the weighted special roll.

### Cast and cooldown timing

Observed in `server-scripts/Skill.cs` and `server-scripts/Skills.cs`:

- Runtime `Skill` stores `castTimeEnd` and `cooldownEnd` (`Skill.cs:14-16`).
- `Skill.CastTimeRemaining()` and `Skill.CooldownRemaining()` compute remaining time from corrected server time and clamp to the configured total (`Skill.cs:154-174`).
- `Skills.StartCast()` sets `skill.castTimeEnd = serverTime + skill.castTime`, reduced by spell haste for spell skills (`Skills.cs:642-677`).
- `Skills.FinishCast()` sets `cooldownEnd = now + skill.cooldown` for normal spell/non-melee finish paths (`Skills.cs:742-774`).
- `Skills.FinishCastMeleeAttackMonster()` applies haste to cooldown for non-spell monster melee paths (`Skills.cs:804-816`).
- If a monster is stunned while casting, the current skill gets a half cooldown (`Monster.cs:1531-1539`).
- After a skill finishes, the monster has a 0.5s refractory gate before another skill can start (`Monster.cs:1640-1642`, `Monster.cs:3342-3345`).

Conclusion: per-ability cooldown and active cast timing are real SyncList facts and are safe to display. They should remain the backbone of v1.

### Special-skill selection and conditional chance

`MonsterSkills.NextSkill()` builds a candidate list from indices 1..N and weighted-random selects one. Selection is conditional on the server deciding that a special roll is allowed at that moment.

Special candidates are excluded when:

- The skill is passive (`PassiveSkill`) (`MonsterSkills.cs:41-44`).
- The skill is an area buff aura or area debuff aura (`MonsterSkills.cs:45-54`).
- `CastCheckSelf(skill)` fails, which includes cooldown/cast readiness plus resources, health, dungeon allowance, and weapon/ammo constraints (`MonsterSkills.cs:62-64`, `Skill.cs:77-84`, `ScriptableSkill.cs:105-143`, `TargetProjectileSkill.cs:103-109`).
- Targeted damage/debuff/projectile skills have no live target or the target is out of range (`MonsterSkills.cs:137-148`).
- Area damage/debuff skills have no attackable entity in their radius (`MonsterSkills.cs:99-135`).
- Summon skills fail their summon-specific constraints (`MonsterSkills.cs:67-86`).
- Heal/self-healing buff skills are skipped if boss health is at least 75% (`MonsterSkills.cs:88-97`).

Weights when eligible:

- Base weight: `1.0` (`MonsterSkills.cs:66`).
- Summon skills: `x1.5` (`MonsterSkills.cs:67-86`).
- Heal/self-healing buff skills: `x4.0` below 30% HP, `x2.5` below 50% HP, `x1.5` below 75% HP (`MonsterSkills.cs:88-97`).
- Area damage/debuff: `x1.3` for one valid target, `x2.0` for two, `x3.0` for three or more (`MonsterSkills.cs:99-135`).
- Target projectile: `x1.5` when target distance is greater than 70% of cast range (`MonsterSkills.cs:149-151`).

The selection formula is:

```text
P(skill i | special roll now, eligible set E) = weight_i / sum(weight_j for j in E)
```

If no candidates are eligible, `NextSkill()` returns index 0. If candidates exist and the normal `NextSkill()` path is used, index 0 has 0% chance for that special roll. Between special rolls, index 0 remains the default fallback.

There is also a secondary moving/out-of-range branch in `Monster.cs:1444-1463`: while chasing a too-far target, the monster has an opportunistic `Random.value > 0.98` branch that builds a different candidate set from longer-range viable skills and chooses uniformly among them. In that state, some short-range skills cannot be used at all, some long-range skills still can, and the normal `NextSkill()` weighted chance no longer applies. The UI should switch to clear player language such as **Chasing target: ranged abilities may be used while the boss closes distance**, with row notes like `can reach while chasing`, `too short to reach`, or `needs nearby targets`.

### Special timing is a hidden random window, not an exact timestamp

The server has several gates before a non-auto skill can be used:

- First special roll cannot happen until at least 5s after combat start (`EventStartUsingSpecialSkill()`, `Monster.cs:1078-1080`). `startCombatTime` is assigned on aggro (`Monster.cs:1917`, `Monster.cs:1925`).
- After a skill finishes, the monster waits 0.5s before starting another (`refractoryPeriodSkillTimeEnd`, `Monster.cs:1640-1642`, `Monster.cs:3342-3345`).
- `MonsterSkills.nextSpecialCastTime` is a private field (`MonsterSkills.cs:13`). It gates `NextSkill()` (`MonsterSkills.cs:27-31`). It is reset to:
  - now + 2..4s when a special roll finds no eligible candidates (`MonsterSkills.cs:157-160`),
  - now + 5..9s after a non-auto candidate is selected (`MonsterSkills.cs:179-180`).

`nextSpecialCastTime` is not shown as a `SyncVar` in the inspected code. [inference] BossMod should not display an exact authoritative timestamp. It can still display a useful estimate without lying, but the estimate should distinguish the first special from later specials:

- **Before the first observed non-auto ability:** show the known 5s minimum after engagement. If BossMod can infer engagement start, display `First special: locked, earliest in Xs`, then `First special: check open` after 5s. If the boss is only targeted/proximate and not engaged, display `Special timing starts on engagement`.
- **After an observed non-auto ability:** show **Next special window** as `locked` for the first 5s after that ability, then ramp an **opening estimate** from 0% to 100% across 5-9s, then show `open estimate`.

That estimate is about the hidden timing window, not about which ability will be selected.

Recommended user-facing labels:

- `First special: locked, earliest in 3.2s`
- `First special: check open; 2 specials ready`
- `Next special: opening 55% (estimate)`
- `Next special: open estimate; 2 specials ready`
- `No special ready: next ability cooldown in 4.2s`

This addresses the same mechanic as a "global cooldown" for non-default abilities while keeping the player-facing model understandable. Row-level ability percentages still mean "if a special is picked now," not "this ability has X% chance to be the next cast overall."


## Current BossMod mismatch

Current BossMod already harvests catalog data for every skill index, including index 0, but the runtime UI state drops index 0 before rendering:

- `MonsterWatcher.HarvestCatalog()` iterates `i = 0` through the live skill list (`mods/BossMod/Tracking/MonsterWatcher.cs:134-176`).
- `MonsterWatcher.BuildState()` only creates `ActiveCast` when `currentSkill > 0` (`MonsterWatcher.cs:233-254`).
- `MonsterWatcher.BuildState()` builds cooldowns with `for (int i = 1; i < skillsList.Count; i++)` (`MonsterWatcher.cs:256-274`).
- `CooldownWindow` repeats the `SkillIdx >= 1` filter (`mods/BossMod/Ui/CooldownWindow.cs:32`, `CooldownWindow.cs:58-60`).
- `CastInfo`, `SkillCooldown`, and `BossState` carry no chance, role, eligibility, or special-roll gate data.

The right fix is not to remove only the UI filter. The model should be renamed/reframed from "cooldowns for special skills" to "boss ability state" and should include all live abilities with explicit roles.

## Recommended product shape

### Cast bars

Keep cast bars as the urgent "what is happening now" surface.

Recommended behavior:

- Show active non-auto casts by default.
- Include index 0 in tracking, but do not make fast default attacks dominate the cast-bar window unless later live testing proves that is useful. The ability table will already show auto attack readiness.
- If a default attack has a long or dangerous cast, the model should allow it to appear; the UI should make this a role-aware decision, not an upstream data omission.
- Sort by threat/importance first, then remaining cast time, preserving the current useful behavior.

### Boss Abilities runtime window

Rename the user-facing runtime window to **Boss Abilities**. `Cooldowns` becomes inaccurate once the surface includes default attack, readiness, current cast state, conditional roll chance, and timing-window estimates. Avoid `Upcoming Abilities` because it implies an exact sequence the client cannot truthfully know.

Per boss header:

```text
Boss Name  Lv 40  HP 72%     Specials ready: 2/4     Next special: opening 55% (estimate)
```

Recommended density modes:

- **Compact** should be the default combat layout: one row per ability, minimal columns, default attack first, short state labels.
- **Expanded** should be available in v1: it adds cast time, cooldown/range, longer notes, and eligibility reasons for players who want to learn an encounter.
- The density toggle belongs in Settings and can also be exposed as a small control in the Boss Abilities window header if it does not add clutter.

Compact row columns:

```text
#  Ability              Ready      Roll             Note
0  Normal Attack        now        fallback         between specials
1  Frost Breath         now        50% if special   eligible
2  Tail Slam            4.2s       0%               cooldown
3  Glacial Renewal      HP >75%    0%               self HP gate
+  Not rolled           2 effects  --               passive/aura rows
```

Expanded row columns:

```text
#  Ability              State        Ready      Cast   CD/Range      Roll chance       Note
0  Normal Attack        default      now        1.0s   0s / 2.0m     fallback          used between specials
1  Frost Breath         ready        now        0.7s   15s / 6.0m    50% if special    eligible
2  Tail Slam            cooling      4.2s       0.8s   8s / 2.0m     0%                cooldown
3  Glacial Renewal      blocked      HP >75%    1.0s   40s / self    0%                self HP gate
+  Not rolled           2 effects    --         --     --            --                passive/aura rows
```

Sorting recommendation:

1. Always show index 0/default attack first, as requested, but keep it compact and visually subdued so it does not bury preparation value.
2. Show currently casting or ready special rows next.
3. Show cooling-down special rows by remaining cooldown.
4. Collapse passives/auras/not-rolled effects under a low-emphasis `Not rolled` section in the runtime window. Show them fully in Settings.

Compact runtime sketch:

```text
+ Boss Abilities ------------------------------------------------+
| Ancient Wyvern  Lv 40  HP 72%  Targeted      [Compact v]       |
| Specials ready 2/4 | Next special: opening 55% (5-9s estimate) |
|----------------------------------------------------------------|
| #  Ability              Ready    Roll              Note         |
| 0  Claw Swipe           now      fallback          default      |
| 1  Frost Breath         now      50%               eligible     |
| 2  Tail Slam            4.1s     0%                cooldown     |
| 3  Glacial Renewal      HP >75%  0%                self HP gate |
| +  Not rolled: 2 passive/aura effects                          |
+----------------------------------------------------------------+
```

Expanded runtime sketch:

```text
+ Boss Abilities ------------------------------------------------+
| Ancient Wyvern  Lv 40  HP 72%  Targeted      [Expanded v]      |
| Specials ready 2/4 | Next special: opening 55% (5-9s estimate) |
|----------------------------------------------------------------|
| #  Ability         State    Ready    Cast  CD/Range    Roll     |
| 0  Claw Swipe      default  now      0.8s  0s / 2m     fallback |
| 1  Frost Breath    ready    now      1.2s  15s / 6m    50%      |
| 2  Tail Slam       cooling  4.1s     0.7s  8s / 2m     0%       |
| 3  Glacial Renewal blocked  HP >75%  1.0s  40s / self  0%       |
+----------------------------------------------------------------+
```

Chasing/out-of-range sketch:

```text
+ Boss Abilities -----------------------------------------------+
| Ancient Wyvern  HP 72%      Chasing: ranged picks differ       |
| Long-range abilities may be used while the boss closes distance|
|----------------------------------------------------------------|
| #  Ability              State              Ready     Note       |
| 0  Claw Swipe           default            now       too far    |
| 1  Frost Breath         usable             now       can reach  |
| 2  Tail Slam            blocked            now       too short  |
| 3  Ice Volley           usable             2.0s      can reach  |
+----------------------------------------------------------------+
```

In chasing state, suppress the normal weighted `Roll chance` or relabel it as a chase-specific estimate only after the chase branch is explicitly modeled. The server is using different conditions in that state, so one combined percentage would look authoritative while hiding a changed selection rule.

### Chance labels

Use precise names that do not overpromise:

- **Recommended column title:** `Roll chance`
- **Tooltip/explanatory text:** `Chance if the server performs a special-skill roll now. Default attack is used outside special rolls or when no special is eligible.`
- **Avoid:** `Next cast chance`, `Will use`, or a bare `%` with no condition.

Suggested confidence states:

- `Exact from visible inputs` — only when all inputs for the relevant branch are modeled from current live state.
- `Estimated` — some inputs are approximated, such as visible nearby valid target count or hidden roll gate.
- `Unknown` — target visibility, private server gate, or eligibility inputs are missing.

For v1, implement the normal `NextSkill()` weighted model first. In chasing/target-far state, either show a separate chase-specific estimate or suppress percentages and use row notes (`can reach`, `too short`, `needs nearby targets`) until the branch is explicitly modeled.

### Settings UI improvements

Settings should use fewer top-level concepts and more useful detail panes:

- Tabs: **General**, **Bosses**, **Skills**, **Data**. Remove **Sounds**.
- General: display scale/font, runtime window toggles, tracking radius, and advanced threat thresholds. Treat layout/config mode as an action (`Move windows` / `Done moving`) rather than a hidden preference.
- Bosses: one row per boss in the left list. The details pane shows all abilities for that boss and boss-specific overrides.
- Skills: one row per global skill. The details pane shows global defaults and a read-only list of bosses using that skill. Boss-specific tuning belongs in the Bosses details pane.
- Data: import/export/reload/reset, active state path, and last action result. Keep destructive reset visually separated from routine actions.

Bosses settings sketch:

```text
+ BossMod Settings ----------------------------------------------+
| General | Bosses | Skills | Data                               |
|-----------------------------------------------------------------|
| Filter bosses: [wyvern________________]                        |
| +-------------------------+-----------------------------------+ |
| | Ancient Wyvern          | Ancient Wyvern                    | |
| | Lv 40 | 5 abilities     | Lv 40 | Fabled | Frostvale        | |
| | Frostvale               |                                   | |
| |                         | Abilities                         | |
| | Bone Tyrant             | #  Ability          Imp   Cast  HUD  | |
| | Lv 38 | 4 abilities     | 0  Claw Swipe      Low   Auto  Yes  | |
| |                         | 1  Frost Breath    High  Yes   Yes  | |
| | Ember Matriarch         | 2  Tail Slam       Med   Auto  Yes  | |
| | Lv 42 | 6 abilities     | 3  Glacial Renewal High  Yes   Yes  | |
| |                         | +  Not rolled      2 effects      | |
| +-------------------------+-----------------------------------+ |
+-----------------------------------------------------------------+
```

Expanded ability row sketch:

```text
#1 Frost Breath
  Importance: [High v]        Source: boss override
  Show in Cast Bars: [Auto v] Show in Boss Abilities: [Always v]
  Observed: cast 1.2s | cooldown 15.0s | range 6.0 | damage 420-510
```

External references that support this direction:

- DBM defaults to grouping configuration by ability because it is easier to find all options for a specific ability in one place: https://github.com/DeadlyBossMods/DeadlyBossMods/wiki/%5BNew-User-Guide%5D-Choosing-Option-Format
- DBM timer metadata supports variance windows with minimum and maximum timer values, which supports showing BossMod's random hidden timing as a window/estimate rather than a false exact timestamp: https://github.com/DeadlyBossMods/DeadlyBossMods/wiki/%5BInfo%5D-DBM-Events
- DBM colors bars by timer type to make important bars easier to identify quickly; BossMod should use similarly sparse semantic color, not decorative styling: https://github.com/DeadlyBossMods/DeadlyBossMods/wiki/%5BGuide%5D-Color-bars-by-type
- BigWigs uses movable anchors and test bars/messages for layout, which maps well to BossMod's Config Mode with sample Cast Bars and Boss Abilities content: https://github.com/BigWigsMods/BigWigs/wiki


### Typography and readability

The current renderer uses Dear ImGui's default ProggyClean/Proggy-style font through `io.Fonts.AddFontDefault()` (`mods/BossMod/Imgui/ImGuiRenderer.FontAtlas.cs`). Dear ImGui's own font docs say the default ProggyClean bitmap font is pixel-perfect at 13px but does not scale very nicely. That matches the manual readability concern.

Recommendation:

- Use Roboto Regular as the default BossMod UI font at a base size around 16px, then tune after live display testing.
- Embed the font as a BossMod resource rather than loading from a user-path file. This keeps startup deterministic under CrossOver/MelonLoader and avoids working-directory problems.
- Load it with `AddFontFromMemoryTTF` before building the atlas. Because ImGui.NET 1.89.1 uses the pre-1.92 font atlas behavior, keep glyph ranges explicit and persistent through atlas build.
- Use a deliberately small v1 glyph range: ImGui default Latin plus explicit punctuation that improves readability in this UI, such as en dash, em dash, bullet, multiplication sign, and percent if not already covered. Prefer ASCII labels where practical and avoid broad Unicode ranges that inflate the atlas.
- Preserve a fallback to `AddFontDefault()` if the embedded font resource is missing, but treat that as a logged degradation, not the expected path.
- Replace `FontGlobalScale`-only scaling with a render-thread-safe font atlas rebuild at the selected UI scale. Scale changes are rare, and rebuilding the atlas at the exact selected scale is the right readability-first behavior.
- Do not copy Erenshor's renderer wholesale. Its AdventureGuide renderer has the useful shape of embedding `Roboto-Regular.ttf`, loading it from memory, and rebuilding the atlas on scale changes, but it also uses byte-level `ImGuiStyle` backup/restoration and direct cimgui glyph range builder calls. For BossMod, extract only the proven concepts and implement a small `FontAtlasOptions`/`FontAtlasBuilder` boundary that fits the existing partial renderer.

The font change should be its own small implementation checkpoint after the ability-focus cutover or bundled with the UI table redesign if it materially affects row density. It should be manually verified in the main menu and World scene at the supported UI scale range.

Technical evidence:

- Current BossMod font path: `io.Fonts.AddFontDefault()` in `mods/BossMod/Imgui/ImGuiRenderer.FontAtlas.cs`.
- Dear ImGui font docs: external TTF/OTF fonts are supported; `AddFontFromMemoryTTF` transfers ownership of the memory buffer by default; pre-1.92 builds require explicit glyph ranges for non-ASCII; large glyph ranges can cause oversized atlas textures.
- Google Fonts documents Roboto as open-source and its license page states the font is under the SIL Open Font License 1.1, which allows bundling/embedding with software when the copyright and license are preserved.
- Erenshor reference implementation: `/Users/joaichberger/Projects/Erenshor/src/mods/AdventureGuide/src/Rendering/ImGuiRenderer.cs` embeds `Roboto-Regular.ttf`, reads it from a manifest resource, allocates ImGui-owned memory, calls `AddFontFromMemoryTTF`, and rebuilds the atlas on scale changes. Useful reference, but not a drop-in design for BossMod.

Resolved font decisions:

1. Roboto Regular is the default font.
2. UI scale rebuilds the font atlas at the exact selected scale.
3. Include a small punctuation range for cleaner typography; do not include broad CJK/emoji/icon ranges in v1.


## Recommended technical design

### Clean-cutover data model

Replace the current `BossState.Cooldowns` representation with one ability list. Do not keep both long-term.

Candidate pure Core records:

```csharp
public enum BossAbilityRole
{
    Default,
    Special,
    Passive,
    Aura,
    NotRolled,
}

public enum AbilityEligibilityKind
{
    Eligible,
    DefaultFallback,
    OnCooldown,
    Casting,
    Passive,
    Aura,
    NoTarget,
    TargetOutOfRange,
    NoAreaTargets,
    HealthGate,
    SummonGate,
    ResourceGate,
    Unknown,
}

public enum ChanceConfidence
{
    ExactFromVisibleInputs,
    Estimated,
    Unknown,
}
public enum SpecialTimingPhase
{
    Unknown,
    Locked,
    OpeningEstimate,
    OpenEstimate,
}

public enum AbilityDisplayPolicy
{
    Auto,
    Always,
    Hidden,
}

public enum BossAbilityDensity
{
    Compact,
    Expanded,
}


public sealed class BossSpecialTimingState
{
    public SpecialTimingPhase Phase { get; init; }
    public double? EarliestSpecialServerTime { get; init; }
    public float? WindowOpenEstimate { get; init; }
    public string DisplayText { get; init; } = "";
}

public sealed class BossAbilityState
{
    public int SkillIndex { get; init; }
    public string SkillId { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public BossAbilityRole Role { get; init; }
    public string SkillClass { get; init; } = "";

    public double CastTimeEnd { get; init; }
    public float TotalCastTime { get; init; }
    public double CooldownEnd { get; init; }
    public float TotalCooldown { get; init; }

    public bool IsCurrent { get; init; }
    public bool IsReady { get; init; }
    public AbilityEligibilityKind Eligibility { get; init; }

    public float? SelectionWeight { get; init; }
    public float? ConditionalRollChance { get; init; }
    public ChanceConfidence ChanceConfidence { get; init; }
}
```

This is a sketch, not a final API. The important principle is that role, eligibility, readiness, conditional roll chance, boss-level special timing, and display policy belong in pure representations consumed by UI. UI should not probe IL2CPP objects to answer mechanics questions.

Persistent v1 ability config should keep the inheritance chain already used for threat overrides: `BossSkillRecord.UserX ?? SkillRecord.UserX ?? auto/default`. The retained config fields should include `UserThreat`, `CastBarVisibility`, and `BossAbilityVisibility`; global UI settings should include the Boss Abilities density (`Compact` or `Expanded`). This keeps the Bosses details controls meaningful without reintroducing sounds or alerts.


### Mechanics estimator

Add a pure Core estimator that mirrors `MonsterSkills.NextSkill()` as a policy model. The IL2CPP layer gathers inputs; Core computes roles, eligibility, weights, and conditional chances.

Required input facts include:

- Boss health percent.
- Skill index, class, cooldown/cast readiness, cast range, cooldown, cast time, spell flag.
- Current target existence, target type, target health, and distance.
- Nearby valid target count for area damage/debuff skills.
- Summon pet count and summon skill limits.
- Resource/self-check result where observable.
- Whether the boss is in the moving/out-of-range branch.
- Last observed non-auto ability time and engagement-start estimate for the `Next special` timing-window estimate.

If an input is not available, the estimator should return `Unknown` or `Estimated`, not a made-up exact chance.

### Tracking boundary

Keep the architecture boundary:

- `MonsterWatcher` reads IL2CPP/Unity state and builds raw input facts.
- `BossMod.Core` computes ability role/eligibility/chance from pure inputs.
- `UiFrameBuilder` stays a frame composer.
- `CooldownWindow`/future `AbilityWindow` renders pure data only.

This preserves the current rule that UI never reads game singletons and Core remains pure C#.

### Removal cutover

Remove distracting subsystems in the same coherent change set:

Runtime/UI deletion or simplification:

- Delete `mods/BossMod/Audio/AlertSubscriber.cs`.
- Delete `mods/BossMod/Audio/SoundBank.cs`.
- Delete `mods/BossMod/Audio/SoundPlayer.cs`.
- Delete `mods/BossMod/Ui/AlertOverlay.cs`.
- Delete `mods/BossMod/Ui/BuffTrackerWindow.cs`.
- Delete `mods/BossMod/Ui/Tabs/SoundsTab.cs`.
- Delete `mods/BossMod/Ui/Settings/SoundPreview.cs`.
- Remove `SoundBank`, `SoundPlayer`, `AlertEngine`, `AlertOverlay`, `AlertSubscriber`, `BuffTrackerWindow`, and `ProcessAlerts()` wiring from `BossMod.cs`.
- Remove `BuffTrackerWindow` and `AlertOverlay` dependencies from `BossModUi`.
- Remove the Sounds tab from `SettingsWindow`.
- Remove sound/alert controls from `SkillsTab`, `BossesTab`, `SettingsTabHelpers`, and `GeneralTab`.

Core deletion or simplification:

- Delete `mods/BossMod.Core/Alerts/AlertEngine.cs` and `AlertEvent.cs` if no visual alerts remain.
- Delete Core audio helpers/tests if no sound functionality remains: `Tone`, `WavHeader`, `WavPcm16`, `SoundRateLimiter`, and their tests.
- Delete `BuffSnapshot` and remove `BossState.Buffs`.
- Remove player-buff view models from `UiFrame`, `PlayerContextBuilder`, and `UiFrameBuilder`.
- Remove `Sound`, `AlertText`, `FireOn`, and `AudioMuted` from `SkillRecord` and `BossSkillRecord`.
- Remove `Muted`, `MasterVolume`, `AlertTextMuteOnMasterMute`, and `ShowBuffTrackerWindow` from `Globals`.
- Remove `UnityEngine.AudioModule`, `UnityEngine.UnityWebRequestModule`, and `UnityEngine.UnityWebRequestAudioModule` references from `BossMod.csproj` if no remaining file needs them.

Persistence:

- Existing state files may contain removed sound/alert/buff fields. System.Text.Json ignores unknown properties by default, so the old state can still load and the obsolete fields will disappear on the next write.
- Do not preserve dead fields solely for compatibility. If we want an explicit audit trail, add a concise schema/migration note in docs rather than keeping inert properties in code.
- Avoid bumping the schema version if doing so would discard existing discovered bosses/skills. The shape change is backward-compatible because removed properties can be ignored.

## Alternatives considered

### A. Hide sounds/buffs/alerts but keep code

This is the fastest diff, but it leaves dead state, dead tests, dead settings, and per-frame extraction work. It also makes future maintainers wonder which representation is canonical. I do not recommend this.

### B. Clean ability-first cutover

Delete v1-inactive subsystems and replace the cooldown model with a complete ability-state model. This is the best long-term path: fewer moving parts, one data representation, and the UI promise matches what the system can actually know. I recommend this approach.

### C. Exact encounter timeline / DBM alerts now

This would try to reconstruct the hidden `nextSpecialCastTime` as an exact future cast timestamp or reintroduce alerting before the ability model is reliable. The server code does not expose enough synchronized state to support exact timestamps today. A header-level timing-window estimate is useful and recommended; a full encounter timeline should wait until the ability-state baseline is proven.

## Resolved UI decisions from review feedback

1. Rename the runtime cooldown window to **Boss Abilities**.
2. Show index 0/default attack first in both runtime and Settings ability lists.
3. Use a header-level **Next special** timing-window estimate instead of exposing hidden server-gate terminology.
4. Keep passives/auras visible in Settings and collapsed under `Not rolled` in runtime by default.
5. Make Bosses Settings one row per boss; show that boss's complete ability/config table in the details pane.
6. Use Roboto Regular as the default font, rebuild the font atlas at the exact selected UI scale, and include only a small punctuation range beyond default Latin.
7. Ship Compact and Expanded density modes for Boss Abilities in v1; Compact is the default combat layout.
8. Display the first-special estimate as soon as engagement timing can be inferred: known 5s minimum first, then an open/checking state. Use the 5-9s opening estimate after observed non-auto abilities.
9. Include `Importance`, `Show in Cast Bars`, and `Show in Boss Abilities` controls in Bosses detail ability rows.

## Remaining implementation notes

1. If engagement start cannot be inferred for a targeted/proximate but unengaged boss, show `Special timing starts on engagement` rather than starting a misleading countdown.
2. The density toggle should persist globally unless live testing shows per-window or per-boss density is needed.
3. The first implementation can store display policies as nullable boss-skill and skill-level overrides to preserve the existing inheritance model.

## Proposed next step

After discussion, write a replacement design/spec for BossMod v1 ability focus, then an implementation plan with review checkpoints. The first implementation checkpoint should remove buffs/sounds/alerts cleanly and keep the build passing. The second should replace `Cooldowns` with the complete ability-state model and update the UI. The third should add the conditional chance estimator and live verification checklist.