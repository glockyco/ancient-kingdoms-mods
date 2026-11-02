/** A note inside a step that applies only to one system, such as "Mac with CrossOver". */
export interface InstallNote {
  system: string;
  text: string;
}

export interface InstallStep {
  title: string;
  paragraphs: string[];
  notes: InstallNote[];
}

export interface InstallGuide {
  steps: InstallStep[];
  /** Paragraphs after the last step that apply to the whole install. */
  closing: string[];
}

/**
 * Reads `mods/INSTALL.md`, the one source of the install steps: each `## ` heading is a step, plain
 * paragraphs are its text, and `- System: text` lines are notes for one system. Paragraphs that
 * follow a `---` line close the guide. The fixed MelonLoader zip's README.txt is
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
      steps.push({ title: block.slice(3).trim(), paragraphs: [], notes: [] });
      continue;
    }
    const step = steps.at(-1);
    if (!step) throw new Error(`Install text before the first step: ${block}`);
    if (block.startsWith("- ")) {
      for (const line of block.split("\n")) {
        const match = /^- ([^:]+): (.+)$/.exec(line.trim());
        if (!match) throw new Error(`Install note without a system: ${line}`);
        step.notes.push({ system: match[1], text: match[2] });
      }
    } else {
      step.paragraphs.push(block.replace(/\n/g, " "));
    }
  }
  return { steps, closing };
}
