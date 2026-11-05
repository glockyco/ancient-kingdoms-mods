using System;
using System.Threading.Tasks;
using AncientKingdomsMods.Shared;
using AncientKingdomsMods.Shared.Updates;
using MelonLoader;
using MelonLoader.Utils;

namespace PocketCompendium.UpdateCore;

/// <summary>
/// The update code the Pocket Compendium Updater plugin loads. <see cref="Start"/> runs as plugins
/// initialize: it settles the Mods folder, which installs a download an earlier start left, and with
/// "Install updates for me" starts the check. <see cref="BeforeMods"/> runs just before MelonLoader
/// loads mods, waits for the check and settles again, so the game loads a new version in this start.
/// MelonLoader loads no mod until it returns, so the wait holds the start.
/// </summary>
public static class Startup
{
    private static readonly TimeSpan MaxWait = TimeSpan.FromSeconds(10);

    private static MelonLogger.Instance _log;
    private static UpdateFiles _files;
    private static Task<Checked> _check;
    private static bool _updated;
    private static string _failure;

    public static void Start()
    {
        _log = new MelonLogger.Instance("Pocket Compendium Updater");
        _files = new UpdateFiles(MelonEnvironment.UserDataDirectory, MelonEnvironment.ModsDirectory, MelonEnvironment.PluginsDirectory);
        Settle();
        // A player who deleted Pocket Compendium and left this plugin wants nothing checked or installed.
        if (_failure == null && _files.Copies().Count > 0 && UpdateSettings.Load(_files.Settings).Answer == UpdateAnswer.Install)
            _check = Task.Run(Check);
    }

    public static void BeforeMods()
    {
        if (_files == null) return;
        if (_check != null && !Finished(_check))
        {
            _log.Msg($"The download is still running after {MaxWait.TotalSeconds:0} seconds. It finishes while the game runs and installs at the next start.");
            UpdateHandoff.Publish(UpdateOutcome.Downloading);
            _check.ContinueWith(task => Publish(task.Result, late: true), TaskScheduler.Default);
            return;
        }

        if (_failure == null) Settle();
        Publish(_check?.Result, late: false);
    }

    // The report always goes out, so Pocket Compendium can tell that the updater ran in this start.
    private static void Publish(Checked check, bool late)
    {
        var list = check?.List;
        if (_failure != null)
            UpdateHandoff.Publish(UpdateOutcome.InstallFailed, list, check?.Version, _failure);
        else if (late && check?.Outcome == UpdateOutcome.Downloaded)
            UpdateHandoff.Publish(UpdateOutcome.Downloaded, list, check.Version);
        else if (_updated)
            UpdateHandoff.Publish(UpdateOutcome.Installed, list, Installed()?.ToString());
        else if (check != null && check.Outcome != UpdateOutcome.Downloaded)
            UpdateHandoff.Publish(check.Outcome, list, check.Version, check.Reason);
        else
            UpdateHandoff.Publish(UpdateOutcome.UpToDate, list);
    }

    private static void Settle()
    {
        try
        {
            var settled = Staging.Settle(_files, VersionOf);
            if (settled.Discarded != null) _log.Warning("Threw away the waiting download: " + settled.Discarded + ".");
            if (settled.Updated)
            {
                _updated = true;
                string from = settled.Replaced?.ToString() ?? "a copy without a readable version";
                _log.Msg($"Installed Pocket Compendium {settled.Installed} in place of {from}.");
            }
            foreach (var removed in settled.Removed)
                _log.Msg($"Removed the extra copy {removed} from the Mods folder.");
            foreach (var leftover in settled.Leftovers)
                _log.Warning($"Could not remove the extra copy {leftover} from the Mods folder.");
        }
        catch (UpdateException e)
        {
            _failure = e.Message;
            _log.Warning("Could not install the new Pocket Compendium: " + e.Message);
        }
    }

    // A check that throws counts as finished, and its result says why.
    private static bool Finished(Task<Checked> check)
    {
        try { return check.Wait(MaxWait); }
        catch (AggregateException) { return true; }
    }

    // Never throws: every failure becomes the outcome the report carries.
    private static async Task<Checked> Check()
    {
        VerifiedList list = null;
        ListedMod listed = null;
        try
        {
            using var client = new UpdateClient(UpdateSite.Address, ListSignature.EmbeddedKey(typeof(Startup).Assembly));
            list = await client.FetchListAsync().ConfigureAwait(false);
            listed = list.List.Find(ModList.PocketCompendiumId);
            var installed = Installed();
            // A copy without a readable version is broken, and the listed version replaces it.
            if (listed == null || installed != null && listed.Version <= installed.Value)
                return new Checked(UpdateOutcome.UpToDate, list);

            byte[] file = await client.FetchFileAsync(listed).ConfigureAwait(false);
            Staging.Stage(_files, file, listed.Sha256);
            _log.Msg($"Downloaded Pocket Compendium {listed.Version}.");
            return new Checked(UpdateOutcome.Downloaded, list, listed.Version.ToString());
        }
        catch (UpdateException e)
        {
            _log.Warning("Could not update Pocket Compendium: " + e.Message);
            return new Checked(UpdateOutcome.CheckFailed, list, reason: e.Message);
        }
        catch (Exception e) when (e is System.IO.IOException or UnauthorizedAccessException)
        {
            _log.Warning("Could not keep the new Pocket Compendium: " + e.Message);
            return new Checked(UpdateOutcome.InstallFailed, list, listed?.Version.ToString(), e.Message);
        }
        catch (Exception e)
        {
            _log.Warning("The update check failed: " + e.Message);
            return new Checked(UpdateOutcome.CheckFailed, list, reason: e.Message);
        }
    }

    private static ModVersion? Installed() => VersionOf(_files.Installed);

    private static ModVersion? VersionOf(string path) =>
        System.IO.File.Exists(path) && ModVersion.TryParse(MelonInfoReader.TryVersion(path), out var version) ? version : null;

    private sealed class Checked
    {
        public Checked(UpdateOutcome outcome, VerifiedList list, string version = null, string reason = null)
        {
            Outcome = outcome;
            List = list;
            Version = version;
            Reason = reason;
        }

        public UpdateOutcome Outcome { get; }
        public VerifiedList List { get; }
        public string Version { get; }
        public string Reason { get; }
    }
}
