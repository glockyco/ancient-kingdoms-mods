<script lang="ts">
  interface Fact {
    value: string;
    label: string;
  }

  let { facts }: { facts: Fact[] } = $props();
</script>

<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  {#each facts as fact (fact.label)}
    <div
      class="flex flex-col-reverse rounded-lg border bg-background/40 px-4 py-3"
    >
      <dt class="text-sm text-muted-foreground">{fact.label}</dt>
      <dd class="text-2xl font-semibold tabular-nums">{fact.value}</dd>
    </div>
  {/each}
</dl>
