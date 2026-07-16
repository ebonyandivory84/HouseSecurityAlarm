export function parseJsonArray<T>(raw: unknown): T[] {
  if (typeof raw !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T extends object>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}
