<script lang="ts">
  import { Command as CommandPrimitive } from "bits-ui";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(""),
    placeholder,
    ...restProps
  }: CommandPrimitive.InputProps = $props();
</script>

<div
  class="flex h-9 items-center gap-2 border-b pe-8 ps-3"
  data-slot="command-input-wrapper"
>
  <SearchIcon class="size-4 shrink-0 opacity-50" />
  <!-- bits-ui labels the input by an empty generated label, so name it from
       aria-label or the placeholder instead. -->
  <CommandPrimitive.Input
    data-slot="command-input"
    class={cn(
      "placeholder:text-muted-foreground outline-hidden flex h-10 w-full rounded-md bg-transparent py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    bind:ref
    {placeholder}
    {...restProps}
    bind:value
  >
    {#snippet child({ props })}
      <input
        {...props}
        aria-labelledby={undefined}
        aria-label={restProps["aria-label"] ?? placeholder ?? "Search"}
        bind:value
      />
    {/snippet}
  </CommandPrimitive.Input>
</div>
