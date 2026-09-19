using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using CombatVerification.Fixtures;

namespace BuildTool.CombatVerification;

/// <summary>Converts the trusted runtime trace into the committed observation contract.</summary>
internal static class ObservationNormalizer
{
    internal static JsonElement Normalize(FixtureDescriptor fixture, JsonElement observation)
    {
        if (!string.Equals(fixture.Tier, "D", StringComparison.Ordinal))
            return observation.Clone();

        var root = RequireObject(JsonNode.Parse(observation.GetRawText()), fixture, "observation");
        var measurements = RequireArray(root["measurements"], fixture, "observation.measurements");
        var foundWindow = false;
        foreach (var node in measurements)
        {
            var measurement = RequireObject(node, fixture, "observation.measurements[]");
            if (!string.Equals(
                    RequireString(measurement["quantity"], fixture, "observation.measurements[].quantity"),
                    "window", StringComparison.Ordinal))
                continue;

            foundWindow = true;
            var samples = RequireArray(
                measurement["samples"], fixture, "observation.measurements[].samples");
            var compact = new JsonArray();
            for (var index = 0; index < samples.Count; index++)
                compact.Add(NormalizeWindow(
                    RequireObject(samples[index], fixture,
                        $"observation.measurements[].samples[{index}]"),
                    fixture,
                    $"observation.measurements[].samples[{index}]"));
            measurement["samples"] = compact;
        }

        if (!foundWindow)
            Fail(fixture, "observation.measurements", "must contain quantity 'window'");

        return JsonSerializer.SerializeToElement(root);
    }

    private static JsonObject NormalizeWindow(
        JsonObject sample, FixtureDescriptor fixture, string path)
    {
        var openedAt = RequireNumber(sample["openedAt"], fixture, path + ".openedAt");
        var closedAt = RequireNumber(sample["closedAt"], fixture, path + ".closedAt");
        var duration = closedAt - openedAt;
        if (!(duration > 0) || !double.IsFinite(duration))
            Fail(fixture, path + ".closedAt", "must be later than openedAt");

        long playerDamage = 0;
        var hits = RequireArray(sample["hits"], fixture, path + ".hits");
        for (var index = 0; index < hits.Count; index++)
        {
            var hit = RequireObject(hits[index], fixture, $"{path}.hits[{index}]");
            playerDamage = checked(playerDamage + RequireLong(
                hit["amount"], fixture, $"{path}.hits[{index}].amount"));
        }

        var companions = new JsonArray();
        var rawCompanions = RequireArray(
            sample["companionDamage"], fixture, path + ".companionDamage");
        for (var index = 0; index < rawCompanions.Count; index++)
        {
            var raw = RequireObject(
                rawCompanions[index], fixture, $"{path}.companionDamage[{index}]");
            companions.Add(new JsonObject
            {
                ["entityId"] = RequireString(
                    raw["entityId"], fixture, $"{path}.companionDamage[{index}].entityId"),
                ["archetype"] = RequireString(
                    raw["archetype"], fixture, $"{path}.companionDamage[{index}].archetype"),
                ["damage"] = RequireLong(
                    raw["damage"], fixture, $"{path}.companionDamage[{index}].damage"),
            });
        }

        var counts = RequireObject(sample["counts"], fixture, path + ".counts");
        var compactCounts = new JsonObject
        {
            ["attempted"] = RequireInteger(counts["attempted"], fixture, path + ".counts.attempted"),
            ["accepted"] = RequireInteger(counts["accepted"], fixture, path + ".counts.accepted"),
            ["completed"] = RequireInteger(counts["completed"], fixture, path + ".counts.completed"),
            ["landed"] = RequireInteger(counts["landed"], fixture, path + ".counts.landed"),
        };

        var resources = NormalizeResources(sample, fixture, path, openedAt);
        var effects = NormalizeEffects(sample, fixture, path, openedAt);
        if (fixture.Coverage.StartsWith("D.class.", StringComparison.Ordinal) && effects.Count == 0)
            Fail(fixture, path + ".observedEffects",
                "must contain an effect from a declared class action");

        var fidelityLimit = sample["fidelityLimit"];
        if (fidelityLimit is not null
            && fidelityLimit.GetValueKind() != JsonValueKind.Null
            && fidelityLimit.GetValueKind() != JsonValueKind.String)
            Fail(fixture, path + ".fidelityLimit", "must be a string or null");

        return new JsonObject
        {
            ["durationSeconds"] = duration,
            ["playerDamage"] = playerDamage,
            ["companionDamage"] = companions,
            ["counts"] = compactCounts,
            ["fidelity"] = RequireString(sample["fidelity"], fixture, path + ".fidelity"),
            ["fidelityLimit"] = fidelityLimit?.DeepClone(),
            ["resourceTransitions"] = resources,
            ["maintainedEffects"] = effects,
        };
    }

