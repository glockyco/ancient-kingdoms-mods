<script lang="ts">
  import type { ProviderView, RequirementRoot } from "$lib/acquisition/types";
  import MapLink from "../MapLink.svelte";
  import Requirements from "./Requirements.svelte";
  import ScrollRegion from "./ScrollRegion.svelte";
  import { providerHref, distinctSubzoneName } from "./display";
  let {
    providers,
    names = {},
    subjectName,
    sharedRequirements = [],
    parentScroll = false,
  }: {
    providers: readonly ProviderView[];
    names?: Readonly<Record<string, string>>;
    subjectName?: string;
    sharedRequirements?: readonly RequirementRoot[];
    parentScroll?: boolean;
  } = $props();
  const mapTypes = {
    monster_spawns: "monster",
    npcs: "npc",
    altars: "altar",
    resource_spawns: "gathering_resource",
    chests: "chest",
    crafting_stations: "crafting_station",
    alchemy_tables: "alchemy_table",
    scribing_tables: "scribing_table",
    treasure_locations: "treasure",
  } as const;
  const groups = $derived.by(() => {
    const grouped = Map.groupBy(providers, (provider) =>
      JSON.stringify([
        provider.ref.kind,
        provider.location ? null : provider.ref.id,
        provider.name,
        provider.location?.zoneId,
        provider.location?.subZoneId,
        provider.location?.geometryVisibility,
        provider.location?.approximate,
        provider.requirements.filter(
          (root) => !sharedRequirements.includes(root),
        ),
      ]),
    );
    return [...grouped.values()].map((group) => ({
      providers: group,
      requirements: group[0].requirements.filter(
        (root) => !sharedRequirements.includes(root),
      ),
    }));
  });
</script>

{#snippet providerLabel(provider: ProviderView)}
  {@const label = provider.ref.kind === "chests" ? "Chest" : provider.name}
  {@const zoneName =
    names[`zones:${provider.location?.zoneId}`] ??
    names[provider.location?.zoneId ?? ""]}
  {@const subZoneName = distinctSubzoneName(
    zoneName,
    names[`zone_triggers:${provider.location?.subZoneId}`],
  )}
  {#if label !== subjectName}
    {#if providerHref(provider.ref)}<a
        class="text-blue-600 hover:underline dark:text-blue-400"
        href={providerHref(provider.ref)}>{label}</a
      >{:else}<span>{label}</span>{/if}
  {/if}
  {#if provider.location?.zoneId}<a
      class="text-sm text-blue-600 hover:underline dark:text-blue-400"
      href="/zones/{provider.location.zoneId}">{zoneName}</a
    >{/if}
  {#if subZoneName}
    <span class="text-sm text-muted-foreground">
      ({subZoneName})
    </span>
  {/if}
  {#if provider.location?.approximate}<span
      class="text-sm text-muted-foreground">near the parent spawn area</span
    >{/if}
  {#if provider.location?.geometryVisibility === "suppressed"}<span
      class="text-sm text-muted-foreground">location not published</span
    >{/if}
{/snippet}

{#snippet mapLink(provider: ProviderView)}
  {#if provider.location?.geometryVisibility === "visible" && provider.ref.kind in mapTypes}
    <MapLink
      entityId={provider.ref.id}
      entityType={mapTypes[provider.ref.kind as keyof typeof mapTypes]}
      compact
    />
  {/if}
{/snippet}

{#snippet locations()}
  <div class="space-y-2">
    {#each groups as group (group.providers[0])}
      {@const provider = group.providers[0]}
      <div class="space-y-1">
        {#if group.providers.length === 1 || !group.providers.some((placement) => placement.location?.geometryVisibility === "visible")}
          <div class="flex flex-wrap items-center gap-1">
            {@render providerLabel(provider)}
            {@render mapLink(provider)}
            {#if group.providers.length > 1}
              <span class="text-sm text-muted-foreground">
                ({group.providers.length} locations)
              </span>
            {/if}
          </div>
        {:else}
          <details>
            <summary class="cursor-pointer">
              {@render providerLabel(provider)}
              <span class="text-sm text-muted-foreground">
                ({group.providers.length} locations)
              </span>
            </summary>
            <div class="flex flex-wrap gap-x-4 gap-y-2 pt-2">
              {#each group.providers as placement, index (placement)}
                <span class="inline-flex flex-wrap items-center gap-1 text-sm">
                  Location {index + 1}{@render mapLink(placement)}
                </span>
              {/each}
            </div>
          </details>
        {/if}
        <Requirements roots={group.requirements} {names} />
      </div>
    {/each}
  </div>
{/snippet}
{#if providers.length > 4}
  <details>
    <summary
      class="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
      >{providers.every((provider) => provider.location)
        ? "Locations"
        : "Sources"} ({providers.length.toLocaleString("en-US")})</summary
    >
    <ScrollRegion
      className="mt-2 max-h-80 overflow-y-auto pr-2"
      label="Source locations"
      {parentScroll}>{@render locations()}</ScrollRegion
    >
  </details>
{:else}{@render locations()}{/if}
