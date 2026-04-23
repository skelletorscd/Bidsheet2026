import { ReactElement, useEffect } from "react";
import { BidTakenToast } from "../data/useBidTakenToasts";
import { playSound, SoundName } from "../util/sounds";

type Props = {
  celeb: BidTakenToast;
  variant: number; // 0..N
  onDone: () => void;
};

const DEFAULT_DURATION_MS = 2800;
const LONG_DURATION_MS = 4200;

export function BidCelebration({ celeb, variant, onDone }: Props) {
  // Special-driver variants run longer so the joke lands properly.
  const isLong = variant === CLAW_VARIANT || variant === LIONS_VARIANT;
  const duration = isLong ? LONG_DURATION_MS : DEFAULT_DURATION_MS;

  useEffect(() => {
    // Fire the matching sound once at mount.
    const sound = SOUND_FOR_VARIANT[Math.max(0, variant)] ?? null;
    if (sound) playSound(sound);
    const id = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(id);
  }, [celeb.id, variant, duration, onDone]);

  const Inner = VARIANTS[variant] ?? VARIANTS[0];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none overflow-hidden animate-[celebIn_180ms_ease-out_both]"
      onClick={onDone}
      style={{ willChange: "opacity, transform" }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
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
  small = false,
}: {
  driver: string;
  jobNum: string;
  tone?: "amber" | "rose" | "emerald" | "sky" | "fuchsia" | "yellow";
  small?: boolean;
}) {
  const color: Record<string, string> = {
    amber: "text-amber-300 drop-shadow-[0_0_24px_rgba(245,158,11,0.85)]",
    rose: "text-rose-300 drop-shadow-[0_0_24px_rgba(244,63,94,0.85)]",
    emerald: "text-emerald-300 drop-shadow-[0_0_24px_rgba(16,185,129,0.85)]",
    sky: "text-sky-300 drop-shadow-[0_0_24px_rgba(14,165,233,0.85)]",
    fuchsia:
      "text-fuchsia-300 drop-shadow-[0_0_24px_rgba(217,70,239,0.85)]",
    yellow:
      "text-yellow-200 drop-shadow-[0_0_24px_rgba(250,204,21,0.85)]",
  };
  const sizeName = small
    ? "text-2xl sm:text-4xl"
    : "text-3xl sm:text-6xl";
  return (
    <div className="text-center select-none">
      <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-white/70 font-bold animate-[textPop_600ms_220ms_cubic-bezier(0.22,1.2,0.36,1)_both]">
        Bid Taken
      </div>
      <div
        className={`mt-2 font-extrabold tabular ${sizeName} ${color[tone]} animate-[textPop_700ms_360ms_cubic-bezier(0.22,1.2,0.36,1)_both]`}
      >
        {driver}
      </div>
      <div className="mt-1 text-base sm:text-2xl text-white/95 font-semibold animate-[textPop_700ms_580ms_cubic-bezier(0.22,1.2,0.36,1)_both]">
        took{" "}
        <span className="font-mono text-amber-200 tabular drop-shadow-[0_0_18px_rgba(245,158,11,0.7)]">
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
      <div className="absolute left-0 right-0" style={{ top: "60%" }}>
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
      <div
        className="absolute rounded-full border-4 border-rose-500/70"
        style={{
          width: 100,
          height: 100,
          animation: "boomRing 700ms 1.05s ease-out forwards",
        }}
      />
      <div
        className="absolute rounded-full border-4 border-amber-400/80"
        style={{
          width: 60,
          height: 60,
          animation: "boomRing 900ms 1.1s ease-out forwards",
        }}
      />
      {Array.from({ length: 22 }).map((_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const dist = 220 + Math.random() * 140;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 ? "#f59e0b" : "#ef4444",
              ["--dx" as string]: `${Math.cos(angle) * dist}px`,
              ["--dy" as string]: `${Math.sin(angle) * dist}px`,
              animation:
                "particleBurst 900ms 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards",
              boxShadow: "0 0 14px currentColor",
            }}
          />
        );
      })}
      <div className="relative z-10 px-4">
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="rose" />
      </div>
    </div>
  );
}

// ─── 3 · Slot Machine ───────────────────────────────────────────────────

