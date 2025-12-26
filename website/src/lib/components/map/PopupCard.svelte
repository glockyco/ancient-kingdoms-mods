<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    subtitle?: string;
    titleClass?: string;
    detailsUrl?: string | null;
    onClose: () => void;
    children: Snippet;
  }

  let {
    title,
    subtitle,
    titleClass = "",
    detailsUrl = null,
    onClose,
    children,
  }: Props = $props();
</script>

<Card.Root
  class="absolute right-4 top-4 z-10 w-80 gap-0 bg-background/95 py-0 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  <Card.Header class="!gap-0 border-b !py-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <Card.Title class="text-base {titleClass}">{title}</Card.Title>
        {#if subtitle}
          <p class="text-sm text-muted-foreground">{subtitle}</p>
        {/if}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onclick={onClose}
        class="h-6 w-6 cursor-pointer p-0"
      >
        <span class="sr-only">Close</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </Button>
    </div>
  </Card.Header>

  <Card.Content
    class="max-h-[calc(100vh-10rem)] space-y-1.5 overflow-y-auto py-2 text-sm"
  >
    {@render children()}
  </Card.Content>

  {#if detailsUrl}
    <a
      href={detailsUrl}
      class="block border-t py-2 text-center text-sm text-primary hover:underline"
    >
      View Details
    </a>
  {/if}
</Card.Root>
