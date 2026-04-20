export function formatRelative(ts: number | null): string {
  if (!ts) return "never";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function formatHours(h: number): string {
  if (!h) return "0h";
  return `${h.toFixed(2).replace(/\.?0+$/, "")}h`;
}

export function formatMiles(m: number): string {
  if (!m) return "0 mi";
  return `${Math.round(m).toLocaleString()} mi`;
}

export function formatPay(p: number): string {
  if (!p) return "—";
  return `$${Math.round(p).toLocaleString()}`;
}
