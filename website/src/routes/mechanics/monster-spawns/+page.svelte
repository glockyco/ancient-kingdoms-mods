<script lang="ts">
  import {
    formatDuration,
    formatNumber,
    formatPercent,
    formatRange,
  } from "$lib/utils/format";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    rareSpawnOdds,
    rareSpawnWait,
  } from "$lib/calculation/monster-spawns";
  import type {
    BossRespawn,
    RareSpawn,
    RespawnMechanicsPageData,
    SpawnWindowMonster,
  } from "./+page.server";

  let { data }: { data: RespawnMechanicsPageData } = $props();

  const bossTiers = $derived.by(() => {
    const tiers: [number, BossRespawn[]][] = [];
    for (const boss of data.bosses) {
      const tier = tiers.find(([time]) => time === boss.respawn_time);
      if (tier) {
        tier[1].push(boss);
      } else {
        tiers.push([boss.respawn_time, [boss]]);
      }
    }
    return tiers;
  });

  // Cumulative odds for the renewal-cycling table. Every spawn chance that
  // occurs in the rare spawn data (distinct respawn_probability values).
  const RARE_ROLL_CHANCES = [0.2, 0.25, 0.4, 0.5, 0.6, 0.7, 0.75];
  const RARE_ROLL_COUNTS = [1, 2, 3, 5, 10];

  function cumulativeRollChance(chance: number, rolls: number): string {
    const percent = (1 - Math.pow(1 - chance, rolls)) * 100;
    return percent > 99
      ? ">99%"
      : formatPercent(percent / 100, { decimals: 0 });
  }

  // Source: server-scripts/Monster.cs:UpdateServer_DEAD; SummonMonster.cs:Update — summon rolls also require the fixed guard group's readiness.
  function formatAverageWait(rare: RareSpawn): string {
    if (rare.is_summonable) return "Depends on guards";
    const seconds = rare.respawn_time / rare.respawn_probability;
    return formatDuration(Math.round(seconds / 60) * 60);
  }

  function formatGameHour(hour: number): string {
    return `${hour}:00`;
  }

  // Source: server-scripts/Monster.cs:UpdateServer_DEAD,EventTimeSpawn — chance, guard readiness and game-time windows can delay respawn.
  /** The notes after a boss's level in the respawn list, each linking where it is explained. */
  function bossNotes(boss: BossRespawn): { text: string; href?: string }[] {
    return [
      ...(boss.respawn_probability < 1
        ? [
            {
              text: `${formatPercent(boss.respawn_probability, { decimals: 0 })} spawn chance`,
            },
          ]
        : []),
      ...(boss.is_summonable
        ? [{ text: "guards must die", href: "#summons" }]
        : []),
      ...(boss.spawn_time_start !== 0 || boss.spawn_time_end !== 0
        ? [
            {
              text: formatRange(
                formatGameHour(boss.spawn_time_start),
                formatGameHour(boss.spawn_time_end),
              ),
              href: "#spawn-windows",
            },
          ]
        : []),
    ];
  }

  // Guard timelines for the summon example schedules. killedAt is the kill
  // moment as % of the 12-minute axis. Guards stay dead 8 minutes (66.7%).
  const slowClearGuards = [
    { label: "Guard 1", killedAt: 0 },
    { label: "Guard 2", killedAt: 16.7 },
    { label: "Guard 3", killedAt: 33.3 },
    { label: "Guard 4", killedAt: 50 },
    { label: "Guard 5", killedAt: 75 },
  ];
  const fastClearGuards = [
    { label: "Guard 1", killedAt: 0 },
    { label: "Guard 2", killedAt: 8.3 },
    { label: "Guard 3", killedAt: 16.7 },
    { label: "Guard 4", killedAt: 25 },
    { label: "Guard 5", killedAt: 33.3 },
  ];

  function formatWindowRealTime(monster: SpawnWindowMonster): string {
    const gameHours =
      (monster.spawn_time_end - monster.spawn_time_start + 24) % 24;
    return `${gameHours * 2.5} minutes of every hour`;
  }
</script>

