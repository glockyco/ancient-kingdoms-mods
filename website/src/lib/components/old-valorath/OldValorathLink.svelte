<script lang="ts">
  import { oldValorathNotice } from "./notice-state.svelte";
</script>

<button
  type="button"
  class="cursor-pointer text-sm text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 transition-colors hover:text-foreground hover:decoration-foreground"
  aria-haspopup="dialog"
  onclick={() => (oldValorathNotice.open = true)}
>
  Why Old Valorath is missing from the Compendium
</button>
