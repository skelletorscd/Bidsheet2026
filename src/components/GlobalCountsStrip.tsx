import { Phone, Truck } from "lucide-react";
import { GlobalCounts } from "../data/useGlobalCounts";

type Props = {
  counts: GlobalCounts;
};

export function GlobalCountsStrip({ counts }: Props) {
  const { toledoBids, nblohBids, onCallToledo, onCallNbloh } = counts;

  return (
    <div className="bg-bg-panel border-b border-border-subtle overflow-x-auto no-scrollbar">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 min-w-max md:min-w-0 md:flex-wrap">
        <BidPill
          hubLabel="Toledo, OH"
          total={toledoBids.total}
          taken={toledoBids.taken}
          available={toledoBids.available}
        />
        <BidPill
          hubLabel="North Baltimore, OH"
          total={nblohBids.total}
          taken={nblohBids.taken}
          available={nblohBids.available}
        />
        <OnCallPill
          hubLabel="Toledo, OH"
          total={onCallToledo.total}
          filled={onCallToledo.filled}
        />
        <OnCallPill
          hubLabel="North Baltimore, OH"
          total={onCallNbloh.total}
          filled={onCallNbloh.filled}
        />
      </div>
    </div>
  );
}

function BidPill({
  hubLabel,
  total,
  taken,
  available,
}: {
  hubLabel: string;
  total: number;
  taken: number;
  available: number;
}) {
  const hasData = total > 0;
  return (
    <div className="flex items-center gap-2 bg-bg-raised/60 border border-border-subtle rounded-lg px-3 py-1.5 whitespace-nowrap">
      <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          {hubLabel}
        </div>
        {hasData ? (
          <div className="text-[12px] tabular">
            <span className="font-bold text-amber-300">{taken}</span>
            <span className="text-slate-500">/{total}</span>
            <span className="text-slate-500"> taken</span>
            <span className="mx-1 text-slate-700">·</span>
            <span
              className={`font-semibold ${available > 0 ? "text-emerald-300" : "text-slate-500"}`}
            >
              {available} left
            </span>
          </div>
        ) : (
          <div className="text-[12px] text-slate-500">loading…</div>
        )}
      </div>
    </div>
  );
}

function OnCallPill({
  hubLabel,
  total,
  filled,
}: {
  hubLabel: string;
  total: number;
  filled: number;
}) {
  const hasData = total > 0 || filled > 0;
  return (
    <div className="flex items-center gap-2 bg-bg-raised/60 border border-border-subtle rounded-lg px-3 py-1.5 whitespace-nowrap">
      <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          On-Call · {hubLabel}
        </div>
        {hasData ? (
          <div className="text-[12px] tabular">
            <span className="font-bold text-sky-300">{filled}</span>
            {total > 0 && (
              <span className="text-slate-500">/{total} drivers</span>
            )}
            {total === 0 && (
              <span className="text-slate-500"> on-call</span>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-slate-500">loading…</div>
        )}
      </div>
    </div>
  );
}
