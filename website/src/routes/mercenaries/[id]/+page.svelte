<script lang="ts">
  import MercenaryDetail from "$lib/components/MercenaryDetail.svelte";

  let { data } = $props();
</script>

<MercenaryDetail
  pet={data.pet}
  description={data.description}
  links={data.links}
/>
