using System;
using System.IO;
using System.Linq;
using HotReplCommands.Dtos;
using HotReplCommands.Isolation;
using HotReplCommands.World;
using Newtonsoft.Json;
using Xunit;

namespace HotReplCommands.Tests;

public sealed class ProceduralCaptureTests
{
    private static ChambersState Ready() => new() {
        Character = "OwnedArt", Ready = true, Alive = true, RunId = 1,
        RunSeed = 42, ChamberIndex = 0, TrialKind = "Battle", SceneHandle = 5, RoomId = 7,
    };

    [Fact]
    public void ReadbackRequiresTheSameLiveReadyOwnedRoom()
    {
        var before = Ready();
        Assert.True(before.SameReadyRoom(Ready()));
        Action<ChambersState>[] invalidations = {
            state => state.Ready = false,
            state => state.Alive = false,
            state => state.RunId++,
            state => state.RunSeed++,
            state => state.ChamberIndex++,
            state => state.TrialKind = "Waves",
            state => state.SceneHandle++,
            state => state.RoomId++,
            state => state.Character = "AnotherOwner",
        };
        foreach (var invalidate in invalidations)
        {
            var after = Ready();
            invalidate(after);
            Assert.False(before.SameReadyRoom(after));
        }
        Assert.False(before.SameReadyRoom(null));
    }

    [Fact]
    public void RefusedRedirectInvalidatesMutationPermissionEvenWhenThePathLooksScratch()
    {
        const string path = "/game/verification-scratch/game.dat";
        ScratchDatabase.ClearConfirmation();
        Assert.Throws<InvalidOperationException>(() => ScratchDatabase.RequireConfirmed(path));
        ScratchDatabase.Confirm(path);
        ScratchDatabase.RequireConfirmed(path);
        Assert.Throws<InvalidOperationException>(() => ScratchDatabase.RequireConfirmed("/other/verification-scratch/game.dat"));
        ScratchDatabase.ClearConfirmation();
        Assert.Throws<InvalidOperationException>(() => ScratchDatabase.RequireConfirmed(path));
        Assert.Throws<InvalidOperationException>(() => ScratchDatabase.Confirm("/game/game.dat"));
    }

    private static ZoneShotFocalPoint Point(string id = "chambers") => new() {
        capture_id = id, zone_id = "chambers_of_chaos", artwork_kind = "shot",
        mode = "procedural_run", chamber_index = 0, room_camera = new float[] { 0, 2 },
        comment = "Entrance-relative live room frame",
    };

    [Fact]
    public void FocalContractRejectsDuplicateIdsAndModeBypasses()
    {
        var focal = new ZoneShotFocalFile { SchemaVersion = 2, FrameScale = 1, Zones = new() { Point() } };
        ZoneShotStore.Validate(focal);
        focal.Zones.Add(Point());
        Assert.Throws<InvalidDataException>(() => ZoneShotStore.Validate(focal));
        focal.Zones.RemoveAt(1);
        focal.Zones[0].mode = "authored_world";
        Assert.Throws<InvalidDataException>(() => ZoneShotStore.Validate(focal));
        focal.Zones[0] = Point();
        focal.Zones[0].zone_id = "forest";
        Assert.Throws<InvalidDataException>(() => ZoneShotStore.Validate(focal));
    }

    [Fact]
    public void ProceduralPositionRejectsMissingAndWorldCoordinates()
    {
        var point = Point();
        point.ValidatePosition();
        point.x = 0;
        Assert.Throws<InvalidDataException>(point.ValidatePosition);
        point.x = null;
        point.room_camera = new[] { float.NaN, 0 };
        Assert.Throws<InvalidDataException>(point.ValidatePosition);
        point.room_camera = new float[] { 0, 2 };
        point.chamber_index = null;
        Assert.Throws<InvalidDataException>(point.ValidatePosition);
    }

