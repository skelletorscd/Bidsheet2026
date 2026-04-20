import { useState } from "react";
import { ClipboardPaste, ExternalLink } from "lucide-react";

type Props = {
  url: string;
  onSubmit: (csv: string) => void;
};

export function PasteFallback({ url, onSubmit }: Props) {
  const [text, setText] = useState("");
  return (
    <div className="card p-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <ClipboardPaste className="w-4 h-4 text-amber-400" />
        <h3 className="font-semibold">Paste CSV fallback</h3>
      </div>
      <p className="text-sm text-slate-400 mt-2 leading-relaxed">
        The sheet wouldn't load directly (CORS or network error). Open the link
        below in a new tab — the file will download as CSV — then paste its
        contents here.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary mt-3"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Download CSV
      </a>
      <textarea
        className="input w-full mt-3 font-mono text-xs h-48"
        placeholder="Paste CSV contents here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <button
          className="btn btn-primary"
          onClick={() => text.trim() && onSubmit(text)}
          disabled={!text.trim()}
        >
          Use this CSV
        </button>
      </div>
    </div>
  );
}
