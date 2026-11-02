<script lang="ts">
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";

  let { text }: { text: string } = $props();
  let copied = $state(false);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

{#each text.split(/(`[^`]+`)/) as part, i (i)}
  {#if part.startsWith("`")}
    <span
      class="mt-2 flex w-full max-w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border bg-muted/50 py-1.5 pr-1.5 pl-3"
    >
      <code class="font-mono text-sm text-foreground">{part.slice(1, -1)}</code>
      <button
        type="button"
        class="ml-auto flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        onclick={() => copy(part.slice(1, -1))}
      >
        {#if copied}<Check
            class="size-3.5"
            aria-hidden="true"
          />Copied{:else}<Copy class="size-3.5" aria-hidden="true" />Copy{/if}
      </button>
    </span>
  {:else}{part}{/if}
{/each}
