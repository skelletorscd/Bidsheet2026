import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Settings, defaultSettings } from "../data/settings";

type Props = {
  open: boolean;
  initial: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
};

/**
 * User-facing preferences only. Anything that affects data sources (sheet
 * IDs, tab GIDs, location directory) is intentionally not exposed so a
 * coworker using the deployed site can't accidentally repoint it.
 */
export function SettingsModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Settings>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-lg font-semibold">My preferences</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Stored only on this device.
            </p>
          </div>
          <button
            className="p-1.5 hover:bg-bg-hover rounded-md text-slate-400"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Pay rates
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-slate-400">
                  Hourly rate ($/hr)
                </span>
                <input
                  className="input w-full mt-1 tabular"
                  type="number"
                  step="0.01"
                  value={draft.hourlyRate}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      hourlyRate: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">
                  Mileage rate ($/mi)
                </span>
                <input
                  className="input w-full mt-1 tabular"
                  type="number"
                  step="0.01"
                  value={draft.mileageRate}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mileageRate: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Used for the "Est. pay/wk" calc on every bid. Only changes what
              you see.
            </p>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              How often to refresh
            </h3>
            <label className="block">
              <span className="text-xs text-slate-400">
                Auto-refresh interval (seconds)
              </span>
              <input
                className="input w-full mt-1 tabular"
                type="number"
                min={15}
                max={600}
                value={draft.refreshIntervalSec}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    refreshIntervalSec: Math.max(
                      15,
                      Number(e.target.value) || 60,
                    ),
                  })
                }
              />
            </label>
            <p className="text-[11px] text-slate-500 mt-1.5">
              How often the app re-checks the sheet while open. Minimum 15 s.
            </p>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border-subtle bg-bg-raised/50">
          <button
            className="btn"
            onClick={() =>
              setDraft({
                ...draft,
                hourlyRate: defaultSettings().hourlyRate,
                mileageRate: defaultSettings().mileageRate,
                refreshIntervalSec: defaultSettings().refreshIntervalSec,
              })
            }
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
