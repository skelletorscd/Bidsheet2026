import { useState } from "react";
import { AlertCircle, Check, KeyRound, Loader2 } from "lucide-react";
import { getSupabase } from "../data/supabase";

type Props = {
  onDone: () => void;
};

/**
 * Rendered when the user arrives via a password-recovery email link
 * (Supabase fires PASSWORD_RECOVERY via onAuthStateChange). Blocks the
 * rest of the UI until they pick a new password or bail.
 */
export function PasswordResetModal({ onDone }: Props) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pwd.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (pwd !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setError("Not connected to Supabase.");
      return;
    }
    setBusy(true);
    const { error: err } = await sb.auth.updateUser({ password: pwd });
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      window.setTimeout(onDone, 1400);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-300" />
            <h2 className="text-lg font-semibold">Set a new password</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            You got here from the email reset link. Pick something you'll
            remember.
          </p>
        </div>
        {done ? (
          <div className="p-6 text-center">
            <div className="inline-flex w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 items-center justify-center mb-2">
              <Check className="w-6 h-6 text-emerald-300" />
            </div>
            <p className="text-slate-100 font-semibold">Password updated</p>
            <p className="text-sm text-slate-400 mt-1">
              You're signed in. Taking you back to the app…
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                New password
              </span>
              <input
                className="input w-full mt-1"
                type="password"
                autoFocus
                required
                minLength={6}
                autoComplete="new-password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                Confirm new password
              </span>
              <input
                className="input w-full mt-1"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && (
              <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary w-full justify-center py-2"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Save new password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
