<!--
  The one table style of a reference page. Pass ordinary thead and tbody markup.
  Rows alternate across the full width. A tbody can open with a row-group
  header, <tr><th colspan="…" scope="rowgroup">…</th></tr>, which the striping
  skips. A table with many columns sets minWidth, so on a narrow screen it
  scrolls sideways instead of squeezing its columns to a word per line.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Read by screen readers; the topic heading already names the table for sighted readers. */
    caption: string;
    /** CSS width below which the table scrolls sideways, such as "40rem". */
    minWidth?: string;
    children: Snippet;
  }

  let { caption, minWidth, children }: Props = $props();
</script>

<div class="ref-table overflow-x-auto">
  <table
    class="w-full border-collapse text-sm leading-normal"
    style:min-width={minWidth}
  >
    <caption class="sr-only">{caption}</caption>
    {@render children()}
  </table>
</div>

<style>
  .ref-table :global(thead th) {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: bottom;
    font-weight: 600;
    color: var(--foreground);
  }

  .ref-table :global(tbody td),
  .ref-table :global(tbody th[scope="row"]) {
    padding: 0.5rem 0.75rem;
    text-align: left;
    vertical-align: top;
  }

  .ref-table :global(tbody th[scope="row"]) {
    font-weight: 500;
    color: var(--foreground);
  }

  .ref-table
    :global(tbody tr:nth-child(odd of :not(:has(> th[scope="rowgroup"])))) {
    background: color-mix(in oklab, var(--muted) 60%, transparent);
  }

  .ref-table :global(th[scope="rowgroup"]) {
    padding: 0.875rem 0.75rem 0.375rem;
    text-align: left;
    font-weight: 600;
    color: var(--foreground);
  }

  .ref-table :global(tbody + tbody th[scope="rowgroup"]) {
    border-top: 1px solid var(--border);
  }
</style>
