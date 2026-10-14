<!--
  Chooses which variant of a calculation or table to show. Options that fit on
  one line render as a segmented control; longer lists render as a select.
-->
<script lang="ts" generics="T extends string">
  interface Props {
    label: string;
    options: readonly { value: T; label: string }[];
    value: T;
  }

  let { label, options, value = $bindable() }: Props = $props();

  // About one line of buttons in the narrowest topic card.
  const asSelect = $derived(
    options.reduce((length, option) => length + option.label.length, 0) > 80,
  );
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
  {#if asSelect}
    <label class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span class="text-muted-foreground">{label}</span>
      <select
        bind:value
        class="h-9 rounded-md border border-input bg-background px-2.5 font-medium dark:bg-input/30"
      >
        {#each options as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>
  {:else}
    <span class="text-muted-foreground" aria-hidden="true">{label}</span>
    <div
      role="group"
      aria-label={label}
      class="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
    >
      {#each options as option (option.value)}
        <button
          type="button"
          aria-pressed={value === option.value}
          onclick={() => (value = option.value)}
          class="rounded-md px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
          >{option.label}</button
        >
      {/each}
    </div>
  {/if}
</div>
