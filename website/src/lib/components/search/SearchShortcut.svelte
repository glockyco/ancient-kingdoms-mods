<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    class?: string;
  }
  let { class: className = "" }: Props = $props();

  // Set after hydration, so the server-rendered hint and the first client
  // render agree.
  let isMac = $state(false);
  onMount(() => {
    isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  });
</script>

<kbd
  class="pointer-events-none rounded border bg-muted px-1.5 font-mono text-sm text-muted-foreground {className}"
>
  {isMac ? "⌘" : "Ctrl "}K
</kbd>
