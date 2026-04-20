import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCsv, readCache, writeCache } from "./loader";

export type CsvState = {
  csv: string | null;
  source: "direct" | "proxy" | "paste" | "cache" | null;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
};

export function useCsv(
  spreadsheetId: string,
  gid: number | null,
  refreshIntervalSec: number,
): CsvState & {
  refresh: () => void;
  setPaste: (csv: string) => void;
} {
  const [state, setState] = useState<CsvState>(() => {
    if (gid != null) {
      const cached = readCache(spreadsheetId, gid);
      if (cached) {
        return {
          csv: cached.csv,
          source: "cache",
          fetchedAt: cached.fetchedAt,
          loading: true,
          error: null,
        };
      }
    }
    return {
      csv: null,
      source: null,
      fetchedAt: null,
      loading: gid != null,
      error: null,
    };
  });

  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const doFetch = useCallback(async () => {
    if (gid == null) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { csv, source } = await fetchCsv(spreadsheetId, gid, ctrl.signal);
      writeCache(spreadsheetId, gid, csv, source);
      setState({
        csv,
        source,
        fetchedAt: Date.now(),
        loading: false,
        error: null,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }, [spreadsheetId, gid]);

  useEffect(() => {
    if (gid != null) {
      const cached = readCache(spreadsheetId, gid);
      if (cached) {
        setState({
          csv: cached.csv,
          source: "cache",
          fetchedAt: cached.fetchedAt,
          loading: true,
          error: null,
        });
      } else {
        setState({
          csv: null,
          source: null,
          fetchedAt: null,
          loading: true,
          error: null,
        });
      }
      doFetch();
    } else {
      setState({
        csv: null,
        source: null,
        fetchedAt: null,
        loading: false,
        error: null,
      });
    }
    return () => abortRef.current?.abort();
  }, [spreadsheetId, gid, doFetch]);

  useEffect(() => {
    if (gid == null || refreshIntervalSec <= 0) return;
    const id = window.setInterval(doFetch, refreshIntervalSec * 1000);
    return () => window.clearInterval(id);
  }, [doFetch, gid, refreshIntervalSec]);

  // Refresh when the tab becomes visible again (phone woken / switched back)
  // and when the window regains focus. Setinterval throttles or pauses on
  // mobile, so these triggers make the app feel instantly up-to-date.
  useEffect(() => {
    if (gid == null) return;
    const STALE_MS = 15_000;
    const maybeRefresh = () => {
      const state0 = stateRef.current;
      if (!state0.fetchedAt || Date.now() - state0.fetchedAt > STALE_MS) {
        doFetch();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [doFetch, gid]);

  const setPaste = useCallback(
    (csv: string) => {
      if (gid != null) writeCache(spreadsheetId, gid, csv, "paste");
      setState({
        csv,
        source: "paste",
        fetchedAt: Date.now(),
        loading: false,
        error: null,
      });
    },
    [spreadsheetId, gid],
  );

  return { ...state, refresh: doFetch, setPaste };
}
