<!--
  Marks where the game behaves differently from its tooltips or its evident
  intent, so a reader relying on the tooltip notices. The text states the
  actual behaviour; the label says it is a bug.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Bug from "@lucide/svelte/icons/bug";

  let { children }: { children: Snippet } = $props();
</script>

<aside
  class="max-w-[72ch] rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3"
>
  <p
    class="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300"
  >
    <Bug class="size-4" aria-hidden="true" />
    Game bug
  </p>
  <div class="mt-1">{@render children()}</div>
</aside>
