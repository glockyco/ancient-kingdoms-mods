<script lang="ts">
  import type { Component } from "svelte";
  import Ghost from "@lucide/svelte/icons/ghost";
  import Snowflake from "@lucide/svelte/icons/snowflake";
  import { ICON_BADGE } from "$lib/styles/badge";
  import {
    SEASONS,
    seasonDates,
    seasonHref,
    type Season,
  } from "$lib/data/seasonal-events";

  interface Props {
    season: Season;
    /**
     * A label inside a row, a header badge, or the unlinked heading of the
     * season's own section. Sentences name a season as plain text through
     * seasonInSentence, because a muted label inside prose does not read as
     * a link.
     */
    variant?: "badge" | "inline" | "title";
  }

  let { season, variant = "inline" }: Props = $props();

  // Each season has one icon and tone everywhere it is named.
  const PRESENTATION: Record<Season, { icon: Component; tone: string }> = {
    halloween: { icon: Ghost, tone: "text-orange-500" },
    christmas: { icon: Snowflake, tone: "text-sky-500" },
  };

  const Icon = $derived(PRESENTATION[season].icon);
</script>

{#snippet content()}
  <Icon
    class="{variant === 'title'
      ? 'size-6'
      : ICON_BADGE.iconSize} shrink-0 {PRESENTATION[season].tone}"
    aria-hidden="true"
  />
  {SEASONS[season].name}
{/snippet}

{#if variant === "title"}
  <span class="inline-flex items-center gap-2">{@render content()}</span>
{:else}
  <a
    href={seasonHref(season)}
    title="{SEASONS[season].name}, {seasonDates(season)} (UTC dates)"
    class={variant === "badge"
      ? `${ICON_BADGE.base} ${ICON_BADGE.link}`
      : "inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground hover:text-foreground hover:underline"}
  >
    {@render content()}
  </a>
{/if}