function Slot({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="text-6xl sm:text-8xl animate-[textPop_500ms_ease-out_both]">
          🎰
        </div>
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
          animation:
            "stampSlam 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          fontFamily: "Impact, 'Arial Black', sans-serif",
          fontSize: "clamp(32px, 8vw, 60px)",
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

// ─── 5 · Lightning Strike ───────────────────────────────────────────────

function Lightning({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ animation: "screenShake 250ms 0.05s ease-in-out" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.85), transparent 60%)",
          animation: "lightningFlash 400ms ease-out forwards",
        }}
      />
      <svg
        className="absolute"
        viewBox="0 0 100 200"
        width="160"
        height="320"
        style={{
          filter: "drop-shadow(0 0 24px rgba(186,230,253,0.9))",
          animation: "lightningBolt 600ms ease-out forwards",
        }}
      >
        <path
          d="M55 0 L25 100 L48 100 L20 200 L75 80 L52 80 Z"
          fill="#bae6fd"
          stroke="#0284c7"
          strokeWidth="2"
        />
      </svg>
      <div
        className="relative z-10 px-4 mt-32"
        style={{ animation: "celebIn 220ms 350ms both" }}
      >
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="sky" />
      </div>
    </div>
  );
}

// ─── 6 · Trophy Win ─────────────────────────────────────────────────────

function Trophy({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div
        className="absolute text-7xl sm:text-9xl"
        style={{
          animation: "trophyRise 1.2s cubic-bezier(0.22, 1.2, 0.36, 1) both",
          filter: "drop-shadow(0 0 28px rgba(245,158,11,0.9))",
        }}
      >
        🏆
      </div>
      {Array.from({ length: 26 }).map((_, i) => {
        const angle = (i / 26) * Math.PI * 2;
        const dist = 240 + Math.random() * 120;
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: ["#fbbf24", "#fde047", "#fef08a"][i % 3],
              ["--dx" as string]: `${Math.cos(angle) * dist}px`,
              ["--dy" as string]: `${Math.sin(angle) * dist}px`,
              animation: `particleBurst 1500ms ${0.3 + Math.random() * 0.3}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              boxShadow: "0 0 10px currentColor",
            }}
          />
        );
      })}
      <div
        className="relative z-10 mt-44 px-4"
        style={{ animation: "celebIn 240ms 0.7s both" }}
      >
        <div className="text-center text-xs uppercase tracking-[0.4em] text-amber-200 font-extrabold drop-shadow-[0_0_14px_rgba(245,158,11,0.7)]">
          Champion
        </div>
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="yellow" />
      </div>
    </div>
  );
}

// ─── 7 · Confetti Cannon ────────────────────────────────────────────────

function Confetti({ celeb }: { celeb: BidTakenToast }) {
  const colors = [
    "#f43f5e",
    "#f59e0b",
    "#10b981",
    "#0ea5e9",
    "#a855f7",
    "#fde047",
  ];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {Array.from({ length: 60 }).map((_, i) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const dist = 280 + Math.random() * 320;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              width: 8 + Math.random() * 4,
              height: 14 + Math.random() * 8,
              background: colors[i % colors.length],
              ["--dx" as string]: `${dx}px`,
              ["--dy" as string]: `${dy}px`,
              animation: `confettiBurst 1.6s ${Math.random() * 0.3}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              transformOrigin: "center",
              borderRadius: "1px",
            }}
          />
        );
      })}
      <div
        className="relative z-10 px-4"
        style={{ animation: "celebIn 240ms 0.2s both" }}
      >
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="fuchsia" />
      </div>
    </div>
  );
}

// ─── 8 · Disco Ball ─────────────────────────────────────────────────────

function Disco({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div
        className="absolute"
        style={{
          top: "5%",
          animation: "discoSwing 1.8s ease-in-out infinite",
          transformOrigin: "top center",
        }}
      >
        <div className="text-6xl sm:text-7xl">🪩</div>
      </div>
      {/* Light rays sweeping */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: "12%",
            left: "50%",
            width: 4,
            height: "70%",
            background: `linear-gradient(180deg, ${["#f0abfc", "#fde047", "#7dd3fc", "#86efac"][i % 4]} 0%, transparent 100%)`,
            opacity: 0.45,
            transformOrigin: "top center",
            transform: `rotate(${i * 45}deg)`,
            animation: `discoSpin 4s linear infinite`,
            filter: "blur(2px)",
          }}
        />
      ))}
      <div
        className="relative z-10 mt-24 px-4"
        style={{ animation: "celebIn 220ms 0.4s both" }}
      >
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="fuchsia" />
      </div>
    </div>
  );
}