<Seo
  title="Monster Spawns - Ancient Kingdoms"
  description="Monster spawning in Ancient Kingdoms: respawn times, rare spawns, dungeon renewals, day- and night-only monsters, kill-triggered summons, and zone resets."
  path="/mechanics/monster-spawns"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Monster Spawns" },
    ]}
  />

  <h1 class="text-4xl font-bold">Monster Spawns</h1>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/monster-spawns"]} />

  <Card.Root id="cycle" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The respawn cycle</Card.Title>
      <Card.Description>
        Most monsters return at full Hit Points 8 minutes after a kill: 2
        minutes of corpse time followed by a 6-minute respawn timer.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: website/data/compendium.db monsters table — most common configuration is death_time 120 with respawn_time 360. -->
      <div class="text-sm">
        <div
          class="grid grid-cols-4 overflow-hidden rounded border border-border text-center"
        >
          <div class="min-w-0 border-r border-border bg-red-500/10 px-2 py-2">
            <span class="block truncate font-medium text-foreground"
              >Corpse</span
            >
            <span class="block truncate">lootable · {formatDuration(120)}</span>
          </div>
          <div class="col-span-3 min-w-0 bg-muted/50 px-2 py-2">
            <span class="block truncate font-medium text-foreground"
              >Waiting to respawn</span
            >
            <span class="block truncate"
              >respawn timer · {formatDuration(360)}</span
            >
          </div>
        </div>
        <div class="grid grid-cols-4 pt-1 font-mono">
          <div class="flex justify-between">
            <span>Kill<br />0:00</span>
            <span class="translate-x-1/2 text-center">2:00</span>
          </div>
          <div class="col-span-3 text-right">Respawn<br />8:00</div>
        </div>
      </div>

      <!-- Source: server-scripts/Monster.cs:EventDeathNoLoot,OnDeath — empty corpses disappear after at least 1 second, without changing the respawn deadline. -->
      <p>
        Empty corpses disappear after at least 1 second. Looting does not
        shorten the respawn wait.
      </p>
      <p>
        <!-- Source: server-scripts/Monster.cs:OnDeath; website/data/compendium.db:monsters — respawn timers exclude corpse time; respawning enemies excluding Dummy: regular 40–1800 s, elites 480–7200 s, bosses 600–28800 s. -->
        <span class="block"
          >Regular monsters have respawn timers from 40 seconds to 30 minutes,
          most often 6 minutes.</span
        >
        <span class="block"
          >Elite respawn timers range from 8 minutes to 2 hours. Boss timers
          range from 10 minutes to 8 hours (<a
            href="#bosses"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >see below</a
          >).</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="empty-zones" class="bg-muted/30">
    <Card.Header>
      <Card.Title>What happens when everyone leaves?</Card.Title>
      <Card.Description>
        Loot left on corpses is lost. Living monsters reset when someone
        returns.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <p>
        <!-- Source: server-scripts/ZoneInfo.cs:185-201 — zones with no online player inside are deactivated. -->
        <!-- Source: server-scripts/Player.cs:UpdateServer_DEAD; Player.cs:11457,13492; NetworkManagerMMO.cs:DoServerDisconnect — zone cleanup runs 5 seconds after respawn, portal travel, or resurrection and on disconnect. -->
        The zone switches off about 5 seconds after the last player leaves, or at
        once when the last player logs out.
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li>
          <!-- Source: server-scripts/Monster.cs:OnDisable — on zone deactivation dead monsters are hidden, warped home, and their corpse deadline is set to now. -->
          Corpses are removed the moment the zone shuts down. Loot you left on a corpse
          is gone when you come back.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:OnEnable — on zone reactivation living monsters warp to start position, heal to full, and clear target, aggro, pets, and debuffs. -->
          <span class="block"
            >When someone returns, living monsters move back to their original
            locations with full Hit Points.</span
          >
          <span class="block"
            >They forget their targets, lose harmful effects, and dismiss their
            summoned pets.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:960-967 and Entity.cs:225-233 — respawn deadlines are absolute server timestamps, but the state machine that acts on them only runs while the zone object is active. -->
          Respawn timers keep running while the zone is empty. Monsters whose timers
          have ended return when someone enters.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="bosses" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Boss respawn timers</Card.Title>
      <Card.Description>
        Boss and elite respawn timers keep running through server restarts.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Source: server-scripts/Monster.cs:Start,SetRespawnBosses -->
      <div class="overflow-x-auto text-sm text-muted-foreground">
        <table class="w-full border-collapse">
          <caption class="mb-2 text-left font-medium text-foreground">
            After a server restart
          </caption>
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="py-2 pr-4 text-left font-medium"
                >Monster</th
              >
              <th scope="col" class="py-2 text-left font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {#each [["Boss or elite with time left on its timer", "Waits for the rest, at most one full respawn timer."], ["Rare boss or elite whose timer has ended", "Stays hidden for one full respawn timer, then rolls its spawn chance."], ["Regular monster", "Starts alive."], ["Regular rare monster", "Rolls its spawn chance."], ["Summoned or Halloween monster", "Starts hidden."]] as row (row[0])}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <th scope="row" class="py-2 pr-4 text-left font-medium"
                  >{row[0]}</th
                >
                <td class="py-2">{row[1]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:OnDeath; website/data/compendium.db:monsters — boss corpse periods are 300 s, except Var'noth and Velkrax 120 s and Embermaw 60 s. -->
          A boss's earliest return is its listed timer plus its corpse time: 5 minutes
          for most bosses, 2 minutes for Var'noth and Velkrax, and 1 minute for Embermaw.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:UserCode_CmdResetDungeon__Int32__Int64; Monster.cs:UpdateServer_DEAD — renewal clears saved and active deadlines without bypassing guards, chance or spawn windows. -->
          You can pay a Renewal Sage to end a dungeon boss's respawn timer. Renewal
          does not kill its guards, guarantee its spawn roll, or let it appear outside
          its game-time window. See
          <a
            href="#renewal-sages"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Renewal Sages</a
          >.
        </li>
      </ul>

      <div class="space-y-3 text-sm">
        <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD,EventTimeSpawn — chance, summon guards and game-time windows still gate a due boss respawn. -->
        {#each bossTiers as [respawnTime, bosses] (respawnTime)}
          <div class="flex gap-4">
            <div class="w-14 shrink-0 pt-px text-right font-mono">
              {formatDuration(respawnTime)}
            </div>
            <div
              class="flex min-w-0 flex-wrap gap-x-1.5 gap-y-0.5 border-l border-border pl-4"
            >
              {#each bosses as boss, i (boss.id)}
                <span class="max-w-full"
                  ><a
                    href="/monsters/{boss.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{boss.name}</a
                  >
                  <span class="text-muted-foreground">({boss.level})</span
                  >{#each bossNotes(boss) as note (note.text)}<span
                      aria-hidden="true"
                      class="mx-1">·</span
                    >{#if note.href}<a
                        href={note.href}
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >{note.text}</a
                      >{:else}<span class="text-muted-foreground"
                        >{note.text}</span
                      >{/if}{/each}{i < bosses.length - 1 ? "," : ""}</span
                >
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="missing-boss" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Why a boss is absent</Card.Title>
    </Card.Header>
    <Card.Content class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="py-2 pr-4 text-left font-medium">Why it is absent</th>
            <th class="py-2 text-left font-medium">Where to check</th>
          </tr>
        </thead>
        <tbody class="text-muted-foreground">
          <!-- Source: server-scripts/Monster.cs:2930-2940,786-796 — a dead boss waits for its saved respawn deadline. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its respawn timer has not ended.</td>
            <td class="py-2"
              ><a href="#bosses" class="underline hover:text-foreground"
                >Boss Respawn Timers</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:2252-2255 — respawn waits for the configured in-game time window. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its spawn window is closed.</td>
            <td class="py-2"
              ><a href="#spawn-windows" class="underline hover:text-foreground"
                >Day and Night Spawns</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:2240-2246 — a failed appearance roll hides the monster and re-arms the timer. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its rare-spawn roll failed.</td>
            <td class="py-2"
              ><a href="#rare-spawns" class="underline hover:text-foreground"
                >Rare Spawns</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:SetRespawnBosses — rare bosses wait a new full interval after restart when their saved timer is already due. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4"
              >It is a rare boss waiting for its first roll after a server
              restart.</td
            >
            <td class="py-2"
              ><a
                href="#bosses"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Boss Respawn Timers</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/SummonMonster.cs:Update,AreAllPlaceholdersDead — after the summon dies the game must observe a living guard followed by the whole fixed group dead together. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its guards need to be killed again.</td>
            <td class="py-2"
              ><a href="#summons" class="underline hover:text-foreground"
                >Kill-Triggered Summons</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:1636-1651,1793-1810 — a monster can return home and reset health rather than die. -->
          <tr>
            <td class="py-2 pr-4"
              >It chased too far, returned home, and reset to full Hit Points.</td
            >
            <td class="py-2"
              ><a href="#leashing" class="underline hover:text-foreground"
                >Chase Limits and Resets</a
              ></td
            >
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <Card.Root id="rare-spawns" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Rare spawns</Card.Title>
      <Card.Description>
        When a rare monster's respawn timer ends, it appears only if its
        spawn-chance roll succeeds.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:2242-2247 — a failed spawn roll keeps the monster hidden and re-arms the timer for another full interval. -->
        <!-- Source: server-scripts/Monster.cs:Start,SetRespawnBosses — regular rares can roll at server start; rare bosses and elites instead wait for a timer. -->
        A failed roll means another full interval of waiting. If the zone is empty
        when a roll is due, it waits for someone to enter. Missed rolls do not accumulate.
      </p>

      <div class="space-y-4 text-sm">
        <p class="font-medium text-foreground">
          <!-- Source: server-scripts/Monster.cs:OnDeath — the first roll deadline includes corpse time; this axis starts after that period. -->
          Example: a 20-minute roll interval and a 2-minute corpse period. The timeline
          starts 2 minutes after the kill.
        </p>

        <div>
          <p class="mb-1 text-muted-foreground">You camp the spot</p>
          <div class="flex h-9 overflow-hidden rounded border border-border">
            <div
              class="flex w-[48%] items-center justify-center bg-emerald-500/30"
            >
              <span class="truncate px-1">in zone</span>
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex flex-1 items-center justify-center bg-emerald-500/30"
            >
              <span class="truncate px-1">in zone</span>
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
          </div>
          <div
            class="relative mt-1 h-5 font-mono whitespace-nowrap text-muted-foreground"
          >
            <span class="absolute left-0">0</span>
            <span class="absolute left-[48%] -translate-x-1/2">20</span>
            <span class="absolute right-0">{formatDuration(2400)}</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            The roll happens at 20 and 40 minutes, once per interval.
          </p>
        </div>

        <div>
          <p class="mb-1 text-muted-foreground">
            You leave, but are back before the timer ends
          </p>
          <div class="flex h-9 overflow-hidden rounded border border-border">
            <div
              class="flex w-[12%] items-center justify-center bg-emerald-500/30"
            >
              in
            </div>
            <div class="flex w-[24%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">zone empty</span>
            </div>
            <div
              class="flex w-[12%] items-center justify-center bg-emerald-500/30"
            >
              in
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex flex-1 items-center justify-center bg-emerald-500/30"
            >
              <span class="truncate px-1">in zone</span>
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
          </div>
          <div
            class="relative mt-1 h-5 font-mono whitespace-nowrap text-muted-foreground"
          >
            <span class="absolute left-0">0</span>
            <span class="absolute left-[12%] -translate-x-1/2">5</span>
            <span class="absolute left-[36%] -translate-x-1/2">15</span>
            <span class="absolute left-[48%] -translate-x-1/2">20</span>
            <span class="absolute right-0">{formatDuration(2400)}</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            You return at 15 minutes. The roll still happens on schedule at 20
            minutes, so the empty stretch costs nothing.
          </p>
        </div>

        <div>
          <p class="mb-1 text-muted-foreground">
            You leave, and come back too late
          </p>
          <div class="flex h-9 overflow-hidden rounded border border-border">
            <div
              class="flex w-[12%] items-center justify-center bg-emerald-500/30"
            >
              in
            </div>
            <div class="flex w-[36%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">zone empty</span>
            </div>
            <div
              class="w-1 shrink-0 border-l-2 border-dashed border-muted-foreground"
            ></div>
            <div class="flex w-[24%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">zone empty</span>
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex flex-1 items-center justify-center bg-emerald-500/30"
            >
              <span class="truncate px-1">in zone</span>
            </div>
          </div>
          <div
            class="relative mt-1 h-5 font-mono whitespace-nowrap text-muted-foreground"
          >
            <span class="absolute left-0">0</span>
            <span class="absolute left-[12%] -translate-x-1/2">5</span>
            <span class="absolute left-[49%] -translate-x-1/2">20</span>
            <span class="absolute left-[74%] -translate-x-1/2">30</span>
            <span class="absolute right-0">{formatDuration(2400)}</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            The timer ends at 20 minutes while the zone is empty, and nothing
            happens. The overdue roll fires at 30 minutes as you walk in. If it
            fails, the next roll is at 50 minutes.
          </p>
        </div>

        <p class="text-muted-foreground">
          <span class="mr-1 inline-block h-3 w-1 translate-y-0.5 bg-blue-500"
          ></span>
          spawn roll ·
          <span
            class="mr-1 ml-2 inline-block h-3 w-0 translate-y-0.5 border-l-2 border-dashed border-muted-foreground"
          ></span>
          timer ends with the zone empty (no roll)
        </p>
      </div>

      <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD — independent timed rolls give interval ÷ chance only when no summon guard check is required. -->
      <p class="text-sm text-muted-foreground">
        Average waits assume someone stays in the zone, exclude corpse time, and
        are rounded to the nearest minute. Summoned rares also need their guards
        dead together, so their wait cannot be predicted from the timer alone.
      </p>
      {#if data.rareSpawns[0]}
        <p class="text-sm">Average wait for {data.rareSpawns[0].name}:</p>
        <Calculation
          calculation={rareSpawnWait(
            data.rareSpawns[0].respawn_probability,
            data.rareSpawns[0].respawn_time,
          )}
        />
        <p class="text-sm text-muted-foreground">
          A single wait can be shorter or longer.
        </p>
      {/if}
      <div
        class="max-h-96 overflow-x-auto overflow-y-auto rounded border border-border/50"
      >
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                class="sticky top-0 border-b border-border bg-background py-2 pr-4 pl-2 text-left font-medium"
                >Monster</th
              >
              <th
                class="sticky top-0 border-b border-border bg-background py-2 pr-4 text-right font-medium"
                >Level</th
              >
              <th
                class="sticky top-0 border-b border-border bg-background py-2 pr-4 text-left font-medium"
                >Zone</th
              >
              <th
                class="sticky top-0 border-b border-border bg-background py-2 pr-4 text-right font-medium"
                >Roll interval</th
              >
              <th
                class="sticky top-0 border-b border-border bg-background py-2 pr-4 text-right font-medium"
                >Spawn chance</th
              >
              <th
                class="sticky top-0 border-b border-border bg-background py-2 pr-2 text-right font-medium"
                >Average wait</th
              >
            </tr>
          </thead>
          <tbody>
            {#each data.rareSpawns as rare (rare.id)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4 pl-2">
                  <a
                    href="/monsters/{rare.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{rare.name}</a
                  >
                </td>
                <td class="py-2 pr-4 text-right font-mono">{rare.level}</td>
                <td class="py-2 pr-4">
                  {#each rare.zones as zone, i (zone.id)}
                    {i > 0 ? ", " : ""}<a
                      href="/zones/{zone.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{zone.name}</a
                    >
                  {:else}Unknown{/each}
                </td>
                <td class="py-2 pr-4 text-right font-mono"
                  >{formatDuration(rare.respawn_time)}</td
                >
                <td class="py-2 pr-4 text-right font-mono"
                  >{formatPercent(rare.respawn_probability, {
                    decimals: 0,
                  })}</td
                >
                <td class="py-2 pr-2 text-right font-mono"
                  >{formatAverageWait(rare)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="renewal-sages" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Renewal Sages</Card.Title>
      <Card.Description>
        Pay a Renewal Sage outside a dungeon to make its dead monsters ready to
        respawn.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Player.cs:14727-14739 — the renewal zeroes every respawn-enabled monster deadline in the dungeon and persists cleared boss and elite deadlines. -->
          Renewal ends the wait for dead regular monsters, elites, and bosses that
          can respawn in the dungeon.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:14728-14740 — the renewal only changes respawn deadlines, leaving living monsters untouched. -->
          Living monsters are unaffected, including bosses and rares.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:14712-14725 — renewal checks every online player in the dungeon and refuses while any is inside, regardless of party; it also refuses insufficient gold. -->
          Every player must leave before renewal, including anyone outside your party.
        </li>
      </ul>
      <!-- Source: server-scripts/Player.cs:14727-14740; Portal.cs:33-63 — renewal changes monster deadlines only, while portal keys, level and item-level requirements remain checked on entry. -->
      <p class="text-sm text-muted-foreground">
        Renewal does not remove a portal's key, level, or item-level
        requirements. See <MechanicsLink section="world#portals"
          >Portals and Entry Requirements</MechanicsLink
        >.
      </p>
      <!-- Source: server-scripts/Player.cs:14728-14740; Monster.cs:2240-2260 — a zeroed respawn deadline does not bypass summon, chance, seasonal, or time-window spawn checks. -->
      <p class="text-sm text-muted-foreground">
        After renewal, summoned monsters need their guards dead together and
        rare monsters must pass their spawn roll. Monsters with limited spawn
        hours cannot appear outside those hours, and seasonal monsters need
        their event to be active.
      </p>

      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Player.cs:14728-14740 and Monster.cs:2242-2247 — a zeroed deadline triggers the spawn roll on the next zone activation; a failed roll re-arms the full interval until the next renewal zeroes it again. -->
        <span class="block"
          >Buy renewal once, then enter the dungeon to trigger one rare-spawn
          roll.</span
        >
        <span class="block"
          >Buying more renewals before entering does not add more rolls.</span
        >
        <span class="block"
          >After entering, you can leave, renew again, and re-enter for another
          roll without visiting the monster's location.</span
        >
      </p>

      <div class="space-y-4 text-sm">
        <p class="font-medium text-foreground">
          Example: cycling renewals for a rare with a 25% chance
        </p>
        <div>
          <div class="flex h-9 overflow-hidden rounded border border-border">
            <div
              class="flex w-[14%] items-center justify-center bg-emerald-500/30"
            >
              in
            </div>
            <div class="w-1 shrink-0 bg-amber-500"></div>
            <div class="flex w-[14%] items-center justify-center bg-muted/60">
              out
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex w-[14%] items-center justify-center bg-emerald-500/30"
            >
              in
            </div>
            <div class="w-1 shrink-0 bg-amber-500"></div>
            <div class="flex w-[14%] items-center justify-center bg-muted/60">
              out
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex w-[14%] items-center justify-center bg-emerald-500/30"
            >
              in
            </div>
            <div class="w-1 shrink-0 bg-amber-500"></div>
            <div class="flex w-[14%] items-center justify-center bg-muted/60">
              out
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex flex-1 items-center justify-center bg-emerald-500/30"
            >
              <span class="truncate px-1">rare up</span>
            </div>
          </div>
          <div
            class="relative mt-1 h-5 font-mono whitespace-nowrap text-muted-foreground"
          >
            <span class="absolute left-0">0</span>
            <span class="absolute left-[14.3%] -translate-x-1/2">1</span>
            <span class="absolute left-[28.6%] -translate-x-1/2">2</span>
            <span class="absolute left-[42.9%] -translate-x-1/2">3</span>
            <span class="absolute left-[57.1%] -translate-x-1/2">4</span>
            <span class="absolute left-[71.4%] -translate-x-1/2">5</span>
            <span
              class="absolute left-[85.7%] hidden -translate-x-1/2 sm:inline"
              >6</span
            >
            <span class="absolute right-0">{formatDuration(420)}</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            You kill the rare at minute 0 and step out. Each renewal ends its
            timer, so it rolls to spawn as soon as you re-enter. Every roll has
            a 25% chance. The third roll succeeds in this example, and the rare
            waits at its spawn point until you arrive. Without renewal, a failed
            roll means waiting a full interval for another chance.
          </p>
        </div>
        <p class="text-muted-foreground">
          <span class="mr-1 inline-block h-3 w-1 translate-y-0.5 bg-amber-500"
          ></span>
          renewal bought ·
          <span
            class="mr-1 ml-2 inline-block h-3 w-1 translate-y-0.5 bg-blue-500"
          ></span>
          spawn roll ·
          <span
            class="mr-1 ml-2 inline-block h-3 w-4 translate-y-0.5 rounded-sm bg-emerald-500/30"
          ></span>
          you in the dungeon
        </p>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium text-foreground">
          Chance that the rare is up after a number of rolls
        </p>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium">Rolls</th>
                {#each RARE_ROLL_CHANCES as chance (chance)}
                  <th class="py-2 text-right font-medium"
                    >{formatPercent(chance, { decimals: 0 })} chance</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each RARE_ROLL_COUNTS as rolls (rolls)}
                <tr class="border-b border-border/50 hover:bg-muted/30">
                  <td class="py-2 pr-4 font-mono">{rolls}</td>
                  {#each RARE_ROLL_CHANCES as chance (chance)}
                    <td class="py-2 text-right font-mono"
                      >{cumulativeRollChance(chance, rolls)}</td
                    >
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if data.rareSpawns[0]}
          <p class="text-sm">Odds for {data.rareSpawns[0].name}:</p>
          <Calculation
            calculation={rareSpawnOdds(data.rareSpawns[0].respawn_probability)}
          />
        {/if}
      </div>

      {#if data.renewalSages.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium">Dungeon</th>
                <th class="py-2 pr-4 text-left font-medium">Sage</th>
                <th class="py-2 text-right font-medium">Base fee</th>
              </tr>
            </thead>
            <tbody>
              {#each data.renewalSages as sage (sage.id)}
                <tr class="border-b border-border/50 hover:bg-muted/30">
                  <td class="py-2 pr-4"
                    ><a
                      href="/zones/{sage.dungeon_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{sage.dungeon_name}</a
                    ></td
                  >
                  <td class="py-2 pr-4">
                    <a
                      href="/npcs/{sage.id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                      >{sage.name}</a
                    >
                  </td>
                  <td class="py-2 text-right font-mono"
                    >{formatNumber(sage.base_fee)}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/Npc.cs:InteractNpc; UINpcTrading.cs:CalculatePurchaseItemPrice -->
        <p class="text-sm text-muted-foreground">
          Base fees are before your Charisma discount of up to 25%. See
          <MechanicsLink section="inventory#merchants">Merchants</MechanicsLink
          >.
        </p>
      {:else}
        <p class="text-sm text-muted-foreground">No Renewal Sages found.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="spawn-windows" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Day and night spawns</Card.Title>
      <Card.Description>
        Some monsters appear only during particular in-game hours.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Player.cs:LateUpdate — the minimap clock displays the current game hour and minute. -->
        <span class="block">The minimap clock shows game time.</span>
        <!-- Source: server-scripts/Monster.cs:EventTimeSpawn — game hour = ((server time % 3600) / 2.5) / 60, so one in-game day lasts exactly one real hour and one game hour lasts 2.5 real minutes. -->
        <span class="block"
          >One in-game day lasts exactly one real hour, so each game hour is 2.5
          real minutes.</span
        >
        <!-- Source: server-scripts/Monster.cs:2252-2255 — respawn is held while outside the spawn window. -->
        <!-- Source: server-scripts/Monster.cs:EventTimeDespawn; Monster.cs:1703-1707 — outside its window a monster with no aggro is hidden and warped home. -->
        <span class="block"
          >These monsters respawn only during their listed hours.</span
        >
        <span class="block"
          >Outside those hours, a monster disappears if it is no longer
          fighting.</span
        >
        <span class="block"
          >A fighting monster remains until it kills its opponent or returns
          home.</span
        >
      </p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Monster</th>
              <th class="py-2 pr-4 text-right font-medium">Level</th>
              <th class="py-2 pr-4 text-left font-medium">Zone</th>
              <th class="py-2 pr-4 text-left font-medium whitespace-nowrap"
                >Window (game time)</th
              >
              <th class="py-2 text-right font-medium whitespace-nowrap"
                >Available (real time)</th
              >
            </tr>
          </thead>
          <tbody>
            {#each data.spawnWindowMonsters as monster (monster.id)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4">
                  <a
                    href="/monsters/{monster.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{monster.name}</a
                  >
                </td>
                <td class="py-2 pr-4 text-right font-mono">{monster.level}</td>
                <td class="py-2 pr-4">
                  {#each monster.zones as zone, i (zone.id)}
                    {i > 0 ? ", " : ""}<a
                      href="/zones/{zone.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{zone.name}</a
                    >
                  {:else}Unknown{/each}
                </td>
                <td class="py-2 pr-4 font-mono"
                  >{formatRange(
                    formatGameHour(monster.spawn_time_start),
                    formatGameHour(monster.spawn_time_end),
                  )}</td
                >
                <td class="py-2 text-right whitespace-nowrap"
                  >{formatWindowRealTime(monster)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:2248-2251 — Halloween monsters additionally only respawn while the Halloween event is active. -->
        <a
          href="/monsters/pumpkin_head"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Pumpkin Head</a
        >
        and
        <a
          href="/monsters/witch"
          class="text-blue-600 dark:text-blue-400 hover:underline">Witch</a
        >
        also need the Halloween event to be active.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="summons" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Kill-triggered summons</Card.Title>
      <Card.Description>
        Some monsters appear only after the monsters guarding their location are
        all dead.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:715-722 — summonable monsters start hidden; only chance-based non-elite summons start with their respawn timer armed. -->
        <!-- Source: server-scripts/SummonMonster.cs:Update,AreAllPlaceholdersDead — checks the fixed placed group at one-second intervals; while the summon is dead the group must be observed with a living guard and then all dead. -->
        <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD — spawn rolls require an elapsed timer and current guard readiness; a configured arrival message is sent to the zone. -->
        Kill the specific guard group listed below quickly enough that all are dead
        at once. You do not need to kill every monster of that type in the zone. After
        the summoned monster dies, at least one guard must be alive before you clear
        the group again. The summon cannot appear until its timer ends and its spawn
        roll succeeds. Many summons announce their arrival to the zone.
      </p>
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:2242-2247 — summons with a spawn chance below 100% roll on the check; a failed roll re-arms the timer for a full interval. -->
        If the spawn roll fails, the summon waits another full interval before rolling
        again. Its guard group must be dead together for that next roll.
      </p>

      <div class="space-y-4 text-sm">
        <p class="font-medium text-foreground">
          Example schedules: a summon watching five guards, each guard back 8
          minutes after its death
        </p>

        <div>
          <p class="mb-1 text-muted-foreground">
            Killing slowly: kills never add up
          </p>
          <div class="space-y-1">
            {#each slowClearGuards as guard (guard.label)}
              <div class="flex items-center gap-2">
                <span class="w-16 shrink-0 text-right text-muted-foreground"
                  >{guard.label}</span
                >
                <div class="flex h-5 flex-1 overflow-hidden rounded-sm">
                  {#if guard.killedAt > 0}
                    <div
                      class="bg-muted/40"
                      style="width: {guard.killedAt}%"
                    ></div>
                  {/if}
                  <div
                    class="bg-red-500/30"
                    style="width: {Math.min(66.7, 100 - guard.killedAt)}%"
                  ></div>
                  <div class="flex-1 bg-muted/40"></div>
                </div>
              </div>
            {/each}
            <div class="flex items-center gap-2">
              <span class="w-16 shrink-0 text-right text-muted-foreground"
                >Summon</span
              >
              <div
                class="flex h-6 flex-1 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted/40"
              >
                stays hidden
              </div>
            </div>
            <div class="flex gap-2">
              <span class="w-16 shrink-0"></span>
              <div
                class="relative h-5 flex-1 font-mono whitespace-nowrap text-muted-foreground"
              >
                <span class="absolute left-0">0</span>
                <span class="absolute left-[16.7%] -translate-x-1/2">2</span>
                <span class="absolute left-[33.3%] -translate-x-1/2">4</span>
                <span class="absolute left-[50%] -translate-x-1/2">6</span>
                <span class="absolute left-[66.7%] -translate-x-1/2">8</span>
                <span
                  class="absolute left-[75%] hidden -translate-x-1/2 sm:inline"
                  >9</span
                >
                <span class="absolute right-0">{formatDuration(720)}</span>
              </div>
            </div>
          </div>
          <p class="mt-1 text-muted-foreground">
            The first guard returns at minute 8, before the last kill at minute
            9. All five must be dead together, so the summon cannot appear.
          </p>
        </div>

        <div>
          <p class="mb-1 text-muted-foreground">Killing fast</p>
          <div class="space-y-1">
            {#each fastClearGuards as guard (guard.label)}
              <div class="flex items-center gap-2">
                <span class="w-16 shrink-0 text-right text-muted-foreground"
                  >{guard.label}</span
                >
                <div class="flex h-5 flex-1 overflow-hidden rounded-sm">
                  {#if guard.killedAt > 0}
                    <div
                      class="bg-muted/40"
                      style="width: {guard.killedAt}%"
                    ></div>
                  {/if}
                  <div
                    class="bg-red-500/30"
                    style="width: {Math.min(66.7, 100 - guard.killedAt)}%"
                  ></div>
                  <div class="flex-1 bg-muted/40"></div>
                </div>
              </div>
            {/each}
            <div class="flex items-center gap-2">
              <span class="w-16 shrink-0 text-right text-muted-foreground"
                >Summon</span
              >
              <div
                class="flex h-6 flex-1 overflow-hidden rounded-sm border border-border"
              >
                <div
                  class="flex w-[33.3%] items-center justify-center bg-muted/40"
                >
                  hidden
                </div>
                <div class="w-1 shrink-0 bg-blue-500"></div>
                <div
                  class="flex flex-1 items-center justify-center bg-emerald-500/30"
                >
                  up
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <span class="w-16 shrink-0"></span>
              <div
                class="relative h-5 flex-1 font-mono whitespace-nowrap text-muted-foreground"
              >
                <span class="absolute left-0">0</span>
                <span class="absolute left-[33.3%] -translate-x-1/2">4</span>
                <span class="absolute left-[66.7%] -translate-x-1/2">8</span>
                <span class="absolute right-0">{formatDuration(720)}</span>
              </div>
            </div>
          </div>
          <p class="mt-1 text-muted-foreground">
            <!-- Source: server-scripts/SummonMonster.cs:Update; Monster.cs:UpdateServer_DEAD — the guard check runs at one-second intervals; spawning also requires an elapsed timer and a successful roll. -->
            All five guards are dead from minute 4 to minute 8. The summon can appear
            during that window if its timer has ended and its roll succeeds.
          </p>
        </div>

        <div>
          <p class="mb-1 text-muted-foreground">
            A 50% summon with a 20-minute interval
          </p>
          <div class="flex h-9 overflow-hidden rounded border border-border">
            <div class="flex w-[15%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">you clear all five</span>
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div class="flex w-[30%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">roll fails, nothing spawns</span>
            </div>
            <div
              class="w-1 shrink-0 border-l-2 border-dashed border-muted-foreground"
            ></div>
            <div class="flex w-[40%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">guards back, clear them again</span>
            </div>
            <div class="w-1 shrink-0 bg-blue-500"></div>
            <div
              class="flex flex-1 items-center justify-center bg-emerald-500/30"
            >
              <span class="truncate px-1">summon up</span>
            </div>
          </div>
          <div
            class="relative mt-1 h-5 font-mono whitespace-nowrap text-muted-foreground"
          >
            <span class="absolute left-0">0</span>
            <span class="absolute left-[15%] -translate-x-1/2">4</span>
            <span class="absolute left-[46%] -translate-x-1/2">12</span>
            <span class="absolute left-[86%] -translate-x-1/2"
              >{formatDuration(1440)}</span
            >
          </div>
          <p class="mt-1 text-muted-foreground">
            The roll fails at minute 4. The next chance is minute 24, provided
            all five guards are dead together again. They can respawn in
            between.
          </p>
        </div>

        <p class="text-muted-foreground">
          <span
            class="mr-1 inline-block h-3 w-4 translate-y-0.5 rounded-sm bg-red-500/30"
          ></span>
          guard dead, its 8-minute respawn running ·
          <span
            class="mr-1 ml-2 inline-block h-3 w-1 translate-y-0.5 bg-blue-500"
          ></span>
          spawn check ·
          <span
            class="mr-1 ml-2 inline-block h-3 w-4 translate-y-0.5 rounded-sm bg-emerald-500/30"
          ></span>
          summon up ·
          <span
            class="mr-1 ml-2 inline-block h-3 w-0 translate-y-0.5 border-l-2 border-dashed border-muted-foreground"
          ></span>
          guards respawn
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Summon</th>
              <th class="py-2 pr-4 text-left font-medium">Zone</th>
              <th class="py-2 pr-4 text-left font-medium"
                >Specific guards (all dead at once)</th
              >
              <th class="py-2 pr-4 text-left font-medium"
                >Respawn timer and corpse time</th
              >
              <th class="py-2 text-right font-medium">Chance</th>
            </tr>
          </thead>
          <tbody>
            {#each data.summonTriggers as trigger (trigger.summoned_entity_id)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4">
                  {#if trigger.summoned_entity_type === "Monster"}
                    <a
                      href="/monsters/{trigger.summoned_entity_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                      >{trigger.summoned_entity_name}</a
                    >
                  {:else}
                    <a
                      href="/npcs/{trigger.summoned_entity_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                      >{trigger.summoned_entity_name}</a
                    >
                  {/if}
                </td>
                <td class="py-2 pr-4">
                  {#if trigger.zone_id}<a
                      href="/zones/{trigger.zone_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{trigger.zone_name}</a
                    >{:else}Unknown{/if}
                </td>
                <td class="py-2 pr-4">
                  {#each trigger.guards as guard, i (guard.id)}
                    {i > 0 ? ", " : ""}{formatNumber(guard.count)}
                    <a
                      href="/monsters/{guard.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{guard.name}</a
                    >
                    {guard.count === 1 ? "guard" : "guards"}
                  {/each}
                </td>
                <!-- Source: server-scripts/Monster.cs:OnDeath; Npc.cs:OnDeath — earliest return is corpse time plus respawn timer, subject to guards and chance. -->
                <td class="py-2 pr-4">
                  {formatDuration(trigger.respawn_time)} plus {formatDuration(
                    trigger.death_time,
                  )} corpse time
                </td>
                <td class="py-2 text-right font-mono">
                  {formatPercent(trigger.spawn_chance, { decimals: 0 })}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="leashing" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Chase limits and resets</Card.Title>
      <Card.Description>
        Most monsters give up a chase at a set distance and reset when they get
        home.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:EventEntityTooFarToFollow,GetMaxAggroTarget,UpdateServer_MOVING,speed; website/data/compendium.db:monsters — enemy chase limits span 10–100 yd, most use 30 yd, then 40 yd; returning adds 3.5 speed. -->
          <span class="block"
            >Chase limits range from 10 to 100 yd. Most monsters use 30 yd, and
            40 yd is also common. Distance is measured from where combat
            started, though some monsters use a fixed point.</span
          >
          <span class="block"
            >If its target moves beyond the limit, the monster switches to the
            reachable enemy within the limit with the highest
            <MechanicsLink section="combat#threat">threat</MechanicsLink>. If it
            has no enemy to switch to, it loses harmful effects and returns home
            with +3.5 Movement Speed.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:Start,EventEntityTooFarToFollow — dungeon monsters that are neither bosses nor elites skip the anchor-distance check. -->
          <!-- Source: server-scripts/Monster.cs:EventTargetUnreachable,UpdateServer_MOVING — an unreachable target is removed from threat and cleared. -->
          <span class="block"
            >Regular dungeon monsters have no chase-distance limit, but give up
            if they cannot reach you.</span
          >
          <span class="block">Dungeon bosses and elites have chase limits.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:OnAggro,EventEntityTooFarToFollow — returning non-dungeon-normal monsters require reachability and anchor distance within followDistance * 0.8; dungeon normal mobs skip this return-specific gate, not CanAttack or normal reachability. -->
          <span class="block"
            >While returning home, a monster can only attack you again if it can
            reach you and you are within 80% of its chase limit from where
            combat started or its fixed point. For a 30 yd limit, that is 24 yd.</span
          >
          <span class="block"
            >Regular dungeon monsters only need to be able to reach and attack
            you, regardless of distance.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1793-1810 — on arriving home the monster heals to full, restores mana, clears aggro and debuffs, and destroys its summoned pets. -->
          <span class="block"
            >On returning home, a monster recovers full Hit Points and Mana,
            forgets enemies, loses harmful effects, and dismisses its summoned
            pets.</span
          >
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="other-spawns" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Other ways monsters appear</Card.Title>
      <Card.Description>
        Some monsters appear after a kill, during altar events, or at Halloween
        instead of returning on their own timer.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:OnDeath; website/data/compendium.db:monsters — Large Shade Beast has a 100% Keeper Remnant replacement; spawned replacements cannot respawn. -->
          <span class="block"
            ><span class="font-medium text-foreground">On death:</span>
            a
            <a
              href="/monsters/large_shade_beast"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Large Shade Beast</a
            >
            always leaves a
            <a
              href="/monsters/keeper_remnant"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Keeper Remnant</a
            >
            at its corpse. The Keeper Remnant never respawns.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/EventAltar.cs:UserCode_CmdStartEvent__NetworkIdentity; AvatarEventAltar.cs:UserCode_CmdStartEvent__NetworkIdentity; DefaultEvent.cs:SummonMonsters; AvatarEvent.cs:SummonMonsters; Monster.cs:EventRespawnTimeElapsed; website/data/compendium.db:altars,monsters — activation consumes the required item, events spawn waves, and their monsters have respawn disabled. -->
          <span class="font-medium text-foreground">Altar events:</span>
          <a
            href="/altars"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Forgotten Altars, the Altar of War, and the Ancient Altar</a
          >
          spawn their monsters in waves when a player activates the event with the
          required item. These monsters belong to the event and do not respawn on
          their own.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:Start,UpdateServer_DEAD,IsHourBetween; website/data/compendium.db:monsters — Halloween monsters start hidden and require the event and a 20:00–8:00 window. -->
          <span class="font-medium text-foreground">Seasonal monsters:</span>
          Halloween monsters spawn only during the <MechanicsLink
            section="seasonal-events#halloween">Halloween event</MechanicsLink
          >, and only between 20:00 and 8:00 game time (see the spawn windows
          above).
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
</div>
