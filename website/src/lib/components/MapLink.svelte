<script lang="ts">
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { base } from "$app/paths";
  import type { EntityId } from "$lib/entities/registry";

  // EntityId supplies canonical registry families; resource remains a legacy
  // map URL alias used by gathering-resource pages.
  type EntityType = EntityId | "resource";

  interface Props {
    entityId: string;
    entityType: EntityType;
    compact?: boolean;
  }

  let { entityId, entityType, compact = false }: Props = $props();

  const mapUrl = $derived.by(() => {
    if (entityType === "zone") {
      return `${base}/map?szone=${entityId}`;
    }
    return `${base}/map?entity=${entityId}&etype=${entityType}`;
  });
</script>

{#if compact}
  <a
    href={mapUrl}
    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs border bg-muted/50 transition-colors hover:bg-muted"
    title="View on map"
  >
    <MapPin class="h-3.5 w-3.5" />
    Map
  </a>
{:else}
  <a
    href={mapUrl}
    class="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
  >
    <MapPin class="h-3.5 w-3.5" />
    View on Map
  </a>
{/if}
