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
