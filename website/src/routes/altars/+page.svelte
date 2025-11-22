<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const styles = {
    link: "text-blue-600 dark:text-blue-400 hover:underline",
    label: "text-sm text-muted-foreground",
    value: "font-medium",
  } as const;
</script>

<div class="container mx-auto p-8 space-y-8 max-w-7xl">
  <div>
    <h1 class="text-4xl font-bold">Altars</h1>
    <p class="text-muted-foreground">
      Event altars found throughout the world
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each data.altars as altar (altar.id)}
      <Card.Root>
        <Card.Header>
          <Card.Title>
            <a href={`/altars/${altar.id}`} class={styles.link}>
              {altar.name}
            </a>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <dl class="space-y-1">
            <div>
              <dt class={styles.label}>Type</dt>
              <dd class={styles.value}>
                {altar.type === "forgotten" ? "Forgotten Altar" : "Avatar Altar"}
              </dd>
            </div>
            <div>
              <dt class={styles.label}>Zone</dt>
              <dd class={styles.value}>{altar.zone_id}</dd>
            </div>
            <div>
              <dt class={styles.label}>Waves</dt>
              <dd class={styles.value}>{altar.total_waves}</dd>
            </div>
            {#if altar.min_level_required > 0}
              <div>
                <dt class={styles.label}>Min Level</dt>
                <dd class={styles.value}>{altar.min_level_required}</dd>
              </div>
            {/if}
          </dl>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>
</div>
