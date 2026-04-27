<script lang="ts" module>
  import type { RouteId } from "$app/types";

  export interface BreadcrumbItem {
    label: string;
    href?: RouteId | { route: RouteId; params: Record<string, string> };
  }

  export interface BreadcrumbProps {
    items: BreadcrumbItem[];
  }
</script>

<script lang="ts">
  import { resolve } from "$app/paths";
  import { canonicalUrl } from "$lib/seo/site";

  let { items }: BreadcrumbProps = $props();

  function resolveHref(
    href:
      | RouteId
      | { route: RouteId; params: Record<string, string> }
      | undefined,
  ): string | undefined {
    if (!href) return undefined;

    // Handle route object with params
    if (typeof href === "object" && "route" in href) {
      // Type assertion at I/O boundary - resolve() has complex overloaded types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return resolve(href.route as any, href.params as any);
    }

    // Handle simple string route
    // Type assertion at I/O boundary - resolve() has complex overloaded types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resolve(href as any);
  }

  /**
   * BreadcrumbList JSON-LD mirroring the visible trail. Google uses this to
   * render "Home > Items > Foo" in the SERP instead of the workers.dev host.
   */
  const breadcrumbLd = $derived.by(() => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const path = resolveHref(item.href);
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
      };
      if (path) entry.item = canonicalUrl(path);
      return entry;
    }),
  }));
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags — JSON.stringify output is structured data, not user HTML; the </ + script> split avoids the Svelte parser closing the surrounding script block -->
  {@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</` +
    `script>`}
</svelte:head>

<nav aria-label="Breadcrumb" class="mb-4">
  <ol class="flex items-center gap-2 text-sm text-muted-foreground">
    {#each items as item, index (index)}
      <li class="flex items-center gap-2">
        {#if index > 0}
          <span class="text-muted-foreground/50">/</span>
        {/if}

        {#if item.href && index < items.length - 1}
          <a
            href={resolveHref(item.href)}
            class="hover:text-foreground transition-colors"
          >
            {item.label}
          </a>
        {:else}
          <span class="text-foreground font-medium">
            {item.label}
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
