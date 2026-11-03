using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using AncientKingdomsMods.Shared;
using AncientKingdomsMods.Shared.Updates;
using MelonLoader;
using MelonLoader.Utils;

namespace PocketCompendium.Core.Updates;

/// <summary>What the Updates page's status line says.</summary>
internal enum UpdateStatus
{
    /// <summary>"Don't check for updates", or no answer yet: no line.</summary>
    None,
    Checking,
    UpToDate,
    Out,
    Downloaded,
    CheckFailed,
    InstallFailed,
}

/// <summary>Which card the start screen shows.</summary>
internal enum UpdateCard
{
    None,
    Out,
    Downloaded,
    InstallFailed,
    Updated,
}

/// <summary>
/// Pocket Compendium's side of updates: the player's answer, the check, the click on Install and what
/// the start screen and the Updates page show. The updater plugin, when it ran in this start, has
/// already checked and maybe installed, and leaves its report for this service. Results of background
/// work reach the game's thread through <see cref="Update"/>.
/// </summary>
internal sealed class UpdateService
{
    private const string PluginResource = "PocketCompendium.Updater.Plugin";
    private const string CodeResource = "PocketCompendium.Updater.Code";

    private readonly ConcurrentQueue<Action> _results = new();
    private readonly UpdateFiles _files;
    private readonly UpdateSettings _settings;
    private readonly string _publicKey;
    private readonly ModVersion? _ranBefore;
    private UpdateReport _report;
    private ModList _list;
    private bool _busy;

    public UpdateService(string version)
    {
        Current = this;
        Running = ModVersion.Parse(version);
        _files = new UpdateFiles(MelonEnvironment.UserDataDirectory, MelonEnvironment.ModsDirectory, MelonEnvironment.PluginsDirectory);
        _publicKey = ListSignature.EmbeddedKey(typeof(UpdateService).Assembly);
        _settings = UpdateSettings.Load(_files.Settings);
        RemoveOldNotice();

        _ranBefore = _settings.LastVersion;
        if (_ranBefore != null && Running > _ranBefore.Value) Card = UpdateCard.Updated;
        if (_settings.LastVersion != Running)
        {
            _settings.LastVersion = Running;
            Save();
        }
        if (_settings.Answer != null) Begin();
    }

    public static UpdateService Current { get; private set; }

    public ModVersion Running { get; }

    /// <summary>Null until the player answers the first-start question.</summary>
    public UpdateAnswer? Answer => _settings.Answer;

    public UpdateStatus Status { get; private set; }

    /// <summary>The version the status or card is about.</summary>
    public ModVersion? Version { get; private set; }

    public UpdateCard Card { get; private set; }

    /// <summary>Counts changes, so a page can tell that it shows something old.</summary>
    public int Revision { get; private set; }

    /// <summary>Whether a click on Install is running, so the button can't start a second one.</summary>
    public bool Installing => _busy;

    /// <summary>The player's answer from the first-start question or the Updates page.</summary>
    public void Choose(UpdateAnswer answer)
    {
        if (_settings.Answer == answer) return;
        _settings.Answer = answer;
        Save();
        if (Card is UpdateCard.Out) Card = UpdateCard.None;
        Status = UpdateStatus.None;
        Changed();
        Begin();
    }

    public void DismissCard()
    {
        Card = UpdateCard.None;
        Changed();
    }

    /// <summary>What changed, for the card or, with no line limit, the Updates page.</summary>
    public IReadOnlyList<string> Changes(int maxLines)
    {
        var releases = _list?.Find(ModList.PocketCompendiumId)?.Releases;
        if (releases == null) return Array.Empty<string>();
        return Card == UpdateCard.Updated && Status != UpdateStatus.Out && _ranBefore != null
            ? ChangeLines.Between(releases, _ranBefore.Value, Running, maxLines)
            : Version != null ? ChangeLines.Between(releases, Running, Version.Value, maxLines) : Array.Empty<string>();
    }

