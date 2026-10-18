<script lang="ts">
  interface Props {
    // Precomputed effect text from formatSkillEffect
    effect: string;
    // Linked entity for summon skills — name as it appears in the effect string
    entityName?: string | null;
    // href for the entity link (/monsters/<id>, /mercenaries/<id>, or /summons/<id>)
    entityHref?: string | null;
    class?: string;
  }

  let {
    effect,
    entityName = null,
    entityHref = null,
    class: className,
  }: Props = $props();

  // Split the effect into its comma-separated clauses, ignoring commas inside
  // parentheses, so a line breaks between clauses rather than inside a formula.
  const clauses = $derived.by(() => {
    const result: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < effect.length; i++) {
      const char = effect[i];
      if (char === "(") depth++;
      else if (char === ")") depth = Math.max(0, depth - 1);
      else if (char === "," && depth === 0 && effect[i + 1] === " ") {
        result.push(effect.slice(start, i + 1));
        start = i + 2;
      }
    }
    result.push(effect.slice(start));
    return result;
  });

  // Split a clause on the entity name to insert the link inline.
  // The formatter always uses entityName verbatim inside the effect string.
  function parts(clause: string): Array<{ text: string; linked: boolean }> {
    if (!entityName || !entityHref || !clause.includes(entityName)) {
      return [{ text: clause, linked: false }];
    }
    const idx = clause.indexOf(entityName);
    const before = clause.slice(0, idx);
    const after = clause.slice(idx + entityName.length);
    return [
      ...(before ? [{ text: before, linked: false }] : []),
      { text: entityName, linked: true },
      ...(after ? [{ text: after, linked: false }] : []),
    ];
  }
</script>

<!-- A clause wider than the line still wraps inside its own box. -->
<span class={className}
  >{#each clauses as clause, i (i)}{i > 0 ? " " : ""}<span
      class="inline-block max-w-full"
      >{#each parts(clause) as part, j (j)}{#if part.linked && entityHref}<a
            href={entityHref}
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{part.text}</a
          >{:else}{part.text}{/if}{/each}</span
    >{/each}</span
>
