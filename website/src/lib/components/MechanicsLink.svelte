<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    section: string;
    children: Snippet;
  }

  let { section, children }: Props = $props();
</script>

<a
  href="/mechanics/{section}"
  class="text-blue-600 hover:underline dark:text-blue-400"
  >{@render children()}</a
>