    /// <summary>The click on Install: download the offered version for the next start.</summary>
    public void Install()
    {
        var offered = _list?.Find(ModList.PocketCompendiumId);
        if (_busy || offered == null || offered.Version <= Running) return;
        _busy = true;
        Changed();
        Run(async () =>
        {
            try
            {
                using var client = new UpdateClient(UpdateSite.Address, _publicKey);
                byte[] file = await client.FetchFileAsync(offered).ConfigureAwait(false);
                Staging.Stage(_files, file, offered.Sha256);
                WriteUpdater();
                Log.Msg($"Downloaded Pocket Compendium {offered.Version}. It loads the next time the game starts.");
                return () => Show(UpdateStatus.Downloaded, offered.Version, UpdateCard.Downloaded);
            }
            catch (UpdateException e)
            {
                // A file that differs from the signed list is never offered as a download.
                Log.Warning("Could not download the new Pocket Compendium: " + e.Message);
                return () => Show(UpdateStatus.CheckFailed, null, UpdateCard.None);
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                Log.Warning("Could not keep the new Pocket Compendium: " + e.Message);
                return () => Show(UpdateStatus.InstallFailed, offered.Version, UpdateCard.InstallFailed);
            }
        }, () => _busy = false);
    }

    /// <summary>Applies results of background work, and the updater's later reports, on the game's thread.</summary>
    public void Update()
    {
        while (_results.TryDequeue(out var apply)) apply();

        // A download that outlasted the wait finishes while the game runs and reports again.
        var report = UpdateHandoff.Read();
        if (report != null && (!ReferenceEquals(report.List, _report?.List) || report.Outcome != _report?.Outcome))
            ApplyReport(report);
    }

    private void Begin()
    {
        if (_settings.Answer is null or UpdateAnswer.Off) return;
        if (_settings.Answer == UpdateAnswer.Install) WriteUpdater();

        // The updater's report carries the list when it checked this start, and a failed check stays
        // failed until the next start. When it only moved a file a click on Install had staged, the
        // list for the status and the card's lines is still to come.
        var report = UpdateHandoff.Read();
        if (report != null) ApplyReport(report);
        if (report != null && (report.List != null || report.Outcome == UpdateOutcome.CheckFailed)) return;

        Status = UpdateStatus.Checking;
        Changed();
        var answer = _settings.Answer.Value;
        Run(async () =>
        {
            try
            {
                using var client = new UpdateClient(UpdateSite.Address, _publicKey);
                var verified = await client.FetchListAsync().ConfigureAwait(false);
                var listed = verified.List.Find(ModList.PocketCompendiumId);
                if (listed == null || listed.Version <= Running)
                    return () => Listed(verified.List, UpdateStatus.UpToDate, null, UpdateCard.None);
                if (answer == UpdateAnswer.Tell)
                    return () => Listed(verified.List, UpdateStatus.Out, listed.Version, UpdateCard.Out);

                // Installing, but the updater didn't run this start: the version loads at the next one.
                byte[] file = await client.FetchFileAsync(listed).ConfigureAwait(false);
                Staging.Stage(_files, file, listed.Sha256);
                Log.Msg($"Downloaded Pocket Compendium {listed.Version}. It loads the next time the game starts.");
                return () => Listed(verified.List, UpdateStatus.Downloaded, listed.Version, UpdateCard.None);
            }
            catch (UpdateException e)
            {
                Log.Msg("Could not check for a new Pocket Compendium: " + e.Message);
                return () => Show(UpdateStatus.CheckFailed, null, UpdateCard.None);
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                Log.Warning("Could not keep the new Pocket Compendium: " + e.Message);
                return () => Show(UpdateStatus.InstallFailed, null, UpdateCard.None);
            }
        }, null);
    }

