<script lang="ts">
  import type { QuestChainGraph } from "$lib/types/quests";

  interface Props {
    graph: QuestChainGraph;
  }

  let { graph }: Props = $props();

  // Layout constants (must match server-side)
  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 36;

  // Scroll container reference
  let scrollContainer: HTMLDivElement | undefined = $state();

  // Find current node for auto-scroll
  const currentNode = $derived(graph.nodes.find((n) => n.isCurrent));

  // Auto-scroll to center current quest on mount
  $effect(() => {
    if (scrollContainer && currentNode) {
      const containerWidth = scrollContainer.clientWidth;
      const nodeCenter = currentNode.x + NODE_WIDTH / 2;
      const scrollTarget = nodeCenter - containerWidth / 2;
      scrollContainer.scrollLeft = Math.max(0, scrollTarget);
    }
  });

  // Create a map of node positions for edge drawing
  const nodePositions = $derived(
    new Map(graph.nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
  );

  // Generate SVG path for an edge (bezier curve)
  function getEdgePath(fromId: string, toId: string): string {
    const from = nodePositions.get(fromId);
    const to = nodePositions.get(toId);
    if (!from || !to) return "";

    const startX = from.x + NODE_WIDTH;
    const startY = from.y + NODE_HEIGHT / 2;
    const endX = to.x;
    const endY = to.y + NODE_HEIGHT / 2;
    const midX = (startX + endX) / 2;

    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }

  // Quest type colors for the left border
  const questTypeColors: Record<string, string> = {
    kill: "rgb(239 68 68)",
    gather: "rgb(34 197 94)",
    gather_inventory: "rgb(34 197 94)",
    location: "rgb(59 130 246)",
    equip_item: "rgb(168 85 247)",
    alchemy: "rgb(6 182 212)",
  };

  function getQuestTypeColor(questType: string): string {
    return questTypeColors[questType] || "rgb(107 114 128)";
  }
</script>

<div bind:this={scrollContainer} class="overflow-x-auto scrollbar-thin">
  <svg
    width={graph.width}
    height={graph.height}
    viewBox="0 0 {graph.width} {graph.height}"
    class="min-w-full"
  >
    <!-- Edges -->
    {#each graph.edges as edge (edge.fromId + "-" + edge.toId)}
      <path
        d={getEdgePath(edge.fromId, edge.toId)}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="text-border"
      />
      <!-- Arrow head -->
      {@const to = nodePositions.get(edge.toId)}
      {#if to}
        <polygon
          points="{to.x - 6},{to.y + NODE_HEIGHT / 2 - 4} {to.x},{to.y +
            NODE_HEIGHT / 2} {to.x - 6},{to.y + NODE_HEIGHT / 2 + 4}"
          fill="currentColor"
          class="text-border"
        />
      {/if}
    {/each}

    <!-- Nodes -->
    {#each graph.nodes as node (node.id)}
      <g>
        <!-- Node background -->
        <rect
          x={node.x}
          y={node.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="6"
          class={node.isCurrent
            ? "fill-primary/20 stroke-primary stroke-2"
            : "fill-muted/50 stroke-border"}
        />
        <!-- Quest type indicator (left border) -->
        <rect
          x={node.x}
          y={node.y}
          width="4"
          height={NODE_HEIGHT}
          rx="2"
          fill={getQuestTypeColor(node.quest_type)}
        />
        <!-- Clickable link overlay -->
        <a href="/quests/{node.id}">
          <rect
            x={node.x}
            y={node.y}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            fill="transparent"
            class="cursor-pointer"
          />
          <!-- Text -->
          <text
            x={node.x + 12}
            y={node.y + NODE_HEIGHT / 2}
            dominant-baseline="middle"
            class={node.isCurrent
              ? "fill-foreground font-medium text-sm"
              : "fill-foreground text-sm hover:fill-primary"}
          >
            {node.name.length > 22 ? node.name.slice(0, 20) + "..." : node.name}
          </text>
        </a>
      </g>
    {/each}
  </svg>
</div>

<style>
  text {
    font-family: inherit;
  }

  .scrollbar-thin::-webkit-scrollbar {
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }
</style>
