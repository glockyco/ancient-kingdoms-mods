namespace BossSkillTracker.Model;

public static class Tuning
{
    // Gate timing (seconds). The two gate constants are the game's own, not estimates:
    // Monster.EventStartUsingSpecialSkill withholds specials until startCombatTime + 5, and
    // Monster.TryStartBossEliteBackReposition opens a 2.5 + 10 second basic-only window.
    public const double SpecialWarmupSeconds = 5.0;
    public const double BasicOnlySeconds = 12.5;
    public const double CombatGraceSeconds = 3.0;

    // Monster.StartRefractoryPeriod holds a monster for half a second after a basic attack, so a
    // basic attack cycle is its cast plus its cooldown plus this.
    public const double RefractorySeconds = 0.5;

    // MonsterSkills.NextSkill pushes its deadline by Random.Range(6, 12) after it selects a skill
    // and by Random.Range(2, 4) after it finds none. A push below the lower bound came from the
    // second branch. A client of a remote server never receives the deadline, so it derives a
    // window from these two bounds instead.
    public const double SpecialGateMinSeconds = 6.0;
    public const double SpecialGateMaxSeconds = 12.0;

    // Discovery loop.
    public const float ScanIntervalSeconds = 0.2f;
    public const float DiscoveryRadius = 50f;
    public const int OverlapBufferSize = 64;

    // Canvas / panel.
    public const int CanvasSortingOrder = 32760;
    public const float PanelWidth = 300f;
    public const float PanelDefaultX = 0f;
    public const float PanelDefaultY = 0f;
    public const int PanelPositionVersion = 2;
    public const float GroupSpacing = 8f;

    // Group / row layout (px).
    public const float HeaderHeight = 46f;
    public const float GateHeight = 60f;
    public const float RowHeight = 42f;
    public const float RowHeightCompact = 24f;
    public const float IconSize = 28f;
    public const float IconSizeCompact = 22f;
    public const float HeaderPortraitSize = 30f;
    public const float HeaderPortraitSizeCompact = 24f;
    public const float IconBorder = 2f;
    public const float ControlIconSize = 18f;
    public const float ControlGap = 4f;
    public const float RowBarHeight = 7f;
    public const float RowStateWidth = 44f;
    public const float RowCastWidth = 60f;
    public const float GateTrackHeight = 12f;
    public const float GateStatusWidth = 72f;
    public const float GateReadoutWidth = 96f;
    public const float StripeHeight = 2f;
    public const float LineWidth = 1f;
    public const float Pad = 6f;
    public const float NameSize = 14f;
    public const float RowNameSize = 13f;
    public const float SmallSize = 11f;
    public const float StateSize = 12f;
}
