using System;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using ImGuiNET;

namespace BossMod.Ui;

public static class Theme
{
    public const uint Critical = 0xFF3030FF;
    public const uint High = 0xFF4090FF;
    public const uint Medium = 0xFF40D0FF;
    public const uint Low = 0xFF80D080;
    public const uint Ready = 0xFF40D040;
    public const uint Aura = 0xFFD080FF;
    public const uint Debuff = 0xFF5050FF;
    public const uint Buff = 0xFFFFB060;
    public const uint ConfigOutline = 0xFF00D7FF;

    public const float MinUiScale = 0.6f;
    public const float MaxUiScale = 2.0f;

    public static uint ThreatColor(ThreatTier tier) => tier switch
    {
        ThreatTier.Critical => Critical,
        ThreatTier.High => High,
        ThreatTier.Medium => Medium,
        _ => Low,
    };

    public static void ApplyUiScale(Globals globals)
    {
        ImGui.GetIO().FontGlobalScale = Math.Clamp(globals.UiScale, MinUiScale, MaxUiScale);
    }
}
