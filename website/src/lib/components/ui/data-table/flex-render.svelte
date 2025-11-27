<script lang="ts">
  import type { Snippet, Component } from "svelte";

  /* eslint-disable @typescript-eslint/no-explicit-any */
  type Props = {
    content:
      | string
      | number
      | undefined
      | null
      | Component<any>
      | Snippet<[any]>
      | ((props: any) => string | number | null | undefined | unknown);
    props: any;
  };

  let { content, props }: Props = $props();

  // Resolve function-based content to a string value
  function resolveToString(): string | null {
    if (content == null) return null;
    if (typeof content === "string") return content;
    if (typeof content === "number") return String(content);
    if (typeof content === "function") {
      // Check if it's a simple accessor function (returns string/number)
      // vs a component or snippet
      try {
        const result = (content as (props: any) => unknown)(props);
        if (typeof result === "string") return result;
        if (typeof result === "number") return String(result);
        if (result == null) return null;
      } catch {
        // Function threw - probably a component constructor, not a function
        return null;
      }
    }
    return null;
  }

  function isSnippet(value: unknown): value is Snippet<[any]> {
    // Snippets are functions with specific Svelte internal markers
    return (
      typeof value === "function" &&
      // @ts-expect-error - Svelte internals
      (value.length === 2 || value.$$slots !== undefined)
    );
  }

  const stringValue = $derived(resolveToString());
</script>

{#if stringValue !== null}
  {stringValue}
{:else if isSnippet(content)}
  {@render (content as Snippet<[any]>)(props)}
{:else if typeof content === "function"}
  {@const Comp = content as Component<any>}
  <Comp {...props} />
{/if}
