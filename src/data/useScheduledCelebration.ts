import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CLAW_VARIANT,
  LIONS_VARIANT,
} from "../components/BidCelebration";
import { TakenBid, useTakenBids } from "./useTakenBids";
import { Settings } from "./settings";
import { BidTakenToast } from "./useBidTakenToasts";

/** Recipe for one of the named replay celebrations the URL can trigger. */
type Replay = {
  /** Name as it appears in the bid sheet's takenBy column. */
  driverName: string;
  /** Special variant index for this driver. */
  variant: number;
  /** Repeat the celebration this many times. */
  repeat: number;
  /** Fallback display values if the live sheet hasn't recorded a pick yet. */
  fallbackJobNum: string;
  fallbackHub: TakenBid["hub"];
};

const REPLAYS: Record<string, Replay> = {
  stevewicker: {
    driverName: "Steven Wicker",
    variant: CLAW_VARIANT,
    repeat: 3,
    fallbackJobNum: "TLOR",
    fallbackHub: "TOL",
  },
  josephdevos: {
    driverName: "Joseph Devos",
    variant: LIONS_VARIANT,
    repeat: 1,
    fallbackJobNum: "PENDING",
    fallbackHub: null,
  },
};

export type ScheduledReplay = {
  key: string;
  fireAt: number;
  toasts: BidTakenToast[];
  countdownSec: number;
  /** Has the toast been emitted yet? */
  fired: boolean;
};

const FIRED_LS_KEY = "tlf:fired-replays:v1";

function loadFiredKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFiredKey(key: string): void {
  try {
    const next = loadFiredKeys();
    next.add(key);
    // Cap to last 100 keys so localStorage doesn't bloat.
    const arr = [...next].slice(-100);
    localStorage.setItem(FIRED_LS_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

/**
 * Reads the URL for `?play=<key>[&at=<ISO|epoch-seconds|epoch-ms>]` and emits
 * a synthetic toast (or several, for repeat >1) at the scheduled time.
 *
 * Shareable: anyone who opens the URL will see the celebration fire at the
 * same wall-clock instant, no backend required.
 */
export function useScheduledCelebration(settings: Settings): {
  scheduled: ScheduledReplay | null;
  newToasts: BidTakenToast[];
  consume: () => void;
} {
  const [params] = useSearchParams();
  const playKey = params.get("play")?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const atRaw = params.get("at");
  const inRaw = params.get("in");

  const takenBids = useTakenBids(settings);

  const [scheduled, setScheduled] = useState<ScheduledReplay | null>(null);
  const [newToasts, setNewToasts] = useState<BidTakenToast[]>([]);
  const [tick, setTick] = useState(0);

  // Resolve the recipe + fire-at timestamp from URL params on mount.
  useEffect(() => {
    if (!playKey || !REPLAYS[playKey]) {
      setScheduled(null);
      return;
    }
    const replay = REPLAYS[playKey];

    let fireAt = Date.now();
    if (atRaw) {
      // Accept ISO 8601, epoch ms, or epoch seconds.
      const asNum = Number(atRaw);
      if (Number.isFinite(asNum) && asNum > 0) {
        fireAt = asNum > 10_000_000_000 ? asNum : asNum * 1000;
      } else {
        const parsed = Date.parse(atRaw);
        if (!Number.isNaN(parsed)) fireAt = parsed;
      }
    } else if (inRaw) {
      const sec = Number(inRaw);
      if (Number.isFinite(sec) && sec > 0) fireAt = Date.now() + sec * 1000;
    }

    // De-dupe: a given URL only fires once per device. Re-trigger by changing
    // the `at` param.
    const dedupeKey = `${playKey}-${fireAt}`;
    const fired = loadFiredKeys().has(dedupeKey);

    // Build toasts but don't return them to the consumer until the time is
    // right.
    const driverPick = takenBids.lookup(replay.driverName);
    const jobNum = driverPick?.jobNum ?? replay.fallbackJobNum;
    const hub = driverPick?.hub ?? replay.fallbackHub;

    const baseId = `replay-${dedupeKey}`;
    const toasts: BidTakenToast[] = [];
    for (let i = 0; i < replay.repeat; i++) {
      toasts.push({
        id: `${baseId}-${i}`,
        jobNum,
        bidNum: 0,
        hub,
        driver: replay.driverName,
        createdAt: fireAt,
        variant: replay.variant,
      });
    }

    setScheduled({
      key: dedupeKey,
      fireAt,
      toasts,
      countdownSec: Math.max(0, Math.floor((fireAt - Date.now()) / 1000)),
      fired,
    });
  }, [playKey, atRaw, inRaw, takenBids]);

  // 1Hz tick so the countdown banner refreshes.
  useEffect(() => {
    if (!scheduled || scheduled.fired) return;
    if (Date.now() >= scheduled.fireAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [scheduled]);

  // When the time hits, emit toasts exactly once.
  useEffect(() => {
    if (!scheduled || scheduled.fired) return;
    if (Date.now() < scheduled.fireAt) {
      // re-render to advance countdown
      void tick;
      setScheduled((s) =>
        s ? { ...s, countdownSec: Math.max(0, Math.floor((s.fireAt - Date.now()) / 1000)) } : s,
      );
      return;
    }
    // Time has arrived.
    setNewToasts(scheduled.toasts);
    saveFiredKey(scheduled.key);
    setScheduled((s) => (s ? { ...s, fired: true, countdownSec: 0 } : s));
  }, [scheduled, tick]);

  const consume = () => setNewToasts([]);

  return { scheduled, newToasts, consume };
}
