<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import SeasonLabel from "$lib/components/SeasonLabel.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import {
    SEASON_ORDER,
    seasonDates,
    seasonInSentence,
    type Season,
  } from "$lib/data/seasonal-events";
  import {
    formatSpawnTimeWindow,
    getQualityTextColorClass,
    spawnWindowRealMinutes,
  } from "$lib/utils/format";
  import type { SeasonalShopOffer } from "$lib/queries/seasonal-events.server";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const LINK = "text-blue-600 hover:underline dark:text-blue-400";

  const isTreat = (offer: SeasonalShopOffer) =>
    Boolean(data.items[offer.received_id].food_buff_id);
  const fireworks = $derived(data.offers.filter((o) => !isTreat(o)));
  const currencies = $derived([
    ...new Set(data.offers.map((o) => o.currency_id)),
  ]);
  const names = (list: readonly { name: string }[]) =>
    list.map((entry) => entry.name).join(" and ");
  const during = (seasons: Iterable<Season>) =>
    [...new Set(seasons)]
      .sort((a, b) => SEASON_ORDER[a] - SEASON_ORDER[b])
      .map(seasonInSentence)
      .join(" and ");
  const killsPerToken = (probability: number) =>
    Number((1 / probability).toFixed(1));

  /** What a currency buys and when, for example "fireworks during Halloween and the Winter Festival". */
  const purchases = (currencyId: string) => {
    const offers = data.offers.filter((o) => o.currency_id === currencyId);
    return [
      { kind: "treats", offers: offers.filter(isTreat) },
      { kind: "fireworks", offers: offers.filter((o) => !isTreat(o)) },
    ]
      .filter((group) => group.offers.length)
      .map(
        (group) =>
          `${group.kind} during ${during(group.offers.flatMap((o) => o.seasons))}`,
      )
      .join(" and ");
  };

  // Every seasonal monster shares one spawn window, so the first one names it.
  const night = $derived.by(() => {
    const { spawn_time_start: start, spawn_time_end: end } = data.monsters[0];
    const [from, to] = formatSpawnTimeWindow(start, end)!.split("-");
    return { from, to, minutes: spawnWindowRealMinutes(start, end) };
  });
</script>

