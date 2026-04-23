import { useEffect, useState } from "react";
import { Sparkles, Timer } from "lucide-react";
import { ScheduledReplay } from "../data/useScheduledCelebration";

type Props = {
  scheduled: ScheduledReplay | null;
};

/**
 * Shows a small banner when a special celebration has been scheduled via
 * URL (?play=stevewicker&at=...). Displays the live countdown so people
 * who arrived early know a show is about to start.
 */
export function ScheduledReplayBanner({ scheduled }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!scheduled || scheduled.fired) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [scheduled]);

  if (!scheduled || scheduled.fired) return null;
  const remainingMs = scheduled.fireAt - now;
  if (remainingMs < -1000) return null;
  const sec = Math.max(0, Math.ceil(remainingMs / 1000));

  const driver = scheduled.toasts[0]?.driver ?? "—";
  const jobNum = scheduled.toasts[0]?.jobNum ?? "";

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border-b border-amber-500/40 relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"
        style={{ animation: "shimmer 2.4s linear infinite" }}
      />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/30 border border-amber-400/60 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-amber-200" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-bold">
            Special replay coming up
          </div>
          <div className="text-sm text-slate-100 font-semibold truncate">
            {driver}
            {jobNum && (
              <span className="text-slate-400 font-normal">
                {" "}
                · took{" "}
                <span className="font-mono text-amber-200">{jobNum}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-400/50 shrink-0">
          <Timer className="w-4 h-4 text-amber-200" />
          <span className="font-mono font-extrabold text-amber-100 tabular text-base sm:text-lg">
            {formatCountdown(sec)}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${m.toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
  }
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
