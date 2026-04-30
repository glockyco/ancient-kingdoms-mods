using System;
using System.Linq;
using BossMod.Audio;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class SoundsTab
{
    private readonly SoundBank _soundBank;
    private readonly SoundPreview _preview;
    private readonly string _soundsFolder;
    private readonly Action _openSoundsFolder;

    public SoundsTab(SoundBank soundBank, SoundPreview preview, string soundsFolder, Action openSoundsFolder)
    {
        _soundBank = soundBank;
        _preview = preview;
        _soundsFolder = soundsFolder;
        _openSoundsFolder = openSoundsFolder;
    }

    public UiRenderResult Render()
    {
        var result = new UiRenderResult();
        ImGui.TextWrapped($"Sounds folder: {_soundsFolder}");
        ImGui.TextDisabled($"User WAV limits: {SoundBank.MaxUserWavBytes / (1024 * 1024)} MiB, {SoundBank.MaxUserWavSeconds:0.#} seconds, PCM16 mono/stereo.");

        if (ImGui.Button("Rescan Sounds Folder")) _soundBank.RescanUserSounds();
        ImGui.SameLine();
        if (ImGui.Button("Open Sounds Folder")) _openSoundsFolder();

        ImGui.Separator();
        ImGui.TextUnformatted("Loaded sounds");
        var entries = _soundBank.Entries
            .OrderBy(entry => entry.IsBuiltIn ? 0 : 1)
            .ThenBy(entry => entry.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        for (int i = 0; i < entries.Count; i++)
        {
            var entry = entries[i];
            ImGui.TextUnformatted(entry.Name);
            ImGui.SameLine(220f);
            ImGui.TextDisabled(entry.IsBuiltIn ? "built-in" : "user");
            ImGui.SameLine(320f);
            if (ImGui.Button($"Preview##sound_preview_{entry.Name}")) _preview.Play(entry.Name);
        }

        ImGui.Separator();
        ImGui.TextUnformatted("Load results");
        if (_soundBank.LoadStatuses.Count == 0)
        {
            ImGui.TextDisabled("No user WAV files scanned.");
        }
        else
        {
            for (int i = 0; i < _soundBank.LoadStatuses.Count; i++)
            {
                var status = _soundBank.LoadStatuses[i];
                ImGui.TextUnformatted(status.Name);
                ImGui.SameLine(220f);
                ImGui.TextDisabled(status.Loaded ? "loaded" : "skipped");
                ImGui.SameLine(320f);
                ImGui.TextWrapped(status.Message);
            }
        }

        return result;
    }
}
