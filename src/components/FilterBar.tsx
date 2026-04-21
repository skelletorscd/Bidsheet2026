import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type SortKey =
  | "bidNum"
  | "startTime"
  | "hoursDesc"
  | "milesDesc"
  | "payDesc";

export type FilterState = {
  search: string;
  payType: "all" | "hourly" | "mileage" | "mixed";
  scheduleKind: "all" | "weekday" | "weekend";
  qual: "all" | string;
  status: "all" | "available" | "taken";
  startTimeFrom: string;
  startTimeTo: string;
  sort: SortKey;
};

type Props = {
  state: FilterState;
  onChange: (s: FilterState) => void;
  qualOptions: string[];
  resultCount: number;
  totalCount: number;
  availableCount: number;
};

export function FilterBar({
  state,
  onChange,
  qualOptions,
  resultCount,
  totalCount,
  availableCount,
}: Props) {
  const setField = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => onChange({ ...state, [key]: value });

  const [mobileExpanded, setMobileExpanded] = useState(false);

  const isFiltered = Boolean(
    state.search ||
      state.payType !== "all" ||
      state.scheduleKind !== "all" ||
      state.qual !== "all" ||
      state.status !== "all" ||
      state.startTimeFrom ||
      state.startTimeTo,
  );

  const activeCount =
    (state.payType !== "all" ? 1 : 0) +
    (state.scheduleKind !== "all" ? 1 : 0) +
    (state.qual !== "all" ? 1 : 0) +
    (state.status !== "all" ? 1 : 0) +
    (state.startTimeFrom || state.startTimeTo ? 1 : 0);

  const onlyAvailable = state.status === "available";

  return (
    <div className="bg-bg-base border-b border-border-subtle">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 py-2 md:py-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] md:max-w-xs">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input w-full pl-8 h-10 md:h-auto"
            placeholder="Search job, code, route…"
            value={state.search}
            onChange={(e) => setField("search", e.target.value)}
          />
        </div>

        <button
          className="btn md:hidden h-10"
          onClick={() => setMobileExpanded((v) => !v)}
          aria-expanded={mobileExpanded}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 bg-amber-500/30 text-amber-200 rounded px-1.5 text-[10px] font-semibold tabular">
              {activeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setField("status", onlyAvailable ? "all" : "available")
          }
          className={`btn h-10 ${onlyAvailable ? "btn-primary" : ""}`}
          title="Only show bids that haven't been taken"
        >
          {onlyAvailable ? "Available only ✓" : "Available only"}
        </button>

        <div
          className={`flex-wrap items-center gap-2 w-full md:w-auto md:flex md:flex-wrap ${
            mobileExpanded ? "flex" : "hidden"
          }`}
        >
          <select
          className="input"
          value={state.payType}
          onChange={(e) =>
            setField("payType", e.target.value as FilterState["payType"])
          }
        >
          <option value="all">All pay</option>
          <option value="hourly">Hourly</option>
          <option value="mileage">Mileage</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          className="input"
          value={state.scheduleKind}
          onChange={(e) =>
            setField(
              "scheduleKind",
              e.target.value as FilterState["scheduleKind"],
            )
          }
        >
          <option value="all">Any schedule</option>
          <option value="weekday">Weekday only</option>
          <option value="weekend">Includes weekend</option>
        </select>

        <select
          className="input"
          value={state.qual}
          onChange={(e) => setField("qual", e.target.value)}
        >
          <option value="all">All qualifications</option>
          {qualOptions.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 bg-bg-base border border-border rounded-md px-2 py-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">
            Start
          </span>
          <input
            type="time"
            className="bg-transparent text-sm text-slate-100 tabular focus:outline-none w-[90px]"
            value={state.startTimeFrom}
            onChange={(e) => setField("startTimeFrom", e.target.value)}
            aria-label="Start time from"
          />
          <span className="text-slate-500 text-xs">–</span>
          <input
            type="time"
            className="bg-transparent text-sm text-slate-100 tabular focus:outline-none w-[90px]"
            value={state.startTimeTo}
            onChange={(e) => setField("startTimeTo", e.target.value)}
            aria-label="Start time to"
          />
        </div>

          <select
            className="input"
            value={state.sort}
            onChange={(e) => setField("sort", e.target.value as SortKey)}
          >
            <option value="bidNum">Bid #</option>
            <option value="startTime">Start time</option>
            <option value="hoursDesc">Hours/wk ↓</option>
            <option value="milesDesc">Miles/wk ↓</option>
            <option value="payDesc">Est. pay/wk ↓</option>
          </select>

          {isFiltered && (
            <button
              className="btn"
              onClick={() =>
                onChange({
                  search: "",
                  payType: "all",
                  scheduleKind: "all",
                  qual: "all",
                  status: "all",
                  startTimeFrom: "",
                  startTimeTo: "",
                  sort: state.sort,
                })
              }
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="ml-auto text-xs text-slate-400 tabular text-right leading-tight">
          <div>
            <span className="text-slate-200 font-semibold">{resultCount}</span>{" "}
            of {totalCount}
          </div>
          <div className="text-[10px] text-emerald-300">
            {availableCount} available
          </div>
        </div>
      </div>
    </div>
  );
}
