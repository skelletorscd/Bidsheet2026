// Tiny module-level store so the RouteBuilder (at the top of Locations)
// and the "Add to route" buttons on each LocationCard share one list.
// Survives across tab-switches within the session (sessionStorage cache).

import { useSyncExternalStore } from "react";

export type RouteStop =
  | { kind: "directory"; code: string }
  | { kind: "custom"; label: string; address: string };

const LS_KEY = "tlf:route-draft:v1";

function loadInitial(): RouteStop[] {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RouteStop[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        (s.kind === "directory" ||
          (s.kind === "custom" && typeof s.address === "string")),
    );
  } catch {
    return [];
  }
}

let current: RouteStop[] = typeof window === "undefined" ? [] : loadInitial();
const listeners = new Set<() => void>();

function commit(next: RouteStop[]) {
  current = next;
  try {
    sessionStorage.setItem(LS_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RouteStop[] {
  return current;
}

function getServerSnapshot(): RouteStop[] {
  return [];
}

export function useRouteDraft() {
  const stops = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    stops,
    addDirectory: (code: string) => {
      if (current.some((s) => s.kind === "directory" && s.code === code)) {
        return;
      }
      commit([...current, { kind: "directory", code }]);
    },
    addCustom: (address: string, label?: string) => {
      const trimmed = address.trim();
      if (!trimmed) return;
      commit([
        ...current,
        { kind: "custom", label: label ?? trimmed, address: trimmed },
      ]);
    },
    remove: (idx: number) => {
      if (idx < 0 || idx >= current.length) return;
      commit(current.filter((_, i) => i !== idx));
    },
    move: (idx: number, dir: -1 | 1) => {
      const j = idx + dir;
      if (idx < 0 || j < 0 || idx >= current.length || j >= current.length) {
        return;
      }
      const next = [...current];
      [next[idx], next[j]] = [next[j], next[idx]];
      commit(next);
    },
    moveTo: (fromIdx: number, toIdx: number) => {
      if (
        fromIdx === toIdx ||
        fromIdx < 0 ||
        toIdx < 0 ||
        fromIdx >= current.length ||
        toIdx >= current.length
      ) {
        return;
      }
      const next = [...current];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      commit(next);
    },
    clear: () => commit([]),
    has: (code: string) =>
      current.some((s) => s.kind === "directory" && s.code === code),
  };
}
