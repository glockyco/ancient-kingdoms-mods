<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import * as Card from "$lib/components/ui/card";
  import {
    formatDuration,
    formatPercent,
    formatAltarRewardTier,
  } from "$lib/utils/format";
  import type { AltarWave } from "$lib/types/altars";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Swords from "@lucide/svelte/icons/swords";
  import Gift from "@lucide/svelte/icons/gift";
  import Skull from "@lucide/svelte/icons/skull";
  import Timer from "@lucide/svelte/icons/timer";
  import Users from "@lucide/svelte/icons/users";

  let { data } = $props();

  // Determine if this is a forgotten altar (has tiered rewards)
  const isForgotten = $derived(data.altar.type === "forgotten");

  // Veteran scaling state (only used for Forgotten Altars)
  // Start at the altar's minimum level requirement
  let playerLevel = $state(data.altar.minLevelRequired || 30);
  let veteranLevel = $state(0);

  // Computed effective level and scaling
  // Veteran level contributes 1 point per 20 veteran levels to effective level
  const veteranBonus = $derived(Math.floor(veteranLevel / 20));
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
        label: `${formatDuration(wave.seconds_to_complete_wave)} to defeat boss`,
        icon: Timer,
      };
    } else if (wave.require_all_monsters_cleared) {
      return {
        label: `${formatDuration(wave.seconds_to_complete_wave)} minimum`,
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

<svelte:head>
  <title>{data.altar.name} - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Altars", href: "/altars" },
      { label: data.altar.name },
    ]}
  />

  <!-- Header -->
  <div class="flex items-center gap-3 flex-wrap">
    <h1 class="text-3xl font-bold">{data.altar.name}</h1>
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

  <!-- Overview Card -->
  <Card.Root class="bg-muted/30">
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <MapPin class="h-5 w-5 text-blue-500" />
        Overview
      </Card.Title>
    </Card.Header>
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
            <span class="text-muted-foreground">({data.altar.subZoneName})</span
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
        <span>{data.altar.radiusEvent} units</span>
      </div>

      <!-- Init Message -->
      {#if data.altar.initEventMessage}
        <div class="pt-3 border-t">
          <p class="text-sm text-muted-foreground mb-1">On event start:</p>
          <p class="italic">"{data.altar.initEventMessage}"</p>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Veteran Scaling Preview (Forgotten Altars only) -->
  {#if isForgotten && data.altar.usesVeteranScaling}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Users class="h-5 w-5 text-green-500" />
          Level Scaling Preview
        </Card.Title>
        <p class="text-muted-foreground">
          Monster levels scale based on your effective level (player level +
          veteran level / 20)
        </p>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="flex justify-between mb-2">
              <span>Player Level</span>
              <span class="font-medium">{playerLevel}</span>
            </label>
            <input
              type="range"
              min={data.altar.minLevelRequired || 1}
              max="50"
              bind:value={playerLevel}
              class="w-full accent-green-500"
            />
          </div>
          <div>
            <label class="flex justify-between mb-2">
              <span>Veteran Level</span>
              <span class="font-medium">{veteranLevel}</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              bind:value={veteranLevel}
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
          <div class="text-muted-foreground">→</div>
          <div>
            <span class="text-muted-foreground">Effective Level:</span>
            <span class="font-medium ml-1 text-green-400">{effectiveLevel}</span
            >
          </div>
          <div class="text-muted-foreground">→</div>
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
  {/if}

  <!-- Rewards Section (Forgotten Altars) -->
  {#if isForgotten && data.rewards.length > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Gift class="h-5 w-5 text-amber-500" />
          Tiered Rewards
        </Card.Title>
        <p class="text-muted-foreground">
          Reward tier is determined by effective level (player level + veteran
          level)
        </p>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each data.rewards as reward (reward.tier)}
            <div class="rounded-lg border p-4 bg-background/50">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium capitalize">{reward.tier}</span>
                <span class="text-sm text-muted-foreground">
                  {formatAltarRewardTier(reward.tier)}
                </span>
              </div>
              {#if reward.itemId && reward.itemName}
                <div class="flex items-center justify-between">
                  <ItemLink
                    itemId={reward.itemId}
                    itemName={reward.itemName}
                    tooltipHtml={reward.tooltipHtml}
                  />
                  {#if reward.dropRate !== null}
                    <span class="text-sm text-muted-foreground">
                      {formatPercent(reward.dropRate)}
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Boss Section -->
  {#if data.bosses.length > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Skull class="h-5 w-5 text-red-500" />
          {isForgotten ? "Final Wave Boss" : "Boss"}
        </Card.Title>
      </Card.Header>
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
                  Base Lv {boss.level} → Scaled Lv {getScaledLevel(boss.level)}
                {:else}
                  Level {boss.level}
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Waves Section -->
  {#if data.waves.length > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Swords class="h-5 w-5 text-red-500" />
          Waves ({data.waves.length})
        </Card.Title>
      </Card.Header>
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
                    Boss Wave
                  </span>
                {/if}
                {#if wave.require_all_monsters_cleared && !isLastWave}
                  <span
                    class="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400"
                  >
                    Must clear all monsters to proceed
                  </span>
                {/if}
              </h3>
              <div class="flex gap-3 text-sm text-muted-foreground">
                {#if wave.seconds_before_start > 0}
                  <span class="flex items-center gap-1">
                    <Timer class="h-4 w-4" />
                    Starts after {formatDuration(wave.seconds_before_start)}
                  </span>
                {/if}
                {#if timingInfo}
                  <span class="flex items-center gap-1">
                    <svelte:component this={timingInfo.icon} class="h-4 w-4" />
                    {timingInfo.label}
                  </span>
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
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {#if monster.count > 1}
                        {monster.count}x
                      {/if}
                      {monster.monsterName}
                    </a>
                    <span class="text-muted-foreground">
                      {#if isForgotten && data.altar.usesVeteranScaling}
                        Base Lv {monster.baseLevel} → Scaled Lv {getScaledLevel(
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
                    <p class="text-sm text-muted-foreground">On wave start:</p>
                    <p class="italic">"{wave.init_wave_message}"</p>
                  </div>
                {/if}
                {#if wave.finish_wave_message}
                  <div>
                    <p class="text-sm text-muted-foreground">
                      On wave completion:
                    </p>
                    <p class="italic">"{wave.finish_wave_message}"</p>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Failure message (final wave only) -->
            {#if isLastWave}
              <div class="mt-3 pt-3 border-t">
                <p class="text-sm text-muted-foreground">On time expired:</p>
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
  {/if}
</div>
