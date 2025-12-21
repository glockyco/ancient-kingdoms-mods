<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import Compass from "@lucide/svelte/icons/compass";
  import Trophy from "@lucide/svelte/icons/trophy";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Skull from "@lucide/svelte/icons/skull";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Combine from "@lucide/svelte/icons/combine";
  import HelpCircle from "@lucide/svelte/icons/help-circle";
  import { SvelteSet } from "svelte/reactivity";

  let { data } = $props();

  let expandedBooks = new SvelteSet<string>();

  function toggleBook(bookId: string) {
    if (expandedBooks.has(bookId)) {
      expandedBooks.delete(bookId);
    } else {
      expandedBooks.add(bookId);
    }
  }

  function handleRowKeydown(e: KeyboardEvent, bookId: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleBook(bookId);
    }
  }

  const sourceIcons = {
    drop: Skull,
    quest: ScrollText,
    merge: Combine,
    unknown: HelpCircle,
  } as const;

  const sourceColors = {
    drop: "text-red-500",
    quest: "text-blue-500",
    merge: "text-purple-500",
    unknown: "text-muted-foreground",
  } as const;

  function hasObtainabilityInfo(book: (typeof data.books)[0]): boolean {
    const tree = book.obtainabilityTree;
    return (
      (tree.sources && tree.sources.length > 0) ||
      !!tree.recipe ||
      !!tree.service ||
      !!tree.merge
    );
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
        <span class="whitespace-nowrap">Books: {data.books.length}</span>
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1">
            <Trophy class="h-4 w-4" />
            Achievement: {data.profession.steam_achievement_name}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Books Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <BookOpen class="h-5 w-5 text-indigo-500" />
      Books ({data.books.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="w-10 p-3"></th>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-left p-3 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {#each data.books as book (book.id)}
            {@const isExpanded = expandedBooks.has(book.id)}
            {@const SourceIcon = sourceIcons[book.sourceSummary.type]}
            <tr
              class="border-t hover:bg-muted/30 cursor-pointer"
              role="button"
              tabindex="0"
              onclick={() => toggleBook(book.id)}
              onkeydown={(e) => handleRowKeydown(e, book.id)}
            >
              <td class="p-3">
                <button
                  class="p-0.5 rounded hover:bg-muted transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {#if isExpanded}
                    <ChevronDown class="h-4 w-4 text-muted-foreground" />
                  {:else}
                    <ChevronRight class="h-4 w-4 text-muted-foreground" />
                  {/if}
                </button>
              </td>
              <td class="p-3">
                <span
                  role="presentation"
                  onclick={(e) => e.stopPropagation()}
                  onkeydown={(e) => e.stopPropagation()}
                >
                  <ItemLink
                    itemId={book.id}
                    itemName={book.name}
                    tooltipHtml={book.tooltip_html}
                  />
                </span>
              </td>
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <SourceIcon
                    class="h-4 w-4 shrink-0 {sourceColors[
                      book.sourceSummary.type
                    ]}"
                  />
                  {#if book.sourceSummary.linkHref}
                    <a
                      href={book.sourceSummary.linkHref}
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      onclick={(e) => e.stopPropagation()}
                    >
                      {book.sourceSummary.label}
                    </a>
                  {:else}
                    <span
                      class={book.sourceSummary.type === "unknown"
                        ? "text-muted-foreground"
                        : ""}
                    >
                      {book.sourceSummary.label}
                    </span>
                  {/if}
                </div>
              </td>
            </tr>
            {#if isExpanded}
              <tr class="border-t bg-muted/20">
                <td colspan="3" class="p-4">
                  <div class="space-y-4">
                    <!-- Obtainability Section -->
                    {#if hasObtainabilityInfo(book)}
                      <div>
                        <h4
                          class="text-sm font-semibold text-muted-foreground mb-2"
                        >
                          How to Obtain
                        </h4>
                        <div
                          class="bg-background rounded-md p-3 border overflow-x-auto"
                        >
                          <ObtainabilityTree
                            node={book.obtainabilityTree}
                            defaultExpanded={true}
                            hideRootLink={true}
                          />
                        </div>
                      </div>
                    {/if}

                    <!-- Lore Section -->
                    <div>
                      <h4
                        class="text-sm font-semibold text-muted-foreground mb-2"
                      >
                        Lore
                      </h4>
                      <div
                        class="bg-background rounded-md p-4 border prose prose-sm dark:prose-invert max-w-none"
                      >
                        <p class="whitespace-pre-wrap text-sm leading-relaxed">
                          {book.book_text}
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>
