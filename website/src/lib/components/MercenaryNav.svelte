<script lang="ts">
  import type { MercenaryLink } from "$lib/types/pets";
  import { petHref } from "$lib/utils/pets";

  interface Props {
    /** Every mercenary archetype, in the site-wide class order. */
    mercenaries: MercenaryLink[];
    /** The page this navigation sits on: the hub, the stat tool, or a mercenary id. */
    current: "overview" | "stat-ranges" | (string & {});
  }

  let { mercenaries, current }: Props = $props();

  const links = $derived([
    { key: "overview", label: "Overview", href: "/mercenaries" },
    ...mercenaries.map((m) => ({
      key: m.id,
      label: m.type_monster,
      href: petHref(m.id, true),
    })),
    {
      key: "stat-ranges",
      label: "Stat ranges",
      href: "/mechanics/mercenary-stats",
    },
  ]);
</script>

<!--
  The four kinds of mercenary page live under two sections of the site. This
  row joins them: every mercenary page shows the same links in the same order,
  so a reader can move between the overview, a class, and the stat tool
  without going back through the breadcrumb.
-->
<nav aria-label="Mercenary pages" class="border-y py-3">
  <ul class="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm">
    {#each links as link (link.key)}
      {@const active = link.key === current}
      <li>
        <a
          href={link.href}
          aria-current={active ? "page" : undefined}
          class={active
            ? "font-medium text-foreground underline decoration-2 underline-offset-[6px]"
            : "text-foreground/70 transition-colors hover:text-foreground hover:underline"}
          >{link.label}</a
        >
      </li>
    {/each}
  </ul>
</nav>
