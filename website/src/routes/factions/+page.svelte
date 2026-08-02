<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import {
    FACTION_ACCENTS,
    FACTION_ACCENT_FALLBACK,
  } from "$lib/constants/factions";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/factions",
      name: "Factions — Ancient Kingdoms Compendium",
      description:
        "The six factions of Ancient Kingdoms: who belongs to each, which kills and quests raise reputation, and what Honored, Ally, and Revered unlock.",
      items: data.factions.map((faction) => ({
        name: faction.name,
        path: `/factions/${faction.id}`,
      })),
    }),
  );

  function plural(count: number, singular: string, pluralForm: string): string {
    return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
  }
</script>

<Seo
  title="Factions - Ancient Kingdoms"
  description="The six factions of Ancient Kingdoms: who belongs to each, which kills and quests raise reputation, and what Honored, Ally, and Revered unlock."
  path="/factions"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto px-4 py-6">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Factions", href: "/factions" },
    ]}
  />

  <h1 class="text-4xl font-bold mb-6 mt-4">Factions</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each data.factions as faction (faction.id)}
      {@const accent = FACTION_ACCENTS[faction.id] ?? FACTION_ACCENT_FALLBACK}
      {@const FactionIcon = accent.icon}

      <a
        href="/factions/{faction.id}"
        class="block group h-full cursor-pointer"
      >
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30 flex flex-col !py-0 !gap-0"
        >
          <Card.Header class="space-y-4 !px-6 !pt-6">
            <div class="flex justify-center">
              <div class="p-6 rounded-2xl {accent.bg}">
                <FactionIcon class="h-14 w-14 {accent.color}" />
              </div>
            </div>

            <Card.Title class="text-2xl text-center group-hover:underline">
              {faction.name}
            </Card.Title>
          </Card.Header>

          <Card.Content
            class="space-y-1 text-sm text-muted-foreground mt-auto !px-6 !pt-6 !pb-6"
          >
            <div>{plural(faction.member_count, "member", "members")}</div>
            <div>
              {plural(faction.monster_source_count, "monster", "monsters")} raise
              it
            </div>
            <div>
              {plural(faction.quest_source_count, "quest", "quests")} grant reputation
            </div>
            <div>
              {plural(
                faction.house_count + faction.gated_item_count,
                "reputation unlock",
                "reputation unlocks",
              )}
            </div>
          </Card.Content>
        </Card.Root>
      </a>
    {/each}
  </div>

  <p class="mt-6 text-sm text-muted-foreground">
    Reputation goes from Hated to Exalted. See
    <a
      href="/mechanics/reputation"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >how reputation works</a
    > for the tiers and formulas.
  </p>
</div>
