import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  code: string;
  initialName: string;
  onSave: (name: string, confirmed: boolean) => void;
  onClose: () => void;
};

export function LocationEditor({ code, initialName, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName === "?" ? "" : initialName);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <div className="text-xs text-slate-400">Add location</div>
            <div className="font-mono text-base font-bold tabular text-amber-300">
              {code}
            </div>
          </div>
          <button
            className="p-1.5 hover:bg-bg-hover rounded-md text-slate-400"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            What city/facility is{" "}
            <span className="font-mono text-amber-300">{code}</span>? Last 2
            chars are usually the state. Saved locally to your browser.
          </p>
          <input
            autoFocus
            className="input w-full"
            placeholder="e.g. Lansing, MI"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onSave(name.trim(), true);
                onClose();
              }
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border-subtle bg-bg-raised/50">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (name.trim()) {
                onSave(name.trim(), true);
                onClose();
              }
            }}
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
