const DISPLAY_NAME_KEY = "chronotunes-display-name";

/* localStorage-backed external store so the saved display name can be read
   during render without an effect-driven state update. The cached snapshot
   keeps getSnapshot referentially stable across calls. */
let displayNameCache: string | null = null;
const displayNameSubscribers = new Set<() => void>();

export function subscribeToDisplayName(onChange: () => void): () => void {
  displayNameSubscribers.add(onChange);
  return () => {
    displayNameSubscribers.delete(onChange);
  };
}

export function getDisplayName(): string {
  if (displayNameCache === null) {
    displayNameCache =
      typeof window === "undefined" ? "" : (localStorage.getItem(DISPLAY_NAME_KEY) ?? "");
  }
  return displayNameCache;
}

export const getEmptyDisplayName = (): string => "";

export function saveDisplayName(name: string): void {
  if (typeof window !== "undefined") {
    displayNameCache = name.trim();
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
    for (const notify of displayNameSubscribers) {
      notify();
    }
  }
}
