using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace DataExporter.Tests
{
    /// <summary>
    /// Writing an exporter takes two steps: add the class, then construct it in
    /// DataExporter.RunExport. Copying an existing exporter shows the first step and hides the
    /// second, and an exporter that is never constructed simply produces no JSON, so the build
    /// pipeline loads an empty table instead of failing. This asserts the wiring.
    /// </summary>
    public partial class ExporterRegistrationTests
    {
        [GeneratedRegex(@"\bclass\s+(?<name>\w+Exporter)\b")]
        private static partial Regex ExporterDeclaration();

        [GeneratedRegex(@"\bnew\s+(?<name>\w+Exporter)\s*\(")]
        private static partial Regex ExporterConstruction();

        [GeneratedRegex(@"//[^\n]*|/\*.*?\*/", RegexOptions.Singleline)]
        private static partial Regex Comment();

        /// A commented-out construction still contains the text, so scanning raw source would
        /// accept an exporter that was disabled rather than wired up.
        private static string WithoutComments(string source) => Comment().Replace(source, string.Empty);

        [Fact]
        public void EveryConcreteExporterIsConstructedByDataExporter()
        {
            var repoRoot = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..");
            var exportersDir = Path.Combine(repoRoot, "mods", "DataExporter", "Exporters");
            var host = WithoutComments(File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "DataExporter.cs")));

            var declared = new HashSet<string>();
            foreach (var file in Directory.EnumerateFiles(exportersDir, "*.cs"))
            {
                var source = WithoutComments(File.ReadAllText(file));
                foreach (Match match in ExporterDeclaration().Matches(source))
                {
                    // BaseExporter is the shared abstract parent and is never constructed directly.
                    var name = match.Groups["name"].Value;
                    if (name != "BaseExporter")
                    {
                        declared.Add(name);
                    }
                }
            }

            Assert.NotEmpty(declared);

            var constructed = ExporterConstruction().Matches(host)
                .Select(match => match.Groups["name"].Value)
                .ToHashSet();

            var missing = declared.Except(constructed).OrderBy(name => name).ToList();

            Assert.True(
                missing.Count == 0,
                $"Exporters declared under Exporters/ but never constructed in DataExporter.cs, so they never run: {string.Join(", ", missing)}");
        }
    }
}
