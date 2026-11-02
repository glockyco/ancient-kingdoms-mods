<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    href,
    variant = "primary",
    download = false,
    class: className = "",
    children,
  }: {
    href: string;
    variant?: "primary" | "secondary";
    download?: boolean;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<a class="cta {variant} {className}" {href} download={download || undefined}>
  {@render children()}
</a>

<style>
  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    min-height: 3rem;
    padding: 0 1.4rem;
    border-radius: calc(var(--radius) - 2px);
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }
  .cta.primary {
    background: var(--brand-gold-fill);
    color: var(--brand-gold-fill-foreground);
  }
  .cta.primary:hover {
    background: color-mix(in oklab, var(--brand-gold-fill) 88%, white);
  }
  .cta.secondary {
    border: 1px solid color-mix(in oklab, var(--brand-gold) 60%, transparent);
    color: var(--brand-gold);
  }
  .cta.secondary:hover {
    border-color: var(--brand-gold);
  }
  .cta:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }
</style>
