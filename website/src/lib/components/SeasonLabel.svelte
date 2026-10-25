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
    /** A header badge, or a label inside a row or a sentence. */
    variant?: "badge" | "inline";
  }

  let { season, variant = "inline" }: Props = $props();

  // Each season has one icon and tone everywhere it is named.
  const PRESENTATION: Record<Season, { icon: Component; tone: string }> = {
    halloween: { icon: Ghost, tone: "text-orange-500" },
    christmas: { icon: Snowflake, tone: "text-sky-500" },
  };

  const Icon = $derived(PRESENTATION[season].icon);
</script>

<a
  href={seasonHref(season)}
  title="{SEASONS[season].name}, {seasonDates(season)} (UTC dates)"
  class={variant === "badge"
    ? `${ICON_BADGE.base} ${ICON_BADGE.link}`
    : "inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground hover:text-foreground hover:underline"}
>
  <Icon
    class="{ICON_BADGE.iconSize} shrink-0 {PRESENTATION[season].tone}"
    aria-hidden="true"
  />
  {SEASONS[season].name}
</a>
