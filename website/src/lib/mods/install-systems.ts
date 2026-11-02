export const SYSTEMS = [
  { id: "windows", label: "Windows", keys: ["Windows"] },
  { id: "mac", label: "Mac with CrossOver", keys: ["Mac"] },
  { id: "linux", label: "Steam Deck or Linux", keys: ["Steam Deck", "Linux"] },
] as const;

export type SystemId = (typeof SYSTEMS)[number]["id"];

/** The systems a note's label names. A note for a situation, such as an older install, names none. */
export function noteSystems(label: string): SystemId[] {
  return SYSTEMS.filter((s) => s.keys.some((key) => label.includes(key))).map(
    (s) => s.id,
  );
}

/** The reader's system from the browser, or Windows when it can't tell. `?system=` chooses one in links. */
export function detectSystem(url: URL): SystemId {
  const chosen = url.searchParams.get("system");
  if (SYSTEMS.some((s) => s.id === chosen)) return chosen as SystemId;
  const agent = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(agent)) return "windows";
  if (/Mac/i.test(agent)) return "mac";
  if (/Linux|X11/i.test(agent)) return "linux";
  return "windows";
}
