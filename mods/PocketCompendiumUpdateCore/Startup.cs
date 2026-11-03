using System;
using System.Threading.Tasks;
using AncientKingdomsMods.Shared;
using AncientKingdomsMods.Shared.Updates;
using MelonLoader;
using MelonLoader.Utils;

namespace PocketCompendium.UpdateCore;

/// <summary>
/// The update code the Pocket Compendium Updater plugin loads. <see cref="Start"/> runs as plugins
/// initialize and, with "Install updates for me", starts the download. <see cref="BeforeMods"/> runs just
/// before MelonLoader loads mods, waits for it, and moves a verified new version into place, so the game
/// loads it in this start. MelonLoader loads no mod until this returns, so the wait holds the start.
/// </summary>
public static class Startup
{
    private static readonly TimeSpan MaxWait = TimeSpan.FromSeconds(10);

    private static MelonLogger.Instance _log;
    private static UpdateFiles _files;
    private static Task _download;
    private static VerifiedList _list;

    public static void Start()
    {
        _log = new MelonLogger.Instance("Pocket Compendium Updater");
        _files = new UpdateFiles(MelonEnvironment.UserDataDirectory, MelonEnvironment.ModsDirectory, MelonEnvironment.PluginsDirectory);
        // A player who deleted Pocket Compendium and left this plugin wants nothing checked or installed.
        if (!System.IO.File.Exists(_files.Installed)) return;
        if (UpdateSettings.Load(_files.Settings).Answer == UpdateAnswer.Install)
            _download = Task.Run(Download);
    }

    public static void BeforeMods()
    {
        if (_download != null && !_download.Wait(MaxWait))
        {
            _log.Msg($"The download is still running after {MaxWait.TotalSeconds:0} seconds. It finishes while the game runs and loads at the next start.");
            UpdateHandoff.Publish(UpdateOutcome.Downloading, _list, _list?.List.Find(ModList.PocketCompendiumId)?.Version.ToString());
            _download.ContinueWith(_ =>
            {
                if (Staging.HasStaged(_files))
                    UpdateHandoff.Publish(UpdateOutcome.Downloaded, _list, _list?.List.Find(ModList.PocketCompendiumId)?.Version.ToString());
            }, TaskScheduler.Default);
            return;
        }

        // A file staged by this start's download, an earlier slow one, or a click on Install.
        try
        {
            var moved = Staging.Apply(_files, VersionOf);
            if (moved == null) return;
            _log.Msg($"Installed Pocket Compendium {moved.Value.To} in place of {moved.Value.From}.");
            UpdateHandoff.Publish(UpdateOutcome.Installed, _list, moved.Value.To.ToString());
        }
        catch (UpdateException e)
        {
            _log.Warning("Could not install the new Pocket Compendium: " + e.Message);
            UpdateHandoff.Publish(UpdateOutcome.InstallFailed, _list, _list?.List.Find(ModList.PocketCompendiumId)?.Version.ToString(), e.Message);
        }
    }

    private static async Task Download()
    {
        try
        {
            using var client = new UpdateClient(UpdateSite.Address, ListSignature.EmbeddedKey(typeof(Startup).Assembly));
            _list = await client.FetchListAsync().ConfigureAwait(false);
            var listed = _list.List.Find(ModList.PocketCompendiumId);
            var installed = VersionOf(_files.Installed);
            if (listed == null || installed == null || listed.Version <= installed.Value)
            {
                UpdateHandoff.Publish(UpdateOutcome.UpToDate, _list);
                return;
            }

            byte[] file = await client.FetchFileAsync(listed).ConfigureAwait(false);
            Staging.Stage(_files, file, listed.Sha256);
            _log.Msg($"Downloaded Pocket Compendium {listed.Version}.");
        }
        catch (UpdateException e)
        {
            _log.Warning("Could not update Pocket Compendium: " + e.Message);
            UpdateHandoff.Publish(UpdateOutcome.CheckFailed, _list, reason: e.Message);
        }
        catch (Exception e) when (e is System.IO.IOException or UnauthorizedAccessException)
        {
            _log.Warning("Could not keep the new Pocket Compendium: " + e.Message);
            UpdateHandoff.Publish(UpdateOutcome.InstallFailed, _list, reason: e.Message);
        }
    }

    private static ModVersion? VersionOf(string path) =>
        System.IO.File.Exists(path) && ModVersion.TryParse(MelonInfoReader.Version(path), out var version) ? version : null;
}
