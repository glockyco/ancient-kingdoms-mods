<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Command as CommandPrimitive } from "bits-ui";

  export type CommandRootApi = CommandPrimitive.Root;

  let {
    api = $bindable(null),
    ref = $bindable(null),
    value = $bindable(""),
    class: className,
    // A command that opens scrolls its first item into view. In a popover
    // that happens before the popover is placed under its button, while it
    // still waits above the page, so the page scrolls to the top. A list
    // that just opened shows its first item without scrolling.
    disableInitialScroll = true,
    ...restProps
  }: CommandPrimitive.RootProps & {
    api?: CommandRootApi | null;
  } = $props();
</script>

<CommandPrimitive.Root
  bind:this={api}
  bind:value
  bind:ref
  {disableInitialScroll}
  data-slot="command"
  class={cn(
    "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
    className,
  )}
  {...restProps}
/>
