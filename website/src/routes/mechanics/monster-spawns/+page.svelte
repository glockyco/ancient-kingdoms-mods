<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import type {
    BossRespawn,
    RareSpawn,
    RespawnMechanicsPageData,
    SpawnWindowMonster,
  } from "./+page.server";

  let { data }: { data: RespawnMechanicsPageData } = $props();

  // Every section on the page, in document order. Drives the jump list.
  // The ids match each Card.Root below.
  const SECTIONS = [
    { id: "cycle", label: "The Respawn Cycle" },
    { id: "empty-zones", label: "Empty Zones" },
    { id: "bosses", label: "Boss Respawn Timers" },
    { id: "missing-boss", label: "Why a Boss Is Absent" },
    { id: "rare-spawns", label: "Rare Spawns" },
    { id: "renewal-sages", label: "Renewal Sages" },
    { id: "spawn-windows", label: "Day and Night Spawns" },
    { id: "summons", label: "Kill-Triggered Summons" },
    { id: "leashing", label: "Chase Limits and Resets" },
    { id: "other-spawns", label: "Other Ways Monsters Appear" },
  ];

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

  function formatDuration(seconds: number): string {
    if (seconds % 3600 === 0) return `${seconds / 3600} h`;
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`;
    }
    if (seconds % 60 === 0) return `${seconds / 60} min`;
    return `${seconds} s`;
  }

  function formatChance(probability: number): string {
    return `${Math.round(probability * 100)}%`;
  }

  // Cumulative odds for the renewal-cycling table. Every spawn chance that
  // occurs in the rare spawn data (distinct respawn_probability values).
  const RARE_ROLL_CHANCES = [0.2, 0.25, 0.4, 0.5, 0.6, 0.7, 0.75];
  const RARE_ROLL_COUNTS = [1, 2, 3, 5, 10];

  function cumulativeRollChance(chance: number, rolls: number): string {
    const percent = (1 - Math.pow(1 - chance, rolls)) * 100;
    return percent > 99 ? ">99%" : `${Math.round(percent)}%`;
  }

  function formatAverageWait(rare: RareSpawn): string {
    const seconds = rare.respawn_time / rare.respawn_probability;
    return formatDuration(Math.round(seconds / 60) * 60);
  }

  function formatGameHour(hour: number): string {
    return `${hour}:00`;
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
    return `${gameHours * 2.5} min of every hour`;
  }
</script>

<Seo
  title="Monster Spawn Mechanics - Ancient Kingdoms"
  description="How monster spawning works in Ancient Kingdoms: respawn timers, boss respawn times, rare spawn chances, dungeon renewals, night-only monsters, kill-triggered summons, and zone resets."
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

  <h1 class="text-4xl font-bold">Monster Spawn Mechanics</h1>

  <PageSections sections={SECTIONS} />

  <Card.Root id="cycle" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Respawn Cycle</Card.Title>
      <Card.Description>
        Most open-world monsters appear at a fixed location after the corpse and
        respawn periods shown in this diagram.
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
            <span class="block truncate">lootable · 2 min</span>
          </div>
          <div class="col-span-3 min-w-0 bg-muted/50 px-2 py-2">
            <span class="block truncate font-medium text-foreground"
              >Hidden at spawn point</span
            >
            <span class="block truncate">respawn timer · 6 min</span>
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

      <ol class="list-decimal space-y-1 pl-5">
        <!-- Source: server-scripts/Monster.cs:OnDeath — corpse deadline = death + deathTime; respawn deadline = corpse deadline + respawnTime. -->
        <li>
          <span class="block"
            >On death, a monster becomes a lootable corpse.</span
          >
          <span class="block">Most corpses disappear after 2 minutes.</span>
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:931-938 — corpses with zero occupied inventory slots are removed from one second after death onward. -->
          A corpse with no items disappears almost immediately, whether the monster
          dropped nothing or players took everything.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1914-1922 and 2905-2909 — hidden corpse is warped back to its start position. -->
          When a corpse disappears, the monster returns invisibly to its original
          location.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:OnDeath — both deadlines are fixed at the moment of death; respawnTimeEnd = deathTimeEnd + respawnTime. Early corpse removal (looting) never touches respawnTimeEnd. -->
          <span class="block"
            >At death, the monster's return is set for its corpse period plus
            its respawn timer after the kill.</span
          >
          <span class="block"
            >Taking all corpse loot does not shorten the wait until the monster
            returns.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1899-1911 — on respawn aggro, debuffs, gold, and loot state are cleared, then the monster is shown and revived. -->
          When the timer ends, the monster reappears at its spawn point at full health.
        </li>
      </ol>
      <p>
        <!-- Source: website/data/compendium.db monsters table — regular respawning monsters use respawn_time 40-7200 and death_time 5-300. -->
        <span class="block"
          >Regular monsters have respawn timers from 40 seconds to 2 hours, most
          often 6 minutes.</span
        >
        <span class="block"
          >Bosses have longer timers (<a
            href="#bosses"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >see below</a
          >).</span
        >
      </p>
      <p>
        A monster does not respawn until a player enters its zone, even after
        its timer ends.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="empty-zones" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Empty Zones Are Switched Off</Card.Title>
      <Card.Description>
        When everyone leaves a zone, its monsters stop moving, fighting, and
        respawning until someone returns.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <p>
        <!-- Source: server-scripts/ZoneInfo.cs:185-201 — zones with no online player inside are deactivated. -->
        <!-- Source: server-scripts/Player.cs:UpdateServer_DEAD,11003,13015 — zone cleanup runs 5 seconds after respawn, portal travel, or resurrection; NetworkManagerMMO.cs:718 and 820 — and on disconnect. -->
        <span class="block"
          >About 5 seconds after the last player leaves a zone, the zone becomes
          inactive.</span
        >
        <span class="block"
          >Logging out deactivates an empty zone immediately.</span
        >
        <span class="block"
          >Its monsters cannot move, fight, or respawn until a player returns.</span
        >
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li>
          <!-- Source: server-scripts/Monster.cs:3109-3130 — on zone deactivation dead monsters are hidden, warped home, and their corpse deadline is set to now. -->
          Corpses are removed the moment the zone shuts down. Loot you left on a corpse
          is gone when you come back.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:3088-3107 — on zone reactivation living monsters warp to start position, heal to full, and clear target, aggro, pets, and debuffs. -->
          <span class="block"
            >When someone returns, living monsters move back to their original
            locations at full health.</span
          >
          <span class="block"
            >They forget their targets, lose harmful effects, and dismiss their
            summoned pets.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:940-947 and Entity.cs:221-229 — respawn deadlines are absolute server timestamps, but the state machine that acts on them only runs while the zone object is active. -->
          <span class="block"
            >Time in an empty zone still counts toward each monster's respawn
            deadline.</span
          >
          <span class="block"
            >If the deadline passes while the zone is empty, the monster returns
            when a player enters.</span
          >
          <span class="block">Otherwise, it waits for the remaining time.</span>
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="bosses" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Boss Respawn Timers</Card.Title>
      <Card.Description>
        Boss and elite respawn deadlines are saved on the server and survive
        restarts.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:OnDeath — boss and elite deaths write the respawn deadline to the server database; the respawn duration is sent to currently-online clients via TargetRpcUpdateBossState (applied locally as now+duration, early by the death/corpse window), not a synced deadline, and offline clients are not notified. -->
          When a boss or elite dies, the server saves its respawn deadline.
        </li>
        <li>
          <!-- Source: server-scripts/NetworkManagerMMO.cs:111 and Monster.cs:616-637 — saved deadlines are loaded at server start; bosses whose deadline has not passed start hidden. -->
          <!-- Source: server-scripts/Monster.cs:504-522 — at server start only summonable, seasonal, and failed-roll rare monsters start hidden; everything else starts alive. -->
          <span class="block"
            >Restarting the server does not reset a dead boss's saved timer.</span
          >
          <span class="block"
            >Regular monsters return alive after a server restart.</span
          >
        </li>
        <li>
          <!-- Source: website/data/compendium.db monsters table — bosses use death_time 300; respawnTimeEnd = deathTimeEnd + respawnTime, fixed at death (Monster.cs:2078-2079). -->
          A boss returns after its listed timer plus approximately 5 minutes for its
          corpse.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:14207-14219 — a dungeon renewal zeroes boss and elite deadlines, including the saved ones. -->
          For a dungeon boss, you can pay a Renewal Sage to restart its respawn —
          see
          <a
            href="#renewal-sages"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Renewal Sages</a
          >.
        </li>
      </ul>

      <div class="space-y-3 text-sm">
        {#each bossTiers as [respawnTime, bosses] (respawnTime)}
          <div class="flex gap-4">
            <div class="w-14 shrink-0 pt-px text-right font-mono">
              {formatDuration(respawnTime)}
            </div>
            <div
              class="flex flex-wrap gap-x-1.5 gap-y-0.5 border-l border-border pl-4"
            >
              {#each bosses as boss, i (boss.id)}
                <span class="whitespace-nowrap">
                  <a
                    href="/monsters/{boss.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{boss.name}</a
                  ><span class="text-muted-foreground">
                    ({boss.level}){i < bosses.length - 1 ? "," : ""}</span
                  >
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="missing-boss" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Why a Boss Is Absent</Card.Title>
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
          <!-- Source: server-scripts/Monster.cs:2852-2862,769-779 — a dead boss waits for its saved respawn deadline. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its respawn timer has not ended.</td>
            <td class="py-2"
              ><a href="#bosses" class="underline hover:text-foreground"
                >Boss Respawn Timers</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:2229-2232 — respawn waits for the configured in-game time window. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its spawn window is closed.</td>
            <td class="py-2"
              ><a href="#spawn-windows" class="underline hover:text-foreground"
                >Day and Night Spawns</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:2217-2223 — a failed appearance roll hides the monster and re-arms the timer. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its rare-spawn roll failed.</td>
            <td class="py-2"
              ><a href="#rare-spawns" class="underline hover:text-foreground"
                >Rare Spawns</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:2217-2218,2233-2237; SummonMonster.cs:36-69 — a summoned encounter waits for its linked group to qualify. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4"
              >All linked guards need to die after respawning.</td
            >
            <td class="py-2"
              ><a href="#summons" class="underline hover:text-foreground"
                >Kill-Triggered Summons</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:2225-2227 — Halloween encounters remain hidden while the event is inactive. -->
          <tr class="border-b border-border/50">
            <td class="py-2 pr-4">Its seasonal event is inactive.</td>
            <td class="py-2"
              ><a href="#other-spawns" class="underline hover:text-foreground"
                >Other Ways Monsters Appear</a
              ></td
            >
          </tr>
          <!-- Source: server-scripts/Monster.cs:1628-1633,1774-1780 — a monster can return home and reset health rather than die. -->
          <tr>
            <td class="py-2 pr-4">It leashed and returned home.</td>
            <td class="py-2"
              ><a href="#leashing" class="underline hover:text-foreground"
                >Leashing and Resets</a
              ></td
            >
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <Card.Root id="rare-spawns" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Rare Spawns</Card.Title>
      <Card.Description>
        When a rare monster's respawn timer ends, it appears only if its
        spawn-chance roll succeeds.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:2219-2224 — a failed spawn roll keeps the monster hidden and re-arms the timer for another full interval. -->
        <!-- Source: server-scripts/Monster.cs:711-716 — the same roll happens once at server start. -->
        <span class="block"
          >When a rare monster's respawn timer ends, the game rolls its chance
          to appear.</span
        >
        <span class="block"
          >A failed roll leaves it hidden and starts another full interval.</span
        >
        <span class="block"
          >The game rolls only while someone is in the zone.</span
        >
        <span class="block"
          >If the deadline passes while nobody is there, one overdue roll
          happens when the next player enters, regardless of how long the zone
          was empty.</span
        >
      </p>

      <div class="space-y-4 text-sm">
        <p class="font-medium text-foreground">
          Example with a 20-minute roll interval, rare killed at 0:00
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
            <span class="absolute right-0">40 min</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            Rolls at 20 and 40 minutes — one roll every interval.
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
            <span class="absolute right-0">40 min</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            You return at 15 minutes. The roll still happens at 20 minutes,
            right on schedule — the empty stretch cost nothing.
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
            <span class="absolute right-0">40 min</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            The timer ends at 20 minutes while the zone is empty — nothing
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

      <p class="text-sm text-muted-foreground">
        The average column is the expected wait from one kill to the next
        appearance while the zone stays active (corpse time not included).
      </p>
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
                >Chance</th
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
                <td class="py-2 pr-4">{rare.zone ?? "Unknown"}</td>
                <td class="py-2 pr-4 text-right font-mono"
                  >{formatDuration(rare.respawn_time)}</td
                >
                <td class="py-2 pr-4 text-right font-mono"
                  >{formatChance(rare.respawn_probability)}</td
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
          <!-- Source: server-scripts/Player.cs:14207-14219 — the renewal zeroes every respawn-enabled monster deadline in the dungeon and persists cleared boss and elite deadlines. -->
          Renewal clears respawn deadlines for dead monsters that can respawn in the
          dungeon, including regular monsters, elites, and bosses.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:14208-14220 — the renewal only changes respawn deadlines, leaving living monsters untouched. -->
          <span class="block"
            >Renewal does not remove living monsters, even bosses or rare
            monsters.</span
          >
          <span class="block">It changes only respawn deadlines.</span>
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:14192-14205 — renewal checks every online player in the dungeon and refuses while any is inside, regardless of party; it also refuses insufficient gold. -->
          Every player must leave before renewal, including anyone outside your party.
        </li>
        <li>
          <!-- Source: server-scripts/Npc.cs:1733-1739; Player.cs:14202-14207 — the sage quotes a gold fee and renewal refuses if the payer lacks the quoted gold. -->
          You must pay the gold fee quoted by the sage.
        </li>
        <li>
          <!-- Source: server-scripts/Npc.cs:1733-1739; UINpcTrading.cs:824-831 — the table gives base fees, while Charisma discounts most quoted fees up to 25%; dungeon 100 uses its undiscounted fee. -->
          The table lists base fees before the Charisma discount of up to 25% available
          at most sages.
        </li>
      </ul>
      <!-- Source: server-scripts/Player.cs:14207-14220; Portal.cs:33-63 — renewal changes monster deadlines only, while portal keys, level and item-level requirements remain checked on entry. -->
      <p class="text-sm text-muted-foreground">
        Renewal does not remove a portal's key, level, or item-level
        requirements. See <MechanicsLink section="world#portals"
          >Portals and Entry Requirements</MechanicsLink
        >.
      </p>
      <!-- Source: server-scripts/Player.cs:14208-14220; Monster.cs:2217-2237 — a zeroed respawn deadline does not bypass summon, chance, seasonal, or time-window spawn checks. -->
      <p class="text-sm text-muted-foreground">
        Summoned monsters, rare spawn rolls, seasonal events, and time windows
        still govern whether a monster appears after renewal.
      </p>

      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Player.cs:14208-14220 and Monster.cs:2219-2224 — a zeroed deadline triggers the spawn roll on the next zone activation; a failed roll re-arms the full interval until the next renewal zeroes it again. -->
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
        <span class="block"
          >Each renewal also makes dead regular monsters in the dungeon ready to
          respawn.</span
        >
      </p>

      <div class="space-y-4 text-sm">
        <p class="font-medium text-foreground">
          Example — cycling renewals for a rare with a 25% chance
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
            <span class="absolute right-0">7 min</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            You kill the rare at minute 0 and step out. Each renewal marks the
            timer as due, and each step back inside fires one roll right away —
            no need to run to the spawn spot. Every roll is an independent 25%
            chance: in this example the third one happens to succeed, and the
            rare then stands at its spawn point until you come for it. No number
            of rolls guarantees a spawn — see the odds below. Without renewals,
            a failed roll would not repeat until its full interval passed.
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
                    >{formatChance(chance)} rare</th
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
        <p class="text-sm text-muted-foreground">
          Each roll is independent. The odds grow with every roll but never
          reach certainty — a streak of failures is always possible.
        </p>
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
                  <td class="py-2 pr-4">{sage.dungeon_name}</td>
                  <td class="py-2 pr-4">
                    <a
                      href="/npcs/{sage.id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                      >{sage.name}</a
                    >
                  </td>
                  <td class="py-2 text-right font-mono"
                    >{sage.base_fee.toLocaleString()}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">No renewal sage data found.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="spawn-windows" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Day and Night Spawns</Card.Title>
      <Card.Description>
        Some monsters appear only during particular in-game hours.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:EventTimeSpawn — game hour = ((server time % 3600) / 2.5) / 60, so one in-game day lasts exactly one real hour and one game hour lasts 2.5 real minutes. -->
        <span class="block"
          >One in-game day lasts exactly one real hour, so each game hour is 2.5
          real minutes.</span
        >
        <!-- Source: server-scripts/Monster.cs:1878-1881 — respawn is held while outside the spawn window. -->
        <!-- Source: server-scripts/Monster.cs:896-903 and 1354-1358 — outside its window a monster with no aggro is hidden and warped home. -->
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
                <td class="py-2 pr-4">{monster.zone ?? "Unknown"}</td>
                <td class="py-2 pr-4 font-mono"
                  >{formatGameHour(monster.spawn_time_start)}–{formatGameHour(
                    monster.spawn_time_end,
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
        <!-- Source: server-scripts/Monster.cs:1874-1877 — Halloween monsters additionally only respawn while the Halloween event is active. -->
        The Pumpkin Head and the Witch additionally require the Halloween event to
        be active.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="summons" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Kill-Triggered Summons</Card.Title>
      <Card.Description>
        Some monsters appear only after the monsters guarding their location are
        all dead.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:671-679 — summonable monsters start hidden; only chance-based non-elite summons start with their respawn timer armed. -->
        <!-- Source: server-scripts/SummonMonster.cs:26,36-46,52-69 — once per second the trigger checks for a fresh alive-to-all-dead placeholder cycle; kills are not counted. -->
        <!-- Source: server-scripts/Monster.cs:UpdateServer_DEAD — the spawn check requires the summon's own respawn timer elapsed plus all trigger monsters dead at the same time; a zone-wide message is broadcast on success. -->
        <span class="block"
          >Each summoned monster watches a fixed group of guards.</span
        >
        <span class="block"
          >The game does not count kills toward its appearance.</span
        >
        <span class="block"
          >All guards must first be alive, then dead together for a new attempt.</span
        >
        <span class="block"
          >If the summoned monster's timer has ended, killing the last guard
          triggers its chance to appear.</span
        >
        <span class="block">Many announce their arrival to the zone.</span>
      </p>
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:2219-2224 — summons with a spawn chance below 100% roll on the check; a failed roll re-arms the timer for a full interval. -->
        <span class="block"
          >Some summoned monsters have a chance to appear below 100%.</span
        >
        <span class="block"
          >After a failed roll, their timer starts another full interval.</span
        >
        <span class="block"
          >Once the timer ends, another roll waits until all guards are dead at
          the same time.</span
        >
        <span class="block"
          >The intervals are in the <a
            href="#rare-spawns"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >rare spawn table</a
          >.</span
        >
      </p>

      <div class="space-y-4 text-sm">
        <p class="font-medium text-foreground">
          Example schedules — a summon watching five guards, each guard back 8
          minutes after its death
        </p>

        <div>
          <p class="mb-1 text-muted-foreground">
            Killing slowly — kills never add up
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
                <span class="absolute right-0">12 min</span>
              </div>
            </div>
          </div>
          <p class="mt-1 text-muted-foreground">
            One kill every two minutes, the fifth at minute 9. The first guard
            is already back at minute 8, so there is never a moment with all
            five dead at once — the check never fires. No number of kills helps
            while they are this spread out.
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
                <span class="absolute right-0">12 min</span>
              </div>
            </div>
          </div>
          <p class="mt-1 text-muted-foreground">
            One kill per minute. From minute 4 to minute 8 all five guards are
            dead at the same time — the check fires the instant the fifth dies,
            and the summon appears.
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
              <span class="truncate px-1">roll failed — nothing spawns</span>
            </div>
            <div
              class="w-1 shrink-0 border-l-2 border-dashed border-muted-foreground"
            ></div>
            <div class="flex w-[40%] items-center justify-center bg-muted/60">
              <span class="truncate px-1">guards back — clear them again</span>
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
            <span class="absolute left-[86%] -translate-x-1/2">24 min</span>
          </div>
          <p class="mt-1 text-muted-foreground">
            You clear all five guards by minute 4, but the roll fails. The next
            roll cannot fire before minute 24, a full interval later. The guards
            do not need to stay dead in between — past minute 24 the roll simply
            waits, and fires the moment all five are dead at once again. Here
            you re-clear them just in time for minute 24.
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
              <th class="py-2 pr-4 text-left font-medium">Kill requirement</th>
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
                <td class="py-2 pr-4">{trigger.zone_name ?? "Unknown"}</td>
                <td class="py-2 pr-4">
                  {trigger.placeholder_count}× {trigger.placeholder_names ??
                    "Unknown"}
                </td>
                <td class="py-2 text-right font-mono">
                  {trigger.spawn_chance === null
                    ? "—"
                    : formatChance(trigger.spawn_chance)}
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
      <Card.Title>Chase Limits and Resets</Card.Title>
      <Card.Description>
        Most monsters stop chasing at a set distance from home, while regular
        dungeon monsters have no distance limit.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:51 and 993-1008 — chase limit is the per-monster follow distance, default 20 units, measured from the spawn point. -->
          <!-- Source: server-scripts/Monster.cs:1286-1301 — beyond the follow distance the monster drops its target, clears debuffs, and returns home with bonus sprint speed. -->
          <span class="block"
            >Most monsters stop chasing 20 units from where they first appear.</span
          >
          <span class="block"
            >They drop their target, lose their harmful effects, and return home
            faster.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:717-718 and 1251-1256 — the distance check is skipped entirely for non-boss, non-elite monsters in dungeon zones. -->
          <!-- Source: server-scripts/Monster.cs:1597-1605 — chasing ends when the target is no longer reachable by pathfinding. -->
          <span class="block"
            >Regular monsters inside dungeons have no distance limit.</span
          >
          <span class="block">They chase you while a route to you exists.</span>
          <span class="block"
            >Bosses and elites still stop chasing at their usual distance.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:2681 and Monster.cs:717-718 — while returning, a monster only re-engages targets within 80% of its follow distance; normal dungeon monsters always re-engage (flag set at Monster.cs:663-664). -->
          <span class="block"
            >Returning monsters chase you again only within 80% of their maximum
            chase distance.</span
          >
          <span class="block"
            >Regular dungeon monsters can turn around and chase you at any
            distance.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1440-1463 — on arriving home the monster heals to full, restores mana, clears aggro and debuffs, and destroys its summoned pets. -->
          <span class="block"
            >On returning home, a monster recovers full health and mana, forgets
            enemies, loses harmful effects, and dismisses its summoned pets.</span
          >
          <span class="block"
            >Damage you dealt before it returned does not carry over.</span
          >
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="other-spawns" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Other Ways Monsters Appear</Card.Title>
      <Card.Description>
        Some monsters appear after a kill, during altar events, or at Halloween
        instead of returning on their own timer.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:2170-2180 — on death a monster can spawn a replacement at its corpse position with a configured probability; the replacement never respawns. -->
          <span class="block"
            ><span class="font-medium text-foreground"
              >After another monster dies:</span
            > one monster can cause another to appear at its corpse.</span
          >
          <span class="block">The new monster does not respawn.</span>
          <span class="block"
            >A Large Shade Beast always leaves a Keeper Remnant behind.</span
          >
        </li>
        <li>
          <!-- Source: website/data/compendium.db monster_spawns table — 231 spawns have spawn_type 'altar', spawned in waves by altar events. -->
          <span class="font-medium text-foreground">Altar events:</span>
          <a
            href="/altars"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >forgotten altars</a
          > spawn their monsters in waves when a player activates the event with the
          required item. These monsters belong to the event and do not respawn on
          their own.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:504-512 and 1874-1877 — Halloween monsters start hidden and only respawn while the seasonal event is active. -->
          <span class="font-medium text-foreground">Seasonal monsters:</span>
          Halloween monsters are hidden year-round and only spawn while the event
          is active (and only at night — see the spawn windows above).
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
</div>
