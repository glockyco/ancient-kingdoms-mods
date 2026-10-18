<script lang="ts">
  import type { Snippet } from "svelte";
  import Flame from "@lucide/svelte/icons/flame";
  import Heart from "@lucide/svelte/icons/heart";
  import Shield from "@lucide/svelte/icons/shield";
  import Skull from "@lucide/svelte/icons/skull";
  import Snowflake from "@lucide/svelte/icons/snowflake";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Sword from "@lucide/svelte/icons/sword";
  import Bug from "@lucide/svelte/icons/bug";
  import WandSparkles from "@lucide/svelte/icons/wand-sparkles";
  import { statName, formatStat } from "$lib/stats";

  interface Props {
    titleId: string;
    title: string;
    imageSrc: string | null;
    imageAlt: string;
    imageWidth?: number | null;
    imageHeight?: number | null;
    health: number;
    damage: number;
    magicDamage: number;
    defense: number;
    magicResist: number;
    poisonResist: number;
    fireResist: number;
    coldResist: number;
    diseaseResist: number;
    metadata?: Snippet;
  }

  let {
    titleId,
    title,
    imageSrc,
    imageAlt,
    imageWidth,
    imageHeight,
    health,
    damage,
    magicDamage,
    defense,
    magicResist,
    poisonResist,
    fireResist,
    coldResist,
    diseaseResist,
    metadata,
  }: Props = $props();
</script>

<section aria-labelledby={titleId}>
  <h2 id={titleId} class="sr-only">{title}</h2>
  <div class="bg-muted/30 rounded-md border p-4">
    <div
      class="flex flex-wrap items-center gap-4 md:grid md:grid-cols-[minmax(min-content,1fr)_minmax(20rem,1.5fr)_minmax(min-content,1fr)] md:gap-6"
    >
      <div class="order-2 min-w-min flex-1 space-y-2 text-sm md:order-none">
        <div class="flex items-center gap-3" title={statName("magic_resist")}>
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-700 text-teal-50 shadow-sm"
            aria-hidden="true"
          >
            <Sparkles class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("magic_resist")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("magic_resist", magicResist)}</span
          >
        </div>
        <div class="flex items-center gap-3" title={statName("poison_resist")}>
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-lime-700 text-lime-50 shadow-sm"
            aria-hidden="true"
          >
            <Skull class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("poison_resist")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("poison_resist", poisonResist)}</span
          >
        </div>
        <div class="flex items-center gap-3" title={statName("fire_resist")}>
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-700 text-red-50 shadow-sm"
            aria-hidden="true"
          >
            <Flame class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("fire_resist")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("fire_resist", fireResist)}</span
          >
        </div>
        <div class="flex items-center gap-3" title={statName("cold_resist")}>
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-700 text-sky-50 shadow-sm"
            aria-hidden="true"
          >
            <Snowflake class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("cold_resist")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("cold_resist", coldResist)}</span
          >
        </div>
        <div class="flex items-center gap-3" title={statName("disease_resist")}>
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-emerald-50 shadow-sm"
            aria-hidden="true"
          >
            <Bug class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("disease_resist")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("disease_resist", diseaseResist)}</span
          >
        </div>
      </div>

      <div
        class="order-1 flex basis-full flex-col items-center gap-3 md:order-none"
      >
        {#if imageSrc}
          <div class="flex h-56 w-full items-center justify-center md:h-64">
            <img
              src={imageSrc}
              alt={imageAlt}
              width={imageWidth ?? undefined}
              height={imageHeight ?? undefined}
              class="h-auto w-auto max-w-full object-contain [image-rendering:pixelated] max-h-56 md:max-h-64"
            />
          </div>
        {/if}

        <div
          class="inline-flex items-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400"
          title={statName("health")}
        >
          <Heart class="h-5 w-5 fill-current" aria-hidden="true" />
          <span class="sr-only">{statName("health")}: </span>
          {formatStat("health", health)}
        </div>
      </div>

      <div class="order-3 min-w-min flex-1 space-y-2 text-sm md:order-none">
        <div
          class="flex min-w-0 flex-row-reverse items-center gap-3 text-right"
          title={statName("attack_power")}
        >
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-800 text-red-50 shadow-sm"
            aria-hidden="true"
          >
            <Sword class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("attack_power")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("attack_power", damage)}</span
          >
        </div>
        <div
          class="flex min-w-0 flex-row-reverse items-center gap-3 text-right"
          title={statName("spell_power")}
        >
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-700 text-violet-50 shadow-sm"
            aria-hidden="true"
          >
            <WandSparkles class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("spell_power")}: </span>
          <span class="min-w-0 text-lg font-semibold break-words"
            >{formatStat("spell_power", magicDamage)}</span
          >
        </div>
        <div
          class="flex min-w-0 flex-row-reverse items-center gap-3 text-right"
          title={statName("armor_class")}
        >
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-700 text-slate-100 shadow-sm"
            aria-hidden="true"
          >
            <Shield class="h-5 w-5" />
          </span>
          <span class="sr-only">{statName("armor_class")}: </span>
          <span class="text-lg font-semibold"
            >{formatStat("armor_class", defense)}</span
          >
        </div>
        {@render metadata?.()}
      </div>
    </div>
  </div>
</section>
