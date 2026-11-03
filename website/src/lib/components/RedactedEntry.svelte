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

<span
  class="inline-flex items-center gap-2 align-middle text-muted-foreground"
  title={REDACTED_HOVER}
>
  {#if slot}
    <span
      class="inline-flex size-7 shrink-0 rounded-md border border-dashed border-current opacity-60"
      aria-hidden="true"
    ></span>
  {/if}
  <span>{redactedCountLabel(kind, count)}</span>
</span>
