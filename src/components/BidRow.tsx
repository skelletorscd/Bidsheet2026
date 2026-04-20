import { Bid } from "../types";
import { formatHours, formatMiles, formatPay } from "../util/format";

type Props = {
  bid: Bid;
  selected: boolean;
  onSelect: () => void;
};

const PAY_BADGES: Record<Bid["payType"], string> = {
  hourly: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  mileage: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  mixed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  unknown: "bg-slate-700/40 text-slate-300 border-slate-600",
};

const STATUS_BADGES: Record<Bid["status"], string> = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "in-progress": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  taken: "bg-slate-700/40 text-slate-400 border-slate-600",
};

export function BidRow({ bid, selected, onSelect }: Props) {
  const dim = bid.status === "taken";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 border-l-2 transition-colors ${
        selected
          ? "bg-amber-500/10 border-amber-400"
          : "border-transparent hover:bg-bg-hover"
      } ${dim ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-[15px] text-slate-100 tabular">
              {bid.jobNum}
            </span>
            <span className="text-[11px] text-slate-500 tabular">
              #{bid.bidNum}
            </span>
          </div>
          <div className="text-[12px] text-slate-400 mt-0.5 tabular">
            {bid.startTime24}
            <span className="text-slate-600"> · </span>
            {bid.startTime12}
          </div>
        </div>
        <div className="text-right shrink-0">
          {bid.payType === "mileage" || bid.payType === "mixed" ? (
            <div className="text-[12px] text-slate-200 tabular font-medium">
              {formatMiles(bid.totalMilesPerWeek)}
            </div>
          ) : null}
          {bid.payType === "hourly" || bid.payType === "mixed" ? (
            <div className="text-[12px] text-slate-200 tabular font-medium">
              {formatHours(bid.totalHoursPerWeek)}
            </div>
          ) : null}
          <div className="text-[10px] text-slate-500 tabular">
            {bid.daysPerWeek}d · {formatPay(bid.estimatedWeeklyPay)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        <span className={`pill border ${PAY_BADGES[bid.payType]}`}>
          {bid.payType === "unknown" ? "?" : bid.payType}
        </span>
        {bid.status !== "available" && (
          <span className={`pill border ${STATUS_BADGES[bid.status]}`}>
            {bid.status}
          </span>
        )}
        {bid.hasWeekend && (
          <span className="pill bg-rose-500/10 text-rose-300 border border-rose-500/30">
            wknd
          </span>
        )}
      </div>
    </button>
  );
}
