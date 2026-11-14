<!--
  The keeper who lets a player into the Chambers. The role label is the same one the
  keeper's own page and the NPC filters use.
-->
<script lang="ts">
  import { resolve } from "$app/paths";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import { getRoleLabel } from "$lib/utils/roles";

  let {
    keeper,
    class: className = "",
  }: {
    keeper: {
      id: string;
      name: string;
      visual_public_path: string | null;
      zone_id: string | null;
      zone_name: string | null;
      sub_zone_name: string | null;
    };
    class?: string;
  } = $props();
</script>

<div class="flex items-center gap-3 rounded-lg border bg-card p-3 {className}">
  <a
    href={resolve("/npcs/[id]", { id: keeper.id })}
    class="shrink-0"
    tabindex="-1"
    aria-hidden="true"
  >
    <EntityIcon
      src={keeper.visual_public_path ? `/${keeper.visual_public_path}` : null}
      alt=""
      size={56}
    />
  </a>
  <div class="min-w-0 text-sm">
    <a
      href={resolve("/npcs/[id]", { id: keeper.id })}
      class="text-base font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >{keeper.name}</a
    >
    <p class="text-muted-foreground">
      {getRoleLabel("is_chambers_of_chaos_keeper")}
    </p>
    {#if keeper.zone_id && keeper.zone_name}
      <p>
        <a
          href={resolve("/zones/[id]", { id: keeper.zone_id })}
          class="text-blue-600 hover:underline dark:text-blue-400"
          >{keeper.sub_zone_name ?? keeper.zone_name}</a
        >
      </p>
    {/if}
  </div>
</div>
