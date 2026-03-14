<script lang="ts">
  import type { FormulaDisplay } from "$lib/types/formula";

  let { display }: { display: FormulaDisplay } = $props();
</script>

{#if display.specialNote}
  <p class="text-sm text-muted-foreground">{display.specialNote}</p>
{:else}
  <dl class="space-y-2">
    {#if display.preMitigation}
      <div>
        <dt
          class="text-xs text-muted-foreground uppercase tracking-wide mb-0.5"
        >
          Pre-Mitigation
        </dt>
        <dd class="text-sm font-medium">{display.preMitigation}</dd>
      </div>
    {/if}
    {#each display.terms as term (term.label)}
      <div>
        <dt
          class="text-xs text-muted-foreground uppercase tracking-wide mb-0.5"
        >
          {term.label}
        </dt>
        <dd class="font-mono text-sm">{term.formula}</dd>
      </div>
    {/each}
  </dl>
{/if}
