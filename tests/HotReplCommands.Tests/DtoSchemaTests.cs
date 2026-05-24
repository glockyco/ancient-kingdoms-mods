using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
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
            reg.Register(new SyncStub<EmptyArgs, GameQuitResult>("game.quit"));
            return reg;
        }

        // --- tests ---

        [Fact]
        public void AllCommandsDescribed()
            => Assert.Equal(4, BuildRegistry().Describe().Count);

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
