<script lang="ts">
  import type { Snippet } from "svelte";
  import Flame from "@lucide/svelte/icons/flame";
  import Heart from "@lucide/svelte/icons/heart";
  import Shield from "@lucide/svelte/icons/shield";
  import Skull from "@lucide/svelte/icons/skull";
  import Snowflake from "@lucide/svelte/icons/snowflake";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Sword from "@lucide/svelte/icons/sword";

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

  function formatCompactNumber(value: number): string {
    if (value >= 10000) {
      return `${Math.round(value / 1000).toLocaleString()}K`;
    }

    return value.toLocaleString();
  }
</script>

<section aria-labelledby={titleId}>
  <h2 id={titleId} class="sr-only">{title}</h2>
  <div class="bg-muted/30 rounded-md border p-4">
    <div
      class="grid grid-cols-2 items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(20rem,1.5fr)_minmax(0,1fr)] md:gap-6"
    >
      <div class="order-2 space-y-2 text-sm md:order-none">
        <div class="flex items-center gap-3" title="Magic Resist">
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-700 text-teal-50 shadow-sm"
            aria-hidden="true"
          >
            <Sparkles class="h-5 w-5" />
          </span>
          <span class="sr-only">Magic Resist: </span>
          <span class="text-lg font-semibold"
            >{magicResist.toLocaleString()}</span
          >
        </div>
        <div class="flex items-center gap-3" title="Poison Resist">
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-lime-700 text-lime-50 shadow-sm"
            aria-hidden="true"
          >
            <Skull class="h-5 w-5" />
          </span>
          <span class="sr-only">Poison Resist: </span>
          <span class="text-lg font-semibold"
            >{poisonResist.toLocaleString()}</span
          >
        </div>
        <div class="flex items-center gap-3" title="Fire Resist">
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-700 text-red-50 shadow-sm"
            aria-hidden="true"
          >
            <Flame class="h-5 w-5" />
          </span>
          <span class="sr-only">Fire Resist: </span>
          <span class="text-lg font-semibold"
            >{fireResist.toLocaleString()}</span
          >
        </div>
        <div class="flex items-center gap-3" title="Cold Resist">
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-700 text-sky-50 shadow-sm"
            aria-hidden="true"
          >
            <Snowflake class="h-5 w-5" />
          </span>
          <span class="sr-only">Cold Resist: </span>
          <span class="text-lg font-semibold"
            >{coldResist.toLocaleString()}</span
          >
        </div>
        <div class="flex items-center gap-3" title="Disease Resist">
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-emerald-50 shadow-sm"
            aria-hidden="true"
          >
            <Skull class="h-5 w-5" />
          </span>
          <span class="sr-only">Disease Resist: </span>
          <span class="text-lg font-semibold"
            >{diseaseResist.toLocaleString()}</span
          >
        </div>
      </div>

      <div
        class="order-1 col-span-2 flex flex-col items-center gap-3 md:order-none md:col-span-1"
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
          title="Health"
        >
          <Heart class="h-5 w-5 fill-current" aria-hidden="true" />
          <span class="sr-only">Health: </span>
          {formatCompactNumber(health)}
        </div>
      </div>

      <div class="order-3 min-w-0 space-y-2 text-sm md:order-none">
        <div
          class="flex min-w-0 flex-row-reverse items-center gap-3 text-right"
          title="Damage"
        >
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-800 text-red-50 shadow-sm"
            aria-hidden="true"
          >
            <Sword class="h-5 w-5" />
          </span>
          <span class="sr-only">Damage: </span>
          <span class="text-lg font-semibold">{damage.toLocaleString()}</span>
        </div>
        <div
          class="flex min-w-0 flex-row-reverse items-center gap-3 text-right"
          title="Magic Damage"
        >
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-700 text-violet-50 shadow-sm"
            aria-hidden="true"
          >
            <Sparkles class="h-5 w-5" />
          </span>
          <span class="sr-only">Magic Damage: </span>
          <span class="min-w-0 text-lg font-semibold break-words"
            >{magicDamage.toLocaleString()}</span
          >
        </div>
        <div
          class="flex min-w-0 flex-row-reverse items-center gap-3 text-right"
          title="Defense"
        >
          <span
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-700 text-slate-100 shadow-sm"
            aria-hidden="true"
          >
            <Shield class="h-5 w-5" />
          </span>
          <span class="sr-only">Defense: </span>
          <span class="text-lg font-semibold">{defense.toLocaleString()}</span>
        </div>
        {@render metadata?.()}
      </div>
    </div>
  </div>
</section>
