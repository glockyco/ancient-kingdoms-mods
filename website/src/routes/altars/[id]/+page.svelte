<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import * as Card from "$lib/components/ui/card";
  import { formatDuration, formatPercent } from "$lib/utils/format";
  import type { AltarWave } from "$lib/types/altars";
  import {
    altarVeteranLevelBonus,
    formatAltarRequirement,
  } from "$lib/calculation/altar";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Swords from "@lucide/svelte/icons/swords";
  import Gift from "@lucide/svelte/icons/gift";
  import Skull from "@lucide/svelte/icons/skull";
  import Timer from "@lucide/svelte/icons/timer";
  import Users from "@lucide/svelte/icons/users";
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";

  let { data } = $props();

  // Determine if this is a forgotten altar (has tiered rewards)
  const isForgotten = $derived(data.altar.type === "forgotten");
  const pageName = $derived(
    isForgotten
      ? `${data.altar.name} in ${data.altar.zoneName}`
      : data.altar.name,
  );

  // Veteran scaling state (only used for Forgotten Altars)
  // Start at the altar's minimum level requirement (capture initial value only)
  let playerLevel = $state((() => data.altar.minLevelRequired || 30)());
  let veteranPoints = $state(0);

  const veteranBonus = $derived(altarVeteranLevelBonus(veteranPoints));
  const effectiveLevel = $derived(playerLevel + veteranBonus);
  const levelAdjustment = $derived(effectiveLevel - 30);

  // Calculate scaled monster level
  function getScaledLevel(baseLevel: number): number {
    return baseLevel + levelAdjustment;
  }

  // Group monsters in each wave by ID (count duplicates)
  function getWaveMonsterCounts(wave: AltarWave) {
    const counts: Record<
      string,
      {
        monsterId: string;
        monsterName: string;
        baseLevel: number;
        count: number;
        isBoss: boolean;
        isFabled: boolean;
        isElite: boolean;
      }
    > = {};
    for (const m of wave.monsters) {
      const existing = counts[m.monster_id];
      if (existing) {
        existing.count++;
      } else {
        counts[m.monster_id] = {
          monsterId: m.monster_id,
          monsterName: m.monster_name,
          baseLevel: m.base_level,
          count: 1,
          isBoss: m.is_boss,
          isFabled: m.is_fabled,
          isElite: m.is_elite,
        };
      }
    }
    return Object.values(counts);
  }

  // Format wave timing info based on wave position and requirements
  function getWaveTimingInfo(
    wave: AltarWave,
    isLastWave: boolean,
  ): { label: string; icon: typeof Timer } | null {
    if (wave.seconds_to_complete_wave <= 0) return null;

    if (isLastWave) {
      return {
        label: `${formatDuration(wave.seconds_to_complete_wave)} to defeat the ${isForgotten ? "elite" : "boss"}`,
        icon: Timer,
      };
    } else if (wave.require_all_monsters_cleared) {
      return {
        label: `Next wave after ${formatDuration(wave.seconds_to_complete_wave)}, once every event monster is dead`,
        icon: Timer,
      };
    } else {
      return {
        label: `${formatDuration(wave.seconds_to_complete_wave)} until next wave`,
        icon: Timer,
      };
    }
  }
</script>

