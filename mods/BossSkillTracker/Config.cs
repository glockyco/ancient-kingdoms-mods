using BossSkillTracker.Model;
using MelonLoader;

namespace BossSkillTracker;

public sealed class Config
{
    private readonly MelonPreferences_Category _category;

    public readonly MelonPreferences_Entry<float> PanelX;
    public readonly MelonPreferences_Entry<float> PanelY;
    public readonly MelonPreferences_Entry<bool> Locked;
    public readonly MelonPreferences_Entry<bool> Compact;
    public readonly MelonPreferences_Entry<int> PanelPositionVersion;

    public Config()
    {
        _category = MelonPreferences.CreateCategory("BossSkillTracker");
        PanelX = _category.CreateEntry("PanelX", Tuning.PanelDefaultX, "Panel X");
        PanelY = _category.CreateEntry("PanelY", Tuning.PanelDefaultY, "Panel Y");
        PanelPositionVersion = _category.CreateEntry("PanelPositionVersion", 0, "Panel position schema version");
        Locked = _category.CreateEntry("Locked", false, "Lock position");
        Compact = _category.CreateEntry("Compact", false, "Compact mode");

        if (PanelPositionVersion.Value < Tuning.PanelPositionVersion)
        {
            PanelX.Value = Tuning.PanelDefaultX;
            PanelY.Value = Tuning.PanelDefaultY;
            PanelPositionVersion.Value = Tuning.PanelPositionVersion;
            Save();
        }
    }

    public void Save() => _category.SaveToFile();
}
