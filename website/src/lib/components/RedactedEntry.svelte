<script lang="ts">
  import {
    REDACTED_HOVER,
    redactedCountLabel,
    type RedactedKind,
  } from "$lib/utils/redacted";

  let {
    kind,
    slot = true,
    count = 1,
  }: {
    kind: RedactedKind;
    /** The dashed slot stands where an icon would, so names stay aligned in lists. */
    slot?: boolean;
    count?: number;
  } = $props();
</script>

{#if slot}
  <span
    class="inline-flex items-center gap-2 align-middle text-muted-foreground"
    title={REDACTED_HOVER}
  >
    <span
      class="inline-flex size-7 shrink-0 rounded-md border border-dashed border-current opacity-60"
      aria-hidden="true"
    ></span>
    <span>{redactedCountLabel(kind, count)}</span>
  </span>
{:else}
  <!-- Inline in running text: a dashed box sized to the line stands where the icon would, on the surrounding baseline. -->
  <span class="whitespace-nowrap text-muted-foreground" title={REDACTED_HOVER}
    ><span
      class="mr-[0.3em] inline-block size-[1.1em] rounded-[0.2em] border border-dashed border-current align-[-0.2em] opacity-60"
      aria-hidden="true"
    ></span>{redactedCountLabel(kind, count)}</span
  >
{/if}
