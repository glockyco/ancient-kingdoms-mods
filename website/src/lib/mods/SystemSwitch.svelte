<script lang="ts">
  import { SYSTEMS, type SystemId } from "./install-systems";

  let { value = $bindable() }: { value: SystemId } = $props();
</script>

<!-- Phones get a list, because the three names don't fit side by side on one line. -->
<div role="radiogroup" aria-label="Your system">
  <div class="flex flex-col gap-1 sm:hidden">
    {#each SYSTEMS as system (system.id)}
      <button
        type="button"
        role="radio"
        aria-checked={value === system.id}
        onclick={() => (value = system.id)}
        class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors {value ===
        system.id
          ? 'bg-muted/60 text-foreground'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'}"
      >
        <span
          class="size-2 shrink-0 rounded-full {value === system.id
            ? 'bg-brand-gold'
            : 'bg-muted-foreground/40'}"
          aria-hidden="true"
        ></span>
        {system.label}
      </button>
    {/each}
  </div>
  <div
    class="hidden grid-cols-3 gap-1 rounded-lg border bg-muted/30 p-1 sm:grid"
  >
    {#each SYSTEMS as system (system.id)}
      <button
        type="button"
        role="radio"
        aria-checked={value === system.id}
        onclick={() => (value = system.id)}
        class="flex min-h-11 cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-center text-sm leading-tight font-medium text-balance transition-colors {value ===
        system.id
          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
          : 'text-muted-foreground hover:text-foreground'}"
      >
        {system.label}
      </button>
    {/each}
  </div>
</div>
