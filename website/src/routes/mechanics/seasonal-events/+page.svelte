<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import { SEASONS, seasonDates, type Season } from "$lib/data/seasonal-events";
  import { getQualityTextColorClass } from "$lib/utils/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const offersFor = (season: Season) =>
    data.offers.filter((offer) => offer.season === season);

  const halloweenCurrencies = $derived([
    ...new Set(data.currencyDrops.map((drop) => drop.item_id)),
  ]);

  const hour = (value: number) => `${String(value).padStart(2, "0")}:00`;
</script>

{#snippet itemLink(id: string, variant: "text" | "reference" = "text")}
  {@const item = data.items[id]}
  <ItemLink
    itemId={id}
    itemName={item.name}
    quality={item.quality}
    colorClass={getQualityTextColorClass(item.quality)}
    tooltipHtml={item.tooltip_html}
    imageAvailable={data.itemIconPaths[id]}
    {variant}
  />
{/snippet}

{#snippet shop(season: Season)}
  <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — repair merchants add the season's items to their stock while it runs. -->
  <h3 class="pt-2 font-semibold text-foreground">Seasonal shop</h3>
  <p>
    Every <a
      href="/npcs?npcs.role_keys=can_repair_equipment"
      class="text-blue-600 hover:underline dark:text-blue-400"
      >repair merchant</a
    > adds these to their stock while the event runs.
  </p>
  <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead
        ><tr class="border-b"
          ><th class="p-3 text-left font-medium text-foreground">Item</th><th
            class="p-3 text-left font-medium text-foreground">Price</th
          ></tr
        ></thead
      >
      <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
        {#each offersFor(season) as offer (offer.item_id)}
          <tr class="border-b last:border-0">
            <td class="p-3">
              {@render itemLink(offer.item_id, "reference")}
              {#if offer.received_id !== offer.item_id}
                <div class="mt-1 text-xs">
                  Gives {offer.amount}×
                  {@render itemLink(offer.received_id)}
                </div>
              {/if}
            </td>
            <td class="p-3 whitespace-nowrap"
              >{offer.price} {@render itemLink(offer.currency_id)}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

<Seo
  title="Seasonal Event Mechanics - Ancient Kingdoms"
  description="Halloween and the Winter Festival in Ancient Kingdoms: dates, Double XP, seasonal monsters, Santa Claus's quests, and what repair merchants sell."
  path="/mechanics/seasonal-events"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Seasonal Events" },
    ]}
  />

  <h1 class="text-4xl font-bold">Seasonal Event Mechanics</h1>
  <p class="text-muted-foreground">
    Ancient Kingdoms celebrates Halloween and the Winter Festival. While one
    runs, everyone gets Double XP, seasonal monsters or visitors appear, and
    repair merchants sell festive treats and fireworks.
  </p>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/seasonal-events"]} />

  <Card.Root id="schedule" class="bg-muted/30">
    <Card.Header><Card.Title>When they run</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents — UTC dates, checked when the server starts and then once an hour. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Event</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Dates (UTC)</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each Object.entries(SEASONS) as [key, season] (key)}
              <tr class="border-b last:border-0">
                <td class="p-3"
                  ><a
                    href="#{season.anchor}"
                    class="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >{season.name}</a
                  ></td
                >
                <td class="p-3">{seasonDates(key as Season)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Player.cs:CheckSpecialEvents — entering the world announces a running event. -->
      <p>
        Both dates are included. The server checks the date once an hour, so an
        event can start or end up to an hour late. The game announces a running
        event when you enter the world.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="double-xp" class="bg-muted/30">
    <Card.Header><Card.Title>Double XP</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents; server-scripts/Player.cs:Start — every online player gets the season's buff, and players entering the world during the event get it too. -->
      <!-- Source: server-scripts/Skills.cs:hasDoubleExp; server-scripts/Monster.cs:OnDeath; server-scripts/Npc.cs:OnDeath; server-scripts/GatherItem.cs:OnInteractServer,OnInteractFishServer; server-scripts/Player.cs:UserCode_CmdMakePotion__Int32,UserCode_CmdCraftAugment__NetworkIdentity__String__String,UserCode_CmdCraftItem__NetworkIdentity__Int32 — a Double XP buff doubles kill, gathering, fishing, crafting, cooking, alchemy, scribing and augment XP, once. -->
      <p>
        While an event runs, every player has the <a
          href="/skills/halloween_event"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Halloween Event</a
        >
        or
        <a
          href="/skills/winter_festival"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Winter Festival</a
        > buff. It doubles XP from monster and NPC kills, gathering, fishing, crafting,
        cooking, alchemy, scribing and augments. Quest and exploration XP are not
        doubled.
      </p>
      <p>
        Double XP buffs do not stack, so an <a
          href="/items/elixir_of_enlightened_learning"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Elixir of Enlightened Learning</a
        >
        adds nothing during an event. See
        <MechanicsLink section="experience">Experience</MechanicsLink> for how it
        combines with other bonuses.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="halloween" class="bg-muted/30">
    <Card.Header><Card.Title>Halloween</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:Start,UpdateServer_IDLE,UpdateServer_DEAD,IsHourBetween — Halloween monsters appear only during Halloween and within their spawn hours, and vanish when it ends. -->
      <p>
        Halloween monsters roam the world at night and vanish when Halloween
        ends. They drop
        {#each halloweenCurrencies as id, i (id)}{i > 0
            ? " and "
            : ""}{@render itemLink(id)}{/each}, which the Halloween shop
        accepts.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Monster</th
              ><th class="p-3 text-left font-medium text-foreground">Level</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Game time</th
              ><th class="p-3 text-left font-medium text-foreground">Where</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each data.monsters as monster (monster.id)}
              <tr class="border-b last:border-0">
                <td class="p-3 whitespace-nowrap"
                  ><EntityLink
                    href="/monsters/{monster.id}"
                    name={monster.name}
                  /></td
                >
                <td class="p-3 whitespace-nowrap"
                  >{monster.level_min} to {monster.level_max}</td
                >
                <td class="p-3 whitespace-nowrap"
                  >{hour(monster.spawn_time_start)} to {hour(
                    monster.spawn_time_end,
                  )}</td
                >
                <td class="p-3 min-w-72"
                  >{#each monster.zones as zone, i (zone.id)}{i > 0
                      ? ", "
                      : ""}<a
                      href="/zones/{zone.id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                      >{zone.name}</a
                    >{/each}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {@render shop("halloween")}
    </Card.Content>
  </Card.Root>

  <Card.Root id="winter-festival" class="bg-muted/30">
    <Card.Header><Card.Title>Winter Festival</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:Start,UpdateServer_IDLE,UpdateServer_DEAD — Winter Festival NPCs stay hidden outside the festival. -->
      <!-- Source: server-scripts/PlayerQuests.cs:CanAcceptInternal — a completed repeatable quest can be accepted again after 8 hours. -->
      <p>
        {#each data.npcs as npc, i (`${npc.id}:${npc.zone_id}`)}{i > 0
            ? ", "
            : ""}<a
            href="/npcs/{npc.id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{npc.name}</a
          >
          visits
          <a
            href="/zones/{npc.zone_id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{npc.zone_name}</a
          >{/each} during the festival. His quests can be repeated every 8 hours and
        reward the currencies the Winter Festival shop accepts.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Quest</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Recommended level</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Turn in to</th
              ><th class="p-3 text-left font-medium text-foreground">Rewards</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each data.quests as quest (quest.id)}
              <tr class="border-b last:border-0">
                <td class="p-3 min-w-44"
                  ><a
                    href="/quests/{quest.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{quest.name}</a
                  ></td
                >
                <td class="p-3 whitespace-nowrap">{quest.level_recommended}</td>
                <td class="p-3 whitespace-nowrap"
                  ><a
                    href="/npcs/{quest.completer_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{quest.completer_name}</a
                  ></td
                >
                <td class="p-3 whitespace-nowrap"
                  ><ul class="space-y-1">
                    {#each quest.reward_ids as id (id)}<li>
                        {@render itemLink(id, "reference")}
                      </li>{/each}
                  </ul></td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {@render shop("christmas")}
    </Card.Content>
  </Card.Root>
</div>
