using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace HotReplCommands.Tests
{
    public class DtoSchemaTests
    {
        // --- stubs ---

        private sealed class SyncStub<TArgs, TOut> : IControlCommandHandler<TArgs, TOut>
        {
            public SyncStub(string name) { Name = name; }
            public string Name { get; }
            public int Version => 1;
            public ControlCommandKind Kind => ControlCommandKind.Sync;
            public bool MutatesState => false;
            public ValueTask<ControlCommandResult<TOut>> ExecuteAsync(
                ControlCommandContext<TOut> ctx, TArgs args, CancellationToken ct)
                => throw new System.NotImplementedException();
        }

        private sealed class JobStub<TArgs, TOut> : IControlCommandHandler<TArgs, TOut>
        {
            public JobStub(string name) { Name = name; }
            public string Name { get; }
            public int Version => 1;
            public ControlCommandKind Kind => ControlCommandKind.Job;
            public bool MutatesState => true;
            public ValueTask<ControlCommandResult<TOut>> ExecuteAsync(
                ControlCommandContext<TOut> ctx, TArgs args, CancellationToken ct)
                => throw new System.NotImplementedException();
        }

        private static GlobalControlCommandRegistry BuildRegistry()
        {
            var reg = new GlobalControlCommandRegistry();
            reg.Register(new SyncStub<EmptyArgs, PreflightResult>("compendium.preflight"));
            reg.Register(new SyncStub<EmptyArgs, WorldSummaryResult>("world.summary"));
            reg.Register(new JobStub<CompendiumExportArgs, CompendiumExportResult>("compendium.export"));
            reg.Register(new JobStub<WorldEnterArgs, WorldEnterResult>("world.enter"));
            reg.Register(new SyncStub<EmptyArgs, GameQuitResult>("game.quit"));
            reg.Register(new JobStub<ZoneShotsArgs, ZoneShotsResult>("capture.zoneShots"));
            reg.Register(new JobStub<CreateCharacterArgs, CreateCharacterResult>("character.create"));
            return reg;
        }

        // --- tests ---

        [Fact]
        public void AllCommandsDescribed()
            => Assert.Equal(7, BuildRegistry().Describe().Count);

        [Fact]
        public void CreateCharacterArgs_RemovesNoCharacterUnlessNamed()
        {
            // Name, class and race describe the character. The replacement is optional so that a
            // plain creation can never delete an existing character.
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "character.create");
            var required = descriptor.ArgsSchema["required"]?.Values<string>().OrderBy(n => n).ToArray();
            Assert.Equal(new[] { "characterName", "class", "race" }, required);
        }

        [Fact]
        public void WorldEnterArgs_CharacterIsOptional()
        {
            // A caller sending an empty object must keep working, so the character
            // must not be required.
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "world.enter");
            var props = descriptor.ArgsSchema["properties"] as JObject;
            Assert.NotNull(props);
            Assert.True(props!.ContainsKey("character"),
                "Expected lower-camel 'character' property in schema");
            var required = descriptor.ArgsSchema["required"]?.Values<string>().ToList();
            Assert.True(required is null || !required.Contains("character"),
                "'character' must be optional");
        }

        [Fact]
        public void WorldEnterResult_ReportsCharacter()
        {
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "world.enter");
            var props = descriptor.ResultSchema["properties"] as JObject;
            Assert.NotNull(props);
            Assert.True(props!.ContainsKey("character"),
                "Expected 'character' in the world.enter result schema");
        }

        [Fact]
        public void CompendiumExportArgs_ScreenshotsIsRequired()
        {
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "compendium.export");
            var required = descriptor.ArgsSchema["required"]?.Values<string>().ToList();
            Assert.NotNull(required);
            Assert.Contains("screenshots", required);
        }

        [Fact]
        public void CompendiumExportArgs_ScreenshotsIsLowerCamel()
        {
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "compendium.export");
            var props = descriptor.ArgsSchema["properties"] as JObject;
            Assert.NotNull(props);
            Assert.True(props!.ContainsKey("screenshots"),
                "Expected lower-camel 'screenshots' property in schema");
        }

        [Fact]
        public void ZoneShotsArgs_UsesLowerCamelPropertiesAndKeepsCreaturesByDefault()
        {
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "capture.zoneShots");
            var props = descriptor.ArgsSchema["properties"] as JObject;
            Assert.NotNull(props);
            Assert.Equal(
                new[] { "focalPointsPath", "frameScale", "includeCreatures", "zoneIds" },
                props!.Properties().Select(p => p.Name).OrderBy(n => n).ToArray());
            Assert.True(new ZoneShotsArgs().IncludeCreatures);
            Assert.Null(new ZoneShotsArgs().ZoneIds);
            Assert.Null(new ZoneShotsArgs().FrameScale);
        }

        [Fact]
        public void ZoneShotFocalFile_RoundTripsOptionalPerZoneScale()
        {
            const string json = "{\"frame_scale\":2,\"zones\":[" +
                "{\"zone_id\":\"overworld\",\"x\":1,\"y\":2,\"comment\":\"Default frame\"}," +
                "{\"zone_id\":\"dungeon\",\"x\":3,\"y\":4,\"comment\":\"Dungeon frame\",\"frame_scale\":1.5}]}";
            var focal = JsonConvert.DeserializeObject<ZoneShotFocalFile>(json);
            Assert.NotNull(focal);
            Assert.Equal(2d, focal!.FrameScale);
            Assert.Null(focal.Zones[0].FrameScale);
            Assert.Equal(1.5d, focal.Zones[1].FrameScale);

            var serialized = JObject.Parse(JsonConvert.SerializeObject(focal));
            Assert.Equal(2d, serialized["frame_scale"]!.Value<double>());
            Assert.Null(serialized["zones"]![0]!["frame_scale"]);
            Assert.Equal(1.5d, serialized["zones"]![1]!["frame_scale"]!.Value<double>());
            Assert.Null(serialized["zones"]![1]!["FrameScale"]);
            var restored = serialized.ToObject<ZoneShotFocalFile>();
            Assert.Null(restored!.Zones[0].FrameScale);
            Assert.Equal(1.5d, restored.Zones[1].FrameScale);
        }

        [Fact]
        public void ZoneShotAnchor_RoundTripsWithoutAbsoluteCoordinates()
        {
            var point = JsonConvert.DeserializeObject<ZoneShotFocalPoint>(
                "{\"zone_id\":\"temple_of_valaark\",\"anchor\":{\"monster\":\"guardian\"},\"offset\":[0,2]}")!;
            point.ValidatePosition();
            var record = new ZoneShotRecord { zone_id = point.zone_id, anchor = point.anchor, offset = point.offset };
            var json = JObject.Parse(JsonConvert.SerializeObject(record));
            Assert.Null(json["x"]);
            Assert.Null(json["y"]);
            Assert.Equal("guardian", json["anchor"]!["monster"]!.Value<string>());
            Assert.Equal(2f, json["offset"]![1]!.Value<float>());
        }

        [Theory]
        [InlineData("{\"zone_id\":\"temple_of_valaark\",\"anchor\":{\"monster\":\"guardian\"}}")]
        [InlineData("{\"zone_id\":\"temple_of_valaark\",\"anchor\":{\"monster\":\"guardian\"},\"offset\":[0,2]}")]
        [InlineData("{\"zone_id\":\"forest\",\"x\":1,\"y\":2}")]
        public void ZoneShotPosition_AcceptsOneConvention(string json)
            => JsonConvert.DeserializeObject<ZoneShotFocalPoint>(json)!.ValidatePosition();

        [Theory]
        [InlineData("{\"zone_id\":\"temple_of_valaark\",\"x\":0,\"anchor\":{\"monster\":\"guardian\"}}")]
        [InlineData("{\"zone_id\":\"temple_of_valaark\",\"y\":0,\"anchor\":{\"monster\":\"guardian\"}}")]
        [InlineData("{\"zone_id\":\"temple_of_valaark\"}")]
        [InlineData("{\"zone_id\":\"temple_of_valaark\",\"anchor\":{\"npc\":\"guardian\"}}")]
        [InlineData("{\"zone_id\":\"temple_of_valaark\",\"anchor\":{\"monster\":\"guardian\"},\"offset\":[0]}")]
        [InlineData("{\"zone_id\":\"forest\",\"x\":1,\"y\":2,\"anchor\":{\"monster\":\"guardian\"}}")]
        [InlineData("{\"zone_id\":\"forest\",\"x\":1,\"y\":2,\"offset\":[0,0]}")]
        [InlineData("{\"zone_id\":\"old_valorath\",\"anchor\":{\"monster\":\"guardian\"}}")]
        public void ZoneShotPosition_RejectsForbiddenConventions(string json)
            => Assert.Throws<System.IO.InvalidDataException>(
                () => JsonConvert.DeserializeObject<ZoneShotFocalPoint>(json)!.ValidatePosition());

        [Theory]
        [InlineData("x")]
        [InlineData("y")]
        [InlineData("anchor")]
        [InlineData("offset")]
        public void ZoneShotPosition_RejectsExplicitNull(string key)
            => Assert.Throws<JsonSerializationException>(() => JsonConvert.DeserializeObject<ZoneShotFocalPoint>(
                "{\"zone_id\":\"temple_of_valaark\",\"" + key + "\":null}"));

        [Fact]
        public void PreflightResult_ReadyIsRequired()
        {
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "compendium.preflight");
            var required = descriptor.ResultSchema["required"]?.Values<string>().ToList();
            Assert.NotNull(required);
            Assert.Contains("ready", required);
        }

        [Fact]
        public void GameQuitResult_QuittingIsRequired()
        {
            var descriptor = BuildRegistry().Describe()
                .Single(d => d.Name == "game.quit");
            var required = descriptor.ResultSchema["required"]?.Values<string>().ToList();
            Assert.NotNull(required);
            Assert.Contains("quitting", required);
        }
    }
}
