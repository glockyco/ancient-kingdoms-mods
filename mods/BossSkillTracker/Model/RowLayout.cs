namespace BossSkillTracker.Model;

public readonly struct RowLayoutVm
{
    public readonly float NameRightOffset;
    public readonly bool ShowCastLabel;

    public RowLayoutVm(float nameRightOffset, bool showCastLabel)
    {
        NameRightOffset = nameRightOffset;
        ShowCastLabel = showCastLabel;
    }
}

public static class RowLayout
{
    public static RowLayoutVm For(float stateWidth, float pad, float castWidth, bool casting)
    {
        float stateLeft = -(stateWidth + pad);
        return new RowLayoutVm(casting ? stateLeft - castWidth : stateLeft, casting);
    }
}
