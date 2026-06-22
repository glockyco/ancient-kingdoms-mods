<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
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

  <nav aria-label="Page sections" class="text-sm text-muted-foreground">
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      <li>
        <a href="#cycle" class="hover:text-foreground hover:underline"
          >The Respawn Cycle</a
        >
      </li>
      <li>
        <a href="#empty-zones" class="hover:text-foreground hover:underline"
          >Empty Zones</a
        >
      </li>
      <li>
        <a href="#bosses" class="hover:text-foreground hover:underline"
          >Boss Respawn Timers</a
        >
      </li>
      <li>
        <a href="#rare-spawns" class="hover:text-foreground hover:underline"
          >Rare Spawns</a
        >
      </li>
      <li>
        <a href="#renewal-sages" class="hover:text-foreground hover:underline"
          >Renewal Sages</a
        >
      </li>
      <li>
        <a href="#spawn-windows" class="hover:text-foreground hover:underline"
          >Day and Night Spawns</a
        >
      </li>
      <li>
        <a href="#summons" class="hover:text-foreground hover:underline"
          >Kill-Triggered Summons</a
        >
      </li>
      <li>
        <a href="#leashing" class="hover:text-foreground hover:underline"
          >Leashing and Resets</a
        >
      </li>
      <li>
        <a href="#other-spawns" class="hover:text-foreground hover:underline"
          >Other Spawn Types</a
        >
      </li>
    </ul>
  </nav>

  <Card.Root id="cycle" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Respawn Cycle</Card.Title>
      <Card.Description>
        Every open-world monster lives on a fixed spot and cycles through death,
        corpse, and respawn on its own timers. Shown below with the most common
        timer setup.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: website/static/compendium.db monsters table — most common configuration is death_time 120 with respawn_time 360. -->
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
        <li>
          <!-- Source: server-scripts/Monster.cs:2078-2079 — corpse deadline = death + deathTime; respawn deadline = corpse deadline + respawnTime. -->
          On death the monster becomes a lootable corpse. The corpse stays for its
          corpse time (2 minutes for most monsters), then disappears.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:877-884 — corpses with zero occupied inventory slots are removed from one second after death onward. -->
          A corpse that holds no items — because nothing dropped or everything was
          looted — disappears almost immediately instead.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1851-1859 and 2481-2485 — hidden corpse is warped back to its start position. -->
          When the corpse disappears, the monster is invisibly moved back to its original
          spawn point.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:2078-2079 — both deadlines are fixed at the moment of death; respawnTimeEnd = deathTimeEnd + respawnTime. Early corpse removal (looting) never touches respawnTimeEnd. -->
          Both timers are locked in at the moment of death: the monster respawns corpse
          time plus respawn timer after the kill. Looting the corpse makes it disappear
          sooner, but never speeds up the respawn.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1836-1848 — on respawn aggro, debuffs, gold, and loot state are cleared, then the monster is shown and revived. -->
          When the timer ends, the monster reappears at its spawn point at full health.
        </li>
      </ol>
      <p>
        <!-- Source: website/static/compendium.db monsters table — regular respawning monsters use respawn_time 40-7200 and death_time 5-300. -->
        Timers are set per monster. For regular monsters the respawn timer ranges
        from 40 seconds up to 2 hours, and 6 minutes is by far the most common. Bosses
        run far longer (<a
          href="#bosses"
          class="text-blue-600 hover:underline dark:text-blue-400">see below</a
        >).
      </p>
      <p>
        One catch: the respawn itself only happens while a player is in the zone
        — see the next section.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="empty-zones" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Empty Zones Are Switched Off</Card.Title>
      <Card.Description>
        The server deactivates a zone when nobody is in it. Spawns behave very
        differently around that moment.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <p>
        <!-- Source: server-scripts/ZoneInfo.cs:185-201 — zones with no online player inside are deactivated. -->
        <!-- Source: server-scripts/Player.cs:3197, 9253, 11243 — zone cleanup runs 5 seconds after a player changes zone; NetworkManagerMMO.cs:704 and 806 — and on disconnect. -->
        About 5 seconds after the last player leaves a zone (immediately, on a logout),
        the entire zone is switched off. Monsters in it stop acting entirely — they
        do not move, fight, or respawn until a player enters again.
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li>
          <!-- Source: server-scripts/Monster.cs:2684-2705 — on zone deactivation dead monsters are hidden, warped home, and their corpse deadline is set to now. -->
          Corpses are removed the moment the zone shuts down. Loot you left on a corpse
          is gone when you come back.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:2663-2682 — on zone reactivation living monsters warp to start position, heal to full, and clear target, aggro, pets, and debuffs. -->
          When the zone wakes up again, monsters that were alive snap back to their
          spawn point at full health with aggro cleared. You cannot pull a monster
          away or damage it, leave the zone, and expect it to stay put or stay hurt.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:886-893 and Entity.cs:207-215 — respawn deadlines are absolute server timestamps, but the state machine that acts on them only runs while the zone object is active. -->
          Respawn timers are deadlines on the clock, so time spent with the zone empty
          still counts toward them — but the respawn itself only executes while the
          zone is active. A monster whose deadline passed while the zone was empty
          appears the instant a player walks in. One whose deadline has not passed
          yet simply waits out the rest.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="bosses" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Boss Respawn Timers</Card.Title>
      <Card.Description>
        Bosses and elites run on long timers that are saved server-side and
        survive server restarts.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:2087-2105 — boss and elite deaths write the respawn deadline to the server database; the respawn duration is sent to currently-online clients via TargetRpcUpdateBossState (applied locally as now+duration, early by the death/corpse window), not a synced deadline, and offline clients are not notified. -->
          When a boss dies, its respawn deadline is saved server-side.
        </li>
        <li>
          <!-- Source: server-scripts/NetworkManagerMMO.cs:97 and Monster.cs:562-583 — saved deadlines are loaded at server start; bosses whose deadline has not passed start hidden. -->
          <!-- Source: server-scripts/Monster.cs:500-518 — at server start only summonable, seasonal, and failed-roll rare monsters start hidden; everything else starts alive. -->
          Saved deadlines are reloaded when the server starts, so a restart does not
          bring a dead boss back early. Regular monsters have no such memory — after
          a restart they all start alive.
        </li>
        <li>
          <!-- Source: website/static/compendium.db monsters table — bosses use death_time 300; respawnTimeEnd = deathTimeEnd + respawnTime, fixed at death (Monster.cs:2078-2079). -->
          Total time from kill to respawn is the timer below plus the boss's corpse
          time (about 5 minutes).
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:12405-12409 — a dungeon renewal zeroes boss and elite deadlines, including the saved ones. -->
          For dungeon bosses these timers can be wiped for gold — see
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

  <Card.Root id="rare-spawns" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Rare Spawns</Card.Title>
      <Card.Description>
        Some monsters only have a chance to appear each time their respawn timer
        runs out.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:1805-1810 — a failed spawn roll keeps the monster hidden and re-arms the timer for another full interval. -->
        <!-- Source: server-scripts/Monster.cs:513-518 — the same roll happens once at server start. -->
        When a rare monster's respawn timer ends, the game rolls its spawn chance.
        On a failure it stays hidden and the timer re-arms for another full interval.
        A roll can only fire while a player keeps the zone active. As long as anyone
        is inside when the timer runs out, the roll happens right on schedule — even
        if the zone sat empty in between. Only a timer that runs out in an empty zone
        is held back. The overdue roll then fires the moment the next player walks
        in — a single roll, no matter how long the zone was empty.
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
        Most dungeons have a sage outside that sells an instant reset of that
        dungeon's respawn timers.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Player.cs:12399-12410 — the renewal sets respawnTimeEnd to 0 for every respawn-enabled monster in the dungeon; boss and elite saved deadlines are zeroed too. -->
          A renewal marks every respawn timer in the dungeon as due — regular monsters,
          elites, and bosses alike, including saved boss deadlines.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:12399-12410 — the renewal only writes timers; health and state of living monsters are untouched. -->
          Nothing despawns. Monsters that are alive — including a rare or boss that
          is already up — are not touched. A renewal only affects the dead.
        </li>
        <li>
          <!-- Source: server-scripts/Player.cs:12385-12391 — the renewal is refused while any player is inside the dungeon. -->
          A renewal is refused while anyone is inside the dungeon. The respawns therefore
          happen the moment the next player walks in, since the empty zone is switched
          off at the time of purchase.
        </li>
        <li>
          <!-- Source: server-scripts/Npc.cs:1689-1695 and UINpcTrading.cs:762-770 — the fee runs through the vendor purchase formula, discounted by Charisma up to 25%. -->
          Fees below are base prices — Charisma discounts the actual price by up to
          25%, the same as vendor purchases.
        </li>
      </ul>

      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Player.cs:12404 and Monster.cs:1805-1810 — a zeroed deadline triggers the spawn roll on the next zone activation; a failed roll re-arms the full interval until the next renewal zeroes it again. -->
        Renewals interact with rare spawns in a useful way. Buying several renewals
        back-to-back is wasted gold: the roll only fires when someone enters, so you
        get one roll on the next entry no matter how many renewals you stacked. But
        you can cycle — renew, step inside (the roll fires immediately, wherever the
        rare lives), step out, renew again. Each cycle buys one roll without running
        to a spawn spot deep in the dungeon. Side effect: a renewal revives all the
        regular monsters too, so the dungeon is fully repopulated every time you step
        in.
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
        A few monsters only exist during part of the in-game day.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:837 — game hour = ((server time % 3600) / 2.5) / 60, so one in-game day lasts exactly one real hour and one game hour lasts 2.5 real minutes. -->
        One in-game day lasts exactly one real hour, so each game hour is 2.5 real
        minutes.
        <!-- Source: server-scripts/Monster.cs:1815-1818 — respawn is held while outside the spawn window. -->
        <!-- Source: server-scripts/Monster.cs:842-849 and 1283-1287 — outside its window a monster with no aggro is hidden and warped home. -->
        These monsters only respawn inside their window, and despawn once the window
        closes — unless they are in combat, which keeps them around until they kill
        you or reset.
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
        <!-- Source: server-scripts/Monster.cs:1811-1814 — Halloween monsters additionally only respawn while the Halloween event is active. -->
        The Pumpkin Head and the Witch additionally require the Halloween event to
        be active.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="summons" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Kill-Triggered Summons</Card.Title>
      <Card.Description>
        Some monsters stay hidden until you clear the regular monsters that
        guard their spot.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:500-508 — summonable monsters start hidden with their respawn timer armed. -->
        <!-- Source: server-scripts/SummonMonster.cs:21-52 — once per second the trigger checks whether every linked monster is currently dead; kills are not counted. -->
        <!-- Source: server-scripts/Monster.cs:1803 and 1819-1834 — the spawn check requires the summon's own respawn timer elapsed plus all trigger monsters dead at the same time; a zone-wide message is broadcast on success. -->
        Each summon watches a fixed set of nearby spawns. There is no kill counter
        — kills do not add up. What matters is that every watched monster is dead
        at the same time. The moment that happens (and the summon's own respawn timer
        has run out), the spawn check fires. Most summons then appear instantly, and
        many announce themselves to everyone in the zone.
      </p>
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Monster.cs:1805-1810 — summons with a spawn chance below 100% roll on the check; a failed roll re-arms the timer for a full interval. -->
        Watch the chance column: some summons are rare spawns on top. For those the
        check is only a roll, and a failed roll re-arms the summon's timer for a full
        interval. The chance is not lost if the watched monsters revive in the meantime
        — once the timer is past, the next roll simply waits and fires the moment
        all of them are dead at the same time again. The intervals are listed in the
        <a
          href="#rare-spawns"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >rare spawn table</a
        > above.
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
      <Card.Title>Leashing and Resets</Card.Title>
      <Card.Description>
        Monsters give up the chase at a fixed distance from home and reset
        completely. Regular monsters in dungeons are the big exception.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:49 and 939-954 — chase limit is the per-monster follow distance, default 20 units, measured from the spawn point. -->
          <!-- Source: server-scripts/Monster.cs:1220-1235 — beyond the follow distance the monster drops its target, clears debuffs, and returns home with bonus sprint speed. -->
          Each monster has a chase limit measured from its spawn point (20 units for
          most monsters). Past that limit it drops its target, sheds all debuffs,
          and returns home with extra move speed.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:519 and 941-943 — the distance check is skipped entirely for non-boss, non-elite monsters in dungeon zones. -->
          <!-- Source: server-scripts/Monster.cs:904-911 — chasing ends when the target is no longer reachable by pathfinding. -->
          Regular monsters inside dungeons have no distance limit. They chase you
          for as long as they can reach you, and only give up when no path to you
          exists. Bosses and elites leash normally even in dungeons.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1905 — while returning, a monster only re-engages targets within 80% of its follow distance; normal dungeon monsters always re-engage (flag set at Monster.cs:519). -->
          While heading home it only re-engages if you stay close (within 80% of its
          chase range). Regular dungeon monsters are the exception — they always turn
          around and re-engage.
        </li>
        <li>
          <!-- Source: server-scripts/Monster.cs:1369-1392 — on arriving home the monster heals to full, restores mana, clears aggro and debuffs, and destroys its summoned pets. -->
          On reaching home it resets fully: full health and mana, aggro cleared, summoned
          minions removed. Damage dealt before a reset is wasted.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="other-spawns" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Other Spawn Types</Card.Title>
      <Card.Description>
        Not everything stands in the world on a respawn timer.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/Monster.cs:2107-2117 — on death a monster can spawn a replacement at its corpse position with a configured probability; the replacement never respawns. -->
          <span class="font-medium text-foreground">Spawn on death:</span>
          a monster can spawn a different monster at its corpse when it dies. The
          replacement is a one-off and never respawns. Currently the only case is
          the Large Shade Beast, which always leaves a Keeper Remnant behind.
        </li>
        <li>
          <!-- Source: website/static/compendium.db monster_spawns table — 231 spawns have spawn_type 'altar', spawned in waves by altar events. -->
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
          <!-- Source: server-scripts/Monster.cs:500-508 and 1811-1814 — Halloween monsters start hidden and only respawn while the seasonal event is active. -->
          <span class="font-medium text-foreground">Seasonal monsters:</span>
          Halloween monsters are hidden year-round and only spawn while the event
          is active (and only at night — see the spawn windows above).
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
</div>
