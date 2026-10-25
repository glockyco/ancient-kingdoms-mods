<script lang="ts">
  import { onMount } from "svelte";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import SeasonLabel from "$lib/components/SeasonLabel.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import {
    SEASON_ORDER,
    SEASONS,
    seasonDates,
    seasonInSentence,
    seasonOccurrence,
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

  // The reader's clock is known only in the browser, so the prerendered page
  // shows no status and the browser fills it in after mount.
  let now = $state<Date | null>(null);
  onMount(() => {
    now = new Date();
    const interval = window.setInterval(() => (now = new Date()), 60_000);
    return () => window.clearInterval(interval);
  });

  const MS_PER_DAY = 86_400_000;
  /** Whole days while two or more remain, then hours and minutes. */
  const timeUntil = (target: Date, from: Date) => {
    const ms = Math.max(0, target.getTime() - from.getTime());
    if (ms >= 2 * MS_PER_DAY) return `${Math.floor(ms / MS_PER_DAY)} days`;
    const minutes = Math.floor(ms / 60_000);
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };
  const localTime = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  /** Whether the season runs at an instant, and when it next starts or ends in the reader's time zone. */
  const status = (season: Season, at: Date) => {
    const run = seasonOccurrence(season, at);
    return run.start <= at
      ? {
          running: true,
          text: `Ends in ${timeUntil(run.end, at)}, on ${localTime(run.end)}.`,
        }
      : {
          running: false,
          text: `Starts in ${timeUntil(run.start, at)}, on ${localTime(run.start)}.`,
        };
  };

  const REPAIR_MERCHANTS_MAP = "/map?layers=tiles,npcRepair";
  const mapHref = (id: string, type: "monster" | "npc" | "quest") =>
    `/map?entity=${id}&etype=${type}`;

  const LINK = "text-blue-600 hover:underline dark:text-blue-400";
  const TABLE =
    "w-full border-collapse text-sm [&_td]:p-2 [&_th]:p-2 sm:[&_td]:p-3 sm:[&_th]:p-3";

  const bySeason = (a: Season, b: Season) => SEASON_ORDER[a] - SEASON_ORDER[b];
  const during = (seasons: Iterable<Season>) =>
    [...new Set(seasons)].sort(bySeason).map(seasonInSentence).join(" and ");
  const names = (list: readonly { name: string }[]) =>
    list.map((entry) => entry.name).join(" and ");
  const percent = (chance: number) => `${Math.round(chance * 100)}%`;
  /** Seasonal currency names are regular nouns: Spook Tokens, Winter Festival Coins. */
  const plural = (name: string) => `${name}s`;

  const isTreat = (offer: SeasonalShopOffer) =>
    Boolean(data.items[offer.received_id].food_buff_id);
  const treatsOf = (season: Season) =>
    data.offers.filter((o) => isTreat(o) && o.seasons.includes(season));
  const fireworks = $derived(data.offers.filter((o) => !isTreat(o)));
  const currencyIds = $derived(new Set(data.offers.map((o) => o.currency_id)));
  const tokenDrops = $derived(
    data.drops.filter((d) => currencyIds.has(d.item_id)),
  );
  const costumePieces = $derived(
    data.drops.filter((d) => !currencyIds.has(d.item_id)),
  );
  /** Costume pieces grouped by the monster that drops them, with the shared chance when every piece has one. */
  const costumeSets = $derived.by(() => {
    const other = costumePieces.find(
      (d) => data.items[d.item_id].item_type !== "costume",
    );
    if (other)
      throw new Error(
        `Seasonal drop ${other.item_id} is neither a currency nor a costume piece, so the page has no place for it`,
      );
    return data.monsters
      .map((monster) => {
        const pieces = costumePieces.filter(
          (d) => d.chances[monster.id] !== undefined,
        );
        const chances = new Set(pieces.map((d) => d.chances[monster.id]));
        return {
          monster,
          pieces,
          chance: chances.size === 1 ? [...chances][0] : null,
        };
      })
      .filter((set) => set.pieces.length);
  });

  /** What earns each currency and what it buys, shared tokens first. */
  const currencies = $derived(
    [...new Set(data.offers.map((o) => o.currency_id))]
      .map((id) => {
        const dropped = data.drops.find((d) => d.item_id === id);
        const droppers = data.monsters.filter(
          (m) => dropped && dropped.chances[m.id] !== undefined,
        );
        const rewarding = data.quests.some((q) =>
          q.rewards.some((r) => r.item_id === id),
        );
        const earned = [
          ...(droppers.length
            ? [
                `${names(droppers)} during ${during(droppers.map((m) => m.season))}`,
              ]
            : []),
          ...(rewarding
            ? data.npcs.map(
                (npc) =>
                  `${npc.name}'s quests during ${seasonInSentence(npc.season)}`,
              )
            : []),
        ];
        const offers = data.offers.filter((o) => o.currency_id === id);
        const buys = [
          { kind: "treats", offers: offers.filter(isTreat) },
          { kind: "fireworks", offers: offers.filter((o) => !isTreat(o)) },
        ]
          .filter((group) => group.offers.length)
          .map(
            (group) =>
              `${group.kind[0].toUpperCase()}${group.kind.slice(1)} during ${during(group.offers.flatMap((o) => o.seasons))}`,
          );
        return { id, earned, buys, seasons: data.items[id].seasons.length };
      })
      .sort((a, b) => b.seasons - a.seasons),
  );

  // Every seasonal monster shares one spawn window, so the first one names it.
  const night = $derived.by(() => {
    const { spawn_time_start: start, spawn_time_end: end } = data.monsters[0];
    const [from, to] = formatSpawnTimeWindow(start, end)!.split("-");
    return { from, to, minutes: spawnWindowRealMinutes(start, end) };
  });

  /** One line per season for the dates card, and where to read more. */
  const overview = $derived(
    data.seasons.map(({ id: season }) =>
      season === "halloween"
        ? {
            season,
            gist: `${names(data.monsters)} spawn at night in ${data.huntZones.length} zones and drop tokens and ${costumePieces.length} costume pieces.`,
            more: "Spawns, drops and treats",
          }
        : {
            season,
            gist: data.npcs
              .map(
                (npc) =>
                  `${npc.name} offers ${data.quests.length} quests in ${npc.zone_name} that reward tokens and coins.`,
              )
              .join(" "),
            more: "Quests and treats",
          },
    ),
  );
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

