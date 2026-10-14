import { getContext, setContext, type Component } from "svelte";

/** One linkable topic of a reference page. Its id is the URL fragment that opens it. */
export interface ReferenceTopic {
  readonly id: string;
  readonly title: string;
}

/** A group of topics, shown as one entry of the page's contents. */
export interface ReferenceChapter {
  readonly id: string;
  readonly title: string;
  /** One line under the chapter heading saying what the chapter answers. */
  readonly description: string;
  readonly icon: Component;
  /** Empty when the chapter is a single topic of its own. */
  readonly topics: readonly ReferenceTopic[];
}

export type ReferenceOutline = readonly ReferenceChapter[];

const KEY = Symbol("reference-outline");

/** Every fragment of the outline in document order, chapters before their topics. */
export function outlineIds(outline: ReferenceOutline): string[] {
  return outline.flatMap((chapter) => [
    chapter.id,
    ...chapter.topics.map((topic) => topic.id),
  ]);
}

export function setReferenceOutline(outline: ReferenceOutline): void {
  setContext(KEY, outline);
}

function outline(): ReferenceOutline {
  const value = getContext<ReferenceOutline | undefined>(KEY);
  if (!value) throw new Error("Chapter and Topic must be inside ReferencePage");
  return value;
}

/** The chapter with this id. Headings take their text from the outline, so the contents and the page cannot disagree. */
export function referenceChapter(id: string): ReferenceChapter {
  const chapter = outline().find((entry) => entry.id === id);
  if (!chapter) throw new Error(`No chapter "${id}" in the page outline`);
  return chapter;
}

export function referenceTopic(id: string): ReferenceTopic {
  for (const chapter of outline()) {
    const topic = chapter.topics.find((entry) => entry.id === id);
    if (topic) return topic;
  }
  throw new Error(`No topic "${id}" in the page outline`);
}
