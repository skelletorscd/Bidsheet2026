import { useEffect, useMemo, useRef, useState } from "react";
import { TakenBid, ON_CALL_JOB_NUM } from "./useTakenBids";

export type PickEvent = {
  /** "TOL:WP01" / "NBL:NBKA" / "ON-CALL:TOL:rank-12" — stable identity */
  key: string;
  jobNum: string;
  hub: TakenBid["hub"];
  driverRaw: string;
  isOnCall: boolean;
  /** When the app first observed this pick. */
  detectedAt: number;
  /** ms between this pick's first observation and the previous one. */
  durationMs: number | null;
};

const LS_KEY = "tlf:pick-timings:v1";
const MAX_HISTORY = 80;
const MAX_AGE_MS = 1000 * 60 * 60 * 36; // 36 h — bid week is ~2 days

type StoredEvent = Omit<PickEvent, "durationMs">;

function loadHistory(): StoredEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEvent[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (p) =>
        p &&
        typeof p.key === "string" &&
        typeof p.detectedAt === "number" &&
        now - p.detectedAt < MAX_AGE_MS,
    );
  } catch {
    return [];
  }
}

function saveHistory(events: StoredEvent[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(events));
  } catch {
    // ignore — quota / private browsing
  }
}

function eventKey(t: TakenBid): string {
  if (t.jobNum === ON_CALL_JOB_NUM) {
    return `ONCALL:${t.hub ?? "?"}:${t.bidNum}`;
  }
  return `${t.hub ?? "?"}:${t.jobNum}`;
}

export type BidTimingsState = {
  /** Newest-first list of picks the app has seen, with durations. */
  history: PickEvent[];
  /** When the most recent pick was first observed. */
  lastPickAt: number | null;
  /** Wall-clock now, ticked once per second so consumers re-render. */
  nowMs: number;
};

/**
 * Tracks the first time the app observes each pick and stores those
 * timestamps in localStorage so the "elapsed since last pick" timer
 * survives reloads. Computes per-pick durations (gap between successive
 * picks) so we can show "took N min" in the activity feed.
 */
export function useBidTimings(taken: TakenBid[]): BidTimingsState {
  const [stored, setStored] = useState<StoredEvent[]>(() => loadHistory());
  const seenRef = useRef<Set<string>>(new Set(stored.map((s) => s.key)));

  // Detect new picks — anything in `taken` whose key we haven't seen before.
  useEffect(() => {
    if (taken.length === 0) return;
    const newOnes: StoredEvent[] = [];
    const now = Date.now();
    for (const t of taken) {
      const key = eventKey(t);
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);
      newOnes.push({
        key,
        jobNum: t.jobNum,
        hub: t.hub,
        driverRaw: t.driverRaw,
        isOnCall: t.kind === "onCall",
        detectedAt: now,
      });
    }
    if (newOnes.length === 0) return;
    setStored((prev) => {
      const merged = [...prev, ...newOnes];
      const trimmed =
        merged.length > MAX_HISTORY
          ? merged.slice(merged.length - MAX_HISTORY)
          : merged;
      saveHistory(trimmed);
      return trimmed;
    });
  }, [taken]);

  // 1 Hz wall-clock tick so the elapsed display refreshes itself.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const history = useMemo<PickEvent[]>(() => {
    const sorted = [...stored].sort((a, b) => a.detectedAt - b.detectedAt);
    const withDurations: PickEvent[] = sorted.map((s, i) => ({
      ...s,
      durationMs: i === 0 ? null : s.detectedAt - sorted[i - 1].detectedAt,
    }));
    return withDurations.reverse();
  }, [stored]);

  const lastPickAt = history[0]?.detectedAt ?? null;

  return { history, lastPickAt, nowMs };
}