<!-- Names the currencies a card's prices use, with the icon each price shows. -->
{#snippet currencyNames(offers: readonly SeasonalShopOffer[])}
  {#each [...new Set(offers.map((o) => o.currency_id))] as id, i (id)}{i
      ? " and "
      : ""}<span class="inline-flex items-baseline gap-1 whitespace-nowrap"
      >{#if data.itemIconPaths[id]}<img
          src="/{data.itemIconPaths[id]}"
          alt=""
          class="size-5 self-center object-contain"
        />{/if}{plural(data.items[id].name)}</span
    >{/each}
{/snippet}

{#snippet mapLinks(links: { href: string; label: string }[])}
  <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
    <span class="inline-flex items-center gap-1"
      ><MapPin class="size-4" aria-hidden="true" />Show on the map:</span
    >
    {#each links as link (link.href)}<a href={link.href} class={LINK}
        >{link.label}</a
      >{/each}
  </p>
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

{#snippet seasonHeading(season: Season)}
  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h2 class="text-2xl font-semibold">
      <SeasonLabel {season} variant="title" />
    </h2>
    <p class="text-sm text-muted-foreground">{seasonDates(season)}</p>
  </div>
{/snippet}

{#snippet treats(season: Season)}
  <Card.Root id="{SEASONS[season].anchor}-treats" class="bg-muted/30">
    <Card.Header><Card.Title>Treats</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — repair merchants add only the running season's items. -->
      <p>
        <a href="/npcs?npcs.role_keys=can_repair_equipment" class={LINK}
          >Repair merchants</a
        >
        sell these during {seasonInSentence(season)} for {@render currencyNames(
          treatsOf(season),
        )}.
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <!-- Source: server-scripts/FoodItem.cs:Use,ToolTip — food applies its configured buff at the item's buff level. -->
        {#each treatsOf(season) as offer (offer.item_id)}
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
  description="Halloween and the Winter Festival in Ancient Kingdoms: dates, Double XP, seasonal monsters and costumes, Santa Claus's quests, and what repair merchants sell."
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

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/seasonal-events"]} />

  <Card.Root id="dates" class="bg-muted/30">
    <Card.Header><Card.Title>Dates</Card.Title></Card.Header>
    <Card.Content class="text-muted-foreground">
      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Source: server-scripts/EnviromentSystem.cs:OnStartServer,CheckSpecialEvents — seasons run on inclusive UTC dates. -->
        <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD,EventTimeSpawn — Halloween monsters spawn at their configured hours during Halloween. -->
        <!-- Source: server-scripts/Npc.cs:Start,UpdateServer_IDLE — Santa is present only during the Winter Festival. -->
        {#each overview as entry (entry.season)}
          <div class="flex flex-col gap-4 rounded-lg border p-5">
            <div class="space-y-1">
              <p class="font-semibold text-foreground">
                <SeasonLabel season={entry.season} variant="title" />
              </p>
              <p class="text-foreground">{seasonDates(entry.season)}</p>
              <p class="min-h-5 text-sm">
                {#if now}
                  {@const current = status(entry.season, now)}
                  {#if current.running}
                    <span
                      class="font-medium text-emerald-600 dark:text-emerald-400"
                      >Running now.</span
                    >
                    {current.text}
                  {:else}
                    {current.text}
                  {/if}
                {/if}
              </p>
            </div>
            <p>{entry.gist}</p>
            <a href="#{SEASONS[entry.season].anchor}" class="mt-auto {LINK}"
              >{entry.more}</a
            >
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <section id="both-events" class="space-y-4">
    <h2 class="text-2xl font-semibold">Both events</h2>

    <Card.Root id="double-xp" class="bg-muted/30">
      <Card.Header><Card.Title>Double XP</Card.Title></Card.Header>
      <Card.Content class="space-y-4 text-muted-foreground">
        <!-- Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents; server-scripts/Player.cs:Start — every online player gets the season's Double XP buff, including on login. -->
        <!-- Source: server-scripts/Monster.cs:OnDeath; server-scripts/Npc.cs:OnDeath; server-scripts/GatherItem.cs:OnInteractServer,OnInteractFishServer; server-scripts/Player.cs:UserCode_CmdMakePotion__Int32,UserCode_CmdCraftAugment__NetworkIdentity__String__String,UserCode_CmdCraftItem__NetworkIdentity__Int32 — hasDoubleExp doubles character XP from kills, gathering, fishing, alchemy, scribing, augments and crafting, including cooking. -->
        <!-- Source: server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32; server-scripts/Player.cs:UserCode_CmdGetExperienceNewZone__Int64 — quest and exploration XP are awarded without Double XP. -->
        <p>
          Every online player has a Double XP buff while either event runs:
          {#each data.seasons as season, i (season.id)}{i
              ? " and "
              : ""}<EntityLink
              href="/skills/{season.buff_skill_id}"
              name={season.buff_skill_name}
              domain="skill"
              entityId={season.buff_skill_id}
              variant="text"
              class={LINK}
            /> during {seasonInSentence(season.id)}{/each}. The buff doubles
          <MechanicsLink section="experience">character XP</MechanicsLink> from kills,
          gathering, fishing, crafting, cooking, alchemy, scribing and augmenting.
          Quest XP, exploration XP and profession skill gains are not doubled.
        </p>
        <!-- Source: server-scripts/Skills.cs:hasDoubleExp — Double XP is a single boolean bonus, so multiple Double XP buffs add nothing. -->
        {@render note(
          "Double XP buffs do not stack, so an Elixir of Enlightened Learning drunk during an event adds nothing.",
        )}
      </Card.Content>
    </Card.Root>

    <Card.Root id="currencies" class="bg-muted/30">
      <Card.Header><Card.Title>Currencies</Card.Title></Card.Header>
      <Card.Content class="text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:OnDeath; server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32; server-scripts/NpcTrading.cs:VisibleSaleItemsFor — tokens come from configured drops or quest rewards and buy the season's merchant items. -->
        <table class={TABLE}>
          <thead
            ><tr class="border-b"
              ><th class="text-left font-medium text-foreground">Currency</th
              ><th class="text-left font-medium text-foreground">Earned from</th
              ><th class="text-left font-medium text-foreground">Buys</th></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each currencies as currency (currency.id)}
              <tr class="border-b align-top last:border-0">
                <td class="font-medium">{@render itemLink(currency.id)}</td>
                <td class="space-y-2"
                  >{#each currency.earned as line (line)}<p>
                      {line}
                    </p>{/each}</td
                >
                <td class="space-y-2"
                  >{#each currency.buys as line (line)}<p>{line}</p>{/each}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </Card.Content>
    </Card.Root>

    <Card.Root id="seasonal-shop" class="bg-muted/30">
      <Card.Header><Card.Title>Seasonal shop</Card.Title></Card.Header>
      <Card.Content class="space-y-4 text-muted-foreground">
        <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor; server-scripts/PlayerNpcTrading.cs:UserCode_CmdBuyItem__Int32__Int32__Int64 — repair merchants add the running season's items, and pack offers deliver their contents directly. -->
        <p>
          <a href="/npcs?npcs.role_keys=can_repair_equipment" class={LINK}
            >Repair merchants</a
          >
          sell these fireworks during {during(
            fireworks.flatMap((o) => o.seasons),
          )} for {@render currencyNames(fireworks)}. They also sell each event's
          treats while it runs:
          {#each data.seasons as { id: season }, i (season)}{i ? " and " : ""}<a
              href="#{SEASONS[season].anchor}-treats"
              class={LINK}>{SEASONS[season].name} treats</a
            >{/each}.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each fireworks as offer (offer.item_id)}
            {@render offerTile(offer, `${offer.amount} per purchase`)}
          {/each}
        </div>
        {@render mapLinks([
          { href: REPAIR_MERCHANTS_MAP, label: "Repair merchants" },
        ])}
      </Card.Content>
    </Card.Root>
  </section>

  <section id="halloween" class="space-y-4">
    {@render seasonHeading("halloween")}
    <Card.Root class="bg-muted/30">
      <Card.Header><Card.Title>Spawns</Card.Title></Card.Header>
      <Card.Content class="space-y-4 text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD,EventTimeSpawn,EventTimeDespawn,IsHourBetween — Halloween spawns are night-only, a game day is 3600 real seconds, and monsters despawn outside their hours when out of combat. -->
        <p>
          {#each data.monsters as monster, i (monster.id)}{i ? " and " : ""}<a
              href="/monsters/{monster.id}"
              class={LINK}>{monster.name}</a
            >{/each} spawn from {night.from} to {night.to} game time, which is {night.minutes}
          real minutes in every hour. At {night.to} they despawn once out of combat.
        </p>
        <table class={TABLE}>
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
        {@render mapLinks(
          data.monsters.map((monster) => ({
            href: mapHref(monster.id, "monster"),
            label: monster.name,
          })),
        )}
      </Card.Content>
    </Card.Root>

    <Card.Root class="bg-muted/30">
      <Card.Header><Card.Title>Drops</Card.Title></Card.Header>
      <Card.Content class="space-y-4 text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:OnDeath — seasonal monsters roll their configured item drops once per kill. -->
        <table class={TABLE}>
          <thead
            ><tr class="border-b"
              ><th class="text-left font-medium text-foreground">Token</th
              >{#each data.monsters as monster (monster.id)}<th
                  class="text-right font-medium text-foreground"
                  >{monster.name}</th
                >{/each}</tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each tokenDrops as drop (drop.item_id)}
              <tr class="border-b last:border-0">
                <td>{@render itemLink(drop.item_id)}</td>
                {#each data.monsters as monster (monster.id)}
                  {@const chance = drop.chances[monster.id]}
                  <td class="text-right tabular-nums text-foreground">
                    {#if chance === undefined}—{:else}{percent(chance)}{/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
        <h3 class="pt-2 text-sm font-semibold text-foreground">
          Costume pieces
        </h3>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each costumeSets as set (set.monster.id)}
            <div class="space-y-3 rounded-lg border p-3">
              <div>
                <p class="font-medium text-foreground">{set.monster.name}</p>
                {#if set.chance !== null}<p class="text-sm">
                    {percent(set.chance)} each per kill
                  </p>{/if}
              </div>
              <ul class="space-y-2">
                {#each set.pieces as piece (piece.item_id)}
                  <li class="flex items-center justify-between gap-3">
                    {@render itemLink(piece.item_id)}
                    {#if set.chance === null}<span
                        class="text-sm tabular-nums text-foreground"
                        >{percent(piece.chances[set.monster.id])}</span
                      >{/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
    {@render treats("halloween")}
  </section>

  <section id="winter-festival" class="space-y-4">
    {@render seasonHeading("christmas")}
    {#each data.npcs as npc (npc.id)}
      <Card.Root class="bg-muted/30">
        <Card.Header><Card.Title>{npc.name}'s quests</Card.Title></Card.Header>
        <Card.Content class="space-y-4 text-muted-foreground">
          <!-- Source: server-scripts/Npc.cs:Start,UpdateServer_IDLE,UpdateServer_DEAD — Santa is available only during the Winter Festival. -->
          <!-- Source: server-scripts/PlayerQuests.cs:CanAcceptInternal — repeatable quests can be accepted again eight hours after completion. -->
          <p>
            {npc.name} offers these quests in {npc.zone_name}. You can accept
            each again 8 hours after completing it.
          </p>
          {@render mapLinks([
            { href: mapHref(npc.id, "npc"), label: npc.name },
          ])}
          <div class="grid gap-3">
            <!-- Source: server-scripts/PlayerQuests.cs:UserCode_CmdComplete__NetworkIdentity__Int32; server-scripts/KillQuest.cs:IsFulfilled; server-scripts/GatherInventoryQuest.cs:IsFulfilled — quests use their configured objectives and award shared and class-specific rewards on completion. -->
            {#each data.quests as quest (quest.id)}
              <article
                class="grid gap-x-6 gap-y-4 rounded-lg border p-5 sm:grid-cols-[1fr_15rem]"
              >
                <div class="min-w-0 space-y-3">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 class="font-semibold">
                      <EntityLink href="/quests/{quest.id}" name={quest.name} />
                    </h3>
                    <MapLink entityId={quest.id} entityType="quest" compact />
                  </div>
                  <dl
                    class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm"
                  >
                    <dt>Objective</dt>
                    <dd class="text-foreground">
                      {#if "text" in quest.objective}{quest.objective
                          .text}{:else}{quest.objective.verb}
                        <EntityLink
                          href={quest.objective.href}
                          name={quest.objective.name}
                        />
                        ×{quest.objective.amount}{/if}
                    </dd>
                    <dt>Where</dt>
                    <dd class="text-foreground">
                      {#each quest.zones as zone, i (zone.id)}{i
                          ? " and "
                          : ""}<EntityLink
                          href="/zones/{zone.id}"
                          name={zone.name}
                        />{/each}
                    </dd>
                    <dt>Turn in</dt>
                    <dd class="text-foreground">
                      <EntityLink
                        href="/npcs/{quest.completer_id}"
                        name={quest.completer_name}
                      />
                    </dd>
                  </dl>
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
</div>