{#snippet itemLink(id: string)}
  {@const item = data.items[id]}
  <ItemLink
    itemId={id}
    itemName={item.name}
    quality={item.quality}
    colorClass={getQualityTextColorClass(item.quality)}
    tooltipHtml={item.tooltip_html}
    imageAvailable={data.itemIconPaths[id]}
    variant="reference"
    class="no-underline hover:underline"
  />
{/snippet}

{#snippet price(offer: SeasonalShopOffer)}
  <span
    class="inline-flex shrink-0 items-center gap-2 font-medium text-foreground"
    title={data.items[offer.currency_id].name}
  >
    {offer.price}
    {#if data.itemIconPaths[offer.currency_id]}<img
        src="/{data.itemIconPaths[offer.currency_id]}"
        alt={data.items[offer.currency_id].name}
        class="size-6 object-contain"
      />{:else}{data.items[offer.currency_id].name}{/if}
  </span>
{/snippet}

{#snippet note(text: string)}
  <p class="flex items-start gap-2 text-sm">
    <TriangleAlert
      class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
      aria-hidden="true"
    />
    {text}
  </p>
{/snippet}

{#snippet offerTile(offer: SeasonalShopOffer, detail: string | null)}
  <div
    class="flex min-w-0 items-start justify-between gap-3 rounded-lg border p-3"
  >
    <div class="min-w-0 space-y-1">
      <div class="font-medium">{@render itemLink(offer.received_id)}</div>
      {#if detail}<p class="text-sm">{detail}</p>{/if}
    </div>
    {@render price(offer)}
  </div>
{/snippet}

{#snippet treats(season: Season)}
  <Card.Root class="bg-muted/30">
    <Card.Header><Card.Title>Treats</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — repair merchants add only the running season's items. -->
      <p>
        <a href="/npcs?npcs.role_keys=can_repair_equipment" class={LINK}
          >Repair merchants</a
        >
        sell these during {seasonInSentence(season)}.
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <!-- Source: server-scripts/FoodItem.cs:Use,ToolTip — food applies its configured buff at the item's buff level. -->
        {#each data.offers.filter((o) => isTreat(o) && o.seasons.includes(season)) as offer (offer.item_id)}
          {@render offerTile(offer, data.items[offer.received_id].effect)}
        {/each}
      </div>
      <!-- Source: server-scripts/FoodItem.cs:Use — another buff in the same category ends the first, while Food and Drink are separate categories. -->
      {@render note(
        "Eating another seasonal treat ends the first. Treats stack with ordinary food and drink.",
      )}
    </Card.Content>
  </Card.Root>
{/snippet}

<Seo
  title="Seasonal Event Mechanics - Ancient Kingdoms"
  description="Halloween and the Winter Festival in Ancient Kingdoms: dates, Double XP, seasonal monsters, Santa Claus's quests, and what repair merchants sell."
  path="/mechanics/seasonal-events"
/>

<div class="container mx-auto max-w-5xl space-y-8 px-4 py-8 sm:p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Seasonal Events" },
    ]}
  />
  <h1 class="text-4xl font-bold">Seasonal Event Mechanics</h1>
  <!-- Source: server-scripts/EnviromentSystem.cs:OnStartServer,CheckSpecialEvents — seasons use inclusive UTC dates and the flags refresh hourly. -->
  <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — repair merchants add the running season's items. -->
  <p class="text-muted-foreground">
    Halloween runs from {seasonDates("halloween")} and the Winter Festival from
    {seasonDates("christmas")}, by UTC date. Each event can start or end up to
    an hour after midnight UTC. While either runs, every online player has
    Double XP and repair merchants sell treats and fireworks.
  </p>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/seasonal-events"]} />

  <Card.Root id="double-xp" class="bg-muted/30">
    <Card.Header><Card.Title>Double XP</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents; server-scripts/Player.cs:Start — every online player gets the season's Double XP buff, including on login. -->
      <!-- Source: server-scripts/Monster.cs:OnDeath; server-scripts/Npc.cs:OnDeath; server-scripts/GatherItem.cs:OnInteractServer,OnInteractFishServer; server-scripts/Player.cs:UserCode_CmdMakePotion__Int32,UserCode_CmdCraftAugment__NetworkIdentity__String__String,UserCode_CmdCraftItem__NetworkIdentity__Int32 — hasDoubleExp doubles character XP from kills, gathering, fishing, alchemy, scribing, augments and crafting, including cooking. -->
      <!-- Source: server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32; server-scripts/Player.cs:UserCode_CmdGetExperienceNewZone__Int64 — quest and exploration XP are awarded without Double XP. -->
      <p>
        Every online player has Double XP while either event runs. It doubles
        <MechanicsLink section="experience">character XP</MechanicsLink> from kills,
        gathering, fishing, crafting, cooking, alchemy, scribing and augmenting. Quest
        XP, exploration XP and profession skill gains are not doubled.
      </p>
      <!-- Source: server-scripts/Skills.cs:hasDoubleExp — Double XP is a single boolean bonus, so multiple Double XP buffs add nothing. -->
      {@render note(
        "Double XP buffs do not stack, so an Elixir of Enlightened Learning drunk during an event adds nothing.",
      )}
    </Card.Content>
  </Card.Root>

  <section id="halloween" class="space-y-4">
    <h2 class="text-2xl font-semibold">
      <SeasonLabel season="halloween" variant="title" />
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Header><Card.Title>Spawns</Card.Title></Card.Header>
      <Card.Content class="space-y-4 text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD,EventTimeSpawn,EventTimeDespawn,IsHourBetween — Halloween spawns are night-only, a game day is 3600 real seconds, and monsters despawn outside their hours when out of combat. -->
        <!-- Source: server-scripts/Monster.cs:OnDeath — seasonal monsters roll their configured item drops once per kill. -->
        <p>
          {#each data.monsters as monster, i (monster.id)}{i ? " and " : ""}<a
              href="/monsters/{monster.id}"
              class={LINK}>{monster.name}</a
            >{/each} spawn from {night.from} to {night.to} game time, which is {night.minutes}
          real minutes in every hour. At {night.to} they despawn once out of combat.
          Each kill has
          {#each data.currencyDrops as drop, i (drop.item_id)}{i
              ? " and "
              : ""}a {Math.round(drop.probability * 100)}% chance to drop a {data
              .items[drop.item_id].name}, about {killsPerToken(
              drop.probability,
            )} kills per token{/each}.
        </p>
        <table
          class="w-full border-collapse text-sm [&_td]:p-2 [&_th]:p-2 sm:[&_td]:p-3 sm:[&_th]:p-3"
        >
          <thead
            ><tr class="border-b"
              ><th class="text-left font-medium text-foreground">Zone</th><th
                class="text-left font-medium text-foreground">Levels</th
              >{#each data.monsters as monster (monster.id)}<th
                  class="text-right font-medium text-foreground"
                  >{monster.name}</th
                >{/each}</tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each data.huntZones as zone (zone.id)}
              <tr class="border-b last:border-0">
                <td><a href="/zones/{zone.id}" class={LINK}>{zone.name}</a></td>
                <td class="whitespace-nowrap"
                  >{zone.level_min} to {zone.level_max}</td
                >
                {#each data.monsters as monster (monster.id)}
                  <td class="text-right tabular-nums"
                    >{zone.counts[monster.id]}</td
                  >
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </Card.Content>
    </Card.Root>
    {@render treats("halloween")}
  </section>

  <section id="winter-festival" class="space-y-4">
    <h2 class="text-2xl font-semibold">
      <SeasonLabel season="christmas" variant="title" />
    </h2>
    {#each data.npcs as npc (npc.id)}
      <Card.Root class="bg-muted/30">
        <Card.Header><Card.Title>{npc.name}'s quests</Card.Title></Card.Header>
        <Card.Content class="space-y-4 text-muted-foreground">
          <!-- Source: server-scripts/Npc.cs:Start,UpdateServer_IDLE,UpdateServer_DEAD — Santa is available only during the Winter Festival. -->
          <!-- Source: server-scripts/PlayerQuests.cs:CanAcceptInternal — repeatable quests can be accepted again eight hours after completion. -->
          <p>
            {npc.name} offers these quests in {npc.zone_name}. You can accept
            each again 8 hours after completing it.
            <a href="/map?entity={npc.id}&etype=npc" class={LINK}
              >Show {npc.name} on the map</a
            >.
          </p>
          <div class="grid gap-3">
            <!-- Source: server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32; server-scripts/KillQuest.cs:IsFulfilled; server-scripts/GatherInventoryQuest.cs:IsFulfilled — quests use their configured objectives and award shared and class-specific rewards on completion. -->
            {#each data.quests as quest (quest.id)}
              <article
                class="grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_15rem]"
              >
                <div class="min-w-0 space-y-2">
                  <h3 class="font-semibold">
                    <EntityLink href="/quests/{quest.id}" name={quest.name} />
                  </h3>
                  <p class="text-sm">
                    {#if "text" in quest.objective}{quest.objective
                        .text}{:else}{quest.objective.verb}
                      <EntityLink
                        href={quest.objective.href}
                        name={quest.objective.name}
                      />
                      <span class="text-foreground"
                        >×{quest.objective.amount}</span
                      >{/if}
                  </p>
                  <p class="text-sm">
                    {#each quest.zones as zone, i (zone.id)}{i
                        ? " and "
                        : ""}<EntityLink
                        href="/zones/{zone.id}"
                        name={zone.name}
                      />{/each}
                  </p>
                  <p class="text-sm">
                    Turn in to <EntityLink
                      href="/npcs/{quest.completer_id}"
                      name={quest.completer_name}
                    />.
                  </p>
                </div>
                <div class="space-y-3 text-sm sm:border-l sm:pl-4">
                  <p class="text-foreground">
                    Recommended level {quest.level_recommended}
                  </p>
                  <p class="font-medium text-foreground">
                    {quest.xp.toLocaleString("en-US")} XP
                  </p>
                  <div class="space-y-2">
                    {#each quest.rewards as reward (reward.item_id)}<div
                        class="flex items-center gap-2"
                      >
                        <span class="font-medium text-foreground"
                          >{reward.amount}×</span
                        >{@render itemLink(reward.item_id)}
                      </div>{/each}
                  </div>
                </div>
              </article>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
    {@render treats("christmas")}
  </section>

  <Card.Root id="fireworks" class="bg-muted/30">
    <Card.Header><Card.Title>Fireworks</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor; server-scripts/PlayerNpcTrading.cs:UserCode_CmdBuyItem__Int32__Int32__Int64 — both seasons' repair-merchant offers deliver pack contents directly. -->
      <p>
        Repair merchants sell fireworks during {during(
          fireworks.flatMap((o) => o.seasons),
        )}.
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        {#each fireworks as offer (offer.item_id)}
          {@render offerTile(offer, `${offer.amount} per purchase`)}
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="currencies" class="bg-muted/30">
    <Card.Header><Card.Title>Currencies</Card.Title></Card.Header>
    <Card.Content class="grid gap-3 text-muted-foreground sm:grid-cols-3">
      <!-- Source: server-scripts/Monster.cs:OnDeath; server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32; server-scripts/NpcTrading.cs:VisibleSaleItemsFor — tokens come from configured drops or quest rewards and buy the season's merchant items. -->
      {#each currencies as id (id)}
        <div class="min-w-0 space-y-2 rounded-lg border p-3 text-sm">
          <h3 class="text-base font-medium">{@render itemLink(id)}</h3>
          {#if data.currencyDrops.some((d) => d.item_id === id)}<p>
              Dropped by {names(data.monsters)}.
            </p>{/if}
          {#if data.quests.some( (q) => q.rewards.some((r) => r.item_id === id) )}<p
            >
              Rewarded by {names(data.npcs)}'s quests.
            </p>{/if}
          <p>Buys {purchases(id)}.</p>
        </div>
      {/each}
    </Card.Content>
  </Card.Root>
</div>
