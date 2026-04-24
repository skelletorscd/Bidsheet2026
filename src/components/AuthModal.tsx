import { useState } from "react";
import {
  AlertCircle,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  UserPlus,
  X,
} from "lucide-react";
import { getSupabase } from "../data/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Mode = "signin" | "signup" | "forgot";

export function AuthModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setError(null);
    setMsg(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase isn't configured yet.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() || null } },
        });
        if (err) throw err;
        if (data.session) {
          onClose();
        } else {
          setMsg(
            "Check your email for a confirmation link, then come back and sign in.",
          );
        }
      } else if (mode === "signin") {
        const { error: err } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        onClose();
      } else {
        // Forgot password — send recovery email.
        const { error: err } = await sb.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              window.location.origin +
              window.location.pathname +
              "?recovery=1",
          },
        );
        if (err) throw err;
        setMsg(
          "Check your email for a reset link. Open it on this device and you'll be able to set a new password.",
        );
      }
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create an account"
        : "Reset your password";
  const subtitle =
    mode === "signin"
      ? "Welcome back."
      : mode === "signup"
        ? "One account per driver."
        : "We'll email you a link to set a new password.";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            className="p-1.5 hover:bg-bg-hover rounded-md text-slate-400"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="p-5 space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                Display name (optional)
              </span>
              <input
                className="input w-full mt-1"
                placeholder="What should people call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          )}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Email
            </span>
            <input
              className="input w-full mt-1"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== "forgot" && (
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                Password
              </span>
              <input
                className="input w-full mt-1"
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {msg && (
            <div className="text-emerald-300 text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full justify-center py-2"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "signin" ? (
              <LogIn className="w-4 h-4" />
            ) : mode === "signup" ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Email me a reset link"}
          </button>

          <div className="text-center text-xs text-slate-400 pt-2 space-y-1">
            {mode === "signin" && (
              <>
                <div>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-amber-300 hover:underline font-medium"
                    onClick={() => {
                      setMode("signup");
                      reset();
                    }}
                  >
                    Sign up
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-amber-300 inline-flex items-center gap-1"
                    onClick={() => {
                      setMode("forgot");
                      reset();
                    }}
                  >
                    <KeyRound className="w-3 h-3" />
                    Forgot password?
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-amber-300 hover:underline font-medium"
                  onClick={() => {
                    setMode("signin");
                    reset();
                  }}
                >
                  Sign in
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <div>
                Remembered it?{" "}
                <button
                  type="button"
                  className="text-amber-300 hover:underline font-medium"
                  onClick={() => {
                    setMode("signin");
                    reset();
                  }}
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