// ─── 9 · Boxing KO ──────────────────────────────────────────────────────

function BoxingKo({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ animation: "screenShake 280ms 0.55s ease-in-out" }}
    >
      <div
        className="absolute text-7xl sm:text-9xl"
        style={{
          animation:
            "punchIn 0.6s cubic-bezier(0.22, 1.4, 0.36, 1) both, celebOut 200ms 0.65s both",
        }}
      >
        🥊
      </div>
      <div
        className="absolute font-black text-6xl sm:text-8xl text-rose-400 tracking-widest"
        style={{
          fontFamily: "Impact, 'Arial Black', sans-serif",
          textShadow: "0 0 30px rgba(244,63,94,0.7)",
          animation:
            "koShatter 700ms 0.55s cubic-bezier(0.22, 1.5, 0.36, 1) both",
        }}
      >
        K.O.
      </div>
      <div
        className="relative z-10 mt-44 px-4"
        style={{ animation: "celebIn 220ms 1.0s both" }}
      >
        <div className="text-center text-xs uppercase tracking-[0.4em] text-rose-300 font-bold">
          Winner
        </div>
        <Headline driver={celeb.driver} jobNum={celeb.jobNum} tone="rose" />
      </div>
    </div>
  );
}

// ─── Special variants ───────────────────────────────────────────────────

export const CLAW_VARIANT = 99;
export const LIONS_VARIANT = 100;

