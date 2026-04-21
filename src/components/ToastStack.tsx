import { Sparkles, X } from "lucide-react";
import { BidTakenToast } from "../data/useBidTakenToasts";

type Props = {
  toasts: BidTakenToast[];
  onDismiss: (id: string) => void;
};

const HUB_LABEL: Record<string, string> = {
  TOL: "Toledo",
  NBL: "N. Baltimore",
  ALL: "Sleeper",
};

export function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed z-50 pointer-events-none flex flex-col gap-2 items-end bottom-4 right-4 left-4 sm:left-auto sm:top-20 sm:bottom-auto sm:max-w-sm">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: BidTakenToast;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-auto w-full bg-bg-panel/95 backdrop-blur border border-amber-500/40 rounded-xl shadow-[0_8px_40px_-8px_rgba(245,158,11,0.35)] overflow-hidden relative animate-[toastIn_500ms_cubic-bezier(0.22,1.2,0.36,1)_both]"
    >
      <div className="absolute inset-0 pointer-events-none opacity-60 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent animate-[shimmer_1.2s_ease-out]" />

      <div className="relative px-3.5 py-3 flex items-start gap-3">
        <div className="relative shrink-0 mt-0.5">
          <div className="absolute inset-0 bg-amber-400/30 blur-md animate-[sparklePulse_1.6s_ease-in-out_infinite]" />
          <div className="relative w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-300 animate-[sparkleSpin_2.4s_linear_infinite]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold flex items-center gap-1.5">
            Bid taken
            {toast.hub && HUB_LABEL[toast.hub] && (
              <span className="text-[10px] text-slate-400 normal-case tracking-normal">
                · {HUB_LABEL[toast.hub]}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[14px] text-slate-100 leading-snug">
            <span className="font-semibold">{toast.driver}</span>
            <span className="text-slate-400"> took </span>
            <span className="font-mono font-bold text-amber-300 tabular">
              {toast.jobNum}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular">
            Bid #{toast.bidNum} · just now
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="relative text-slate-500 hover:text-slate-200 shrink-0 p-1 rounded"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
