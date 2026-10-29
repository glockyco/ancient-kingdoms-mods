<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import ClipboardList from "@lucide/svelte/icons/clipboard-list";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Swords from "@lucide/svelte/icons/swords";
  import TimerOff from "@lucide/svelte/icons/timer-off";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import type { Component } from "svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import {
    hostsHerbRequests,
    hostsOreRequests,
    huntPlayers,
    needsLevel35Player,
  } from "$lib/data/regional-events";
  import { formatNumber, formatRange } from "$lib/utils/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const standardRegions = $derived(
    data.regions.filter((region) => !needsLevel35Player(region.zone_number)),
  );

  // Source: server-scripts/RegionalEventText.cs:30-40 — the six activity titles.
  const EVENTS = [
    { name: "The Apothecaries' Call", counts: "Each plant you gather." },
    { name: "Fires of the Forge", counts: "Each ore you mine." },
    { name: "The Fishers' Request", counts: "Each fish you catch." },
    {
      name: "A Regional Hunt",
      counts:
        "Each requested animal you help kill, if you are nearby when it dies.",
    },
    {
      name: "Cook for [city]",
      counts:
        "Each of the city's dishes you cook at an oven in the city, at any quality.",
    },
    {
      name: "Defend [city]",
      counts: "Each invader you help kill, if you are nearby when it dies.",
    },
  ];

  // Source: server-scripts/RegionalEventProgress.cs:38-60; RegionalEvents.cs:559 — an invasion waits 1200 seconds for a player, then its attack runs 600 seconds. Neither is a server setting.
  const INVASION_WARNING_MINUTES = 20;
  const INVASION_ATTACK_MINUTES = 10;

  type StageTone = "neutral" | "warning" | "danger" | "success";

  interface EventStage {
    name: string;
    icon: Component;
    tone: StageTone;
    minutes: number;
    /** The stage ends early when its goal or trigger is reached. */
    upTo: boolean;
    text: string;
  }

  const MARKER_TONES: Record<StageTone, string> = {
    neutral: "bg-muted text-foreground ring-border",
    warning:
      "bg-amber-500/15 text-amber-700 ring-amber-500/40 dark:text-amber-400",
    danger: "bg-red-500/15 text-red-700 ring-red-500/40 dark:text-red-400",
    success:
      "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:text-emerald-400",
  };

  const prosperityStage = $derived<EventStage>({
    name: "Prosperity",
    icon: Sparkles,
    tone: "success",
    minutes: data.settings.prosperity_duration_minutes,
    upTo: false,
    text: "Helpers get their reward. The whole region gets bonus XP.",
  });

  const eventLanes = $derived<{ title: string; stages: EventStage[] }[]>([
    {
      title: "Supply, hunting, and cooking requests",
      stages: [
        {
          name: "Request",
          icon: ClipboardList,
          tone: "neutral",
          minutes: data.settings.activity_duration_minutes,
          upTo: true,
          text: "Gather, fish, hunt, or cook until the goal is reached.",
        },
        prosperityStage,
      ],
    },
    {
      title: "City invasions",
      stages: [
        {
          name: "Warning",
          icon: TriangleAlert,
          tone: "warning",
          minutes: INVASION_WARNING_MINUTES,
          upTo: true,
          text: "No invaders yet. A level 35 or higher player entering the region starts the attack.",
        },
        {
          name: "Attack",
          icon: Swords,
          tone: "danger",
          minutes: INVASION_ATTACK_MINUTES,
          upTo: true,
          text: "Invaders attack the city in waves until the goal is reached.",
        },
        prosperityStage,
      ],
    },
  ]);
</script>

