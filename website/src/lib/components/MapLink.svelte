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
    /** What the map shows, so a list of compact links reads apart to assistive technology. */
    name?: string;
  }

  let { entityId, entityType, compact = false, name }: Props = $props();

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
    class="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-sm transition-colors hover:bg-muted"
    aria-label={name ? `Show ${name} on the map` : undefined}
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
