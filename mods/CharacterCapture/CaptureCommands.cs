#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Capture;
using HotRepl.Control;
using HotRepl.Control.Artifacts;
using Il2Cpp;
using Il2CppMirror;
using Newtonsoft.Json;
using UnityEngine.SceneManagement;

namespace CharacterCapture
{
    public sealed class CharacterCaptureCommand : IControlCommandHandler<EmptyArgs, CharacterCaptureResult>
    {
        private readonly string _outputPath;

        public CharacterCaptureCommand(string outputPath)
        {
            _outputPath = outputPath;
        }

        public string Name => "character.capture";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<CharacterCaptureResult>> ExecuteAsync(
            ControlCommandContext<CharacterCaptureResult> context,
            EmptyArgs args,
            CancellationToken cancellationToken)
        {
            var player = Player.localPlayer;
            if (CharacterCaptureCommandCatalog.TryGetUnavailableReason(
                SceneManager.GetActiveScene().name,
                player != null && NetworkClient.localPlayer != null,
                out var unavailable))
            {
                var message = unavailable == "worldUnavailable"
                    ? "The World scene is not loaded."
                    : "The local player is not loaded.";
                return Result(context.PreconditionFailed(unavailable, message));
            }

            try
            {
                cancellationToken.ThrowIfCancellationRequested();
                var snapshot = CharacterStateReader.Read(player);
                var record = CaptureDocumentBuilder.Build(
                    snapshot.BuildData,
                    CharacterStateReader.ReadGameIdentity(),
                    snapshot.Completeness,
                    snapshot.Containers,
                    DateTime.UtcNow);
                if (snapshot.Completeness.Values.All(state => state == "complete"))
                    CaptureBuildAdapter.AdaptComplete(record);
                var json = JsonConvert.SerializeObject(record, Formatting.Indented) + Environment.NewLine;
                Directory.CreateDirectory(Path.GetDirectoryName(_outputPath));
                File.WriteAllText(_outputPath, json);

                var missing = snapshot.Completeness
                    .Where(section => section.Value != "complete")
                    .Select(section => section.Key)
                    .OrderBy(section => section, StringComparer.Ordinal)
                    .ToArray();
                var output = new CharacterCaptureResult
                {
                    Path = Path.GetFullPath(_outputPath),
                    CaptureSchemaVersion = record.CaptureSchemaVersion,
                    Complete = missing.Length == 0,
                    MissingSections = missing,
                };
                var artifact = MakeArtifact(_outputPath);
                return Result(ControlCommandResult.Ok(output, new Dictionary<string, ArtifactRef>
                {
                    ["character.capture"] = artifact,
                }));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception error)
            {
                return Result(context.PreconditionFailed("captureUnavailable", error.Message));
            }
        }

        private static ArtifactRef MakeArtifact(string path)
        {
            var info = new FileInfo(path);
            using var sha = SHA256.Create();
            using var stream = File.OpenRead(path);
            var hash = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
            return new ArtifactRef(
                LogicalName: "character.capture",
                Uri: new Uri(Path.GetFullPath(path)).AbsoluteUri,
                Path: Path.GetFullPath(path),
                ContentType: "application/json",
                ByteSize: info.Length,
                Sha256: hash,
                Finalized: true);
        }

        private static ValueTask<ControlCommandResult<CharacterCaptureResult>> Result(
            ControlCommandResult<CharacterCaptureResult> value) => new(value);
    }

    public sealed class MeterCaptureCommand : IControlCommandHandler<EmptyArgs, MeterCaptureResult>
    {
        public string Name => "combatMeter.capture";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<MeterCaptureResult>> ExecuteAsync(
            ControlCommandContext<MeterCaptureResult> context,
            EmptyArgs args,
            CancellationToken cancellationToken)
        {
            var player = Player.localPlayer;
            if (CharacterCaptureCommandCatalog.TryGetUnavailableReason(
                SceneManager.GetActiveScene().name,
                player != null && NetworkClient.localPlayer != null,
                out var unavailable))
            {
                var message = unavailable == "worldUnavailable"
                    ? "The World scene is not loaded."
                    : "The local player is not loaded.";
                return Result(context.PreconditionFailed(unavailable, message));
            }

            cancellationToken.ThrowIfCancellationRequested();
            var meters = new List<EntityMeterCapture>();
            AddMeter(meters, player, "player");
            AddMeter(meters, player.activePet, "pet");
            AddMeter(meters, player.activeMercenary, "mercenary");
            AddMeter(meters, player.activeMercenary2, "mercenary");
            AddMeter(meters, player.activeMercenary3, "mercenary");
            AddMeter(meters, player.activeMercenary4, "mercenary");

            return Result(ControlCommandResult.Ok(new MeterCaptureResult
            {
                CapturedAtUtc = DateTime.UtcNow.ToString("O"),
                Denominator = "activeSeconds",
                Meters = meters,
            }));
        }

        private static void AddMeter(List<EntityMeterCapture> captures, Entity entity, string kind)
        {
            if (entity == null)
                return;
            var meter = entity.combatMeter
                ?? throw new InvalidOperationException($"{kind} {entity.netId} has no combat meter.");
            captures.Add(new EntityMeterCapture
            {
                EntityId = entity.netId.ToString(),
                Kind = kind,
                DamageTotal = meter.meterDamageDone,
                HealingTotal = meter.meterHealingDone,
                ActiveSeconds = meter.CombatMeterActiveSeconds,
                FirstActionServerTime = meter.meterFirstActionTime > 0 ? meter.meterFirstActionTime : null,
                LastActionServerTime = meter.meterLastActionTime > 0 ? meter.meterLastActionTime : null,
                ElapsedWindowSeconds = null,
                EventCount = null,
            });
        }

        private static ValueTask<ControlCommandResult<MeterCaptureResult>> Result(
            ControlCommandResult<MeterCaptureResult> value) => new(value);
    }
}
