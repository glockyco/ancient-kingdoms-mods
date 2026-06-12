<script lang="ts" module>
  import type { RouteId } from "$app/types";

  import { canonicalUrl } from "$lib/seo/site";

  export interface BreadcrumbItem {
    label: string;
    href?: RouteId | { route: RouteId; params: Record<string, string> };
  }

  export interface BreadcrumbProps {
    items: BreadcrumbItem[];
  }

  function jsonLdPath(
    href:
      | RouteId
      | { route: RouteId; params: Record<string, string> }
      | undefined,
  ): string | undefined {
    if (!href) return undefined;

    if (typeof href === "object" && "route" in href) {
      let path: string = href.route;
      for (const [key, value] of Object.entries(href.params)) {
        path = path.replace(`[${key}]`, value);
      }
      return path;
    }

    return href as string;
  }

  /**
   * BreadcrumbList JSON-LD mirroring the visible trail. Google uses this to
   * render "Home > Items > Foo" in the SERP instead of the workers.dev host.
   */
  export function buildBreadcrumbLd(items: BreadcrumbItem[]) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => {
        const path = jsonLdPath(item.href);
        const entry: Record<string, unknown> = {
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
        };
        if (path) entry.item = canonicalUrl(path);
        return entry;
      }),
    };
  }
</script>

<script lang="ts">
  import { resolve } from "$app/paths";
  import { serializeJsonLd } from "$lib/seo/jsonld";
  import SupportButton from "$lib/components/SupportButton.svelte";

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

  const breadcrumbLd = $derived(buildBreadcrumbLd(items));
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags — serializeJsonLd escapes script-tag breakout sequences; the </ + script> split avoids the Svelte parser closing the surrounding script block -->
  {@html `<script type="application/ld+json">${serializeJsonLd(breadcrumbLd)}</` +
    `script>`}
</svelte:head>

<div class="mb-4 flex items-center justify-between gap-3">
  <nav aria-label="Breadcrumb" class="min-w-0">
    <ol
      class="flex min-w-0 items-center gap-2 overflow-hidden text-sm text-muted-foreground"
    >
      {#each items as item, index (index)}
        {@const isLast = index === items.length - 1}
        <li
          class={isLast
            ? "flex min-w-0 items-center gap-2"
            : "flex shrink-0 items-center gap-2"}
        >
          {#if index > 0}
            <span class="shrink-0 text-muted-foreground/50">/</span>
          {/if}

          {#if item.href && !isLast}
            <a
              href={resolveHref(item.href)}
              class="whitespace-nowrap transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          {:else}
            <span class="min-w-0 truncate font-medium text-foreground">
              {item.label}
            </span>
          {/if}
        </li>
      {/each}
    </ol>
  </nav>

  <SupportButton compact iconRight class="shrink-0" />
</div>
