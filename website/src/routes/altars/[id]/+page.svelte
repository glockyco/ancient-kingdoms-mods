<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const styles = {
    link: "text-blue-600 dark:text-blue-400 hover:underline",
    label: "text-sm text-muted-foreground",
    value: "font-medium",
    valuePositive: "font-medium text-green-600 dark:text-green-400",
  } as const;

  interface AltarWaveMonster {
    monster_id: string;
    monster_name: string;
    base_level: number;
    spawn_location: {
      x: number;
      y: number;
      z: number;
    };
  }

  interface AltarWave {
    wave_number: number;
    init_wave_message: string;
    finish_wave_message: string;
    seconds_before_start: number;
    seconds_to_complete_wave: number;
    require_all_monsters_cleared: boolean;
    monsters: AltarWaveMonster[];
  }

  const waves = $derived.by((): AltarWave[] => {
    if (!data.altar.waves) return [];
    try {
      return JSON.parse(data.altar.waves) as AltarWave[];
    } catch {
      return [];
    }
  });
</script>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Altars", href: "/altars" },
      { label: data.altar.name },
    ]}
  />

  <!-- Header -->
  <div>
    <h1 class="text-4xl font-bold">{data.altar.name}</h1>
    <p class="text-muted-foreground">
      {data.altar.type === "forgotten" ? "Forgotten Altar" : "Avatar Altar"}
    </p>
  </div>

  <!-- Basic Information -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Basic Information</Card.Title>
    </Card.Header>
    <Card.Content>
      <dl class="grid grid-cols-2 gap-4">
        <div>
          <dt class={styles.label}>Type</dt>
          <dd class={styles.value}>
            {data.altar.type === "forgotten" ? "Forgotten Altar" : "Avatar Altar"}
          </dd>
        </div>
        <div>
          <dt class={styles.label}>Zone</dt>
          <dd class={styles.value}>
            {data.altar.zone_id}
          </dd>
        </div>
        {#if data.altar.min_level_required > 0}
          <div>
            <dt class={styles.label}>Minimum Level Required</dt>
            <dd class={styles.value}>{data.altar.min_level_required}</dd>
          </div>
        {/if}
        <div>
          <dt class={styles.label}>Total Waves</dt>
          <dd class={styles.value}>{data.altar.total_waves}</dd>
        </div>
        {#if data.altar.estimated_duration_seconds > 0}
          <div>
            <dt class={styles.label}>Estimated Duration</dt>
            <dd class={styles.value}>
              {Math.floor(data.altar.estimated_duration_seconds / 60)} minutes
            </dd>
          </div>
        {/if}
        {#if data.altar.required_activation_item_name}
          <div>
            <dt class={styles.label}>Activation Item</dt>
            <dd class={styles.value}>{data.altar.required_activation_item_name}</dd>
          </div>
        {/if}
      </dl>
    </Card.Content>
  </Card.Root>

  <!-- Rewards -->
  {#if data.altar.uses_veteran_scaling}
    <Card.Root>
      <Card.Header>
        <Card.Title>Rewards (Veteran Scaling)</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#if data.altar.reward_normal_name}
            <div>
              <span class={styles.label}>Normal (Eff. Lv 0-34):</span>
              <span class={styles.value}>{data.altar.reward_normal_name}</span>
            </div>
          {/if}
          {#if data.altar.reward_magic_name}
            <div>
              <span class={styles.label}>Magic (Eff. Lv 35-44):</span>
              <span class={styles.value}>{data.altar.reward_magic_name}</span>
            </div>
          {/if}
          {#if data.altar.reward_epic_name}
            <div>
              <span class={styles.label}>Epic (Eff. Lv 45-54):</span>
              <span class={styles.value}>{data.altar.reward_epic_name}</span>
            </div>
          {/if}
          {#if data.altar.reward_legendary_name}
            <div>
              <span class={styles.label}>Legendary (Eff. Lv 55+):</span>
              <span class={styles.value}>{data.altar.reward_legendary_name}</span>
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Waves -->
  {#if waves.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Event Waves</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-4">
          {#each waves as wave (wave.wave_number)}
            <div class="rounded-lg border p-4">
              <div class="mb-2">
                <h4 class="font-semibold">
                  Wave {wave.wave_number + 1}
                  {#if wave.init_wave_message}
                    - {wave.init_wave_message}
                  {/if}
                </h4>
                <p class={styles.label}>
                  Duration: {wave.seconds_to_complete_wave}s
                  {#if wave.seconds_before_start > 0}
                    (starts after {wave.seconds_before_start}s)
                  {/if}
                  {#if wave.require_all_monsters_cleared}
                    <span class="text-red-600">• Must clear all monsters</span>
                  {/if}
                </p>
              </div>
              <div class="space-y-1">
                {#each wave.monsters as monster}
                  <div class="flex justify-between text-sm">
                    <span>{monster.monster_name}</span>
                    <span class={styles.label}>Level {monster.base_level}</span>
                  </div>
                {/each}
              </div>
              {#if wave.finish_wave_message}
                <p class="mt-2 text-sm italic text-muted-foreground">
                  {wave.finish_wave_message}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
