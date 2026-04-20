import { corsProxiedUrl, csvUrl } from "./sources";

export type FetchResult = {
  csv: string;
  source: "direct" | "proxy";
};

export class CsvFetchError extends Error {
  constructor(
    public readonly attempts: { url: string; error: string }[],
  ) {
    super(
      "Could not fetch CSV. " +
        attempts.map((a) => `${a.url}: ${a.error}`).join(" | "),
    );
    this.name = "CsvFetchError";
  }
}

async function tryFetch(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.length < 8) throw new Error("Empty response");
  if (/<html/i.test(text.slice(0, 200))) throw new Error("Got HTML, not CSV");
  return text;
}

export async function fetchCsv(
  spreadsheetId: string,
  gid: number,
  signal?: AbortSignal,
): Promise<FetchResult> {
  const direct = csvUrl(spreadsheetId, gid);
  const attempts: { url: string; error: string }[] = [];

  try {
    const csv = await tryFetch(direct, signal);
    return { csv, source: "direct" };
  } catch (e) {
    attempts.push({ url: direct, error: (e as Error).message });
  }

  const proxied = corsProxiedUrl(direct);
  try {
    const csv = await tryFetch(proxied, signal);
    return { csv, source: "proxy" };
  } catch (e) {
    attempts.push({ url: proxied, error: (e as Error).message });
  }

  throw new CsvFetchError(attempts);
}

const CACHE_PREFIX = "tlf:csv-cache:";

export type CachedCsv = {
  csv: string;
  fetchedAt: number;
  source: "direct" | "proxy" | "paste";
};

export function readCache(spreadsheetId: string, gid: number): CachedCsv | null {
  try {
    const key = `${CACHE_PREFIX}${spreadsheetId}:${gid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedCsv;
  } catch {
    return null;
  }
}

export function writeCache(
  spreadsheetId: string,
  gid: number,
  csv: string,
  source: CachedCsv["source"],
): void {
  try {
    const key = `${CACHE_PREFIX}${spreadsheetId}:${gid}`;
    const payload: CachedCsv = { csv, fetchedAt: Date.now(), source };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // localStorage may be full or disabled — non-fatal
  }
}

export function clearCache(spreadsheetId: string, gid: number): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${spreadsheetId}:${gid}`);
  } catch {
    // ignore
  }
}
