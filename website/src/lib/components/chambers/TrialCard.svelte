<!--
  One trial: a capture or the tracker's lines on the left, the working label, the game's
  objective line and the explanation on the right. Every card has the same media slot,
  so a column of cards lines up.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    id,
    label,
    phrase,
    media,
    children,
  }: {
    id: string;
    label: string;
    phrase: string;
    media: Snippet;
    children: Snippet;
  } = $props();
</script>

<li
  {id}
  class="grid scroll-mt-20 gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
>
  <div>{@render media()}</div>
  <div class="space-y-2 text-muted-foreground">
    <h3 class="text-lg font-semibold text-foreground">
      {label}
      <span class="block text-sm font-normal text-muted-foreground"
        >{phrase}</span
      >
    </h3>
    {@render children()}
  </div>
</li>
