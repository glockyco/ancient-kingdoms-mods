#nullable disable
using System;
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using HotReplCommands.World;
using Il2Cpp;
using MelonLoader;
using UnityEngine;

namespace HotReplCommands.Commands
{
    public sealed class RaiseLevelCommand : IControlCommandHandler<RaiseLevelArgs, ScratchMutationResult>
    {
        public string Name => "character.raiseLevel";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => true;
        public ValueTask<ControlCommandResult<ScratchMutationResult>> ExecuteAsync(
            ControlCommandContext<ScratchMutationResult> context, RaiseLevelArgs args, CancellationToken token)
        {
            try
            {
                var player = ChambersRuntime.RequirePlayer();
                if (MadMageTower.IsInside(player)) throw new InvalidOperationException("Raise level before entering a run.");
                if (args.Level < player.level.current || args.Level > player.level.max)
                    throw new ArgumentException("level must be between the current level and the game's level cap.");
                var before = player.level.current;
                // Source: server-scripts/Experience.cs:current — crossing max experience applies the game's level-up events and attributes.
                while (player.level.current < args.Level)
                {
                    token.ThrowIfCancellationRequested();
                    var previous = player.level.current;
                    player.experience.current = player.experience.max;
                    if (player.level.current <= previous) throw new InvalidOperationException("The game refused level progression.");
                }
                return new(ControlCommandResult.Ok(new ScratchMutationResult {
                    Character = player.nameEntity, Subject = "level", Before = before, After = player.level.current }));
            }
            catch (Exception ex) { return new(context.PreconditionFailed("scratchLevelRefused", ex.Message)); }
        }
    }

    public sealed class GrantItemCommand : IControlCommandHandler<GrantItemArgs, ScratchMutationResult>
    {
        public string Name => "inventory.grant";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => true;
        public ValueTask<ControlCommandResult<ScratchMutationResult>> ExecuteAsync(
            ControlCommandContext<ScratchMutationResult> context, GrantItemArgs args, CancellationToken token)
        {
            try
            {
                var player = ChambersRuntime.RequirePlayer();
                if (string.IsNullOrWhiteSpace(args.ItemName) || args.Amount < 1)
                    throw new ArgumentException("itemName and a positive amount are required.");
                ScriptableItem data = null;
                foreach (var candidate in GameManager.cacheItems.Values)
                    if (candidate.name == args.ItemName)
                    {
                        if (data != null) throw new ArgumentException("itemName is ambiguous.");
                        data = candidate;
                    }
                if (data == null) throw new ArgumentException("No runtime item matches itemName exactly.");
                var item = new Item(data);
                var before = player.inventory.Count(item);
                player.inventory.Add(item, args.Amount, 1);
                var after = player.inventory.Count(item);
                if (after - before != args.Amount) throw new InvalidOperationException($"Inventory refused the grant. Before: {before}, after: {after}.");
                return new(ControlCommandResult.Ok(new ScratchMutationResult {
                    Character = player.nameEntity, Subject = data.name, Before = before, After = after }));
            }
            catch (Exception ex) { return new(context.PreconditionFailed("scratchGrantRefused", ex.Message)); }
        }
    }

    public sealed class ChambersStateCommand : IControlCommandHandler<EmptyArgs, ChambersState>
    {
        public string Name => "chambers.state";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;
        public ValueTask<ControlCommandResult<ChambersState>> ExecuteAsync(
            ControlCommandContext<ChambersState> context, EmptyArgs args, CancellationToken token)
        {
            try { return new(ControlCommandResult.Ok(ChambersRuntime.Read(ChambersRuntime.RequirePlayer()))); }
            catch (Exception ex) { return new(context.PreconditionFailed("scratchStateRefused", ex.Message)); }
        }
    }

    public sealed class ChambersEnterCommand : IControlCommandHandler<EmptyArgs, ChambersActionResult>
    {
        public string Name => "chambers.enter";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;
        public ValueTask<ControlCommandResult<ChambersActionResult>> ExecuteAsync(
            ControlCommandContext<ChambersActionResult> context, EmptyArgs args, CancellationToken token)
            => ChambersJob.Run(context, token, Enter);

