import { useEffect, useRef, useState } from "react";
import { TakenBid } from "./useTakenBids";

export type BidTakenToast = {
  id: string;
  jobNum: string;
  bidNum: number;
  hub: "TOL" | "NBL" | "ALL" | null;
  driver: string;
  createdAt: number;
  /** 0..4 — which center-screen celebration variant to play */
  variant: number;
};

export function useBidTakenToasts(
  taken: TakenBid[],
  loading: boolean,
): {
  toasts: BidTakenToast[];
  dismiss: (id: string) => void;
} {
  const [toasts, setToasts] = useState<BidTakenToast[]>([]);
  const previousKeysRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Wait for first non-loading snapshot so we don't emit a toast for every
    // bid that was already taken before the app opened.
    if (loading) return;
    const currentKeys = new Set(
      taken.map((t) => `${t.hub}:${t.jobNum}:${t.driverRaw}`),
    );

    if (previousKeysRef.current === null) {
      previousKeysRef.current = currentKeys;
      return;
    }

    const prev = previousKeysRef.current;
    const newlyTaken = taken.filter(
      (t) => !prev.has(`${t.hub}:${t.jobNum}:${t.driverRaw}`),
    );

    if (newlyTaken.length > 0) {
      const now = Date.now();
      const newToasts: BidTakenToast[] = newlyTaken.map((t, i) => ({
        id: `${now}-${i}-${t.jobNum}`,
        jobNum: t.jobNum,
        bidNum: t.bidNum,
        hub: t.hub,
        driver: t.driverRaw,
        createdAt: now,
        variant: Math.floor(Math.random() * 5),
      }));
      setToasts((prev) => [...prev, ...newToasts].slice(-6));
    }

    previousKeysRef.current = currentKeys;
  }, [taken, loading]);

  // Auto-dismiss after 9 s
  useEffect(() => {
    if (toasts.length === 0) return;
    const soonest = Math.min(...toasts.map((t) => t.createdAt + 9000));
    const delay = Math.max(0, soonest - Date.now());
    const id = window.setTimeout(() => {
      const cutoff = Date.now();
      setToasts((prev) => prev.filter((t) => cutoff - t.createdAt < 9000));
    }, delay + 50);
    return () => window.clearTimeout(id);
  }, [toasts]);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, dismiss };
}
