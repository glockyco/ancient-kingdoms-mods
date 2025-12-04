<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import Compass from "@lucide/svelte/icons/compass";
  import Trophy from "@lucide/svelte/icons/trophy";

  let { data } = $props();

  const qualityNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

  function getQualityName(quality: number): string {
    return qualityNames[quality] ?? `Q${quality}`;
  }
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession.description} View all books to collect."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <!-- Header -->
  <div class="flex items-start gap-4">
    <div
      class="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0"
    >
      <Compass class="h-8 w-8 text-blue-500 dark:text-blue-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-blue-500 dark:text-blue-400 font-medium"
        >
          Exploration
        </span>
      </div>
      <p class="text-muted-foreground mt-1">{data.profession.description}</p>

      <div class="flex items-center gap-4 mt-3 text-muted-foreground">
        {#if data.profession.tracking_type === "count_based" && data.profession.tracking_denominator}
          <span
            >Progress: 0 / {data.profession.tracking_denominator} books</span
          >
        {/if}
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1">
            <Trophy class="h-4 w-4" />
            Steam Achievement
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Books Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">
      Books ({data.books.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-left p-3 font-medium">Quality</th>
          </tr>
        </thead>
        <tbody>
          {#each data.books as book (book.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <ItemLink
                  itemId={book.id}
                  itemName={book.name}
                  tooltipHtml={book.tooltip_html}
                />
              </td>
              <td class="p-3">
                <span
                  class="px-2 py-0.5 rounded text-xs font-medium text-white bg-quality-{book.quality}"
                >
                  {getQualityName(book.quality)}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>
