using System;
using System.Collections.Generic;
using MelonLoader;

namespace PocketCompendium.Core.Settings;

/// <summary>
/// One page of Pocket Compendium's settings window, saved as one category of
/// <c>UserData/MelonPreferences.cfg</c>. A page lists its rows in the order the window shows
/// them. Values the window does not show, such as panel positions, live in the same category.
/// </summary>
public sealed class SettingsPage
{
    private const string CategoryPrefix = "PocketCompendium_";

    private readonly MelonPreferences_Category _category;
    private readonly List<SettingRow> _rows = new();

    public SettingsPage(string id, string title)
    {
        Id = id;
        Title = title;
        _category = MelonPreferences.CreateCategory(CategoryPrefix + id, "Pocket Compendium: " + title);
    }

    public string Id { get; }
    public string Title { get; }
    public IReadOnlyList<SettingRow> Rows => _rows;

    /// <summary>Raised after any value on this page changes through its setting.</summary>
    public event Action Changed;

    public void Section(string title) => _rows.Add(new SectionRow(title));

    public void Note(string text) => _rows.Add(new NoteRow(text));

    /// <summary>A button that runs <paramref name="run"/>, such as resetting every panel's position.</summary>
    public void Action(string label, string button, string help, Action run) =>
        _rows.Add(new ActionRow(label, button, help, run));

    /// <param name="initial">The value a player without a saved one starts with, when it differs
    /// from <paramref name="defaultValue"/>, such as a value carried over from an older key.</param>
    public ToggleSetting Toggle(string key, bool defaultValue, string label, string help = null, bool shown = true, bool? initial = null)
    {
        var setting = new ToggleSetting(this, _category.CreateEntry(key, initial ?? defaultValue, label), label, help, defaultValue);
        if (shown) _rows.Add(setting);
        return setting;
    }

    public ChoiceSetting<T> Choice<T>(string key, T defaultValue, string label, string help, params (T Value, string Label)[] options)
        where T : struct, Enum
    {
        var setting = new ChoiceSetting<T>(this, _category.CreateEntry(key, defaultValue.ToString(), label), label, help, options, defaultValue);
        _rows.Add(setting);
        return setting;
    }

    /// <summary>Switches shown side by side as chips. Each saves under its own key.</summary>
    public ChipsSetting Chips(string label, string help, params (string Key, bool Default, string Label, Func<UnityEngine.Color> Dot)[] chips)
    {
        var list = new Chip[chips.Length];
        for (int index = 0; index < chips.Length; index++)
        {
            var chip = chips[index];
            list[index] = new Chip(Toggle(chip.Key, chip.Default, chip.Label, shown: false), chip.Label, chip.Dot);
        }

        var setting = new ChipsSetting(this, label, help, list);
        _rows.Add(setting);
        return setting;
    }

    /// <summary>A range of whole numbers, saved as <paramref name="key"/>From and <paramref name="key"/>To.</summary>
    public RangeSetting Range(string key, int defaultFrom, int defaultTo, int min, int max, string label, string help, Func<bool> enabled)
    {
        var setting = new RangeSetting(this, _category.CreateEntry(key + "From", defaultFrom, label), _category.CreateEntry(key + "To", defaultTo, label),
            label, help, defaultFrom, defaultTo, min, max, enabled);
        _rows.Add(setting);
        return setting;
    }

    /// <summary>A value the window does not show, such as a panel's position.</summary>
    public MelonPreferences_Entry<T> Stored<T>(string key, T defaultValue) =>
        _category.CreateEntry(key, defaultValue, key);

    public void Save() => _category.SaveToFile(false);

    /// <summary>Returns every setting the window shows on this page to its default.</summary>
    public void ResetShown()
    {
        foreach (var row in _rows)
            if (row is Setting setting)
                setting.Reset();
    }

    internal void NotifyChanged()
    {
        Save();
        Changed?.Invoke();
    }
}

public abstract class SettingRow
{
}

public sealed class SectionRow : SettingRow
{
    public SectionRow(string title) => Title = title;

    public string Title { get; }
}

public sealed class NoteRow : SettingRow
{
    public NoteRow(string text) => Text = text;

    public string Text { get; }
}

public sealed class ActionRow : SettingRow
{
    public ActionRow(string label, string button, string help, Action run)
    {
        Label = label;
        Button = button;
        Help = help;
        Run = run;
    }

    public string Label { get; }
    public string Button { get; }
    public string Help { get; }
    public Action Run { get; }
}

public abstract class Setting : SettingRow
{
    protected Setting(SettingsPage page, string label, string help)
    {
        Page = page;
        Label = label;
        Help = help;
    }

    public SettingsPage Page { get; }
    public string Label { get; }
    public string Help { get; }

    public abstract void Reset();
}