    [Fact]
    public void MergedReceiptsRetainEarlierShotsAndUseImmutableDigestImages()
    {
        var directory = Path.Combine(Path.GetTempPath(), "zone-shots-" + Guid.NewGuid().ToString("N"));
        try
        {
            var first = new ZoneShotRecord { capture_id = "chambers", zone_id = "chambers_of_chaos", artwork_kind = "shot" };
            var second = new ZoneShotRecord { capture_id = "layout_2", zone_id = "chambers_of_chaos", artwork_kind = "illustration_2" };
            ZoneShotStore.Merge(directory, new[] { (first, new byte[] { 1, 2, 3 }) });
            ZoneShotStore.Merge(directory, new[] { (second, new byte[] { 4, 5, 6 }) });
            var path = Path.Combine(directory, "manifest.json");
            var merged = JsonConvert.DeserializeObject<ZoneShotManifest>(File.ReadAllText(path))!;
            Assert.Equal(2, merged.schema_version);
            Assert.Equal(new[] { "chambers", "layout_2" }, merged.captures.Select(record => record.capture_id));
            foreach (var record in merged.captures)
            {
                Assert.Contains(record.sha256, record.image);
                Assert.Equal(record.sha256, ZoneShotStore.Digest(File.ReadAllBytes(Path.Combine(directory, record.image))));
            }
            var previous = File.ReadAllText(path);
            var bad = new ZoneShotRecord { capture_id = "other", zone_id = "chambers_of_chaos", artwork_kind = "shot" };
            Assert.Throws<InvalidDataException>(() => ZoneShotStore.Merge(directory, new[] { (bad, new byte[] { 7 }) }));
            Assert.Equal(previous, File.ReadAllText(path));
            Assert.True(File.Exists(Path.Combine(directory, first.image)));
            Assert.Empty(Directory.GetFiles(directory, "*.tmp"));
            ZoneShotStore.Merge(directory, new[] { (first, new byte[] { 9 }) });
            Assert.Equal(2, JsonConvert.DeserializeObject<ZoneShotManifest>(File.ReadAllText(path))!.captures.Count);
        }
        finally { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
    }

    [Fact]
    public void MergeRejectsDuplicateUpdatesAndUnsupportedManifestWithoutReplacingIt()
    {
        var directory = Path.Combine(Path.GetTempPath(), "zone-shots-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var record = new ZoneShotRecord { capture_id = "chambers", zone_id = "chambers_of_chaos", artwork_kind = "shot" };
            Assert.Throws<InvalidDataException>(() => ZoneShotStore.Merge(directory,
                new[] { (record, new byte[] { 1 }), (record, new byte[] { 2 }) }));
            Assert.False(File.Exists(Path.Combine(directory, "manifest.json")));
            const string unsupported = "{\"schema_version\":1,\"captures\":[]}";
            File.WriteAllText(Path.Combine(directory, "manifest.json"), unsupported);
            Assert.Throws<InvalidDataException>(() => ZoneShotStore.Merge(directory, new[] { (record, new byte[] { 1 }) }));
            Assert.Equal(unsupported, File.ReadAllText(Path.Combine(directory, "manifest.json")));
        }
        finally { Directory.Delete(directory, true); }
    }

    [Fact]
    public void MergeUpgradesLegacyWorldAndTempleReceiptsWithoutRecapture()
    {
        var directory = Path.Combine(Path.GetTempPath(), "zone-shots-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var world = new byte[] { 1, 2, 3 };
            var temple = new byte[] { 4, 5, 6 };
            File.WriteAllBytes(Path.Combine(directory, "forest.png"), world);
            File.WriteAllBytes(Path.Combine(directory, "temple_of_valaark.png"), temple);
            File.WriteAllText(Path.Combine(directory, "manifest.json"),
                "[{\"zone_id\":\"forest\",\"x\":12,\"y\":34,\"camera_size\":11.25,\"width\":1920,\"height\":1080,\"captured_at\":\"2026-11-01T00:00:00Z\"}," +
                "{\"zone_id\":\"temple_of_valaark\",\"anchor\":{\"monster\":\"guardian\"},\"offset\":[0,2]}]");
            var added = new ZoneShotRecord { capture_id = "chambers", zone_id = "chambers_of_chaos", artwork_kind = "shot" };
            ZoneShotStore.Merge(directory, new[] { (added, new byte[] { 7 }) });
            var manifest = JsonConvert.DeserializeObject<ZoneShotManifest>(File.ReadAllText(Path.Combine(directory, "manifest.json")))!;
            Assert.Equal(3, manifest.captures.Count);
            var retained = Assert.Single(manifest.captures, record => record.capture_id == "forest");
            Assert.Equal("authored_world", retained.mode);
            Assert.Equal("forest.png", retained.image);
            Assert.Equal(12, retained.x);
            Assert.Equal(34, retained.y);
            Assert.Equal(1920, retained.width);
            Assert.Equal("2026-11-01T00:00:00Z", retained.captured_at);
            Assert.Equal(ZoneShotStore.Digest(world), retained.sha256);
            var anchored = Assert.Single(manifest.captures, record => record.capture_id == "temple_of_valaark");
            Assert.Equal("suppressed_anchor", anchored.mode);
            Assert.Equal("guardian", anchored.anchor["monster"]);
            Assert.Null(anchored.x);
            Assert.Equal(temple, File.ReadAllBytes(Path.Combine(directory, anchored.image)));
            Assert.Equal(world, File.ReadAllBytes(Path.Combine(directory, retained.image)));
        }
        finally { Directory.Delete(directory, true); }
    }
}