    private void ApplyReport(UpdateReport report)
    {
        _report = report;
        if (report.List != null)
        {
            try { _list = ModList.Parse(report.List); }
            catch (FormatException) { _list = null; }
        }
        ModVersion? version = ModVersion.TryParse(report.Version, out var parsed) ? parsed : null;
        var listed = _list?.Find(ModList.PocketCompendiumId);
        switch (report.Outcome)
        {
            case UpdateOutcome.UpToDate:
            case UpdateOutcome.Installed:
                Show(UpdateStatus.UpToDate, null, Card == UpdateCard.Updated ? UpdateCard.Updated : UpdateCard.None);
                break;
            case UpdateOutcome.Downloading:
                Show(UpdateStatus.Checking, version, Card);
                break;
            case UpdateOutcome.Downloaded:
                Show(UpdateStatus.Downloaded, version ?? listed?.Version, Card);
                break;
            case UpdateOutcome.CheckFailed:
                Show(UpdateStatus.CheckFailed, null, Card);
                break;
            case UpdateOutcome.InstallFailed:
                Show(UpdateStatus.InstallFailed, version ?? listed?.Version, Card);
                break;
        }
    }

    private void Listed(ModList list, UpdateStatus status, ModVersion? version, UpdateCard card)
    {
        _list = list;
        Show(status, version, Card == UpdateCard.Updated && card == UpdateCard.None ? UpdateCard.Updated : card);
    }

    private void Show(UpdateStatus status, ModVersion? version, UpdateCard card)
    {
        // A result for an answer the player has since changed to "Don't check" stays unseen.
        if (_settings.Answer is null or UpdateAnswer.Off) return;
        Status = status;
        Version = version;
        Card = card;
        Changed();
    }

    private void Changed() => Revision++;

    private void Run(Func<Task<Action>> work, Action always) => _ = RunAsync(work, always);

    private async Task RunAsync(Func<Task<Action>> work, Action always)
    {
        await Task.Yield();
        Action apply;
        try
        {
            apply = await work().ConfigureAwait(false);
        }
        catch (Exception e)
        {
            Log.Warning("The update check failed: " + e.Message);
            apply = CheckFailed;
        }
        if (always != null) _results.Enqueue(always);
        _results.Enqueue(apply);
    }

    private void CheckFailed() => Show(UpdateStatus.CheckFailed, null, UpdateCard.None);

    /// <summary>
    /// Writes the updater plugin when it is missing and the update code when it differs from this
    /// version's. The plugin's file is locked while the game runs it, and it never changes, so an
    /// existing one stays.
    /// </summary>
    private void WriteUpdater()
    {
        try
        {
            if (!File.Exists(_files.Plugin)) UpdateFiles.WriteAtomically(_files.Plugin, Resource(PluginResource));
            byte[] code = Resource(CodeResource);
            if (!File.Exists(_files.UpdateCode) || ListSignature.Sha256(File.ReadAllBytes(_files.UpdateCode)) != ListSignature.Sha256(code))
                UpdateFiles.WriteAtomically(_files.UpdateCode, code);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            Log.Warning("Could not write the updater: " + e.Message);
        }
    }

    private static byte[] Resource(string name)
    {
        using var stream = typeof(UpdateService).Assembly.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException("Pocket Compendium carries no " + name + ".");
        using var memory = new MemoryStream();
        stream.CopyTo(memory);
        return memory.ToArray();
    }

    private void Save()
    {
        try { _settings.Save(_files.Settings); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            Log.Warning("Could not save the update settings: " + e.Message);
        }
    }

    // 1.0.2 and older kept the checksum they had announced in chat in this category. The chat line is gone.
    private static void RemoveOldNotice()
    {
        string file = Path.Combine(MelonEnvironment.UserDataDirectory, "MelonPreferences.cfg");
        try
        {
            if (!File.Exists(file) || !File.ReadAllText(file).Contains("AnnouncedChecksum")) return;
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            return;
        }
        // RemoveCategoryFromFile only reaches files other than the default one, while DeleteEntry edits
        // the default file's document.
        MelonPreferences.CreateCategory("PocketCompendium_Updates", null, is_hidden: true, should_save: false).DeleteEntry("AnnouncedChecksum");
        MelonPreferences.Save();
    }
}
