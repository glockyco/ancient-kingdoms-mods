<!--
  The word "rounded" with its definition one hover, tap or key press away, so a
  reader who lands in the middle of a page still learns that halves go to the
  even number.
-->
<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";

  let { text = "rounded" }: { text?: string } = $props();

  let open = $state(false);
  let closing: ReturnType<typeof setTimeout> | undefined;

  function hover(pointer: PointerEvent) {
    if (pointer.pointerType !== "mouse") return;
    clearTimeout(closing);
    open = true;
  }

  function leave(pointer: PointerEvent) {
    if (pointer.pointerType !== "mouse") return;
    closing = setTimeout(() => (open = false), 150);
  }
</script>

<!-- No whitespace between the parts, so punctuation after the word stays attached. -->
<Popover.Root bind:open
  ><Popover.Trigger
    class="cursor-help underline decoration-muted-foreground decoration-dotted underline-offset-4"
    onpointerenter={hover}
    onpointerleave={leave}>{text}</Popover.Trigger
  ><Popover.Content
    class="w-64 p-3 text-sm leading-normal"
    onpointerenter={hover}
    onpointerleave={leave}
    onOpenAutoFocus={(event) => event.preventDefault()}
    >To the nearest whole number. Exact halves go to the even number, so 2.5
    becomes 2 and 3.5 becomes 4.</Popover.Content
  ></Popover.Root
>
