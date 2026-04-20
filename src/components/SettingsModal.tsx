import { useEffect, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Settings, defaultSettings } from "../data/settings";
import { TAB_SOURCES, TabKey } from "../data/sources";

type Props = {
  open: boolean;
  initial: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
};

export function SettingsModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Settings>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  if (!open) return null;

  const setGid = (key: TabKey, value: string) => {
    const num = value.trim() ? Number(value.trim()) : NaN;
    setDraft((d) => ({
      ...d,
      customGids: {
        ...d.customGids,
        [key]: Number.isFinite(num) ? num : undefined,
      },
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold">Settings</h2>
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
              Pay rates (your contract)
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
              Used for the "Est. pay/wk" estimate on each bid.
            </p>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Data source
            </h3>
            <label className="block">
              <span className="text-xs text-slate-400">Spreadsheet ID</span>
              <input
                className="input w-full mt-1 font-mono text-xs"
                value={draft.spreadsheetId}
                onChange={(e) =>
                  setDraft({ ...draft, spreadsheetId: e.target.value.trim() })
                }
              />
            </label>
            <label className="block mt-3">
              <span className="text-xs text-slate-400">
                Auto-refresh interval (seconds, 0 = off)
              </span>
              <input
                className="input w-full mt-1 tabular"
                type="number"
                min={0}
                value={draft.refreshIntervalSec}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    refreshIntervalSec: Math.max(
                      0,
                      Number(e.target.value) || 0,
                    ),
                  })
                }
              />
            </label>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Tab GIDs (paste from sheet URL)
            </h3>
            <div className="space-y-2">
              {TAB_SOURCES.map((tab) => {
                const current = draft.customGids[tab.key] ?? tab.gid ?? "";
                const isDefault = tab.gid != null;
                return (
                  <label key={tab.key} className="flex items-center gap-2">
                    <span className="w-32 text-xs text-slate-300">
                      {tab.shortLabel}
                    </span>
                    <input
                      className="input flex-1 tabular"
                      type="text"
                      placeholder={
                        isDefault ? `${tab.gid}` : "paste gid here"
                      }
                      value={current === "" ? "" : String(current)}
                      onChange={(e) => setGid(tab.key, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Get the gid from the sheet URL after switching tabs:{" "}
              <code>...?gid=XXXXX</code>.
            </p>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border-subtle bg-bg-raised/50">
          <button
            className="btn"
            onClick={() => setDraft(defaultSettings())}
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