public sealed class ToggleSetting : Setting
{
    private readonly MelonPreferences_Entry<bool> _entry;
    private readonly bool _default;

    internal ToggleSetting(SettingsPage page, MelonPreferences_Entry<bool> entry, string label, string help, bool defaultValue)
        : base(page, label, help)
    {
        _entry = entry;
        _default = defaultValue;
    }

    public bool Value
    {
        get => _entry.Value;
        set
        {
            if (_entry.Value == value) return;
            _entry.Value = value;
            Page.NotifyChanged();
        }
    }

    public override void Reset() => Value = _default;
}

/// <summary>
/// A choice among named options, saved by name so a reordered or extended enum keeps a player's
/// choice. An unknown saved name reads as the default.
/// </summary>
public sealed class ChoiceSetting<T> : Setting, IChoiceSetting
    where T : struct, Enum
{
    private readonly MelonPreferences_Entry<string> _entry;
    private readonly (T Value, string Label)[] _options;
    private readonly T _default;

    internal ChoiceSetting(SettingsPage page, MelonPreferences_Entry<string> entry, string label, string help, (T Value, string Label)[] options, T defaultValue)
        : base(page, label, help)
    {
        _entry = entry;
        _options = options;
        _default = defaultValue;
    }

    public T Value
    {
        get => Enum.TryParse(_entry.Value, out T parsed) && Enum.IsDefined(typeof(T), parsed) ? parsed : _default;
        set
        {
            if (EqualityComparer<T>.Default.Equals(Value, value)) return;
            _entry.Value = value.ToString();
            Page.NotifyChanged();
        }
    }

    public int OptionCount => _options.Length;

    public string OptionLabel(int index) => _options[index].Label;

    public int SelectedIndex
    {
        get
        {
            var value = Value;
            for (int index = 0; index < _options.Length; index++)
                if (EqualityComparer<T>.Default.Equals(_options[index].Value, value)) return index;
            return 0;
        }
        set => Value = _options[value].Value;
    }

    public override void Reset() => Value = _default;
}

/// <summary>The part of a choice the settings window needs, independent of its enum.</summary>
public interface IChoiceSetting
{
    string Label { get; }
    string Help { get; }
    int OptionCount { get; }
    string OptionLabel(int index);
    int SelectedIndex { get; set; }
}

/// <summary>One option of a <see cref="ChipsSetting"/>: a switch shown as a chip with a coloured dot.</summary>
public readonly struct Chip
{
    public Chip(ToggleSetting setting, string label, Func<UnityEngine.Color> dot)
    {
        Setting = setting;
        Label = label;
        Dot = dot;
    }

    public ToggleSetting Setting { get; }
    public string Label { get; }

    /// <summary>The dot's colour, read when the window draws, so it can come from the game.</summary>
    public Func<UnityEngine.Color> Dot { get; }
}

/// <summary>Switches shown side by side as chips, such as the tiers a list shows.</summary>
public sealed class ChipsSetting : Setting
{
    internal ChipsSetting(SettingsPage page, string label, string help, Chip[] chips)
        : base(page, label, help) => Chips = chips;

    public IReadOnlyList<Chip> Chips { get; }

    public override void Reset()
    {
        foreach (var chip in Chips) chip.Setting.Reset();
    }
}

/// <summary>A range of whole numbers between two bounds, shown as two steppers.</summary>
public sealed class RangeSetting : Setting
{
    private readonly MelonPreferences_Entry<int> _from;
    private readonly MelonPreferences_Entry<int> _to;
    private readonly int _defaultFrom;
    private readonly int _defaultTo;

    internal RangeSetting(SettingsPage page, MelonPreferences_Entry<int> from, MelonPreferences_Entry<int> to, string label, string help,
        int defaultFrom, int defaultTo, int min, int max, Func<bool> enabled)
        : base(page, label, help)
    {
        _from = from;
        _to = to;
        _defaultFrom = defaultFrom;
        _defaultTo = defaultTo;
        Min = min;
        Max = max;
        Enabled = enabled;
    }

    public int Min { get; }
    public int Max { get; }

    /// <summary>Whether the range applies now. The window dims it otherwise.</summary>
    public Func<bool> Enabled { get; }

    public int From
    {
        get => Math.Clamp(_from.Value, Min, Max);
        set => Set(_from, Math.Clamp(value, Min, To));
    }

    public int To
    {
        get => Math.Clamp(_to.Value, Min, Max);
        set => Set(_to, Math.Clamp(value, From, Max));
    }

    public override void Reset()
    {
        Set(_from, _defaultFrom);
        Set(_to, _defaultTo);
    }

    private void Set(MelonPreferences_Entry<int> entry, int value)
    {
        if (entry.Value == value) return;
        entry.Value = value;
        Page.NotifyChanged();
    }
}
