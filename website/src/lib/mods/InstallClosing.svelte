<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

  const REPORT_FORM =
    "https://github.com/glockyco/ancient-kingdoms-mods/issues/new?template=pocket-compendium-problem.yml";
  const DISCORD = "https://discord.gg/8MkSWjXwab";

  let { closing }: { closing: string[] } = $props();
</script>

<div class="space-y-4">
  {#each closing as paragraph (paragraph)}
    <div
      class="flex gap-3 rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-4"
    >
      <TriangleAlert
        class="mt-0.5 size-5 shrink-0 text-brand-gold"
        aria-hidden="true"
      />
      <p class="text-pretty">{paragraph}</p>
    </div>
  {/each}
  <p class="text-sm text-pretty text-muted-foreground">
    If something doesn't work, <a class="underline" href={REPORT_FORM}
      >report it on GitHub</a
    >
    or post in the compendium channel on the
    <a class="underline" href={DISCORD}>game's Discord</a>.
  </p>
</div>
