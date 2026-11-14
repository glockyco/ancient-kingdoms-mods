<!--
  The lines the game's quest tracker shows for a trial, in its dark panel with the gold
  chamber line, for trials that have no capture of their own.
-->
<script lang="ts">
  let {
    chamber,
    roomCount,
    lines,
  }: { chamber: number; roomCount: number; lines: readonly string[] } =
    $props();
</script>

<figure class="min-w-0">
  <div
    class="flex aspect-video w-full flex-col justify-center gap-1 rounded-lg border bg-zinc-900 p-4 text-sm text-zinc-100"
    role="img"
    aria-label={`Quest tracker: Chamber ${chamber}/${roomCount}, ${lines.join(", ")}`}
  >
    <!-- Source: server-scripts/MadMageTowerClient.cs:Refresh; MadMageTowerText.cs:room — the tracker's first line is "Chamber {n}/3" in gold, followed by the trial's objective line. -->
    <p class="font-semibold text-amber-500">Chamber {chamber}/{roomCount}</p>
    {#each lines as line (line)}
      <p>{line}</p>
    {/each}
  </div>
  <figcaption class="mt-1.5 text-xs text-muted-foreground">
    The quest tracker's lines in this chamber.
  </figcaption>
</figure>
