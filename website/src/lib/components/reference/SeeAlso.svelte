<!--
  Related topics at the end of a topic, instead of "See … for …" sentences
  scattered through its text.
-->
<script lang="ts">
  let { links }: { links: readonly { href: string; label: string }[] } =
    $props();
</script>

<p class="text-sm text-muted-foreground">
  See also
  {#each links as link, index (link.href)}{index > 0 ? " · " : " "}<a
      href={link.href}
      class="text-blue-600 hover:underline dark:text-blue-400">{link.label}</a
    >{/each}
</p>