        private static IEnumerator Enter(Action<ChambersActionResult> done, CancellationToken token)
        {
            var player = ChambersRuntime.RequirePlayer();
            if (MadMageTower.IsInside(player)) throw new InvalidOperationException("Already inside a run. Leave before beginning another.");
            var before = ChambersRuntime.Read(player);
            var keeper = ChambersRuntime.Keeper();
            var config = MadMageTowerConfig.Load();
            if (config == null || config.seal == null) throw new InvalidOperationException("Chambers seal config is unavailable.");
            var seal = new Item(config.seal);
            var count = player.inventory.Count(seal);
            // Source: server-scripts/MadMageTower.cs:CanTravel,Begin — approach the actual keeper, never a tower destination.
            var position = (Vector2)keeper.transform.position + new Vector2(0, -1);
            if (!MadMageTower.CanTravel(player, keeper.idZone, position)) throw new InvalidOperationException("Keeper placement is not a world destination.");
            player.movement.Reset();
            player.movement.Warp(position);
            player.NetworkidZone = keeper.idZone;
            yield return null;
            token.ThrowIfCancellationRequested();
            // Source: server-scripts/Npc.cs:1750-1762 — the keeper's confirmation invokes this entry command.
            player.CmdEnterMadMageTower(keeper);
            var deadline = Time.realtimeSinceStartup + 40;
            while (Time.realtimeSinceStartup < deadline)
            {
                token.ThrowIfCancellationRequested();
                var after = ChambersRuntime.Read(player);
                if (after.Ready)
                {
                    done(new ChambersActionResult { Before = before, After = after,
                        SealBefore = count, SealAfter = player.inventory.Count(seal) });
                    yield break;
                }
                yield return null;
            }
            throw new InvalidOperationException("Keeper entry did not produce a ready owned room. Check level, seal, combat and party. No tower warp was attempted.");
        }
    }

    public sealed class ChambersNavigateCommand : IControlCommandHandler<ChambersNavigateArgs, ChambersActionResult>
    {
        public string Name => "chambers.navigate";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;
        public ValueTask<ControlCommandResult<ChambersActionResult>> ExecuteAsync(
            ControlCommandContext<ChambersActionResult> context, ChambersNavigateArgs args, CancellationToken token)
            => ChambersJob.Run(context, token, (done, ct) => Navigate(args, done, ct));

        private static IEnumerator Navigate(ChambersNavigateArgs args, Action<ChambersActionResult> done, CancellationToken token)
        {
            var player = ChambersRuntime.RequirePlayer();
            var before = ChambersRuntime.Read(player);
            var room = ChambersRuntime.ReadyRoom(player);
            if (args.Action == "leave")
            {
                // Source: server-scripts/MadMageTower.cs:Finish — the game's exit restores its remembered entrance and releases the run.
                MadMageTower.Finish(player, true);
            }
            else
            {
                if (args.ObjectIndex < 0 || args.ObjectIndex > 5) throw new ArgumentException("objectIndex must be 0 to 5.");
                // Source: server-scripts/MadMageTower.cs:Interact — portal, clue and rune positions come from the owned live room.
                Vector2 position;
                if (args.ObjectIndex == 0) position = room.Exit;
                else if (args.ObjectIndex == 1 && before.TrialKind == "Riddle") position = room.Nodes[0];
                else if (args.ObjectIndex == 1 && before.TrialKind == "Runes") position = room.Entrance;
                else if (args.ObjectIndex >= 2 && (before.TrialKind == "Runes" || before.TrialKind == "Manuscript")) position = room.Nodes[args.ObjectIndex - 2];
                else throw new ArgumentException("This object does not exist in the current trial.");
                if (args.Action != "approach" && args.Action != "interact" && args.Action != "answer")
                    throw new ArgumentException("action must be approach, interact, answer or leave.");
                if (args.Action == "answer" && (before.TrialKind != "Riddle" || args.Choice < 0 || args.Choice > 3))
                    throw new ArgumentException("answer requires a Riddle trial and choice 0 to 3.");
                player.movement.Reset();
                player.movement.Warp(position);
                if (args.Action == "interact") player.CmdMadMageTowerInteract(before.RunId, before.ChamberIndex, args.ObjectIndex);
                if (args.Action == "answer") player.CmdMadMageTowerAnswer(before.RunId, before.ChamberIndex, args.Choice);
            }
            yield return null;
            var until = Time.realtimeSinceStartup + 35;
            while (MadMageTowerClient.IsTransitioning && Time.realtimeSinceStartup < until)
            {
                token.ThrowIfCancellationRequested();
                yield return null;
            }
            token.ThrowIfCancellationRequested();
            done(new ChambersActionResult { Before = before, After = ChambersRuntime.Read(player) });
        }
    }

    internal static class ChambersJob
    {
        public static ValueTask<ControlCommandResult<ChambersActionResult>> Run(
            ControlCommandContext<ChambersActionResult> context, CancellationToken token,
            Func<Action<ChambersActionResult>, CancellationToken, IEnumerator> action)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<ChambersActionResult>>(TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(Guard(context, token, action, completion));
            return new(completion.Task);
        }
        private static IEnumerator Guard(ControlCommandContext<ChambersActionResult> context, CancellationToken token,
            Func<Action<ChambersActionResult>, CancellationToken, IEnumerator> action,
            TaskCompletionSource<ControlCommandResult<ChambersActionResult>> completion)
        {
            using var core = action(result => completion.TrySetResult(ControlCommandResult.Ok(result)), token) as IDisposable;
            var iterator = (IEnumerator)core;
            while (true)
            {
                object current;
                try { token.ThrowIfCancellationRequested(); if (!iterator.MoveNext()) yield break; current = iterator.Current; }
                catch (Exception ex) { completion.TrySetResult(context.PreconditionFailed("scratchChambersRefused", ex.Message)); yield break; }
                yield return current;
            }
        }
    }
}
