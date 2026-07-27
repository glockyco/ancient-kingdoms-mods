<script lang="ts">
  import PetDetail from "$lib/components/PetDetail.svelte";

  let { data } = $props();
</script>

<PetDetail pet={data.pet} description={data.description} />