{#snippet hosts(available: boolean)}
  <td class="p-3 text-center">
    {#if available}
      <Check class="inline size-4 text-emerald-500" aria-label="Yes" />
    {:else}
      <span aria-label="No">—</span>
    {/if}
  </td>
{/snippet}

<Seo
  title="Regional Event Mechanics - Ancient Kingdoms"
  description="Regional events (Dynamic Events) in Ancient Kingdoms: objectives, contribution rewards, city invasions, and the Prosperity experience bonus."
  path="/mechanics/regional-events"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Regional Events" },
    ]}
  />

  <h1 class="text-4xl font-bold">Regional Event Mechanics</h1>
  <!-- Source: server-scripts/UIQuestTracking.cs:LateUpdate; server-scripts/RegionalEventText.cs:TrackingSummary — while a player is in the event's region, quest tracking shows the objective, progress, contribution and time left. -->
  <p class="text-muted-foreground">
    Regional events, also called Dynamic Events, ask everyone in a region for
    help: gather supplies, hunt, cook, or defend a city from invaders. While you
    are in the region, your quest tracker shows the goal, your progress, and the
    time left. Help at least 3 times to earn a reward, and the whole region
    prospers when the goal is reached.
  </p>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/regional-events"]} />

  <Card.Root id="availability" class="bg-muted/30">
    <Card.Header>
      <Card.Title>When events happen</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEvents.cs:120-125,377-432 — checks start 300 seconds after server start and repeat every 1800 seconds, with a 30% roll if connected players exist and no event is active or waiting. -->
      <p>
        Every 30 minutes there is a 30% chance that an event starts, as long as
        someone is online and no other event is running. The first chance comes
        5 minutes after the world starts.
      </p>
      <!-- Source: server-scripts/RegionalEvents.cs:497-542 — zones 1 through 5 are candidates unless occupied by the current event or Prosperity. Northern Wastes requires an online level 35 player and an invasion definition. -->
      <p>
        Events take place in
        {#each standardRegions as region, i (region.zone_id)}{#if i > 0}{i ===
            standardRegions.length - 1
              ? ", and "
              : ", "}{/if}<a
            href="/zones/{region.zone_id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{region.zone_name}</a
          >{/each}. Events in the
        <a
          href="/zones/northern_wastes"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Northern Wastes</a
        >
        and city invasions only happen while a level 35 or higher player is online.
        The same region never gets two events in a row, and a region gets no event
        while it prospers.
      </p>
      <!-- Source: server-scripts/RegionalEvents.cs:433-440,536-559; server-scripts/RegionalEventProgress.cs:38-60 — ordinary requests use the configured activity duration. Invasions wait 1200 seconds for a living level 35 participant in the region, then run for 600 seconds. -->
      <!-- Source: server-scripts/RegionalEventSettings.cs:6-10 — enabled state and activity and Prosperity durations are configured settings. -->
      <!-- Source: server-scripts/RegionalInvasions.cs:Tick; RegionalEvents.cs:433-442; RegionalEventProgress.cs:38-60,116-136 — no invaders spawn before the invasion starts. A living level 35 participant in the zone starts it, and an unstarted invasion expires after 1200 seconds. -->
      <!-- Source: server-scripts/RegionalEventProgress.cs:84-113,117-154; server-scripts/RegionalEventText.cs:Notice — reaching the goal starts Prosperity at once. An expired event pays nothing and has no penalty. -->
      <div class="space-y-6 pt-2">
        <h3 class="font-semibold text-foreground">How an event runs</h3>
        <div class="space-y-8">
          {#each eventLanes as lane (lane.title)}
            <section
              class="lg:grid lg:grid-cols-[12rem_repeat(3,minmax(0,1fr))]"
            >
              <h4
                class="mb-4 text-sm font-semibold text-foreground lg:mb-0 lg:pt-2 lg:pr-6"
              >
                {lane.title}
              </h4>
              <ol class="lg:col-span-3 lg:grid lg:grid-cols-3">
                {#each lane.stages as stage, i (stage.name)}
                  <li
                    class="relative flex gap-4 pb-6 last:pb-0 lg:block lg:pr-6 lg:pb-0"
                  >
                    {#if i < lane.stages.length - 1}
                      <!-- Connector to the next stage: vertical below the marker when stacked, horizontal beside it in columns. -->
                      <span
                        aria-hidden="true"
                        class="absolute top-11 bottom-2 left-[1.125rem] w-px bg-muted-foreground/40 lg:top-[1.125rem] lg:right-3 lg:bottom-auto lg:left-12 lg:h-px lg:w-auto"
                      ></span>
                    {/if}
                    <span
                      class="flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset {MARKER_TONES[
                        stage.tone
                      ]}"
                    >
                      <stage.icon class="size-4" aria-hidden="true" />
                    </span>
                    <div class="min-w-0 pt-1.5 lg:mt-3 lg:pt-0">
                      <p class="flex flex-wrap items-baseline gap-x-2">
                        <span class="font-semibold text-foreground"
                          >{stage.name}</span
                        >
                        <span class="text-sm tabular-nums"
                          >{stage.upTo ? "up to " : ""}{formatNumber(
                            stage.minutes,
                          )} min</span
                        >
                      </p>
                      <p class="mt-1 text-sm leading-relaxed">{stage.text}</p>
                    </div>
                  </li>
                {/each}
              </ol>
            </section>
          {/each}
        </div>
        <!-- Source: server-scripts/RegionalInvasions.cs:FailIfCityDefeated; server-scripts/RegionalEventProgress.cs:FailInvasion — an active invasion fails as soon as every townsperson in the city is dead. -->
        <p class="flex items-start gap-2 text-sm">
          <TimerOff class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          If a stage runs out of time, the event ends with no reward and no penalty.
          An invasion also fails at once if every townsperson in the city dies.
        </p>
      </div>
      {#if !data.settings.enabled}
        <p>Regional events are switched off in the exported server settings.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="activities" class="bg-muted/30">
    <Card.Header>
      <Card.Title>What to do</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventText.cs:30-40 — the six activity titles. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Event</th
              ><th class="p-3 text-left font-medium text-foreground"
                >What counts</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each EVENTS as event (event.name)}
              <tr class="border-b last:border-0">
                <td class="p-3 font-medium text-foreground sm:whitespace-nowrap"
                  >{event.name}</td
                >
                <td class="p-3">{event.counts}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/RegionalEventProgress.cs:84-114; server-scripts/RegionalEvents.cs:RecordInvasionKill — each distinct action advances the goal once and can credit multiple hunters. Invader deaths advance the goal even without a credited player. -->
      <!-- Source: server-scripts/RegionalEvents.cs:251-258; RegionalEventActivities.cs:54,150,258 — quest items do not count for gathering, fishing or cooking. -->
      <!-- Source: server-scripts/RegionalEventText.cs:81-90 — players keep gathered resources, fish and cooked dishes. -->
      <p>
        All players in the region work toward the same goal. A kill counts for
        everyone who helped. Invaders killed by townsfolk also count. Quest
        items do not count. You keep what you gather, catch, and cook.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="regions" class="bg-muted/30">
    <Card.Header><Card.Title>Events by region</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEvents.cs:243-257,270-306,536-551 — gathering uses 5 yd, hunting uses 40 yd, fishing and cooking use 2.5 yd from the activity collider. Herbs exclude Northern Wastes. Ore uses zones 2, 3 and 5. -->
      <!-- Source: server-scripts/RegionalEventActivities.cs:Discover — fishing needs valid spots and fish, and cooking needs city ovens and dishes made from the city's animal meat. -->
      <!-- Source: server-scripts/RegionalEventActivities.cs:60-82 — a hunt animal needs at least three always-respawning spawns, each supplying 1 + floor(half the event duration / (respawn + corpse time)) kills, summing to at least the goal. -->
      <p>
        A hunt asks for one of the region's animals. The game only picks an
        animal whose spawns can supply the whole goal in half the event's time.
        More players in the region raise the goal, so some animals are only
        picked when fewer players are there.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Region</th
              ><th class="p-3 text-center font-medium text-foreground"
                >Plants</th
              ><th class="p-3 text-center font-medium text-foreground">Ore</th
              ><th class="p-3 text-center font-medium text-foreground">Fish</th
              ><th class="p-3 text-left font-medium text-foreground">Hunt</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Cook and defend</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each data.regions as region (region.zone_id)}
              <tr class="border-b last:border-0">
                <td class="p-3"
                  ><a
                    href="/zones/{region.zone_id}"
                    class="whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
                    >{region.zone_name}</a
                  >{#if needsLevel35Player(region.zone_number)}<span
                      class="block text-xs"
                      >Needs a level 35 or higher player online</span
                    >{/if}</td
                >
                {@render hosts(hostsHerbRequests(region.zone_number))}
                {@render hosts(hostsOreRequests(region.zone_number))}
                {@render hosts(Boolean(region.fishing))}
                <td class="p-3">
                  {#each data.huntTargets.filter((target) => target.region_zone_id === region.zone_id) as target (target.monster_id)}
                    {@const players = huntPlayers(target.max_players)}
                    <span class="block whitespace-nowrap"
                      ><a
                        href="/monsters/{target.monster_id}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                        >{target.monster_name}</a
                      >{#if players}<span class="ml-1 text-xs">({players})</span
                        >{/if}</span
                    >
                  {/each}
                </td>
                <td class="p-3 whitespace-nowrap"
                  >{#if region.cooking_city_name}<a
                      href="#invasion-{region.cooking_city}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                      >{region.cooking_city_name}</a
                    >{:else}—{/if}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="rewards" class="bg-muted/30">
    <Card.Header><Card.Title>Goals and rewards</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventProgress.cs:38-48; server-scripts/RegionalEvents.cs:220-227,527-559 — goals count living, connected players in the chosen region at event creation, with at most four extra participants. -->
      <p>
        The goal depends on how many players are in the region when the event
        starts, up to 5. Players who arrive later do not change it.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-md border bg-muted/30 p-4">
          <h3 class="font-semibold text-foreground">
            Supply, hunting, and cooking requests
          </h3>
          <p>12 actions, plus 3 for each extra player (12 - 24)</p>
        </div>
        <div class="rounded-md border bg-muted/30 p-4">
          <h3 class="font-semibold text-foreground">City invasions</h3>
          <p>60 invaders, plus 10 for each extra player (60 - 100)</p>
        </div>
      </div>
      <!-- Source: server-scripts/RegionalEventProgress.cs:84-113,139-154; server-scripts/RegionalEvents.cs:316-344 — three contributions qualify for rewards, computed from the first contribution's level and XP requirement, and only connected players in the region at completion receive them. -->
      <!-- Source: server-scripts/RegionalEvents.cs:TickServer; server-scripts/Experience.cs:current — the quarter-level reward is added to the experience pool, which becomes Veteran XP at level 50. -->
      <p>
        Help at least 3 times and be in the region when the goal is reached. You
        get 20 + 10 × your level in gold (520 at level 50) and 25% of a full
        level's XP. At level 50 this is Veteran XP.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="prosperity" class="bg-muted/30">
    <Card.Header><Card.Title>Prosperity</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventProgress.cs:109-113,157-164; server-scripts/RegionalEvents.cs:188-195,363-375 — completion grants a regional 15% XP multiplier, floored, with dungeon combat mapped to its parent region. -->
      <!-- Source: server-scripts/PlayerQuests.cs:388-401; server-scripts/Player.cs:13452-13455,13861-13874,14178-14180,14176-14180; server-scripts/Npc.cs:1608-1616,1641-1649 — quest, discovery, crafting and NPC kill XP bypass the Prosperity multiplier. -->
      <p>
        When the goal is reached, the region prospers for
        {formatNumber(data.settings.prosperity_duration_minutes)} minutes. Everyone
        in the region gets 15% more XP from monsters, including in its dungeons, and
        from gathering and fishing outside dungeons. Players who did not help get
        the bonus too. Quests, crafting, exploring, and NPC kills get no bonus.
      </p>
      <p>
        See <MechanicsLink section="experience">Experience</MechanicsLink> for how
        the bonus combines with Double XP.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="invasions" class="bg-muted/30">
    <Card.Header><Card.Title>City invasions</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalInvasions.cs:Tick — invaders cycle through the configured attacker list, use the configured level range and health multiplier, and keep only their first skill. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">City</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Invader level</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Invader health</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Invaders</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Cooking request</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each data.invasions as invasion (invasion.id)}
              <tr
                id="invasion-{invasion.city}"
                class="scroll-mt-20 border-b last:border-0"
              >
                <td class="p-3"
                  ><span class="block font-medium text-foreground"
                    >{invasion.city_name}</span
                  ><a
                    href="/zones/{invasion.zone_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{invasion.zone_name}</a
                  ></td
                >
                <td class="p-3 whitespace-nowrap"
                  >{formatRange(
                    invasion.minimum_level,
                    invasion.maximum_level,
                  )}</td
                >
                <td class="p-3 whitespace-nowrap"
                  >{invasion.health_multiplier === 1
                    ? "Normal"
                    : `${invasion.health_multiplier} × normal`}</td
                >
                <td class="p-3"
                  ><ul class="space-y-1">
                    {#each invasion.attackers as attacker (attacker.ordinal)}<li
                      >
                        <EntityLink
                          href="/monsters/{attacker.monster_id}"
                          name={attacker.monster_name}
                        />
                      </li>{/each}
                  </ul></td
                >
                <td class="p-3"
                  >{#if invasion.cookingDishes.length > 0}<ul class="space-y-1">
                      {#each invasion.cookingDishes as dish (dish.item_id)}<li>
                          <EntityLink
                            href="/items/{dish.item_id}"
                            name={dish.item_name}
                          />
                        </li>{/each}
                    </ul>{:else}None{/if}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/RegionalInvasions.cs:Tick — waves contain up to eight attackers every 20 seconds, at most 24 live attackers, and no gold, item drops or faction changes. -->
      <!-- Source: server-scripts/RegionalInvasions.cs:183-196,217-246 — invaders deal ten times damage to city citizens, take a tenth from them with a minimum of one damage, and only attack participating players inside the city. -->
      <p>
        Invaders arrive in waves of up to 8 every 20 seconds, with at most 24 at
        once. They attack the townsfolk and leave you alone until you hit them.
        They only use their basic attack. They drop no loot or gold, and killing
        them does not change your reputation.
      </p>
      <!-- Source: server-scripts/Npc.cs:1505-1510 — a citizen killed by a regional invader respawns 900 seconds after death. -->
      <p>
        Invaders deal 10 times their normal damage to townsfolk. Townsfolk deal
        only a tenth of their normal damage to invaders. A townsperson killed by
        an invader comes back after 15 minutes.
      </p>
    </Card.Content>
  </Card.Root>
</div>
