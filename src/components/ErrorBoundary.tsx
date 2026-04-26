import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Different value bumps reset the boundary (e.g. tab key change). */
  resetKey?: string;
};
type State = { error: Error | null };

/**
 * Catches render-time exceptions from the children subtree so a single
 * broken view (missing schema column, bad data, etc.) doesn't blank
 * the entire app. Surfaces a friendly inline error card with a
 * 'Try again' button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto p-6 sm:p-10">
            <div className="card p-6 border-rose-500/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-300 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-xl font-bold tracking-tight"
                    style={{ color: "rgb(var(--fg))" }}
                  >
                    This tab hit a snag
                  </h2>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "rgb(var(--fg-subtle))" }}
                  >
                    The view crashed before it could finish loading. The
                    rest of the site is still usable — pick another tab,
                    or try this one again. If it keeps happening, text
                    Samuel.
                  </p>
                  <pre
                    className="mt-3 text-[11px] p-3 rounded-lg overflow-auto max-h-40 font-mono"
                    style={{
                      background: "rgb(var(--bg-raised) / 0.5)",
                      color: "rgb(var(--fg-faint))",
                      border: "1px solid rgb(var(--border) / 0.1)",
                    }}
                  >
                    {this.state.error.message}
                  </pre>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => this.setState({ error: null })}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
