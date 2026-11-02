/** A note inside a step for one system, such as "Mac with CrossOver", or for one situation. */
interface InstallNote {
  label: string;
  text: string;
}

type InstallBlock =
  { kind: "text"; text: string } | { kind: "notes"; notes: InstallNote[] };

interface InstallStep {
  title: string;
  /** The step's paragraphs and note lists, in the order the file gives them. */
  blocks: InstallBlock[];
}

export interface InstallGuide {
  steps: InstallStep[];
  /** Paragraphs after the last step that apply to the whole install. */
  closing: string[];
}

/**
 * Reads `mods/INSTALL.md`, the one source of the install steps: each `## ` heading is a step, plain
 * paragraphs are its text, and `- Label: text` lines are notes for one system or one situation.
 * Paragraphs that follow a `---` line close the guide. The fixed MelonLoader zip's README.txt is
 * written from the same file.
 */
export function parseInstallGuide(markdown: string): InstallGuide {
  const steps: InstallStep[] = [];
  const closing: string[] = [];
  let closed = false;
  for (const raw of markdown.trim().split(/\n\s*\n/)) {
    const block = raw.trim();
    if (block === "---" || closed) {
      if (closed) closing.push(block.replace(/\n/g, " "));
      closed = true;
      continue;
    }
    if (block.startsWith("## ")) {
      steps.push({ title: block.slice(3).trim(), blocks: [] });
      continue;
    }
    const step = steps.at(-1);
    if (!step) throw new Error(`Install text before the first step: ${block}`);
    if (block.startsWith("- ")) {
      const notes = block.split("\n").map((line) => {
        const match = /^- ([^:]+): (.+)$/.exec(line.trim());
        if (!match) throw new Error(`Install note without a label: ${line}`);
        return { label: match[1], text: match[2] };
      });
      step.blocks.push({ kind: "notes", notes });
    } else {
      step.blocks.push({ kind: "text", text: block.replace(/\n/g, " ") });
    }
  }
  return { steps, closing };
}