<Seo
  title={detailTitle(data.altar.name, { zone: data.altar.zoneName })}
  description={data.description}
  path={`/altars/${data.altar.id}`}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Altars", href: "/altars" },
      { label: pageName },
    ]}
  />

  <!-- Header -->
  <div class="flex items-center gap-3 flex-wrap">
    <h1 class="text-3xl font-bold">{pageName}</h1>
    <MapLink entityId={data.altar.id} entityType="altar" />
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {isForgotten
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}"
    >
      {isForgotten ? "Forgotten Altar" : "Avatar Altar"}
    </span>
    {#if data.altar.minLevelRequired > 0}
      <span
        class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        Level {data.altar.minLevelRequired}+
      </span>
    {/if}
    {#if isForgotten && data.altar.usesVeteranScaling}
      <span
        class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
      >
        Level Scaling
      </span>
    {/if}
  </div>

  <!-- Overview Section -->
  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <MapPin class="h-5 w-5 text-blue-500" />
      Overview
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content class="space-y-3">
        <!-- Zone -->
        <div class="flex justify-between">
          <span class="text-muted-foreground">Zone</span>
          <a
            href="/zones/{data.altar.zoneId}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {data.altar.zoneName}
            {#if data.altar.subZoneName}
              <span class="text-muted-foreground"
                >({data.altar.subZoneName})</span
              >
            {/if}
          </a>
        </div>

        <!-- Activation Item -->
        {#if data.altar.requiredActivationItemId && data.altar.requiredActivationItemName}
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">Activation Item</span>
            <ItemLink
              itemId={data.altar.requiredActivationItemId}
              itemName={data.altar.requiredActivationItemName}
              tooltipHtml={data.altar.activationItemTooltipHtml}
              imageAvailable={data.itemIconPaths[
                data.altar.requiredActivationItemId
              ]}
            />
          </div>
        {/if}

        <!-- Wave Count -->
        <div class="flex justify-between">
          <span class="text-muted-foreground">Waves</span>
          <span>{data.altar.totalWaves}</span>
        </div>

        <!-- Event Radius -->
        <div class="flex justify-between">
          <span class="text-muted-foreground">Event Radius</span>
          <span>{data.altar.radiusEvent} yd</span>
        </div>
        <!-- Sources: server-scripts/DefaultEvent.cs:CheckPlayersUp,MainCoroutineEvent. server-scripts/AvatarEvent.cs:CheckPlayersUp,MainCoroutineEvent. -->
        <p class="text-sm text-muted-foreground">
          The event ends if the player who activated the altar dies or moves
          more than {data.altar.radiusEvent} yd from it.
        </p>

        <!-- Init Message -->
        {#if data.altar.initEventMessage}
          <div class="pt-3 border-t">
            <p class="text-sm text-muted-foreground mb-1">
              When the event starts:
            </p>
            <p class="italic">"{data.altar.initEventMessage}"</p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Veteran Scaling Preview (Forgotten Altars only) -->
  {#if isForgotten && data.altar.usesVeteranScaling}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Users class="h-5 w-5 text-green-500" />
        Level Scaling
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content class="space-y-4">
          <!-- Source: server-scripts/DefaultEvent.cs:209-217 — each monster level is its base level + player level + Mathf.RoundToInt(total veteran points / 40) - 30 -->
          <p class="text-muted-foreground">
            Monster levels scale with the activating player's level and total
            veteran points. Preview the level adjustment below.
          </p>
          <RoundingDefinition />
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="player-level" class="flex justify-between mb-2">
                <span>Player Level</span>
                <span class="font-medium">{playerLevel}</span>
              </label>
              <input
                id="player-level"
                type="range"
                min={data.altar.minLevelRequired || 1}
                max="50"
                bind:value={playerLevel}
                class="w-full accent-green-500"
              />
            </div>
            <div>
              <label for="veteran-points" class="flex justify-between mb-2">
                <span>Veteran Points</span>
                <span class="font-medium">{veteranPoints}</span>
              </label>
              <input
                id="veteran-points"
                type="range"
                min="0"
                max="200"
                bind:value={veteranPoints}
                class="w-full accent-green-500"
              />
            </div>
          </div>
          <div
            class="flex items-center gap-4 p-3 rounded-lg bg-background/50 border text-sm"
          >
            <div>
              <span class="text-muted-foreground">Veteran Bonus:</span>
              <span class="font-medium ml-1">+{veteranBonus}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Level Adjustment:</span>
              <span
                class="font-medium ml-1 {levelAdjustment >= 0
                  ? 'text-green-400'
                  : 'text-red-400'}"
              >
                {levelAdjustment >= 0 ? "+" : ""}{levelAdjustment}
              </span>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </section>
  {/if}

  <!-- Rewards Section (Forgotten Altars) -->
  {#if isForgotten && data.rewards.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gift class="h-5 w-5 text-amber-500" />
        Tiered Rewards
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content>
          <!-- Source: server-scripts/DefaultEvent.cs:229-239 — reward quality uses player level plus total veteran points, with thresholds at 40, 50, and 150 -->
          <p class="text-muted-foreground mb-4">
            The reward depends on the level plus total veteran points of the
            player who activated the altar.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            {#each data.rewards as reward (reward.tier)}
              <div class="rounded-lg border p-4 bg-background/50">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium capitalize">{reward.tier}</span>
                  <span class="text-sm text-muted-foreground">
                    {formatAltarRequirement(
                      reward.tier,
                      data.altar,
                      data.maxLevel,
                    )}
                  </span>
                </div>
                {#if reward.itemId && reward.itemName}
                  <div class="flex items-center justify-between">
                    <ItemLink
                      itemId={reward.itemId}
                      itemName={reward.itemName}
                      tooltipHtml={reward.tooltipHtml}
                      imageAvailable={data.itemIconPaths[reward.itemId]}
                    />
                    {#if reward.dropRate !== null}
                      <span class="text-sm text-muted-foreground">
                        {formatPercent(reward.dropRate, {
                          decimals: 1,
                          trailingZeros: true,
                        })} drop chance
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </section>
  {/if}

  <!-- Boss Section -->
  {#if data.bosses.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        {#if isForgotten}
          <Shield class="h-5 w-5 text-purple-500" />
        {:else}
          <Crown class="h-5 w-5 text-cyan-500" />
        {/if}
        {isForgotten ? "Elite" : "Boss"}
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content>
          <div class="space-y-2">
            {#each data.bosses as boss (boss.monsterId)}
              <div class="flex items-center justify-between">
                <a
                  href="/monsters/{boss.monsterId}"
                  class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {boss.monsterName}
                </a>
                <span class="text-muted-foreground">
                  {#if isForgotten && data.altar.usesVeteranScaling}
                    Base level {boss.level}, scaled level {getScaledLevel(
                      boss.level,
                    )}
                  {:else}
                    Level {boss.level}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </section>
  {/if}

  <!-- Waves Section -->
  {#if data.waves.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Swords class="h-5 w-5 text-red-500" />
        Waves ({data.waves.length})
      </h2>
      <Card.Root class="bg-muted/30">
        <Card.Content class="space-y-4">
          {#each data.waves as wave, index (wave.wave_number)}
            {@const isLastWave = index === data.waves.length - 1}
            {@const monsterCounts = getWaveMonsterCounts(wave)}
            {@const timingInfo = getWaveTimingInfo(wave, isLastWave)}
            <div class="rounded-lg border p-4 bg-background/50">
              <!-- Wave Header -->
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold flex items-center gap-2">
                  Wave {wave.wave_number + 1}
                  {#if isLastWave}
                    <span
                      class="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
                    >
                      <Skull class="mr-1 h-3 w-3" />
                      {isForgotten ? "Final wave" : "Boss wave"}
                    </span>
                  {/if}
                </h3>
                <div class="flex gap-3 text-sm text-muted-foreground">
                  {#if index > 0 && wave.seconds_before_start > 0}
                    <span class="flex items-center gap-1">
                      <Timer class="h-4 w-4" />
                      Starts {formatDuration(wave.seconds_before_start)} after the
                      previous wave ends
                    </span>
                  {/if}
                  {#if timingInfo}
                    {@const Icon = timingInfo.icon}
                    <span class="flex items-center gap-1">
                      <Icon class="h-4 w-4" />
                      {timingInfo.label}
                    </span>
                  {:else if wave.require_all_monsters_cleared && !isLastWave}
                    <span
                      >The next wave waits until every event monster is dead</span
                    >
                  {/if}
                </div>
              </div>

              <!-- Monster List -->
              {#if monsterCounts.length > 0}
                <div class="space-y-1">
                  {#each monsterCounts as monster (monster.monsterId)}
                    <div class="flex items-center justify-between">
                      <a
                        href="/monsters/{monster.monsterId}"
                        class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <MonsterTypeIcon
                          isBoss={monster.isBoss}
                          isFabled={monster.isFabled}
                          isElite={monster.isElite}
                        />
                        {#if monster.count > 1}
                          {monster.count}x
                        {/if}
                        {monster.monsterName}
                      </a>
                      <span class="text-muted-foreground">
                        {#if isForgotten && data.altar.usesVeteranScaling}
                          Base level {monster.baseLevel}, scaled level {getScaledLevel(
                            monster.baseLevel,
                          )}
                        {:else}
                          Level {monster.baseLevel}
                        {/if}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Messages -->
              {#if wave.init_wave_message || wave.finish_wave_message}
                <div class="mt-3 pt-3 border-t space-y-2">
                  {#if wave.init_wave_message}
                    <div>
                      <p class="text-sm text-muted-foreground">
                        When the wave starts:
                      </p>
                      <p class="italic">"{wave.init_wave_message}"</p>
                    </div>
                  {/if}
                  {#if wave.finish_wave_message}
                    <div>
                      <p class="text-sm text-muted-foreground">
                        When the wave ends:
                      </p>
                      <p class="italic">"{wave.finish_wave_message}"</p>
                    </div>
                  {/if}
                </div>
              {/if}

              <!-- Failure message (final wave only) -->
              {#if isLastWave}
                <div class="mt-3 pt-3 border-t">
                  <p class="text-sm text-muted-foreground">
                    When time runs out:
                  </p>
                  <p class="italic">
                    {#if isForgotten}
                      "The Forgotten Altar dims, its energies spent as the
                      monstrous horde fades into shadow..."
                    {:else}
                      "The tides of power surge, then fade. The Avatar's might
                      recedes, leaving only echoes of defeat..."
                    {/if}
                  </p>
                </div>
              {/if}
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    </section>
  {/if}
</div>
