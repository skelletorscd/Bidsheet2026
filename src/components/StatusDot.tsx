type Props = {
  state: "live" | "stale" | "error" | "loading";
  size?: number;
};

const COLORS: Record<Props["state"], string> = {
  live: "bg-emerald-400",
  stale: "bg-amber-400",
  error: "bg-rose-500",
  loading: "bg-sky-400",
};

export function StatusDot({ state, size = 8 }: Props) {
  return (
    <span
      className={`inline-block rounded-full ${COLORS[state]} ${state === "loading" ? "animate-pulseDot" : ""}`}
      style={{ width: size, height: size }}
    />
  );
}
