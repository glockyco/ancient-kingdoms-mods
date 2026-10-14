<!--
  The card every topic of a reference page sits in, and the shared typography of
  its text: readable size and contrast, a comfortable line length for prose, and
  plain links styled without per-link classes.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Highlight the card when its chapter is the URL fragment. */
    highlight?: boolean;
    heading?: Snippet;
    children: Snippet;
  }

  let { highlight = false, heading, children }: Props = $props();
</script>

<div
  class={[
    "rounded-xl border border-border bg-card/60 p-5 sm:p-6",
    highlight &&
      "group-target/chapter:ring-2 group-target/chapter:ring-(--brand-gold)/60",
  ]}
>
  {@render heading?.()}
  <div class="reference-body">{@render children()}</div>
</div>

<style>
  .reference-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-size: 0.9375rem;
    line-height: 1.7;
    color: color-mix(in oklab, var(--foreground) 88%, transparent);
  }

  .reference-body > :global(p),
  .reference-body > :global(ul),
  .reference-body > :global(ol) {
    max-width: 72ch;
  }

  /* A labelled part of one topic, such as one of two related calculations. */
  .reference-body :global(h4) {
    margin-top: 0.5rem;
    margin-bottom: -0.5rem;
    font-weight: 600;
    color: var(--foreground);
  }

  .reference-body :global(ul:not([class])) {
    list-style: disc;
    padding-left: 1.25rem;
  }

  .reference-body :global(ol:not([class])) {
    list-style: decimal;
    padding-left: 1.25rem;
  }

  .reference-body :global(:is(ul, ol):not([class]) > li + li) {
    margin-top: 0.375rem;
  }

  .reference-body :global(li::marker) {
    color: var(--muted-foreground);
  }

  .reference-body :global(strong) {
    font-weight: 600;
    color: var(--foreground);
  }

  .reference-body :global(a:not([class])) {
    color: var(--color-blue-600);
  }

  :global(.dark) .reference-body :global(a:not([class])) {
    color: var(--color-blue-400);
  }

  .reference-body :global(a:not([class]):hover) {
    text-decoration: underline;
  }
</style>