function ClawMachine({ celeb }: { celeb: BidTakenToast }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
      <div className="text-center text-[10px] sm:text-xs uppercase tracking-[0.4em] text-amber-300 font-bold mb-2 drop-shadow-[0_0_14px_rgba(245,158,11,0.6)]">
        Claw Machine
      </div>
      <div
        className="relative w-[300px] h-[360px] sm:w-[380px] sm:h-[440px] rounded-2xl border-4 border-amber-400/70 shadow-[0_0_60px_rgba(245,158,11,0.5)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(245,158,11,0.08), rgba(244,63,94,0.06))",
        }}
      >
        {/* Top bar of the cabinet */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-amber-500/80 rounded-t-2xl flex items-center justify-center text-[11px] uppercase tracking-widest font-extrabold text-bg-base">
          CLAW MACHINE
        </div>
        {/* Glass overlay highlight */}
        <div
          className="absolute inset-x-2 top-8 bottom-2 rounded-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07), transparent 30%)",
          }}
        />
        {/* Chain */}
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2 w-[3px] bg-gradient-to-b from-slate-300 to-slate-500"
          style={{
            animation: "clawDescend 1.0s 0.2s ease-in-out forwards",
            height: "10px",
            transformOrigin: "top",
          }}
        />
        {/* Claw + payload group */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "12px",
            animation:
              "clawDescend 1.0s 0.2s ease-in-out forwards, clawAscend 1.4s 1.6s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        >
          {/* Claw */}
          <div className="relative w-16 h-12 flex items-end justify-center">
            <span className="text-4xl drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
              🦾
            </span>
          </div>
          {/* Name being clutched */}
          <div
            className="mt-1 px-3 py-2 rounded-lg bg-amber-500/25 border-2 border-amber-400 text-amber-100 font-bold text-base sm:text-lg whitespace-nowrap text-center min-w-[140px]"
            style={{
              animation: "clawGrab 250ms 1.4s ease-out both",
              boxShadow: "0 0 20px rgba(245,158,11,0.6)",
            }}
          >
            {celeb.driver}
          </div>
        </div>
        {/* Rubber ducky bouncing on the prize floor */}
        <div
          className="absolute bottom-4 right-6 text-5xl sm:text-6xl"
          style={{
            animation:
              "duckyAppear 600ms 0.4s cubic-bezier(0.22,1.4,0.36,1) both, duckyBob 700ms 1.0s ease-in-out infinite",
            transformOrigin: "bottom center",
          }}
        >
          🦆
        </div>
        {/* Loose toys — props */}
        <div className="absolute bottom-4 left-6 text-3xl opacity-80">🧸</div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-2xl opacity-70">
          🎲
        </div>
      </div>
      <div className="mt-5 text-center">
        <div className="font-extrabold text-2xl sm:text-3xl text-amber-300 drop-shadow-[0_0_18px_rgba(245,158,11,0.7)]">
          {celeb.driver}
        </div>
        <div className="text-base sm:text-lg text-white/90 mt-1">
          took{" "}
          <span className="font-mono text-amber-200">{celeb.jobNum}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 100 · Detroit Lions roar — Joseph Devos special ───────────────────

function LionsRoar({ celeb }: { celeb: BidTakenToast }) {
  const HONOLULU_BLUE = "#0076B6";
  const LIONS_SILVER = "#B0B7BC";
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ animation: "screenShake 360ms 0.55s ease-in-out" }}
    >
      {/* Stadium spotlight */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,118,182,0.35), transparent 65%)",
          animation: "celebIn 320ms ease-out both",
        }}
      />
      {/* Lion crest */}
      <div
        className="relative flex flex-col items-center"
        style={{
          animation:
            "lionCharge 700ms cubic-bezier(0.22, 1.4, 0.36, 1) both, lionShake 300ms 0.7s ease-in-out 3, lionLeap 900ms 1.6s cubic-bezier(0.55,0,0.7,0) forwards",
        }}
      >
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 180,
            height: 180,
            background: `radial-gradient(circle at 35% 35%, ${LIONS_SILVER}, ${HONOLULU_BLUE} 75%)`,
            border: `6px solid ${HONOLULU_BLUE}`,
            boxShadow: `0 0 60px ${HONOLULU_BLUE}, inset 0 0 30px rgba(0,0,0,0.4)`,
            fontSize: 110,
            lineHeight: "180px",
          }}
        >
          🦁
        </div>
        <div
          className="mt-3 px-4 py-1 font-extrabold text-lg sm:text-xl tracking-[0.25em]"
          style={{
            fontFamily: "Impact, 'Arial Black', sans-serif",
            color: LIONS_SILVER,
            textShadow: `0 0 14px ${HONOLULU_BLUE}, 0 0 4px #000`,
          }}
        >
          DETROIT LIONS
        </div>
      </div>
      {/* Spray of paw prints / claw-mark particles */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 250 + Math.random() * 120;
        return (
          <div
            key={i}
            className="absolute text-2xl"
            style={{
              ["--dx" as string]: `${Math.cos(angle) * dist}px`,
              ["--dy" as string]: `${Math.sin(angle) * dist}px`,
              animation:
                "particleBurst 1100ms 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          >
            🐾
          </div>
        );
      })}
      {/* Headline appears after lion leaps off */}
      <div
        className="absolute z-10 px-4"
        style={{ animation: "celebIn 280ms 2.3s both" }}
      >
        <div className="text-center">
          <div
            className="text-[10px] sm:text-xs uppercase tracking-[0.4em] font-bold"
            style={{ color: HONOLULU_BLUE }}
          >
            Pride of Detroit
          </div>
          <div
            className="mt-2 font-extrabold text-3xl sm:text-5xl tabular"
            style={{
              color: LIONS_SILVER,
              textShadow: `0 0 20px ${HONOLULU_BLUE}`,
            }}
          >
            {celeb.driver}
          </div>
          <div className="mt-1 text-base sm:text-2xl text-white/95 font-semibold">
            took{" "}
            <span className="font-mono text-amber-200 tabular drop-shadow-[0_0_18px_rgba(245,158,11,0.7)]">
              {celeb.jobNum}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Variant index → component / sound ──────────────────────────────────

const VARIANTS: Record<
  number,
  (props: { celeb: BidTakenToast }) => ReactElement
> = {
    0: Moonwalk,
    1: Rocket,
    2: TNT,
    3: Slot,
    4: Stamp,
    5: Lightning,
    6: Trophy,
    7: Confetti,
    8: Disco,
    9: BoxingKo,
    [CLAW_VARIANT]: ClawMachine,
    [LIONS_VARIANT]: LionsRoar,
  };

const SOUND_FOR_VARIANT: Record<number, SoundName> = {
  0: "moonwalk",
  1: "rocket",
  2: "tnt",
  3: "jackpot",
  4: "stamp",
  5: "lightning",
  6: "trophy",
  7: "confetti",
  8: "disco",
  9: "boxingKo",
  [CLAW_VARIANT]: "clawMachine",
  [LIONS_VARIANT]: "lionsRoar",
};

export const TOTAL_RANDOM_VARIANTS = 10;