    private static JsonArray NormalizeResources(
        JsonObject sample, FixtureDescriptor fixture, string path, double openedAt)
    {
        var raw = RequireArray(
            sample["resourceTransitions"], fixture, path + ".resourceTransitions");
        if (raw.Count == 0)
            Fail(fixture, path + ".resourceTransitions", "must not be empty");

        var result = new JsonArray();
        int? lastMana = null;
        int? lastEnergy = null;
        for (var index = 0; index < raw.Count; index++)
        {
            var transition = RequireObject(
                raw[index], fixture, $"{path}.resourceTransitions[{index}]");
            var at = RequireNumber(
                transition["at"], fixture, $"{path}.resourceTransitions[{index}].at");
            var mana = RequireInteger(
                transition["mana"], fixture, $"{path}.resourceTransitions[{index}].mana");
            var energy = RequireInteger(
                transition["energy"], fixture, $"{path}.resourceTransitions[{index}].energy");
            if (lastMana == mana && lastEnergy == energy) continue;
            result.Add(new JsonObject
            {
                ["atSeconds"] = at - openedAt,
                ["mana"] = mana,
                ["energy"] = energy,
            });
            lastMana = mana;
            lastEnergy = energy;
        }
        return result;
    }

    private static JsonArray NormalizeEffects(
        JsonObject sample, FixtureDescriptor fixture, string path, double openedAt)
    {
        var raw = RequireArray(sample["observedEffects"], fixture, path + ".observedEffects");
        var declared = new HashSet<string>(
            fixture.Execution.Actions?.Select(action => action.Skill)
                ?? Enumerable.Empty<string>(),
            StringComparer.Ordinal);
        var result = new JsonArray();
        for (var index = 0; index < raw.Count; index++)
        {
            var effect = RequireObject(raw[index], fixture, $"{path}.observedEffects[{index}]");
            var name = RequireString(
                effect["name"], fixture, $"{path}.observedEffects[{index}].name");
            if (!declared.Contains(name)) continue;
            var first = RequireNumber(
                effect["firstObservedAt"], fixture,
                $"{path}.observedEffects[{index}].firstObservedAt");
            var last = RequireNumber(
                effect["lastObservedAt"], fixture,
                $"{path}.observedEffects[{index}].lastObservedAt");
            if (last < first)
                Fail(fixture, $"{path}.observedEffects[{index}].lastObservedAt",
                    "must not precede firstObservedAt");
            var skillId = effect["skillId"];
            if (skillId is not null
                && skillId.GetValueKind() != JsonValueKind.Null
                && skillId.GetValueKind() != JsonValueKind.String)
                Fail(fixture, $"{path}.observedEffects[{index}].skillId",
                    "must be a string or null");
            result.Add(new JsonObject
            {
                ["skillId"] = skillId?.DeepClone(),
                ["name"] = name,
                ["firstObservedAtSeconds"] = first - openedAt,
                ["lastObservedAtSeconds"] = last - openedAt,
            });
        }
        return result;
    }

    private static JsonObject RequireObject(
        JsonNode? node, FixtureDescriptor fixture, string path)
    {
        if (node is JsonObject value) return value;
        Fail(fixture, path, "must be an object");
        throw new InvalidOperationException();
    }

    private static JsonArray RequireArray(
        JsonNode? node, FixtureDescriptor fixture, string path)
    {
        if (node is JsonArray value) return value;
        Fail(fixture, path, "must be an array");
        throw new InvalidOperationException();
    }

    private static string RequireString(
        JsonNode? node, FixtureDescriptor fixture, string path)
    {
        if (node is JsonValue value
            && value.TryGetValue<string>(out var text)
            && !string.IsNullOrEmpty(text))
            return text;
        Fail(fixture, path, "must be a non-empty string");
        throw new InvalidOperationException();
    }

    private static double RequireNumber(
        JsonNode? node, FixtureDescriptor fixture, string path)
    {
        if (node is JsonValue value
            && value.TryGetValue<double>(out var number)
            && double.IsFinite(number))
            return number;
        Fail(fixture, path, "must be a finite number");
        throw new InvalidOperationException();
    }

    private static int RequireInteger(
        JsonNode? node, FixtureDescriptor fixture, string path)
    {
        if (node is JsonValue value && value.TryGetValue<int>(out var number) && number >= 0)
            return number;
        Fail(fixture, path, "must be a non-negative integer");
        throw new InvalidOperationException();
    }

    private static long RequireLong(
        JsonNode? node, FixtureDescriptor fixture, string path)
    {
        if (node is JsonValue value && value.TryGetValue<long>(out var number) && number >= 0)
            return number;
        Fail(fixture, path, "must be a non-negative integer");
        throw new InvalidOperationException();
    }

    private static void Fail(FixtureDescriptor fixture, string path, string detail) =>
        throw new InvalidDataException($"{fixture.Name}: {path} {detail}.");
}
