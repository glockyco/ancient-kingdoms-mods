<script lang="ts">
  import type { Command as CommandPrimitive } from "bits-ui";
  import { Dialog as DialogPrimitive } from "bits-ui";
  import type { Snippet } from "svelte";
  import XIcon from "@lucide/svelte/icons/x";
  import Command from "./command.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import type { WithoutChildrenOrChild } from "$lib/utils.js";
  import { trackVisualViewport } from "$lib/utils/visual-viewport";

  let {
    open = $bindable(false),
    ref = $bindable(null),
    value = $bindable(""),
    title = "Command Palette",
    description = "Search for a command to run",
    portalProps,
    children,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.RootProps> &
    WithoutChildrenOrChild<CommandPrimitive.RootProps> & {
      portalProps?: DialogPrimitive.PortalProps;
      children: Snippet;
      title?: string;
      description?: string;
    } = $props();
</script>

<!-- The query field stays where it opened while results arrive. Wider
     screens anchor the dialog near the top, and phones fill the part of the
     screen above the on-screen keyboard. -->
<Dialog.Root bind:open {...restProps}>
  <Dialog.Header class="sr-only">
    <Dialog.Title>{title}</Dialog.Title>
    <Dialog.Description>{description}</Dialog.Description>
  </Dialog.Header>
  <Dialog.Content
    class="top-[12vh] translate-y-0 overflow-hidden p-0 max-sm:start-0 max-sm:top-[var(--visual-viewport-top,0px)] max-sm:h-[var(--visual-viewport-height,100dvh)] max-sm:max-w-none max-sm:translate-x-0 max-sm:rounded-none max-sm:border-0"
    showCloseButton={false}
    {portalProps}
    {@attach trackVisualViewport}
  >
    <Command
      class="**:data-[slot=command-input-wrapper]:h-12 **:data-[slot=command-input-wrapper]:pe-12 [&_[data-command-group]:not([hidden])_~[data-command-group]]:pt-0 [&_[data-command-group]]:px-2 [&_[data-command-input-wrapper]_svg]:h-5 [&_[data-command-input-wrapper]_svg]:w-5 [&_[data-command-input]]:h-12 [&_[data-command-item]]:px-2 [&_[data-command-item]]:py-3 [&_[data-command-item]_svg]:h-5 [&_[data-command-item]_svg]:w-5"
      {...restProps}
      bind:value
      bind:ref
      {children}
    />
    <DialogPrimitive.Close
      class="absolute end-1 top-1 grid size-10 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <XIcon class="size-5" aria-hidden="true" />
      <span class="sr-only">Close</span>
    </DialogPrimitive.Close>
  </Dialog.Content>
</Dialog.Root>
