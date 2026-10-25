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
     * A header badge, a label inside a row or a sentence, or the unlinked
     * heading of the season's own section.
     */
    variant?: "badge" | "inline" | "title";
    /** Put the article a sentence needs before the name, as in "the Winter Festival". */
    inSentence?: boolean;
  }

  let { season, variant = "inline", inSentence = false }: Props = $props();

  // Each season has one icon and tone everywhere it is named.
  const PRESENTATION: Record<Season, { icon: Component; tone: string }> = {
    halloween: { icon: Ghost, tone: "text-orange-500" },
    christmas: { icon: Snowflake, tone: "text-sky-500" },
  };

  const Icon = $derived(PRESENTATION[season].icon);
  const article = $derived(inSentence ? SEASONS[season].article : null);
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

{#if article}{`${article} `}{/if}{#if variant === "title"}
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
