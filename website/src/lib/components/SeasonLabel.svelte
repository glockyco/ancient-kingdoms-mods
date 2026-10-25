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
     * A label inside a row, a header badge, the unlinked heading of the
     * season's own section, or an icon beside a name in a table row, where a
     * text label would wrap the row. Sentences name a season as plain text
     * through seasonInSentence, because a muted label inside prose does not
     * read as a link.
     */
    variant?: "badge" | "inline" | "title" | "icon";
  }

  let { season, variant = "inline" }: Props = $props();

  // Each season has one icon and tone everywhere it is named. The light tones
  // keep 3:1 against cards and table stripes, because the icon alone carries
  // the season in table rows.
  const PRESENTATION: Record<Season, { icon: Component; tone: string }> = {
    halloween: {
      icon: Ghost,
      tone: "text-orange-600 dark:text-orange-500",
    },
    christmas: {
      icon: Snowflake,
      tone: "text-sky-600 dark:text-sky-500",
    },
  };

  const Icon = $derived(PRESENTATION[season].icon);
  const description = $derived(
    `${SEASONS[season].name}, ${seasonDates(season)}`,
  );
</script>

{#snippet content()}
  <Icon
    class="{variant === 'title'
      ? 'size-[1em]'
      : ICON_BADGE.iconSize} shrink-0 {PRESENTATION[season].tone}"
    aria-hidden="true"
  />
  {SEASONS[season].name}
{/snippet}

{#if variant === "title"}
  <span class="inline-flex items-center gap-2">{@render content()}</span>
{:else if variant === "icon"}
  <a
    href={seasonHref(season)}
    title={description}
    aria-label={SEASONS[season].name}
    class="inline-flex shrink-0 rounded-sm p-0.5 align-middle hover:bg-muted"
  >
    <Icon
      class="{ICON_BADGE.iconSize} {PRESENTATION[season].tone}"
      aria-hidden="true"
    />
  </a>
{:else}
  <a
    href={seasonHref(season)}
    title={description}
    class={variant === "badge"
      ? `${ICON_BADGE.base} ${ICON_BADGE.link}`
      : "inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground hover:text-foreground hover:underline"}
  >
    {@render content()}
  </a>
{/if}
