import { useEffect } from "react";
import {
  Copy,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Truck,
} from "lucide-react";

type Props = {
  onStatus: (s: {
    fetchedAt: number | null;
    loading: boolean;
    error: string | null;
    source: string | null;
  }) => void;
};

const PHONE_E164 = "+17346397960";
const PHONE_DISPLAY = "734-639-7960";
const EMAIL = "Devossam1@hotmail.com";

export function ContactView({ onStatus }: Props) {
  useEffect(() => {
    onStatus({
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      source: "bundled",
    });
  }, [onStatus]);

  const copy = (value: string) => {
    try {
      navigator.clipboard?.writeText(value);
    } catch {
      // ignore — permission issues on old browsers
    }
  };

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* Backdrop gradient + animated glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full opacity-[0.18]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(245,158,11,0.9), transparent 70%)",
            animation: "pulseDot 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-[0.15]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(244,63,94,0.8), transparent 70%)",
            animation: "pulseDot 5s ease-in-out infinite",
            animationDelay: "0.8s",
          }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[280px] h-[280px] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(14,165,233,0.8), transparent 70%)",
            animation: "pulseDot 6s ease-in-out infinite",
            animationDelay: "1.6s",
          }}
        />
      </div>

      <div className="relative p-6 sm:p-10 max-w-3xl mx-auto">
        <div className="card overflow-hidden border-amber-500/30 bg-bg-panel/80 backdrop-blur-sm">
          {/* Hero */}
          <div className="relative px-6 pt-10 pb-8 sm:pt-14 sm:pb-10 text-center overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
              style={{
                animation: "shimmer 2.6s linear infinite",
              }}
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] uppercase tracking-[0.25em] font-semibold">
              <Truck className="w-3 h-3" />
              Site admin
            </div>
            <h1 className="mt-4 font-extrabold text-4xl sm:text-6xl text-slate-50 tracking-tight">
              Samuel Devos
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
              UPS Teamsters feeder driver · Toledo, OH hub. Built this
              dashboard for you and the rest of the crew. Spot something
              wrong, got a location code to add, or want a new feature?
              <span className="block mt-1 text-slate-300 font-medium">
                Text me — I'll make it happen.
              </span>
            </p>
          </div>

          {/* Phone card */}
          <div className="px-5 sm:px-8 pb-6">
            <div className="relative rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/40 p-5 sm:p-6 group">
              <div
                className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "radial-gradient(800px circle at var(--mx, 50%) var(--my, 50%), rgba(245,158,11,0.12), transparent 40%)",
                }}
              />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold">
                    Text me
                  </div>
                  <a
                    href={`sms:${PHONE_E164}`}
                    className="block text-2xl sm:text-3xl font-bold font-mono tabular text-slate-50 hover:text-amber-200 transition-colors"
                  >
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`sms:${PHONE_E164}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-100 text-sm font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open text message
                </a>
                <a
                  href={`tel:${PHONE_E164}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-slate-200 text-sm hover:bg-bg-hover transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <button
                  onClick={() => copy(PHONE_DISPLAY)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-slate-300 text-sm hover:bg-bg-hover transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Email card */}
          <div className="px-5 sm:px-8 pb-8">
            <div className="rounded-xl bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/30 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-sky-300/80 font-semibold">
                    Email
                  </div>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="block text-lg sm:text-xl font-semibold text-slate-50 hover:text-sky-200 transition-colors truncate"
                  >
                    {EMAIL}
                  </a>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:${EMAIL}?subject=Toledo%20Feeder%20Bids%20-%20Update`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-sky-500/20 border border-sky-500/50 text-sky-100 text-sm font-semibold hover:bg-sky-500/30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send email
                </a>
                <button
                  onClick={() => copy(EMAIL)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-slate-300 text-sm hover:bg-bg-hover transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* What to send */}
          <div className="px-6 pb-8">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Good reasons to message me
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                "Wrong or missing city address",
                "New location code not in the list",
                "Phone number updates for a hub",
                "Access notes (door codes, gate info)",
                "Feature ideas",
                "Anything looks broken on the site",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 text-slate-300 bg-bg-raised/60 border border-border-subtle rounded-lg px-3 py-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-4 border-t border-border-subtle bg-bg-raised/40 text-center text-[11px] text-slate-500">
            Toledo Feeder Bids · built by Samuel · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
