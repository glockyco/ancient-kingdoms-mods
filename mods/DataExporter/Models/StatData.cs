#nullable disable

using System.Collections.Generic;
using Newtonsoft.Json;

namespace DataExporter.Models;

public sealed class StatFieldData
{
    public string source { get; }
    public string field { get; }
    public string modifier { get; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string curve { get; }

    public StatFieldData(string source, string field, string modifier, string curve = null)
    {
        this.source = source;
        this.field = field;
        this.modifier = modifier;
        this.curve = curve;
    }
}

public sealed class StatPerPointData
{
    public string stat_id { get; }
    public double amount { get; }

    public StatPerPointData(string stat_id, double amount)
    {
        this.stat_id = stat_id;
        this.amount = amount;
    }
}

public sealed class NonStatFieldData
{
    public string source { get; }
    public string field { get; }
    public string reason { get; }

    public NonStatFieldData(string source, string field, string reason)
    {
        this.source = source;
        this.field = field;
        this.reason = reason;
    }
}

public sealed class StatData
{
    public string id { get; init; }
    public string name { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string name_key { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string item_name { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string item_label { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string weapon_item_name { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string override_reason { get; init; }
    public string format { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public double? min_value { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public double? max_value { get; init; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string pool_id { get; init; }
    public IReadOnlyList<StatPerPointData> per_point_of { get; init; }
    public IReadOnlyList<StatFieldData> fields { get; init; }
}

public sealed class StatVocabularyData
{
    public IReadOnlyList<StatData> stats { get; }
    public IReadOnlyList<NonStatFieldData> non_stat_fields { get; }

    public StatVocabularyData(IReadOnlyList<StatData> stats, IReadOnlyList<NonStatFieldData> non_stat_fields)
    {
        this.stats = stats;
        this.non_stat_fields = non_stat_fields;
    }
}
