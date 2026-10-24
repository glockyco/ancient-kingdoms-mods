using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests;

public class ExportJsonTests
{
    private class BaseRow
    {
        public string id { get; set; }
        public string zone_id { get; set; }
    }

    private sealed class DerivedRow : BaseRow
    {
        public int level { get; set; }
        public string name { get; set; }
    }

    [Fact]
    public void PropertiesFollowDeclarationOrderWithBaseClassFirst()
    {
        // Touch the members out of order first: the reflection cache this fills is what made the order vary.
        _ = typeof(DerivedRow).GetProperty(nameof(DerivedRow.name));
        _ = typeof(BaseRow).GetProperty(nameof(BaseRow.zone_id));

        var json = ExportJson.Serialize(new DerivedRow { id = "a", zone_id = "z", level = 3, name = "n" });

        Assert.Equal(new[] { "id", "zone_id", "level", "name" },
            JObject.Parse(json).Properties().Select(property => property.Name));
    }

    [Fact]
    public void RowsSortOrdinallyAndRejectDuplicateKeys()
    {
        var rows = new List<BaseRow> { new() { id = "b" }, new() { id = "B" }, new() { id = "a" } };

        Assert.Equal(new[] { "B", "a", "b" }, ExportJson.SortedRows(rows, row => row.id, "rows").Select(row => row.id));

        rows.Add(new BaseRow { id = "a" });
        var error = Assert.Throws<InvalidOperationException>(() => ExportJson.SortedRows(rows, row => row.id, "rows"));
        Assert.Contains("'a'", error.Message);
    }
}
