import { Bid } from "../types";
import { LocationEntry } from "../data/locations";
import {
  formatHours,
  formatMiles,
  formatPay,
} from "../util/format";
import { RouteRender } from "./RouteRender";
import { Calendar, Clock, Gauge, MapPin, Star, Tag } from "lucide-react";

type Props = {
  bid: Bid;
  locations: Record<string, LocationEntry>;
  similar: Bid[];
  onSelect: (bid: Bid) => void;
  onClickUnknown: (code: string) => void;
};

const STAT_TILE =
  "bg-bg-raised border border-border-subtle rounded-lg px-3 py-2.5";

export function BidDetail({
  bid,
  locations,
  similar,
  onSelect,
  onClickUnknown,
}: Props) {
  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-mono font-bold text-3xl tabular text-slate-50">
              {bid.jobNum}
            </h1>
            <span className="text-sm text-slate-500 tabular">
              Bid #{bid.bidNum}
            </span>
            <StatusBadge status={bid.status} takenBy={bid.takenBy} />
          </div>
          <div className="text-sm text-slate-400 mt-1 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            {bid.qualifications || "No special qualifications"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5">
        <div className={STAT_TILE}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Start
          </div>
          <div className="text-base font-semibold text-slate-100 tabular mt-1">
            {bid.startTime24}
          </div>
          <div className="text-[11px] text-slate-400 tabular">
            {bid.startTime12}
          </div>
        </div>
        <div className={STAT_TILE}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Days/wk
          </div>
          <div className="text-base font-semibold text-slate-100 tabular mt-1">
            {bid.daysPerWeek}
          </div>
          <div className="text-[11px] text-slate-400">
            {bid.hasWeekend ? "incl. weekend" : "weekday only"}
          </div>
        </div>
        {bid.totalHoursPerWeek > 0 && (
          <div className={STAT_TILE}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Hours/wk
            </div>
            <div className="text-base font-semibold text-emerald-300 tabular mt-1">
              {formatHours(bid.totalHoursPerWeek)}
            </div>
          </div>
        )}
        {bid.totalMilesPerWeek > 0 && (
          <div className={STAT_TILE}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              Miles/wk
            </div>
            <div className="text-base font-semibold text-purple-300 tabular mt-1">
              {formatMiles(bid.totalMilesPerWeek)}
            </div>
          </div>
        )}
        <div className={STAT_TILE}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Est. pay/wk
          </div>
          <div className="text-base font-semibold text-amber-300 tabular mt-1">
            {formatPay(bid.estimatedWeeklyPay)}
          </div>
          <div className="text-[10px] text-slate-500">your rates</div>
        </div>
        <div className={STAT_TILE}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Stops
          </div>
          <div className="text-base font-semibold text-slate-100 tabular mt-1">
            {bid.destinations.length}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {bid.destinations.slice(0, 3).join(", ")}
            {bid.destinations.length > 3 ? "…" : ""}
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
          Schedule by day
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-raised/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 w-32">Day(s)</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2 text-right w-32">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {bid.legs.map((leg, i) => (
                <tr
                  key={i}
                  className="border-t border-border-subtle align-top"
                >
                  <td className="px-3 py-2.5 text-slate-200">
                    <div className="font-medium">{leg.daysRaw || "—"}</div>
                    {leg.startTimeOverride24 && (
                      <div className="text-[11px] text-amber-300 tabular mt-0.5">
                        Start {leg.startTimeOverride24}
                      </div>
                    )}
                    {leg.qualOverride && (
                      <div className="text-[11px] text-amber-300/90 mt-0.5">
                        {leg.qualOverride}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <RouteRender
                      tokens={leg.routeTokens}
                      locations={locations}
                      onClickUnknown={onClickUnknown}
                    />
                    {leg.payNote && (
                      <div className="text-[11px] text-slate-500 italic mt-1">
                        {leg.payNote}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-slate-200">
                    {leg.hours != null ? (
                      <span className="text-emerald-300">
                        {formatHours(leg.hours)}
                      </span>
                    ) : leg.miles != null ? (
                      <span className="text-purple-300">
                        {formatMiles(leg.miles)}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            Similar bids
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {similar.map((s) => (
              <button
                key={s.jobNum}
                onClick={() => onSelect(s)}
                className="card text-left p-3 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-100 tabular">
                    {s.jobNum}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular">
                    {s.startTime24}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">
                  {s.destinations.slice(0, 4).join(" → ")}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  takenBy,
}: {
  status: Bid["status"];
  takenBy: string | null;
}) {
  if (status === "available") {
    return (
      <span className="pill bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        Available
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="pill bg-amber-500/15 text-amber-300 border border-amber-500/30">
        Being picked
      </span>
    );
  }
  return (
    <span className="pill bg-slate-700/40 text-slate-400 border border-slate-600">
      {takenBy ? `Taken by ${takenBy}` : "Taken"}
    </span>
  );
}
