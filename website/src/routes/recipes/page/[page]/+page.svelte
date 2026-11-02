<script lang="ts">
  import ListPage from "../../+page.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<ListPage {data} />
