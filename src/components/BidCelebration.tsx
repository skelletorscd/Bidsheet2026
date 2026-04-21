import { useEffect } from "react";
import { BidTakenToast } from "../data/useBidTakenToasts";

type Props = {
  celeb: BidTakenToast;
  variant: number; // 0..4
  onDone: () => void;
};

const DURATION_MS = 2800;

export function BidCelebration({ celeb, variant, onDone }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(id);
  }, [celeb.id, onDone]);

  const v = ((variant % 5) + 5) % 5;
  const Inner =
    v === 0 ? Moonwalk : v === 1 ? Rocket : v === 2 ? TNT : v === 3 ? Slot : Stamp;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none overflow-hidden animate-[celebIn_180ms_ease-out_both]"
      onClick={onDone}
      style={{ willChange: "opacity, transform" }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
      <div className="relative w-full h-full pointer-events-auto">
        <Inner celeb={celeb} />
      </div>
    </div>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────

function Headline({
  driver,
  jobNum,
  tone = "amber",
}: {
  driver: string;
  jobNum: string;
  tone?: "amber" | "rose" | "emerald" | "sky";
}) {
  const color: Record<string, string> = {
    amber: "text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.7)]",
    rose: "text-rose-300 drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]",
    emerald: "text-emerald-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]",
    sky: "text-sky-300 drop-shadow-[0_0_20px_rgba(14,165,233,0.7)]",
  };
  return (
    <div className="text-center select-none">
      <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-white/60 font-semibold animate-[textPop_600ms_250ms_cubic-bezier(0.22,1.2,0.36,1)_both]">
        Bid Taken
      </div>
      <div
        className={`mt-2 text-3xl sm:text-5xl font-extrabold tabular ${color[tone]} animate-[textPop_700ms_400ms_cubic-bezier(0.22,1.2,0.36,1)_both]`}
      >
        {driver}
      </div>
      <div className="mt-1 text-lg sm:text-2xl text-white/90 font-semibold animate-[textPop_700ms_650ms_cubic-bezier(0.22,1.2,0.36,1)_both]">
        took{" "}
        <span className="font-mono text-amber-200 tabular drop-shadow-[0_0_18px_rgba(245,158,11,0.6)]">
          {jobNum}
        </span>
      </div>
    </div>
  );
}

// ─── 0 · Moonwalk ───────────────────────────────────────────────────────

function Moonwalk({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div
        className="absolute left-0 right-0"
        style={{ top: "60%" }}
      >
        <div
          className="absolute"
          style={{
            left: 0,
            animation: "moonwalkGlide 2.6s linear forwards",
            willChange: "transform",
          }}
        >
          <div className="animate-[moonwalkBob_500ms_ease-in-out_infinite] text-7xl sm:text-9xl">
            🕺
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      </div>
      <div className="relative z-10 px-4">
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="amber" />
      </div>
    </div>
  );
}

// ─── 1 · Rocket ─────────────────────────────────────────────────────────

function Rocket({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div
        className="absolute text-7xl sm:text-9xl"
        style={{
          animation: "rocketFly 2.3s ease-out forwards",
          willChange: "transform, opacity",
        }}
      >
        🚀
      </div>
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-300"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            animation: `trailFade ${1.2 + Math.random()}s ${Math.random()}s ease-in-out infinite`,
            boxShadow: "0 0 8px rgba(245,158,11,0.9)",
          }}
        />
      ))}
      <div className="relative z-10 px-4">
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="sky" />
      </div>
    </div>
  );
}

// ─── 2 · TNT ────────────────────────────────────────────────────────────

function TNT({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ animation: "screenShake 220ms 1.05s ease-in-out" }}
    >
      {/* TNT drops, shakes, then explodes (fade out via scale) */}
      <div
        className="absolute text-7xl sm:text-9xl"
        style={{
          animation:
            "tntDrop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both, tntShake 120ms 0.7s 3 ease-in-out, celebOut 200ms 1.05s both",
          willChange: "transform, opacity",
        }}
      >
        🧨
      </div>
      {/* Boom ring */}
      <div
        className="absolute rounded-full border-4 border-rose-500/70"
        style={{
          width: 100,
          height: 100,
          animation: "boomRing 700ms 1.05s ease-out forwards",
          willChange: "transform, opacity",
        }}
      />
      <div
        className="absolute rounded-full border-4 border-amber-400/80"
        style={{
          width: 60,
          height: 60,
          animation: "boomRing 900ms 1.1s ease-out forwards",
          willChange: "transform, opacity",
        }}
      />
      {/* Particles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const dist = 200 + Math.random() * 120;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 ? "#f59e0b" : "#ef4444",
              ["--dx" as string]: `${Math.cos(angle) * dist}px`,
              ["--dy" as string]: `${Math.sin(angle) * dist}px`,
              animation: "particleBurst 900ms 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards",
              boxShadow: "0 0 12px currentColor",
              willChange: "transform, opacity",
            }}
          />
        );
      })}
      <div className="relative z-10 px-4" style={{ animationDelay: "1.2s" }}>
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="rose" />
      </div>
    </div>
  );
}

// ─── 3 · Slot Machine ──────────────────────────────────────────────────

function Slot({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="text-6xl sm:text-8xl animate-[textPop_500ms_ease-out_both]">
          🎰
        </div>
        {/* coins */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-2xl sm:text-3xl"
            style={{
              left: `${50 + (Math.random() - 0.5) * 80}%`,
              top: 0,
              ["--fall" as string]: `${200 + Math.random() * 220}px`,
              ["--drift" as string]: `${(Math.random() - 0.5) * 200}px`,
              animation: `coinFall ${1.2 + Math.random() * 0.6}s ${0.2 + Math.random() * 0.4}s ease-in forwards`,
              willChange: "transform, opacity",
            }}
          >
            🪙
          </span>
        ))}
      </div>
      <div className="mt-4 text-xl sm:text-3xl font-black text-amber-300 tracking-widest drop-shadow-[0_0_18px_rgba(245,158,11,0.7)] animate-[textPop_600ms_200ms_cubic-bezier(0.22,1.2,0.36,1)_both]">
        JACKPOT!
      </div>
      <div className="mt-2">
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="amber" />
      </div>
    </div>
  );
}

// ─── 4 · Stamp ──────────────────────────────────────────────────────────

function Stamp({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ animation: "screenShake 180ms 380ms ease-in-out" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[300px] h-[300px] rounded-full bg-rose-500/10"
          style={{ animation: "stampRadiate 900ms 360ms ease-out both" }}
        />
      </div>
      <div
        className="relative border-[6px] border-rose-400 text-rose-300 font-black uppercase tracking-widest px-8 py-3 rounded-sm shadow-[0_0_40px_rgba(244,63,94,0.5)]"
        style={{
          animation: "stampSlam 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          fontFamily: "Impact, 'Arial Black', sans-serif",
          fontSize: "clamp(32px, 8vw, 60px)",
          willChange: "transform, opacity",
        }}
      >
        TAKEN
      </div>
      <div className="mt-6 relative z-10 px-4">
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="rose" />
      </div>
    </div>
  );
}
